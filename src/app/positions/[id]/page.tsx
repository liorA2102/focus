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
  source: "jobmaster" | "manual" | "website";
  jobSourceUrl: string | null;
  appliedPositionId: number | null;
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
  clientId: number | null;
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
  linkedinPostUrl: string | null;
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

  // LinkedIn modal
  const [liModalOpen, setLiModalOpen] = useState(false);
  const [liLang, setLiLang] = useState<"he" | "en">("he");
  const [liText, setLiText] = useState("");
  const [liGenerating, setLiGenerating] = useState(false);
  const [liImages, setLiImages] = useState<{ id: number; filename: string; label: string | null }[]>([]);
  const [liImageIdx, setLiImageIdx] = useState<number | null>(null);
  const [liPosting, setLiPosting] = useState(false);
  const [liError, setLiError] = useState<string | null>(null);
  const [liShowManual, setLiShowManual] = useState(false);
  const [liManualUrl, setLiManualUrl] = useState("");
  const [liMarkingManual, setLiMarkingManual] = useState(false);
  const [liGalleryOpen, setLiGalleryOpen] = useState(false);
  const [emailModal, setEmailModal] = useState<Match | null>(null);
  const [polishing, setPolishing] = useState(false);

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

  const polishWithAI = async () => {
    setPolishing(true);
    try {
      const res = await fetch(`/api/positions/${id}/polish`, { method: "POST" });
      if (res.ok) fetchPosition();
    } finally {
      setPolishing(false);
    }
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


  const generateLiPost = async (lang: "he" | "en", action?: "shorten" | "expand", currentText?: string) => {
    setLiGenerating(true);
    setLiError(null);
    try {
      const res = await fetch("/api/linkedin/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: position?.title,
          client: position?.client,
          location: position?.location,
          salaryRange: position?.salaryRange,
          description: position?.description,
          requirements: position?.requirements,
          lang,
          action,
          currentText,
        }),
      });
      const data = await res.json();
      if (data.text) setLiText(data.text);
    } catch {
      setLiError("Generation failed — please try again");
    } finally {
      setLiGenerating(false);
    }
  };

  const openLiModal = async () => {
    setLiModalOpen(true);
    setLiText("");
    setLiError(null);
    setLiShowManual(false);
    setLiManualUrl("");
    // Load images and generate post in parallel
    const [imagesRes] = await Promise.all([
      fetch("/api/linkedin/images"),
      generateLiPost(liLang),
    ]);
    const imgs = await imagesRes.json();
    setLiImages(imgs);
    setLiImageIdx(0);
  };

  const postToLinkedin = async () => {
    setLiPosting(true);
    setLiError(null);
    try {
      const selectedImage = liImageIdx !== null ? liImages[liImageIdx] : undefined;
      const res = await fetch(`/api/positions/${id}/publish-linkedin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: liText,
          imageFilename: selectedImage?.filename ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLiError(data.error ?? "Posting failed");
      } else {
        setLiModalOpen(false);
        await fetchPosition();
      }
    } catch {
      setLiError("Network error — please try again");
    } finally {
      setLiPosting(false);
    }
  };

  const markLiManual = async () => {
    setLiMarkingManual(true);
    try {
      await fetch(`/api/positions/${id}/publish-linkedin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedinPostUrl: liManualUrl.trim() || null }),
      });
      setLiModalOpen(false);
      await fetchPosition();
    } finally {
      setLiMarkingManual(false);
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
        marginBottom: "20px", fontFamily: "var(--font-body)",
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
            <div>
              <div className="accent-rule" style={{ marginBottom: "10px" }} />
              <h2 style={{
                fontFamily: "var(--font-body)",
                fontSize: "32px", fontWeight: 800,
                color: "var(--navy)", letterSpacing: "-0.5px",
                lineHeight: 1.1, margin: 0,
              }}>
                {position.title}
              </h2>
            </div>
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
                        fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: "500",
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
          <ClientDropdown
            value={position.client}
            onSave={(name, clientId) => {
              fetch(`/api/positions/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ client: name, clientId: clientId ?? null }),
              }).then(() => fetchPosition());
            }}
          />
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
          display: "flex", alignItems: "center", justifyContent: "space-between",
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
              fontFamily: "var(--font-body)",
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

          {/* Publish buttons */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>

            {/* ── JobMaster ── */}
            {position.postedJobMaster ? (
              position.jobMasterUrl ? (
                <a
                  href={position.jobMasterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "9px",
                    padding: "7px 13px 7px 7px", borderRadius: "10px",
                    background: "#fff0ef", border: "1.5px solid #fdc5c2", color: "#c0291e",
                    fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600",
                    textDecoration: "none", transition: "all 160ms var(--ease-out)",
                  }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-1px)"; el.style.boxShadow = "0 4px 12px rgba(192,41,30,0.15)"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.boxShadow = ""; }}
                >
                  <span style={{ width: 24, height: 24, borderRadius: 6, background: "#ffeae8", border: "1.5px solid #fdc5c2", color: "#c0291e", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, flexShrink: 0, letterSpacing: "0.02em" }}>JM</span>
                  ✓ Posted to JobMaster
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              ) : (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "9px",
                  padding: "7px 13px 7px 7px", borderRadius: "10px",
                  background: "#fff0ef", border: "1.5px solid #fdc5c2", color: "#c0291e",
                  fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600",
                }}>
                  <span style={{ width: 24, height: 24, borderRadius: 6, background: "#ffeae8", border: "1.5px solid #fdc5c2", color: "#c0291e", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, flexShrink: 0, letterSpacing: "0.02em" }}>JM</span>
                  ✓ Posted to JobMaster
                </span>
              )
            ) : (
              <button
                onClick={publishJobMaster}
                disabled={publishing}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "9px",
                  padding: "7px 13px 7px 7px", borderRadius: "10px",
                  background: "var(--surface)", border: "1.5px solid #fdc5c2", color: "#c0291e",
                  fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600",
                  cursor: publishing ? "default" : "pointer", opacity: publishing ? 0.65 : 1,
                  transition: "all 160ms var(--ease-out)",
                }}
                onMouseEnter={(e) => { if (!publishing) { const el = e.currentTarget as HTMLElement; el.style.background = "#fff0ef"; el.style.transform = "translateY(-1px)"; el.style.boxShadow = "0 4px 12px rgba(192,41,30,0.12)"; } }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--surface)"; el.style.transform = ""; el.style.boxShadow = ""; }}
              >
                <span style={{ width: 24, height: 24, borderRadius: 6, background: "#fff0ef", border: "1.5px solid #fdc5c2", color: "#c0291e", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, flexShrink: 0, letterSpacing: "0.02em" }}>JM</span>
                {publishing ? "Publishing…" : t.publishJob}
              </button>
            )}

            {publishError && (
              <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--coral)" }}>
                {publishError}
              </span>
            )}

            {/* ── LinkedIn ── */}
            {position.postedLinkedin ? (
              position.linkedinPostUrl ? (
                <a
                  href={position.linkedinPostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "9px",
                    padding: "7px 13px 7px 7px", borderRadius: "10px",
                    background: "#eef3fd", border: "1.5px solid #bfccee", color: "#2056a8",
                    fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600",
                    textDecoration: "none", transition: "all 160ms var(--ease-out)",
                  }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-1px)"; el.style.boxShadow = "0 4px 12px rgba(32,86,168,0.15)"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.boxShadow = ""; }}
                >
                  <span style={{ width: 24, height: 24, borderRadius: 6, background: "#dde8fb", border: "1.5px solid #bfccee", color: "#2056a8", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, flexShrink: 0, fontStyle: "italic" }}>in</span>
                  {t.postedToLinkedin}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              ) : (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "9px",
                  padding: "7px 13px 7px 7px", borderRadius: "10px",
                  background: "#eef3fd", border: "1.5px solid #bfccee", color: "#2056a8",
                  fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600",
                }}>
                  <span style={{ width: 24, height: 24, borderRadius: 6, background: "#dde8fb", border: "1.5px solid #bfccee", color: "#2056a8", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, flexShrink: 0, fontStyle: "italic" }}>in</span>
                  {t.postedToLinkedin}
                </span>
              )
            ) : (
              <button
                onClick={openLiModal}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "9px",
                  padding: "7px 13px 7px 7px", borderRadius: "10px",
                  background: "var(--surface)", border: "1.5px solid #bfccee", color: "#2056a8",
                  fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600",
                  cursor: "pointer", transition: "all 160ms var(--ease-out)",
                }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "#eef3fd"; el.style.transform = "translateY(-1px)"; el.style.boxShadow = "0 4px 12px rgba(32,86,168,0.12)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--surface)"; el.style.transform = ""; el.style.boxShadow = ""; }}
              >
                <span style={{ width: 24, height: 24, borderRadius: 6, background: "#eef3fd", border: "1.5px solid #bfccee", color: "#2056a8", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, flexShrink: 0, fontStyle: "italic" }}>in</span>
                {t.postToLinkedin}
              </button>
            )}

          </div>

        </div>
      </div>

      {/* ── LinkedIn Post Modal ── */}
      {liModalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setLiModalOpen(false); }}
        >
          <div style={{
            background: "var(--surface)", borderRadius: "16px",
            width: "min(960px, 95vw)", maxHeight: "90vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
            overflow: "hidden",
          }}>
            {/* Modal header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 24px", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "18px" }}>
                  {t.linkedinModal.title}
                </span>
              </div>
              <button
                onClick={() => setLiModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "var(--text-muted)", lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Modal body — split panels */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", flex: 1, overflow: "hidden", minHeight: 0 }}>

              {/* LEFT: Editor */}
              <div style={{
                display: "flex", flexDirection: "column",
                borderRight: "1px solid var(--border)",
                overflow: "hidden",
              }}>
              {/* Scrollable content */}
              <div style={{
                flex: 1, overflowY: "auto",
                display: "flex", flexDirection: "column", gap: "14px",
                padding: "20px 24px 12px",
              }}>
                {/* Lang toggle */}
                <div style={{ display: "flex", gap: "6px" }}>
                  {(["he", "en"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => {
                        setLiLang(l);
                        generateLiPost(l);
                      }}
                      style={{
                        padding: "6px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: 600,
                        fontFamily: "var(--font-body)", border: "1.5px solid",
                        borderColor: liLang === l ? "#0A66C2" : "var(--border)",
                        background: liLang === l ? "#E8F0FD" : "transparent",
                        color: liLang === l ? "#0A66C2" : "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      {l === "he" ? t.linkedinModal.langHe : t.linkedinModal.langEn}
                    </button>
                  ))}
                </div>

                {/* Textarea */}
                <div style={{ position: "relative" }}>
                  {liGenerating && (
                    <div style={{
                      position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: "8px", zIndex: 2,
                      fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)",
                    }}>
                      {t.linkedinModal.generating}
                    </div>
                  )}
                  <textarea
                    value={liText}
                    onChange={(e) => setLiText(e.target.value)}
                    dir={liLang === "he" ? "rtl" : "ltr"}
                    rows={12}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: "8px",
                      border: "1.5px solid var(--border)", outline: "none",
                      fontFamily: "var(--font-body)", fontSize: "14px", lineHeight: 1.6,
                      resize: "vertical", boxSizing: "border-box",
                      color: "var(--text-primary)", background: "var(--bg)",
                    }}
                  />
                </div>

                {/* Toolbar */}
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["shorten", "expand"] as const).map((action) => (
                    <button
                      key={action}
                      disabled={liGenerating || !liText}
                      onClick={() => generateLiPost(liLang, action, liText)}
                      style={{
                        padding: "6px 14px", borderRadius: "8px", fontSize: "13px",
                        fontFamily: "var(--font-body)", fontWeight: 500,
                        border: "1.5px solid var(--border)", background: "var(--bg)",
                        color: "var(--text-secondary)", cursor: "pointer",
                        opacity: liGenerating || !liText ? 0.5 : 1,
                      }}
                    >
                      {action === "shorten" ? t.linkedinModal.shorten : t.linkedinModal.expand}
                    </button>
                  ))}
                </div>

                {/* Image gallery */}
                <div>
                  {liImages.length === 0 ? (
                    <div style={{
                      padding: "12px", borderRadius: "8px", background: "var(--light-gray)",
                      fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)",
                      textAlign: "center",
                    }}>
                      {t.linkedinModal.noImages}
                    </div>
                  ) : liImageIdx === null ? (
                    <button
                      onClick={() => setLiGalleryOpen(true)}
                      style={{
                        width: "100%", padding: "12px", borderRadius: "8px", cursor: "pointer",
                        border: "2px dashed var(--border)", background: "var(--bg)",
                        fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)",
                        transition: "border-color 140ms ease",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#0A66C2"; (e.currentTarget as HTMLButtonElement).style.color = "#0A66C2"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                    >
                      + {t.linkedinModal.attachImage}
                    </button>
                  ) : (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                          onClick={() => setLiImageIdx((i) => ((i ?? 0) - 1 + liImages.length) % liImages.length)}
                          style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: "16px", flexShrink: 0 }}
                        >‹</button>
                        <div style={{ flex: 1, borderRadius: "8px", overflow: "hidden", aspectRatio: "16/9" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/linkedin-images/${liImages[liImageIdx].filename}`}
                            alt={liImages[liImageIdx].label ?? ""}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                        <button
                          onClick={() => setLiImageIdx((i) => ((i ?? 0) + 1) % liImages.length)}
                          style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: "16px", flexShrink: 0 }}
                        >›</button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "10px" }}>
                        <button
                          onClick={() => setLiGalleryOpen(true)}
                          style={{
                            padding: "5px 14px",
                            borderRadius: "20px",
                            border: "1.5px solid #0A66C2",
                            background: "transparent",
                            color: "#0A66C2",
                            fontSize: "12px",
                            fontWeight: 600,
                            fontFamily: "var(--font-body)",
                            cursor: "pointer",
                          }}
                        >
                          {t.linkedinModal.browseGallery}
                        </button>
                        <button
                          onClick={() => setLiImageIdx(null)}
                          style={{
                            padding: "5px 14px",
                            borderRadius: "20px",
                            border: "1.5px solid var(--coral)",
                            background: "transparent",
                            color: "var(--coral)",
                            fontSize: "12px",
                            fontWeight: 600,
                            fontFamily: "var(--font-body)",
                            cursor: "pointer",
                          }}
                        >
                          {t.linkedinModal.removeAttachment}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error */}
                {liError && (
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--coral)" }}>
                    {liError}
                  </div>
                )}
              </div>{/* end scrollable */}

              {/* Sticky bottom actions */}
              <div style={{
                padding: "14px 24px", borderTop: "1px solid var(--border)",
                display: "flex", flexDirection: "column", gap: "8px",
                background: "var(--surface)",
              }}>
                <button
                  disabled={liPosting || !liText}
                  onClick={postToLinkedin}
                  style={{
                    padding: "12px 20px", borderRadius: "10px",
                    background: liPosting || !liText ? "#ccc" : "#0A66C2",
                    color: "#fff", border: "none", cursor: liPosting || !liText ? "not-allowed" : "pointer",
                    fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 700,
                  }}
                >
                  {liPosting ? t.linkedinModal.posting : t.linkedinModal.postBtn}
                </button>

                {!liShowManual ? (
                  <button
                    onClick={() => setLiShowManual(true)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontFamily: "var(--font-body)", fontSize: "12px",
                      color: "var(--text-muted)", textDecoration: "underline", textAlign: "center",
                    }}
                  >
                    {t.linkedinModal.markManual}
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="text"
                      value={liManualUrl}
                      onChange={(e) => setLiManualUrl(e.target.value)}
                      placeholder={t.linkedinModal.manualUrlLabel}
                      style={{
                        flex: 1, padding: "7px 10px", borderRadius: "8px", fontSize: "13px",
                        border: "1.5px solid var(--border)", outline: "none",
                        fontFamily: "var(--font-body)",
                      }}
                    />
                    <button
                      disabled={liMarkingManual}
                      onClick={markLiManual}
                      className="btn btn-primary"
                      style={{ fontSize: "13px", padding: "7px 12px" }}
                    >
                      {liMarkingManual ? "…" : t.linkedinModal.manualConfirm}
                    </button>
                    <button
                      onClick={() => setLiShowManual(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text-muted)" }}
                    >
                      {t.linkedinModal.cancel}
                    </button>
                  </div>
                )}
              </div>
              </div>{/* end left panel */}

              {/* RIGHT: LinkedIn Preview */}
              <div style={{
                padding: "20px 24px", overflowY: "auto",
                background: "#F3F2EF",
              }}>
                <div style={{
                  fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600,
                  color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em",
                  marginBottom: "14px",
                }}>
                  {t.linkedinModal.preview}
                </div>

                {/* LinkedIn card mockup */}
                <div style={{
                  background: "#fff", borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                  overflow: "hidden",
                }}>
                  {/* Card header */}
                  <div style={{ padding: "16px 16px 0", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/jacob-avatar.jpg"
                      alt="Jacob Avidar"
                      style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "15px", color: "#000" }}>Jacob Avidar</div>
                      <div style={{ fontSize: "13px", color: "#666", lineHeight: 1.3 }}>CEO at Focus Group</div>
                      <div style={{ fontSize: "12px", color: "#999", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                        <span>Just now</span>
                        <span>·</span>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="#999"><path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14.5C4.41 14.5 1.5 11.59 1.5 8S4.41 1.5 8 1.5 14.5 4.41 14.5 8 11.59 14.5 8 14.5z"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Post text */}
                  <div style={{
                    padding: "12px 16px",
                    fontFamily: "var(--font-body)", fontSize: "14px", lineHeight: 1.6,
                    color: "#1a1a1a", whiteSpace: "pre-wrap",
                    direction: liLang === "he" ? "rtl" : "ltr",
                    textAlign: liLang === "he" ? "right" : "left",
                  }}>
                    {liText || <span style={{ color: "#aaa" }}>…</span>}
                  </div>

                  {/* Selected image */}
                  {liImageIdx !== null && liImages[liImageIdx] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/linkedin-images/${liImages[liImageIdx].filename}`}
                      alt=""
                      style={{ width: "100%", display: "block" }}
                    />
                  )}

                  {/* Reactions bar */}
                  <div style={{
                    padding: "10px 16px",
                    borderTop: "1px solid #e0e0e0",
                    display: "flex", gap: "20px",
                    fontFamily: "var(--font-body)", fontSize: "13px", color: "#666",
                  }}>
                    {["👍 Like", "💬 Comment", "🔁 Repost", "📤 Send"].map((label) => (
                      <span key={label} style={{ cursor: "default", opacity: 0.6 }}>{label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Gallery Picker Modal ── */}
      {liGalleryOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1100,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setLiGalleryOpen(false); }}
        >
          <div style={{
            background: "var(--surface)", borderRadius: "16px",
            width: "min(780px, 92vw)", maxHeight: "80vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 24px", borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "16px", color: "var(--navy)" }}>
                {t.linkedinModal.chooseImage}
              </span>
              <button
                onClick={() => setLiGalleryOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "var(--text-muted)", lineHeight: 1 }}
              >×</button>
            </div>
            <div style={{
              overflowY: "auto", padding: "20px 24px",
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px",
            }}>
              {liImages.length === 0 ? (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)" }}>
                  {t.linkedinModal.noImages}
                </div>
              ) : liImages.map((img, idx) => (
                <div
                  key={img.id}
                  onClick={() => { setLiImageIdx(idx); setLiGalleryOpen(false); }}
                  style={{
                    borderRadius: "10px", overflow: "hidden", cursor: "pointer",
                    border: `2px solid ${liImageIdx === idx ? "#0A66C2" : "var(--border)"}`,
                    boxShadow: liImageIdx === idx ? "0 0 0 3px #C5D9F1" : "none",
                    transition: "border-color 120ms ease, box-shadow 120ms ease",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/linkedin-images/${img.filename}`}
                    alt={img.label ?? ""}
                    style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
                    draggable={false}
                  />
                  <div style={{
                    padding: "7px 10px", fontFamily: "var(--font-body)",
                    fontSize: "12px", color: "var(--text-muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    borderTop: "1px solid var(--border)",
                  }}>
                    {img.label ?? img.filename}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "12px", alignItems: "start" }}>

        {/* ── LEFT: Job description card ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <AboutCard
            value={position.description ?? ""}
            onSave={(v) => updateField("description", v)}
            onPolish={polishWithAI}
            polishing={polishing}
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
                fontFamily: "var(--font-body)",
                fontSize: "16px", fontWeight: "600", color: "var(--navy)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                {t.candidates}
                <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "500", color: "var(--text-muted)" }}>
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
                  fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: "700",
                  textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)",
                }}>
                  {t.pendingSection}
                </div>
              )}
              {pendingMatches.map((match, i) => (
                <CandidateRow
                  key={match.id}
                  match={match}
                  positionId={position.id}
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
                  fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: "700",
                  textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)",
                }}>
                  {t.reviewedSection}
                </div>
              )}
              {[...reviewedRelevant, ...pipelineMatches].map((match, i, arr) => (
                <CandidateRow
                  key={match.id}
                  match={match}
                  positionId={position.id}
                  updating={updatingMatch === match.id}
                  last={i === arr.length - 1 && reviewedNotRelevant.length === 0}
                  onStatusChange={(status) => updateMatch(match.id, { candidateStatus: status })}
                  onSendEmail={() => setEmailModal(match)}
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
                      fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: "700",
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
                      positionId={position.id}
                      updating={updatingMatch === match.id}
                      last={i === reviewedNotRelevant.length - 1}
                      onStatusChange={(status) => updateMatch(match.id, { candidateStatus: status })}
                      onSendEmail={() => setEmailModal(match)}
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
              fontFamily: "var(--font-body)", fontSize: "20px", fontWeight: "600",
              color: "var(--navy)", marginBottom: "10px",
            }}>
              {t.removePositionTitle}
            </p>
            <p style={{
              fontFamily: "var(--font-body)", fontSize: "15px", lineHeight: "1.6",
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
                  fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: "600",
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

      {queueState !== null && position && (
        <QueueModal
          match={queueState.queue[queueState.idx]}
          positionId={position.id}
          total={queueState.queue.length}
          current={queueState.idx + 1}
          slideOut={queueState.slideOut}
          t={t}
          onClose={() => setQueueState(null)}
          onReview={handleQueueReview}
        />
      )}

      {emailModal && position && (
        <EmailDraftModal
          match={emailModal}
          position={position}
          onClose={() => setEmailModal(null)}
          t={t}
        />
      )}
    </div>
  );
}

type DetailT = (typeof translations)[keyof typeof translations]["detail"];

/* ── About the job card — inline editable ── */
function AboutCard({
  value, onSave, onPolish, polishing, t,
}: {
  value: string;
  onSave: (v: string) => void;
  onPolish: () => void;
  polishing: boolean;
  t: DetailT;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const startEdit = () => { setDraft(value); setEditing(true); };
  const cancel    = () => { setEditing(false); setDraft(value); };
  const commit    = () => {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  };

  const btnBase: React.CSSProperties = {
    background: "none", border: "1px solid var(--border)", borderRadius: "6px",
    padding: "4px 12px", fontSize: "12px", fontWeight: "600",
    color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-body)",
    transition: "all 140ms ease",
  };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3 style={{ fontFamily: "var(--font-body)", fontSize: "18px", fontWeight: "600", color: "var(--navy)" }}>
          {t.aboutJob}
        </h3>
        {!editing && (
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={onPolish}
              disabled={polishing}
              title="Reformat description and requirements with AI"
              style={{ ...btnBase, opacity: polishing ? 0.6 : 1, cursor: polishing ? "default" : "pointer" }}
              onMouseEnter={(e) => { if (!polishing) { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--coral)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--coral)"; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
            >
              {polishing ? t.polishing : t.polishWithAI}
            </button>
            <button
              onClick={startEdit}
              style={btnBase}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--coral)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--coral)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
            >
              {t.edit}
            </button>
          </div>
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
              width: "100%", fontFamily: "var(--font-body)",
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
          fontFamily: "var(--font-body)", fontSize: "15px",
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
            color: "var(--text-muted)", fontSize: "14px", fontFamily: "var(--font-body)",
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
        <h3 style={{ fontFamily: "var(--font-body)", fontSize: "18px", fontWeight: "600", color: "var(--navy)" }}>
          {t.requirements}
        </h3>
        {!editing && (
          <button
            onClick={startEdit}
            style={{
              background: "none", border: "1px solid var(--border)", borderRadius: "6px",
              padding: "4px 12px", fontSize: "12px", fontWeight: "600",
              color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-body)",
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
          <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
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
              width: "100%", fontFamily: "var(--font-body)",
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
              <span style={{ fontFamily: "var(--font-body)", fontSize: "15px", lineHeight: "1.7", color: "var(--text-primary)" }}>
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
            color: "var(--text-muted)", fontSize: "14px", fontFamily: "var(--font-body)",
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
        fontFamily: "var(--font-body)",
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
              fontFamily: "var(--font-body)",
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
          fontFamily: "var(--font-body)",
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
      <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "3px" }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>
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

function CandidateRow({ match, positionId, updating, last, onStatusChange, onOpen, onSendEmail, t }: {
  match: Match;
  positionId: number;
  updating: boolean;
  last: boolean;
  onStatusChange: (status: CandidateStatus) => void;
  onOpen?: () => void;
  onSendEmail?: () => void;
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
          fontFamily: "var(--font-body)", fontWeight: "700", fontSize: "13px",
          color: "var(--navy)",
        }}>
          {initials}
        </div>

        {/* Name + match label */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "5px" }}>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: "600",
            color: "var(--text-primary)", margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {match.candidate.fullName}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: "600",
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
          match={match} positionId={positionId} cfg={cfg} initials={initials} t={t}
          onClose={() => setModalOpen(false)}
          onReview={(status) => { onStatusChange(status); setModalOpen(false); }}
          onSendEmail={onSendEmail ? () => { setModalOpen(false); onSendEmail(); } : undefined}
        />
      )}
    </>
  );
}

