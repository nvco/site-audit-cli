# TODO 06 — PDF Command

## Goals
Implement `src/pdf.ts` so the `pdf` subcommand reads existing markdown files and converts them to PDFs via `md-to-pdf`.

## Tasks

- [x] Accept `reportBase` (e.g. `reports/example-com-2026-04-30`) and derive the two markdown paths: `{reportBase}-report.md` and `{reportBase}-remediation.md`
- [x] Check that both files exist — throw a clear error if either is missing
- [x] Convert each markdown file to PDF using `md-to-pdf`, writing output alongside the source: `{reportBase}-report.pdf` and `{reportBase}-remediation.pdf`
- [x] Log each output path on success

## Done When
- [x] Running `docker compose run site-audit-cli pdf reports/example-com-2026-04-30` produces two PDF files
- [x] Missing input file produces a clear error message
- [x] TypeScript compiles without errors
