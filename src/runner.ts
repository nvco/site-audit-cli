import { chromium } from 'playwright';
import { Config, AuditResult, Issue, IssuePrefix, AuditModuleResult, ModuleScore } from './types';
import { resolveUrls } from './crawler';
import { runAccessibilityAudit } from './auditors/accessibility';
import { runPrivacyAudit } from './auditors/privacy';
import { runCookieAudit } from './auditors/cookies';
import { runSecurityHeadersAudit } from './auditors/security-headers';
import { runSslAudit } from './auditors/ssl';
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
  const moduleChecks: Record<IssuePrefix, number> = { ACC: 0, PRI: 0, COO: 0, SEC: 0, SSL: 0, LNK: 0 };
  const moduleScoringIssueCounts: Record<IssuePrefix, number> = { ACC: 0, PRI: 0, COO: 0, SEC: 0, SSL: 0, LNK: 0 };
  const checkedSslHosts = new Set<string>();

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

    const auditors: Array<{ prefix: IssuePrefix; fn: () => Promise<AuditModuleResult> }> = [];

    if (config.modules.accessibility.enabled) auditors.push({ prefix: 'ACC', fn: () => runAccessibilityAudit(page, config) });
    if (config.modules.privacy.enabled) auditors.push({ prefix: 'PRI', fn: () => runPrivacyAudit(page, config) });
    if (config.modules.cookies.enabled) auditors.push({ prefix: 'COO', fn: () => runCookieAudit(page, config) });
    if (config.modules.securityHeaders.enabled) auditors.push({ prefix: 'SEC', fn: () => runSecurityHeadersAudit(page, responseHeaders, url, config) });
    if (config.modules.ssl.enabled) {
      const host = new URL(url).hostname;
      if (!checkedSslHosts.has(host)) {
        checkedSslHosts.add(host);
        auditors.push({ prefix: 'SSL', fn: () => runSslAudit(url, config) });
      }
    }
    if (config.modules.brokenLinks.enabled) auditors.push({ prefix: 'LNK', fn: () => runBrokenLinksAudit(page, config) });

    for (const { prefix, fn } of auditors) {
      try {
        const result: AuditModuleResult = await fn();
        rawIssues.push(...result.issues);
        moduleChecks[prefix] += result.totalChecks;
        const effectiveIssues = result.issues.filter((i) => !i.isInformational);
        moduleScoringIssueCounts[prefix] += result.scoringIssueCount ?? effectiveIssues.length;
      } catch (err) {
        console.warn(`[runner] Auditor error on ${url}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  await browser.close();

  const suppressed = applySuppress(rawIssues, config);
  const sorted = sortIssues(suppressed);
  const issues = assignIds(sorted);

  const moduleScores = computeModuleScores(moduleChecks, moduleScoringIssueCounts, config);
  const overallScore = computeOverallScore(moduleScores);

  return {
    config,
    runDate: new Date().toISOString(),
    pagesAudited: urls,
    issues,
    moduleScores,
    overallScore,
  };
}


const PREFIX_ORDER: IssuePrefix[] = ['ACC', 'PRI', 'COO', 'SEC', 'SSL', 'LNK'];
const PREFIX_TO_MODULE: Record<IssuePrefix, keyof Config['modules']> = {
  ACC: 'accessibility', PRI: 'privacy', COO: 'cookies', SEC: 'securityHeaders', SSL: 'ssl', LNK: 'brokenLinks',
};
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

function computeModuleScores(
  moduleChecks: Record<IssuePrefix, number>,
  moduleScoringIssueCounts: Record<IssuePrefix, number>,
  config: Config,
): Partial<Record<IssuePrefix, ModuleScore>> {
  const scores: Partial<Record<IssuePrefix, ModuleScore>> = {};
  for (const prefix of PREFIX_ORDER) {
    if (!config.modules[PREFIX_TO_MODULE[prefix]].enabled) continue;
    const total = moduleChecks[prefix];
    const failed = moduleScoringIssueCounts[prefix];
    const score = total === 0 ? 100 : Math.max(0, Math.round(((total - failed) / total) * 100));
    scores[prefix] = { score, grade: scoreGrade(score) };
  }
  return scores;
}

function computeOverallScore(moduleScores: Partial<Record<IssuePrefix, ModuleScore>>): ModuleScore {
  const values = Object.values(moduleScores).map((s) => s!.score);
  if (values.length === 0) return { score: 100, grade: 'A' };
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return { score: avg, grade: scoreGrade(avg) };
}

function scoreGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

function assignIds(issues: Issue[]): Issue[] {
  const counters: Record<IssuePrefix, number> = { ACC: 0, PRI: 0, COO: 0, SEC: 0, SSL: 0, LNK: 0 };
  return issues.map((issue) => {
    counters[issue.prefix]++;
    const id = `${issue.prefix}-${String(counters[issue.prefix]).padStart(3, '0')}`;
    return { ...issue, id };
  });
}
