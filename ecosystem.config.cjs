module.exports = {
  apps: [
    {
      // Next.js production server (requires `npm run build` first)
      name: "focus-app",
      script: "node_modules/.bin/next",
      args: "start -p 3001",
      cwd: __dirname,
      autorestart: true,
      watch: false,
      env_file: ".env.local",
    },
    {
      // Gmail scanner — runs once on startup, then every 30 minutes
      name: "focus-scan",
      script: "node_modules/.bin/tsx",
      args: "--tsconfig tsconfig.scripts.json --env-file .env.local scripts/scan-and-match.ts",
      cwd: __dirname,
      autorestart: false,
      cron_restart: "*/30 * * * *",
      watch: false,
    },
  ],
};
