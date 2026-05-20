# Changelog

## 2026-05-19

### Added
- `todo-14-improvements.md` — prioritized task list from full codebase review: 4 must-fix bugs, 5 should-fix issues, 5 improvements

### Added
- Phase 13 Docker support — Dockerfile updated to use Playwright's managed Chromium, docker-compose.yml volumes corrected, `.dockerignore` updated, verified end-to-end with test runs
- `.env.example` — timezone configuration for Docker; defaults to UTC, override with any IANA timezone
- `.github/workflows/audit.yml` — manually triggered GitHub Actions workflow with profile selector; push/PR triggers available via commented-out config
- Run duration added to reports — all formats now show date, time, and runtime (e.g. `2026-05-19 13:47:09 (runtime: 2s)`)
- HTML report fix formatting — remediation text now renders as structured bullet lists matching the markdown report

### Changed
- README restructured into Running (Docker, Local, GitHub Actions) and Configuration (Config profiles, Audit modules, Output formats, Timezone, Configuration reference) sections
- `src/reporter.ts` — `formatRemediationHtml` added for multi-section bullet list rendering; `formatRunDate` and `formatDuration` helpers added
- `src/runner.ts` — `startTime` captured at audit start; `runDurationMs` added to result
- `src/types.ts` — `runDurationMs: number` added to `AuditResult`
- CLAUDE.md — Phase 13 marked complete; Docker commands updated; "What's Left" updated to reflect all phases done

### Removed
- `todo-13-docker.md` — all tasks complete, moved to `archive/`

### Added
- `todo-13-docker.md` — full task list for Phase 13 (Docker): Dockerfile fixes, docker-compose.yml volume updates, .dockerignore, verification steps, README section

### Changed
- `CLAUDE.md` — added "What's Left" section pointing to Phase 13 and `todo-13-docker.md`; Docker command examples updated

### Changed
- `CLAUDE.md` — removed stale reference to `PLAN.md` as the design spec; `PLAN.md` is now documented as a historical record; `CLAUDE.md` and `README.md` are the authoritative references

### Removed
- `todo-09-cicd.md`, `todo-10-security.md`, `todo-11-accessibility-cookies.md`, `todo-12-regression.md` — all tasks checked off and moved to `archive/`

### Added
- `maxIssuesPerRule` config field (default 5) — caps violations shown per rule in markdown and HTML reports; scoring and JSON always use the full count; set to `0` for unlimited
- `keepRunsForDays` config field (default 0) — auto-deletes report folders older than N days before each run; `0` keeps all runs
- Overflow note in markdown and HTML reports when rule cap is active — lists truncated rules as a bullet list with a single "set `maxIssuesPerRule: 0` to see all" instruction per section

### Changed
- Report filenames changed from `report.{ext}` to `{domain-without-tld}-{timestamp}.{ext}` (e.g. `nvco-github-20260519-120212.html`) — files are self-identifying when shared standalone
- PDF output disabled by default across all config profiles — now opt-in via `"pdf": true` in `output.formats`; HTML is the preferred shareable format
- Report meta section — removed tool version; added crawl depth/maxPages, `maxIssuesPerRule`, and (when enabled) `compareLastRun`; meta fields now use hard line breaks so they render correctly in markdown
- Axe-core remediation text in markdown reports now formatted as nested bullets — "Fix all/any of the following:" lines indent as sub-bullets, fix items indent as sub-sub-bullets
- `src/config.ts` — `pdf` now defaults to `false` when not explicitly set; `maxIssuesPerRule` defaults to 5; `keepRunsForDays` defaults to 0
- `src/reporter.ts` — `deriveRunFolder` split into `deriveTimestamp` + `deriveBaseName`; `purgeOldRuns` helper added; `applyRuleCap` added for per-rule display truncation; `formatRemediation` added for axe-core nested bullet formatting
- README — audit modules table updated to include SSL/TLS and full Security Headers check list; output formats section updated to reflect new naming, PDF opt-in status, and format descriptions; description line updated
- CLAUDE.md — output formats section updated for PDF opt-in and new file naming; `maxIssuesPerRule` and `keepRunsForDays` documented

## 2026-05-15

### Changed
- Config profiles (`config/full.json`, `config/compliance.json`, `config/sdet.json`) reformatted — all module objects expanded to multi-line; field order aligned with README (`modules` → `output` → `compareLastRun` → `suppress` → `crawl` → `urls`); `standard` moved before `wcag` inside accessibility
- README configuration reference updated to match new field order and object style; code block changed from `jsonc` to `json`

