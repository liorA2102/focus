/**
 * Standalone email scanner — runs independently of the Next.js server.
 * Polls Gmail inbox, parses CVs with Claude, and matches candidates to open positions.
 * Scheduled via pm2 (see ecosystem.config.cjs).
 */
import { pollEmailInbox } from "../src/lib/emailInbox";

async function main() {
  const ts = () => new Date().toISOString();
  console.log(`[${ts()}] scan-and-match: starting`);

  try {
    const result = await pollEmailInbox();
    console.log(
      `[${ts()}] scan-and-match: done — scanned=${result.emailsScanned} imported=${result.cvImported}`
    );
    if (result.errors.length) {
      console.error(`[${ts()}] scan-and-match: errors —`, result.errors);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[${ts()}] scan-and-match: fatal —`, err);
    process.exit(1);
  }
}

main();
