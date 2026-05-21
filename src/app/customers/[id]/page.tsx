"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";
import NewPositionModal from "@/components/positions/NewPositionModal";

type Contact = {
  id:        number;
  clientId:  number;
  name:      string;
  title:     string | null;
  email:     string | null;
  phone:     string | null;
  createdAt: string;
};

type PositionRef = {
  id:             number;
  title:          string;
  status:         "open" | "filled" | "cancelled";
  candidateCount: number;
};

type Client = {
  id:          number;
  name:        string;
  tagline:     string | null;
  industry:    string | null;
  website:     string | null;
  linkedinUrl: string | null;
  logoPath:    string | null;
  createdAt:   string;
  contacts:    Contact[];
  positions:   PositionRef[];
};

const STATUS_COLOR: Record<PositionRef["status"], { color: string; bg: string }> = {
  open:      { color: "var(--strong)", bg: "var(--strong-bg)"  },
  filled:    { color: "#1A6B4A",       bg: "#E0F2EB"           },
  cancelled: { color: "var(--fog)",    bg: "var(--light-gray)" },
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const t = translations[lang].customers;

  const [client, setClient]   = useState<Client | null>(null);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [editForm, setEditForm] = useState({ name: "", tagline: "", industry: "", website: "", linkedinUrl: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const [showContactModal, setShowContactModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", title: "", email: "", phone: "" });
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then(setClient);
  }, [id]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const deleteClient = async () => {
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    router.push("/customers");
  };

  function startEdit() {
    if (!client) return;
    setEditForm({
      name:        client.name,
      tagline:     client.tagline     ?? "",
      industry:    client.industry    ?? "",
      website:     client.website     ?? "",
      linkedinUrl: client.linkedinUrl ?? "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    setSavingEdit(true);
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setClient((c) => c ? { ...c, ...updated } : c);
      setEditing(false);
    }
    setSavingEdit(false);
  }

  async function deleteContact(contactId: number) {
    if (!window.confirm(t.confirmDelete)) return;
    const res = await fetch(`/api/clients/${id}/contacts/${contactId}`, { method: "DELETE" });
    if (res.ok) setClient((c) => c ? { ...c, contacts: c.contacts.filter((ct) => ct.id !== contactId) } : c);
  }

  async function saveContact() {
    if (!contactForm.name.trim()) return;
    setSavingContact(true);
    const res = await fetch(`/api/clients/${id}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactForm),
    });
    if (res.ok) {
      const contact = await res.json();
      setClient((c) => c ? { ...c, contacts: [...c.contacts, contact] } : c);
      setContactForm({ name: "", title: "", email: "", phone: "" });
      setShowContactModal(false);
    }
    setSavingContact(false);
  }

  if (!client) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center", fontFamily: "var(--font-body)", color: "var(--text-muted)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "860px" }}>
      {/* Back */}
      <Link
        href="/customers"
        style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)", textDecoration: "none", display: "inline-block", marginBottom: "28px" }}
      >
        {t.back}
      </Link>

      {/* Header card */}
      <div style={{
        background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "16px",
        padding: "28px 32px", marginBottom: "24px",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "20px" }}>
          {/* Logo */}
          {client.logoPath ? (
            <img
              src={client.logoPath}
              alt={client.name}
              style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid var(--border)" }}
            />
          ) : (
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%", flexShrink: 0,
              background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-body)", fontSize: "26px", fontWeight: "700", color: "#fff",
            }}>
              {initials(client.name)}
            </div>
          )}

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {([
                  { key: "name",        label: t.companyName },
                  { key: "tagline",     label: t.tagline     },
                  { key: "industry",    label: t.industry    },
                  { key: "website",     label: t.website     },
                  { key: "linkedinUrl", label: t.linkedin    },
                ] as const).map(({ key, label }) => (
                  <div key={key}>
                    <label style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                      {label}
                    </label>
                    <input
                      className="input"
                      value={editForm[key]}
                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button className="btn btn-primary" onClick={saveEdit} disabled={savingEdit}>
                    {savingEdit ? t.saving : t.save}
                  </button>
                  <button className="btn" onClick={() => setEditing(false)}>{t.cancel}</button>
                </div>
              </div>
            ) : (
              <>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "30px", fontWeight: "400", color: "var(--navy)", margin: "0 0 6px" }}>
                  {client.name}
                </h1>
                {client.tagline && (
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-muted)", margin: "0 0 14px" }}>
                    {client.tagline}
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                  {client.industry && (
                    <span style={{
                      fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "600",
                      color: "var(--text-muted)", background: "var(--bg)",
                      border: "1px solid var(--border)", borderRadius: "6px", padding: "3px 10px",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {client.industry}
                    </span>
                  )}
                  {client.website && (
                    <a href={client.website} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--steel)", textDecoration: "none" }}>
                      {t.website} ↗
                    </a>
                  )}
                  {client.linkedinUrl && (
                    <a href={client.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--steel)", textDecoration: "none" }}>
                      LinkedIn ↗
                    </a>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Edit + 3-dot menu */}
          {!editing && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <button className="btn" onClick={startEdit}>{t.edit}</button>
              <div ref={menuRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  style={{
                    background: "none", border: "1px solid transparent", borderRadius: "6px",
                    padding: "4px 8px", cursor: "pointer", color: "var(--text-muted)",
                    fontSize: "18px", lineHeight: 1, display: "flex", alignItems: "center",
                    transition: "all 130ms ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--bg)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "none";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                  }}
                  title="More options"
                >
                  ⋮
                </button>
                {menuOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", insetInlineEnd: 0,
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    minWidth: "160px", zIndex: 50, overflow: "hidden", whiteSpace: "nowrap",
                  }}>
                    <button
                      onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                      style={{
                        width: "100%", padding: "11px 16px", background: "none", border: "none",
                        cursor: "pointer", textAlign: "start",
                        fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: "500",
                        color: "var(--coral)",
                        display: "flex", alignItems: "center", gap: "9px",
                        transition: "background 120ms ease",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--coral-light)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                    >
                      🗑 {t.removeClientOption}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Open Positions */}
      <div style={{
        background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "16px",
        padding: "24px 28px", marginBottom: "24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", margin: 0 }}>
            {t.openPositions}
          </p>
          <button className="btn btn-primary" onClick={() => setShowPositionModal(true)} style={{ fontSize: "13px", padding: "6px 14px" }}>
            {translations[lang].modal.newPosition}
          </button>
        </div>

        {client.positions.length === 0 ? (
          <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-muted)", margin: 0 }}>
            {t.noPositions}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {client.positions.map((pos) => {
              const sc = STATUS_COLOR[pos.status] ?? STATUS_COLOR.open;
              return (
                <Link
                  key={pos.id}
                  href={`/positions/${pos.id}`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 14px", borderRadius: "10px",
                    textDecoration: "none", transition: "background 150ms",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{
                      fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: "700",
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      color: sc.color, background: sc.bg,
                      padding: "3px 8px", borderRadius: "6px",
                    }}>
                      {translations[lang].positions.statusLabel[pos.status]}
                    </span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: "500", color: "var(--text-primary)" }}>
                      {pos.title}
                    </span>
                  </div>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>
                    {t.candidateCount(pos.candidateCount)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Contacts */}
      <div style={{
        background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "16px",
        padding: "24px 28px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", margin: 0 }}>
            {t.contacts}
          </p>
          <button className="btn btn-primary" onClick={() => setShowContactModal(true)} style={{ fontSize: "13px", padding: "6px 14px" }}>
            {t.addContact}
          </button>
        </div>

        {client.contacts.length === 0 ? (
          <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-muted)" }}>
            {t.noContacts}
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
            {client.contacts.map((contact) => (
              <div
                key={contact.id}
                style={{
                  background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: "12px",
                  padding: "16px 18px", display: "flex", flexDirection: "column", gap: "8px", position: "relative",
                }}
              >
                <button
                  onClick={() => deleteContact(contact.id)}
                  title={t.deleteContact}
                  style={{
                    position: "absolute", top: "12px", right: "12px",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "14px", color: "var(--text-muted)", lineHeight: 1,
                  }}
                >
                  ✕
                </button>
                <div>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: "700", color: "var(--navy)", margin: "0 0 2px" }}>
                    {contact.name}
                  </p>
                  {contact.title && (
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                      {contact.title}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--steel)", textDecoration: "none" }}>
                      ✉ {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--steel)", textDecoration: "none" }}>
                      📞 {contact.phone}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showContactModal && (
        <div
          onClick={() => setShowContactModal(false)}
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
              width: "100%", maxWidth: "440px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 28px 20px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontFamily: "var(--font-body)", fontSize: "20px", fontWeight: "700", color: "var(--navy)", margin: 0 }}>
                {t.addContactTitle}
              </h3>
              <button onClick={() => setShowContactModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "var(--text-muted)", lineHeight: 1 }}>
                ✕
              </button>
            </div>

            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {([
                { key: "name",  label: t.contactName,  required: true  },
                { key: "title", label: t.contactTitle,  required: false },
                { key: "email", label: t.contactEmail,  required: false },
                { key: "phone", label: t.contactPhone,  required: false },
              ] as const).map(({ key, label, required }) => (
                <div key={key}>
                  <label style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", display: "block", marginBottom: "6px" }}>
                    {label}{required && " *"}
                  </label>
                  <input
                    className="input"
                    type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
                    value={contactForm[key]}
                    onChange={(e) => setContactForm((f) => ({ ...f, [key]: e.target.value }))}
                    autoFocus={key === "name"}
                  />
                </div>
              ))}
            </div>

            <div style={{ padding: "16px 28px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn" onClick={() => setShowContactModal(false)}>{t.cancel}</button>
              <button
                className="btn btn-primary"
                onClick={saveContact}
                disabled={!contactForm.name.trim() || savingContact}
              >
                {savingContact ? t.saving : t.saveContact}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)", borderRadius: "14px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
              padding: "32px 36px", maxWidth: "420px", width: "100%",
            }}
          >
            <p style={{
              fontFamily: "var(--font-body)", fontSize: "20px", fontWeight: "600",
              color: "var(--navy)", marginBottom: "10px",
            }}>
              {t.removeClientTitle}
            </p>
            <p style={{
              fontFamily: "var(--font-body)", fontSize: "15px", lineHeight: "1.6",
              color: "var(--text-secondary)", marginBottom: "28px",
            }}>
              {t.removeClientBody(client.name)}
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" style={{ fontSize: "14px", padding: "9px 20px" }} onClick={() => setConfirmDelete(false)}>
                {t.cancel}
              </button>
              <button
                style={{
                  padding: "9px 20px", borderRadius: "8px", border: "none",
                  background: "var(--coral)", color: "#fff",
                  fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: "600",
                  cursor: "pointer", transition: "opacity 140ms ease",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                onClick={deleteClient}
              >
                {t.removeClientConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPositionModal && (
        <NewPositionModal
          preselectedClient={{ id: client.id, name: client.name }}
          onClose={() => setShowPositionModal(false)}
          onCreated={() => {
            setShowPositionModal(false);
            // Refresh positions list
            fetch(`/api/clients/${id}`)
              .then((r) => r.json())
              .then(setClient);
          }}
        />
      )}
    </div>
  );
}
