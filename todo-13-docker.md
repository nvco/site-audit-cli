# Phase 13 — Docker

## Goals
Update and verify Docker packaging so the tool runs identically in Docker as it does locally. Mount the `config/` folder and `reports/` as volumes so users can edit profiles and receive output without rebuilding the image.

## Context
`Dockerfile` and `docker-compose.yml` exist but are outdated:
- `docker-compose.yml` mounts `./config.json` (old single-file path) — should mount `./config/` folder
- `Dockerfile` installs system Chromium via apt-get — should use Playwright's managed browser instead for consistency
- `CMD` runs with no config argument — should default to `config/full.json` (matches local behaviour)

## Tasks

### Dockerfile
- [ ] Switch from system Chromium (`apt-get install chromium`) to Playwright's managed browser
  - Remove manual Chromium install and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` env var
  - Run `npx playwright install chromium --with-deps` after `npm ci`
- [ ] Ensure `COPY` includes `src/`, `tsconfig.json`, `package*.json` and runs `npm run build`
- [ ] Set `CMD ["node", "dist/index.js"]` — defaults to `config/full.json` via `src/config.ts`

### docker-compose.yml
- [ ] Replace `./config.json:/app/config.json:ro` volume with `./config:/app/config:ro`
- [ ] Add `./reports:/app/reports` volume so output persists after container exits
- [ ] Add `command` examples for each profile (or document in README)

### .dockerignore
- [ ] Create `.dockerignore` — exclude `node_modules/`, `reports/`, `dist/`, `.git/`, `*.md`, `archive/`

### Verification
- [ ] `docker compose up` runs a full audit using `config/full.json` and writes reports to `./reports/`
- [ ] `docker compose run site-audit-cli config/sdet.json` runs the sdet profile
- [ ] `docker compose run site-audit-cli config/compliance.json` runs the compliance profile
- [ ] TypeScript compiles cleanly inside the container (`npm run build` step in Dockerfile)
- [ ] Reports folder on the host contains the expected output files after the run

### README
- [ ] Add Docker section with install and usage instructions
  - Prerequisites: Docker Desktop
  - `docker compose up` for default run
  - `docker compose run site-audit-cli config/sdet.json` for specific profiles
  - Note that `config/` is mounted read-only; `reports/` is mounted read-write
