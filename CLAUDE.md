# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

A CLI web audit tool built in TypeScript using Playwright. It audits websites across five areas (accessibility, privacy, cookies, security headers, broken links) and produces two markdown reports per run. Runs inside Docker — the only local requirement is Docker.

Read `PLAN.md` for the full design spec before making any significant changes.

## Repository

https://github.com/nvco/site-audit-cli

## Commands

```bash
# Run the audit
docker compose up

# Generate PDFs from an existing report (separate step, after reviewing markdown)
docker compose run site-audit-cli pdf reports/example-com-2026-04-30
```

There is no test runner command — Playwright is used as a library, not via `playwright test`.

## Slash Commands

- `/commit-changes` — full commit workflow: analyzes diff, updates `CHANGELOG.md`, stages everything, and commits

## Key Architecture Decisions

**Playwright is used as a browser automation library only.** We do not use the Playwright test runner, reporters, or any of its built-in test infrastructure. It fires up Chromium headlessly and we drive it programmatically.

**All configuration lives in `config.json`.** No CLI flags except the `pdf` subcommand. URLs to audit are the last field in the config.

**Mode is inferred from the `urls` array:**
- One URL → crawl mode: follows links up to `crawl.depth` and `crawl.maxPages`
- Multiple URLs → list mode: audits exactly those pages, crawl settings ignored

**Issue IDs are globally unique per run**, not per page. Each module has its own prefix (`ACC`, `PRI`, `COO`, `SEC`, `LNK`) and a single sequential counter across all pages.

**Two output files per run** — `[name]-report.md` (scannable, sorted by severity) and `[name]-remediation.md` (full fix detail keyed to the same IDs). PDFs are generated on demand via the `pdf` command, never automatically.

**Suppress list** matches by `rule` + `url` pattern (not by issue ID, since IDs change between runs).

## Project Structure

```
src/
├── index.ts              # Entry point, parses command, orchestrates run
├── config.ts             # Loads and validates config.json
├── crawler.ts            # URL discovery, depth/maxPages, mode inference
├── runner.ts             # Orchestrates auditors, applies suppress list, assigns IDs
├── reporter.ts           # Writes report.md and remediation.md
├── pdf.ts                # PDF subcommand — reads existing markdown, writes PDFs
├── types.ts              # Shared Issue type and enums used across all modules
└── auditors/
    ├── accessibility.ts  # axe-core via Playwright
    ├── privacy.ts        # Consent banner, privacy policy, CCPA link, GPC check
    ├── cookies.ts        # Cookie capture and analysis
    ├── security-headers.ts
    └── broken-links.ts
reports/                  # Generated output (gitignored)
archive/                  # Completed TODO files
```

## Auditor Contract

Every auditor receives a Playwright `Page` and the loaded config, and returns `Issue[]`. The runner collects all issues across all auditors and pages, applies suppression, assigns IDs, then passes to the reporter.

```typescript
interface Issue {
  prefix: 'ACC' | 'PRI' | 'COO' | 'SEC' | 'LNK';
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  location: string;
  docLink: string;
  remediation: string;
  rule: string;
  pageUrl: string;
}
```

## Implementation Phases

Work through phases in order. Each phase has its own TODO file; completed ones move to `archive/`.

| # | Phase | TODO file |
|---|---|---|
| 1 | Project setup — TypeScript, Playwright, Docker scaffold, config loader | `todo-01-project-setup.md` |
| 2 | Crawler | `todo-02-crawler.md` |
| 3 | All five auditors | `todo-03-auditors.md` |
| 4 | Runner — orchestration, suppress list, ID assignment | `todo-04-runner.md` |
| 5 | Reporter — markdown generation | `todo-05-reporter.md` |
| 6 | PDF command | `todo-06-pdf.md` |
| 7 | Polish — error handling, README, config.example.json, Docker testing | `todo-07-polish.md` |
