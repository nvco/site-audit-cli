# Phase 12 — Regression Detection

## Goals
Save .last-run.json after each audit. On subsequent runs, diff against it and flag new violations in console output and reports.

## Tasks

- [ ] Update `types.ts` — add `compareLastRun?: boolean` to `Config`; add `isNew?: boolean` to `Issue`
- [ ] Create `src/regression.ts` — fingerprint issues (rule+pageUrl+location), save/load `.last-run.json`, diff current vs previous
- [ ] Update `src/index.ts` — load last run before audit; after audit mark new issues; print summary; save new last run
- [ ] Update `src/reporter.ts` — `[NEW]` badge on new issues in HTML; `[NEW]` prefix in markdown
- [ ] Add `.last-run.json` to `.gitignore`
