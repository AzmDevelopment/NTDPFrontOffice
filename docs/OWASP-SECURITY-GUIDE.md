# OWASP ZAP Security Testing Guide

## Prerequisites

### 1. Install OWASP ZAP

Download and install OWASP ZAP from: https://www.zaproxy.org/download/

### 2. Start ZAP Proxy

Start ZAP in daemon mode for automated testing:

```bash
# Windows
"C:\Program Files\OWASP\Zed Attack Proxy\ZAP.exe" -daemon -host 0.0.0.0 -port 8080 -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true

# Linux/Mac
zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true
```

### 3. Configure Playwright to Use ZAP Proxy

Add proxy configuration to your Playwright config:

```typescript
// In playwright.config.ts
use: {
  // Configure proxy for security testing
  proxy: {
    server: 'http://localhost:8080'
  }
}
```

## Running Security Tests

### Basic Security Scan
```bash
npm run test:security
```

### Individual Security Tests
```bash
# Test login page security
npx playwright test tests/security.spec.ts --grep "basic security scan"

# Test post-login security
npx playwright test tests/security.spec.ts --grep "security scan after login"

# Test for common vulnerabilities
npx playwright test tests/security.spec.ts --grep "common web vulnerabilities"

# Test OWASP Top 10
npx playwright test tests/security.spec.ts --grep "OWASP Top 10"
```

### With ZAP Proxy Integration
```bash
# Start ZAP first, then run:
npx playwright test tests/security.spec.ts --grep "ZAP scan"
```

## Security Test Reports

Security test reports are automatically generated in:
- `test-results/security/` - Markdown reports
- `test-results/security/` - Screenshots
- `playwright-report/` - HTML reports

## Integration with CI/CD

Add to your GitHub Actions workflow:

```yaml
- name: Run Security Tests
  run: npx playwright test tests/security.spec.ts --reporter=html
  
- name: Upload Security Reports
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: security-reports
    path: |
      test-results/security/
      playwright-report/
    retention-days: 30
```

## Security Checklist

### ✅ Automated Checks
- [ ] HTTPS enforcement
- [ ] Security headers validation
- [ ] Sensitive data exposure
- [ ] Authentication security
- [ ] Clickjacking protection
- [ ] SQL injection testing
- [ ] XSS vulnerability testing
- [ ] OWASP Top 10 coverage

### 🔧 Manual Review Required
- [ ] Business logic vulnerabilities
- [ ] Authorization bypass
- [ ] Session management
- [ ] Input validation completeness
- [ ] Error handling security
- [ ] File upload security

## Vulnerability Risk Levels

| Risk Level | Action Required |
|------------|----------------|
| **High** | Fix immediately before production |
| **Medium** | Fix in next release cycle |
| **Low** | Consider fixing in future updates |
| **Informational** | Good to know, optional fix |

## ZAP API Configuration

Set these environment variables for ZAP integration:

```bash
ZAP_BASE_URL=http://localhost:8080
ZAP_API_KEY=your-zap-api-key
```

## Security Testing Best Practices

1. **Regular Scanning**: Run security tests on every deployment
2. **Baseline Comparison**: Track security improvements over time  
3. **False Positive Management**: Review and validate findings
4. **Remediation Tracking**: Document fixes and retesting
5. **Compliance Reporting**: Generate reports for security audits

## Troubleshooting

### ZAP Connection Issues
- Ensure ZAP is running on port 8080
- Check firewall settings
- Verify API key configuration

### Test Timeouts
- Increase test timeout for security scans
- Use `test.setTimeout(300000)` for comprehensive scans

### Missing Dependencies
```bash
npm install --save-dev zaproxy axios cheerio
```

## Additional Resources

- [OWASP ZAP Documentation](https://www.zaproxy.org/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Playwright Security Testing](https://playwright.dev/docs/test-advanced)
- [Security Headers Guide](https://owasp.org/www-project-secure-headers/)