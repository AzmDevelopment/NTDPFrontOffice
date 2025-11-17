/**
 * Global Teardown for OWASP ZAP Integration
 * This file generates ZAP reports after all tests complete
 */

import { ZapClient } from 'zaproxy';
import * as fs from 'fs';
import * as path from 'path';

const ZAP_PORT = 8080;
const ZAP_API_KEY = process.env.ZAP_API_KEY || 'changeme';
const USE_ZAP = process.env.USE_ZAP === 'true' || process.env.CI === 'true';

interface ZapAlert {
  alert: string;
  riskdesc: string;
  confidence: string;
  desc: string;
  solution: string;
  reference: string;
  cweid: string;
  wascid: string;
  sourceid: string;
}

/**
 * Check if ZAP is running
 */
async function isZapRunning(): Promise<boolean> {
  try {
    const zapClient = new ZapClient({
      apiKey: ZAP_API_KEY,
      proxy: {
        host: 'localhost',
        port: ZAP_PORT,
      },
    });
    
    await zapClient.core.version();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate ZAP reports
 */
async function generateReports(): Promise<void> {
  console.log('\n📊 Generating ZAP security reports...');
  
  try {
    const zapClient = new ZapClient({
      apiKey: ZAP_API_KEY,
      proxy: {
        host: 'localhost',
        port: ZAP_PORT,
      },
    });
    
    const timestamp = Date.now();
    const reportsDir = path.join(process.cwd(), 'test-results', 'zap-reports');
    
    // Ensure directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Get all alerts
    const alertsResponse = await zapClient.core.alerts({});
    const alerts: ZapAlert[] = alertsResponse.alerts || [];
    
    // Calculate summary
    const summary = {
      high: 0,
      medium: 0,
      low: 0,
      informational: 0,
      total: alerts.length,
    };
    
    alerts.forEach(alert => {
      const risk = alert.riskdesc.toLowerCase();
      if (risk.includes('high')) summary.high++;
      else if (risk.includes('medium')) summary.medium++;
      else if (risk.includes('low')) summary.low++;
      else summary.informational++;
    });
    
    console.log('\n🔍 ZAP Security Scan Summary:');
    console.log(`   🔴 High Risk: ${summary.high}`);
    console.log(`   🟠 Medium Risk: ${summary.medium}`);
    console.log(`   🟡 Low Risk: ${summary.low}`);
    console.log(`   ℹ️  Informational: ${summary.informational}`);
    console.log(`   📝 Total Alerts: ${summary.total}\n`);
    
    // Generate HTML report
    console.log('📄 Generating HTML report...');
    const htmlResponse = await zapClient.core.htmlreport();
    const htmlPath = path.join(reportsDir, `zap-report-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlResponse.html);
    console.log(`   ✅ HTML report: ${htmlPath}`);
    
    // Generate JSON report
    console.log('📄 Generating JSON report...');
    const jsonReport = {
      generatedAt: new Date().toISOString(),
      summary,
      alerts,
    };
    const jsonPath = path.join(reportsDir, `zap-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    console.log(`   ✅ JSON report: ${jsonPath}`);
    
    // Generate Markdown report
    console.log('📄 Generating Markdown report...');
    const mdPath = path.join(reportsDir, `zap-report-${timestamp}.md`);
    let markdown = `# OWASP ZAP Security Report\n\n`;
    markdown += `**Generated**: ${new Date().toISOString()}\n`;
    markdown += `**Test Suite**: Playwright Automated Tests\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `| Risk Level | Count |\n`;
    markdown += `|------------|-------|\n`;
    markdown += `| 🔴 High | ${summary.high} |\n`;
    markdown += `| 🟠 Medium | ${summary.medium} |\n`;
    markdown += `| 🟡 Low | ${summary.low} |\n`;
    markdown += `| ℹ️ Informational | ${summary.informational} |\n`;
    markdown += `| **Total** | **${summary.total}** |\n\n`;
    
    if (alerts.length > 0) {
      markdown += `## Findings\n\n`;
      
      const sortedAlerts = alerts.sort((a, b) => {
        const getRiskValue = (risk: string) => {
          if (risk.includes('High')) return 0;
          if (risk.includes('Medium')) return 1;
          if (risk.includes('Low')) return 2;
          return 3;
        };
        return getRiskValue(a.riskdesc) - getRiskValue(b.riskdesc);
      });
      
      sortedAlerts.forEach((alert, index) => {
        const riskEmoji = alert.riskdesc.includes('High') ? '🔴' :
                         alert.riskdesc.includes('Medium') ? '🟠' :
                         alert.riskdesc.includes('Low') ? '🟡' : 'ℹ️';
        
        markdown += `### ${index + 1}. ${riskEmoji} ${alert.alert}\n\n`;
        markdown += `**Risk**: ${alert.riskdesc}\n`;
        markdown += `**Confidence**: ${alert.confidence}\n`;
        if (alert.cweid) markdown += `**CWE ID**: ${alert.cweid}\n`;
        markdown += `\n**Description**: ${alert.desc}\n\n`;
        markdown += `**Solution**: ${alert.solution}\n\n`;
        markdown += `---\n\n`;
      });
    } else {
      markdown += `## ✅ No Security Issues Found\n\n`;
      markdown += `The passive scan did not detect any security vulnerabilities during test execution.\n`;
    }
    
    fs.writeFileSync(mdPath, markdown);
    console.log(`   ✅ Markdown report: ${mdPath}`);
    
    console.log('\n✅ All ZAP reports generated successfully!\n');
    
    // Output summary for CI
    if (process.env.CI) {
      console.log('::group::ZAP Security Summary');
      console.log(`High Risk: ${summary.high}`);
      console.log(`Medium Risk: ${summary.medium}`);
      console.log(`Low Risk: ${summary.low}`);
      console.log(`Informational: ${summary.informational}`);
      console.log('::endgroup::');
      
      // Set output for GitHub Actions
      if (process.env.GITHUB_OUTPUT) {
        const output = `zap_high=${summary.high}\nzap_medium=${summary.medium}\nzap_low=${summary.low}\nzap_total=${summary.total}\n`;
        fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to generate ZAP reports:', (error as Error).message);
  }
}

/**
 * Global teardown function
 */
export default async function globalTeardown() {
  if (!USE_ZAP) {
    return;
  }
  
  console.log('\n🔒 === OWASP ZAP Global Teardown ===\n');
  
  const zapRunning = await isZapRunning();
  
  if (!zapRunning) {
    console.log('ℹ️ ZAP is not running - skipping report generation');
    return;
  }
  
  // Generate reports
  await generateReports();
  
  console.log('=================================\n');
}
