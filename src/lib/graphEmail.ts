import { db } from "@/db";
import { appSettings, candidates, candidateMatches, positions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { extractCVText, parseCV, matchCandidateToPosition } from "./ai";

const CLIENT_ID     = process.env.MS_CLIENT_ID!;
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET!;
const TENANT_ID     = process.env.MS_TENANT_ID!;
const REDIRECT_URI  = "http://localhost:3001/api/email/callback";
const SCOPES        = "Mail.Read Mail.ReadWrite offline_access";

const aiClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ── Settings helpers ── */
async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await db.insert(appSettings).values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

/* ── OAuth URLs ── */
export function getMsAuthUrl(): string {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    response_type: "code",
    redirect_uri:  REDIRECT_URI,
    scope:         SCOPES,
    response_mode: "query",
  });
  return `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?${params}`;
}

/* ── Token exchange ── */
export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        redirect_uri:  REDIRECT_URI,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    }
  );
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  const data = await res.json();
  await storeTokens(data);
  return data;
}

async function storeTokens(data: { access_token: string; refresh_token?: string; expires_in: number }) {
  const expiresAt = Date.now() + data.expires_in * 1000;
  await Promise.all([
    setSetting("ms_access_token",  data.access_token),
    setSetting("ms_token_expires", String(expiresAt)),
    ...(data.refresh_token ? [setSetting("ms_refresh_token", data.refresh_token)] : []),
  ]);
}

async function getValidAccessToken(): Promise<string> {
  const [accessToken, expiresStr, refreshToken] = await Promise.all([
    getSetting("ms_access_token"),
    getSetting("ms_token_expires"),
    getSetting("ms_refresh_token"),
  ]);

  if (!accessToken) throw new Error("Not connected to Microsoft — visit /email to connect");

  // Refresh if expiring within 5 minutes
  const expiresAt = parseInt(expiresStr ?? "0");
  if (Date.now() < expiresAt - 5 * 60 * 1000) return accessToken;

  if (!refreshToken) throw new Error("Token expired — reconnect at /email");

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "refresh_token",
        refresh_token: refreshToken,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope:         SCOPES,
      }),
    }
  );
  if (!res.ok) throw new Error(`Token refresh failed — reconnect at /email`);
  const data = await res.json();
  await storeTokens(data);
  return data.access_token;
}

/* ── Connection status ── */
export async function getMsConnectionStatus(): Promise<{ connected: boolean; email?: string }> {
  const token = await getSetting("ms_access_token");
  if (!token) return { connected: false };
  try {
    const res = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { connected: false };
    const data = await res.json();
    return { connected: true, email: data.mail ?? data.userPrincipalName };
  } catch {
    return { connected: false };
  }
}

/* ── Identify position from email ── */
async function identifyPosition(
  subject: string,
  bodyPreview: string,
  openPositions: { id: number; title: string; client: string }[],
): Promise<number | null> {
  if (!openPositions.length) return null;
  const msg = await aiClient.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 128,
    messages: [{
      role: "user",
      content: `Identify which open position this CV email is applying for.

Subject: ${subject}
Preview: ${bodyPreview.slice(0, 400)}

Open positions:
${openPositions.map((p) => `ID ${p.id}: "${p.title}" at ${p.client}`).join("\n")}

Return ONLY valid JSON: {"positionId": <number or null>}
Return null if unclear.`,
    }],
  });
  try {
    const raw = (msg.content[0] as { text: string }).text.trim()
      .replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
    const result = JSON.parse(raw);
    const id = result.positionId;
    if (typeof id === "number" && openPositions.some((p) => p.id === id)) return id;
    return null;
  } catch { return null; }
}

/* ── Main poll ── */
export type PollResult = {
  emailsScanned: number;
  cvImported: number;
  errors: string[];
};

export async function pollGraphInbox(): Promise<PollResult> {
  const token = await getValidAccessToken();
  const result: PollResult = { emailsScanned: 0, cvImported: 0, errors: [] };

  const openPositions = await db.query.positions.findMany({
    where: inArray(positions.status, ["open"]),
    columns: { id: true, title: true, client: true, description: true, requirements: true },
  });
  const positionStubs = openPositions.map((p) => ({ id: p.id, title: p.title, client: p.client }));

  // Fetch unread emails that have attachments
  const listUrl = "https://graph.microsoft.com/v1.0/me/messages"
    + "?$filter=isRead eq false and hasAttachments eq true"
    + "&$select=id,subject,bodyPreview,receivedDateTime"
    + "&$top=50";

  const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!listRes.ok) throw new Error(`Graph API error: ${await listRes.text()}`);
  const listData = await listRes.json();
  const messages: { id: string; subject: string; bodyPreview: string }[] = listData.value ?? [];

  for (const message of messages) {
    result.emailsScanned++;
    try {
      // Fetch attachments
      const attRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${message.id}/attachments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!attRes.ok) continue;
      const attData = await attRes.json();
      const attachments: { name: string; contentBytes: string; contentType: string }[] = attData.value ?? [];

      const cvAttachments = attachments.filter((a) => {
        const name = (a.name ?? "").toLowerCase();
        return name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".doc");
      });

      if (!cvAttachments.length) {
        await markRead(token, message.id);
        continue;
      }

      const positionId = await identifyPosition(message.subject ?? "", message.bodyPreview ?? "", positionStubs);

      for (const att of cvAttachments) {
        try {
          const buffer   = Buffer.from(att.contentBytes, "base64");
          const filename = att.name ?? "cv.pdf";

          const cvText = await extractCVText(buffer, filename);
          if (!cvText || cvText.trim().length < 50) continue;

          const cvData = await parseCV(cvText);

          const uploadsDir = path.join(process.cwd(), "uploads", "cvs");
          await mkdir(uploadsDir, { recursive: true });
          const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          await writeFile(path.join(uploadsDir, safeName), buffer);

          const [candidate] = await db.insert(candidates).values({
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
            cvPath:            path.join(process.cwd(), "uploads", "cvs", safeName),
            source:            /jobmaster/i.test(message.subject + " " + message.bodyPreview) ? "jobmaster" : "website",
            appliedPositionId: positionId,
          }).returning();

          await Promise.allSettled(
            openPositions.map(async (pos) => {
              const match = await matchCandidateToPosition(
                { fullName: candidate.fullName, currentTitle: candidate.currentTitle,
                  yearsExperience: candidate.yearsExperience, skills: candidate.skills, summary: candidate.summary },
                pos,
              );
              await db.insert(candidateMatches).values({
                candidateId:     candidate.id,
                positionId:      pos.id,
                strength:        match.strength,
                explanation:     match.explanation,
                explanationHe:   match.explanationHe,
                candidateStatus: pos.id === positionId ? "relevant" : "open",
              }).onConflictDoNothing();
            }),
          );

          result.cvImported++;
        } catch (err) {
          result.errors.push(`${att.name}: ${String(err)}`);
        }
      }

      await markRead(token, message.id);
    } catch (err) {
      result.errors.push(`Message ${message.id}: ${String(err)}`);
    }
  }

  await setSetting("email_last_polled", new Date().toISOString());
  return result;
}

async function markRead(token: string, messageId: string) {
  await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ isRead: true }),
  });
}
