# Focus App — Jacob's PC Setup Guide

Everything needed to get Focus running on Jacob's machine, start-to-finish.

---

## Prerequisites

One thing to install before anything else:

- **Node.js LTS** — https://nodejs.org/en/download  
  Download the Windows installer, run it, keep all defaults, make sure **"Add to PATH"** is checked.  
  After installing, open Command Prompt and verify: `node --version` should print a version number.

---

## One-Time Installation

Open **PowerShell as Administrator** (right-click → "Run as administrator") and paste this single command:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; Invoke-WebRequest -Uri "https://raw.githubusercontent.com/liorA2102/focus/main/setup-windows.ps1" -OutFile "$env:TEMP\setup.ps1"; & "$env:TEMP\setup.ps1"
```

This script will:
1. Download the latest Focus app from GitHub
2. Install all dependencies
3. Run the database migration
4. Build the app
5. Install PM2 and start both the app and the background email scanner
6. Register PM2 to auto-start on Windows login
7. Register a weekly silent auto-update (Sundays 7am — Jacob sees nothing)

The script takes about 2–3 minutes on a normal connection.

---

## Configure API Keys (.env.local)

The script creates `C:\Focus\.env.local` if it doesn't exist yet. You need to fill it in with the real values (do this via TeamViewer after the script finishes):

```
# Claude API — https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...

# JobMaster credentials
JOBMASTER_EMAIL=jacob@focusgroup.co.il
JOBMASTER_PASSWORD=...

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URI=http://localhost:3001/api/linkedin/callback

# Turso (public positions DB)
TURSO_URL=libsql://...
TURSO_TOKEN=...
```

After editing `.env.local`, restart the app:

```powershell
pm2 restart focus-app
```

> The actual values are in Lior's `.env.local` on the dev machine.

---

## Verify It's Working

1. Open Chrome → go to `http://localhost:3001`
2. The Focus dashboard should load
3. Try creating a test position — if it saves, the database is working
4. Restart the PC and confirm the app comes back up on its own

---

## LinkedIn Extension (Chrome)

This lets Jacob paste saved comment templates on LinkedIn and automatically captures leads into the Focus app.

### Install once

1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer mode** (toggle, top-right corner)
3. Click **Load unpacked**
4. Navigate to `C:\Focus\focus-linkedin-extension` and click **Select Folder**

The Focus Group logo will appear in the Chrome toolbar. That's it — no login needed.

### Using it

1. Make sure the Focus app is running (`http://localhost:3001`)
2. Go to LinkedIn and click **Comment** on any post
3. The Focus logo button appears at the bottom-right of the comment box
4. Click it → pick a template → text is inserted automatically
5. The post author is silently added to **Leads** in the Focus app

### After an app update

The extension folder updates automatically with the app (it lives inside `C:\Focus`). No reinstall needed — just reload it if Chrome shows an error:

`chrome://extensions` → Find "Focus LinkedIn Assistant" → click the **↺ reload** icon.

---

## Set Chrome to Open Focus on Startup (optional)

Chrome → Settings → **On startup** → "Open a specific page" → `http://localhost:3001`

---

## Email Inbox Setup

This lets the app pull CVs directly from Jacob's Outlook. Do this after the app is running.

### 1. Enable IMAP in Outlook

1. Go to **outlook.com** in Chrome, sign in as Jacob
2. Settings gear (top right) → **View all Outlook settings**
3. **Mail** → **Sync email**
4. Turn on **IMAP access** → Save

### 2. Create an App Password

Required when two-step verification is on (Microsoft blocks normal passwords for IMAP):

1. Go to **account.microsoft.com/security**
2. Click **Advanced security options**
3. Scroll to **App passwords** → **Create a new app password**
4. Name it `Focus` → copy the password that appears (shown once only)

### 3. Enter Settings in the App

Go to **http://localhost:3001/email** and fill in:

| Field | Value |
|---|---|
| IMAP Host | `outlook.office365.com` |
| Port | `993` |
| Email Address | Jacob's Outlook address |
| Password | The app password from step 2 |
| Use TLS | ✓ checked |

Click **Save Settings**, then **Poll Now**. A result like "3 emails scanned, 1 CV imported" means it's working.

---

## Background Email Scanner

The setup script also starts a **`focus-scan`** process that:
- Runs once immediately on startup
- Then runs every 30 minutes automatically
- Polls Gmail, parses new CVs with Claude, and matches candidates to open positions
- Jacob opens the app in the morning and results are already there — no manual action needed

To trigger an immediate scan:
```powershell
pm2 restart focus-scan
```

To check recent scan activity:
```powershell
pm2 logs focus-scan --lines 30
```

---

## Updating the App

**Updates happen automatically** — the setup script registers a Windows Task Scheduler job that runs every Sunday at 7am silently in the background. Jacob sees nothing. If the PC was off on Sunday, it runs quietly the next time he logs in.

### Force an immediate update (via TeamViewer)

Open PowerShell in `C:\Focus` and run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\update-windows.ps1
```

This downloads the latest version from GitHub, runs any new migrations, rebuilds, and restarts the app. Takes ~2 minutes. `.env.local` and the database are preserved automatically.

---

## Troubleshooting

**App not loading after reboot:**
```powershell
pm2 list              # check if "focus-app" and "focus-scan" appear and are "online"
pm2 restart focus-app
```

**Port in use / won't start:**
```powershell
pm2 stop focus-app
pm2 delete focus-app
cd C:\Focus
pm2 start ecosystem.config.cjs
pm2 save
```

**Check error logs:**
```powershell
pm2 logs focus-app --lines 50
pm2 logs focus-scan --lines 50   # scanner logs
```

**Database reset** (last resort — deletes all data):
```powershell
cd C:\Focus
del focus.db
npm run db:migrate
pm2 restart focus-app
```
