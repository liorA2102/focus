"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NewPositionModal from "@/components/positions/NewPositionModal";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

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
  jobMasterUrl: string | null;
  postedLinkedin: boolean;
  linkedinPostUrl: string | null;
  createdAt: string;
  stats: PositionStats;
};

const STATUS_PILL: Record<Position["status"], { color: string; border: string; dot: string }> = {
  open:      { color: "var(--possible)", border: "#F5D99A", dot: "var(--possible)" },
  filled:    { color: "var(--fog)", border: "var(--border)", dot: "var(--fog)" },
  cancelled: { color: "var(--fog)", border: "var(--border)", dot: "#D1D5DB" },
};

type Filter = "all" | "open" | "filled" | "cancelled" | "to_review";

export default function PositionsPage() {
  const { lang } = useLang();
  const t = translations[lang].positions;

  const [positions, setPositions] = useState<Position[]>([]);
  const [filter, setFilter]       = useState<Filter>("all");
  const [search, setSearch]       = useState("");
  const [loaded, setLoaded]       = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [syncMsg,      setSyncMsg]      = useState<string | null>(null);
  const [hoveredCard,  setHoveredCard]  = useState<number | null>(null);

  const handleJobMasterSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res  = await fetch("/api/admin/sync-jobmaster", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncMsg(`שגיאה: ${data.error}`);
      } else {
        setSyncMsg(`יובאו ${data.imported} משרות חדשות (${data.skipped} קיימות, ${data.found} נמצאו)`);
        if (data.imported > 0) fetchPositions();
      }
    } catch (err) {
      setSyncMsg(`שגיאה: ${String(err)}`);
    } finally {
      setSyncing(false);
    }
  };

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
    { label: t.metrics.open,      value: metrics.open,      accent: "var(--possible)", accentBg: "var(--possible-bg)", filter: "open"      as Filter },
    { label: t.metrics.filled,    value: metrics.filled,    accent: "#1A6B4A",       accentBg: "#E0F2EB",            filter: "filled"    as Filter },
    { label: t.metrics.cancelled, value: metrics.cancelled, accent: "var(--fog)",    accentBg: "var(--light-gray)",  filter: "cancelled" as Filter },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <PageHeader
        title={t.title}
        actions={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleJobMasterSync}
                disabled={syncing}
                className="btn btn-ghost"
                style={{ fontSize: "13px", padding: "9px 16px", cursor: syncing ? "default" : "pointer", opacity: syncing ? 0.6 : 1 }}
              >
                {syncing ? "מסנכרן…" : "↓ סנכרן JobMaster"}
              </button>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                {t.newPosition}
              </button>
            </div>
            {syncMsg && (
              <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: syncMsg.startsWith("שגיאה") ? "var(--coral)" : "var(--strong)" }}>
                {syncMsg}
              </span>
            )}
          </div>
        }
      />

      {/* ── Pipeline health dashboard ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
        {CARDS.map((card, i) => {
          const isActive = card.filter !== null && filter === card.filter;
          const isHovered = hoveredCard === i;
          const isClickable = card.filter !== null;
          const isLifted = isActive || isHovered;
          return (
            <div
              key={card.label}
              className="stagger-item"
              onClick={() => card.filter && setFilter(isActive ? "all" : card.filter)}
              onMouseEnter={() => isClickable && setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: isActive ? card.accentBg : isHovered ? card.accentBg : "var(--surface)",
                border: `1.5px solid ${isActive || isHovered ? card.accent : "var(--border)"}`,
                borderRadius: "12px",
                padding: "18px 16px 16px",
                cursor: isClickable ? "pointer" : "default",
                transition: "all 180ms var(--ease-out)",
                transform: isLifted ? "translateY(-3px)" : "translateY(0)",
                boxShadow: isLifted ? `0 8px 24px rgba(0,0,0,0.10)` : "none",
                position: "relative",
                overflow: "hidden",
                animationDelay: `${i * 40}ms`,
              }}
            >
              {(isActive || isHovered) && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: card.accent, borderRadius: "12px 12px 0 0" }} />
              )}
              <p style={{
                fontFamily: "var(--font-body)",
                fontSize: "11px", fontWeight: "600",
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: isActive || isHovered ? card.accent : "var(--text-muted)",
                marginBottom: "10px",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                transition: "color 180ms var(--ease-out)",
              }}>
                {card.label}
                {!isClickable && (
                  <span style={{ marginLeft: "4px", fontSize: "9px", opacity: 0.5 }}>●</span>
                )}
              </p>
              <p style={{
                fontFamily: "var(--font-body)",
                fontSize: "32px", fontWeight: "700", lineHeight: 1,
                color: isActive || isHovered ? card.accent : loaded ? (card.value > 0 ? "var(--navy)" : "var(--text-muted)") : "var(--border)",
                letterSpacing: "-1px",
                transition: "color 180ms var(--ease-out)",
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
            fontFamily: "var(--font-body)",
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
        <EmptyState
          icon="📋"
          title={t.emptyTitle}
          subtitle={t.emptySubtitle}
          action={
            <button
              className="btn btn-primary"
              style={{ fontSize: "15px", padding: "12px 28px" }}
              onClick={() => setShowModal(true)}
            >
              {t.emptyCta}
            </button>
          }
        />
      ) : loaded && filtered.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: "10px" }}>
          <div style={{ fontSize: "32px", opacity: 0.2 }}>◫</div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", fontWeight: "600", color: "var(--text-secondary)" }}>
            {q ? t.noSearchResults : t.filteredEmpty}
          </p>
          <button
            onClick={() => { setFilter("all"); setSearch(""); }}
            style={{
              marginTop: "4px", padding: "7px 18px", borderRadius: "20px",
              border: "1.5px solid var(--border)", background: "transparent",
              color: "var(--text-secondary)", fontSize: "13px", fontWeight: "500",
              cursor: "pointer", fontFamily: "var(--font-body)",
              transition: "all 150ms var(--ease-out)",
            }}
          >
            {q ? t.clearSearch : t.clearFilter}
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
          {filtered.map((p, i) => {
            const pill = STATUS_PILL[p.status] ?? STATUS_PILL.open;
            const statusLabel = t.statusLabel[p.status];
            const newCount = p.stats.open;
            const chipLabel = newCount === 1 ? t.newCandidate : t.newCandidates;
            return (
              <Link
                key={p.id}
                href={`/positions/${p.id}`}
                className="pos-card stagger-item"
                style={{ animationDelay: `${i * 35}ms` }}
              >
                {/* Card body */}
                <div style={{ padding: "18px 20px 16px", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Top: client + title / status pill */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.client}
                      </div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
                        {p.title}
                      </div>
                    </div>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "5px",
                      fontSize: "10.5px", fontWeight: 600, padding: "3px 9px",
                      borderRadius: "20px", whiteSpace: "nowrap", flexShrink: 0,
                      border: `1.5px solid ${pill.border}`,
                      color: pill.color,
                      background: "var(--surface)",
                      fontFamily: "var(--font-body)",
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: pill.dot, flexShrink: 0, display: "inline-block" }} />
                      {statusLabel}
                    </span>
                  </div>

                  {/* Candidate chip */}
                  {newCount > 0 && (
                    <div className="cand-chip">
                      <span className="cand-chip-n">{newCount}</span>
                      <span className="cand-chip-lbl">{chipLabel}</span>
                    </div>
                  )}
                </div>

                {/* Card footer: publishing badges */}
                <div style={{ borderTop: "1px solid var(--border)", padding: "8px 20px 10px", display: "flex", justifyContent: "flex-end", gap: "5px" }}>
                  {p.postedJobMaster ? (
                    p.jobMasterUrl ? (
                      <span className="pub-badge jm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(p.jobMasterUrl!, "_blank", "noopener,noreferrer"); }} style={{ cursor: "pointer" }}>JM</span>
                    ) : (
                      <span className="pub-badge jm">JM</span>
                    )
                  ) : (
                    <span className="pub-badge inactive">JM</span>
                  )}
                  {p.postedLinkedin ? (
                    p.linkedinPostUrl ? (
                      <span className="pub-badge li" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(p.linkedinPostUrl!, "_blank", "noopener,noreferrer"); }} style={{ cursor: "pointer" }}>in</span>
                    ) : (
                      <span className="pub-badge li">in</span>
                    )
                  ) : (
                    <span className="pub-badge inactive">in</span>
                  )}
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

