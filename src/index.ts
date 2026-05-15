import { loadConfig } from './config';

const args = process.argv.slice(2);

async function main() {
  const configPath = args[0];
  const config = loadConfig(configPath);
  const mode = config.urls.length === 1 ? 'crawl' : 'list';
  const toolVersion = require('../package.json').version;

  console.log(`site-audit-cli v${toolVersion}`);
  console.log(`Mode: ${mode} | URLs: ${config.urls.length} | WCAG ${config.wcag.version} Level ${config.wcag.level}`);

  const { runAudit } = await import('./runner');
  const result = await runAudit(config);

  const { generateReports } = await import('./reporter');
  const { runDir } = await generateReports(result, 'reports');

  const { score, grade } = result.overallScore;
  console.log(`\nAudit complete — ${result.pagesAudited.length} page(s) audited, ${result.issues.length} issue(s) found`);
  console.log(`  Score:    ${score}% (${grade})`);
  console.log(`  Output:   ${runDir}/`);

  if (result.issues.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
});
