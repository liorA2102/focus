import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { candidates, candidateMatches, positions, appSettings } from "@/db/schema";
import { eq, inArray, or } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { extractCVText, parseCV, matchCandidateToPosition } from "./ai";

const aiClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ── Settings helpers ── */
async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

/* ── Public: connection status ── */
export async function getGmailConnectionStatus() {
  const settings = await getEmailSettings();
  const connected = !!(settings.host && settings.user && settings.pass);
  return { connected, email: connected ? settings.user : null };
}

/* ── Public: get/save IMAP settings ── */
export async function getEmailSettings() {
  const [host, port, user, pass, tls] = await Promise.all([
    getSetting("email_imap_host"),
    getSetting("email_imap_port"),
    getSetting("email_imap_user"),
    getSetting("email_imap_pass"),
    getSetting("email_imap_tls"),
  ]);
  return {
    host:  host  ?? "",
    port:  port  ? parseInt(port) : 993,
    user:  user  ?? "",
    pass:  pass  ?? "",
    tls:   tls !== "false",
  };
}

export async function saveEmailSettings(settings: {
  host: string; port: number; user: string; pass: string; tls: boolean;
}) {
  await Promise.all([
    setSetting("email_imap_host", settings.host),
    setSetting("email_imap_port", String(settings.port)),
    setSetting("email_imap_user", settings.user),
    setSetting("email_imap_pass", settings.pass),
    setSetting("email_imap_tls",  String(settings.tls)),
  ]);
}

/* ── Extract job source URL from email body ── */
function extractJobSourceUrl(bodyText: string, bodyHtml?: string): string | null {
  const source = bodyHtml ?? bodyText;
  const urlRegex = /https?:\/\/[^\s<>"']+/gi;
  const urls = source.match(urlRegex) ?? [];
  // Prefer JobMaster URLs
  const jobmaster = urls.find((u) => /jobmaster/i.test(u));
  if (jobmaster) return jobmaster.replace(/[)\]>.,;]+$/, "");
  return null;
}

/* ── Identify which open position the email is about ── */
async function identifyPosition(
  subject: string,
  bodyText: string,
  openPositions: { id: number; title: string; client: string }[],
): Promise<number | null> {
  if (!openPositions.length) return null;

  const msg = await aiClient.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 128,
    messages: [{
      role: "user",
      content: `You are a recruitment assistant. Identify which open position this CV email is applying for.

Email subject: ${subject}
Email body (first 600 chars): ${bodyText.slice(0, 600)}

Open positions:
${openPositions.map((p) => `ID ${p.id}: "${p.title}" at ${p.client}`).join("\n")}

Return ONLY valid JSON: {"positionId": <number or null>}
Return null if you cannot confidently identify the position.`,
    }],
  });

  try {
    const raw = (msg.content[0] as { text: string }).text.trim()
      .replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(raw);
    const id = parsed.positionId;
    if (typeof id === "number" && openPositions.some((p) => p.id === id)) return id;
    return null;
  } catch {
    return null;
  }
}

/* ── Main poll function ── */
export type PollResult = {
  emailsScanned: number;
  cvImported: number;
  errors: string[];
};

