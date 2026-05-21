export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Guard against re-registration on hot reloads in dev mode.
  const g = global as typeof globalThis & {
    __emailPollRegistered?: boolean;
    __emailPollRunning?: boolean;
  };
  if (g.__emailPollRegistered) return;
  g.__emailPollRegistered = true;

  const INTERVAL_MS = 15 * 60 * 1_000;

  const poll = async () => {
    if (g.__emailPollRunning) return;
    g.__emailPollRunning = true;
    try {
      const { pollEmailInbox } = await import("@/lib/emailInbox");
      const result = await pollEmailInbox();
      if (result.emailsScanned > 0 || result.cvImported > 0) {
        console.log(`[email-poll] ${result.emailsScanned} scanned · ${result.cvImported} imported`);
      }
    } catch (err) {
      const msg = String(err);
      if (!msg.includes("not configured")) {
        console.error("[email-poll]", msg);
      }
    } finally {
      g.__emailPollRunning = false;
    }
  };

  setTimeout(poll, 30_000);
  setInterval(poll, INTERVAL_MS);
}
