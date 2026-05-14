# TODO 08 — Output Formats

## Goals
Replace the single flat markdown file with a timestamped run folder containing up to four output formats. All formats on by default; users disable what they don't need via config. Remove the `pdf` subcommand.

## Tasks

### Config
- [ ] Add `output.formats` to the `Config` type in `src/types.ts`
- [ ] Add `output.formats` to `config.json` schema validation in `src/config.ts` — default all four to `true` if field is absent

### Reporter refactor
- [ ] Change output folder from flat `reports/` to `reports/YYYYMMDD-HHmmss/`
- [ ] Generate `report.md` if `formats.markdown` is true
- [ ] Generate `report.json` if `formats.json` is true
- [ ] Generate `report.html` if `formats.html` is true
- [ ] Generate `report.pdf` from the HTML report via Playwright if `formats.pdf` is true

### HTML report
- [ ] Self-contained single file — all CSS inline, no external dependencies
- [ ] Matches markdown report structure: header, summary scorecard, one section per module
- [ ] Colour-coded by severity: critical = red, serious = orange, moderate = yellow, minor = grey/blue
- [ ] Clean, professional look suitable for client delivery and portfolio screenshots

### JSON report
- [ ] Shape: `{ url, date, toolVersion, pagesAudited, modules: { [prefix]: { issues: Issue[] } } }`
- [ ] Each issue includes all fields: id, prefix, impact, description, location, rule, pageUrl, docLink, remediation

### PDF generation
- [ ] Use Playwright's `page.pdf()` on the HTML report — already have a browser instance running
- [ ] Or open a new browser context pointed at the HTML file after the audit completes
- [ ] No dependency on `md-to-pdf`

### Cleanup
- [ ] Delete `src/pdf.ts`
- [ ] Remove `pdf` subcommand handling from `src/index.ts`
- [ ] Remove `md-to-pdf` from `package.json` dependencies
- [ ] Update console output to log all generated file paths

### Config examples
- [ ] Add `output.formats` to `config.example.json`
- [ ] Add `output.formats` to all configs in `config-examples/`

## Done When
- [ ] Running the audit produces a `reports/YYYYMMDD-HHmmss/` folder with the configured format files
- [ ] HTML report looks professional and is colour-coded by severity
- [ ] PDF is generated from HTML automatically
- [ ] JSON contains all issue data
- [ ] `node dist/index.js pdf ...` no longer exists — tool only accepts a config path
- [ ] TypeScript compiles without errors