### Added
- `maxPages: 0` support in crawler — setting `crawl.maxPages` to `0` disables the page cap and crawls the full site; documented in README config reference

### Changed
- Config schema redesigned — module-specific settings now nested inside each module entry; `wcag` and `standard` moved into `modules.accessibility`; `includeExternal` moved into `modules.brokenLinks`; top-level `wcag`, `brokenLinks`, and `standard` fields removed
- `modules` values changed from booleans to objects with `enabled` plus module-specific fields (e.g. `{ "enabled": true, "wcag": { "version": "2.2", "level": "AA" } }`)
- `src/types.ts` — `Config` redesigned with `BaseModuleConfig`, `AccessibilityModuleConfig`, `BrokenLinksModuleConfig`; removed top-level `wcag`, `brokenLinks`, `standard` fields
- `src/config.ts` — validation and defaulting rewritten to normalize module objects; handles both old boolean and new object format gracefully
- `src/auditors/accessibility.ts` — reads `config.modules.accessibility.wcag` and `.standard`
- `src/auditors/broken-links.ts` — reads `config.modules.brokenLinks.includeExternal`
- `src/runner.ts` — module enabled checks updated to `.enabled`; scoring uses `.enabled`
- `src/reporter.ts` — WCAG version/level read from `config.modules.accessibility.wcag`; `reportTitle` updated
- `src/index.ts` — WCAG version/level read from `config.modules.accessibility.wcag`
- `config/full.json`, `config/compliance.json`, `config/sdet.json` — restructured to new nested module format
- `README.md` — configuration reference updated to show new nested module structure

### Added
- `config/` folder — three profiles (`sdet.json`, `compliance.json`, `full.json`) consolidated here; replaces scattered root-level files and `config-examples/`

### Changed
- Default config path changed from `config.json` to `config/full.json` — running with no argument now runs a full audit automatically
- `src/config.ts` — updated default path and error message to reference `config/` profiles
- `config.example.json` and root-level `sdet.json`, `compliance.json`, `full.json` removed
- `config-examples/` folder and all five single-module reference configs removed
- `CLAUDE.md` — fully rewritten to reflect current architecture (phases 1–12, six audit modules, all new features)
- `PLAN.md` — CLI commands, Config Profiles section, and file structure updated for `config/` layout
- `README.md` — quick start, profile table, and GitHub Actions example updated for `config/` paths
- `.gitignore` — removed `config.json` entry (no longer a special file)

## 2026-05-15 (Phase 12)

### Added
- Regression detection (`src/regression.ts`) — fingerprints every issue by `rule|pageUrl|location` (trailing slashes normalised); saves `.last-run.json` after every run; on subsequent runs with `compareLastRun: true`, diffs current issues against the baseline and prints new violations to console
- `compareLastRun` config field — opt-in regression comparison; when enabled, loads `.last-run.json` and marks issues not seen in the previous run as `isNew`
- `[NEW]` badge in HTML reports and `` `[NEW]` `` tag in markdown headings for newly detected issues
- `.last-run.json` added to `.gitignore`

### Changed
- `src/types.ts` — `Issue` gains `isNew?: boolean`; `Config` gains `compareLastRun?: boolean`
- `src/index.ts` — loads and saves regression baseline; prints new violation summary to console before report generation

## 2026-05-15 (Phase 11)

### Added
- EN 301 549 standard support — new optional `standard` field in config (`"wcag"` default, `"en301549"` mode); in EN 301 549 mode, best-practice-only violations are marked informational and excluded from score and exit code; compliance violations prefixed with `[EN 301 549 §9]` in description
- Cookie SameSite check — flags cookies missing the `SameSite` attribute (moderate) or using `SameSite=None` without `Secure` (serious)
- Cookie expiry check — flags persistent cookies with lifetime > 1 year (moderate), per GDPR data minimisation

### Changed
- `src/types.ts` — `Issue` gains `isInformational?: boolean`; `Config` gains `standard?: 'wcag' | 'en301549'`
- `src/auditors/accessibility.ts` — EN 301 549 classification logic; informational issues excluded from `scoringIssueCount`
- `src/auditors/cookies.ts` — two new checks per cookie; `totalChecks` updated from 3 to 5 per cookie
- `src/runner.ts` — informational issues excluded from `moduleScoringIssueCounts`
- `src/index.ts` — exit code 1 only when non-informational issues are present
- `src/reporter.ts` — informational ACC issues rendered in a separate subsection in both markdown and HTML; grey styling in HTML; `markdownIssue()` extracted as a reusable helper

## 2026-05-15 (Phase 10)

