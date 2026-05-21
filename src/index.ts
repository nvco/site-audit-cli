import { loadConfig } from './config';
import { loadLastRun, saveLastRun, markNewIssues } from './regression';
import { version as toolVersion } from '../package.json';

const args = process.argv.slice(2);

async function main() {
  const configPath = args[0];
  const config = loadConfig(configPath);
  const mode = config.urls.length === 1 ? 'crawl' : 'list';
  console.log(`site-audit-cli v${toolVersion}`);
  const { wcag } = config.modules.accessibility;
  console.log(`Mode: ${mode} | URLs: ${config.urls.length} | WCAG ${wcag.version} Level ${wcag.level}`);

  const lastRun = config.compareLastRun ? loadLastRun() : null;

  const { runAudit } = await import('./runner');
  const result = await runAudit(config);

  if (lastRun) {
    result.issues = markNewIssues(result.issues, lastRun);
    const newIssues = result.issues.filter((i) => i.isNew && !i.isInformational);
    if (newIssues.length > 0) {
      console.log(`\n${newIssues.length} NEW violation(s) since last run (${lastRun.date})`);
      for (const issue of newIssues) {
        console.log(`  [NEW] ${issue.id} — ${issue.description}`);
      }
    } else {
      console.log(`\nNo new violations since last run (${lastRun.date})`);
    }
  }

  saveLastRun(result.issues, result.runDate);

  const { generateReports } = await import('./reporter');
  const { runDir } = await generateReports(result, 'reports');

  const { score, grade } = result.overallScore;
  console.log(`\nAudit complete — ${result.pagesAudited.length} page(s) audited, ${result.issues.length} issue(s) found`);
  console.log(`  Score:    ${score}% (${grade})`);
  console.log(`  Output:   ${runDir}/`);

  const blockingIssues = result.issues.filter((i) => !i.isInformational);
  if (blockingIssues.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
});
