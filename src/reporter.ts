import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';
import { AuditResult, Issue, IssuePrefix, ImpactLevel, ModuleScore } from './types';

const MODULE_LABELS: Record<IssuePrefix, string> = {
  ACC: 'Accessibility',
  PRI: 'Privacy',
  COO: 'Cookies',
  SEC: 'Security Headers',
  LNK: 'Broken Links',
};

const PREFIX_ORDER: IssuePrefix[] = ['ACC', 'PRI', 'COO', 'SEC', 'LNK'];
const IMPACT_ORDER: ImpactLevel[] = ['critical', 'serious', 'moderate', 'minor'];

const IMPACT_COLORS: Record<ImpactLevel, string> = {
  critical: '#c0392b',
  serious:  '#e67e22',
  moderate: '#f39c12',
  minor:    '#7f8c8d',
};

const IMPACT_BG: Record<ImpactLevel, string> = {
  critical: '#fdf2f2',
  serious:  '#fef6ee',
  moderate: '#fefdf0',
  minor:    '#f4f6f7',
};

export async function generateReports(result: AuditResult, outputBase: string): Promise<{ runDir: string }> {
  const runDir = path.join(outputBase, deriveRunFolder(result));
  fs.mkdirSync(runDir, { recursive: true });

  const formats = result.config.output?.formats ?? { markdown: true, html: true, pdf: true, json: true };
  const issues = result.issues;
  const title = reportTitle(result);

  if (formats.markdown) {
    fs.writeFileSync(path.join(runDir, 'report.md'), buildMarkdown(result, issues, title));
    console.log(`  Markdown: ${path.join(runDir, 'report.md')}`);
  }

  if (formats.json) {
    fs.writeFileSync(path.join(runDir, 'report.json'), buildJson(result, issues));
    console.log(`  JSON:     ${path.join(runDir, 'report.json')}`);
  }

  const htmlPath = path.join(runDir, 'report.html');
  if (formats.html || formats.pdf) {
    fs.writeFileSync(htmlPath, buildHtml(result, issues, title));
    if (formats.html) console.log(`  HTML:     ${htmlPath}`);
  }

  if (formats.pdf) {
    await generatePdf(htmlPath, path.join(runDir, 'report.pdf'));
    console.log(`  PDF:      ${path.join(runDir, 'report.pdf')}`);
    if (!formats.html) fs.unlinkSync(htmlPath);
  }

  return { runDir };
}

