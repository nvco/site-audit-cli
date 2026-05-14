# TODO 07 — Polish

## Goals
Harden the tool for real-world use: improve error handling, verify `config.example.json` is complete and accurate, and confirm both local and Docker run modes work end-to-end.

## Tasks

### Error Handling
- [x] Invalid config path → clear message: `Config file not found: sdet.json`
- [x] Invalid JSON in config → clear message pointing to the file
- [x] Missing required config fields → list what's missing, not a raw stack trace
- [x] Network failure during audit (page unreachable) → log the URL, skip the page, continue — don't crash the whole run
- [x] `pdf` command — missing input file already handled; verify error message is clear
- [x] All error paths exit with code `2` (tool error), not `1` (violations found) — prep for Phase 8 exit code semantics

### config.example.json
- [x] Review against current full config schema — ensure all fields are present with sensible defaults
- [x] Inline comments not feasible — JSON.parse() doesn't support them; config reference will go in README (Phase 8)
- [x] `urls` updated to point at the GitHub Pages test site (`https://nvco.github.io/site-audit-cli/`)

### End-to-End Testing (Local)
- [x] Full run: `node dist/index.js` against the test site — report generates cleanly
- [x] Named config profile: `node dist/index.js config-examples/full.json` — runs correctly
- [x] PDF command — removed, PDF is now an output format (Phase 8)
- [x] Suppress list: `image-alt` suppressed on main page — count dropped from 120 to 118, correct issues removed
- [x] Review report output — issues are accurate, formatting is clean, ordering correct

## Done When
- [x] No raw stack traces reach the user under any expected error condition
- [x] `config.example.json` accurately reflects all available config options
- [x] Local run confirmed working end-to-end
- [x] Docker is deferred — final packaging step after all phases are complete
