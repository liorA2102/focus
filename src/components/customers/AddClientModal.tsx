"use client";

import { useState } from "react";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";

type Client = {
  id:            number;
  name:          string;
  tagline:       string | null;
  industry:      string | null;
  website:       string | null;
  linkedinUrl:   string | null;
  logoPath:      string | null;
  createdAt:     string;
  openPositions: number;
  contactCount:  number;
};

type ScrapedData = {
  name:     string | null;
  tagline:  string | null;
  industry: string | null;
  website:  string | null;
  logoUrl:  string | null;
};

type Props = {
  onClose:   () => void;
  onCreated: (client: Client) => void;
};

export default function AddClientModal({ onClose, onCreated }: Props) {
  const { lang } = useLang();
  const t = translations[lang].customers;

  const [step, setStep]           = useState<1 | 2>(1);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [fetching, setFetching]   = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [scrapedLogoUrl, setScrapedLogoUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    name:        "",
    tagline:     "",
    industry:    "",
    website:     "",
    linkedinUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleFetch() {
    setFetchError("");
    setFetching(true);
    try {
      const res = await fetch("/api/clients/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkedinUrl }),
      });
      const data: ScrapedData | { error: string } = await res.json();
      if ("error" in data || !res.ok) {
        const isAuthWall = "error" in data && data.error.toLowerCase().includes("login");
        if (isAuthWall) {
          // LinkedIn blocked the scraper — jump to manual form with URL pre-filled
          setForm((f) => ({ ...f, linkedinUrl }));
          setFetchError("LinkedIn blocked automatic fetch. Please fill in the details manually.");
          setStep(2);
        } else {
          setFetchError("error" in data ? data.error : t.fetchError);
        }
        return;
      }
      setScrapedLogoUrl(data.logoUrl);
      setForm({
        name:        data.name     ?? "",
        tagline:     data.tagline  ?? "",
        industry:    data.industry ?? "",
        website:     data.website  ?? "",
        linkedinUrl: linkedinUrl,
      });
      setStep(2);
    } catch {
      setFetchError(t.fetchError);
    } finally {
      setFetching(false);
    }
  }

  function goManual() {
    setForm((f) => ({ ...f, linkedinUrl }));
    setStep(2);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaveError("");
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logoUrl: scrapedLogoUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Error"); return; }
      onCreated({ ...data, openPositions: 0, contactCount: 0 });
    } catch {
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)", borderRadius: "16px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          width: "100%", maxWidth: "520px",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "24px 28px 20px",
          borderBottom: "1px solid var(--border)",
        }}>
          <h3 style={{ fontFamily: "var(--font-body)", fontSize: "20px", fontWeight: "700", color: "var(--navy)", margin: 0 }}>
            {t.addClientTitle}
          </h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "var(--text-muted)", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {step === 1 ? (
            <>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", margin: 0 }}>
                {t.step1Title}
              </p>
              <input
                className="input"
                type="url"
                placeholder={t.linkedinUrlPlaceholder}
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                autoFocus
              />
              {fetchError && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--coral)", margin: 0 }}>
                  {fetchError}
                </p>
              )}
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button
                  className="btn btn-primary"
                  onClick={handleFetch}
                  disabled={!linkedinUrl.trim() || fetching}
                  style={{ flex: 1 }}
                >
                  {fetching ? t.fetching : t.fetchBtn}
                </button>
                <button
                  className="btn"
                  onClick={goManual}
                  style={{ flex: 1 }}
                >
                  {t.fillManually}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <button
                  onClick={() => setStep(1)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)", padding: 0 }}
                >
                  ← {t.step1Title}
                </button>
              </div>

              {/* Auth wall notice */}
              {fetchError && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 12px", margin: 0 }}>
                  {fetchError}
                </p>
              )}

              {/* Logo preview */}
              {scrapedLogoUrl && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <img
                    src={scrapedLogoUrl}
                    alt="logo preview"
                    style={{ width: "52px", height: "52px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--border)" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                    Logo will be saved automatically
                  </p>
                </div>
              )}

              {[
                { key: "name",        label: t.companyName, required: true  },
                { key: "tagline",     label: t.tagline,     required: false },
                { key: "industry",    label: t.industry,    required: false },
                { key: "website",     label: t.website,     required: false },
                { key: "linkedinUrl", label: t.linkedin,    required: false },
              ].map(({ key, label, required }) => (
                <div key={key}>
                  <label style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", display: "block", marginBottom: "6px" }}>
                    {label}{required && " *"}
                  </label>
                  <input
                    className="input"
                    type="text"
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    autoFocus={key === "name"}
                  />
                </div>
              ))}

              {saveError && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--coral)", margin: 0 }}>
                  {saveError}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
          <div style={{
            padding: "16px 28px 24px",
            borderTop: "1px solid var(--border)",
            display: "flex", justifyContent: "flex-end", gap: "10px",
          }}>
            <button className="btn" onClick={onClose}>{t.cancel}</button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!form.name.trim() || saving}
            >
              {saving ? t.saving : t.saveClient}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
