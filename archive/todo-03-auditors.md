# TODO 03 — Auditors

## Goals
Implement all five auditors. Each receives a Playwright `Page` and `Config`, returns `Issue[]`. No ID assignment here — that happens in the runner.

## Tasks

### Accessibility (`src/auditors/accessibility.ts`)
- [x] Inject axe-core into the page via `page.addScriptTag`
- [x] Run axe with the configured WCAG version and level as a tag filter (e.g. `wcag2aa`)
- [x] Map each violation to an `Issue` — description, CSS selector as location, link to the relevant WCAG success criterion on w3.org, remediation from axe's `help` and `nodes[].failureSummary`
- [x] Impact mapping: axe's `critical` → `critical`, `serious` → `serious`, `moderate` → `moderate`, `minor` → `minor`

### Privacy (`src/auditors/privacy.ts`)
- [x] Check for a cookie consent banner — look for common selectors and keywords (cookiebanner, cookie-notice, gdpr, etc.)
- [x] Check for a privacy policy link — `<a>` containing "privacy policy" or "privacy notice" (case-insensitive)
- [x] Check for a CCPA "Do Not Sell" link — `<a>` containing "do not sell" (case-insensitive)
- [x] Check for `/.well-known/gpc.json` — HTTP GET, expect 200 with valid JSON
- [x] Each missing check → one `PRI` issue at `serious` impact with a link to relevant CCPA/GDPR documentation

### Cookies (`src/auditors/cookies.ts`)
- [x] Capture all cookies via `page.context().cookies()` after page load
- [x] For each cookie flag as an issue if: missing `Secure` flag, missing `HttpOnly` flag, or is a third-party cookie (domain doesn't match page origin)
- [x] Impact: missing `Secure` → `serious`, missing `HttpOnly` → `moderate`, third-party → `minor`
- [x] `location` = cookie name + domain, `docLink` → MDN Set-Cookie docs

### Security Headers (`src/auditors/security-headers.ts`)
- [x] Capture response headers via a Playwright `page.goto` response object
- [x] Check for presence of: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- [x] Missing `CSP` or `HSTS` → `serious`; missing `X-Frame-Options` or `X-Content-Type-Options` → `moderate`; missing `Referrer-Policy` → `minor`
- [x] `docLink` → OWASP reference for each header

### Broken Links (`src/auditors/broken-links.ts`)
- [x] Collect all `<a href>` links on the page
- [x] Filter to internal links only; if `config.brokenLinks.includeExternal` is true, include external too
- [x] HEAD request each URL (fall back to GET if HEAD returns 405)
- [x] Report any 4xx or 5xx response as a `LNK` issue at `serious` impact
- [x] `location` = the broken URL, `docLink` → MDN HTTP status docs

## Done When
- [x] All five auditors return correct `Issue[]` with no ID field (prefix only)
- [x] TypeScript compiles without errors
- [x] Each auditor handles errors gracefully (network failures, missing elements) without crashing
