import { loadConfig } from './config';

const args = process.argv.slice(2);

async function main() {
  if (args[0] === 'pdf') {
    const reportBase = args[1];
    if (!reportBase) {
      console.error('Usage: site-audit-cli pdf reports/<report-base-name>');
      process.exit(1);
    }
    const { generatePdfs } = await import('./pdf');
    await generatePdfs(reportBase);
    return;
  }

  const config = loadConfig();
  const mode = config.urls.length === 1 ? 'crawl' : 'list';
  console.log(`site-audit-cli v${require('../package.json').version}`);
  console.log(`Mode: ${mode} | URLs: ${config.urls.length} | WCAG ${config.wcag.version} Level ${config.wcag.level}`);

  const { runAudit } = await import('./runner');
  const result = await runAudit(config);

  const { generateReports } = await import('./reporter');
  const { reportPath, remediationPath } = await generateReports(result, 'reports');

  console.log(`\nAudit complete — ${result.pagesAudited.length} page(s) audited, ${result.issues.length} issue(s) found`);
  console.log(`  Report:      ${reportPath}`);
  console.log(`  Remediation: ${remediationPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
