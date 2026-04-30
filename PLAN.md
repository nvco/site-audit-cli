# Web Audit Tool — Project Plan

## Purpose

A CLI web audit tool built in TypeScript using Playwright that audits websites across five areas: accessibility, privacy compliance, cookies, security headers, and broken links. Designed to demonstrate professional-grade use of TypeScript, Playwright, and axe-core. Runs in Docker so anyone with Docker installed can use it without any local setup.

---

## Stack

| Tool | Role |
|---|---|
| TypeScript | Language |
| Playwright | Headless browser automation (not the test runner — used as a library) |
| axe-core | Accessibility analysis, injected into pages via Playwright |
| md-to-pdf | Converts finished markdown reports to PDF |
| Docker + Docker Compose | Packaging and portability |

---

## CLI Commands

```bash
# Run the full audit (reads config.json for all settings)
docker compose up

# Generate PDFs from an existing report (separate step, after reviewing markdown)
docker compose run site-audit-cli pdf reports/example-com-2026-04-30
```

There are no CLI flags or arguments for the audit run. Everything is configured in `config.json`. PDF generation is a deliberate separate step — you inspect the markdown first, then generate PDFs when satisfied.

---

## Configuration — `config.json`

All settings live in a single `config.json` in the project root. Below is the full structure with comments explaining each field.

```jsonc
{
  "wcag": {
    "version": "2.2",         // "2.0" | "2.1" | "2.2"
    "level": "AA"             // "A" | "AA" | "AAA"
  },
  "modules": {
    "accessibility": true,
    "privacy": true,
    "cookies": true,
    "securityHeaders": true,
    "brokenLinks": true
  },
  "crawl": {
    "depth": 1,               // 1 = target page only, 2 = target + all links found on it, etc.
    "maxPages": 50            // hard cap to prevent runaway crawls
  },
  "brokenLinks": {
    "includeExternal": false  // true to also check outgoing external links
  },
  "suppress": [
    // Suppress known accepted issues by rule + URL pattern.
    // Suppressed issues are excluded from all reports.
    // { "rule": "color-contrast", "url": "*" }
    // { "rule": "missing-alt", "url": "https://example.com/blog/*" }
  ],
  "urls": [
    // Single URL → crawl mode: Playwright follows links up to depth/maxPages.
    // Multiple URLs → list mode: audits exactly those pages; depth/maxPages are ignored.
    // See README for full explanation of mode inference.
    "https://example.com"
  ]
}
```

**Mode inference rules:**
- `urls` has one entry → crawl mode. Playwright follows links from that page up to `depth` and `maxPages`.
- `urls` has more than one entry → list mode. Exactly those pages are audited. `crawl.depth` and `crawl.maxPages` are ignored.
- `depth: 1` with a single URL = audit that one page only (no link following).

---

## Output

### File naming

Both output files share a base name derived from the primary URL and the run date:
`{hostname-slug}-{YYYY-MM-DD}` → e.g., `example-com-2026-04-30`

### Files generated per run

| File | Purpose |
|---|---|
| `reports/example-com-2026-04-30-report.md` | Main audit report — scannable, sorted by severity |
| `reports/example-com-2026-04-30-remediation.md` | Developer remediation guide keyed to same IDs |

PDF versions (`-report.pdf`, `-remediation.pdf`) are generated on demand via the `pdf` command.

### Report structure

Both files open with:
1. **Header** — target URL(s), run date, tool version, pages audited, WCAG version/level tested
2. **Executive summary scorecard** — table of issue counts by severity (critical / serious / moderate / minor) per module

The main report then has one section per module. Within each section, issues are sorted: critical → serious → moderate → minor.

Each issue entry includes:
- Unique ID (e.g., `ACC-001`)
- Impact level
- One-line description
- Affected element or location
- Link to relevant documentation (WCAG criterion, MDN, OWASP, etc.)

The remediation file mirrors the same IDs with full how-to-fix detail — kept separate so the main report stays clean and scannable.

### Issue ID format

IDs are globally unique across all pages in a single run. Each module has its own prefix and its own sequential counter.

| Module | Prefix | Example |
|---|---|---|
| Accessibility | `ACC` | `ACC-001` |
| Privacy | `PRI` | `PRI-001` |
| Cookies | `COO` | `COO-001` |
| Security Headers | `SEC` | `SEC-001` |
| Broken Links | `LNK` | `LNK-001` |

---

## Audit Modules

