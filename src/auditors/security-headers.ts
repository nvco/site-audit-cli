import { Page } from 'playwright';
import { Config, Issue, ImpactLevel, AuditModuleResult } from '../types';

interface HeaderCheck {
  header: string;
  rule: string;
  impact: ImpactLevel;
  description: string;
  remediation: string;
  docLink: string;
}

const HEADER_CHECKS: HeaderCheck[] = [
  {
    header: 'content-security-policy',
    rule: 'missing-csp',
    impact: 'serious',
    description: 'Missing Content-Security-Policy header',
    remediation: 'Add a Content-Security-Policy header to restrict which resources the browser is allowed to load, reducing XSS risk.',
    docLink: 'https://owasp.org/www-project-secure-headers/#content-security-policy',
  },
  {
    header: 'strict-transport-security',
    rule: 'missing-hsts',
    impact: 'serious',
    description: 'Missing Strict-Transport-Security header',
    remediation: 'Add "Strict-Transport-Security: max-age=31536000; includeSubDomains" to enforce HTTPS connections.',
    docLink: 'https://owasp.org/www-project-secure-headers/#strict-transport-security',
  },
  {
    header: 'x-frame-options',
    rule: 'missing-x-frame-options',
    impact: 'moderate',
    description: 'Missing X-Frame-Options header',
    remediation: 'Add "X-Frame-Options: DENY" or "SAMEORIGIN" to prevent clickjacking attacks.',
    docLink: 'https://owasp.org/www-project-secure-headers/#x-frame-options',
  },
  {
    header: 'x-content-type-options',
    rule: 'missing-x-content-type-options',
    impact: 'moderate',
    description: 'Missing X-Content-Type-Options header',
    remediation: 'Add "X-Content-Type-Options: nosniff" to prevent MIME type sniffing.',
    docLink: 'https://owasp.org/www-project-secure-headers/#x-content-type-options',
  },
  {
    header: 'referrer-policy',
    rule: 'missing-referrer-policy',
    impact: 'minor',
    description: 'Missing Referrer-Policy header',
    remediation: 'Add a Referrer-Policy header (e.g. "strict-origin-when-cross-origin") to control how much referrer information is sent with requests.',
    docLink: 'https://owasp.org/www-project-secure-headers/#referrer-policy',
  },
  {
    header: 'permissions-policy',
    rule: 'missing-permissions-policy',
    impact: 'moderate',
    description: 'Missing Permissions-Policy header',
    remediation: 'Add a Permissions-Policy header to restrict browser feature access (e.g. "camera=(), microphone=(), geolocation=()") and reduce the attack surface.',
    docLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy',
  },
];

export async function runSecurityHeadersAudit(
  page: Page,
  headers: Record<string, string>,
  pageUrl: string,
  _config: Config
): Promise<AuditModuleResult> {
  const issues: Issue[] = [];

  for (const check of HEADER_CHECKS) {
    if (!(check.header in headers)) {
      issues.push({
        prefix: 'SEC',
        impact: check.impact,
        description: check.description,
        location: pageUrl,
        docLink: check.docLink,
        remediation: check.remediation,
        rule: check.rule,
        pageUrl,
      });
    }
  }

  // Mixed content: HTTP resources loaded on an HTTPS page
  if (pageUrl.startsWith('https://')) {
    const resourceSelectors = [
      'img[src]', 'script[src]', 'iframe[src]', 'audio[src]',
      'video[src]', 'embed[src]', 'object[data]', 'source[src]',
      'link[rel="stylesheet"][href]',
    ].join(',');

    const mixedUrls = await page.$$eval(resourceSelectors, (els) =>
      els
        .map((el) => el.getAttribute('src') ?? el.getAttribute('data') ?? el.getAttribute('href') ?? '')
        .filter((v) => v.startsWith('http:'))
    );

    for (const url of mixedUrls) {
      issues.push({
        prefix: 'SEC',
        impact: 'serious',
        description: `Mixed content: HTTP resource loaded on HTTPS page`,
        location: url,
        docLink: 'https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content',
        remediation: `Replace the HTTP URL with its HTTPS equivalent: ${url}`,
        rule: 'mixed-content',
        pageUrl,
      });
    }
  }

  // totalChecks: 6 header checks + 1 mixed content check per page
  return { issues, totalChecks: HEADER_CHECKS.length + 1 };
}
