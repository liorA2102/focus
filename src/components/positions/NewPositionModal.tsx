"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";

type Props = {
  onClose: () => void;
  onCreated: () => void;
  preselectedClient?: ClientOption;
};

type ClientOption = { id: number; name: string };

type FormData = {
  title:        string;
  client:       string;
  clientId:     number | null;
  location:     string;
  salaryRange:  string;
  description:  string;
  requirements: string;
};

const empty: FormData = {
  title: "", client: "", clientId: null, location: "", salaryRange: "", description: "", requirements: "",
};

type Step = "choose" | "paste" | "form";

export default function NewPositionModal({ onClose, onCreated, preselectedClient }: Props) {
  const { lang, dir } = useLang();
  const t = translations[lang].modal;
  const tc = translations[lang].customers;
  const router = useRouter();

  const [step, setStep] = useState<Step>("choose");
  const [emailText, setEmailText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [form, setForm] = useState<FormData>(
    preselectedClient
      ? { ...empty, client: preselectedClient.name, clientId: preselectedClient.id }
      : empty
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Client dropdown
  const [allClients, setAllClients]         = useState<ClientOption[]>([]);
  const [clientSearch, setClientSearch]     = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(preselectedClient ?? null);
  const [showDropdown, setShowDropdown]     = useState(false);
  const dropdownRef                          = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === "form" && allClients.length === 0) {
      fetch("/api/clients")
        .then((r) => r.json())
        .then((data: ClientOption[]) => setAllClients(data));
    }
  }, [step]);

  const filteredClients = allClients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  function selectClient(c: ClientOption) {
    setSelectedClient(c);
    setClientSearch("");
    setForm((f) => ({ ...f, client: c.name, clientId: c.id }));
    setShowDropdown(false);
  }

  function handleClientInput(val: string) {
    setClientSearch(val);
    setSelectedClient(null);
    setForm((f) => ({ ...f, client: val, clientId: null }));
    setShowDropdown(true);
  }

  const parseEmail = async () => {
    if (!emailText.trim()) return;
    setParsing(true);
    setParseError("");
    try {
      const res = await fetch("/api/parse-job-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({
        title:        data.title        ?? "",
        client:       data.client       ?? "",
        clientId:     null,
        location:     data.location     ?? "",
        salaryRange:  data.salaryRange  ?? "",
        description:  data.description  ?? "",
        requirements: data.requirements ?? "",
      });
      setStep("form");
    } catch (e) {
      setParseError("Couldn't read the email. Try again or fill in the fields manually.");
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.client.trim()) {
      setSaveError("Job title and client name are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      onCreated();
    } catch {
      setSaveError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed", inset: 0,
        background: "rgba(15,12,10,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: "24px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-panel"
        style={{
          background: "var(--surface)",
          borderRadius: "20px",
          padding: "36px 40px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.08)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <p style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>
              {t.newPosition}
            </p>
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px", fontWeight: "700", letterSpacing: "-0.3px" }}>
              {step === "choose" ? t.howToAdd :
               step === "paste"  ? t.pasteEmail :
               t.reviewSave}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px",
              width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: "18px", color: "var(--text-muted)", lineHeight: 1,
              transition: "background 140ms ease",
            }}
          >
            ×
          </button>
        </div>

        {/* ── STEP 1: Choose ── */}
        {step === "choose" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <ChoiceCard
              icon="✉️"
              title={t.pasteTitle}
              subtitle={t.pasteSub}
              onClick={() => setStep("paste")}
              dir={dir}
              primary
            />
            <ChoiceCard
              icon="✏️"
              title={t.manualTitle}
              subtitle={t.manualSub}
              onClick={() => setStep("form")}
              dir={dir}
            />
          </div>
        )}

        {/* ── STEP 2: Paste ── */}
        {step === "paste" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <textarea
              className="input"
              autoFocus
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              placeholder={t.emailPlaceholder}
              rows={10}
              style={{ fontFamily: "inherit", fontSize: "14px", lineHeight: "1.7" }}
            />

            {parseError && (
              <p style={{ color: "var(--danger)", fontSize: "14px", fontWeight: "500" }}>
                {t.parseError}
              </p>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "space-between" }}>
              <button className="btn btn-ghost" onClick={() => setStep("choose")}>
                {t.back}
              </button>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setForm(empty); setStep("form"); }}
                >
                  {t.skipManual}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={parseEmail}
                  disabled={!emailText.trim() || parsing}
                  style={{ opacity: (!emailText.trim() || parsing) ? 0.6 : 1, cursor: (!emailText.trim() || parsing) ? "not-allowed" : "pointer", minWidth: "130px" }}
                >
                  {parsing ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Spinner /> {t.reading}
                    </span>
                  ) : t.extract}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Form ── */}
        {step === "form" && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Field label={t.jobTitle} required>
              <input className="input" type="text" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t.jobTitlePlaceholder} autoFocus />
            </Field>

            <Field label={t.client} required hint={t.clientHint}>
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <input
                  className="input"
                  type="text"
                  placeholder={tc.clientDropdownPlaceholder}
                  value={selectedClient ? selectedClient.name : clientSearch}
                  onChange={(e) => handleClientInput(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  autoComplete="off"
                />
                {showDropdown && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                    background: "var(--surface)", border: "1.5px solid var(--border)",
                    borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    zIndex: 200, overflow: "hidden", maxHeight: "200px", overflowY: "auto",
                  }}>
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => selectClient(c)}
                        style={{
                          display: "block", width: "100%", textAlign: "start",
                          padding: "10px 14px", background: "none", border: "none",
                          fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "var(--text-primary)",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                      >
                        {c.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onMouseDown={() => { onClose(); router.push("/customers?new=true"); }}
                      style={{
                        display: "block", width: "100%", textAlign: "start",
                        padding: "10px 14px", background: "none",
                        borderTop: filteredClients.length > 0 ? "1px solid var(--border)" : "none",
                        borderLeft: "none", borderRight: "none", borderBottom: "none",
                        fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: "600",
                        color: "var(--coral)", cursor: "pointer",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                    >
                      {tc.createNewClient}
                    </button>
                  </div>
                )}
              </div>
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Field label={t.location}>
                <input className="input" type="text" value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Tel Aviv" />
              </Field>
              <Field label={t.salaryRange}>
                <input className="input" type="text" value={form.salaryRange}
                  onChange={(e) => setForm({ ...form, salaryRange: e.target.value })}
                  placeholder="₪25,000–35,000" />
              </Field>
            </div>

            <Field label={t.description}>
              <textarea className="input" value={form.description} rows={4}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t.descriptionPlaceholder} />
            </Field>

            <Field label={t.requirements}>
              <textarea className="input" value={form.requirements} rows={3}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                placeholder={t.requirementsPlaceholder} />
            </Field>

            {saveError && (
              <p style={{ color: "var(--danger)", fontSize: "14px", fontWeight: "500" }}>{t.saveError}</p>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "space-between", paddingTop: "4px" }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(emailText ? "paste" : "choose")}>
                {t.back}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? t.saving : t.createPosition}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function ChoiceCard({ icon, title, subtitle, onClick, primary, dir }: {
  icon: string; title: string; subtitle: string; onClick: () => void; primary?: boolean; dir?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "18px 20px",
        borderRadius: "12px",
        border: `1.5px solid ${primary ? "var(--coral)" : "var(--border)"}`,
        background: primary ? "var(--coral-light)" : "var(--bg)",
        cursor: "pointer",
        textAlign: "start",
        width: "100%",
        transition: "border-color 150ms ease, box-shadow 150ms ease, transform 150ms var(--ease-out)",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
      }}
    >
      <span style={{ fontSize: "28px", flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "3px" }}>
          {title}
        </p>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
          {subtitle}
        </p>
      </div>
      <span style={{ marginInlineStart: "auto", color: "var(--text-muted)", fontSize: "18px", flexShrink: 0 }}>
        {dir === "rtl" ? "←" : "→"}
      </span>
    </button>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", display: "flex", gap: "6px", alignItems: "center", textAlign: "start" }}>
        {label}
        {required && <span style={{ color: "var(--coral)", fontSize: "14px" }}>*</span>}
        {hint && <span style={{ fontWeight: "400", color: "var(--text-muted)", fontSize: "13px" }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 0.7s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
