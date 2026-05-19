# Phase 10 — Security Module Additions

## Goals
SSL/TLS checker (separate from Playwright), Permissions-Policy header, mixed content detection.

## Tasks

- [x] Update `types.ts` — add `'SSL'` to `IssuePrefix`; add `ssl: boolean` to `Config.modules`
- [x] Update `config.ts` — default `modules.ssl` to `true` if absent from config
- [x] Create `src/auditors/ssl.ts` — 3 checks per hostname (cert-expiry, tls-version, https-redirect); uses Node `tls` + `http` modules, not Playwright
- [x] Update `src/auditors/security-headers.ts` — add Permissions-Policy to HEADER_CHECKS; add mixed content check via `page.evaluate()`; accept `page: Page` as param
- [x] Update `src/runner.ts` — add SSL prefix; run SSL auditor once per unique hostname; pass `page` to security-headers auditor
- [x] Update `src/reporter.ts` — add `SSL` to `PREFIX_ORDER` and `MODULE_LABELS`
- [x] Update root profiles (`sdet.json`, `compliance.json`, `full.json`) with `ssl: true`