export async function pollEmailInbox(): Promise<PollResult> {
  const settings = await getEmailSettings();
  if (!settings.host || !settings.user || !settings.pass) {
    throw new Error("IMAP settings not configured");
  }

  const result: PollResult = { emailsScanned: 0, cvImported: 0, errors: [] };

  const imap = new ImapFlow({
    host:   settings.host,
    port:   settings.port,
    secure: settings.tls,
    auth:   { user: settings.user, pass: settings.pass },
    logger: false,
  });

  await imap.connect();
  // Use [Gmail]/All Mail so emails in Promotions / other tabs are also scanned.
  // INBOX only contains primary-tab messages, which misses many JobMaster notifications.
  const lock = await imap.getMailboxLock("[Gmail]/All Mail");

  try {
    // Fetch all open positions for matching + position identification
    const openPositions = await db.query.positions.findMany({
      where: inArray(positions.status, ["open"]),
      columns: { id: true, title: true, client: true, description: true, requirements: true },
    });

    const openPositionStubs = openPositions.map((p) => ({
      id: p.id, title: p.title, client: p.client,
    }));

    // Load already-processed UIDs — this is the sole dedup guard; we do NOT rely on the \Seen flag
    // because Jacob may read emails in Gmail before the poller runs, which would mark them seen and
    // cause them to be skipped forever if we filtered on seen:false.
    const processedUidsRaw = await getSetting("email_processed_uids");
    const processedUids = new Set<number>(processedUidsRaw ? JSON.parse(processedUidsRaw) : []);

    // Search by date (last 14 days) — catches emails regardless of read/unread status
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const allRecentUids = (await imap.search({ since }, { uid: true })) as number[];
    console.log(`[email-poll] recent UIDs (14d): [${allRecentUids.join(", ")}], already processed: [${[...processedUids].join(", ")}]`);
    const unseenUids = allRecentUids.slice(-50).filter((uid) => !processedUids.has(uid));
    console.log(`[email-poll] will process UIDs: [${unseenUids.join(", ")}]`);

    if (!unseenUids.length) {
      await setSetting("email_last_polled", new Date().toISOString());
      return result;
    }

    for await (const msg of imap.fetch(unseenUids, { source: true, uid: true }, { uid: true })) {
      result.emailsScanned++;
      console.log(`[email-poll] processing UID ${msg.uid}`);

      try {
        const parsed = await simpleParser(msg.source as Buffer);
        console.log(`[email-poll] parsed email: subject="${parsed.subject}", attachments=${parsed.attachments?.length ?? 0}`);

        // Only care about emails with PDF/DOCX attachments
        const cvAttachments = (parsed.attachments ?? []).filter((att) => {
          const name = (att.filename ?? "").toLowerCase();
          return name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".doc");
        });

        if (!cvAttachments.length) {
          console.log(`[email-poll] no CV attachments, skipping`);
          continue;
        }

        const subject  = parsed.subject  ?? "";
        const bodyText = parsed.text     ?? "";
        const bodyHtml = parsed.html || undefined;

        // Extract job source link (e.g. JobMaster application URL)
        const jobSourceUrl = extractJobSourceUrl(bodyText, bodyHtml);

        // Identify which position this email is about
        console.log(`[email-poll] identifying position...`);
        const positionId = await identifyPosition(subject, bodyText, openPositionStubs);
        console.log(`[email-poll] positionId=${positionId}`);

        // Process each CV attachment
        let emailFullyProcessed = true;
        for (const att of cvAttachments) {
          try {
            const buffer   = Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content as Uint8Array);
            const filename = att.filename ?? "cv.pdf";

            // Extract text from CV — timeout after 60s to avoid one bad PDF blocking the queue
            console.log(`[email-poll] extracting text from ${filename}...`);
            const cvText = await Promise.race([
              extractCVText(buffer, filename),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`extractCVText timed out for ${filename}`)), 60_000)
              ),
            ]);
            console.log(`[email-poll] extracted ${cvText?.length ?? 0} chars`);
            if (!cvText || cvText.trim().length < 50) continue;

            // Parse structured data with Claude
            console.log(`[email-poll] parsing CV with AI...`);
            const cvData = await parseCV(cvText);
            console.log(`[email-poll] parsed: ${cvData.fullName}`);

            // Skip if candidate with same email, phone, or full name already exists
            const dupConditions = [
              cvData.email ? eq(candidates.email, cvData.email) : undefined,
              cvData.phone ? eq(candidates.phone, cvData.phone) : undefined,
              cvData.fullName ? eq(candidates.fullName, cvData.fullName) : undefined,
            ].filter(Boolean) as Parameters<typeof or>;
            if (dupConditions.length) {
              const existing = await db.query.candidates.findFirst({
                where: or(...dupConditions),
                columns: { id: true },
              });
              if (existing) {
                console.log(`[email-poll] duplicate candidate (email=${cvData.email} phone=${cvData.phone} name=${cvData.fullName}), skipping`);
                continue;
              }
            }

            // Save file to disk
            const uploadsDir = path.join(process.cwd(), "uploads", "cvs");
            await mkdir(uploadsDir, { recursive: true });
            const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const filePath = path.join(uploadsDir, safeName);
            await writeFile(filePath, buffer);

            // Insert candidate
            const [candidate] = await db
              .insert(candidates)
              .values({
                fullName:          cvData.fullName        ?? filename.replace(/\.[^.]+$/, ""),
                email:             cvData.email           ?? null,
                phone:             cvData.phone           ?? null,
                currentTitle:      cvData.currentTitle    ?? null,
                yearsExperience:   cvData.yearsExperience ?? null,
                skills:            JSON.stringify(cvData.skills     ?? []),
                industries:        JSON.stringify(cvData.industries ?? []),
                location:          cvData.location        ?? null,
                summary:           cvData.summary         ?? null,
                summaryHe:         cvData.summaryHe       ?? null,
                cvPath:            filePath,
                source:            jobSourceUrl ? "jobmaster" : "website",
                appliedPositionId: positionId,
                jobSourceUrl:      jobSourceUrl ?? null,
              })
              .returning();

            // Match against all open positions
            console.log(`[email-poll] matching against ${openPositions.length} positions...`);
            await Promise.allSettled(
              openPositions.map(async (pos) => {
                const match = await matchCandidateToPosition(
                  {
                    fullName:        candidate.fullName,
                    currentTitle:    candidate.currentTitle,
                    yearsExperience: candidate.yearsExperience,
                    skills:          candidate.skills,
                    summary:         candidate.summary,
                  },
                  pos,
                );
                // Active applicant to this position → start as "relevant" so Jacob sees them immediately
                const initialStatus = pos.id === positionId ? "relevant" : "open";
                await db
                  .insert(candidateMatches)
                  .values({
                    candidateId:     candidate.id,
                    positionId:      pos.id,
                    strength:        match.strength,
                    explanation:     match.explanation,
                    explanationHe:   match.explanationHe,
                    candidateStatus: initialStatus,
                  })
                  .onConflictDoNothing();
              }),
            );

            result.cvImported++;
          } catch (err) {
            result.errors.push(`${att.filename ?? "attachment"}: ${String(err)}`);
            emailFullyProcessed = false;
          }
        }
        // Only mark processed on success — failed emails stay eligible for retry on next poll
        if (emailFullyProcessed) {
          processedUids.add(msg.uid);
          await setSetting("email_processed_uids", JSON.stringify([...processedUids])).catch(() => {});
        }
      } catch (err) {
        result.errors.push(`Email UID ${msg.uid}: ${String(err)}`);
        // Don't add to processedUids — outer error means we should retry this email next poll
      }
    }
  } finally {
    lock.release();
    await imap.logout();
  }

  // Update last poll timestamp
  await setSetting("email_last_polled", new Date().toISOString());

  return result;
}
