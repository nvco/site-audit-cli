# Phase 12 — Regression Detection

## Goals
Save .last-run.json after each audit. On subsequent runs, diff against it and flag new violations in console output and reports.

## Tasks

- [x] Update `types.ts` — add `compareLastRun?: boolean` to `Config`; add `isNew?: boolean` to `Issue`
- [x] Create `src/regression.ts` — fingerprint issues (rule+pageUrl+location), save/load `.last-run.json`, diff current vs previous
- [x] Update `src/index.ts` — load last run before audit; after audit mark new issues; print summary; save new last run
- [x] Update `src/reporter.ts` — `[NEW]` badge on new issues in HTML; `[NEW]` prefix in markdown
- [x] Add `.last-run.json` to `.gitignore`
