import { Config, AuditResult } from './types';

export async function runAudit(config: Config): Promise<AuditResult> {
  // Stub — implemented in phase 4
  return {
    config,
    runDate: new Date().toISOString(),
    pagesAudited: [],
    issues: [],
  };
}
