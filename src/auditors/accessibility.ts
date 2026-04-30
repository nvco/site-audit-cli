import { Page } from 'playwright';
import { Config, Issue } from '../types';
import * as path from 'path';

type AxeImpact = 'critical' | 'serious' | 'moderate' | 'minor';

interface AxeViolation {
  id: string;
  impact: AxeImpact;
  description: string;
  helpUrl: string;
  nodes: Array<{ target: string[]; failureSummary?: string }>;
}

function wcagTag(version: string, level: string): string {
  const v = version.replace('.', '');
  return `wcag${v}${level.toLowerCase()}`;
}

export async function runAccessibilityAudit(page: Page, config: Config): Promise<Issue[]> {
  const axePath = path.join(
    path.dirname(require.resolve('axe-core')),
    'axe.min.js'
  );
  await page.addScriptTag({ path: axePath });

  const tag = wcagTag(config.wcag.version, config.wcag.level);

  const violations: AxeViolation[] = await page.evaluate((runTag) => {
    return new Promise((resolve) => {
      (globalThis as unknown as { axe: { run: Function } }).axe.run(
        { runOnly: { type: 'tag', values: [runTag] } },
        (_err: unknown, results: { violations: AxeViolation[] }) => {
          resolve(results.violations);
        }
      );
    });
  }, tag);

  const issues: Issue[] = [];

  for (const v of violations) {
    for (const node of v.nodes) {
      issues.push({
        prefix: 'ACC',
        impact: v.impact,
        description: v.description,
        location: node.target.join(', '),
        docLink: v.helpUrl,
        remediation: node.failureSummary ?? v.description,
        rule: v.id,
        pageUrl: page.url(),
      });
    }
  }

  return issues;
}
