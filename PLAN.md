# Web Audit Tool — Project Plan

## Purpose

A CLI web audit tool built in TypeScript using Playwright that audits websites across five areas: accessibility, privacy compliance, cookies, security headers, and broken links. Designed to demonstrate professional-grade use of TypeScript, Playwright, and axe-core. Supports two run modes: local (Node.js + npm) for development and quick iteration, and Docker for zero-setup usage and CI/CD pipelines.

---

## Stack

| Tool | Role |
|---|---|
| TypeScript | Language |
| Playwright | Headless browser automation (not the test runner — used as a library) |
| axe-core | Accessibility analysis, injected into pages via Playwright |
| md-to-pdf | Converts markdown reports to PDF (or Playwright-based HTML→PDF) |
| Docker + Docker Compose | Packaging and portability |

---

## CLI Commands

**Local (Node.js):**
```bash
npm install
npx playwright install chromium

node dist/index.js                      # uses config.json by default
node dist/index.js sdet.json            # point at a named config profile
node dist/index.js compliance.json
```

**Docker:**
```bash
docker compose up                       # uses config.json by default

docker compose run site-audit-cli sdet.json
docker compose run site-audit-cli compliance.json
```

There are no CLI flags or arguments. Everything is configured in the config file. The only optional argument is a path to a config file — if omitted, defaults to `config.json` in the current directory. All configured output formats are generated automatically at the end of every run.

---

## Config Profiles

Two tiers of config files serve different purposes:

**Root profiles** — ready-to-use entry points, pick one and edit it:

| File | Audience | Modules |
|---|---|---|
| `sdet.json` | CI/CD pipelines, regression catching | security-headers, broken-links, cookies, SSL/TLS |
| `compliance.json` | GDPR/WCAG audits, client-facing reports | accessibility, privacy, cookies |
| `full.json` | Comprehensive site health | all modules + scoring |

> These files need to be created in the root folder (tracked in Phase 9 CI/CD work).

