# OWASP ZAP Proxy Integration Guide

## Overview

The test framework now includes **automatic OWASP ZAP proxy integration**. When enabled, ALL Playwright tests run through the ZAP proxy, allowing ZAP to passively scan for security vulnerabilities during normal test execution.

## How It Works

```
┌─────────────────┐
│  Playwright     │
│  Tests          │
└────────┬────────┘
         │ All HTTP/HTTPS traffic
         ▼
┌─────────────────┐
│  ZAP Proxy      │  ◄── Passive scanning
│  localhost:8080 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Application    │
│  Under Test     │
└─────────────────┘
```

### Key Benefits:
- ✅ **No code changes needed** - Existing tests work as-is
- ✅ **Passive scanning** - No impact on application
- ✅ **Automatic reports** - HTML, JSON, Markdown formats
- ✅ **CI/CD ready** - Works in GitHub Actions with Docker

## Quick Start

### 1. Start ZAP

**Option A: Using PowerShell Script (Recommended)**
```powershell
.\start-zap.ps1
```

**Option B: Manual Start**
```bash
# Windows
zap.bat -daemon -port 8080 -config api.key=changeme

# Linux/Mac
zap.sh -daemon -port 8080 -config api.key=changeme

# Docker
docker run -d -p 8080:8080 \
  --name zap \
  owasp/zap2docker-stable \
  zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.key=changeme
```

### 2. Run Tests with ZAP

```bash
# Run all tests through ZAP proxy
npm run test:zap

# Run specific browser through ZAP proxy
npm run test:zap:chromium
```

### 3. Check Reports

Reports are automatically generated in `test-results/zap-reports/`:
- `zap-report-[timestamp].html` - Interactive HTML report
- `zap-report-[timestamp].json` - Machine-readable JSON
- `zap-report-[timestamp].md` - Human-readable Markdown

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Enable ZAP proxy integration
USE_ZAP=true

