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
  console.log('Config loaded successfully. Audit runner not yet implemented.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
