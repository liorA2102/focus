# Jacob's PC — Focus App Setup Checklist

## One-Time Setup (do this in order)

### 1. Prerequisites
- [ ] Install **Node.js LTS** — https://nodejs.org/en/download
  - During install: keep all defaults, make sure "Add to PATH" is checked
- [ ] Install **TeamViewer** — https://www.teamviewer.com/en/download/windows/
  - Set up unattended access so you can connect without Jacob needing to do anything

### 2. Get the App onto the PC
- [ ] Install **Git** — https://git-scm.com/download/win (keep all defaults)
- [ ] Open Command Prompt and run:
  ```
  cd C:\Users\Jacob
  git clone https://github.com/YOUR_REPO_URL Focus
  cd Focus
  npm install
  ```

### 3. Configure the App
- [ ] Create the `.env.local` file in the Focus folder with the required API keys
- [ ] Run the database migration:
  ```
  npm run db:migrate
  ```

### 4. Build and Start with PM2
- [ ] Install PM2 globally:
  ```
  npm install -g pm2
  ```
- [ ] Build the app:
  ```
  npm run build
  ```
- [ ] Start it with PM2:
  ```
  pm2 start npm --name "focus" -- start
  pm2 save
  pm2 startup
  ```
- [ ] Run the command that `pm2 startup` outputs (it will look like `pm2 startup windows ...`)

### 5. Set Chrome Homepage
- [ ] Open Chrome → Settings → On startup → Open a specific page
- [ ] Set URL to: `http://localhost:3000`
- [ ] Verify the app loads correctly

### 6. Smoke Test
- [ ] Restart the PC
- [ ] Open Chrome — the app should load automatically at `http://localhost:3000`
- [ ] Test creating a position, adding a candidate

---

## Updating the App (Weekly / When Needed)

1. Connect via TeamViewer
2. Open Command Prompt in the Focus folder:
   ```
   cd C:\Users\Jacob\Focus
   git pull
   npm install
   npm run build
   pm2 restart focus
   ```
3. Verify the app loads in Chrome

---

## Troubleshooting

**App not loading after reboot:**
```
pm2 list         # check if "focus" is running
pm2 restart focus
```

**Port already in use:**
```
pm2 stop focus
pm2 start focus
```

**Check logs:**
```
pm2 logs focus
```
