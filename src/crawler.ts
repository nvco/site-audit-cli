import { Config } from './types';
import { Page } from 'playwright';

export async function resolveUrls(config: Config, page: Page): Promise<string[]> {
  if (config.urls.length > 1) {
    return config.urls;
  }

  const seed = config.urls[0];

  if (config.crawl.depth <= 1) {
    return [seed];
  }

  return crawl(seed, config.crawl.depth, config.crawl.maxPages, page);
}

async function crawl(seed: string, maxDepth: number, maxPages: number, page: Page): Promise<string[]> {
  const seedOrigin = new URL(seed).origin;
  const visited = new Set<string>();
  const result: string[] = [];

  // BFS queue entries: [url, depth]
  const queue: Array<[string, number]> = [[normalise(seed), 1]];

  const unlimited = maxPages === 0;

  while (queue.length > 0 && (unlimited || result.length < maxPages)) {
    const [url, depth] = queue.shift()!;

    if (visited.has(url)) continue;
    visited.add(url);
    result.push(url);

    if (depth >= maxDepth) continue;

    const links = await extractLinks(url, seedOrigin, page);
    for (const link of links) {
      if (!visited.has(link) && (unlimited || result.length + queue.length < maxPages)) {
        queue.push([link, depth + 1]);
      }
    }
  }

  return result;
}

async function extractLinks(url: string, origin: string, page: Page): Promise<string[]> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const hrefs = await page.$$eval('a[href]', (els) =>
      els.map((el) => (el as { href: string }).href)
    );

    const links = new Set<string>();
    for (const href of hrefs) {
      try {
        const parsed = new URL(href, url);
        if (parsed.origin !== origin) continue;
        links.add(normalise(parsed.href));
      } catch {
        // skip unparseable hrefs
      }
    }
    return [...links];
  } catch (err) {
    console.warn(`[crawler] Failed to load ${url}: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

function normalise(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.searchParams.sort();
  let href = parsed.href;
  if (href.endsWith('/') && parsed.pathname !== '/') {
    href = href.slice(0, -1);
  }
  return href;
}
