import { Config } from './types';
import { Page } from 'playwright';

export async function resolveUrls(config: Config, page: Page): Promise<string[]> {
  // Stub — implemented in phase 2
  return config.urls;
}