function CandidateModal({ match, positionId, cfg, initials, t, onClose, onReview, onSendEmail }: {
  match: Match;
  positionId: number;
  cfg: { color: string; bg: string; label: string };
  initials: string;
  t: DetailT;
  onClose: () => void;
  onReview: (status: "relevant" | "not_relevant") => void;
  onSendEmail?: () => void;
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
            fontFamily: "var(--font-body)", fontWeight: "700", fontSize: "20px",
            color: "var(--navy)",
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link
              href={`/candidates/${c.id}`}
              onClick={onClose}
              style={{ fontFamily: "var(--font-body)", fontSize: "22px", fontWeight: "600", color: "var(--navy)", textDecoration: "none", display: "block" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--steel)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--navy)"; }}
            >
              {c.fullName}
            </Link>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-muted)", margin: "4px 0 8px" }}>
              {[c.currentTitle, c.yearsExperience != null && `${t.yrsExp(c.yearsExperience)} ${t.experience.toLowerCase()}`].filter(Boolean).join(" · ")}
            </p>
            <span style={{
              fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: "700",
              letterSpacing: "0.07em", textTransform: "uppercase",
              color: c.appliedPositionId === positionId ? "var(--strong)" : "var(--steel)",
              background: c.appliedPositionId === positionId ? "var(--strong-bg)" : "var(--steel-light)",
              padding: "2px 7px", borderRadius: "4px", display: "inline-block",
            }}>
              {c.appliedPositionId === positionId ? t.appliedBadge : t.poolBadge}
            </span>
          </div>
          <span style={{
            fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600",
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
                <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", margin: 0 }}>
                  {t.whyFit}
                </p>
                <button
                  onClick={copyExplanation}
                  onMouseEnter={() => setHoverCopy(true)}
                  onMouseLeave={() => setHoverCopy(false)}
                  style={{
                    fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "600",
                    color: copied ? "var(--strong)" : hoverCopy ? "var(--text-primary)" : "var(--text-muted)",
                    background: hoverCopy && !copied ? "var(--bg)" : "none",
                    border: "none", cursor: "pointer", padding: "2px 8px", borderRadius: "6px",
                    transition: "color 0.15s, background 0.15s",
                  }}
                >
                  {copied ? t.copied : t.copy}
                </button>
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", lineHeight: "1.75", color: "var(--text-primary)", background: `${cfg.bg}99`, border: `1px solid ${cfg.color}22`, borderRadius: "10px", padding: "16px 18px", margin: 0 }}>
                {explanation}
              </p>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "10px" }}>
                {t.summary}
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", lineHeight: "1.75", color: "var(--text-secondary)", margin: 0 }}>
                {summary}
              </p>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "10px" }}>
                {t.skills}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {skills.map((s) => (
                  <span key={s} style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-primary)", background: "var(--bg)", border: "1.5px solid var(--border)", padding: "6px 14px", borderRadius: "8px" }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {(c.email || c.phone || c.location || c.jobSourceUrl) && (
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "10px" }}>
                {t.contact}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {c.location && (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "var(--text-secondary)" }}>📍 {c.location}</span>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "var(--steel)", textDecoration: "none" }}>✉ {c.email}</a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone}`} style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "var(--steel)", textDecoration: "none" }}>📞 {c.phone}</a>
                )}
                {c.jobSourceUrl && (
                  <a href={c.jobSourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "var(--steel)", textDecoration: "none" }}>🔗 {t.jobSourceLink}</a>
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
                fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: "600",
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
                fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: "600",
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

          {onSendEmail && (
            <button
              onClick={onSendEmail}
              style={{
                width: "100%", padding: "12px 10px",
                border: "2px solid var(--steel)",
                borderRadius: "10px",
                background: "var(--surface)",
                color: "var(--steel)",
                fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: "600",
                cursor: "pointer", transition: "all 150ms ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--steel-light)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
              }}
            >
              ✉ {t.sendToClient}
            </button>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── Email draft modal ── */
function EmailDraftModal({ match, position, onClose, t }: {
  match: Match;
  position: Position;
  onClose: () => void;
  t: DetailT;
}) {
  const c = match.candidate;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toValue, setToValue]     = useState("");
  const [subject, setSubject]     = useState("");
  const [body, setBody]           = useState("");
  const [cvFilename, setCvFilename] = useState<string | null>(null);
  const [includeContact, setIncludeContact] = useState(false);

  useEffect(() => {
    fetch(`/api/positions/${position.id}/draft-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("draft failed");
        const data = await res.json();
        setToValue(
          (data.toContacts as { email: string }[])
            .map((ct) => ct.email)
            .filter(Boolean)
            .join(", ")
        );
        setSubject(data.subject);
        setBody(data.body);
        setCvFilename(data.cvFilename ?? null);
        setLoading(false);
      })
      .catch(() => {
        setError(t.emailDraft.draftError);
        setLoading(false);
      });
  }, [match.id, position.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleOpenOutlook = () => {
    const contactLines = [
      c.email ? `${t.emailDraft.contactEmailLabel}: ${c.email}` : null,
      c.phone ? `${t.emailDraft.contactPhoneLabel}: ${c.phone}` : null,
    ].filter(Boolean).join("\n");

    const fullBody = includeContact && contactLines
      ? `${body}\n\n---\n${t.emailDraft.contactHeader}\n${contactLines}`
      : body;

    const url = `mailto:${encodeURIComponent(toValue)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`;
    window.location.href = url;
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    fontFamily: "var(--font-body)", fontSize: "15px",
    border: "1.5px solid var(--border)", borderRadius: "8px",
    background: "var(--bg)", color: "var(--text-primary)",
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "700",
    textTransform: "uppercase", letterSpacing: "0.07em",
    color: "var(--text-muted)", display: "block", marginBottom: "6px",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)", borderRadius: "16px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          width: "100%", maxWidth: "640px",
          maxHeight: "92vh", overflowY: "auto",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "24px 28px 20px",
          borderBottom: "1px solid var(--border)",
          position: "sticky", top: 0, background: "var(--surface)", zIndex: 1,
        }}>
          <div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "18px", fontWeight: "700", color: "var(--navy)", margin: 0 }}>
              {t.emailDraft.title}
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)", margin: "3px 0 0" }}>
              {c.fullName} → {position.client}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "var(--text-muted)", lineHeight: 1, padding: "4px 8px", borderRadius: "6px" }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "18px" }}>

          {loading && (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-muted)", textAlign: "center", padding: "32px 0" }}>
              {t.emailDraft.drafting}
            </p>
          )}

          {error && (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--coral)", textAlign: "center", padding: "32px 0" }}>
              {error}
            </p>
          )}

          {!loading && !error && (
            <>
              {/* To */}
              <div>
                <label style={labelStyle}>{t.emailDraft.to}</label>
                <input
                  type="text"
                  value={toValue}
                  onChange={(e) => setToValue(e.target.value)}
                  placeholder={t.emailDraft.toPlaceholder}
                  style={inputStyle}
                />
              </div>

              {/* Subject */}
              <div>
                <label style={labelStyle}>{t.emailDraft.subject}</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Body */}
              <div>
                <label style={labelStyle}>{t.emailDraft.body}</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: "1.65" }}
                />
              </div>

              {/* Contact info block (shown when toggle on) */}
              {includeContact && (c.email || c.phone) && (
                <div style={{
                  padding: "12px 16px",
                  background: "var(--bg)", border: "1.5px solid var(--border)",
                  borderRadius: "8px",
                  fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-secondary)",
                  lineHeight: "1.7",
                }}>
                  <p style={{ margin: "0 0 4px", fontWeight: "600", color: "var(--text-muted)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t.emailDraft.contactHeader}
                  </p>
                  {c.email && <p style={{ margin: 0 }}>{t.emailDraft.contactEmailLabel}: {c.email}</p>}
                  {c.phone && <p style={{ margin: 0 }}>{t.emailDraft.contactPhoneLabel}: {c.phone}</p>}
                </div>
              )}

              {/* Include contact toggle */}
              {(c.email || c.phone) && (
                <label style={{
                  display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
                  fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-secondary)",
                }}>
                  <input
                    type="checkbox"
                    checked={includeContact}
                    onChange={(e) => setIncludeContact(e.target.checked)}
                    style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--steel)" }}
                  />
                  {t.emailDraft.includeContact}
                </label>
              )}

              {/* CV note */}
              <div style={{
                padding: "12px 16px",
                background: "#FFF8E6", border: "1.5px solid #F5C842",
                borderRadius: "8px",
                fontFamily: "var(--font-body)", fontSize: "14px", color: "#8A6800",
              }}>
                📎 {cvFilename ? t.emailDraft.cvNote(cvFilename) : t.emailDraft.cvNoteNoFile}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div style={{
            padding: "16px 28px 24px",
            borderTop: "1px solid var(--border)",
            display: "flex", gap: "10px",
            position: "sticky", bottom: 0, background: "var(--surface)", zIndex: 1,
          }}>
            <button
              onClick={onClose}
              style={{
                flex: "0 0 auto", padding: "12px 22px",
                border: "1.5px solid var(--border)", borderRadius: "9px",
                background: "var(--surface)", color: "var(--text-secondary)",
                fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {t.emailDraft.cancel}
            </button>
            <button
              onClick={handleOpenOutlook}
              style={{
                flex: 1, padding: "12px 22px",
                border: "none", borderRadius: "9px",
                background: "var(--steel)", color: "#fff",
                fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: "600",
                cursor: "pointer", transition: "opacity 150ms ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              ✉ {t.emailDraft.openOutlook}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Tinder-style queue modal ── */
function QueueModal({ match, positionId, total, current, slideOut, t, onClose, onReview }: {
  match: Match;
  positionId: number;
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
              fontFamily: "var(--font-body)", fontWeight: "700", fontSize: "20px",
              color: "var(--navy)",
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link
                href={`/candidates/${c.id}`}
                onClick={onClose}
                style={{ fontFamily: "var(--font-body)", fontSize: "22px", fontWeight: "600", color: "var(--navy)", textDecoration: "none", display: "block" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--steel)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--navy)"; }}
              >
                {c.fullName}
              </Link>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-muted)", margin: "4px 0 8px" }}>
                {[c.currentTitle, c.yearsExperience != null && `${t.yrsExp(c.yearsExperience)} ${t.experience.toLowerCase()}`].filter(Boolean).join(" · ")}
              </p>
              <span style={{
                fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: "700",
                letterSpacing: "0.07em", textTransform: "uppercase",
                color: c.appliedPositionId === positionId ? "var(--strong)" : "var(--steel)",
                background: c.appliedPositionId === positionId ? "var(--strong-bg)" : "var(--steel-light)",
                padding: "2px 7px", borderRadius: "4px", display: "inline-block",
              }}>
                {c.appliedPositionId === positionId ? t.appliedBadge : t.poolBadge}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
              <span style={{
                fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600",
                color: cfg.color, background: cfg.bg,
                padding: "5px 14px", borderRadius: "6px",
                textTransform: "uppercase", letterSpacing: "0.03em",
              }}>
                {cfg.label}
              </span>
              {total > 1 && (
                <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
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
                <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "10px" }}>
                  {t.whyFit}
                </p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", lineHeight: "1.75", color: "var(--text-primary)", background: `${cfg.bg}99`, border: `1px solid ${cfg.color}22`, borderRadius: "10px", padding: "16px 18px", margin: 0 }}>
                  {explanation}
                </p>
              </div>
            )}
            {summary && (
              <div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "10px" }}>
                  {t.summary}
                </p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", lineHeight: "1.75", color: "var(--text-secondary)", margin: 0 }}>
                  {summary}
                </p>
              </div>
            )}
            {skills.length > 0 && (
              <div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "10px" }}>
                  {t.skills}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {skills.map((s) => (
                    <span key={s} style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-primary)", background: "var(--bg)", border: "1.5px solid var(--border)", padding: "6px 14px", borderRadius: "8px" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(c.email || c.phone || c.location || c.jobSourceUrl) && (
              <div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "10px" }}>
                  {t.contact}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {c.location    && <span style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "var(--text-secondary)" }}>📍 {c.location}</span>}
                  {c.email       && <a href={`mailto:${c.email}`} style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "var(--steel)", textDecoration: "none" }}>✉ {c.email}</a>}
                  {c.phone       && <a href={`tel:${c.phone}`}   style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "var(--steel)", textDecoration: "none" }}>📞 {c.phone}</a>}
                  {c.jobSourceUrl && <a href={c.jobSourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "var(--steel)", textDecoration: "none" }}>🔗 {t.jobSourceLink}</a>}
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
                fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: "600",
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
                fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: "600",
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