### Added
- SSL/TLS auditor (`src/auditors/ssl.ts`) — 3 checks per unique hostname using Node `tls` and `http` modules (no Playwright): cert-expiry (critical if expired, serious if < 30 days), tls-version (serious if TLSv1/TLSv1.1 negotiated), https-redirect (serious if HTTP does not 301/302 to HTTPS)
- `SSL` issue prefix and `SSL/TLS` module label — appears between Security Headers and Broken Links in all report formats
- Permissions-Policy header check — added to `security-headers.ts` as 6th header check (impact: moderate)
- Mixed content detection — `security-headers.ts` scans page DOM for HTTP resources on HTTPS pages via `page.$$eval()`; each insecure resource → one SEC issue

### Changed
- `src/auditors/security-headers.ts` — now accepts `page: Page` as first parameter for mixed content check; totalChecks updated to `HEADER_CHECKS.length + 1` (7 per page)
- `src/runner.ts` — SSL auditor runs once per unique hostname (deduplication via `checkedSslHosts` set); passes `page` to security-headers auditor; SSL added to all prefix maps and counters
- `src/types.ts` — `IssuePrefix` union extended with `'SSL'`; `Config.modules` now includes `ssl: boolean`
- `src/config.ts` — defaults `modules.ssl` to `true` for configs written before Phase 10
- `src/reporter.ts` — `SSL/TLS` added to `MODULE_LABELS` and `PREFIX_ORDER`
- Root profiles (`sdet.json`, `compliance.json`, `full.json`) — `ssl: true` added to modules

## 2026-05-15 (Phase 9)

### Added
- Module-level scoring — each enabled module gets a score (0–100%) and letter grade (A/B/C/D) based on passing checks vs total checks
- Overall score — average across all enabled modules, shown in console output and all report formats
- Exit codes — `0` for clean pass, `1` if any issues found, `2` for tool errors; enables CI/CD pipeline integration
- `AuditModuleResult` type — all auditors now return `{ issues, totalChecks, scoringIssueCount? }` instead of `Issue[]`
- `ModuleScore` type — `{ score, grade }` added to `AuditResult`
- Score + grade columns in markdown and HTML scorecards
- `overall` block in JSON output: `{ score, grade }`
- Root config profiles — `sdet.json` (security/links/cookies), `compliance.json` (accessibility/privacy/cookies), `full.json` (all modules)
- `README.md` — quick start, profile table, module list, output formats, scoring, exit codes, GitHub Actions example, config reference

### Changed
- All 5 auditors updated to return `AuditModuleResult` — each tracks its own `totalChecks` (ACC: axe passes+violations; PRI: 4; COO: cookies×3; SEC: 5; LNK: links checked)
- `runner.ts` — accumulates `totalChecks` and `scoringIssueCounts` per module, computes scores before returning `AuditResult`
- `reporter.ts` — scorecard updated in all three formats (MD/HTML/JSON) to show score and grade per module
- `index.ts` — console output now shows overall score/grade; exits with code 1 when issues are found

## 2026-05-14 (Phase 8)

### Added
- HTML report — styled, colour-coded by severity (critical/serious/moderate/minor), self-contained with inline CSS
- JSON report — machine-readable output with all issue data, suitable for CI/CD tooling
- PDF report — generated automatically from HTML via Playwright; `page-break-inside: avoid` keeps issue cards intact; white background and no outer padding in print mode
- `output.formats` config field — all four formats (markdown, html, pdf, json) enabled by default; disable individually as needed
- Timestamped run folders — each run writes to `reports/YYYYMMDD-HHmmss/` instead of flat files
- `todo-08-output-formats.md` — Phase 8 task list

### Changed
- Reporter completely rewritten to support multiple output formats and timestamped folders
- `src/types.ts` — added `OutputFormats` interface and `output.formats` to `Config`
- `src/config.ts` — defaults `output.formats` to all-true if field is absent from config
- `src/index.ts` — simplified; removed `pdf` subcommand, updated console output to list all generated files
- `config.example.json` and all `config-examples/` files updated with `output.formats` block

### Removed
- `src/pdf.ts` — superseded by automatic PDF generation in reporter
- `md-to-pdf` dependency — replaced by Playwright's built-in `page.pdf()`
- `pdf` subcommand — PDF is now just another output format, no separate command needed

## 2026-05-14

### Added
- `todo-07-polish.md` — Phase 7 task list covering error handling, config review, and local end-to-end testing (now archived — phase complete)

