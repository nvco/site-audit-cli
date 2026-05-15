import { Page } from 'playwright';
import { Config, Issue, AuditModuleResult } from '../types';

export async function runCookieAudit(page: Page, _config: Config): Promise<AuditModuleResult> {
  const issues: Issue[] = [];
  const pageUrl = page.url();
  const pageHost = new URL(pageUrl).hostname;

  const cookies = await page.context().cookies();

  for (const cookie of cookies) {
    const location = `${cookie.name} (${cookie.domain})`;
    const isThirdParty = !pageHost.endsWith(cookie.domain.replace(/^\./, ''));

    if (!cookie.secure) {
      issues.push({
        prefix: 'COO',
        impact: 'serious',
        description: `Cookie "${cookie.name}" is missing the Secure flag`,
        location,
        docLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#secure',
        remediation: `Set the Secure attribute on the "${cookie.name}" cookie so it is only transmitted over HTTPS.`,
        rule: 'cookie-missing-secure',
        pageUrl,
      });
    }

    if (!cookie.httpOnly) {
      issues.push({
        prefix: 'COO',
        impact: 'moderate',
        description: `Cookie "${cookie.name}" is missing the HttpOnly flag`,
        location,
        docLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#httponly',
        remediation: `Set the HttpOnly attribute on the "${cookie.name}" cookie to prevent JavaScript access and reduce XSS risk.`,
        rule: 'cookie-missing-httponly',
        pageUrl,
      });
    }

    if (isThirdParty) {
      issues.push({
        prefix: 'COO',
        impact: 'minor',
        description: `Third-party cookie "${cookie.name}" set by ${cookie.domain}`,
        location,
        docLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#third-party_cookies',
        remediation: `Review whether the third-party cookie "${cookie.name}" from ${cookie.domain} is necessary and ensure users have consented to it.`,
        rule: 'cookie-third-party',
        pageUrl,
      });
    }

    const sameSite = (cookie as { sameSite?: string }).sameSite;
    if (!sameSite) {
      issues.push({
        prefix: 'COO',
        impact: 'moderate',
        description: `Cookie "${cookie.name}" is missing the SameSite attribute`,
        location,
        docLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value',
        remediation: `Set SameSite=Lax or SameSite=Strict on the "${cookie.name}" cookie to mitigate CSRF attacks.`,
        rule: 'cookie-missing-samesite',
        pageUrl,
      });
    } else if (sameSite === 'None' && !cookie.secure) {
      issues.push({
        prefix: 'COO',
        impact: 'serious',
        description: `Cookie "${cookie.name}" has SameSite=None but is missing the Secure flag`,
        location,
        docLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value',
        remediation: `Add the Secure flag to the "${cookie.name}" cookie — SameSite=None requires Secure to be set.`,
        rule: 'cookie-samesite-none-insecure',
        pageUrl,
      });
    }

    const ONE_YEAR_S = 365 * 24 * 60 * 60;
    const nowS = Date.now() / 1000;
    if (cookie.expires > 0 && cookie.expires - nowS > ONE_YEAR_S) {
      const expiryDate = new Date(cookie.expires * 1000).toISOString().slice(0, 10);
      issues.push({
        prefix: 'COO',
        impact: 'moderate',
        description: `Cookie "${cookie.name}" has a lifetime exceeding 1 year (expires ${expiryDate})`,
        location,
        docLink: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/cookies-and-similar-technologies/cookies-and-similar-technologies/',
        remediation: `Reduce the expiry of the "${cookie.name}" cookie to 12 months or less as required by GDPR data minimisation principles.`,
        rule: 'cookie-expiry',
        pageUrl,
      });
    }
  }

  // 5 checks per cookie (secure, httpOnly, third-party, sameSite, expiry); if no cookies, score is 100
  return { issues, totalChecks: cookies.length * 5 };
}
