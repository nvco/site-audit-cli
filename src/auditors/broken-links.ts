import { Page } from 'playwright';
import { Config, Issue, AuditModuleResult } from '../types';

export async function runBrokenLinksAudit(page: Page, config: Config): Promise<AuditModuleResult> {
  const issues: Issue[] = [];
  const pageUrl = page.url();
  const pageOrigin = new URL(pageUrl).origin;

  const hrefs: Array<{ resolved: string; raw: string }> = await page.$$eval('a[href]', (els) =>
    els.map((el) => ({
      resolved: (el as unknown as { href: string }).href,
      raw: el.getAttribute('href') ?? '',
    })).filter((h) => h.resolved)
  );

  const toCheck = new Set<string>();
  for (const { resolved, raw } of hrefs) {
    // Flag malformed href attributes (e.g. [object Object] from JS framework bugs)
    if (raw && /^\[object /i.test(raw)) {
      issues.push({
        prefix: 'LNK',
        impact: 'serious',
        description: `Malformed href attribute — link resolves to "${resolved}"`,
        location: raw,
        docLink: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#href',
        remediation: `The href attribute value "${raw}" is a serialised JavaScript object, not a valid URL. Fix the code that sets this link's href.`,
        rule: 'invalid-href',
        pageUrl,
      });
      continue;
    }
    try {
      const parsed = new URL(resolved, pageUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      parsed.hash = '';
      const url = parsed.href;
      const isInternal = parsed.origin === pageOrigin;
      if (isInternal || config.modules.brokenLinks.includeExternal) {
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
      const ignored = config.modules.brokenLinks.ignoredStatusCodes;
      if (status >= 400 && !ignored.includes(status)) {
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
