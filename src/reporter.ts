import * as fs from 'fs';
import * as path from 'path';
import { AuditResult, Issue, IssuePrefix, ImpactLevel } from './types';

const MODULE_LABELS: Record<IssuePrefix, string> = {
  ACC: 'Accessibility',
  PRI: 'Privacy',
  COO: 'Cookies',
  SEC: 'Security Headers',
  LNK: 'Broken Links',
};

const PREFIX_ORDER: IssuePrefix[] = ['ACC', 'PRI', 'COO', 'SEC', 'LNK'];
const IMPACT_ORDER: ImpactLevel[] = ['critical', 'serious', 'moderate', 'minor'];

export async function generateReports(result: AuditResult, outputDir: string): Promise<{ reportPath: string }> {
  fs.mkdirSync(outputDir, { recursive: true });

  const base = deriveBaseName(result);
  const reportPath = path.join(outputDir, `${base}-report.md`);

  const sorted = sortIssues(result.issues);

  fs.writeFileSync(reportPath, buildReport(result, sorted));

  return { reportPath };
}

function deriveBaseName(result: AuditResult): string {
  const hostname = new URL(result.config.urls[0]).hostname.toLowerCase().replace(/\./g, '-');
  const date = result.runDate.slice(0, 10);
  return `${hostname}-${date}`;
}

function sortIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => {
    const prefixDiff = PREFIX_ORDER.indexOf(a.prefix) - PREFIX_ORDER.indexOf(b.prefix);
    if (prefixDiff !== 0) return prefixDiff;
    return IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact);
  });
}

function header(result: AuditResult): string {
  const urls = result.config.urls.join(', ');
  const date = result.runDate.slice(0, 10);
  const { version, level } = result.config.wcag;
  const toolVersion = require('../package.json').version as string;

  return [
    `**Target:** ${urls}`,
    `**Run date:** ${date}`,
    `**Tool version:** ${toolVersion}`,
    `**Pages audited:** ${result.pagesAudited.length}`,
    `**WCAG:** ${version} Level ${level}`,
    '',
  ].join('\n');
}

function scorecard(issues: Issue[]): string {
  const rows: string[] = [];

  rows.push('| Module | Critical | Serious | Moderate | Minor | Total |');
  rows.push('|---|---|---|---|---|---|');

  for (const prefix of PREFIX_ORDER) {
    const moduleIssues = issues.filter((i) => i.prefix === prefix);
    if (moduleIssues.length === 0) continue;
    const c = (impact: ImpactLevel) => moduleIssues.filter((i) => i.impact === impact).length;
    rows.push(`| ${MODULE_LABELS[prefix]} | ${c('critical')} | ${c('serious')} | ${c('moderate')} | ${c('minor')} | ${moduleIssues.length} |`);
  }

  const total = (impact: ImpactLevel) => issues.filter((i) => i.impact === impact).length;
  rows.push(`| **Total** | **${total('critical')}** | **${total('serious')}** | **${total('moderate')}** | **${total('minor')}** | **${issues.length}** |`);

  return rows.join('\n') + '\n';
}

function reportTitle(result: AuditResult): string {
  const enabledModules = PREFIX_ORDER.filter((p) => {
    const key = ({ ACC: 'accessibility', PRI: 'privacy', COO: 'cookies', SEC: 'securityHeaders', LNK: 'brokenLinks' } as Record<IssuePrefix, keyof typeof result.config.modules>)[p];
    return result.config.modules[key];
  });
  if (enabledModules.length === 1) {
    return `Audit Report: ${MODULE_LABELS[enabledModules[0]]}`;
  }
  return 'Audit Report';
}

function buildReport(result: AuditResult, issues: Issue[]): string {
  const lines: string[] = [];

  lines.push(`# ${reportTitle(result)}\n`);
  lines.push(header(result));
  lines.push('## Summary\n');
  lines.push(scorecard(issues));

  for (const prefix of PREFIX_ORDER) {
    const moduleIssues = issues.filter((i) => i.prefix === prefix);
    if (moduleIssues.length === 0) continue;

    lines.push(`## ${MODULE_LABELS[prefix]}\n`);

    for (const issue of moduleIssues) {
      lines.push(`### ${issue.id} · ${issue.impact}\n`);
      lines.push(`- **Issue:** ${issue.description}`);
      lines.push(`- **Element:** \`${issue.location}\``);
      lines.push(`- **URL:** ${issue.pageUrl}`);
      lines.push(`- **Rule:** ${issue.docLink}`);
      lines.push(`- **Fix:** ${issue.remediation}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
