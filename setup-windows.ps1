# Focus App — Windows Setup Script
# Requires: Node.js (https://nodejs.org) — nothing else.
#
# Run once as Administrator in PowerShell:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/liorA2102/focus/main/setup-windows.ps1" -OutFile "$env:TEMP\setup.ps1"; & "$env:TEMP\setup.ps1"

$AppDir  = "C:\Focus"
$ZipUrl  = "https://github.com/liorA2102/focus/archive/refs/heads/main.zip"
$ZipFile = "$env:TEMP\focus.zip"
$Port    = 3001

Write-Host ""
Write-Host "=== Focus App Setup ===" -ForegroundColor Cyan
Write-Host ""

# ── 1. Check Node.js ──────────────────────────────────────────────────────────
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed." -ForegroundColor Red
    Write-Host "Download and install it from https://nodejs.org (LTS version), then re-run this script."
    Start-Process "https://nodejs.org"
    exit 1
}
Write-Host "Node.js $(node --version) found." -ForegroundColor Green

# ── 2. Download & extract latest code ─────────────────────────────────────────
Write-Host "Downloading Focus app..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipFile -UseBasicParsing

# Preserve .env.local if it already exists
$envBackup = $null
if (Test-Path "$AppDir\.env.local") {
    $envBackup = Get-Content "$AppDir\.env.local" -Raw
}

if (Test-Path $AppDir) { Remove-Item $AppDir -Recurse -Force }
Expand-Archive -Path $ZipFile -DestinationPath "$env:TEMP\focus-extract" -Force
Move-Item "$env:TEMP\focus-extract\focus-main" $AppDir
Remove-Item "$env:TEMP\focus-extract" -Recurse -Force
Remove-Item $ZipFile

# Restore .env.local
if ($envBackup) {
    $envBackup | Set-Content "$AppDir\.env.local"
}

Set-Location $AppDir

# ── 3. Check .env.local ───────────────────────────────────────────────────────
if (-not (Test-Path "$AppDir\.env.local")) {
    Write-Host ""
    Write-Host "No .env.local found — please paste the environment file and re-run." -ForegroundColor Red
    exit 1
}
Write-Host ".env.local found." -ForegroundColor Green

# ── 4. Install dependencies & build ───────────────────────────────────────────
Write-Host "Installing dependencies (this may take a few minutes)..." -ForegroundColor Yellow
npm install

Write-Host "Building app..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Check errors above." -ForegroundColor Red
    exit 1
}

# ── 5. Install PM2 ────────────────────────────────────────────────────────────
Write-Host "Installing PM2..." -ForegroundColor Yellow
npm install -g pm2

# ── 6. Start both processes with PM2 and save ─────────────────────────────────
pm2 delete focus-app 2>$null
pm2 delete focus-scan 2>$null
pm2 start ecosystem.config.cjs
pm2 save

# ── 7. Register auto-start via Task Scheduler ─────────────────────────────────
Write-Host "Registering auto-start on login..." -ForegroundColor Yellow

@"
Set-Location C:\Focus
pm2 resurrect
"@ | Set-Content "$AppDir\start-focus.ps1"

$Action   = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$AppDir\start-focus.ps1`""
$Trigger  = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit 0
Register-ScheduledTask `
    -TaskName "FocusApp" `
    -Action $Action -Trigger $Trigger -Settings $Settings `
    -RunLevel Highest -Force | Out-Null

# ── 8. Register weekly silent auto-update ─────────────────────────────────────
Write-Host "Registering weekly auto-update (Sundays 7am)..." -ForegroundColor Yellow

$UpdateAction   = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$AppDir\update-windows.ps1`"" `
    -WorkingDirectory $AppDir
# Run every Sunday at 7:00 AM; if the PC was off, run at next login instead
$UpdateTrigger  = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "07:00"
$UpdateSettings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -StartWhenAvailable          # runs at next login if PC was off at 7am
Register-ScheduledTask `
    -TaskName "FocusAppUpdate" `
    -Action $UpdateAction -Trigger $UpdateTrigger -Settings $UpdateSettings `
    -RunLevel Highest -Force | Out-Null

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Focus is running at: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "It will start automatically every time Jacob logs in."
Write-Host "It will silently update itself every Sunday at 7am."
Write-Host ""
Write-Host "Bookmark http://localhost:$Port in Jacob's browser."
Write-Host ""
