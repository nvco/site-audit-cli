import * as fs from 'fs';
import * as path from 'path';

export async function generatePdfs(reportBase: string): Promise<void> {
  const mdToPdf = (await import('md-to-pdf')).mdToPdf;

  const inputs = [
    `${reportBase}-report.md`,
    `${reportBase}-remediation.md`,
  ];

  for (const mdPath of inputs) {
    const resolved = path.resolve(mdPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Input file not found: ${resolved}`);
    }

    const pdfPath = resolved.replace(/\.md$/, '.pdf');
    await mdToPdf({ path: resolved }, { dest: pdfPath });
    console.log(`PDF written: ${pdfPath}`);
  }
}
