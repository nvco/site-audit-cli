# TODO 02 — Crawler

## Goals
Implement `src/crawler.ts` so it returns the full list of URLs to audit. In list mode it returns the config URLs as-is. In crawl mode it follows links from the seed URL up to the configured depth and page cap.

## Tasks

### Mode inference
- [x] If `config.urls.length > 1` → list mode: return `config.urls` immediately, no crawling
- [x] If `config.urls.length === 1` → crawl mode: proceed with link discovery

### Crawl mode — link discovery
- [x] Start from `config.urls[0]` (the seed URL)
- [x] If `config.crawl.depth === 1`, return just the seed URL (no link following)
- [x] For depth > 1: navigate to each page with Playwright and extract all `<a href>` links
- [x] Resolve relative URLs against the current page URL
- [x] Filter to same-origin links only (no external domains)
- [x] Normalise URLs: strip fragments (`#...`), trailing slashes consistent, lowercase scheme+host
- [x] Track visited URLs to avoid duplicates and infinite loops
- [x] Respect `config.crawl.maxPages` — stop adding URLs once the cap is reached
- [x] Respect `config.crawl.depth` — do not follow links beyond the configured depth level

### Return value
- [x] Return a `string[]` of fully-resolved, deduplicated URLs to audit (order: BFS)

### Error handling
- [x] If Playwright fails to load a page during crawl, log a warning and skip that URL (don't crash)

## Done When
- [x] List mode returns exactly the URLs from config, no browser needed
- [x] Crawl mode with `depth: 1` returns only the seed URL
- [x] Crawl mode with `depth: 2` returns seed + all same-origin links found on it (up to `maxPages`)
- [x] No URL appears twice in the result
- [x] `maxPages` is never exceeded
