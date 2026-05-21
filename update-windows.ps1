# Focus App — Update Script
# Run this whenever Lior pushes new changes to GitHub.
#
# Open PowerShell in C:\Focus and run:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\update-windows.ps1

$AppDir = "C:\Focus"
$ZipUrl = "https://github.com/liorA2102/focus/archive/refs/heads/main.zip"
$ZipFile = "$env:TEMP\focus-update.zip"

Write-Host ""
Write-Host "=== Focus App Update ===" -ForegroundColor Cyan
Write-Host ""

Set-Location $AppDir

# ── 1. Backup .env.local and database ─────────────────────────────────────────
$envContent = Get-Content "$AppDir\.env.local" -Raw -ErrorAction SilentlyContinue
if (-not $envContent) {
    Write-Host "ERROR: .env.local not found in $AppDir" -ForegroundColor Red
    exit 1
}
$dbExists = Test-Path "$AppDir\focus.db"

# ── 2. Download latest code ────────────────────────────────────────────────────
Write-Host "Downloading latest version..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipFile -UseBasicParsing

Expand-Archive -Path $ZipFile -DestinationPath "$env:TEMP\focus-update-extract" -Force

# Overwrite source files, keep data files
$src = "$env:TEMP\focus-update-extract\focus-main"
Get-ChildItem $src | Where-Object { $_.Name -notin @("focus.db", ".env.local", "uploads") } | ForEach-Object {
    $dest = Join-Path $AppDir $_.Name
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    Copy-Item $_.FullName $dest -Recurse
}
Remove-Item "$env:TEMP\focus-update-extract" -Recurse -Force
Remove-Item $ZipFile

# ── 3. Restore .env.local (in case it got overwritten) ────────────────────────
$envContent | Set-Content "$AppDir\.env.local"

# ── 4. Install any new dependencies ───────────────────────────────────────────
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# ── 5. Run any new migrations ─────────────────────────────────────────────────
Write-Host "Running database migrations..." -ForegroundColor Yellow
npm run db:migrate

# ── 6. Build ──────────────────────────────────────────────────────────────────
Write-Host "Building..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Check errors above." -ForegroundColor Red
    exit 1
}

# ── 7. Restart pm2 ────────────────────────────────────────────────────────────
Write-Host "Restarting app..." -ForegroundColor Yellow
pm2 restart ecosystem.config.cjs --update-env
pm2 save

Write-Host ""
Write-Host "=== Update complete! ===" -ForegroundColor Green
Write-Host "Focus is running at: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
