# 重新打包 CRX（改完扩展代码后跑这个）
# 用法：双击同目录下的「重新打包CRX.bat」，或在 PowerShell 里执行本脚本
$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$ext  = Join-Path $root 'Steam商店一键进插件页'
$pem  = Join-Path $root 'Steam商店一键进插件页.pem'
$crx  = Join-Path $root 'Steam商店一键进插件页.crx'

if (-not (Test-Path $ext)) { Write-Host "找不到扩展目录: $ext" -ForegroundColor Red; exit 1 }

$candidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)
$exe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $exe) { Write-Host "没找到 Chrome 或 Edge，无法打包" -ForegroundColor Red; exit 1 }

Write-Host "打包器: $exe"
Remove-Item $crx -Force -ErrorAction SilentlyContinue

# Chromium 自带的打包命令：会生成 <目录名>.crx 和 <目录名>.pem
$packArgs = @("--pack-extension=$ext")
if (Test-Path $pem) {
  $packArgs += "--pack-extension-key=$pem"
} else {
  Write-Host "没有找到私钥 $pem —— 本次会自动生成一对新密钥（扩展 ID 由它决定）" -ForegroundColor Yellow
}
$packArgs += '--no-message-box'

& $exe @packArgs | Out-Null
Start-Sleep -Seconds 2

if (Test-Path $crx) {
  $f = Get-Item $crx
  Write-Host ("完成 ✅  {0}  ({1} 字节, {2})" -f $f.Name, $f.Length, $f.LastWriteTime) -ForegroundColor Green
  Write-Host "扩展 ID 保持不变: bncagdlajnfonhmjpffbmoiaklnaibki"
} else {
  Write-Host "打包失败：没生成 $crx" -ForegroundColor Red
  exit 1
}
