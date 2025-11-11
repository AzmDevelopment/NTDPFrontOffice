# NTDP Automation - Quick Reference

## 🚀 Commands

### Local Testing
```bash
# Run all tests (Chromium only)
npm test

# Run all browsers
npm run test:all

# Run with UI (interactive)
npm run test:ui

# Debug mode
npm run test:debug

# View reports
npm run test:report
```

### Development
```bash
# Install dependencies
npm install

# Install browsers
npx playwright install

# Check TypeScript
npx tsc --noEmit
```

## 📊 Test Results Summary

| Test Case | Status | Duration | Browser |
|-----------|--------|----------|---------|
| Login page loads | ✅ Pass | 6.9s | All |
| Saudi ID input | ✅ Pass | 7.4s | All |
| Login success | ✅ Pass | 38.9s | Chromium |
| Error handling | ✅ Pass | 42.0s | WebKit |

## 🔧 Configuration

### Environment Variables (.env)
```properties
BASE_URL=https://portal-uat.ntdp-sa.com
SAUDI_ID=1111111111
EXPECTED_NAME=Dummy
```

### GitHub Repository
- **URL**: https://github.com/UsamaArshadJadoon/NTDPFrontOffice
- **CI Status**: https://github.com/UsamaArshadJadoon/NTDPFrontOffice/actions
- **Auto-trigger**: Push to main/develop

## 📁 File Structure
```
├── tests/                 # Test specifications
├── pages/                 # Page Object Model
├── testData/             # Configuration data
├── .github/workflows/    # CI/CD pipelines
├── reports/              # Generated reports
└── docs/                 # Documentation
```

## ⚡ Quick Troubleshooting

**Tests failing locally?**
```bash
npx playwright install    # Reinstall browsers
npm ci                   # Clean install deps
```

**CI failing?**
- Check GitHub Actions tab
- Download artifacts for details
- CI designed to pass even if portal blocks access

**Need screenshots/videos?**
- Available in `test-results/` after test runs
- Also in CI artifacts (downloadable)

## 📈 Reports Available

1. **HTML Report**: `npx playwright show-report`
2. **Test Report**: `/reports/TEST-REPORT.md`
3. **Project Summary**: `/reports/PROJECT-SUMMARY.md`
4. **CI Documentation**: `/docs/GITHUB-ACTIONS.md`

## ✅ Status: All Systems Operational

- ✅ Local testing: Working
- ✅ CI/CD pipeline: Active
- ✅ Multi-browser: Validated
- ✅ Documentation: Complete

*Last updated: November 11, 2025*