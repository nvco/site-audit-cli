# TODO 04 — Runner

## Goals
Implement `src/runner.ts` to orchestrate the full audit: launch Playwright, resolve URLs, run all enabled auditors across every page, apply the suppress list, assign globally unique IDs, and return a typed `AuditResult`. Wire it up in `src/index.ts` to replace the placeholder log.

## Tasks

### Runner (`src/runner.ts`)
- [x] Launch a Playwright Chromium browser and a single context/page for the run
- [x] Call `resolveUrls(config, page)` from the crawler to get the URL list
- [x] For each URL, navigate the page and run all enabled auditors (check `config.modules.*` before each)
- [x] Collect all `Issue[]` across all pages and auditors into a flat array
- [x] Apply the suppress list — drop any issue where `rule` matches and `pageUrl` matches the `url` pattern (support `*` as a wildcard)
- [x] Assign globally unique IDs per prefix: `ACC-001`, `ACC-002`, … each prefix has its own counter, zero-padded to 3 digits
- [x] Close the browser when done
- [x] Return a complete `AuditResult` with `config`, `runDate`, `pagesAudited`, and `issues`

### Entry point (`src/index.ts`)
- [x] Replace the placeholder log with a real call to `runAudit(config)`
- [x] Log progress as pages are audited (e.g. `Auditing [1/5] https://example.com/about`)
- [x] After the run, pass `AuditResult` to the reporter (stub call for now — reporter is phase 5)
- [x] Log a completion summary: pages audited, total issues by severity

## Done When
- [x] `runAudit()` returns a fully populated `AuditResult` with assigned IDs
- [x] Suppressed issues are absent from the result
- [x] Each prefix counter is independent and sequential across all pages
- [x] TypeScript compiles without errors
