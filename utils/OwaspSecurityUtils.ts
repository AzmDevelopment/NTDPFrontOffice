import { Page } from '@playwright/test';
import axios from 'axios';

export interface SecurityScanResult {
  url: string;
  vulnerabilities: SecurityVulnerability[];
  summary: {
    high: number;
    medium: number;
    low: number;
    informational: number;
    total: number;
  };
  timestamp: string;
}

export interface SecurityVulnerability {
  name: string;
  risk: 'High' | 'Medium' | 'Low' | 'Informational';
  confidence: 'High' | 'Medium' | 'Low';
  description: string;
  solution: string;
  reference: string;
  cweid?: string;
  wascid?: string;
}

export class OwaspSecurityUtils {
  private zapApiUrl: string;
  private zapApiKey: string;

  constructor(zapBaseUrl = 'http://localhost:8080', zapApiKey = '') {
    this.zapApiUrl = `${zapBaseUrl}/JSON`;
    this.zapApiKey = zapApiKey;
  }

  /**
   * Check if ZAP proxy is running
   */
  async isZapRunning(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.zapApiUrl}/core/view/version/`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Perform basic security checks without ZAP proxy
   */
  async performBasicSecurityChecks(page: Page): Promise<SecurityScanResult> {
    const url = page.url();
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check for HTTPS
      await this.checkHttps(page, vulnerabilities);
      
      // Check security headers
      await this.checkSecurityHeaders(page, vulnerabilities);
      
      // Check for exposed sensitive data
      await this.checkSensitiveDataExposure(page, vulnerabilities);
      
      // Check for weak authentication
      await this.checkWeakAuthentication(page, vulnerabilities);
      
      // Check for clickjacking protection
      await this.checkClickjackingProtection(page, vulnerabilities);

    } catch (error) {
      console.error('Error during security checks:', error);
    }

    return this.createScanResult(url, vulnerabilities);
  }

  /**
   * Perform comprehensive security scan using ZAP proxy
   */
  async performZapScan(targetUrl: string): Promise<SecurityScanResult> {
    if (!await this.isZapRunning()) {
      throw new Error('OWASP ZAP is not running. Please start ZAP proxy first.');
    }

    try {
      // Start spider scan
      await this.startSpiderScan(targetUrl);
      
      // Wait for spider to complete
      await this.waitForSpiderCompletion();
      
      // Start active scan
      await this.startActiveScan(targetUrl);
      
      // Wait for active scan to complete
      await this.waitForActiveScanCompletion();
      
      // Get alerts
      const vulnerabilities = await this.getZapAlerts();
      
      return this.createScanResult(targetUrl, vulnerabilities);
      
    } catch (error) {
      console.error('Error during ZAP scan:', error);
      throw error;
    }
  }

  private async checkHttps(page: Page, vulnerabilities: SecurityVulnerability[]): Promise<void> {
    const url = page.url();
    if (!url.startsWith('https://')) {
      vulnerabilities.push({
        name: 'Insecure Transport',
        risk: 'High',
        confidence: 'High',
        description: 'The application does not use HTTPS, making it vulnerable to man-in-the-middle attacks.',
        solution: 'Implement HTTPS with proper SSL/TLS configuration.',
        reference: 'https://owasp.org/www-project-top-ten/2017/A6_2017-Security_Misconfiguration',
        cweid: '319'
      });
    }
  }

  private async checkSecurityHeaders(page: Page, vulnerabilities: SecurityVulnerability[]): Promise<void> {
    try {
      const response = await page.goto(page.url());
      const headers = response?.headers() || {};

      const securityHeaders = {
        'x-frame-options': 'X-Frame-Options header missing - vulnerable to clickjacking',
        'x-content-type-options': 'X-Content-Type-Options header missing - MIME type sniffing possible',
        'x-xss-protection': 'X-XSS-Protection header missing - XSS attacks possible',
        'strict-transport-security': 'Strict-Transport-Security header missing - HTTPS downgrade possible',
        'content-security-policy': 'Content-Security-Policy header missing - XSS and injection attacks possible'
      };

      for (const [header, description] of Object.entries(securityHeaders)) {
        if (!headers[header] && !headers[header.toLowerCase()]) {
          vulnerabilities.push({
            name: `Missing Security Header: ${header}`,
            risk: 'Medium',
            confidence: 'High',
            description,
            solution: `Implement the ${header} header with appropriate values.`,
            reference: 'https://owasp.org/www-project-secure-headers/'
          });
        }
      }
    } catch (error) {
      console.error('Error checking security headers:', error);
    }
  }

  private async checkSensitiveDataExposure(page: Page, vulnerabilities: SecurityVulnerability[]): Promise<void> {
    try {
      const content = await page.content();
      const sensitivePatterns = [
        { pattern: /password\s*=\s*["'][^"']+["']/gi, name: 'Hardcoded Password' },
        { pattern: /api[_-]?key\s*=\s*["'][^"']+["']/gi, name: 'Exposed API Key' },
        { pattern: /secret\s*=\s*["'][^"']+["']/gi, name: 'Hardcoded Secret' },
        { pattern: /token\s*=\s*["'][^"']+["']/gi, name: 'Exposed Token' }
      ];

      for (const { pattern, name } of sensitivePatterns) {
        if (pattern.test(content)) {
          vulnerabilities.push({
            name: `Sensitive Data Exposure: ${name}`,
            risk: 'High',
            confidence: 'Medium',
            description: `Sensitive information (${name}) found in page source.`,
            solution: 'Remove sensitive data from client-side code and use secure server-side storage.',
            reference: 'https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure'
          });
        }
      }
    } catch (error) {
      console.error('Error checking sensitive data exposure:', error);
    }
  }

  private async checkWeakAuthentication(page: Page, vulnerabilities: SecurityVulnerability[]): Promise<void> {
    try {
      // Check for password fields without proper attributes
      const passwordFields = await page.locator('input[type="password"]').all();
      
      for (const field of passwordFields) {
        const autocomplete = await field.getAttribute('autocomplete');
        const form = await field.locator('..').locator('form').first();
        const formMethod = await form.getAttribute('method');
        
        if (autocomplete !== 'off' && autocomplete !== 'new-password') {
          vulnerabilities.push({
            name: 'Password Autocomplete Enabled',
            risk: 'Low',
            confidence: 'High',
            description: 'Password field allows autocomplete, which may expose credentials.',
            solution: 'Set autocomplete="off" or autocomplete="new-password" on password fields.',
            reference: 'https://owasp.org/www-project-top-ten/2017/A2_2017-Broken_Authentication'
          });
        }

        if (formMethod?.toLowerCase() !== 'post') {
          vulnerabilities.push({
            name: 'Insecure Authentication Method',
            risk: 'High',
            confidence: 'High',
            description: 'Login form uses GET method, exposing credentials in URL.',
            solution: 'Use POST method for authentication forms.',
            reference: 'https://owasp.org/www-project-top-ten/2017/A2_2017-Broken_Authentication'
          });
        }
      }
    } catch (error) {
      console.error('Error checking authentication security:', error);
    }
  }

  private async checkClickjackingProtection(page: Page, vulnerabilities: SecurityVulnerability[]): Promise<void> {
    try {
      const response = await page.goto(page.url());
      const headers = response?.headers() || {};
      
      const xFrameOptions = headers['x-frame-options'] || headers['X-Frame-Options'];
      const csp = headers['content-security-policy'] || headers['Content-Security-Policy'];
      
      const hasFrameOptions = xFrameOptions && (
        xFrameOptions.includes('DENY') || 
        xFrameOptions.includes('SAMEORIGIN')
      );
      
      const hasCSPFrameAncestors = csp && csp.includes('frame-ancestors');
      
      if (!hasFrameOptions && !hasCSPFrameAncestors) {
        vulnerabilities.push({
          name: 'Clickjacking Protection Missing',
          risk: 'Medium',
          confidence: 'High',
          description: 'Application lacks clickjacking protection via X-Frame-Options or CSP frame-ancestors.',
          solution: 'Implement X-Frame-Options: DENY or SAMEORIGIN, or use CSP frame-ancestors directive.',
          reference: 'https://owasp.org/www-community/attacks/Clickjacking'
        });
      }
    } catch (error) {
      console.error('Error checking clickjacking protection:', error);
    }
  }

  private async startSpiderScan(url: string): Promise<void> {
    await axios.get(`${this.zapApiUrl}/spider/action/scan/`, {
      params: {
        zapapiformat: 'JSON',
        apikey: this.zapApiKey,
        url: url
      }
    });
  }

  private async waitForSpiderCompletion(): Promise<void> {
    let progress = 0;
    while (progress < 100) {
      const response = await axios.get(`${this.zapApiUrl}/spider/view/status/`, {
        params: { zapapiformat: 'JSON', apikey: this.zapApiKey }
      });
      progress = parseInt(response.data.status);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async startActiveScan(url: string): Promise<void> {
    await axios.get(`${this.zapApiUrl}/ascan/action/scan/`, {
      params: {
        zapapiformat: 'JSON',
        apikey: this.zapApiKey,
        url: url
      }
    });
  }

  private async waitForActiveScanCompletion(): Promise<void> {
    let progress = 0;
    while (progress < 100) {
      const response = await axios.get(`${this.zapApiUrl}/ascan/view/status/`, {
        params: { zapapiformat: 'JSON', apikey: this.zapApiKey }
      });
      progress = parseInt(response.data.status);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  private async getZapAlerts(): Promise<SecurityVulnerability[]> {
    const response = await axios.get(`${this.zapApiUrl}/core/view/alerts/`, {
      params: { zapapiformat: 'JSON', apikey: this.zapApiKey }
    });

    return response.data.alerts.map((alert: any) => ({
      name: alert.name,
      risk: alert.risk,
      confidence: alert.confidence,
      description: alert.description,
      solution: alert.solution,
      reference: alert.reference,
      cweid: alert.cweid,
      wascid: alert.wascid
    }));
  }

  private createScanResult(url: string, vulnerabilities: SecurityVulnerability[]): SecurityScanResult {
    const summary = vulnerabilities.reduce(
      (acc, vuln) => {
        acc[vuln.risk.toLowerCase() as keyof typeof acc]++;
        acc.total++;
        return acc;
      },
      { high: 0, medium: 0, low: 0, informational: 0, total: 0 }
    );

    return {
      url,
      vulnerabilities,
      summary,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate security report
   */
  generateSecurityReport(scanResult: SecurityScanResult): string {
    const { url, vulnerabilities, summary, timestamp } = scanResult;
    
    let report = `# OWASP Security Scan Report\n\n`;
    report += `**Target URL:** ${url}\n`;
    report += `**Scan Date:** ${new Date(timestamp).toLocaleString()}\n\n`;
    
