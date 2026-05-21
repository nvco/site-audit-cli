# Phase 14 — Code Review Improvements

## Must Fix

- [x] **GitHub Actions: add `npm run build` step** — `dist/` may be stale; workflow runs old code
  - Add `- run: npm run build` before `node dist/index.js` in `.github/workflows/audit.yml`

- [x] **Regression tracking bug** `src/regression.ts:40` — `false || undefined` evaluates to `undefined`, breaking `isNew` flag
  - Change `!known.has(fingerprint(issue)) || undefined` to `!known.has(fingerprint(issue)) ? true : undefined`

- [x] **`keepRunsForDays` accepts negative values** `src/config.ts` — value of `-1` deletes all reports
  - Validate value is `>= 0`; reset to `0` if invalid

- [x] **`maxIssuesPerRule` accepts negative values** `src/config.ts` — value of `-1` shows no issues
  - Validate value is `>= 0`; reset to `5` if invalid

## Should Fix

- [x] **`escapeHtml` doesn't escape quotes** `src/reporter.ts` — issue descriptions containing `"` could break HTML attributes
  - Add `.replace(/"/g, '&quot;')` and `.replace(/'/g, '&#39;')`

- [x] **Folder date parsing doesn't guard against `NaN`** `src/reporter.ts:94` — silent failure in purge logic if date is invalid
  - Add `if (isNaN(folderDate)) continue;` after parsing

- [x] **Broken links total check count calculated before dedup** `src/auditors/broken-links.ts` — reviewed, dedup happens via Set before totalChecks is read; no fix needed

- [x] **Mixed content check has false positives** `src/auditors/security-headers.ts` — reviewed, filter already uses `v.startsWith('http:')` so relative URLs and data URIs are not flagged; no fix needed

- [x] **CCPA check flags all non-US sites** `src/auditors/privacy.ts` — false positive for non-California businesses
  - Made CCPA check opt-in via `"ccpa": true` in the privacy module config

## Could Improve

- [x] **`require('../package.json')` called at runtime in two places** `src/index.ts` and `src/reporter.ts` — inefficient
  - Replaced with `import { version as toolVersion } from '../package.json'` in both files

- [x] **Logging prefix inconsistency** — reviewed, only crawler.ts and runner.ts have logging and both use `[module]` prefix consistently; auditors use silent catches by design; no fix needed

- [x] **Crawler doesn't normalize query string param order** `src/crawler.ts` — `?a=1&b=2` and `?b=2&a=1` treated as different URLs, causing duplicate page audits
  - Add `parsed.searchParams.sort()` in `normalise()`

- [x] **No explicit page load timeout in crawler** `src/crawler.ts:50` — slow pages can hang the entire audit
  - Add `timeout: 30000` to `page.goto()` options

- [x] **PDF generation opens a second Chromium instance** `src/reporter.ts` — audit browser is already closed by the time PDF runs, so reuse isn't possible; instead moved chromium import inside generatePdf() so it's only loaded when PDF is actually enabled
