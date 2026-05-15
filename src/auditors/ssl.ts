import * as tls from 'tls';
import * as http from 'http';
import { Config, Issue, AuditModuleResult } from '../types';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function runSslAudit(url: string, _config: Config): Promise<AuditModuleResult> {
  const parsed = new URL(url);

  if (parsed.protocol !== 'https:') {
    return {
      issues: [{
        prefix: 'SSL',
        impact: 'critical',
        description: 'Site is not served over HTTPS',
        location: url,
        docLink: 'https://web.dev/articles/why-https-matters',
        remediation: 'Configure your server to serve content over HTTPS and redirect all HTTP traffic.',
        rule: 'https-required',
        pageUrl: url,
      }],
      totalChecks: 3,
    };
  }

  const hostname = parsed.hostname;
  const issues: Issue[] = [];

  await Promise.all([
    checkCertExpiry(hostname, url, issues),
    checkTlsVersion(hostname, url, issues),
    checkHttpsRedirect(hostname, url, issues),
  ]);

  return { issues, totalChecks: 3 };
}

function checkCertExpiry(hostname: string, pageUrl: string, issues: Issue[]): Promise<void> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname },
      () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();

        if (!cert?.valid_to) { resolve(); return; }

        const expiresAt = new Date(cert.valid_to).getTime();
        const now = Date.now();

        if (expiresAt < now) {
          issues.push({
            prefix: 'SSL',
            impact: 'critical',
            description: `SSL certificate expired on ${cert.valid_to}`,
            location: hostname,
            docLink: 'https://developer.mozilla.org/en-US/docs/Web/Security/Certificate_Transparency',
            remediation: 'Renew your SSL certificate immediately — it has already expired.',
            rule: 'cert-expiry',
            pageUrl,
          });
        } else if (expiresAt - now < THIRTY_DAYS_MS) {
          const daysLeft = Math.floor((expiresAt - now) / (24 * 60 * 60 * 1000));
          issues.push({
            prefix: 'SSL',
            impact: 'serious',
            description: `SSL certificate expires in ${daysLeft} day(s) (${cert.valid_to})`,
            location: hostname,
            docLink: 'https://developer.mozilla.org/en-US/docs/Web/Security/Certificate_Transparency',
            remediation: 'Renew your SSL certificate before it expires to avoid service disruption.',
            rule: 'cert-expiry',
            pageUrl,
          });
        }

        resolve();
      }
    );
    socket.setTimeout(10000, () => { socket.destroy(); resolve(); });
    socket.on('error', () => resolve());
  });
}

function checkTlsVersion(hostname: string, pageUrl: string, issues: Issue[]): Promise<void> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname },
      () => {
        const protocol = socket.getProtocol();
        socket.destroy();

        if (protocol === 'TLSv1' || protocol === 'TLSv1.1') {
          issues.push({
            prefix: 'SSL',
            impact: 'serious',
            description: `Server negotiated deprecated TLS version: ${protocol}`,
            location: hostname,
            docLink: 'https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security',
            remediation: 'Disable TLS 1.0 and TLS 1.1 on your server and require TLS 1.2 or higher.',
            rule: 'tls-version',
            pageUrl,
          });
        }

        resolve();
      }
    );
    socket.setTimeout(10000, () => { socket.destroy(); resolve(); });
    socket.on('error', () => resolve());
  });
}

function checkHttpsRedirect(hostname: string, pageUrl: string, issues: Issue[]): Promise<void> {
  return new Promise((resolve) => {
    const req = http.get(
      { host: hostname, path: '/', timeout: 10000, headers: { Host: hostname } },
      (res) => {
        const redirectsToHttps =
          (res.statusCode === 301 || res.statusCode === 302) &&
          typeof res.headers.location === 'string' &&
          res.headers.location.startsWith('https://');

        if (!redirectsToHttps) {
          issues.push({
            prefix: 'SSL',
            impact: 'serious',
            description: `HTTP does not redirect to HTTPS (status: ${res.statusCode ?? 'unknown'})`,
            location: `http://${hostname}/`,
            docLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections',
            remediation: 'Configure your server to return a 301 redirect from HTTP to HTTPS for all requests.',
            rule: 'https-redirect',
            pageUrl,
          });
        }

        res.resume();
        resolve();
      }
    );
    req.on('error', () => resolve());
    req.on('timeout', () => { req.destroy(); resolve(); });
  });
}
