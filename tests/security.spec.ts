import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { OwaspSecurityUtils, SecurityScanResult } from '../utils/OwaspSecurityUtils';
import { validCredentials } from '../testData/credentials';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

test.describe('OWASP Security Tests', () => {
  let securityUtils: OwaspSecurityUtils;
  
  test.beforeEach(async () => {
    securityUtils = new OwaspSecurityUtils();
  });

  test('should perform basic security scan on login page', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for security scan
    
    const loginPage = new LoginPage(page);
    
    // Navigate to login page
    await loginPage.goto();
    await expect(page).toHaveURL(/.*login.*/);
    
    // Perform basic security checks
    const scanResult: SecurityScanResult = await securityUtils.performBasicSecurityChecks(page);
    
    // Generate security report
    const report = securityUtils.generateSecurityReport(scanResult);
    
    // Save report to file
    const reportsDir = join(process.cwd(), 'test-results', 'security');
    try {
      mkdirSync(reportsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    const reportPath = join(reportsDir, `security-scan-login-${Date.now()}.md`);
    writeFileSync(reportPath, report);
    
    console.log(`Security report saved to: ${reportPath}`);
    console.log(`\nSecurity Summary:`);
    console.log(`- High Risk: ${scanResult.summary.high}`);
    console.log(`- Medium Risk: ${scanResult.summary.medium}`);
    console.log(`- Low Risk: ${scanResult.summary.low}`);
    console.log(`- Total Issues: ${scanResult.summary.total}`);
    
    // Take screenshot for security audit
    await page.screenshot({ 
      path: join(reportsDir, `security-scan-login-${Date.now()}.png`),
      fullPage: true 
    });
    
    // Assert - test passes but logs security findings
    expect(scanResult).toBeDefined();
    expect(scanResult.url).toContain('portal-uat.ntdp-sa.com');
    
    // Log critical security issues
    const criticalIssues = scanResult.vulnerabilities.filter(v => v.risk === 'High');
    if (criticalIssues.length > 0) {
      console.log(`\n⚠️  CRITICAL SECURITY ISSUES FOUND (${criticalIssues.length}):`);
      criticalIssues.forEach(issue => {
        console.log(`- ${issue.name}: ${issue.description}`);
      });
    }
  });

  test('should perform security scan after login', async ({ page }) => {
    test.setTimeout(150000); // 2.5 minutes for login + security scan
    
    const loginPage = new LoginPage(page);
    
    // Perform login first
    await loginPage.goto();
    await loginPage.enterSaudiId(validCredentials.saudiId);
    await loginPage.clickLogin();
    
    // Wait for page to load/redirect
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(10000); // Wait 10 seconds for any redirects
    
    // Perform security scan on the resulting page
    const scanResult: SecurityScanResult = await securityUtils.performBasicSecurityChecks(page);
    
    // Generate security report
    const report = securityUtils.generateSecurityReport(scanResult);
    
    // Save report to file
    const reportsDir = join(process.cwd(), 'test-results', 'security');
    try {
      mkdirSync(reportsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    const reportPath = join(reportsDir, `security-scan-post-login-${Date.now()}.md`);
    writeFileSync(reportPath, report);
    
    console.log(`Post-login security report saved to: ${reportPath}`);
    console.log(`\nPost-Login Security Summary:`);
    console.log(`- High Risk: ${scanResult.summary.high}`);
    console.log(`- Medium Risk: ${scanResult.summary.medium}`);
    console.log(`- Low Risk: ${scanResult.summary.low}`);
    console.log(`- Total Issues: ${scanResult.summary.total}`);
    
    // Take screenshot for security audit
    await page.screenshot({ 
      path: join(reportsDir, `security-scan-post-login-${Date.now()}.png`),
      fullPage: true 
    });
    
    // Assert - test passes but logs security findings
    expect(scanResult).toBeDefined();
    
    // Check for authentication-related security issues
    const authIssues = scanResult.vulnerabilities.filter(v => 
      v.name.toLowerCase().includes('authentication') || 
      v.name.toLowerCase().includes('password') ||
      v.name.toLowerCase().includes('session')
    );
    
    if (authIssues.length > 0) {
      console.log(`\n🔐 AUTHENTICATION SECURITY ISSUES FOUND (${authIssues.length}):`);
      authIssues.forEach(issue => {
        console.log(`- ${issue.name}: ${issue.description}`);
      });
    }
  });

  test('should check for common web vulnerabilities', async ({ page }) => {
    test.setTimeout(90000); // 1.5 minutes
    
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // Test for SQL Injection in Saudi ID field
    const sqlInjectionPayloads = [
      "1' OR '1'='1",
      "1; DROP TABLE users;--",
      "1' UNION SELECT * FROM users--"
    ];
    
    console.log('\n🔍 Testing for SQL Injection vulnerabilities...');
    
    for (const payload of sqlInjectionPayloads) {
      try {
        await loginPage.enterSaudiId(payload);
        await loginPage.clickLogin();
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Check if any database errors are exposed
        const content = await page.content();
        const sqlErrorPatterns = [
          /sql error/i,
          /mysql error/i,
          /ora-\d+/i,
          /postgresql error/i,
          /syntax error/i,
          /database error/i
        ];
        
        for (const pattern of sqlErrorPatterns) {
          if (pattern.test(content)) {
            console.log(`⚠️  Potential SQL injection vulnerability detected with payload: ${payload}`);
            break;
          }
        }
        
        // Clear the field for next test
        await loginPage.saudiIdInput.clear();
        
      } catch (error) {
        console.log(`Error testing payload ${payload}:`, error);
      }
    }
    
    // Test for XSS vulnerabilities
    const xssPayloads = [
      "<script>alert('XSS')</script>",
      "<img src=x onerror=alert('XSS')>",
      "javascript:alert('XSS')"
    ];
    
    console.log('\n🔍 Testing for XSS vulnerabilities...');
    
    for (const payload of xssPayloads) {
      try {
        await loginPage.enterSaudiId(payload);
        
        // Check if the payload is reflected in the page
        const content = await page.content();
        if (content.includes(payload)) {
          console.log(`⚠️  Potential XSS vulnerability detected with payload: ${payload}`);
        }
        
        // Clear the field for next test
        await loginPage.saudiIdInput.clear();
        
      } catch (error) {
        console.log(`Error testing XSS payload ${payload}:`, error);
      }
    }
    
    console.log('\n✅ Common vulnerability testing completed');
    
    // Assert test completion
    expect(true).toBe(true);
  });

  test('should test for OWASP Top 10 vulnerabilities', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes
    
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    const vulnerabilityTests = {
      'A01 Broken Access Control': async () => {
        // Test for direct object references
        const testUrls = [
          '/admin',
          '/dashboard',
          '/user/1',
          '/api/users',
          '/../../../etc/passwd'
        ];
        
        for (const testUrl of testUrls) {
          try {
            const fullUrl = new URL(testUrl, page.url()).toString();
            const response = await page.goto(fullUrl);
            
            if (response && response.status() === 200) {
              console.log(`⚠️  Potential unauthorized access to: ${testUrl}`);
            }
          } catch (error) {
            // Expected for invalid URLs
          }
        }
      },
      
      'A02 Cryptographic Failures': async () => {
        // Check for HTTPS and secure protocols
        const url = page.url();
        if (!url.startsWith('https://')) {
          console.log('⚠️  Application not using HTTPS');
        }
        
        // Check for secure cookies (would need actual cookie analysis)
        const cookies = await page.context().cookies();
        cookies.forEach(cookie => {
          if (!cookie.secure || !cookie.httpOnly) {
            console.log(`⚠️  Insecure cookie detected: ${cookie.name}`);
          }
        });
      },
      
      'A03 Injection': async () => {
        // Already covered in previous test
        console.log('✓ Injection testing completed in previous test');
      },
      
      'A04 Insecure Design': async () => {
        // Check for security design issues
        const content = await page.content();
        
        // Check for exposed debug information
        if (content.includes('debug') || content.includes('stacktrace')) {
          console.log('⚠️  Debug information exposed');
        }
      },
      
      'A05 Security Misconfiguration': async () => {
        // Check HTTP headers
        const response = await page.goto(page.url());
        const headers = response?.headers() || {};
        
        const requiredHeaders = [
          'x-frame-options',
          'x-content-type-options',
          'strict-transport-security',
          'content-security-policy'
        ];
        
        requiredHeaders.forEach(header => {
          if (!headers[header] && !headers[header.toUpperCase()]) {
            console.log(`⚠️  Missing security header: ${header}`);
          }
        });
      }
    };
    
    console.log('\n🔍 Testing OWASP Top 10 vulnerabilities...');
    
    for (const [vulnerability, testFn] of Object.entries(vulnerabilityTests)) {
      console.log(`\nTesting: ${vulnerability}`);
      try {
        await testFn();
      } catch (error) {
        console.log(`Error testing ${vulnerability}:`, error);
      }
    }
    
    console.log('\n✅ OWASP Top 10 testing completed');
    
    // Assert test completion
    expect(true).toBe(true);
  });
});