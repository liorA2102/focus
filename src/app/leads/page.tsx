"use client";

import { useEffect, useState, useRef } from "react";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

type Lead = {
  id: number;
  name: string;
  headline: string | null;
  company: string | null;
  linkedinUrl: string;
  profilePictureUrl: string | null;
  postUrl: string | null;
  templateUsed: string | null;
  notes: string | null;
  createdAt: string;
};

type Template = {
  id: number;
  title: string;
  body: string;
  imageFilename: string | null;
  createdAt: string;
};

type LiImage = { id: number; filename: string; label: string | null };

export default function LeadsPage() {
  const { lang } = useLang();
  const t = translations[lang].leads;

  const [tab, setTab] = useState<"leads" | "templates">("leads");

  // ── Leads ─────────────────────────────────────────────────────────────────
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingLead, setDeletingLead] = useState<number | null>(null);

  const fetchLeads = async () => {
    setLeadsLoading(true);
    const res = await fetch("/api/leads");
    const data = await res.json();
    setLeads(data);
    setLeadsLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const filteredLeads = search.trim()
    ? leads.filter((l) => {
        const hay = [l.name, l.company, l.headline, l.templateUsed].join(" ").toLowerCase();
        return search.toLowerCase().split(" ").every((w) => hay.includes(w));
      })
    : leads;

  const deleteLead = async (id: number) => {
    if (!confirm(t.confirmDelete)) return;
    setDeletingLead(id);
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setDeletingLead(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  // ── Templates ─────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [images, setImages] = useState<LiImage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<number | null>(null);

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    const [tmplRes, imgRes] = await Promise.all([
      fetch("/api/comment-templates"),
      fetch("/api/linkedin/images"),
    ]);
    setTemplates(await tmplRes.json());
    setImages(await imgRes.json());
    setTemplatesLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openNewForm = () => {
    setEditingTemplate(null);
    setFormTitle("");
    setFormBody("");
    setFormImage(null);
    setShowForm(true);
  };

  const openEditForm = (tmpl: Template) => {
    setEditingTemplate(tmpl);
    setFormTitle(tmpl.title);
    setFormBody(tmpl.body);
    setFormImage(tmpl.imageFilename);
    setShowForm(true);
  };

  const cancelForm = () => { setShowForm(false); setEditingTemplate(null); };

  const saveTemplate = async () => {
    if (!formTitle.trim() || !formBody.trim()) return;
    setFormSaving(true);
    const payload = { title: formTitle.trim(), body: formBody.trim(), imageFilename: formImage };

    if (editingTemplate) {
      const res = await fetch(`/api/comment-templates/${editingTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setTemplates((prev) => prev.map((t) => t.id === editingTemplate.id ? updated : t));
    } else {
      const res = await fetch("/api/comment-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setTemplates((prev) => [...prev, created]);
    }

    setFormSaving(false);
    setShowForm(false);
    setEditingTemplate(null);
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm(t.confirmDeleteTemplate)) return;
    setDeletingTemplate(id);
    await fetch(`/api/comment-templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((tmpl) => tmpl.id !== id));
    setDeletingTemplate(null);
  };

  const exportTemplates = () => {
    const data = templates.map(({ title, body, imageFilename }) => ({ title, body, imageFilename }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "focus-templates.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTemplates = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Array<{ title: string; body: string; imageFilename?: string }>;
      let added = 0;
      for (const tmpl of data) {
        if (!tmpl.title || !tmpl.body) continue;
        const res = await fetch("/api/comment-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: tmpl.title, body: tmpl.body, imageFilename: tmpl.imageFilename ?? null }),
        });
        if (res.ok) { const created = await res.json(); setTemplates((prev) => [...prev, created]); added++; }
      }
      alert(`${added} ${lang === "he" ? "תבניות יובאו" : "templates imported"}`);
    } catch {
      alert(lang === "he" ? "שגיאה בייבוא" : "Import failed — invalid file");
    }
    e.target.value = "";
  };

  return (
    <div>
      {/* Header */}
      <PageHeader
        title={t.title}
        actions={tab === "templates" && !showForm ? (
          <button onClick={openNewForm} className="btn btn-primary">
            {t.newTemplate}
          </button>
        ) : undefined}
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "28px", borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
        {(["leads", "templates"] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "transparent",
              color: tab === tabKey ? "var(--coral)" : "var(--muted)",
              fontWeight: tab === tabKey ? 700 : 400,
              fontSize: "14px",
              cursor: "pointer",
              borderBottom: tab === tabKey ? "2px solid var(--coral)" : "2px solid transparent",
              marginBottom: "-1px",
              fontFamily: "var(--font-body)",
              transition: "color 150ms ease",
            }}
          >
            {tabKey === "leads" ? t.tabLeads : t.tabTemplates}
            {tabKey === "leads" && leads.length > 0 && (
              <span style={{ marginInlineStart: "8px", background: "var(--coral)", color: "#fff", borderRadius: "10px", padding: "1px 7px", fontSize: "11px", fontWeight: 700 }}>
                {leads.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── LEADS TAB ─────────────────────────────────────────────────────── */}
      {tab === "leads" && (
        <div>
          {/* Search */}
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              marginBottom: "20px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          {leadsLoading ? (
            <div style={{ color: "var(--muted)", fontSize: "14px" }}>…</div>
          ) : leads.length === 0 ? (
            <EmptyState icon="👤" iconBg="var(--steel-light)" title={t.noLeads} subtitle={t.noLeadsHint} />
          ) : filteredLeads.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ color: "var(--muted)", fontSize: "15px", marginBottom: "12px" }}>{t.noResults}</div>
              <button onClick={() => setSearch("")} style={linkBtnStyle}>{t.clearSearch}</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  t={t}
                  lang={lang}
                  onDelete={() => deleteLead(lead.id)}
                  deleting={deletingLead === lead.id}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TEMPLATES TAB ─────────────────────────────────────────────────── */}
      {tab === "templates" && (
        <div>
          {/* Form */}
          {showForm && (
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={labelStyle}>{t.templateTitle}</label>
                  <input
                    type="text"
                    placeholder={t.templateTitlePlaceholder}
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t.templateBody}</label>
                  <textarea
                    placeholder={t.templateBodyPlaceholder}
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    rows={5}
                    style={{ ...inputStyle, resize: "vertical", minHeight: "100px" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t.templateImage}</label>
                  {formImage ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <img
                        src={`/linkedin-images/${formImage}`}
                        alt=""
                        style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border)" }}
                      />
                      <button onClick={() => setFormImage(null)} style={ghostBtnStyle}>{t.removeImage}</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowImagePicker((v) => !v)} style={ghostBtnStyle}>{t.chooseImage}</button>
                  )}

                  {/* Image picker */}
                  {showImagePicker && !formImage && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: "8px", marginTop: "12px", maxHeight: "240px", overflowY: "auto", padding: "4px" }}>
                      {images.map((img) => (
                        <img
                          key={img.id}
                          src={`/linkedin-images/${img.filename}`}
                          alt={img.label ?? ""}
                          title={img.label ?? img.filename}
                          onClick={() => { setFormImage(img.filename); setShowImagePicker(false); }}
                          style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "8px", cursor: "pointer", border: "2px solid transparent", transition: "border-color 150ms" }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--coral)")}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button onClick={cancelForm} style={ghostBtnStyle}>{t.cancel}</button>
                  <button
                    onClick={saveTemplate}
                    disabled={formSaving || !formTitle.trim() || !formBody.trim()}
                    style={{ ...primaryBtnStyle, opacity: formSaving || !formTitle.trim() || !formBody.trim() ? 0.5 : 1 }}
                  >
                    {formSaving ? t.saving : t.saveTemplate}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Template list */}
          {templatesLoading ? (
            <div style={{ color: "var(--muted)", fontSize: "14px" }}>…</div>
          ) : templates.length === 0 && !showForm ? (
            <EmptyState icon="📝" title={t.noTemplates} subtitle={t.noTemplatesHint} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: showForm ? "0" : "20px" }}>
              {templates.map((tmpl) => (
                <div key={tmpl.id} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", marginBottom: "6px" }}>
                        {tmpl.title}
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {tmpl.body}
                      </div>
                      {tmpl.imageFilename && (
                        <img
                          src={`/linkedin-images/${tmpl.imageFilename}`}
                          alt=""
                          style={{ marginTop: "10px", width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border)" }}
                        />
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      <button onClick={() => openEditForm(tmpl)} style={ghostBtnStyle}>{t.editTemplate}</button>
                      <button
                        onClick={() => deleteTemplate(tmpl.id)}
                        disabled={deletingTemplate === tmpl.id}
                        style={{ ...ghostBtnStyle, color: "var(--error, #e53e3e)" }}
                      >
                        {t.deleteTemplate}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Lead Card ──────────────────────────────────────────────────────────────

function LeadCard({
  lead, t, lang, onDelete, deleting, formatDate,
}: {
  lead: Lead;
  t: typeof translations["en"]["leads"];
  lang: string;
  onDelete: () => void;
  deleting: boolean;
  formatDate: (s: string) => string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 22px" }}>
      <div style={{ display: "flex", gap: "14px" }}>
        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          {lead.profilePictureUrl ? (
            <img
              src={lead.profilePictureUrl}
              alt={lead.name}
              style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
            />
          ) : (
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--sidebar-active-bg, #2d3748)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700, color: "#fff" }}>
              {lead.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "16px", color: "var(--text-primary)" }}>{lead.name}</div>
              {(lead.headline || lead.company) && (
                <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "2px" }}>
                  {[lead.headline, lead.company].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" style={{ ...ghostBtnStyle, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <LinkedInMiniIcon />
                {t.viewProfile}
              </a>
              <button onClick={onDelete} disabled={deleting} style={{ ...ghostBtnStyle, color: "var(--error, #e53e3e)" }}>
                {t.deleteLead}
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "10px" }}>
            {lead.templateUsed && (
              <span style={{ fontSize: "12px", color: "var(--muted)", background: "var(--hover-bg, rgba(0,0,0,0.04))", borderRadius: "6px", padding: "3px 8px" }}>
                {t.usedTemplate}: <strong>{lead.templateUsed}</strong>
              </span>
            )}
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              {t.addedOn} {formatDate(lead.createdAt)}
            </span>
            {lead.postUrl && (
              <a href={lead.postUrl} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "var(--coral)", textDecoration: "none" }}>
                ↗ Post
              </a>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}


function LinkedInMiniIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────

const primaryBtnStyle: React.CSSProperties = {
  padding: "10px 20px",
  background: "var(--coral)",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
  transition: "opacity 150ms ease",
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "7px 13px",
  background: "transparent",
  color: "var(--muted)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
  transition: "background 130ms ease",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text-primary)",
  fontSize: "14px",
  fontFamily: "var(--font-body)",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const linkBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--coral)",
  cursor: "pointer",
  fontSize: "14px",
  fontFamily: "var(--font-body)",
  padding: 0,
};
