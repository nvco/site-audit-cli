import { Page } from 'playwright';
import { Config, Issue, AuditModuleResult } from '../types';
import * as path from 'path';

type AxeImpact = 'critical' | 'serious' | 'moderate' | 'minor';

interface AxeViolation {
  id: string;
  impact: AxeImpact;
  description: string;
  tags: string[];
  nodes: Array<{ target: string[]; failureSummary?: string }>;
}

const WCAG_SC_SLUGS: Record<string, string> = {
  wcag111: 'non-text-content',
  wcag121: 'audio-only-and-video-only-prerecorded',
  wcag122: 'captions-prerecorded',
  wcag123: 'audio-description-or-media-alternative-prerecorded',
  wcag124: 'captions-live',
  wcag125: 'audio-description-prerecorded',
  wcag131: 'info-and-relationships',
  wcag132: 'meaningful-sequence',
  wcag133: 'sensory-characteristics',
  wcag134: 'orientation',
  wcag135: 'identify-input-purpose',
  wcag141: 'use-of-color',
  wcag142: 'audio-control',
  wcag143: 'contrast-minimum',
  wcag144: 'resize-text',
  wcag145: 'images-of-text',
  wcag1410: 'reflow',
  wcag1411: 'non-text-contrast',
  wcag1412: 'text-spacing',
  wcag1413: 'content-on-hover-or-focus',
  wcag211: 'keyboard',
  wcag212: 'no-keyboard-trap',
  wcag214: 'character-key-shortcuts',
  wcag221: 'timing-adjustable',
  wcag222: 'pause-stop-hide',
  wcag231: 'three-flashes-or-below-threshold',
  wcag241: 'bypass-blocks',
  wcag242: 'page-titled',
  wcag243: 'focus-order',
  wcag244: 'link-purpose-in-context',
  wcag245: 'multiple-ways',
  wcag246: 'headings-and-labels',
  wcag247: 'focus-visible',
  wcag2411: 'focus-appearance',
  wcag251: 'pointer-gestures',
  wcag252: 'pointer-cancellation',
  wcag253: 'label-in-name',
  wcag254: 'motion-actuation',
  wcag257: 'dragging-movements',
  wcag258: 'target-size-minimum',
  wcag311: 'language-of-page',
  wcag312: 'language-of-parts',
  wcag321: 'on-focus',
  wcag322: 'on-input',
  wcag326: 'consistent-help',
  wcag331: 'error-identification',
  wcag332: 'labels-or-instructions',
  wcag333: 'error-suggestion',
  wcag334: 'error-prevention-legal-financial-data',
  wcag337: 'redundant-entry',
  wcag338: 'accessible-authentication-minimum',
  wcag411: 'parsing',
  wcag412: 'name-role-value',
  wcag413: 'status-messages',
};

function wcagDocLink(tags: string[]): string {
  for (const tag of tags) {
    if (/^wcag\d+$/.test(tag) && WCAG_SC_SLUGS[tag]) {
      return `https://www.w3.org/WAI/WCAG22/Understanding/${WCAG_SC_SLUGS[tag]}`;
    }
  }
  return 'https://www.w3.org/WAI/standards-guidelines/wcag/';
}

function wcagTags(version: string, level: string): string[] {
  const tags: string[] = [];
  const levels = level === 'AAA' ? ['a', 'aa', 'aaa'] : level === 'AA' ? ['a', 'aa'] : ['a'];
  const versions = version === '2.2' ? ['2', '21', '22'] : version === '2.1' ? ['2', '21'] : ['2'];
  for (const v of versions) {
    for (const l of levels) {
      tags.push(`wcag${v}${l}`);
    }
  }
  return tags;
}

export async function runAccessibilityAudit(page: Page, config: Config): Promise<AuditModuleResult> {
  const axePath = path.join(
    path.dirname(require.resolve('axe-core')),
    'axe.min.js'
  );
  await page.addScriptTag({ path: axePath });

  const { wcag, standard } = config.modules.accessibility;
  const tags = wcagTags(wcag.version, wcag.level);

  const { violations, passesCount } = await page.evaluate((runTags) => {
    return new Promise<{ violations: AxeViolation[], passesCount: number }>((resolve) => {
      (globalThis as unknown as { axe: { run: Function } }).axe.run(
        { runOnly: { type: 'tag', values: runTags } },
        (_err: unknown, results: { violations: AxeViolation[], passes: unknown[] }) => {
          resolve({ violations: results.violations, passesCount: results.passes.length });
        }
      );
    });
  }, tags);

  const isEn301549 = standard === 'en301549';
  const issues: Issue[] = [];
  let complianceViolationCount = 0;

  for (const v of violations) {
    const hasWcagTag = v.tags.some((t) => /^wcag\d+[a]+/.test(t));
    const isInformational = isEn301549 && !hasWcagTag;

    if (!isInformational) complianceViolationCount++;

    const description = isEn301549 && hasWcagTag ? `[EN 301 549 §9] ${v.description}` : v.description;

    for (const node of v.nodes) {
      issues.push({
        prefix: 'ACC',
        impact: v.impact,
        description,
        location: node.target.join(', '),
        docLink: wcagDocLink(v.tags),
        remediation: node.failureSummary ?? v.description,
        rule: v.id,
        pageUrl: page.url(),
        isInformational: isInformational || undefined,
      });
    }
  }

  return {
    issues,
    totalChecks: passesCount + violations.length,
    scoringIssueCount: isEn301549 ? complianceViolationCount : violations.length,
  };
}
