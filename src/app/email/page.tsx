"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";
import PageHeader from "@/components/ui/PageHeader";

type PollResult = {
  emailsScanned: number;
  cvImported: number;
  errors: string[];
};

type ImapSettings = {
  host: string;
  port: number;
  user: string;
  pass: string;
  tls: boolean;
};

export default function EmailInboxPage() {
  const { lang } = useLang();
  const t = translations[lang].emailInbox;

  const [connected,    setConnected]    = useState(false);
  const [connEmail,    setConnEmail]    = useState<string | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);

  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState<ImapSettings>({
    host: "imap.gmail.com",
    port: 993,
    user: "cvfocusg@gmail.co.il",
    pass: "",
    tls:  true,
  });

  const [polling,    setPolling]    = useState(false);
  const [lastPolled, setLastPolled] = useState<string | null>(null);
  const [pollResult, setPollResult] = useState<PollResult | null>(null);
  const [pollError,  setPollError]  = useState<string | null>(null);
  const [now,        setNow]        = useState(() => Date.now());

  const [appVersion,   setAppVersion]   = useState<{ version: string; gitCommit: string; gitDate: string | null } | null>(null);
  const [updating,     setUpdating]     = useState(false);
  const [updateResult, setUpdateResult] = useState<"started" | "error" | null>(null);
  const [updateError,  setUpdateError]  = useState<string | null>(null);

  const POLL_INTERVAL_MS = 15 * 60 * 1000;

  const fetchLastPolled = () =>
    fetch("/api/email/last-polled")
      .then((r) => r.json())
      .then((d) => { if (d?.lastPolled) setLastPolled(d.lastPolled); })
      .catch(() => {});

  useEffect(() => {
    fetch("/api/email/status")
      .then((r) => r.json())
      .then((d) => {
        setConnected(d.connected);
        setConnEmail(d.email ?? null);
        setStatusLoaded(true);
        if (!d.connected) setEditing(true);
      });

    fetchLastPolled();

    fetch("/api/admin/app-version")
      .then((r) => r.json())
      .then((d) => setAppVersion(d))
      .catch(() => {});

    const ticker = setInterval(() => {
      setNow(Date.now());
      fetchLastPolled();
    }, 60_000);

    return () => clearInterval(ticker);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/email/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error ?? "Save failed");
      } else {
        setConnected(true);
        setConnEmail(form.user);
        setEditing(false);
      }
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    setUpdateResult(null);
    setUpdateError(null);
    try {
      const res  = await fetch("/api/admin/update", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setUpdateResult("error");
        setUpdateError(data.error ?? "Unknown error");
      } else {
        setUpdateResult("started");
      }
    } catch (err) {
      setUpdateResult("error");
      setUpdateError(String(err));
    } finally {
      setUpdating(false);
    }
  };

  const handlePoll = async () => {
    setPolling(true);
    setPollResult(null);
    setPollError(null);
    try {
      const res  = await fetch("/api/email/poll", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setPollError(data.error ?? "Unknown error");
        if (data.authFailed) { setConnected(false); setEditing(true); }
      } else {
        setPollResult(data);
        setLastPolled(new Date().toISOString());
      }
    } catch (err) {
      setPollError(String(err));
    } finally {
      setPolling(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(lang === "he" ? "he-IL" : "en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  const nextPollMinutes = lastPolled
    ? Math.max(0, Math.round((new Date(lastPolled).getTime() + POLL_INTERVAL_MS - now) / 60_000))
    : null;

  return (
    <div style={{ maxWidth: "560px" }}>
      <PageHeader title={t.title} />
      <p style={{
        fontFamily: "var(--font-body)",
        fontSize: "14px", color: "var(--text-secondary)",
        marginBottom: "28px",
        marginTop: "-16px",
      }}>
        {t.subtitle}
      </p>

      {/* ── Connection card ── */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "24px 28px", marginBottom: "16px",
      }}>
        {!statusLoaded ? (
          <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)" }}>
            {t.checking}
          </p>
        ) : connected && !editing ? (
          /* Connected — show email + change button */
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <GmailIcon />
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: "15px",
                  fontWeight: "600", color: "var(--strong)",
                }}>
                  {t.connected}
                </span>
              </div>
              {connEmail && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>
                  {connEmail}
                </p>
              )}
            </div>
            <button
              onClick={() => { setEditing(true); setSaveError(null); }}
              style={{
                fontFamily: "var(--font-body)", fontSize: "13px",
                color: "var(--text-muted)", background: "none",
                border: "none", cursor: "pointer", textDecoration: "underline",
              }}
            >
              {t.changeSettings}
            </button>
          </div>
        ) : (
          /* Settings form */
          <div>
            <p style={{
              fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: "600",
              color: "var(--navy)", marginBottom: "16px",
            }}>
              {t.settingsTitle}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Gmail address */}
              <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {t.labelEmail}
                </span>
                <input
                  type="email"
                  value={form.user}
                  onChange={(e) => setForm({ ...form, user: e.target.value })}
                  style={{
                    fontFamily: "var(--font-body)", fontSize: "14px",
                    padding: "9px 12px", borderRadius: "8px",
                    border: "1px solid var(--border)", background: "var(--bg)",
                    color: "var(--navy)", outline: "none",
                  }}
                />
              </label>

              {/* App password */}
              <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {t.labelAppPassword}
                </span>
                <input
                  type="password"
                  value={form.pass}
                  onChange={(e) => setForm({ ...form, pass: e.target.value })}
                  placeholder={t.appPasswordPlaceholder}
                  style={{
                    fontFamily: "var(--font-body)", fontSize: "14px",
                    padding: "9px 12px", borderRadius: "8px",
                    border: "1px solid var(--border)", background: "var(--bg)",
                    color: "var(--navy)", outline: "none",
                  }}
                />
                <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                  {t.appPasswordHint}
                </span>
              </label>
            </div>

            {saveError && (
              <div style={{
                marginTop: "12px", padding: "10px 14px",
                background: "var(--coral-light)", borderRadius: "8px",
                fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--coral)",
              }}>
                {saveError}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button
                onClick={handleSave}
                disabled={saving || !form.user || !form.pass}
                className="btn btn-primary"
                style={{ fontSize: "14px", padding: "10px 24px", opacity: (!form.user || !form.pass) ? 0.5 : 1 }}
              >
                {saving ? t.saving : t.saveBtn}
              </button>
              {connected && (
                <button
                  onClick={() => { setEditing(false); setSaveError(null); }}
                  className="btn"
                  style={{ fontSize: "14px", padding: "10px 18px", background: "none", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: "8px", cursor: "pointer" }}
                >
                  {t.cancel}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Auto-sync status card ── */}
      {connected && statusLoaded && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "12px", padding: "20px 28px", marginBottom: "16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "3px 10px", borderRadius: "20px",
              background: "#E0F2EB", color: "#1A6B4A",
              fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "600",
            }}>
              <span style={{
                width: "6px", height: "6px", borderRadius: "50%", background: "#1A6B4A",
                animation: "pulse 2s ease-in-out infinite",
              }} />
              {t.autoSyncActive}
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)" }}>
              {t.autoSyncInterval}
            </span>
          </div>
          {nextPollMinutes !== null && (
            <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              {nextPollMinutes === 0 ? t.autoSyncSoon : t.autoSyncNext(nextPollMinutes)}
            </span>
          )}
        </div>
      )}

      {/* ── Poll card ── */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "24px 28px",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "16px",
        }}>
          <h3 style={{
            fontFamily: "var(--font-body)",
            fontSize: "15px", fontWeight: "600", color: "var(--navy)",
          }}>
            {t.pollTitle}
          </h3>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
            {t.lastPolled}{" "}{lastPolled ? formatDate(lastPolled) : t.never}
          </span>
        </div>

        <button
          onClick={handlePoll}
          disabled={polling || !connected}
          className="btn btn-primary"
          style={{ fontSize: "14px", padding: "10px 24px", opacity: !connected ? 0.5 : 1 }}
        >
          {polling ? t.polling : t.pollBtn}
        </button>

        {!connected && statusLoaded && (
          <p style={{
            marginTop: "10px",
            fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)",
          }}>
            {t.connectFirst}
          </p>
        )}

        {pollResult && (
          <div style={{
            marginTop: "16px", padding: "16px",
            background: "var(--bg)", borderRadius: "8px",
            border: "1px solid var(--border)",
          }}>
            <div style={{
              display: "flex", gap: "20px",
              fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: "600",
              marginBottom: pollResult.errors.length ? "12px" : 0,
            }}>
              <span style={{ color: "var(--text-secondary)" }}>
                📨 {t.resultScanned(pollResult.emailsScanned)}
              </span>
              <span style={{ color: "var(--strong)" }}>
                ✓ {t.resultImported(pollResult.cvImported)}
              </span>
            </div>
            {pollResult.errors.length > 0 && (
              <div>
                <p style={{
                  fontFamily: "var(--font-body)", fontSize: "12px",
                  fontWeight: "600", color: "var(--coral)", marginBottom: "6px",
                }}>
                  {t.resultErrors}
                </p>
                {pollResult.errors.map((e, i) => (
                  <p key={i} style={{
                    fontFamily: "var(--font-body)", fontSize: "12px",
                    color: "var(--coral)", marginBottom: "2px",
                  }}>
                    • {e}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {pollError && (
          <div style={{
            marginTop: "16px", padding: "12px 16px",
            background: "var(--coral-light)", borderRadius: "8px",
            fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--coral)",
          }}>
            {pollError}
          </div>
        )}
      </div>

      {/* ── App update card ── */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "24px 28px", marginTop: "16px",
      }}>
        <h3 style={{
          fontFamily: "var(--font-body)",
          fontSize: "15px", fontWeight: "600", color: "var(--navy)",
          marginBottom: "12px",
        }}>
          {t.updateTitle}
        </h3>

        {appVersion && (
          <div style={{
            display: "flex", gap: "20px", flexWrap: "wrap",
            marginBottom: "16px",
          }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)" }}>
              {t.updateVersion}{" "}
              <strong style={{ color: "var(--navy)" }}>{appVersion.version}</strong>
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)" }}>
              {t.updateCommit}{" "}
              <strong style={{ color: "var(--navy)", fontFamily: "monospace" }}>{appVersion.gitCommit}</strong>
            </span>
            {appVersion.gitDate && (
              <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)" }}>
                {t.updateLastUpdated}{" "}
                <strong style={{ color: "var(--navy)" }}>{formatDate(appVersion.gitDate)}</strong>
              </span>
            )}
          </div>
        )}

        <button
          onClick={handleUpdate}
          disabled={updating || updateResult === "started"}
          className="btn btn-primary"
          style={{ fontSize: "14px", padding: "10px 24px", opacity: updating ? 0.6 : 1 }}
        >
          {updating ? t.updating : t.updateBtn}
        </button>

        {updateResult === "started" && (
          <div style={{
            marginTop: "14px", padding: "12px 16px",
            background: "#E0F2EB", borderRadius: "8px",
            fontFamily: "var(--font-body)", fontSize: "13px", color: "#1A6B4A",
          }}>
            {t.updateStarted}
          </div>
        )}

        {updateResult === "error" && (
          <div style={{
            marginTop: "14px", padding: "12px 16px",
            background: "var(--coral-light)", borderRadius: "8px",
            fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--coral)",
          }}>
            {t.updateError}{updateError ? `: ${updateError}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

function GmailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" fill="#fff" stroke="#E0E0E0" strokeWidth="1"/>
      <path d="M22 6l-10 7L2 6" stroke="#EA4335" strokeWidth="1.5" fill="none"/>
      <path d="M2 6l10 7 10-7" fill="#EA4335"/>
    </svg>
  );
}
