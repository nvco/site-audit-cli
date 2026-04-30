export type IssuePrefix = 'ACC' | 'PRI' | 'COO' | 'SEC' | 'LNK';
export type ImpactLevel = 'critical' | 'serious' | 'moderate' | 'minor';

export interface Issue {
  id?: string;
  prefix: IssuePrefix;
  impact: ImpactLevel;
  description: string;
  location: string;
  docLink: string;
  remediation: string;
  rule: string;
  pageUrl: string;
}

export interface SuppressRule {
  rule: string;
  url: string;
}

export interface Config {
  wcag: {
    version: '2.0' | '2.1' | '2.2';
    level: 'A' | 'AA' | 'AAA';
  };
  modules: {
    accessibility: boolean;
    privacy: boolean;
    cookies: boolean;
    securityHeaders: boolean;
    brokenLinks: boolean;
  };
  crawl: {
    depth: number;
    maxPages: number;
  };
  brokenLinks: {
    includeExternal: boolean;
  };
  suppress: SuppressRule[];
  urls: string[];
}

export interface AuditResult {
  config: Config;
  runDate: string;
  pagesAudited: string[];
  issues: Issue[];
}