### Changed
- PLAN.md: output formats redesigned — timestamped run folders (`reports/YYYYMMDD-HHmmss/`), four formats (markdown, HTML, PDF, JSON) all on by default via `output.formats` config, PDF now automatic (no separate subcommand)
- PLAN.md: `pdf` subcommand removed from CLI Commands; Phase 6 noted as superseded; new Phase 8 (output formats) inserted; downstream phases renumbered to 9–13
- PLAN.md: Output section rewritten to reflect new folder structure and format files
- PLAN.md: `output.formats` block added to config schema
- `config.example.json`: URL updated to point at the GitHub Pages test site
- `src/config.ts`: error messages now show the actual config file path instead of hardcoded `config.json`
- `src/index.ts`: tool errors now exit with code `2` (tool error) instead of `1`, prepping for Phase 9 exit code semantics
- `src/runner.ts`: issues now sorted by prefix then severity before ID assignment, so IDs reflect display order

### Fixed
- Issue IDs were assigned before sorting, causing critical issues to appear with high ID numbers; fixed by sorting before `assignIds()`

## 2026-05-13

### Changed
- PLAN.md updated with local + Docker dual run mode support
- CLI Commands section now shows both `node dist/index.js` and `docker compose` usage
- Config Profiles section added — three root profiles (`sdet.json`, `compliance.json`, `full.json`) as primary entry points, `config-examples/` clarified as single-module reference configs
- Phases table extended to include phases 8–11
- Planned Features section added covering CI/CD readiness (Phase 8), security additions (Phase 9), accessibility/cookie additions (Phase 10), and regression detection (Phase 11)

## 2026-05-01

### Fixed
- Accessibility auditor now runs all WCAG tags up to the configured version/level (was only running WCAG 2.2-specific rules, missing all 2.0/2.1 violations)
- Accessibility reference links now point to W3C WAI Understanding pages instead of dequeuniversity.com
- Security headers auditor no longer does a second page.goto() — headers captured from runner's initial navigation
- Browser context now uses bypassCSP to allow axe-core injection on pages with Content-Security-Policy
- Test page redesigned with targeted distinct violations (color-contrast ×2, image-alt ×2, label ×2, button-name ×2, heading-order ×1) instead of the same rule firing on many elements

### Changed
- Report structure: impact moved back to bullet point, ACC issues show Element (short) + Full path (full CSS selector), non-ACC issues show Location, Rule renamed to Reference

### Added
- `docs/index.html` — single-page ToolShop e-commerce test site with deliberate issues across all five audit modules (missing alt text, no cookie consent, broken links, missing security headers, no privacy policy)
- `config-examples/` folder with five named configs (accessibility, privacy, security-headers, broken-links, full) all pointed at the GitHub Pages test site
- PDF command (`src/pdf.ts`) — converts existing markdown reports to PDF via md-to-pdf

### Changed
- Report merged into a single file — fix detail now included inline under each issue, remediation file removed
- Issue headings restructured: ID + impact in H3, Issue/Element/URL/Rule/Fix as bullet points
- H1 title reflects the audit scope — single module runs show e.g. "Audit Report: Accessibility"
- Config file path is now an optional CLI argument — defaults to `config.json` if omitted
- `maxPages` default set to 5 across all config examples

### Removed
- Separate remediation file — content merged into the main report

## 2026-04-30

### Added
- Reporter (`src/reporter.ts`) — generates `{hostname}-{date}-report.md` (scorecard + per-module issue list) and `{hostname}-{date}-remediation.md` (full fix detail keyed to same IDs)
- Runner (`src/runner.ts`) — orchestrates auditors across all pages, applies suppress list with wildcard support, assigns globally unique per-prefix IDs (ACC-001, SEC-001, etc.)
- All five auditors implemented: accessibility (axe-core), privacy (consent banner, privacy policy, CCPA, GPC), cookies (Secure/HttpOnly/third-party flags), security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy), broken links (HEAD/GET with 4xx/5xx detection)
- Crawler implementation (`src/crawler.ts`) — BFS link discovery with same-origin filtering, depth and maxPages limits, URL normalisation, and graceful error handling
- Initial project scaffold — TypeScript, Playwright, axe-core, md-to-pdf
- Docker setup with Dockerfile and docker-compose.yml
- Config loader (`src/config.ts`) with validation and typed `Config` interface
- Source file stubs for all five auditors, runner, reporter, crawler, and PDF command
- `config.example.json` with all fields documented
- GitHub repository initialized at https://github.com/nvco/site-audit-cli
- `.claude/commands/commit-changes.md` slash command for the standard commit workflow

### Changed
- `src/index.ts` wired to call `generateReports()` and log output file paths on completion
- `Issue` type updated to include optional `id` field assigned by the runner
- CHANGELOG.md updated with initial project scaffold details
- Completed TODO files moved to `archive/`
