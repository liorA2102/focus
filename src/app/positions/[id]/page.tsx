"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";

type Candidate = {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  currentTitle: string | null;
  yearsExperience: number | null;
  location: string | null;
  summary: string | null;
  summaryHe: string | null;
  skills: string | null;
  source: "jobmaster" | "linkedin" | "manual";
};

type CandidateStatus = "open" | "client_review" | "interview" | "hired" | "rejected" | "relevant" | "not_relevant";

type Match = {
  id: number;
  strength: "strong" | "possible" | "weak";
  explanation: string | null;
  explanationHe: string | null;
  candidateStatus: CandidateStatus;
  candidate: Candidate;
};

type Position = {
  id: number;
  title: string;
  client: string;
  location: string | null;
  salaryRange: string | null;
  description: string | null;
  requirements: string | null;
  status: "open" | "filled" | "cancelled";
  postedJobMaster: boolean;
  postedLinkedin: boolean;
  jobMasterUrl: string | null;
  jobMasterPostedAt: string | null;
  createdAt: string;
  matches: Match[];
};

const STATUS_VALUES = ["open", "filled", "cancelled"] as const;

const STATUS_COLOR: Record<Position["status"], { color: string; bg: string }> = {
  open:      { color: "var(--strong)", bg: "var(--strong-bg)"  },
  filled:    { color: "#1A6B4A",       bg: "#E0F2EB"           },
  cancelled: { color: "var(--fog)",    bg: "var(--light-gray)" },
};

const CANDIDATE_STATUS_CFG: Record<CandidateStatus, { label: string; color: string; bg: string }> = {
  open:          { label: "In Pool",        color: "var(--text-muted)", bg: "var(--bg)"          },
  client_review: { label: "Client Review",  color: "var(--possible)",   bg: "var(--possible-bg)" },
  interview:     { label: "Interview",      color: "var(--steel)",      bg: "var(--steel-light)" },
  hired:         { label: "Hired",          color: "#1A6B4A",           bg: "#E0F2EB"            },
  rejected:      { label: "Rejected",       color: "var(--fog)",        bg: "var(--light-gray)"  },
  relevant:      { label: "Relevant",       color: "#1A6B4A",           bg: "#E0F2EB"            },
  not_relevant:  { label: "Not Relevant",   color: "var(--coral)",      bg: "var(--coral-light)" },
};

const STRENGTH = {
  strong:   { label: "Strong Match",   color: "var(--strong)",   bg: "var(--strong-bg)"   },
  possible: { label: "Possible Match", color: "var(--possible)", bg: "var(--possible-bg)" },
  weak:     { label: "Weak Match",     color: "var(--fog)",      bg: "var(--light-gray)"  },
};