function deriveRunFolder(result: AuditResult): string {
  const d = new Date(result.runDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function reportTitle(result: AuditResult): string {
  const enabledModules = PREFIX_ORDER.filter((p) => {
    const key = ({ ACC: 'accessibility', PRI: 'privacy', COO: 'cookies', SEC: 'securityHeaders', LNK: 'brokenLinks' } as Record<IssuePrefix, keyof typeof result.config.modules>)[p];
    return result.config.modules[key];
  });
  return enabledModules.length === 1 ? `Audit Report: ${MODULE_LABELS[enabledModules[0]]}` : 'Audit Report';
}

function shortLocation(location: string): string {
  return location.split('>').pop()?.trim() ?? location;
}

// --- Markdown ---

function buildMarkdown(result: AuditResult, issues: Issue[], title: string): string {
  const lines: string[] = [];
  const { version, level } = result.config.wcag;
  const toolVersion = require('../package.json').version as string;

  lines.push(`# ${title}\n`);
  lines.push(`**Target:** ${result.config.urls.join(', ')}`);
  lines.push(`**Run date:** ${result.runDate.slice(0, 10)}`);
  lines.push(`**Tool version:** ${toolVersion}`);
  lines.push(`**Pages audited:** ${result.pagesAudited.length}`);
  lines.push(`**WCAG:** ${version} Level ${level}`);
  lines.push('');
  lines.push('## Summary\n');
  lines.push(markdownScorecard(result));

  for (const prefix of PREFIX_ORDER) {
    const moduleIssues = issues.filter((i) => i.prefix === prefix);
    if (moduleIssues.length === 0) continue;
    lines.push(`## ${MODULE_LABELS[prefix]}\n`);
    for (const issue of moduleIssues) {
      lines.push(`### ${issue.id}\n`);
      lines.push(`- **Impact:** ${issue.impact}`);
      lines.push(`- **Issue:** ${issue.description}`);
      if (issue.prefix === 'ACC') {
        lines.push(`- **Element:** \`${shortLocation(issue.location)}\``);
        lines.push(`- **Full path:** \`${issue.location}\``);
      } else {
        lines.push(`- **Location:** \`${issue.location}\``);
      }
      lines.push(`- **URL:** ${issue.pageUrl}`);
      lines.push(`- **Reference:** ${issue.docLink}`);
      lines.push(`- **Fix:** ${issue.remediation}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function markdownScorecard(result: AuditResult): string {
  const { issues, moduleScores, overallScore } = result;
  const rows = [
    '| Module | Score | Grade | Critical | Serious | Moderate | Minor | Total |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const prefix of PREFIX_ORDER) {
    const mi = issues.filter((i) => i.prefix === prefix);
    if (mi.length === 0 && !moduleScores[prefix]) continue;
    const c = (impact: ImpactLevel) => mi.filter((i) => i.impact === impact).length;
    const ms = moduleScores[prefix];
    rows.push(`| ${MODULE_LABELS[prefix]} | ${ms ? ms.score + '%' : '—'} | ${ms ? ms.grade : '—'} | ${c('critical')} | ${c('serious')} | ${c('moderate')} | ${c('minor')} | ${mi.length} |`);
  }
  const t = (impact: ImpactLevel) => issues.filter((i) => i.impact === impact).length;
  rows.push(`| **Total** | **${overallScore.score}%** | **${overallScore.grade}** | **${t('critical')}** | **${t('serious')}** | **${t('moderate')}** | **${t('minor')}** | **${issues.length}** |`);
  return rows.join('\n') + '\n';
}

// --- JSON ---

function buildJson(result: AuditResult, issues: Issue[]): string {
  const toolVersion = require('../package.json').version as string;
  const output = {
    url: result.config.urls[0],
    date: result.runDate.slice(0, 10),
    toolVersion,
    pagesAudited: result.pagesAudited,
    overall: result.overallScore,
    modules: Object.fromEntries(
      PREFIX_ORDER.map((prefix) => {
        const ms = result.moduleScores[prefix];
        return [
          MODULE_LABELS[prefix].toLowerCase().replace(' ', '_'),
          {
            score: ms?.score ?? null,
            grade: ms?.grade ?? null,
            issues: issues.filter((i) => i.prefix === prefix),
          },
        ];
      })
    ),
  };
  return JSON.stringify(output, null, 2);
}

// --- HTML ---

function buildHtml(result: AuditResult, issues: Issue[], title: string): string {
  const { version, level } = result.config.wcag;
  const toolVersion = require('../package.json').version as string;

  const scorecardHtml = htmlScorecard(result);
  const sectionsHtml = PREFIX_ORDER.map((prefix) => {
    const moduleIssues = issues.filter((i) => i.prefix === prefix);
    if (moduleIssues.length === 0) return '';
    return `
    <section>
      <h2>${MODULE_LABELS[prefix]}</h2>
      ${moduleIssues.map((issue) => htmlIssue(issue)).join('\n')}
    </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; background: #f7f8fa; }
  .page { max-width: 960px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 28px; font-weight: 700; margin-bottom: 24px; color: #111; }
  h2 { font-size: 20px; font-weight: 600; margin: 40px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; color: #1a1a1a; }
  h3 { font-size: 14px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .meta { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px 24px; margin-bottom: 32px; display: grid; grid-template-columns: auto 1fr; gap: 6px 24px; }
  .meta dt { font-weight: 600; color: #555; white-space: nowrap; }
  .meta dd { color: #222; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 32px; }
  th { background: #f1f5f9; text-align: left; padding: 10px 16px; font-size: 13px; font-weight: 600; color: #555; border-bottom: 1px solid #e2e8f0; }
  td { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  tr:last-child td { border-bottom: none; }
  tr.total td { font-weight: 700; background: #f8fafc; }
  .issue { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
  @media print {
    body { background: #fff; }
    .page { padding: 0; max-width: 100%; }
  }
  .issue-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
  .issue-id { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; font-weight: 700; color: #444; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .issue-body { padding: 12px 16px; display: grid; grid-template-columns: 120px 1fr; gap: 6px 16px; font-size: 14px; }
  .issue-body dt { font-weight: 600; color: #666; }
  .issue-body dd { color: #222; word-break: break-word; }
  .issue-body dd code { background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SF Mono', 'Fira Code', monospace; }
  .issue-body dd a { color: #2563eb; text-decoration: none; }
  .issue-body dd a:hover { text-decoration: underline; }
  section { margin-bottom: 8px; }
</style>
</head>
<body>
<div class="page">
  <h1>${title}</h1>
  <dl class="meta">
    <dt>Target</dt><dd>${result.config.urls.join(', ')}</dd>
    <dt>Run date</dt><dd>${result.runDate.slice(0, 10)}</dd>
    <dt>Tool version</dt><dd>${toolVersion}</dd>
    <dt>Pages audited</dt><dd>${result.pagesAudited.length}</dd>
    <dt>WCAG</dt><dd>${version} Level ${level}</dd>
  </dl>
  <h2>Summary</h2>
  ${scorecardHtml}
  ${sectionsHtml}
</div>
</body>
</html>`;
}

function gradeColor(grade: string): string {
  return grade === 'A' ? '#27ae60' : grade === 'B' ? '#2980b9' : grade === 'C' ? '#f39c12' : '#c0392b';
}

function htmlScorecard(result: AuditResult): string {
  const { issues, moduleScores, overallScore } = result;
  const rows = PREFIX_ORDER.map((prefix) => {
    const mi = issues.filter((i) => i.prefix === prefix);
    const ms = moduleScores[prefix];
    if (mi.length === 0 && !ms) return '';
    const c = (impact: ImpactLevel) => mi.filter((i) => i.impact === impact).length;
    return `<tr>
      <td>${MODULE_LABELS[prefix]}</td>
      <td style="font-weight:600">${ms ? ms.score + '%' : '—'}</td>
      <td><span class="badge" style="background:${ms ? gradeColor(ms.grade) + '22' : '#eee'};color:${ms ? gradeColor(ms.grade) : '#999'}">${ms ? ms.grade : '—'}</span></td>
      <td style="color:${IMPACT_COLORS.critical};font-weight:600">${c('critical') || '—'}</td>
      <td style="color:${IMPACT_COLORS.serious};font-weight:600">${c('serious') || '—'}</td>
      <td style="color:${IMPACT_COLORS.moderate};font-weight:600">${c('moderate') || '—'}</td>
      <td style="color:${IMPACT_COLORS.minor}">${c('minor') || '—'}</td>
      <td><strong>${mi.length}</strong></td>
    </tr>`;
  }).filter(Boolean);

  const t = (impact: ImpactLevel) => issues.filter((i) => i.impact === impact).length;
  rows.push(`<tr class="total">
    <td>Overall</td>
    <td style="font-weight:700">${overallScore.score}%</td>
    <td><span class="badge" style="background:${gradeColor(overallScore.grade)}22;color:${gradeColor(overallScore.grade)}">${overallScore.grade}</span></td>
    <td style="color:${IMPACT_COLORS.critical}">${t('critical') || '—'}</td>
    <td style="color:${IMPACT_COLORS.serious}">${t('serious') || '—'}</td>
    <td style="color:${IMPACT_COLORS.moderate}">${t('moderate') || '—'}</td>
    <td style="color:${IMPACT_COLORS.minor}">${t('minor') || '—'}</td>
    <td>${issues.length}</td>
  </tr>`);

  return `<table>
    <thead><tr><th>Module</th><th>Score</th><th>Grade</th><th>Critical</th><th>Serious</th><th>Moderate</th><th>Minor</th><th>Total</th></tr></thead>
    <tbody>${rows.join('\n')}</tbody>
  </table>`;
}

function htmlIssue(issue: Issue): string {
  const color = IMPACT_COLORS[issue.impact];
  const bg = IMPACT_BG[issue.impact];
  const locationLabel = issue.prefix === 'ACC' ? 'Element' : 'Location';
  const locationValue = issue.prefix === 'ACC'
    ? `<code>${shortLocation(issue.location)}</code> <span style="color:#999;font-size:12px">${issue.location}</span>`
    : `<code>${issue.location}</code>`;

  return `<div class="issue">
    <div class="issue-header" style="background:${bg}">
      <span class="issue-id">${issue.id}</span>
      <span class="badge" style="background:${color}22;color:${color}">${issue.impact}</span>
      <h3 style="font-weight:500;text-transform:none;letter-spacing:0;font-size:14px;color:#222">${escapeHtml(issue.description)}</h3>
    </div>
    <dl class="issue-body">
      <dt>${locationLabel}</dt><dd>${locationValue}</dd>
      <dt>URL</dt><dd><a href="${issue.pageUrl}">${issue.pageUrl}</a></dd>
      <dt>Reference</dt><dd><a href="${issue.docLink}">${issue.docLink}</a></dd>
      <dt>Fix</dt><dd>${escapeHtml(issue.remediation)}</dd>
    </dl>
  </div>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- PDF ---

async function generatePdf(htmlPath: string, pdfPath: string): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${path.resolve(htmlPath)}`);
  await page.pdf({ path: pdfPath, format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '16mm', right: '16mm' }, printBackground: true });
  await browser.close();
}
