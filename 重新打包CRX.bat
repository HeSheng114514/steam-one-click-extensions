@echo off
chcp 65001 >nul
echo ============================================
echo   重新打包 Steam商店一键进插件页.crx
echo ============================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0打包成CRX.ps1"
echo.
pause