**`config-examples/`** — single-module reference configs for development and targeted testing. Not meant as entry points — use them to understand how to configure individual modules in isolation.

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
  "output": {
    "formats": {
      "markdown": true,   // scannable text report
      "html": true,       // styled report, also used for PDF generation
      "pdf": true,        // generated from the HTML report automatically
      "json": true        // machine-readable, used for CI/CD exit code logic
    }
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

### Folder structure

Each run writes its output into a timestamped subfolder under `reports/`:

```
reports/
└── 20260514-143022/
    ├── report.md
    ├── report.html
    ├── report.pdf
    └── report.json
```

The timestamp format is `YYYYMMDD-HHmmss`. This keeps runs self-contained, makes side-by-side comparison easy, and avoids filename collisions when running multiple audits in a day.

### Files generated per run

All formats are enabled by default. Users disable formats they don't need via `output.formats` in config.

| File | Purpose |
|---|---|
| `report.md` | Scannable markdown report, sorted by severity |
| `report.html` | Styled HTML report — colour-coded by severity, readable in any browser |
| `report.pdf` | Generated automatically from the HTML report via Playwright |
| `report.json` | Machine-readable output for CI/CD pipelines and tooling |

> The separate `pdf` subcommand has been removed — PDF is now just another output format generated at the end of every run.

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

## Running the Tool

### Local

Requires Node.js 20+ and npm. After `npm install` and `npx playwright install chromium`, run via `node dist/index.js`. Good for development and quick local testing.

### Docker

The Docker image bundles Node.js, all npm dependencies, and Playwright's Chromium — no local setup required beyond Docker itself. Preferred for CI/CD pipelines and sharing with teams.

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
| 6 | PDF command *(superseded by Phase 8 output formats)* | `todo-06-pdf.md` |
| 7 | Polish — error handling, config.example.json, local end-to-end testing | `todo-07-polish.md` |
| 8 | Output formats — timestamped folders, HTML report, auto PDF, JSON, remove pdf subcommand | `todo-08-output-formats.md` |
| 9 | CI/CD readiness — exit codes, scoring, root profiles, README | `todo-09-cicd.md` |
| 10 | Security additions — SSL/TLS checker, Permissions-Policy, mixed content | `todo-10-security.md` |
| 11 | Accessibility & cookie additions — EN 301 549 support, SameSite, cookie expiry | `todo-11-accessibility-cookies.md` |
| 12 | Regression detection — diff against last run | `todo-12-regression.md` |
| 13 | Docker — final packaging, docker-compose verification, end-to-end Docker testing | `todo-13-docker.md` |

---

## Planned Features

### Phase 8 — Output Formats (P1)

Replaces the old `pdf` subcommand. All formats generated automatically at end of each run.

**Timestamped output folders** — each run writes to `reports/YYYYMMDD-HHmmss/`. No more filename-encoded dates.

**HTML report** — styled, colour-coded by severity (critical = red, serious = orange, moderate = yellow, minor = grey). Self-contained single file with inline CSS. Used as the source for PDF generation.

**Automatic PDF** — generated from the HTML report via Playwright (already running). Replaces `md-to-pdf`. No separate command needed.

**JSON output** — machine-readable format for CI/CD pipelines. Schema defined in Phase 9.

**Config:**
```json
"output": {
  "formats": {
    "markdown": true,
    "html": true,
    "pdf": true,
    "json": true
  }
}
```

**Remove `pdf` subcommand** — `src/pdf.ts` deleted, `index.ts` simplified.

---

### Phase 9 — CI/CD Readiness (P1)

These three features are tightly coupled and should be implemented together as one phase.

**Exit codes**

| Code | Meaning |
|---|---|
| `0` | Audit passed — no violations above configured threshold |
| `1` | Violations found — audit failed |
| `2` | Tool error (network failure, invalid config, etc.) |

**Module-level scoring**

Per-module pass/fail percentage and letter grade. Affects both JSON output and the markdown report summary. Score formula: `(passing rules / total rules) * 100`, rounded.

Grade thresholds (configurable via `thresholds` in config):

| Grade | Score |
|---|---|
| A | ≥ 90 |
| B | ≥ 75 |
| C | ≥ 60 |
| D | < 60 |

**JSON output format**

Configured in the config file:

```json
{
  "output": {
    "format": "json",
    "file": "audit.json"
  }
}
```

Output shape:

```json
{
  "url": "https://example.com",
  "date": "2026-05-12",
  "overall": { "score": 80, "grade": "B" },
  "modules": {
    "accessibility": { "score": 62, "grade": "D", "issues": [] },
    "security":      { "score": 78, "grade": "B", "issues": [] },
    "privacy":       { "score": 91, "grade": "A", "issues": [] },
    "cookies":       { "score": 70, "grade": "C", "issues": [] },
    "links":         { "score": 100, "grade": "A", "issues": [] }
  }
}
```

**GitHub Actions example** (to add to README):

```yaml
name: Site Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci && npx playwright install chromium
      - run: node dist/index.js ci.json
      - uses: actions/upload-artifact@v4
        with:
          name: audit-report
          path: audit.json
```

**Root config profiles** — `sdet.json`, `compliance.json`, `full.json` created in root folder (see Config Profiles section).

**README** — initial version written alongside Phase 8. Sections: one-line description, three entry points with commands, feature table, quick start, GitHub Actions example, config reference, link to `docs/index.html` as live demo. Will be refined in later phases as features are added.

---

### Phase 10 — Security Module Additions (P2)

**SSL/TLS checker** — new `src/auditors/ssl.ts`. Does not use Playwright; connects directly via Node's `tls` module.

| Check ID | What it tests | Implementation |
|---|---|---|
| `cert-expiry` | Certificate expires within 30 days → warning; expired → fail | `tls.connect()` → `getPeerCertificate().valid_to` |
| `tls-version` | TLS 1.0 / 1.1 accepted → fail; TLS 1.2+ only → pass | `tls.connect({ maxVersion: 'TLSv1.1' })` — if it connects, flag it |
| `https-redirect` | HTTP redirects to HTTPS with 301 | Plain HTTP fetch, follow redirect, check final protocol and status |

**Additional security headers** — extend existing `src/auditors/security-headers.ts`:

| Header | Why it matters | Pass condition |
|---|---|---|
| `Permissions-Policy` | Controls browser feature access (camera, mic, geolocation) | Header present with at least one directive |
| Mixed Content | HTTPS page loading HTTP resources | No `http://` resource URLs on an `https://` page — detected via `page.on('request')` in Playwright |

---

### Phase 11 — Accessibility & Cookie Additions (P2)

**EN 301 549 support** — new `"standard"` field in config, accepted values `"wcag"` (default) and `"en301549"`.

The underlying axe-core scan is identical either way. In `en301549` mode, findings are split using axe-core's existing EN 301 549 tag data:

| Group | Contains | Effect |
|---|---|---|
| Compliance failures | Violations mapping to an EN 301 549 criterion | Affect score and exit code |
| Informational | Best-practice-only violations (no criterion mapping) | Reported but don't block CI |

Each finding shows both IDs where available: `WCAG 1.4.3 / EN 301 549 §9.1.4.3`. No new dependencies — classification pass in the reporter over axe-core's existing tag data.

**Cookie additions** — extend existing `src/auditors/cookies.ts`. Both readable from Playwright's `context.cookies()`, no new dependencies.

| Check ID | What it tests | Why it matters |
|---|---|---|
| `samesite-flag` | Cookie missing `SameSite`, or `SameSite=None` without `Secure` | CSRF vector; flagged in GDPR/ePrivacy audits |
| `cookie-expiry` | Persistent cookies with lifetime > 1 year | GDPR data minimisation — long-lived tracking cookies need consent |

---

### Phase 12 — Regression Detection (P3)

Save a `.last-run.json` after each audit. On subsequent runs, diff current results against it and flag new violations separately from pre-existing ones.

Config:

```json
{
  "compareLastRun": true
}
```

Output example:
```
2 NEW violations since last run (2026-05-10)
  [NEW] SEC-003 — X-Frame-Options missing
  [NEW] ACC-007 — Missing alt text on /about
```

One file, not a full archive. Solves a real regression-testing use case without a full persistence model.
