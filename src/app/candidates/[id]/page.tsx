"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";

type PositionRef = { id: number; title: string; client: string; status: string };

type MatchWithPosition = {
  id: number;
  strength: "strong" | "possible" | "weak";
  explanation: string | null;
  explanationHe: string | null;
  candidateStatus: "open" | "client_review" | "interview" | "hired" | "rejected";
  position: PositionRef;
};

type Candidate = {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  currentTitle: string | null;
  yearsExperience: number | null;
  skills: string | null;
  industries: string | null;
  location: string | null;
  summary: string | null;
  summaryHe: string | null;
  cvPath: string | null;
  source: "jobmaster" | "manual" | "website";
  createdAt: string;
  updatedAt: string;
  matches: MatchWithPosition[];
};

const STRENGTH_CFG = {
  strong:   { color: "var(--strong)",   bg: "var(--strong-bg)"   },
  possible: { color: "var(--possible)", bg: "var(--possible-bg)" },
  weak:     { color: "var(--fog)",      bg: "var(--light-gray)"  },
};

const CANDIDATE_STATUS_CFG: Record<string, { color: string; bg: string }> = {
  open:          { color: "var(--text-muted)", bg: "var(--bg)"          },
  client_review: { color: "var(--possible)",   bg: "var(--possible-bg)" },
  interview:     { color: "var(--steel)",      bg: "var(--steel-light)" },
  hired:         { color: "#1A6B4A",           bg: "#E0F2EB"            },
  rejected:      { color: "var(--fog)",        bg: "var(--light-gray)"  },
};

const SOURCE_COLORS: Record<string, { color: string; bg: string }> = {
  manual:    { color: "var(--text-muted)", bg: "var(--light-gray)"  },
  jobmaster: { color: "var(--steel)",      bg: "var(--steel-light)" },
  linkedin:  { color: "#0A66C2",           bg: "#E8F3FF"            },
  website:   { color: "#7C3AED",           bg: "#EDE9FE"            },
};

