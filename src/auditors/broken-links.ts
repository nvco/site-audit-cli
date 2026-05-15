import { Page } from 'playwright';
import { Config, Issue, AuditModuleResult } from '../types';

export async function runBrokenLinksAudit(page: Page, config: Config): Promise<AuditModuleResult> {
  const issues: Issue[] = [];
  const pageUrl = page.url();
  const pageOrigin = new URL(pageUrl).origin;

  const hrefs: string[] = await page.$$eval('a[href]', (els) =>
    els.map((el) => (el as { href: string }).href).filter(Boolean)
  );

  const toCheck = new Set<string>();
  for (const href of hrefs) {
    try {
      const parsed = new URL(href, pageUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      parsed.hash = '';
      const url = parsed.href;
      const isInternal = parsed.origin === pageOrigin;
      if (isInternal || config.brokenLinks.includeExternal) {
        toCheck.add(url);
      }
    } catch {
      // skip unparseable
    }
  }

  const totalChecks = toCheck.size;

  await Promise.all([...toCheck].map(async (url) => {
    try {
      let status = await headRequest(page, url);
      if (status === 405) {
        status = await getRequest(page, url);
      }
      if (status >= 400) {
        issues.push({
          prefix: 'LNK',
          impact: 'serious',
          description: `Broken link returns HTTP ${status}`,
          location: url,
          docLink: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/${status}`,
          remediation: `Fix or remove the link to ${url} — it returned HTTP ${status}.`,
          rule: 'broken-link',
          pageUrl,
        });
      }
    } catch {
      // network failure — skip silently
    }
  }));

  return { issues, totalChecks };
}

async function headRequest(page: Page, url: string): Promise<number> {
  const response = await page.request.fetch(url, { method: 'HEAD', timeout: 10000 });
  return response.status();
}

async function getRequest(page: Page, url: string): Promise<number> {
  const response = await page.request.fetch(url, { method: 'GET', timeout: 10000 });
  return response.status();
}
