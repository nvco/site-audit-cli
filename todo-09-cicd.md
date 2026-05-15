# Phase 9 — CI/CD Readiness

## Goals
Exit codes, module-level scoring, updated JSON/HTML/MD reports, root config profiles, README.

## Tasks

- [ ] Update `types.ts` — add `AuditModuleResult`, `ModuleScore`; add `moduleScores` + `overallScore` to `AuditResult`
- [ ] Update all 5 auditors — return `AuditModuleResult { issues, totalChecks }` instead of `Issue[]`
  - ACC: totalChecks = passes.length + violations.length (rule level); scoringIssueCount = violations.length
  - PRI: totalChecks = 4 (fixed checks per page)
  - COO: totalChecks = cookies.length * 3 (secure + httpOnly + third-party per cookie)
  - SEC: totalChecks = HEADER_CHECKS.length (always 5)
  - LNK: totalChecks = toCheck.size
- [ ] Update `runner.ts` — accumulate totalChecks per module, compute module scores + overall score
- [ ] Update `reporter.ts` — add score/grade to scorecard (MD + HTML + JSON)
- [ ] Update `index.ts` — exit code 1 if `result.issues.length > 0`, exit 0 on clean pass
- [ ] Create `sdet.json` in root — security-headers, broken-links, cookies; JSON + markdown only
- [ ] Create `compliance.json` in root — accessibility, privacy, cookies; all formats
- [ ] Create `full.json` in root — all modules, all formats
- [ ] Write `README.md`
