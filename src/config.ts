import * as fs from 'fs';
import * as path from 'path';
import { Config } from './types';

export function loadConfig(configPath = 'config.json'): Config {
  const fullPath = path.resolve(configPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Config file not found: ${fullPath}\nCopy config.example.json to config.json and fill in your settings.`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  } catch {
    throw new Error(`Failed to parse ${fullPath} — check for JSON syntax errors.`);
  }

  return validate(raw, fullPath);
}

function validate(raw: unknown, filePath: string): Config {
  const c = raw as Record<string, unknown>;

  const required = ['wcag', 'modules', 'crawl', 'brokenLinks', 'suppress', 'urls'];
  for (const key of required) {
    if (!(key in c)) {
      throw new Error(`config.json is missing required field: "${key}"`);
    }
  }

  const urls = c['urls'] as string[];
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error('config.json "urls" must be a non-empty array of URLs.');
  }

  const wcag = c['wcag'] as Record<string, string>;
  if (!['2.0', '2.1', '2.2'].includes(wcag['version'])) {
    throw new Error(`config.json "wcag.version" must be "2.0", "2.1", or "2.2".`);
  }
  if (!['A', 'AA', 'AAA'].includes(wcag['level'])) {
    throw new Error(`config.json "wcag.level" must be "A", "AA", or "AAA".`);
  }

  return c as unknown as Config;
}
