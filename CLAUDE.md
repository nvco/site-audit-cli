# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

A CLI web audit tool built in TypeScript using Playwright. It audits websites across six areas (accessibility, privacy, cookies, security headers, SSL/TLS, broken links) and produces markdown, HTML, PDF, and JSON reports per run. Supports local (Node.js) and Docker run modes.

This file and `README.md` are the authoritative references for current architecture and configuration. `PLAN.md` is kept as a historical record of the original design and is not kept up to date.

## Repository

https://github.com/nvco/site-audit-cli

## Commands

```bash
# Local
npm install && npx playwright install chromium
node dist/index.js                      # full audit (defaults to config/full.json)
node dist/index.js config/sdet.json
node dist/index.js config/compliance.json

# Docker (Phase 13 — not yet implemented)
docker compose up
```

There is no test runner command — Playwright is used as a library, not via `playwright test`.

## Slash Commands

- `/commit-changes` — full commit workflow: analyzes diff, updates `CHANGELOG.md`, stages everything, and commits

## Key Architecture Decisions

**Playwright is used as a browser automation library only.** We do not use the Playwright test runner, reporters, or any of its built-in test infrastructure.

**Config profiles live in `config/`.** Three profiles: `sdet.json`, `compliance.json`, `full.json`. No CLI flags — only an optional path argument. Defaults to `config/full.json` if omitted.

**Mode is inferred from the `urls` array:**
- One URL → crawl mode: follows links up to `crawl.depth` and `crawl.maxPages`
- Multiple URLs → list mode: audits exactly those pages, crawl settings ignored

**Issue IDs are globally unique per run.** Each module has its own prefix (`ACC`, `PRI`, `COO`, `SEC`, `SSL`, `LNK`) and a sequential counter across all pages.

**Four output formats per run** — markdown, HTML, JSON (default), PDF (opt-in) — written to `reports/YYYYMMDD-HHmmss/` and named `{domain-without-tld}-{timestamp}.{ext}` (e.g. `nvco-github-20260519-120212.html`). Enable/disable individually via `output.formats` in config.

**Suppress list** matches by `rule` + `url` pattern (not by issue ID, since IDs change between runs).

**Exit codes:** 0 = no issues, 1 = issues found, 2 = tool error.

**Scoring:** each module scores 0–100% based on passing checks / total checks. Letter grade A/B/C/D.

**Regression detection:** `.last-run.json` saved after every run. Set `compareLastRun: true` in config to diff against it and flag new violations.

**Report filtering:** `maxIssuesPerRule` (default 5) caps how many violations of the same rule appear in markdown/HTML reports — scoring and JSON always use the full count. Set to `0` for unlimited.

**Run retention:** `keepRunsForDays` (default 0 = keep all) auto-deletes report folders older than N days before each run.

## Project Structure

```
src/
├── index.ts              # Entry point, orchestrates run, handles regression diff
├── config.ts             # Loads and validates config file
├── crawler.ts            # URL discovery, depth/maxPages, mode inference
├── runner.ts             # Orchestrates auditors, suppress list, ID assignment, scoring
├── reporter.ts           # Generates all four output formats
├── regression.ts         # .last-run.json save/load/diff
├── types.ts              # Shared types (Issue, Config, AuditResult, etc.)
└── auditors/
    ├── accessibility.ts  # axe-core via Playwright; EN 301 549 mode support
    ├── privacy.ts        # Consent banner, privacy policy, CCPA link, GPC check
    ├── cookies.ts        # Secure, HttpOnly, SameSite, third-party, expiry checks
    ├── security-headers.ts  # CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, mixed content
    ├── ssl.ts            # Cert expiry, TLS version, HTTPS redirect (Node tls/http, not Playwright)
    └── broken-links.ts
config/                   # Config profiles (sdet.json, compliance.json, full.json)
reports/                  # Generated output (gitignored)
archive/                  # Completed TODO files
```

## Auditor Contract

Every auditor returns `AuditModuleResult { issues: Issue[], totalChecks: number, scoringIssueCount?: number }`. The runner accumulates totalChecks per module, computes scores, applies suppression, assigns IDs.

```typescript
type IssuePrefix = 'ACC' | 'PRI' | 'COO' | 'SEC' | 'SSL' | 'LNK';

interface Issue {
  prefix: IssuePrefix;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  location: string;
  docLink: string;
  remediation: string;
  rule: string;
  pageUrl: string;
  isInformational?: boolean;  // EN 301 549 mode: best-practice violations
  isNew?: boolean;            // regression detection: not in .last-run.json
}
```
