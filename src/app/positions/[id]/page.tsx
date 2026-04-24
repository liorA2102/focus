"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Candidate = {
  id: number;
  fullName: string;
  currentTitle: string | null;
  location: string | null;
  summary: string | null;
  skills: string | null;
  source: "jobmaster" | "linkedin" | "manual";
};

type Match = {
  id: number;
  strength: "strong" | "possible" | "weak";
  explanation: string | null;
  clientRequested: boolean;
  hired: boolean;
  rejected: boolean;
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
  status: "open" | "in_review" | "offer_sent" | "filled" | "closed";
  matches: Match[];
};

const STRENGTH_CONFIG = {
  strong: { label: "Strong Match", color: "var(--strong)", bg: "var(--strong-bg)" },
  possible: { label: "Possible Match", color: "var(--possible)", bg: "var(--possible-bg)" },
  weak: { label: "Weak Match", color: "var(--weak)", bg: "var(--weak-bg)" },
};

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_review", label: "In Review" },
  { value: "offer_sent", label: "Offer Sent" },
  { value: "filled", label: "Filled" },
  { value: "closed", label: "Closed" },
];

export default function PositionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [position, setPosition] = useState<Position | null>(null);
  const [showWeak, setShowWeak] = useState(false);
  const [updatingMatch, setUpdatingMatch] = useState<number | null>(null);

  const fetchPosition = async () => {
    const res = await fetch(`/api/positions/${id}`);
    if (res.ok) setPosition(await res.json());
  };

  useEffect(() => {
    fetchPosition();
  }, [id]);

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
      <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "18px" }}>
        Loading...
      </div>
    );
  }

  const activeMatches = position.matches.filter((m) => !m.rejected && m.strength !== "weak");
  const weakMatches = position.matches.filter((m) => !m.rejected && m.strength === "weak");
  const rejectedMatches = position.matches.filter((m) => m.rejected);

  return (
    <div>
      {/* Back */}
      <Link
        href="/positions"
        style={{ color: "var(--text-muted)", fontSize: "15px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "24px" }}
      >
        ← Back to Positions
      </Link>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h2 style={{ fontSize: "34px", margin: "0 0 6px" }}>{position.title}</h2>
          <p style={{ fontSize: "18px", color: "var(--text-secondary)", margin: "0 0 12px" }}>{position.client}</p>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {position.location && <span style={{ fontSize: "15px", color: "var(--text-muted)" }}>📍 {position.location}</span>}
            {position.salaryRange && <span style={{ fontSize: "15px", color: "var(--text-muted)" }}>💰 {position.salaryRange}</span>}
          </div>
        </div>

        {/* Status selector */}
        <select
          value={position.status}
          onChange={(e) => updateStatus(e.target.value)}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            fontSize: "15px",
            fontFamily: "inherit",
            color: "var(--text-primary)",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "32px", alignItems: "start" }}>
        {/* Candidates column */}
        <div>
          <h3 style={{ fontSize: "22px", margin: "0 0 20px", color: "var(--text-primary)" }}>
            Candidates
            <span style={{ fontSize: "16px", color: "var(--text-muted)", fontFamily: "DM Sans, sans-serif", fontWeight: "400", marginLeft: "10px" }}>
              {activeMatches.length} matched
            </span>
          </h3>

          {activeMatches.length === 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "16px" }}>
              No candidates matched yet
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {activeMatches.map((match) => (
              <CandidateCard
                key={match.id}
                match={match}
                updating={updatingMatch === match.id}
                onClientRequested={() => updateMatch(match.id, { clientRequested: !match.clientRequested })}
                onHired={() => updateMatch(match.id, { hired: true })}
                onReject={() => updateMatch(match.id, { rejected: true })}
              />
            ))}
          </div>

          {/* Weak matches toggle */}
          {weakMatches.length > 0 && (
            <div style={{ marginTop: "24px" }}>
              <button
                onClick={() => setShowWeak(!showWeak)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "15px",
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "inherit",
                }}
              >
                {showWeak ? "▲" : "▼"} {showWeak ? "Hide" : "Show"} {weakMatches.length} weak match{weakMatches.length !== 1 ? "es" : ""}
              </button>
              {showWeak && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                  {weakMatches.map((match) => (
                    <CandidateCard
                      key={match.id}
                      match={match}
                      updating={updatingMatch === match.id}
                      onClientRequested={() => updateMatch(match.id, { clientRequested: !match.clientRequested })}
                      onHired={() => updateMatch(match.id, { hired: true })}
                      onReject={() => updateMatch(match.id, { rejected: true })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rejected */}
          {rejectedMatches.length > 0 && (
            <p style={{ marginTop: "20px", color: "var(--text-muted)", fontSize: "14px" }}>
              {rejectedMatches.length} candidate{rejectedMatches.length !== 1 ? "s" : ""} rejected
            </p>
          )}
        </div>

        {/* Job details sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {position.description && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
              <h4 style={{ margin: "0 0 10px", color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "13px" }}>
                Description
              </h4>
              <p style={{ margin: 0, fontSize: "15px", color: "var(--text-primary)", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
                {position.description}
              </p>
            </div>
          )}
          {position.requirements && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
              <h4 style={{ margin: "0 0 10px", fontFamily: "DM Sans, sans-serif", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "13px", color: "var(--text-secondary)" }}>
                Requirements
              </h4>
              <p style={{ margin: 0, fontSize: "15px", color: "var(--text-primary)", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
                {position.requirements}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CandidateCard({
  match,
  updating,
  onClientRequested,
  onHired,
  onReject,
}: {
  match: Match;
  updating: boolean;
  onClientRequested: () => void;
  onHired: () => void;
  onReject: () => void;
}) {
  const cfg = STRENGTH_CONFIG[match.strength];
  const skills: string[] = match.candidate.skills ? JSON.parse(match.candidate.skills) : [];

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${match.clientRequested ? "var(--accent)" : match.hired ? "var(--gold)" : "var(--border)"}`,
        borderRadius: "14px",
        padding: "20px 24px",
        opacity: updating ? 0.6 : 1,
        transition: "opacity 0.15s",
        position: "relative",
      }}
    >
      {/* Hired banner */}
      {match.hired && (
        <div style={{ position: "absolute", top: "-1px", right: "20px", background: "var(--gold)", color: "#fff", fontSize: "12px", fontWeight: "700", padding: "3px 10px", borderRadius: "0 0 8px 8px" }}>
          HIRED
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>
            {match.candidate.fullName}
          </p>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
            {match.candidate.currentTitle}
            {match.candidate.location && ` · ${match.candidate.location}`}
          </p>
        </div>
        <span style={{ fontSize: "13px", fontWeight: "600", color: cfg.color, background: cfg.bg, padding: "4px 10px", borderRadius: "6px", whiteSpace: "nowrap" }}>
          {cfg.label}
        </span>
      </div>

      {match.explanation && (
        <p style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
          {match.explanation}
        </p>
      )}

      {skills.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
          {skills.slice(0, 5).map((s) => (
            <span key={s} style={{ fontSize: "13px", color: "var(--text-muted)", background: "var(--bg)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: "4px" }}>
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      {!match.hired && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <ActionButton
            active={match.clientRequested}
            onClick={onClientRequested}
            activeColor="var(--accent)"
            activeBg="var(--accent-light)"
          >
            {match.clientRequested ? "✓ Client Requested" : "Client Requested"}
          </ActionButton>
          <ActionButton onClick={onHired} color="var(--gold)">
            Mark as Hired
          </ActionButton>
          <ActionButton onClick={onReject} color="var(--danger)">
            Reject
          </ActionButton>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  active,
  activeColor,
  activeBg,
  color,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  activeColor?: string;
  activeBg?: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: "8px",
        border: `1px solid ${active ? activeColor : "var(--border)"}`,
        background: active ? activeBg : "transparent",
        color: active ? activeColor : color ?? "var(--text-secondary)",
        fontSize: "14px",
        fontWeight: active ? "600" : "400",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.12s",
      }}
    >
      {children}
    </button>
  );
}