# ZAP configuration
ZAP_API_KEY=changeme
ZAP_PROXY=http://localhost:8080
```

### How It Works Internally

1. **Global Setup** (`global-setup.ts`):
   - Checks if ZAP is running
   - Starts ZAP daemon if needed
   - Initializes ZAP session
   - Enables passive scanners

2. **Test Execution** (`playwright.config.ts`):
   - All tests automatically route through ZAP proxy
   - ZAP passively analyzes HTTP/HTTPS traffic
   - No changes to test code required

3. **Global Teardown** (`global-teardown.ts`):
   - Retrieves all alerts from ZAP
   - Generates reports in multiple formats
   - Outputs summary to console

## GitHub Actions Integration

The workflow automatically:
1. Starts ZAP in Docker container
2. Runs all Playwright tests through ZAP proxy
3. Generates security reports
4. Uploads reports as artifacts
5. Creates summary in workflow output

### Manual Trigger

1. Go to **Actions** tab in GitHub
2. Select **OWASP ZAP Security Scan**
3. Click **Run workflow**
4. Download reports from Artifacts

### Scheduled Runs

The workflow runs automatically:
- **Daily** at 2 AM UTC
- Can be triggered manually anytime

## Understanding Reports

### HTML Report
- **Best for**: Manual review, sharing with team
- **Features**: Interactive, detailed vulnerability information
- **Location**: `test-results/zap-reports/*.html`

### JSON Report
- **Best for**: Automation, integration with other tools
- **Features**: Structured data, machine-readable
- **Location**: `test-results/zap-reports/*.json`

### Markdown Report
- **Best for**: Documentation, version control
- **Features**: Human-readable, Git-friendly
- **Location**: `test-results/zap-reports/*.md`

### Report Contents

Each report includes:
- **Summary**: Count of high/medium/low/info findings
- **Findings**: Detailed vulnerability descriptions
- **Risk Level**: High (🔴), Medium (🟠), Low (🟡), Info (ℹ️)
- **Solutions**: Remediation recommendations
- **CWE/WASC IDs**: Industry-standard vulnerability references

## Troubleshooting

### ZAP Not Starting

**Problem**: Tests run but no ZAP reports generated

**Solutions**:
1. Verify ZAP is running: `curl http://localhost:8080`
2. Check port 8080 is available: `netstat -ano | findstr :8080`
3. Review console output for ZAP startup messages
4. Check ZAP logs for errors

### Tests Failing with Proxy Errors

**Problem**: Tests fail with connection errors

**Solutions**:
1. Ensure ZAP is fully started (wait 30-60 seconds)
2. Verify `ZAP_PROXY` environment variable is correct
3. Check firewall isn't blocking port 8080
4. Try restarting ZAP

### No Vulnerabilities Detected

**Problem**: Reports show 0 findings

**Possible Reasons**:
- ✅ Application is secure (good!)
- ⚠️ Tests didn't generate enough traffic
- ⚠️ ZAP passive scanners need configuration
- ⚠️ Certificate issues preventing HTTPS inspection

**Solutions**:
1. Run more comprehensive tests
2. Verify ZAP is seeing traffic (check ZAP UI/logs)
3. Check that `ignoreHTTPSErrors: true` is set in playwright.config.ts

## Comparison: Old vs New Approach

### Old Approach (Separate ZAP Tests)
```bash
npm run test:zap:passive    # Separate test file
npm run test:zap:active     # Separate test file
```
- ❌ Required separate test files
- ❌ Duplicated test logic
- ❌ More maintenance overhead

### New Approach (Proxy Integration)
```bash
npm run test:zap            # All existing tests through proxy
```
- ✅ Uses existing test suite
- ✅ No code duplication
- ✅ Automatic passive scanning
- ✅ Easy to enable/disable

## Best Practices

### Development

1. **Run ZAP periodically** during development
   ```bash
   # Start ZAP once
   .\start-zap.ps1
   
   # Run tests with ZAP when needed
   npm run test:zap
   ```

2. **Review reports regularly**
   - Check `test-results/zap-reports/` after test runs
   - Address high-risk findings immediately
   - Track medium/low findings for future fixes

### CI/CD

1. **Use scheduled scans**
   - Daily scans in staging environment
   - Weekly scans in production-like environments

2. **Archive reports**
   - GitHub Actions automatically uploads artifacts
   - Retain for 30 days (configurable)

3. **Set up notifications**
   - Alert team on high-risk findings
   - Create GitHub issues automatically

### Security

1. **Keep ZAP API key secure**
   - Use environment variables
   - Don't commit to version control
   - Rotate keys periodically

2. **Run on non-production**
   - Use staging or test environments
   - Never run on production systems

3. **Review findings promptly**
   - Triage high-risk issues immediately
   - Plan fixes for medium-risk issues
   - Document low-risk acceptance decisions

## Advanced Configuration

### Custom Passive Scan Rules

Edit `global-setup.ts` to configure specific scanners:

```typescript
// Enable specific passive scanners
await zapClient.pscan.enableScanners({ ids: '10010,10011' });

// Disable noisy scanners
await zapClient.pscan.disableScanners({ ids: '10015' });
```

### Timeout Configuration

Adjust timeouts in `playwright.config.ts`:

```typescript
navigationTimeout: 60000,  // Increase if proxy causes delays
actionTimeout: 30000,      // Adjust for slower proxy responses
```

### Proxy Bypass

Exclude certain domains from ZAP proxy:

```typescript
use: {
  proxy: {
    server: ZAP_PROXY,
    bypass: 'localhost,127.0.0.1,*.internal.com',
  },
}
```

## Migrating from Old ZAP Tests

If you were using the old `tests/zap-security.spec.ts` approach:

1. **Keep existing tests** - They still work for active scanning
2. **Use new proxy integration** - For passive scanning during regular tests
3. **Benefits of both**:
   - Proxy: Passive scanning during all tests
   - Dedicated tests: Active scanning, spider scanning

## Support & Resources

- **Internal Docs**: See `docs/ZAP-INTEGRATION.md` for detailed info
- **ZAP Documentation**: https://www.zaproxy.org/docs/
- **ZAP API**: https://www.zaproxy.org/docs/api/
- **OWASP Top 10**: https://owasp.org/Top10/

## Summary

The new ZAP proxy integration provides:
- ✅ Automatic security scanning during normal tests
- ✅ No test code changes required
- ✅ Comprehensive reporting in multiple formats
- ✅ CI/CD ready with GitHub Actions
- ✅ Easy to enable/disable via environment variable

Simply set `USE_ZAP=true` and run your tests as normal - ZAP handles the rest!
