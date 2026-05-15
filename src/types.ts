export type IssuePrefix = 'ACC' | 'PRI' | 'COO' | 'SEC' | 'SSL' | 'LNK';
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
  isInformational?: boolean;
  isNew?: boolean;
}

export interface SuppressRule {
  rule: string;
  url: string;
}

export interface OutputFormats {
  markdown: boolean;
  html: boolean;
  pdf: boolean;
  json: boolean;
}

export interface BaseModuleConfig {
  enabled: boolean;
}

export interface AccessibilityModuleConfig extends BaseModuleConfig {
  wcag: {
    version: '2.0' | '2.1' | '2.2';
    level: 'A' | 'AA' | 'AAA';
  };
  standard?: 'wcag' | 'en301549';
}

export interface BrokenLinksModuleConfig extends BaseModuleConfig {
  includeExternal: boolean;
}

export interface Config {
  modules: {
    accessibility: AccessibilityModuleConfig;
    privacy: BaseModuleConfig;
    cookies: BaseModuleConfig;
    securityHeaders: BaseModuleConfig;
    ssl: BaseModuleConfig;
    brokenLinks: BrokenLinksModuleConfig;
  };
  crawl: {
    depth: number;
    maxPages: number;
  };
  output: {
    formats: OutputFormats;
  };
  suppress: SuppressRule[];
  compareLastRun?: boolean;
  urls: string[];
}

export interface AuditModuleResult {
  issues: Issue[];
  totalChecks: number;
  scoringIssueCount?: number;
}

export interface ModuleScore {
  score: number;
  grade: string;
}

export interface AuditResult {
  config: Config;
  runDate: string;
  pagesAudited: string[];
  issues: Issue[];
  moduleScores: Partial<Record<IssuePrefix, ModuleScore>>;
  overallScore: ModuleScore;
}
