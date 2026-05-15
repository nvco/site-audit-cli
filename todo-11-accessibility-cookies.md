# Phase 11 — Accessibility & Cookie Additions

## Goals
EN 301 549 standard support for accessibility, two new cookie checks (SameSite, expiry).

## Tasks

- [ ] Update `types.ts` — add `isInformational?: boolean` to `Issue`; add `standard?: 'wcag' | 'en301549'` to `Config`
- [ ] Update `src/auditors/accessibility.ts` — in `en301549` mode: mark best-practice-only violations as informational; prefix description with `[EN 301 549]` for mapped violations; scoringIssueCount excludes informational
- [ ] Update `src/auditors/cookies.ts` — add `samesite-flag` check (missing SameSite or SameSite=None without Secure); add `cookie-expiry` check (persistent cookie lifetime > 1 year); update totalChecks to 5 per cookie
- [ ] Update `src/runner.ts` — exclude informational issues from scoringIssueCounts
- [ ] Update `src/index.ts` — exit code 1 only if non-informational issues exist
- [ ] Update `src/reporter.ts` — show informational ACC issues in a separate subsection; badge/label in HTML
