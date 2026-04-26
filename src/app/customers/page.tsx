"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";
import AddClientModal from "@/components/customers/AddClientModal";

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

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function CustomersPage() {
  const { lang } = useLang();
  const t = translations[lang].customers;

  const [clients, setClients]     = useState<Client[]>([]);
  const [filter, setFilter]       = useState<"all" | "active">("all");
  const [loaded, setLoaded]       = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) setClients(await res.json());
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchClients();
    // Open modal if navigated here with ?new=true
    const p = new URLSearchParams(window.location.search);
    if (p.get("new") === "true") setShowModal(true);
  }, []);

  const filtered = filter === "active"
    ? clients.filter((c) => c.openPositions > 0)
    : clients;

  const metrics = {
    total:    clients.length,
    active:   clients.filter((c) => c.openPositions > 0).length,
    contacts: clients.reduce((sum, c) => sum + c.contactCount, 0),
  };

  const CARDS = [
    { label: t.totalClients,  value: metrics.total,    accent: "var(--navy)",   accentBg: "var(--bg)",          filter: null          },
    { label: t.active,        value: metrics.active,   accent: "var(--strong)", accentBg: "var(--strong-bg)",   filter: "active" as const },
    { label: t.totalContacts, value: metrics.contacts, accent: "var(--steel)",  accentBg: "var(--steel-light)", filter: null          },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px" }}>
        <div>
          <div className="accent-rule" style={{ marginBottom: "12px" }} />
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "32px", fontWeight: "700", letterSpacing: "-0.5px", color: "var(--navy)", lineHeight: 1 }}>
            {t.title}
          </h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          {t.addClient}
        </button>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "28px" }}>
        {CARDS.map((card, i) => {
          const isActive = card.filter !== null && filter === card.filter;
          const isClickable = card.filter !== null;
          return (
            <div
              key={card.label}
              className="stagger-item"
              onClick={() => isClickable && setFilter(isActive ? "all" : card.filter!)}
              style={{
                background: isActive ? card.accentBg : "var(--surface)",
                border: `1.5px solid ${isActive ? card.accent : "var(--border)"}`,
                borderRadius: "12px",
                padding: "18px 16px 16px",
                cursor: isClickable ? "pointer" : "default",
                transition: "all 180ms var(--ease-out)",
                transform: isActive ? "translateY(-2px)" : "translateY(0)",
                boxShadow: isActive ? "0 6px 20px rgba(0,0,0,0.09)" : "none",
                position: "relative",
                overflow: "hidden",
                animationDelay: `${i * 40}ms`,
              }}
            >
              {isActive && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: card.accent, borderRadius: "12px 12px 0 0" }} />
              )}
              <p style={{
                fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: "600",
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: isActive ? card.accent : "var(--text-muted)", marginBottom: "10px",
              }}>
                {card.label}
              </p>
              <p style={{
                fontFamily: "'Poppins', sans-serif", fontSize: "32px", fontWeight: "700",
                lineHeight: 1, letterSpacing: "-1px",
                color: isActive ? card.accent : loaded ? (card.value > 0 ? "var(--navy)" : "var(--text-muted)") : "var(--border)",
              }}>
                {loaded ? card.value : "—"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Client grid */}
      {loaded && clients.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "20px", fontWeight: "600", color: "var(--navy)", marginBottom: "8px" }}>
            {t.emptyTitle}
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "15px", color: "var(--text-muted)", marginBottom: "24px" }}>
            {t.emptySubtitle}
          </p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>{t.emptyCta}</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {filtered.map((c, i) => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className="stagger-item"
              style={{
                textDecoration: "none",
                background: "var(--surface)",
                border: "1.5px solid var(--border)",
                borderRadius: "14px",
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                transition: "box-shadow 180ms var(--ease-out), transform 180ms var(--ease-out)",
                animationDelay: `${i * 35}ms`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 6px 24px rgba(0,0,0,0.10)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              }}
            >
              {/* Logo + name row */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                {c.logoPath ? (
                  <img
                    src={c.logoPath}
                    alt={c.name}
                    style={{ width: "52px", height: "52px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid var(--border)" }}
                  />
                ) : (
                  <div style={{
                    width: "52px", height: "52px", borderRadius: "50%", flexShrink: 0,
                    background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Poppins', sans-serif", fontSize: "18px", fontWeight: "700", color: "#fff",
                  }}>
                    {initials(c.name)}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: "700", color: "var(--navy)", lineHeight: 1.2, marginBottom: "4px" }}>
                    {c.name}
                  </p>
                  {c.industry && (
                    <span style={{
                      fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: "600",
                      color: "var(--text-muted)", background: "var(--bg)",
                      border: "1px solid var(--border)", borderRadius: "6px", padding: "2px 8px",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {c.industry}
                    </span>
                  )}
                </div>
              </div>

              {/* Tagline */}
              {c.tagline && (
                <p style={{
                  fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "var(--text-secondary)",
                  lineHeight: 1.4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", margin: 0,
                }}>
                  {c.tagline}
                </p>
              )}

              {/* Stats */}
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                {c.openPositions} {t.openPositions.toLowerCase()} · {c.contactCount} {t.contacts.toLowerCase()}
              </p>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <AddClientModal
          onClose={() => setShowModal(false)}
          onCreated={(newClient) => {
            setClients((prev) => [newClient, ...prev]);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
