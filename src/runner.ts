import { chromium } from 'playwright';
import { Config, AuditResult, Issue, IssuePrefix } from './types';
import { resolveUrls } from './crawler';
import { runAccessibilityAudit } from './auditors/accessibility';
import { runPrivacyAudit } from './auditors/privacy';
import { runCookieAudit } from './auditors/cookies';
import { runSecurityHeadersAudit } from './auditors/security-headers';
import { runBrokenLinksAudit } from './auditors/broken-links';

export async function runAudit(config: Config): Promise<AuditResult> {
  const browser = await chromium.launch();
  // bypassCSP so axe-core can be injected regardless of the page's Content-Security-Policy
  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();

  let urls: string[] = [];
  try {
    urls = await resolveUrls(config, page);
  } catch (err) {
    await browser.close();
    throw err;
  }

  const rawIssues: Issue[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`Auditing [${i + 1}/${urls.length}] ${url}`);

    let responseHeaders: Record<string, string> = {};
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      if (response) {
        responseHeaders = await response.allHeaders();
      }
    } catch (err) {
      console.warn(`[runner] Failed to load ${url}: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    const auditors: Array<() => Promise<Issue[]>> = [];

    if (config.modules.accessibility) auditors.push(() => runAccessibilityAudit(page, config));
    if (config.modules.privacy) auditors.push(() => runPrivacyAudit(page, config));
    if (config.modules.cookies) auditors.push(() => runCookieAudit(page, config));
    if (config.modules.securityHeaders) auditors.push(() => runSecurityHeadersAudit(responseHeaders, url, config));
    if (config.modules.brokenLinks) auditors.push(() => runBrokenLinksAudit(page, config));

    for (const auditor of auditors) {
      try {
        const issues = await auditor();
        rawIssues.push(...issues);
      } catch (err) {
        console.warn(`[runner] Auditor error on ${url}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  await browser.close();

  const suppressed = applySuppress(rawIssues, config);
  const sorted = sortIssues(suppressed);
  const issues = assignIds(sorted);

  return {
    config,
    runDate: new Date().toISOString(),
    pagesAudited: urls,
    issues,
  };
}


const PREFIX_ORDER: IssuePrefix[] = ['ACC', 'PRI', 'COO', 'SEC', 'LNK'];
const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];

function sortIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => {
    const prefixDiff = PREFIX_ORDER.indexOf(a.prefix) - PREFIX_ORDER.indexOf(b.prefix);
    if (prefixDiff !== 0) return prefixDiff;
    return IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact);
  });
}

function applySuppress(issues: Issue[], config: Config): Issue[] {
  if (config.suppress.length === 0) return issues;

  return issues.filter((issue) => {
    return !config.suppress.some((rule) => {
      const ruleMatch = rule.rule === issue.rule;
      const urlMatch = rule.url === '*' || matchGlob(rule.url, issue.pageUrl);
      return ruleMatch && urlMatch;
    });
  });
}

function matchGlob(pattern: string, url: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(url);
}

function assignIds(issues: Issue[]): Issue[] {
  const counters: Record<IssuePrefix, number> = { ACC: 0, PRI: 0, COO: 0, SEC: 0, LNK: 0 };
  return issues.map((issue) => {
    counters[issue.prefix]++;
    const id = `${issue.prefix}-${String(counters[issue.prefix]).padStart(3, '0')}`;
    return { ...issue, id };
  });
}
