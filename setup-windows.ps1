# Focus App — Windows Setup Script
# Run once as Administrator in PowerShell:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\setup-windows.ps1

$AppDir = "C:\Focus"
$Repo   = "https://github.com/liorA2102/focus.git"
$Port   = 3001

Write-Host ""
Write-Host "=== Focus App Setup ===" -ForegroundColor Cyan
Write-Host ""

# ── 1. Check Node.js ──────────────────────────────────────────────────────────
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed." -ForegroundColor Red
    Write-Host "Download and install it from https://nodejs.org (LTS version), then re-run this script."
    exit 1
}
$nodeVersion = node --version
Write-Host "Node.js $nodeVersion found." -ForegroundColor Green

# ── 2. Clone or update the repo ───────────────────────────────────────────────
if (Test-Path "$AppDir\.git") {
    Write-Host "Updating existing install..." -ForegroundColor Yellow
    Set-Location $AppDir
    git pull
} else {
    Write-Host "Cloning Focus app to $AppDir..." -ForegroundColor Yellow
    git clone $Repo $AppDir
    Set-Location $AppDir
}

# ── 3. Create .env.local if missing ──────────────────────────────────────────
if (-not (Test-Path "$AppDir\.env.local")) {
    Write-Host ""
    Write-Host "IMPORTANT: No .env.local file found." -ForegroundColor Yellow
    Write-Host "Creating a template — you must fill in the values before starting the app."
    @"
# Claude API key — get one at https://console.anthropic.com
ANTHROPIC_API_KEY=REPLACE_ME

# Turso — public positions DB
TURSO_URL=libsql://focus-public-lavidar.aws-eu-west-1.turso.io
TURSO_TOKEN=REPLACE_ME

# JobMaster credentials
JOBMASTER_EMAIL=jacob@focusgroup.co.il
JOBMASTER_PASSWORD=REPLACE_ME
"@ | Set-Content "$AppDir\.env.local"
    Write-Host "Edit C:\Focus\.env.local and fill in the API keys, then re-run this script." -ForegroundColor Red
    exit 0
}

# ── 4. Install dependencies & build ───────────────────────────────────────────
Write-Host "Installing dependencies..." -ForegroundColor Yellow
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

# ── 6. Start app with PM2 and save ────────────────────────────────────────────
Write-Host "Starting Focus app on port $Port..." -ForegroundColor Yellow
$env:PORT = $Port
pm2 start npm --name "focus" -- start
pm2 save

# ── 7. Register PM2 as a startup task ─────────────────────────────────────────
Write-Host "Registering auto-start on login..." -ForegroundColor Yellow

$StartScript = @"
Set-Location C:\Focus
`$env:PORT = $Port
pm2 resurrect
"@
$StartScript | Set-Content "$AppDir\start-focus.ps1"

# Create a Task Scheduler entry that runs at login (hidden)
$Action  = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$AppDir\start-focus.ps1`""
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit 0
Register-ScheduledTask `
    -TaskName "FocusApp" `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -RunLevel Highest `
    -Force | Out-Null

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host ""
Write-Host "The Focus app is running at: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "It will start automatically every time Jacob logs in."
Write-Host ""
Write-Host "Bookmark http://localhost:$Port in Jacob's browser."
Write-Host ""
