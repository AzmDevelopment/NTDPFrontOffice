@echo off
echo 🔒 NTDP Security Reports
echo ========================
echo.

echo Available Commands:
echo [1] View latest security report
echo [2] List all security reports  
echo [3] Open security folder
echo [4] Run basic security test
echo [Q] Quit
echo.

set /p choice="Enter your choice: "

if /i "%choice%"=="1" (
    echo.
    echo 📄 Latest Security Report:
    echo ========================
    powershell -Command "Get-ChildItem -Path 'test-results\security\*.md' | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content"
    pause
)

if /i "%choice%"=="2" (
    echo.
    echo 📊 All Security Reports:
    echo =======================
    powershell -Command "Get-ChildItem -Path 'test-results\security\*.md' | Sort-Object LastWriteTime -Descending | ForEach-Object { Write-Host $_.Name -ForegroundColor White; Write-Host '  Created:' $_.LastWriteTime -ForegroundColor Gray }"
    pause
)

if /i "%choice%"=="3" (
    echo Opening security folder...
    start "" "test-results\security"
)

if /i "%choice%"=="4" (
    echo.
    echo 🔍 Running basic security test...
    npm run test:security:basic
    pause
)

if /i "%choice%"=="q" (
    echo Goodbye! 👋
    exit /b 0
)

echo Invalid choice. Please try again.
pause
goto :eof