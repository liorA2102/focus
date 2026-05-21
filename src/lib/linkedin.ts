import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const CLIENT_ID     = process.env.LINKEDIN_CLIENT_ID!;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET!;
const REDIRECT_URI  = process.env.LINKEDIN_REDIRECT_URI!;
const SCOPES        = "openid profile w_member_social";

// ── Token storage (SQLite app_settings) ──────────────────────────────────────

async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}

export async function exchangeCode(code: string): Promise<void> {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  const data = await res.json();
  await setSetting("linkedin_access_token",         data.access_token);
  await setSetting("linkedin_refresh_token",        data.refresh_token ?? "");
  await setSetting("linkedin_token_expires_at",     String(Date.now() + data.expires_in * 1000));
  await setSetting("linkedin_refresh_expires_at",   String(Date.now() + (data.refresh_token_expires_in ?? 31535999) * 1000));
}

async function refreshAccessToken(): Promise<void> {
  const refreshToken = await getSetting("linkedin_refresh_token");
  if (!refreshToken) throw new Error("No refresh token stored");
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const data = await res.json();
  await setSetting("linkedin_access_token",     data.access_token);
  await setSetting("linkedin_token_expires_at", String(Date.now() + data.expires_in * 1000));
  if (data.refresh_token) await setSetting("linkedin_refresh_token", data.refresh_token);
}

export async function getAccessToken(): Promise<string> {
  const token     = await getSetting("linkedin_access_token");
  const expiresAt = await getSetting("linkedin_token_expires_at");
  if (!token) throw new Error("LinkedIn not connected");
  // Refresh 5 minutes before expiry
  if (expiresAt && Number(expiresAt) - Date.now() < 5 * 60 * 1000) {
    await refreshAccessToken();
    return (await getSetting("linkedin_access_token"))!;
  }
  return token;
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface LinkedInProfile {
  sub: string;          // person ID
  name: string;
  picture?: string;
}

export async function getProfile(): Promise<LinkedInProfile> {
  const token = await getAccessToken();
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Profile fetch failed: ${await res.text()}`);
  return res.json();
}

export async function getStatus(): Promise<{ connected: boolean; name?: string; picture?: string }> {
  const token = await getSetting("linkedin_access_token");
  if (!token) return { connected: false };
  try {
    const profile = await getProfile();
    return { connected: true, name: profile.name, picture: profile.picture };
  } catch {
    return { connected: false };
  }
}

// ── Image upload ──────────────────────────────────────────────────────────────

async function uploadImage(personId: string, filename: string): Promise<string> {
  const token    = await getAccessToken();
  const filepath = path.join(process.cwd(), "public", "linkedin-images", filename);
  const buffer   = fs.readFileSync(filepath);

  // 1. Initialize upload
  const initRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202501",
    },
    body: JSON.stringify({ initializeUploadRequest: { owner: `urn:li:person:${personId}` } }),
  });
  if (!initRes.ok) throw new Error(`Image init failed: ${await initRes.text()}`);
  const { value } = await initRes.json();

  // 2. Upload binary
  const uploadRes = await fetch(value.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: buffer,
  });
  if (!uploadRes.ok) throw new Error(`Image upload failed: ${uploadRes.status}`);

  return value.image; // urn:li:image:xxx
}

// ── Post ──────────────────────────────────────────────────────────────────────

export interface PostResult {
  success: boolean;
  postUrl?: string;
  error?: string;
}

export async function createPost(text: string, imageFilename?: string): Promise<PostResult> {
  try {
    const token   = await getAccessToken();
    const profile = await getProfile();
    const author  = `urn:li:person:${profile.sub}`;

    let imageUrn: string | undefined;
    if (imageFilename) {
      imageUrn = await uploadImage(profile.sub, imageFilename);
    }

    const body: Record<string, unknown> = {
      author,
      lifecycleState: "PUBLISHED",
      visibility: "PUBLIC",
      commentary: text,
    };
    if (imageUrn) {
      body.content = { media: { id: imageUrn } };
    }

    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202501",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Post failed: ${await res.text()}`);

    // LinkedIn returns the post ID in the X-RestLi-Id header
    const postId  = res.headers.get("x-restli-id") ?? res.headers.get("X-RestLi-Id");
    const postUrl = postId
      ? `https://www.linkedin.com/feed/update/${postId}/`
      : undefined;

    return { success: true, postUrl };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
