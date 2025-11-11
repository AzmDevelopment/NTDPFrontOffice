# Simple Security Reports Viewer
Write-Host "OWASP Security Reports Manager" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""

$reportsPath = "test-results\security"

if (-Not (Test-Path $reportsPath)) {
    Write-Host "No security reports found. Run 'npm run test:security:basic' first." -ForegroundColor Red
    exit 1
}

$reports = Get-ChildItem -Path "$reportsPath\*.md" | Sort-Object Name -Descending

if ($reports.Count -eq 0) {
    Write-Host "No security reports found in $reportsPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($reports.Count) security reports:" -ForegroundColor Cyan
Write-Host ""

for ($i = 0; $i -lt $reports.Count; $i++) {
    Write-Host "[$($i + 1)] $($reports[$i].Name)" -ForegroundColor White
}

Write-Host ""
Write-Host "Showing latest report:" -ForegroundColor Yellow
Write-Host "======================" -ForegroundColor Yellow
Write-Host ""

Get-Content $reports[0].FullName
Write-Host ""

Write-Host "Available Commands:" -ForegroundColor Yellow
Write-Host "• To view all reports: Get-ChildItem -Path test-results\security\*.md" -ForegroundColor White
Write-Host "• To open security folder: start test-results\security" -ForegroundColor White
Write-Host "• To run new security scan: npm run test:security:basic" -ForegroundColor White
Write-Host ""