export default function PositionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { lang } = useLang();
  const t = translations[lang].detail;
  const [position, setPosition] = useState<Position | null>(null);
  const [updatingMatch, setUpdatingMatch] = useState<number | null>(null);
  const [showNotRelevant, setShowNotRelevant] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [queueState, setQueueState] = useState<{
    queue: Match[];
    idx: number;
    slideOut: "left" | "right" | null;
  } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const fetchPosition = async () => {
    const res = await fetch(`/api/positions/${id}`);
    if (res.ok) setPosition(await res.json());
  };

  useEffect(() => { fetchPosition(); }, [id]);

  // Close menu on outside click
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

  const deletePosition = async () => {
    await fetch(`/api/positions/${id}`, { method: "DELETE" });
    router.push("/positions");
  };

  const updateField = async (field: string, value: string) => {
    await fetch(`/api/positions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    fetchPosition();
  };

  const publishJobMaster = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/positions/${id}/publish-jobmaster`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setPublishError(data.error ?? "Publishing failed");
      } else {
        await fetchPosition();
      }
    } catch {
      setPublishError("Network error — please try again");
    } finally {
      setPublishing(false);
    }
  };

  const updateStatus = async (status: string) => {
    await fetch(`/api/positions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchPosition();
  };

  const updateMatch = async (matchId: number, updates: Partial<Match>) => {
    setUpdatingMatch(matchId);
    await fetch(`/api/positions/${id}/matches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, ...updates }),
    });
    await fetchPosition();
    setUpdatingMatch(null);
  };

  if (!position) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh", color: "var(--text-muted)", fontSize: "16px" }}>
        Loading…
      </div>
    );
  }

  const pendingMatches      = position.matches.filter((m) => m.strength !== "weak" && m.candidateStatus === "open");
  const reviewedRelevant    = position.matches.filter((m) => m.strength !== "weak" && m.candidateStatus === "relevant");
  const reviewedNotRelevant = position.matches.filter((m) => m.strength !== "weak" && m.candidateStatus === "not_relevant");
  const pipelineMatches     = position.matches.filter((m) => m.strength !== "weak" && ["client_review", "interview", "hired"].includes(m.candidateStatus));
  const hasReviewed         = reviewedRelevant.length > 0 || reviewedNotRelevant.length > 0 || pipelineMatches.length > 0;
  const matchCount          = pendingMatches.length + reviewedRelevant.length + reviewedNotRelevant.length + pipelineMatches.length;
  const sc = STATUS_COLOR[position.status];
  const postedDays = Math.floor((Date.now() - new Date(position.createdAt).getTime()) / 86400000);
  const createdLabel = postedDays === 0 ? t.today : postedDays === 1 ? t.yesterday : t.daysAgo(postedDays);

  const openPendingQueue = (startIdx: number) => {
    setQueueState({ queue: [...pendingMatches], idx: startIdx, slideOut: null });
  };

  const handleQueueReview = (status: "relevant" | "not_relevant") => {
    setQueueState(prev => {
      if (!prev) return null;
      const match = prev.queue[prev.idx];
      updateMatch(match.id, { candidateStatus: status });
      return { ...prev, slideOut: status === "relevant" ? "right" : "left" };
    });
    setTimeout(() => {
      setQueueState(prev => {
        if (!prev) return null;
        const next = prev.idx + 1;
        return next < prev.queue.length ? { ...prev, idx: next, slideOut: null } : null;
      });
    }, 360);
  };

  return (
    <div style={{ maxWidth: "860px" }}>

      {/* ── Back ── */}
      <Link href="/positions" style={{ direction: "ltr" as const,
        display: "inline-flex", alignItems: "center", gap: "6px",
        color: "var(--text-muted)", fontSize: "14px", textDecoration: "none",
        marginBottom: "20px", fontFamily: "'Inter', sans-serif",
        transition: "color 140ms ease",
      }}>
        {t.back}
      </Link>

      {/* ── LinkedIn-style Job Header Card ── */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "28px 32px 24px",
        marginBottom: "12px",
      }}>
        {/* Title + subtitle */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
            <h2 style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "26px", fontWeight: "600",
              color: "var(--navy)", letterSpacing: "-0.3px",
              marginBottom: "6px",
            }}>
              {position.title}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, paddingTop: "4px" }}>
              {/* 3-dot menu */}
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
                        fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: "500",
                        color: "var(--coral)",
                        display: "flex", alignItems: "center", gap: "9px",
                        transition: "background 120ms ease",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--coral-light)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                    >
                      🗑 {t.removePositionOption}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", color: "var(--text-secondary)" }}>
            {position.client}
          </p>
        </div>

        {/* Details grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)",
          borderRadius: "8px", overflow: "hidden", marginBottom: "20px",
        }}>
          <EditableDetailCell label={t.location} value={position.location ?? ""} placeholder={t.addLocation}  onSave={(v) => updateField("location", v)}    allow="text" />
          <EditableDetailCell label={t.salary}   value={position.salaryRange ?? ""} placeholder={t.addSalary} onSave={(v) => updateField("salaryRange", v)} allow="salary" />
          <DetailCell label={t.created} value={createdLabel} last />
        </div>

        {/* Action row */}
        <div style={{
          display: "flex", gap: "10px", alignItems: "center",
          paddingTop: "16px", borderTop: "1px solid var(--border)",
        }}>
          {/* Status selector */}
          <select
            value={position.status}
            onChange={(e) => updateStatus(e.target.value)}
            style={{
              padding: "9px 44px 9px 14px",
              borderRadius: "8px",
              border: `1.5px solid ${sc.color}`,
              background: `${sc.bg} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 14px center`,
              fontSize: "13px",
              fontFamily: "'Inter', sans-serif",
              fontWeight: "600",
              color: sc.color,
              cursor: "pointer",
              outline: "none",
              transition: "all 150ms ease",
              appearance: "none",
              WebkitAppearance: "none",
            }}
          >
            {STATUS_VALUES.map((v) => (
              <option key={v} value={v}>{t.statusLabel[v]}</option>
            ))}
          </select>

          {position.postedJobMaster ? (
            position.jobMasterUrl ? (
              <a
                href={position.jobMasterUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "9px 16px", borderRadius: "8px",
                  background: "var(--strong-bg)", color: "var(--strong)",
                  fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: "600",
                  textDecoration: "none", transition: "opacity 140ms ease",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.8"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
              >
                ✓ Posted to JobMaster ↗
              </a>
            ) : (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "9px 16px", borderRadius: "8px",
                background: "var(--strong-bg)", color: "var(--strong)",
                fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: "600",
              }}>
                ✓ Posted to JobMaster
              </span>
            )
          ) : (
            <button
              className="btn btn-primary"
              style={{ fontSize: "14px", padding: "9px 20px", opacity: publishing ? 0.7 : 1 }}
              disabled={publishing}
              onClick={publishJobMaster}
            >
              {publishing ? "Publishing…" : t.publishJob}
            </button>
          )}
          {publishError && (
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: "13px",
              color: "var(--coral)", marginLeft: "8px",
            }}>
              {publishError}
            </span>
          )}

        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "12px", alignItems: "start" }}>

        {/* ── LEFT: Job description card ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <AboutCard
            value={position.description ?? ""}
            onSave={(v) => updateField("description", v)}
            t={t}
          />

          {/* ── Requirements card ── */}
          <RequirementsCard
            value={position.requirements ?? ""}
            onSave={(v) => updateField("requirements", v)}
            t={t}
          />
        </div>

        {/* ── RIGHT: Candidates sidebar ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            overflow: "hidden",
          }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "16px", fontWeight: "600", color: "var(--navy)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                {t.candidates}
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: "500", color: "var(--text-muted)" }}>
                  {matchCount} {t.matched}
                </span>
              </h3>
            </div>

            {/* Candidate list */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {matchCount === 0 && (
                <div style={{ padding: "28px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                  {t.noCandidatesYet}
                </div>
              )}

              {/* ── Pending section ── */}
              {pendingMatches.length > 0 && (
                <div style={{
                  padding: "7px 20px", background: "var(--bg)",
                  borderBottom: "1px solid var(--border)",
                  fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: "700",
                  textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)",
                }}>
                  {t.pendingSection}
                </div>
              )}
              {pendingMatches.map((match, i) => (
                <CandidateRow
                  key={match.id}
                  match={match}
                  updating={updatingMatch === match.id}
                  last={i === pendingMatches.length - 1 && !hasReviewed}
                  onStatusChange={(status) => updateMatch(match.id, { candidateStatus: status })}
                  onOpen={() => openPendingQueue(i)}
                  t={t}
                />
              ))}

              {/* ── Reviewed section ── */}
              {hasReviewed && (
                <div style={{
                  padding: "7px 20px", background: "var(--bg)",
                  borderTop: pendingMatches.length > 0 ? "1px solid var(--border)" : undefined,
                  borderBottom: "1px solid var(--border)",
                  fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: "700",
                  textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)",
                }}>
                  {t.reviewedSection}
                </div>
              )}
              {[...reviewedRelevant, ...pipelineMatches].map((match, i, arr) => (
                <CandidateRow
                  key={match.id}
                  match={match}
                  updating={updatingMatch === match.id}
                  last={i === arr.length - 1 && reviewedNotRelevant.length === 0}
                  onStatusChange={(status) => updateMatch(match.id, { candidateStatus: status })}
                  t={t}
                />
              ))}

              {/* ── Not Relevant (collapsible section) ── */}
              {reviewedNotRelevant.length > 0 && (
                <>
                  <button
                    onClick={() => setShowNotRelevant(!showNotRelevant)}
                    style={{
                      padding: "7px 20px",
                      background: "var(--bg)", border: "none",
                      borderTop: "1px solid var(--border)",
                      borderBottom: showNotRelevant ? "1px solid var(--border)" : "none",
                      fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: "700",
                      textTransform: "uppercase", letterSpacing: "0.07em",
                      color: "var(--text-muted)",
                      cursor: "pointer", textAlign: "left", width: "100%",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      transition: "background 130ms ease",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.03)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg)"; }}
                  >
                    <span>{t.notRelevantSection}</span>
                    <span style={{ fontSize: "10px" }}>{showNotRelevant ? "▲" : "▼"} {reviewedNotRelevant.length}</span>
                  </button>
                  {showNotRelevant && reviewedNotRelevant.map((match, i) => (
                    <CandidateRow
                      key={match.id}
                      match={match}
                      updating={updatingMatch === match.id}
                      last={i === reviewedNotRelevant.length - 1}
                      onStatusChange={(status) => updateMatch(match.id, { candidateStatus: status })}
                      t={t}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

        </div>
      </div>

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
              fontFamily: "'Poppins', sans-serif", fontSize: "20px", fontWeight: "600",
              color: "var(--navy)", marginBottom: "10px",
            }}>
              {t.removePositionTitle}
            </p>
            <p style={{
              fontFamily: "'Inter', sans-serif", fontSize: "15px", lineHeight: "1.6",
              color: "var(--text-secondary)", marginBottom: "28px",
            }}>
              {t.removePositionBody(position.title)}
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: "14px", padding: "9px 20px" }}
                onClick={() => setConfirmDelete(false)}
              >
                {t.cancel}
              </button>
              <button
                style={{
                  padding: "9px 20px", borderRadius: "8px", border: "none",
                  background: "var(--coral)", color: "#fff",
                  fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: "600",
                  cursor: "pointer", transition: "opacity 140ms ease",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                onClick={deletePosition}
              >
                {t.removePositionConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {queueState !== null && (
        <QueueModal
          match={queueState.queue[queueState.idx]}
          total={queueState.queue.length}
          current={queueState.idx + 1}
          slideOut={queueState.slideOut}
          t={t}
          onClose={() => setQueueState(null)}
          onReview={handleQueueReview}
        />
      )}
    </div>
  );
}

type DetailT = (typeof translations)[keyof typeof translations]["detail"];

/* ── About the job card — inline editable ── */
function AboutCard({ value, onSave, t }: { value: string; onSave: (v: string) => void; t: DetailT }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const startEdit = () => { setDraft(value); setEditing(true); };
  const cancel    = () => { setEditing(false); setDraft(value); };
  const commit    = () => {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "18px", fontWeight: "600", color: "var(--navy)" }}>
          {t.aboutJob}
        </h3>
        {!editing && (
          <button
            onClick={startEdit}
            style={{
              background: "none", border: "1px solid var(--border)", borderRadius: "6px",
              padding: "4px 12px", fontSize: "12px", fontWeight: "600",
              color: "var(--text-muted)", cursor: "pointer", fontFamily: "'Inter', sans-serif",
              transition: "all 140ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--coral)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--coral)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            }}
          >
            {t.edit}
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") cancel(); }}
            rows={Math.max(6, draft.split("\n").length + 2)}
            placeholder="Describe the role, responsibilities, and company culture…"
            style={{
              width: "100%", fontFamily: "'Inter', sans-serif",
              fontSize: "15px", lineHeight: "1.75",
              color: "var(--text-primary)", background: "var(--bg)",
              border: "1.5px solid var(--coral)", borderRadius: "8px",
              padding: "12px 14px", outline: "none", resize: "vertical",
              boxShadow: "0 0 0 3px rgba(232,80,58,0.10)",
            }}
          />
          <div style={{ display: "flex", gap: "8px", marginTop: "10px", justifyContent: "flex-end" }}>
            <button className="btn btn-ghost"   style={{ fontSize: "13px", padding: "7px 16px" }} onClick={cancel}>{t.cancel}</button>
            <button className="btn btn-primary" style={{ fontSize: "13px", padding: "7px 16px" }} onClick={commit}>{t.save}</button>
          </div>
        </div>
      ) : value ? (
        <p style={{
          fontFamily: "'Inter', sans-serif", fontSize: "15px",
          lineHeight: "1.75", color: "var(--text-primary)", whiteSpace: "pre-wrap",
        }}>
          {value}
        </p>
      ) : (
        <button
          onClick={startEdit}
          style={{
            background: "none", border: "1.5px dashed var(--border)", borderRadius: "8px",
            padding: "16px", width: "100%", cursor: "pointer",
            color: "var(--text-muted)", fontSize: "14px", fontFamily: "'Inter', sans-serif",
            transition: "border-color 140ms ease, color 140ms ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--coral)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--coral)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
          }}
        >
          {t.addDescription}
        </button>
      )}
    </div>
  );
}

/* ── Requirements card with bullet list ── */
function RequirementsCard({ value, onSave, t }: { value: string; onSave: (v: string) => void; t: DetailT }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  // Parse stored text into bullet lines, stripping leading "• " if present
  const bullets = value
    .split("\n")
    .map((l) => l.replace(/^[•\-\*]\s*/, "").trim())
    .filter(Boolean);

  const startEdit = () => {
    // Present each bullet as a line (without the bullet char — user just types lines)
    setDraft(bullets.join("\n"));
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    // Store as "• item" lines
    const cleaned = draft
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (l.startsWith("•") ? l : `• ${l}`))
      .join("\n");
    if (cleaned !== value) onSave(cleaned);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") { cancel(); return; }
    // Auto-insert bullet on Enter
    if (e.key === "Enter") {
      e.preventDefault();
      const ta = e.currentTarget;
      const pos = ta.selectionStart;
      const newVal = draft.slice(0, pos) + "\n" + draft.slice(pos);
      setDraft(newVal);
      // Move cursor after the newline
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = pos + 1;
      });
    }
  };

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "24px 28px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "18px", fontWeight: "600", color: "var(--navy)" }}>
          {t.requirements}
        </h3>
        {!editing && (
          <button
            onClick={startEdit}
            style={{
              background: "none", border: "1px solid var(--border)", borderRadius: "6px",
              padding: "4px 12px", fontSize: "12px", fontWeight: "600",
              color: "var(--text-muted)", cursor: "pointer", fontFamily: "'Inter', sans-serif",
              transition: "all 140ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--coral)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--coral)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            }}
          >
            {t.edit}
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
            Each line becomes a bullet point. Press Enter to add a new one.
          </p>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={Math.max(4, draft.split("\n").length + 1)}
            placeholder={"5+ years experience\nStrong communication skills\nFluent in English"}
            style={{
              width: "100%", fontFamily: "'Inter', sans-serif",
              fontSize: "15px", lineHeight: "1.75",
              color: "var(--text-primary)", background: "var(--bg)",
              border: "1.5px solid var(--coral)", borderRadius: "8px",
              padding: "12px 14px", outline: "none", resize: "vertical",
              boxShadow: "0 0 0 3px rgba(232,80,58,0.10)",
            }}
          />
          <div style={{ display: "flex", gap: "8px", marginTop: "10px", justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" style={{ fontSize: "13px", padding: "7px 16px" }} onClick={cancel}>
              {t.cancel}
            </button>
            <button className="btn btn-primary" style={{ fontSize: "13px", padding: "7px 16px" }} onClick={commit}>
              {t.save}
            </button>
          </div>
        </div>
      ) : bullets.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
          {bullets.map((b, i) => (
            <li key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{
                marginTop: "5px", width: "6px", height: "6px", borderRadius: "50%",
                background: "var(--coral)", flexShrink: 0,
              }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "15px", lineHeight: "1.7", color: "var(--text-primary)" }}>
                {b}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <button
          onClick={startEdit}
          style={{
            background: "none", border: "1.5px dashed var(--border)", borderRadius: "8px",
            padding: "16px", width: "100%", cursor: "pointer",
            color: "var(--text-muted)", fontSize: "14px", fontFamily: "'Inter', sans-serif",
            transition: "border-color 140ms ease, color 140ms ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--coral)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--coral)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
          }}
        >
          {t.addRequirements}
        </button>
      )}
    </div>
  );
}

/* ── Editable detail cell ── */
const ALLOW_PATTERNS = {
  // Letters, spaces, commas, hyphens, apostrophes — for place names
  text:   /[^a-zA-Z\u0080-\uFFFF\s,\-']/g,
  // Digits, dash (range), comma/dot (thousands/decimal), currency symbols
  salary: /[^0-9\-,.$€£₪\s]/g,
};

function EditableDetailCell({ label, value, placeholder, onSave, allow }: {
  label: string; value: string; placeholder: string; onSave: (v: string) => void; allow: keyof typeof ALLOW_PATTERNS;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  // Keep draft in sync if parent updates (e.g. after save)
  const syncedValue = value;

  return (
    <div
      style={{
        padding: "12px 18px",
        borderRight: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        background: editing ? "var(--surface)" : "var(--bg)",
        cursor: editing ? "default" : "pointer",
        transition: "background 150ms ease",
        position: "relative",
        minWidth: 0,
      }}
      onClick={() => { if (!editing) { setDraft(syncedValue); setEditing(true); } }}
      title={editing ? undefined : "Click to edit"}
    >
      <p style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: "11px", fontWeight: "600",
        textTransform: "uppercase", letterSpacing: "0.06em",
        color: "var(--text-muted)", marginBottom: "4px",
        display: "flex", alignItems: "center", gap: "5px",
      }}>
        {label}
        {!editing && (
          <span style={{ fontSize: "10px", color: "var(--border-strong)", opacity: 0.7 }}>✏</span>
        )}
      </p>

      {editing ? (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(ALLOW_PATTERNS[allow], ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            onBlur={commit}
            placeholder={placeholder}
            style={{
              flex: 1,
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              fontWeight: "500",
              color: "var(--text-primary)",
              background: "transparent",
              border: "none",
              borderBottom: "1.5px solid var(--coral)",
              outline: "none",
              padding: "0 0 2px",
              minWidth: 0,
            }}
          />
        </div>
      ) : (
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "14px", fontWeight: "500",
          color: syncedValue ? "var(--text-primary)" : "var(--text-muted)",
          fontStyle: syncedValue ? "normal" : "italic",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {syncedValue || placeholder}
        </p>
      )}
    </div>
  );
}

/* ── Detail cell ── */
function DetailCell({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      padding: "12px 18px",
      borderRight: last ? "none" : "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg)",
    }}>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "3px" }}>
        {label}
      </p>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}

/* ── Candidate row ── */
const PIPELINE_STEP_COLORS: { status: CandidateStatus; color: string }[] = [
  { status: "open",          color: "var(--text-secondary)" },
  { status: "client_review", color: "var(--possible)"       },
  { status: "interview",     color: "var(--steel)"          },
  { status: "hired",         color: "#1A6B4A"               },
];

function CandidateRow({ match, updating, last, onStatusChange, onOpen, t }: {
  match: Match;
  updating: boolean;
  last: boolean;
  onStatusChange: (status: CandidateStatus) => void;
  onOpen?: () => void;
  t: DetailT;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const cfg = { ...STRENGTH[match.strength], label: t.strengthLabel[match.strength] };
  const initials = match.candidate.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <div
        onClick={() => onOpen ? onOpen() : setModalOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "12px 20px",
          borderBottom: last ? "none" : "1px solid var(--border)",
          opacity: updating ? 0.5 : 1,
          cursor: "pointer",
          transition: "opacity 150ms ease, background 130ms ease",
        }}
        onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.02)"}
        onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
      >
        {/* Avatar */}
        <div style={{
          width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
          background: "var(--navy-light)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Poppins', sans-serif", fontWeight: "700", fontSize: "13px",
          color: "var(--navy)",
        }}>
          {initials}
        </div>

        {/* Name + match label */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "5px" }}>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: "600",
            color: "var(--text-primary)", margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {match.candidate.fullName}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: "600",
              color: cfg.color, background: cfg.bg,
              padding: "2px 8px", borderRadius: "4px",
              textTransform: "uppercase", letterSpacing: "0.03em",
            }}>
              {cfg.label}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(match.candidateStatus === "not_relevant" ? "open" : "not_relevant"); }}
              title={t.reject}
              style={{
                marginInlineStart: "auto",
                background: "none", border: "none", cursor: "pointer", padding: "3px 5px",
                color: "var(--text-muted)", fontSize: "14px", lineHeight: 1,
                borderRadius: "4px", transition: "color 120ms ease, background 120ms ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--coral)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--coral-light)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              ✕
            </button>
          </div>

        </div>
      </div>

      {!onOpen && modalOpen && (
        <CandidateModal
          match={match} cfg={cfg} initials={initials} t={t}
          onClose={() => setModalOpen(false)}
          onReview={(status) => { onStatusChange(status); setModalOpen(false); }}
        />
      )}
    </>
  );
}