### 1. Accessibility (`ACC`)
- Inject and run axe-core on each page via Playwright
- Filter results to violations matching the configured WCAG version and level
- Each violation → one `ACC-XXX` issue with: element, violation description, impact, link to the specific WCAG success criterion on w3.org

### 2. Privacy Compliance (`PRI`)
- Check for presence of a cookie consent banner
- Check for a privacy policy link
- Check for a "Do Not Sell or Share My Personal Information" link (CCPA)
- Check for `/.well-known/gpc.json` (Global Privacy Control declaration)
- Each missing/failing check → one `PRI-XXX` issue with a link to relevant CCPA/GDPR documentation

### 3. Cookie Audit (`COO`)
- Capture all cookies set by the page via Playwright
- For each cookie, record: name, domain (first-party vs third-party), whether it was set before any consent interaction, `Secure` flag, `HttpOnly` flag
- Each problematic cookie → one `COO-XXX` issue with a link to MDN cookie documentation

### 4. Security Headers (`SEC`)
- Read HTTP response headers for each page
- Check for presence and basic validity of: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- Each missing or misconfigured header → one `SEC-XXX` issue with a link to OWASP or MDN reference

### 5. Broken Links (`LNK`)
- Collect all internal links on each audited page
- If `includeExternal: true`, also collect external links
- HEAD request each link, report any returning 4xx or 5xx status
- Each broken link → one `LNK-XXX` issue

---

## Code Architecture

```
site-audit-cli/
├── src/
│   ├── index.ts              # Entry point — parses command, orchestrates the run
│   ├── config.ts             # Loads and validates config.json
│   ├── crawler.ts            # URL discovery logic — respects depth/maxPages
│   ├── runner.ts             # Orchestrates auditors across all pages, collects results
│   ├── reporter.ts           # Generates report.md and remediation.md from results
│   ├── pdf.ts                # PDF command — reads existing markdown, writes PDFs
│   └── auditors/
│       ├── accessibility.ts  # axe-core integration
│       ├── privacy.ts        # Privacy compliance checks
│       ├── cookies.ts        # Cookie capture and analysis
│       ├── security-headers.ts # HTTP header checks
│       └── broken-links.ts   # Link extraction and status checking
├── reports/                  # All generated output (gitignored)
├── archive/                  # Completed TODO files
├── config.json               # User configuration (gitignored, config.example.json provided)
├── Dockerfile
├── docker-compose.yml
├── PLAN.md                   # This file
├── CLAUDE.md                 # Guidance for Claude Code
└── package.json
```

### Module contract

Each auditor in `src/auditors/` receives a Playwright `Page` object and the loaded config, and returns a typed array of `Issue` objects. The runner collects all issues across all pages and all auditors, applies the suppress list, assigns globally unique IDs, then passes everything to the reporter.

```typescript
// Shared types (src/types.ts)
type IssuePrefix = 'ACC' | 'PRI' | 'COO' | 'SEC' | 'LNK';

interface Issue {
  prefix: IssuePrefix;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  location: string;       // element selector, URL, header name, etc.
  docLink: string;
  remediation: string;    // full how-to-fix detail, goes in remediation file
  rule: string;           // used for suppress list matching
  pageUrl: string;        // which page this was found on
}
```

---

## Docker Setup

The Docker image includes Node.js, all npm dependencies, and Playwright's Chromium browser. The user never installs anything locally.

`docker-compose.yml` pre-configures two volume mounts:
- `./config.json` → `/app/config.json` (read by the tool)
- `./reports` → `/app/reports` (output written here, persists after container exits)

---

## Implementation Phases

Phases are implemented sequentially. Each phase gets its own TODO file (e.g., `todo-01-project-setup.md`). Completed TODO files are moved to `archive/`.

| # | Phase | TODO file |
|---|---|---|
| 1 | Project setup — TypeScript, Playwright, Docker scaffold, config loader | `todo-01-project-setup.md` |
| 2 | Crawler — URL discovery, depth/maxPages, mode inference | `todo-02-crawler.md` |
| 3 | Auditors — all five modules | `todo-03-auditors.md` |
| 4 | Runner — orchestration, suppress list, ID assignment | `todo-04-runner.md` |
| 5 | Reporter — markdown report and remediation file generation | `todo-05-reporter.md` |
| 6 | PDF command | `todo-06-pdf.md` |
| 7 | Polish — error handling, README, config.example.json, final Docker testing | `todo-07-polish.md` |