    report += `## Summary\n\n`;
    report += `| Risk Level | Count |\n`;
    report += `|------------|-------|\n`;
    report += `| High | ${summary.high} |\n`;
    report += `| Medium | ${summary.medium} |\n`;
    report += `| Low | ${summary.low} |\n`;
    report += `| Informational | ${summary.informational} |\n`;
    report += `| **Total** | **${summary.total}** |\n\n`;
    
    if (vulnerabilities.length > 0) {
      report += `## Vulnerabilities\n\n`;
      
      vulnerabilities.forEach((vuln, index) => {
        report += `### ${index + 1}. ${vuln.name}\n\n`;
        report += `**Risk:** ${vuln.risk} | **Confidence:** ${vuln.confidence}\n\n`;
        report += `**Description:** ${vuln.description}\n\n`;
        report += `**Solution:** ${vuln.solution}\n\n`;
        if (vuln.reference) {
          report += `**Reference:** [${vuln.reference}](${vuln.reference})\n\n`;
        }
        if (vuln.cweid) {
          report += `**CWE ID:** ${vuln.cweid}\n\n`;
        }
        report += `---\n\n`;
      });
    } else {
      report += `## ✅ No vulnerabilities found!\n\n`;
      report += `The basic security scan did not identify any obvious security issues.\n\n`;
    }
    
    return report;
  }
}