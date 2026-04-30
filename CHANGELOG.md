# Changelog

## 2026-04-30

### Added
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
- CHANGELOG.md updated with initial project scaffold details
- Completed TODO files moved to `archive/`