export default function CandidateDetailPage() {
  const { id } = useParams();
  const { lang } = useLang();
  const t  = translations[lang].candidates;
  const td = translations[lang].detail;

  const [candidate, setCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    fetch(`/api/candidates/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setCandidate);
  }, [id]);

  if (!candidate) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh", color: "var(--text-muted)", fontSize: "16px" }}>
        Loading…
      </div>
    );
  }

  const skills: string[]     = candidate.skills     ? JSON.parse(candidate.skills)     : [];
  const industries: string[] = candidate.industries ? JSON.parse(candidate.industries) : [];
  const initials = candidate.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const diffMs   = Date.now() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return lang === "he" ? "היום" : "Today";
    if (diffDays === 1) return lang === "he" ? "אתמול" : "Yesterday";
    if (diffDays < 30)  return lang === "he" ? `לפני ${diffDays} ימים` : `${diffDays} days ago`;
    return d.toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  };
  const srcCfg   = SOURCE_COLORS[candidate.source] ?? SOURCE_COLORS.manual;
  const srcLabel = t.sourceLabels[candidate.source] ?? candidate.source;

  const STRENGTH_ORDER = { strong: 0, possible: 1, weak: 2 };
  const activeMatches   = candidate.matches
    .filter((m) => m.candidateStatus !== "rejected" && m.strength !== "weak")
    .sort((a, b) => STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength]);
  const rejectedMatches = candidate.matches.filter((m) => m.candidateStatus === "rejected");

  return (
    <div style={{ maxWidth: "860px" }}>
      {/* ── Back link ── */}
      <Link
        href="/candidates"
        style={{
          direction: "ltr" as const,
          display: "inline-flex", alignItems: "center", gap: "6px",
          color: "var(--text-muted)", fontSize: "14px", textDecoration: "none",
          marginBottom: "20px", fontFamily: "var(--font-body)",
          transition: "color 140ms ease",
        }}
      >
        {t.back}
      </Link>

      {/* ── Profile header card ── */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "28px 32px 24px", marginBottom: "12px",
      }}>
        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", marginBottom: "20px" }}>
          {/* Avatar */}
          <div style={{
            width: "60px", height: "60px", borderRadius: "50%", flexShrink: 0,
            background: "var(--navy-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-body)", fontWeight: "700", fontSize: "20px",
            color: "var(--navy)",
          }}>
            {initials}
          </div>

          {/* Name + title + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontFamily: "var(--font-body)", fontSize: "24px", fontWeight: "600",
              color: "var(--navy)", letterSpacing: "-0.3px", marginBottom: "4px",
            }}>
              {candidate.fullName}
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-secondary)", marginBottom: "8px" }}>
              {candidate.currentTitle ?? "—"}
              {candidate.yearsExperience != null && (
                <span style={{ color: "var(--text-muted)", marginInlineStart: "8px" }}>
                  · {t.yrsExp(candidate.yearsExperience)} {t.experience.toLowerCase()}
                </span>
              )}
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              {candidate.location && (
                <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>
                  📍 {candidate.location}
                </span>
              )}
              <span style={{
                fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "4px",
                color: srcCfg.color, background: srcCfg.bg,
                fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.04em",
              }}>
                {srcLabel}
              </span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                {t.updatedAt}: {fmtDate(candidate.updatedAt)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
            {candidate.cvPath && (
              <a
                href={`/api/candidates/${candidate.id}/cv`}
                download
                style={{
                  display: "inline-block", padding: "9px 18px",
                  background: "var(--surface)", border: "1.5px solid var(--border)",
                  borderRadius: "8px", color: "var(--text-secondary)",
                  fontSize: "13px", fontWeight: "500",
                  textDecoration: "none", fontFamily: "var(--font-body)",
                  transition: "border-color 140ms ease, color 140ms ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--coral)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--coral)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)";
                }}
              >
                ⬇ {t.downloadCV}
              </a>
            )}
          </div>
        </div>

        {/* Contact row */}
        {(candidate.email || candidate.phone) && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <p style={{
              fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: "600",
              textTransform: "uppercase", letterSpacing: "0.06em",
              color: "var(--text-muted)", marginBottom: "8px",
            }}>
              {t.contact}
            </p>
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}`}
                  style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--steel)", textDecoration: "none" }}
                >
                  ✉ {candidate.email}
                </a>
              )}
              {candidate.phone && (
                <a
                  href={`tel:${candidate.phone}`}
                  style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--steel)", textDecoration: "none" }}
                >
                  📞 {candidate.phone}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "12px", alignItems: "start" }}>

        {/* ── LEFT: Summary + Skills + Industries ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Summary */}
          {((lang === "he" ? candidate.summaryHe : null) ?? candidate.summary) && (
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "12px", padding: "24px 28px",
            }}>
              <h3 style={{
                fontFamily: "var(--font-body)", fontSize: "18px", fontWeight: "600",
                color: "var(--navy)", marginBottom: "14px",
              }}>
                {t.summary}
              </h3>
              <p style={{
                fontFamily: "var(--font-body)", fontSize: "15px",
                lineHeight: "1.75", color: "var(--text-primary)", whiteSpace: "pre-wrap",
              }}>
                {(lang === "he" ? candidate.summaryHe : null) ?? candidate.summary}
              </p>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "12px", padding: "24px 28px",
            }}>
              <h3 style={{
                fontFamily: "var(--font-body)", fontSize: "18px", fontWeight: "600",
                color: "var(--navy)", marginBottom: "14px",
              }}>
                {t.skills}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {skills.map((s) => (
                  <span key={s} style={{
                    fontFamily: "var(--font-body)", fontSize: "13px",
                    color: "var(--text-primary)", background: "var(--bg)",
                    border: "1.5px solid var(--border)", padding: "5px 12px",
                    borderRadius: "6px",
                  }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Industries */}
          {industries.length > 0 && (
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "12px", padding: "24px 28px",
            }}>
              <h3 style={{
                fontFamily: "var(--font-body)", fontSize: "18px", fontWeight: "600",
                color: "var(--navy)", marginBottom: "14px",
              }}>
                {t.industries}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {industries.map((ind) => (
                  <span key={ind} style={{
                    fontFamily: "var(--font-body)", fontSize: "13px",
                    color: "var(--steel)", background: "var(--steel-light)",
                    border: "1px solid var(--steel)22", padding: "5px 12px",
                    borderRadius: "6px",
                  }}>
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Matched roles ── */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "12px", overflow: "hidden",
        }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{
              fontFamily: "var(--font-body)", fontSize: "16px", fontWeight: "600",
              color: "var(--navy)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              {t.matchedRoles}
              <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "400", color: "var(--text-muted)" }}>
                {activeMatches.length}
              </span>
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {activeMatches.length === 0 && (
              <div style={{ padding: "28px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                {t.noMatches}
              </div>
            )}

            {activeMatches.map((m, i) => {
              const strCfg    = STRENGTH_CFG[m.strength];
              const statuCfg  = CANDIDATE_STATUS_CFG[m.candidateStatus] ?? CANDIDATE_STATUS_CFG.open;
              const isLast    = i === activeMatches.length - 1 && rejectedMatches.length === 0;
              return (
                <MatchRow
                  key={m.id}
                  match={m}
                  strCfg={strCfg}
                  statusCfg={statuCfg}
                  statusLabel={td.candidateStatus[m.candidateStatus]}
                  strengthLabel={td.strengthLabel[m.strength]}
                  last={isLast}
                />
              );
            })}

            {/* Rejected */}
            {rejectedMatches.length > 0 && (
              <div style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--border)",
                fontFamily: "var(--font-body)", fontSize: "13px",
                color: "var(--text-muted)", textAlign: "center",
              }}>
                {td.rejected(rejectedMatches.length)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchRow({
  match, strCfg, statusCfg, statusLabel, strengthLabel, last,
}: {
  match: MatchWithPosition;
  strCfg: { color: string; bg: string };
  statusCfg: { color: string; bg: string };
  statusLabel: string;
  strengthLabel: string;
  last: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { lang } = useLang();
  const explanation = (lang === "he" ? match.explanationHe : null) ?? match.explanation;

  return (
    <div style={{ borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "14px 20px", cursor: "pointer",
          display: "flex", flexDirection: "column", gap: "6px",
          transition: "background 130ms ease",
        }}
        onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.02)"}
        onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link
            href={`/positions/${match.position.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1, minWidth: 0,
              fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600",
              color: "var(--navy)", textDecoration: "none",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {match.position.title}
          </Link>
          <span style={{ color: "var(--text-muted)", fontSize: "10px", transition: "transform 150ms ease", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
            ▼
          </span>
        </div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-secondary)" }}>
          {match.position.client}
        </p>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <span style={{
            fontSize: "11px", fontWeight: "600", padding: "2px 7px", borderRadius: "4px",
            color: strCfg.color, background: strCfg.bg,
            fontFamily: "var(--font-body)",
          }}>
            {strengthLabel}
          </span>
          {match.candidateStatus !== "open" && (
            <span style={{
              fontSize: "11px", fontWeight: "600", padding: "2px 7px", borderRadius: "4px",
              color: statusCfg.color, background: statusCfg.bg,
              fontFamily: "var(--font-body)",
            }}>
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      {expanded && explanation && (
        <div style={{
          padding: "0 20px 14px",
          borderTop: "1px solid var(--border)",
        }}>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: "13px",
            lineHeight: "1.6", color: "var(--text-secondary)",
            paddingTop: "12px",
          }}>
            {explanation}
          </p>
          <Link
            href={`/positions/${match.position.id}`}
            style={{
              display: "inline-block", marginTop: "8px",
              fontFamily: "var(--font-body)", fontSize: "12px",
              color: "var(--steel)", textDecoration: "none",
            }}
          >
            View position →
          </Link>
        </div>
      )}
    </div>
  );
}
