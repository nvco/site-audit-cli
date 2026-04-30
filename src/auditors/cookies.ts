import { Page } from 'playwright';
import { Config, Issue } from '../types';

export async function runCookieAudit(page: Page, _config: Config): Promise<Issue[]> {
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
  }

  return issues;
}
