import { Page } from 'playwright';
import { Config, Issue, AuditModuleResult } from '../types';

const CONSENT_SELECTORS = [
  '[id*="cookie"]', '[class*="cookie"]',
  '[id*="consent"]', '[class*="consent"]',
  '[id*="gdpr"]', '[class*="gdpr"]',
  '[id*="banner"]', '[class*="banner"]',
];

export async function runPrivacyAudit(page: Page, config: Config): Promise<AuditModuleResult> {
  const issues: Issue[] = [];
  const pageUrl = page.url();
  const origin = new URL(pageUrl).origin;

  // Cookie consent banner — check all selectors in parallel, resolve on first visible
  const bannerTimeout = config.modules.privacy.consentBannerTimeout ?? 5000;
  const hasConsent = await Promise.any(
    CONSENT_SELECTORS.map((sel) =>
      page.locator(sel).first().waitFor({ state: 'visible', timeout: bannerTimeout }).then(() => true)
    )
  ).catch(() => false);
  if (!hasConsent) {
    issues.push({
      prefix: 'PRI',
      impact: 'serious',
      description: 'No cookie consent banner detected',
      location: pageUrl,
      docLink: 'https://gdpr.eu/cookies/',
      remediation: 'Implement a cookie consent mechanism that obtains user consent before setting non-essential cookies, as required by GDPR and ePrivacy Directive.',
      rule: 'cookie-consent-banner',
      pageUrl,
    });
  }

  // Privacy policy link
  const hasPrivacyLink = await page.locator('a').evaluateAll((els) =>
    els.some((el) => /privacy\s*(policy|notice)/i.test(el.textContent ?? ''))
  );
  if (!hasPrivacyLink) {
    issues.push({
      prefix: 'PRI',
      impact: 'serious',
      description: 'No privacy policy link detected',
      location: pageUrl,
      docLink: 'https://gdpr.eu/privacy-notice/',
      remediation: 'Add a clearly visible link to your privacy policy on every page, typically in the footer.',
      rule: 'privacy-policy-link',
      pageUrl,
    });
  }

  // CCPA "Do Not Sell" link (opt-in via config.modules.privacy.ccpa)
  if (config.modules.privacy.ccpa) {
    const hasDoNotSell = await page.locator('a').evaluateAll((els) =>
      els.some((el) => /do not sell/i.test(el.textContent ?? ''))
    );
    if (!hasDoNotSell) {
      issues.push({
        prefix: 'PRI',
        impact: 'moderate',
        description: 'No "Do Not Sell or Share My Personal Information" link detected',
        location: pageUrl,
        docLink: 'https://oag.ca.gov/privacy/ccpa',
        remediation: 'Add a "Do Not Sell or Share My Personal Information" link as required by CCPA.',
        rule: 'ccpa-do-not-sell-link',
        pageUrl,
      });
    }
  }

  // GPC declaration
  try {
    const gpcUrl = `${origin}/.well-known/gpc.json`;
    const response = await page.request.get(gpcUrl);
    if (!response.ok()) {
      issues.push({
        prefix: 'PRI',
        impact: 'minor',
        description: 'No GPC (Global Privacy Control) declaration found',
        location: gpcUrl,
        docLink: 'https://globalprivacycontrol.org/',
        remediation: 'Publish a /.well-known/gpc.json file with {"gpc": true, "lastUpdate": "YYYY-MM-DD"} to declare GPC support.',
        rule: 'gpc-declaration',
        pageUrl,
      });
    }
  } catch {
    // network error — skip silently
  }

  return { issues, totalChecks: config.modules.privacy.ccpa ? 4 : 3 };
}
