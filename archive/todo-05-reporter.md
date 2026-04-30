# TODO 05 — Reporter

## Goals
Implement `src/reporter.ts` to write the two markdown output files per run, and wire it into `src/index.ts` to replace the placeholder summary log.

## File naming
Base name: `{hostname-slug}-{YYYY-MM-DD}` (e.g. `example-com-2026-04-30`)
- `reports/{base}-report.md`
- `reports/{base}-remediation.md`

## Tasks

### Reporter (`src/reporter.ts`)
- [x] Derive the base name from the first URL in `result.config.urls` — slugify the hostname (dots → dashes, lowercase) and append the run date (`YYYY-MM-DD` from `result.runDate`)
- [x] Ensure the `reports/` output directory exists before writing

**report.md**
- [x] Header block: target URL(s), run date, tool version, pages audited count, WCAG version/level
- [x] Executive summary scorecard: table of issue counts by severity (critical / serious / moderate / minor) per module prefix
- [x] One section per module (Accessibility, Privacy, Cookies, Security Headers, Broken Links) — only include modules that have issues
- [x] Within each section, sort issues: critical → serious → moderate → minor
- [x] Each issue entry: ID, impact badge, one-line description, location, doc link — no remediation detail here

**remediation.md**
- [x] Same header block as report.md
- [x] One entry per issue, keyed to the same ID — full remediation text
- [x] Same sort order (by module, then severity)

### Entry point (`src/index.ts`)
- [x] Call `generateReports(result, 'reports')` after `runAudit()`
- [x] Log the output file paths on completion
- [x] Remove the placeholder severity summary log (reporter output replaces it)

## Done When
- [x] Both files are written to `reports/` after a run
- [x] Issue IDs in both files match exactly
- [x] Sections appear only for modules with at least one issue
- [x] TypeScript compiles without errors
