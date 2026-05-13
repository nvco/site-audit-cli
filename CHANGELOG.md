# Changelog

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
