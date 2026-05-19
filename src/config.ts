import * as fs from 'fs';
import * as path from 'path';
import { Config, AccessibilityModuleConfig, BrokenLinksModuleConfig, BaseModuleConfig } from './types';

export function loadConfig(configPath = 'config/full.json'): Config {
  const fullPath = path.resolve(configPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Config file not found: ${fullPath}\nUsage: node dist/index.js <config-file>\nExample: node dist/index.js config/sdet.json`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  } catch {
    throw new Error(`Failed to parse ${fullPath} — check for JSON syntax errors.`);
  }

  return validate(raw, fullPath);
}

function normalizeBase(val: unknown, defaults: Partial<BaseModuleConfig> = {}): BaseModuleConfig {
  const enabled = typeof val === 'boolean' ? val : (val as Record<string, unknown>)?.['enabled'] !== false;
  return { enabled, ...defaults };
}

function normalizeAccessibility(val: unknown): AccessibilityModuleConfig {
  const base = typeof val === 'object' && val !== null ? (val as Record<string, unknown>) : {};
  const enabled = base['enabled'] !== false;
  const wcag = (base['wcag'] as Record<string, string> | undefined) ?? {};
  const version = (['2.0', '2.1', '2.2'].includes(wcag['version']) ? wcag['version'] : '2.2') as '2.0' | '2.1' | '2.2';
  const level = (['A', 'AA', 'AAA'].includes(wcag['level']) ? wcag['level'] : 'AA') as 'A' | 'AA' | 'AAA';
  const standard = base['standard'] === 'en301549' ? 'en301549' : 'wcag';
  return { enabled, wcag: { version, level }, standard };
}

function normalizeBrokenLinks(val: unknown): BrokenLinksModuleConfig {
  const base = typeof val === 'object' && val !== null ? (val as Record<string, unknown>) : {};
  const enabled = base['enabled'] !== false;
  const includeExternal = base['includeExternal'] === true;
  return { enabled, includeExternal };
}

function validate(raw: unknown, filePath: string): Config {
  const c = raw as Record<string, unknown>;

  const required = ['modules', 'crawl', 'suppress', 'urls'];
  for (const key of required) {
    if (!(key in c)) {
      throw new Error(`${filePath} is missing required field: "${key}"`);
    }
  }

  const urls = c['urls'] as string[];
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error(`${filePath} "urls" must be a non-empty array of URLs.`);
  }

  const rawModules = (c['modules'] as Record<string, unknown>) ?? {};
  c['modules'] = {
    accessibility: normalizeAccessibility(rawModules['accessibility']),
    privacy: normalizeBase(rawModules['privacy']),
    cookies: normalizeBase(rawModules['cookies']),
    securityHeaders: normalizeBase(rawModules['securityHeaders']),
    ssl: normalizeBase(rawModules['ssl']),
    brokenLinks: normalizeBrokenLinks(rawModules['brokenLinks']),
  };

  if (typeof c['maxIssuesPerRule'] !== 'number') {
    c['maxIssuesPerRule'] = 5;
  }

  if (typeof c['keepRunsForDays'] !== 'number') {
    c['keepRunsForDays'] = 0;
  }

  if (!c['output']) {
    c['output'] = { formats: { markdown: true, html: true, pdf: true, json: true } };
  } else {
    const formats = (c['output'] as Record<string, unknown>)['formats'] as Record<string, unknown> ?? {};
    (c['output'] as Record<string, unknown>)['formats'] = {
      markdown: formats['markdown'] !== false,
      html: formats['html'] !== false,
      pdf: formats['pdf'] === true,
      json: formats['json'] !== false,
    };
  }

  return c as unknown as Config;
}
