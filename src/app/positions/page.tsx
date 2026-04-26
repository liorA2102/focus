"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NewPositionModal from "@/components/positions/NewPositionModal";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";

type PositionStats = {
  total: number;
  open: number;
  relevant: number;
  clientReview: number;
  interview: number;
  hired: number;
  rejected: number;
};

type Position = {
  id: number;
  title: string;
  client: string;
  location: string | null;
  salaryRange: string | null;
  status: "open" | "filled" | "cancelled";
  postedJobMaster: boolean;
  postedLinkedin: boolean;
  createdAt: string;
  stats: PositionStats;
};

const POS_STATUS: Record<Position["status"], { label: string; color: string; bg: string }> = {
  open:        { label: "Open",      color: "var(--strong)",   bg: "var(--strong-bg)"   },
  filled:      { label: "Filled",    color: "#1A6B4A",         bg: "#E0F2EB"            },
  cancelled:   { label: "Cancelled", color: "var(--fog)",      bg: "var(--light-gray)"  },
};

type Filter = "all" | "open" | "filled" | "cancelled" | "to_review";

export default function PositionsPage() {
  const { lang } = useLang();
  const t = translations[lang].positions;

  const [positions, setPositions] = useState<Position[]>([]);
  const [filter, setFilter]       = useState<Filter>("all");
  const [search, setSearch]       = useState("");
  const [loaded, setLoaded]       = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchPositions = async () => {
    try {
      const res = await fetch("/api/positions");
      if (res.ok) setPositions(await res.json());
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => { fetchPositions(); }, []);

  const q = search.trim().toLowerCase();
  const filtered = positions
    .filter((p) => {
      if (filter === "all") return true;
      if (filter === "to_review") return p.stats.open > 0;
      return p.status === filter;
    })
    .filter((p) => !q || p.title.toLowerCase().includes(q) || p.client.toLowerCase().includes(q));

  const metrics = {
    open:      positions.filter((p) => p.status === "open").length,
    filled:    positions.filter((p) => p.status === "filled").length,
    cancelled: positions.filter((p) => p.status === "cancelled").length,
    toReview:  positions.reduce((sum, p) => sum + p.stats.open, 0),
  };

  const CARDS = [
    { label: t.metrics.toReview,  value: metrics.toReview,  accent: "var(--coral)",  accentBg: "var(--coral-light)", filter: "to_review" as Filter },
    { label: t.metrics.open,      value: metrics.open,      accent: "var(--strong)", accentBg: "var(--strong-bg)",   filter: "open"      as Filter },
    { label: t.metrics.filled,    value: metrics.filled,    accent: "#1A6B4A",       accentBg: "#E0F2EB",            filter: "filled"    as Filter },
    { label: t.metrics.cancelled, value: metrics.cancelled, accent: "var(--fog)",    accentBg: "var(--light-gray)",  filter: "cancelled" as Filter },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px" }}>
        <div>
          <div className="accent-rule" style={{ marginBottom: "12px" }} />
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "32px", fontWeight: "700", letterSpacing: "-0.5px", color: "var(--navy)", lineHeight: 1 }}>
            {t.title}
          </h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          {t.newPosition}
        </button>
      </div>

      {/* ── Pipeline health dashboard ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
        {CARDS.map((card, i) => {
          const isActive = card.filter !== null && filter === card.filter;
          const isClickable = card.filter !== null;
          return (
            <div
              key={card.label}
              className="stagger-item"
              onClick={() => card.filter && setFilter(isActive ? "all" : card.filter)}
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
                fontFamily: "'Inter', sans-serif",
                fontSize: "11px", fontWeight: "600",
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: isActive ? card.accent : "var(--text-muted)",
                marginBottom: "10px",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {card.label}
                {!isClickable && (
                  <span style={{ marginLeft: "4px", fontSize: "9px", opacity: 0.5 }}>●</span>
                )}
              </p>
              <p style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "32px", fontWeight: "700", lineHeight: 1,
                color: isActive ? card.accent : loaded ? (card.value > 0 ? "var(--navy)" : "var(--text-muted)") : "var(--border)",
                letterSpacing: "-1px",
              }}>
                {loaded ? card.value : "—"}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Search bar ── */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <span style={{
          position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
          fontSize: "16px", pointerEvents: "none", opacity: 0.45,
        }}>🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "11px 40px 11px 40px",
            fontFamily: "'Inter', sans-serif",
            fontSize: "15px",
            color: "var(--text-primary)",
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: "12px",
            outline: "none",
            transition: "border-color 150ms var(--ease-out)",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--navy)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{
              position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              fontSize: "14px", color: "var(--text-muted)", padding: "4px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Cards / Empty state ── */}
      {loaded && positions.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "80px 24px",
          background: "var(--surface)",
          border: "1.5px dashed var(--border)",
          borderRadius: "16px",
          gap: "12px",
        }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "14px",
            background: "var(--coral-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "26px",
          }}>
            📋
          </div>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "20px", fontWeight: "700", color: "var(--navy)", letterSpacing: "-0.3px", marginTop: "4px" }}>
            {t.emptyTitle}
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "var(--text-muted)", maxWidth: "280px", textAlign: "center", lineHeight: "1.65" }}>
            {t.emptySubtitle}
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: "8px", fontSize: "15px", padding: "12px 28px" }}
            onClick={() => setShowModal(true)}
          >
            {t.emptyCta}
          </button>
        </div>
      ) : loaded && filtered.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: "10px" }}>
          <div style={{ fontSize: "32px", opacity: 0.2 }}>◫</div>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: "600", color: "var(--text-secondary)" }}>
            {q ? t.noSearchResults : t.filteredEmpty}
          </p>
          <button
            onClick={() => { setFilter("all"); setSearch(""); }}
            style={{
              marginTop: "4px", padding: "7px 18px", borderRadius: "20px",
              border: "1.5px solid var(--border)", background: "transparent",
              color: "var(--text-secondary)", fontSize: "13px", fontWeight: "500",
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              transition: "all 150ms var(--ease-out)",
            }}
          >
            {q ? t.clearSearch : t.clearFilter}
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
          {filtered.map((p, i) => {
            const sColors = POS_STATUS[p.status] ?? POS_STATUS["open"];
            const s = { ...sColors, label: t.statusLabel[p.status] ?? sColors.label };
            const hasActivity = p.stats.clientReview > 0 || p.stats.interview > 0 || p.stats.hired > 0;
            const candidateCount = p.stats.open + (p.stats.relevant ?? 0);
            return (
              <Link key={p.id} href={`/positions/${p.id}`} style={{ textDecoration: "none" }}>
                <div
                  className="card stagger-item"
                  style={{ padding: 0, cursor: "pointer", animationDelay: `${i * 35}ms`, overflow: "hidden" }}
                >
                  {p.status === "open" && (
                    <div style={{ height: "3px", background: "var(--coral)", borderRadius: "12px 12px 0 0" }} />
                  )}
                  <div style={{ padding: "20px 22px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="badge" style={{ color: s.color, background: s.bg }}>{s.label}</span>
                        {candidateCount > 0 && (
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "var(--text-muted)", fontWeight: "600", background: "var(--light-gray)", borderRadius: "20px", padding: "2px 8px" }}>
                            {candidateCount} {t.matched}
                          </span>
                        )}
                      </div>
                      {p.stats.total === 0 && p.status === "open" && (
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "var(--coral)", fontWeight: "600" }}>
                          {t.noCandidates}
                        </span>
                      )}
                    </div>

                    <div style={{ marginBottom: "3px" }}>
                      <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", lineHeight: 1.3, margin: 0 }}>
                        {p.title}
                      </h3>
                    </div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "14px" }}>
                      {p.client}
                    </p>

                    <div style={{ display: "flex", gap: "12px", marginBottom: hasActivity ? "14px" : 0 }}>
                      {p.location && (
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--text-muted)" }}>📍 {p.location}</span>
                      )}
                      {p.salaryRange && (
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--text-muted)" }}>{p.salaryRange}</span>
                      )}
                    </div>

                    {/* Mini pipeline bar */}
                    {hasActivity && (
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          {p.stats.clientReview > 0 && <PipelineStat label={t.pipeline.clientReview} count={p.stats.clientReview} color="var(--possible)" />}
                          {p.stats.interview > 0 && <PipelineStat label={t.pipeline.interview} count={p.stats.interview} color="var(--steel)" />}
                          {p.stats.hired > 0 && <PipelineStat label={t.pipeline.hired} count={p.stats.hired} color="#1A6B4A" />}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showModal && (
        <NewPositionModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchPositions(); }}
        />
      )}
    </div>
  );
}

function PipelineStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color, display: "flex", alignItems: "center", gap: "4px" }}>
      <span style={{ fontWeight: "700" }}>{count}</span>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
    </span>
  );
}