type ClientOption = { id: number; name: string; tagline: string | null; industry: string | null };

function ClientDropdown({ value, onSave }: {
  value: string;
  onSave: (name: string, clientId: number | null) => void;
}) {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [active,  setActive]  = useState(-1);
  const rootRef   = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const fetchClients = async () => {
    if (clients.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) setClients(await res.json());
    } finally { setLoading(false); }
  };

  const openDropdown = () => {
    setOpen(true);
    setQuery("");
    setActive(-1);
    fetchClients();
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const close = () => { setOpen(false); setQuery(""); setActive(-1); };

  const select = (c: ClientOption) => {
    onSave(c.name, c.id);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = query.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : clients;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && active >= 0 && filtered[active]) { select(filtered[active]); }
    if (e.key === "Escape") close();
  };

  const initials = (name: string) =>
    name.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
      {/* Trigger */}
      <button
        onClick={openDropdown}
        style={{
          background: "none", border: "none", padding: 0, cursor: "pointer",
          display: "flex", alignItems: "center", gap: "6px",
          fontFamily: "var(--font-body)", fontSize: "16px",
          color: "var(--text-secondary)", textAlign: "start",
        }}
      >
        <span>{value}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}>
          <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            insetInlineStart: 0,
            zIndex: 200,
            width: "280px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          {/* Search input */}
          <div style={{
            padding: "10px 12px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setActive(-1); }}
              onKeyDown={onKeyDown}
              placeholder="Search clients…"
              style={{
                flex: 1, border: "none", outline: "none", background: "none",
                fontFamily: "var(--font-body)", fontSize: "13px",
                color: "var(--navy)",
              }}
            />
          </div>

          {/* List */}
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {loading ? (
              <p style={{
                padding: "16px", textAlign: "center",
                fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)",
              }}>
                Loading…
              </p>
            ) : filtered.length === 0 ? (
              <p style={{
                padding: "16px", textAlign: "center",
                fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)",
              }}>
                No clients found
              </p>
            ) : filtered.map((c, i) => (
              <button
                key={c.id}
                onMouseDown={() => select(c)}
                onMouseEnter={() => setActive(i)}
                style={{
                  width: "100%", padding: "9px 12px", border: "none", cursor: "pointer",
                  background: i === active ? "var(--bg)" : "none",
                  display: "flex", alignItems: "center", gap: "10px", textAlign: "start",
                  transition: "background 100ms ease",
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: "30px", height: "30px", borderRadius: "7px", flexShrink: 0,
                  background: "linear-gradient(135deg, var(--navy) 0%, var(--steel) 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "10px", fontWeight: "700", color: "#fff",
                  letterSpacing: "0.03em",
                }}>
                  {initials(c.name)}
                </div>
                {/* Text */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "500",
                    color: c.name === value ? "var(--strong)" : "var(--navy)",
                  }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1, direction: "ltr", textAlign: "start" }}>
                      {c.name}
                    </span>
                    {c.name === value && (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M2 6L5 9L10 3" stroke="var(--strong)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  {(c.tagline || c.industry) && (
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: "11px",
                      color: "var(--text-muted)", whiteSpace: "nowrap",
                      overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {c.tagline || c.industry}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
