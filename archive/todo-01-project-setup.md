# TODO 01 — Project Setup

## Goals
Scaffold the full project structure, get TypeScript compiling, Playwright installed, Docker running, and config loading working end to end. No audit logic yet — just the skeleton everything else will be built on.

## Tasks

### Package & TypeScript
- [x] Init `package.json` with project name `web-audit`, version, and `main` pointing to compiled output
- [x] Install dependencies: `typescript`, `playwright`, `axe-core`, `md-to-pdf`
- [x] Install dev dependencies: `@types/node`, `ts-node`
- [x] Create `tsconfig.json` — target ES2022, output to `dist/`, strict mode on
- [x] Add npm scripts: `build` (tsc), `start` (node dist/index.js), `dev` (ts-node src/index.ts)

### Project Scaffold
- [x] Create all source files as empty stubs with correct exports: `src/index.ts`, `src/config.ts`, `src/crawler.ts`, `src/runner.ts`, `src/reporter.ts`, `src/pdf.ts`, `src/types.ts`
- [x] Create empty auditor stubs: `src/auditors/accessibility.ts`, `privacy.ts`, `cookies.ts`, `security-headers.ts`, `broken-links.ts`
- [x] Create `reports/` directory with a `.gitkeep`
- [x] Create `archive/` directory with a `.gitkeep`

### Types
- [x] Define `Issue` interface in `src/types.ts`
- [x] Define `Config` interface in `src/types.ts` matching the full `config.json` structure
- [x] Define `AuditResult` type (array of issues + metadata: pages audited, run date, etc.)

### Config Loader
- [x] Implement `src/config.ts` — reads and parses `config.json`
- [x] Validate required fields and throw clear errors if missing or invalid
- [x] Export a `loadConfig()` function that returns a typed `Config` object
- [x] Create `config.example.json` in project root with all fields populated and inline comments explaining each one

### Entry Point
- [x] Implement `src/index.ts` — detect if first arg is `pdf` and route accordingly, otherwise run audit
- [x] Wire up `loadConfig()` and log a startup message confirming config loaded successfully

### Docker
- [x] Write `Dockerfile` — Node LTS base image, install Chromium, copy source, build TypeScript
- [x] Write `docker-compose.yml` — mounts `./config.json` and `./reports` as volumes
- [x] Add `.dockerignore` — exclude `node_modules`, `dist`, `reports`, `.git`

### Gitignore
- [x] Create `.gitignore` — ignore `node_modules/`, `dist/`, `reports/`, `config.json`

## Done When
- [x] `docker compose up` starts the container, loads config, logs the startup message, and exits cleanly
- [x] TypeScript compiles without errors
- [x] All source files exist with correct stub exports
