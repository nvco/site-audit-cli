import * as fs from 'fs';
import { Issue } from './types';

const LAST_RUN_PATH = '.last-run.json';

interface LastRunData {
  date: string;
  fingerprints: string[];
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function fingerprint(issue: Issue): string {
  return `${issue.rule}|${normalizeUrl(issue.pageUrl)}|${normalizeUrl(issue.location)}`;
}

export function loadLastRun(): LastRunData | null {
  if (!fs.existsSync(LAST_RUN_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(LAST_RUN_PATH, 'utf-8')) as LastRunData;
  } catch {
    return null;
  }
}

export function saveLastRun(issues: Issue[], date: string): void {
  const data: LastRunData = {
    date: date.slice(0, 10),
    fingerprints: issues.map(fingerprint),
  };
  fs.writeFileSync(LAST_RUN_PATH, JSON.stringify(data, null, 2));
}

export function markNewIssues(issues: Issue[], lastRun: LastRunData): Issue[] {
  const known = new Set(lastRun.fingerprints);
  return issues.map((issue) => ({
    ...issue,
    isNew: !known.has(fingerprint(issue)) || undefined,
  }));
}