function CandidateModal({ match, cfg, initials, t, onClose, onReview }: {
  match: Match;
  cfg: { color: string; bg: string; label: string };
  initials: string;
  t: DetailT;
  onClose: () => void;
  onReview: (status: "relevant" | "not_relevant") => void;
}) {
  const { lang } = useLang();
  const c = match.candidate;
  const skills: string[] = c.skills ? JSON.parse(c.skills) : [];
  const explanation = (lang === "he" ? match.explanationHe : null) ?? match.explanation;
  const summary     = (lang === "he" ? c.summaryHe         : null) ?? c.summary;

  const [copied, setCopied] = useState(false);
  const [hoverCopy, setHoverCopy] = useState(false);

  function copyExplanation() {
    if (!explanation) return;
    navigator.clipboard.writeText(explanation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
          width: "100%", maxWidth: "720px",
          maxHeight: "90vh", overflowY: "auto",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: "16px",
          padding: "28px 32px 24px",
          borderBottom: "1px solid var(--border)",
          position: "sticky", top: 0, background: "var(--surface)", zIndex: 1,
        }}>
          <div style={{
            width: "60px", height: "60px", borderRadius: "50%", flexShrink: 0,
            background: "var(--navy-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Poppins', sans-serif", fontWeight: "700", fontSize: "20px",
            color: "var(--navy)",
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link
              href={`/candidates/${c.id}`}
              onClick={onClose}
              style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px", fontWeight: "600", color: "var(--navy)", textDecoration: "none", display: "block" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--steel)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--navy)"; }}
            >
              {c.fullName}
            </Link>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "15px", color: "var(--text-muted)", margin: "4px 0 8px" }}>
              {[c.currentTitle, c.yearsExperience != null && `${t.yrsExp(c.yearsExperience)} ${t.experience.toLowerCase()}`].filter(Boolean).join(" · ")}
            </p>
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: "700",
              letterSpacing: "0.07em", textTransform: "uppercase",
              color: c.source === "manual" ? "var(--steel)" : "var(--strong)",
              background: c.source === "manual" ? "var(--steel-light)" : "var(--strong-bg)",
              padding: "2px 7px", borderRadius: "4px", display: "inline-block",
            }}>
              {c.source === "manual" ? "Pool" : "Applied"}
            </span>
          </div>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: "600",
            color: cfg.color, background: cfg.bg,
            padding: "5px 14px", borderRadius: "6px",
            textTransform: "uppercase", letterSpacing: "0.03em", flexShrink: 0,
          }}>
            {cfg.label}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "6px 8px",
              color: "var(--text-muted)", fontSize: "22px", lineHeight: 1, borderRadius: "6px",
              flexShrink: 0, transition: "color 120ms ease",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Why they fit */}
          {explanation && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", margin: 0 }}>
                  {t.whyFit}
                </p>
                <button
                  onClick={copyExplanation}
                  onMouseEnter={() => setHoverCopy(true)}
                  onMouseLeave={() => setHoverCopy(false)}
                  style={{
                    fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: "600",
                    color: copied ? "var(--strong)" : hoverCopy ? "var(--text-primary)" : "var(--text-muted)",
                    background: hoverCopy && !copied ? "var(--bg)" : "none",
                    border: "none", cursor: "pointer", padding: "2px 8px", borderRadius: "6px",
                    transition: "color 0.15s, background 0.15s",
                  }}
                >
                  {copied ? t.copied : t.copy}
                </button>
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", lineHeight: "1.75", color: "var(--text-primary)", background: `${cfg.bg}99`, border: `1px solid ${cfg.color}22`, borderRadius: "10px", padding: "16px 18px", margin: 0 }}>
                {explanation}
              </p>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "10px" }}>
                {t.summary}
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", lineHeight: "1.75", color: "var(--text-secondary)", margin: 0 }}>
                {summary}
              </p>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "10px" }}>
                {t.skills}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {skills.map((s) => (
                  <span key={s} style={{ fontFamily: "'Inter', sans-serif", fontSize: "15px", color: "var(--text-primary)", background: "var(--bg)", border: "1.5px solid var(--border)", padding: "6px 14px", borderRadius: "8px" }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {(c.email || c.phone || c.location) && (
            <div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "10px" }}>
                {t.contact}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {c.location && (
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", color: "var(--text-secondary)" }}>📍 {c.location}</span>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", color: "var(--steel)", textDecoration: "none" }}>✉ {c.email}</a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone}`} style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", color: "var(--steel)", textDecoration: "none" }}>📞 {c.phone}</a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer — review actions (frozen at bottom) */}
        <div style={{ padding: "20px 32px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "12px", position: "sticky", bottom: 0, background: "var(--surface)", zIndex: 1 }}>

          {/* Tinder-style decision buttons */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => onReview("not_relevant")}
              style={{
                flex: 1, padding: "13px 10px",
                border: match.candidateStatus === "not_relevant"
                  ? "2px solid var(--coral)"
                  : "2px solid var(--border)",
                borderRadius: "10px",
                background: match.candidateStatus === "not_relevant" ? "var(--coral-light)" : "var(--surface)",
                color: match.candidateStatus === "not_relevant" ? "var(--coral)" : "var(--text-muted)",
                fontFamily: "'Inter', sans-serif", fontSize: "15px", fontWeight: "600",
                cursor: "pointer", transition: "all 150ms ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              }}
              onMouseEnter={(e) => {
                if (match.candidateStatus !== "not_relevant") {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--coral)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--coral)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--coral-light)";
                }
              }}
              onMouseLeave={(e) => {
                if (match.candidateStatus !== "not_relevant") {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
                }
              }}
            >
              <span style={{ fontSize: "18px" }}>✕</span>
              {t.markNotRelevant}
            </button>

            <button
              onClick={() => onReview("relevant")}
              style={{
                flex: 1, padding: "13px 10px",
                border: match.candidateStatus === "relevant"
                  ? "2px solid #1A6B4A"
                  : "2px solid var(--border)",
                borderRadius: "10px",
                background: match.candidateStatus === "relevant" ? "#E0F2EB" : "var(--surface)",
                color: match.candidateStatus === "relevant" ? "#1A6B4A" : "var(--text-muted)",
                fontFamily: "'Inter', sans-serif", fontSize: "15px", fontWeight: "600",
                cursor: "pointer", transition: "all 150ms ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              }}
              onMouseEnter={(e) => {
                if (match.candidateStatus !== "relevant") {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#1A6B4A";
                  (e.currentTarget as HTMLButtonElement).style.color = "#1A6B4A";
                  (e.currentTarget as HTMLButtonElement).style.background = "#E0F2EB";
                }
              }}
              onMouseLeave={(e) => {
                if (match.candidateStatus !== "relevant") {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
                }
              }}
            >
              <span style={{ fontSize: "18px" }}>✓</span>
              {t.markRelevant}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Tinder-style queue modal ── */
function QueueModal({ match, total, current, slideOut, t, onClose, onReview }: {
  match: Match;
  total: number;
  current: number;
  slideOut: "left" | "right" | null;
  t: DetailT;
  onClose: () => void;
  onReview: (status: "relevant" | "not_relevant") => void;
}) {
  const { lang } = useLang();
  const c = match.candidate;
  const skills: string[] = c.skills ? JSON.parse(c.skills) : [];
  const cfg = { ...STRENGTH[match.strength], label: t.strengthLabel[match.strength] };
  const initials = c.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const explanation = (lang === "he" ? match.explanationHe : null) ?? match.explanation;
  const summary     = (lang === "he" ? c.summaryHe         : null) ?? c.summary;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (slideOut) return;
      if (e.key === "ArrowRight") onReview("relevant");
      if (e.key === "ArrowLeft")  onReview("not_relevant");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onReview, slideOut]);

  const cardAnim = slideOut === "left"
    ? "queueOutLeft 340ms cubic-bezier(0.4,0,0.2,1) forwards"
    : slideOut === "right"
    ? "queueOutRight 340ms cubic-bezier(0.4,0,0.2,1) forwards"
    : "queueIn 280ms cubic-bezier(0.4,0,0.2,1) forwards";

  return (
    <>
      <style>{`
        @keyframes queueIn      { from { transform: translateY(18px) scale(0.97); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes queueOutLeft { from { transform: translateX(0) rotate(0deg); opacity: 1; } to { transform: translateX(-110%) rotate(-9deg); opacity: 0; } }
        @keyframes queueOutRight{ from { transform: translateX(0) rotate(0deg); opacity: 1; } to { transform: translateX(110%) rotate(9deg);  opacity: 0; } }
      `}</style>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px",
        }}
      >
        {/* Animated card */}
        <div
          key={match.id}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "var(--surface)", borderRadius: "16px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            width: "100%", maxWidth: "720px",
            maxHeight: "90vh", overflowY: "auto",
            display: "flex", flexDirection: "column",
            animation: cardAnim,
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: "16px",
            padding: "28px 32px 24px",
            borderBottom: "1px solid var(--border)",
            position: "sticky", top: 0, background: "var(--surface)", zIndex: 1,
          }}>
            <div style={{
              width: "60px", height: "60px", borderRadius: "50%", flexShrink: 0,
              background: "var(--navy-light)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Poppins', sans-serif", fontWeight: "700", fontSize: "20px",
              color: "var(--navy)",
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link
                href={`/candidates/${c.id}`}
                onClick={onClose}
                style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px", fontWeight: "600", color: "var(--navy)", textDecoration: "none", display: "block" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--steel)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--navy)"; }}
              >
                {c.fullName}
              </Link>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "15px", color: "var(--text-muted)", margin: "4px 0 8px" }}>
                {[c.currentTitle, c.yearsExperience != null && `${t.yrsExp(c.yearsExperience)} ${t.experience.toLowerCase()}`].filter(Boolean).join(" · ")}
              </p>
              <span style={{
                fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: "700",
                letterSpacing: "0.07em", textTransform: "uppercase",
                color: c.source === "manual" ? "var(--steel)" : "var(--strong)",
                background: c.source === "manual" ? "var(--steel-light)" : "var(--strong-bg)",
                padding: "2px 7px", borderRadius: "4px", display: "inline-block",
              }}>
                {c.source === "manual" ? "Pool" : "Applied"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
              <span style={{
                fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: "600",
                color: cfg.color, background: cfg.bg,
                padding: "5px 14px", borderRadius: "6px",
                textTransform: "uppercase", letterSpacing: "0.03em",
              }}>
                {cfg.label}
              </span>
              {total > 1 && (
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--text-muted)" }}>
                  {current} / {total}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "6px 8px",
                color: "var(--text-muted)", fontSize: "22px", lineHeight: 1, borderRadius: "6px",
                flexShrink: 0, transition: "color 120ms ease",
              }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
            {explanation && (
              <div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "10px" }}>
                  {t.whyFit}
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", lineHeight: "1.75", color: "var(--text-primary)", background: `${cfg.bg}99`, border: `1px solid ${cfg.color}22`, borderRadius: "10px", padding: "16px 18px", margin: 0 }}>
                  {explanation}
                </p>
              </div>
            )}
            {summary && (
              <div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "10px" }}>
                  {t.summary}
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", lineHeight: "1.75", color: "var(--text-secondary)", margin: 0 }}>
                  {summary}
                </p>
              </div>
            )}
            {skills.length > 0 && (
              <div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "10px" }}>
                  {t.skills}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {skills.map((s) => (
                    <span key={s} style={{ fontFamily: "'Inter', sans-serif", fontSize: "15px", color: "var(--text-primary)", background: "var(--bg)", border: "1.5px solid var(--border)", padding: "6px 14px", borderRadius: "8px" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(c.email || c.phone || c.location) && (
              <div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "10px" }}>
                  {t.contact}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {c.location && <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", color: "var(--text-secondary)" }}>📍 {c.location}</span>}
                  {c.email    && <a href={`mailto:${c.email}`} style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", color: "var(--steel)", textDecoration: "none" }}>✉ {c.email}</a>}
                  {c.phone    && <a href={`tel:${c.phone}`}   style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", color: "var(--steel)", textDecoration: "none" }}>📞 {c.phone}</a>}
                </div>
              </div>
            )}
          </div>

          {/* Footer — frozen */}
          <div style={{
            padding: "20px 32px", borderTop: "1px solid var(--border)",
            display: "flex", gap: "10px",
            position: "sticky", bottom: 0, background: "var(--surface)", zIndex: 1,
          }}>
            <button
              onClick={() => !slideOut && onReview("not_relevant")}
              style={{
                flex: 1, padding: "13px 10px",
                border: "2px solid var(--border)", borderRadius: "10px",
                background: "var(--surface)", color: "var(--text-muted)",
                fontFamily: "'Inter', sans-serif", fontSize: "15px", fontWeight: "600",
                cursor: slideOut ? "default" : "pointer",
                opacity: slideOut ? 0.45 : 1,
                transition: "all 150ms ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              }}
              onMouseEnter={(e) => { if (!slideOut) { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--coral)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--coral)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--coral-light)"; } }}
              onMouseLeave={(e) => { if (!slideOut) { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; } }}
            >
              <span style={{ fontSize: "18px" }}>✕</span> {t.markNotRelevant}
            </button>
            <button
              onClick={() => !slideOut && onReview("relevant")}
              style={{
                flex: 1, padding: "13px 10px",
                border: "2px solid var(--border)", borderRadius: "10px",
                background: "var(--surface)", color: "var(--text-muted)",
                fontFamily: "'Inter', sans-serif", fontSize: "15px", fontWeight: "600",
                cursor: slideOut ? "default" : "pointer",
                opacity: slideOut ? 0.45 : 1,
                transition: "all 150ms ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              }}
              onMouseEnter={(e) => { if (!slideOut) { (e.currentTarget as HTMLButtonElement).style.borderColor = "#1A6B4A"; (e.currentTarget as HTMLButtonElement).style.color = "#1A6B4A"; (e.currentTarget as HTMLButtonElement).style.background = "#E0F2EB"; } }}
              onMouseLeave={(e) => { if (!slideOut) { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; } }}
            >
              <span style={{ fontSize: "18px" }}>✓</span> {t.markRelevant}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
