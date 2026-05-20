# Phase 14 — Code Review Improvements

## Must Fix

- [ ] **GitHub Actions: add `npm run build` step** — `dist/` may be stale; workflow runs old code
  - Add `- run: npm run build` before `node dist/index.js` in `.github/workflows/audit.yml`

- [ ] **Regression tracking bug** `src/regression.ts:40` — `false || undefined` evaluates to `undefined`, breaking `isNew` flag
  - Change `!known.has(fingerprint(issue)) || undefined` to `!known.has(fingerprint(issue)) ? true : undefined`

- [ ] **`keepRunsForDays` accepts negative values** `src/config.ts` — value of `-1` deletes all reports
  - Validate value is `>= 0`; reset to `0` if invalid

- [ ] **`maxIssuesPerRule` accepts negative values** `src/config.ts` — value of `-1` shows no issues
  - Validate value is `>= 0`; reset to `5` if invalid

## Should Fix

- [ ] **`escapeHtml` doesn't escape quotes** `src/reporter.ts` — issue descriptions containing `"` could break HTML attributes
  - Add `.replace(/"/g, '&quot;')` and `.replace(/'/g, '&#39;')`

- [ ] **Folder date parsing doesn't guard against `NaN`** `src/reporter.ts:94` — silent failure in purge logic if date is invalid
  - Add `if (isNaN(folderDate)) continue;` after parsing

- [ ] **Broken links total check count calculated before dedup** `src/auditors/broken-links.ts` — slightly inaccurate module scores
  - Move `totalChecks` assignment to after deduplication

- [ ] **Mixed content check has false positives** `src/auditors/security-headers.ts` — relative URLs and data URIs incorrectly flagged
  - Filter to only flag URLs that explicitly start with `http:`

- [ ] **CCPA check flags all non-US sites** `src/auditors/privacy.ts` — false positive for non-California businesses
  - Make CCPA check opt-in via config, or gate behind a `ccpa: true` flag

## Could Improve

- [ ] **`require('../package.json')` called at runtime in two places** `src/index.ts` and `src/reporter.ts` — inefficient
  - Read once at startup and pass version through or use a shared constant

- [ ] **Logging prefix inconsistency** — `[crawler]`, `[runner]` prefixes used inconsistently; privacy auditor has none
  - Standardize to `[module-name]` format across all auditors and core files

- [ ] **Crawler doesn't normalize query string param order** `src/crawler.ts` — `?a=1&b=2` and `?b=2&a=1` treated as different URLs, causing duplicate page audits
  - Add `parsed.searchParams.sort()` in `normalise()`

- [ ] **No explicit page load timeout in crawler** `src/crawler.ts:50` — slow pages can hang the entire audit
  - Add `timeout: 30000` to `page.goto()` options

- [ ] **PDF generation opens a second Chromium instance** `src/reporter.ts` — wasteful, browser already running during audit
  - Reuse existing browser context or generate PDF from the already-open page
