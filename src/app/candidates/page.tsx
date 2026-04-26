"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";

type PositionMatch = {
  id: number;
  strength: "strong" | "possible" | "weak";
  candidateStatus: "open" | "client_review" | "interview" | "hired" | "rejected";
  position: { id: number; title: string; client: string };
};

type Candidate = {
  id: number;
  fullName: string;
  currentTitle: string | null;
  yearsExperience: number | null;
  skills: string | null;
  location: string | null;
  source: "jobmaster" | "linkedin" | "manual";
  createdAt: string;
  matches: PositionMatch[];
};

type UploadItem = {
  id: string;
  fileName: string;
  state: "uploading" | "done" | "error";
  matchedPositions?: number;
};

const SOURCE_COLORS: Record<string, { color: string; bg: string }> = {
  manual:    { color: "var(--text-muted)", bg: "var(--light-gray)"  },
  jobmaster: { color: "var(--steel)",      bg: "var(--steel-light)" },
  linkedin:  { color: "#0A66C2",           bg: "#E8F3FF"            },
};

export default function CandidatesPage() {
  const { lang } = useLang();
  const t = translations[lang].candidates;

  const [candidates, setCandidates]   = useState<Candidate[]>([]);
  const [loaded, setLoaded]           = useState(false);
  const [query, setQuery]             = useState("");
  const [debouncedQuery, setDebounced] = useState("");
  const [uploads, setUploads]         = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging]   = useState(false);

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Fetch candidates on load and search
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const qs = debouncedQuery ? `?q=${encodeURIComponent(debouncedQuery)}` : "";
        const res = await fetch(`/api/candidates${qs}`);
        if (res.ok && alive) setCandidates(await res.json());
      } finally {
        if (alive) setLoaded(true);
      }
    };
    load();
    return () => { alive = false; };
  }, [debouncedQuery]);

  // Upload a single file
  const uploadFile = async (file: File) => {
    const uid = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setUploads((prev) => [...prev, { id: uid, fileName: file.name, state: "uploading" }]);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/candidates/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUploads((prev) =>
        prev.map((u) => u.id === uid ? { ...u, state: "done", matchedPositions: data.matchedPositions } : u)
      );
      // Refresh list
      const qs  = debouncedQuery ? `?q=${encodeURIComponent(debouncedQuery)}` : "";
      const res2 = await fetch(`/api/candidates${qs}`);
      if (res2.ok) setCandidates(await res2.json());
    } catch {
      setUploads((prev) => prev.map((u) => u.id === uid ? { ...u, state: "error" } : u));
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  };

  const dismissUpload = (uid: string) =>
    setUploads((prev) => prev.filter((u) => u.id !== uid));

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px" }}>
        <div>
          <div className="accent-rule" style={{ marginBottom: "12px" }} />
          <h2 style={{
            fontFamily: "'Poppins', sans-serif", fontSize: "32px", fontWeight: "700",
            letterSpacing: "-0.5px", color: "var(--navy)", lineHeight: 1,
          }}>
            {t.title}
          </h2>
          {loaded && (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
              {candidates.length} {t.title.toLowerCase()}
            </p>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
          {t.uploadBtn}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* ── Drop zone ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? "var(--coral)" : "var(--border)"}`,
          borderRadius: "12px",
          padding: "28px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: isDragging ? "var(--coral-light)" : "var(--surface)",
          transition: "all 150ms var(--ease-out)",
          marginBottom: uploads.length > 0 ? "10px" : "24px",
          userSelect: "none",
        }}
      >
        <p style={{
          fontFamily: "'Inter', sans-serif", fontSize: "15px", fontWeight: "500",
          color: isDragging ? "var(--coral)" : "var(--text-secondary)", marginBottom: "4px",
        }}>
          {t.dropzone}
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--text-muted)" }}>
          {t.dropzoneSub}
        </p>
      </div>

      {/* ── Upload progress items ── */}
      {uploads.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "24px" }}>
          {uploads.map((u) => (
            <div
              key={u.id}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 14px",
                background: "var(--surface)",
                border: `1px solid ${u.state === "error" ? "var(--coral)" : u.state === "done" ? "#1A6B4A44" : "var(--border)"}`,
                borderRadius: "8px",
                fontFamily: "'Inter', sans-serif", fontSize: "13px",
              }}
            >
              <span style={{ fontSize: "16px", flexShrink: 0 }}>
                {u.state === "uploading" ? "⏳" : u.state === "done" ? "✅" : "❌"}
              </span>
              <span style={{
                flex: 1, color: "var(--text-primary)", fontWeight: "500",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {u.fileName}
              </span>
              <span style={{
                color: u.state === "error" ? "var(--coral)" : u.state === "done" ? "#1A6B4A" : "var(--text-muted)",
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {u.state === "uploading"
                  ? t.processing
                  : u.state === "done"
                    ? (u.matchedPositions !== undefined ? t.matched(u.matchedPositions) : t.parsed)
                    : t.failedParse}
              </span>
              {u.state !== "uploading" && (
                <button
                  onClick={() => dismissUpload(u.id)}
                  style={{
                    background: "none", border: "none", color: "var(--text-muted)",
                    fontSize: "16px", cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Search bar ── */}
      <div style={{ position: "relative", marginBottom: "24px" }}>
        <span style={{
          position: "absolute", insetInlineStart: "14px",
          top: "50%", transform: "translateY(-50%)",
          color: "var(--text-muted)", fontSize: "15px",
          pointerEvents: "none",
        }}>
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          style={{
            width: "100%", boxSizing: "border-box",
            paddingTop: "11px", paddingBottom: "11px",
          paddingInlineStart: "42px", paddingInlineEnd: "40px",
            fontFamily: "'Inter', sans-serif", fontSize: "14px",
            color: "var(--text-primary)",
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: "10px", outline: "none",
            transition: "border-color 150ms ease, box-shadow 150ms ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--coral)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232,80,58,0.10)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{
              position: "absolute", insetInlineEnd: "12px",
              top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none",
              color: "var(--text-muted)", fontSize: "18px",
              cursor: "pointer", padding: "2px", lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {!loaded ? null : candidates.length === 0 && !query ? (
        <EmptyPoolState t={t} onUpload={() => fileInputRef.current?.click()} />
      ) : candidates.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: "10px" }}>
          <div style={{ fontSize: "32px", opacity: 0.2 }}>◫</div>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: "600", color: "var(--text-secondary)" }}>
            {t.noResults}
          </p>
          <button
            onClick={() => setQuery("")}
            style={{
              marginTop: "4px", padding: "7px 18px", borderRadius: "20px",
              border: "1.5px solid var(--border)", background: "transparent",
              color: "var(--text-secondary)", fontSize: "13px", fontWeight: "500",
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
            }}
          >
            {t.clearSearch}
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          {candidates.map((c, i) => (
            <CandidateCard key={c.id} candidate={c} t={t} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

type CandidatesT = (typeof translations)[keyof typeof translations]["candidates"];

function EmptyPoolState({ t, onUpload }: { t: CandidatesT; onUpload: () => void }) {
  return (
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
        👤
      </div>
      <p style={{
        fontFamily: "'Poppins', sans-serif", fontSize: "20px", fontWeight: "700",
        color: "var(--navy)", letterSpacing: "-0.3px", marginTop: "4px",
      }}>
        {t.emptyTitle}
      </p>
      <p style={{
        fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "var(--text-muted)",
        maxWidth: "340px", textAlign: "center", lineHeight: "1.65",
      }}>
        {t.emptySubtitle}
      </p>
      <button
        className="btn btn-primary"
        style={{ marginTop: "8px", fontSize: "15px", padding: "12px 28px" }}
        onClick={onUpload}
      >
        {t.uploadBtn}
      </button>
    </div>
  );
}

function CandidateCard({ candidate: c, t, index }: { candidate: Candidate; t: CandidatesT; index: number }) {
  const skills: string[] = c.skills ? JSON.parse(c.skills) : [];
  const initials = c.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const activeMatches = c.matches.filter((m) => m.candidateStatus !== "rejected" && m.strength !== "weak");
  const srcCfg  = SOURCE_COLORS[c.source] ?? SOURCE_COLORS.manual;
  const srcLabel = t.sourceLabels[c.source] ?? c.source;

  return (
    <Link href={`/candidates/${c.id}`} style={{ textDecoration: "none" }}>
      <div
        className="card stagger-item"
        style={{ padding: "20px 22px", cursor: "pointer", animationDelay: `${index * 35}ms` }}
      >
        {/* Avatar + name + title */}
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "12px" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
            background: "var(--navy-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Poppins', sans-serif", fontWeight: "700", fontSize: "15px",
            color: "var(--navy)",
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: "600",
              color: "var(--text-primary)", marginBottom: "2px",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {c.fullName}
            </p>
            <p style={{
              fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--text-secondary)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {c.currentTitle ?? "—"}
              {c.yearsExperience != null && (
                <span style={{ color: "var(--text-muted)", marginInlineStart: "6px" }}>
                  · {t.yrsExp(c.yearsExperience)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Location */}
        {c.location && (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px" }}>
            📍 {c.location}
          </p>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "12px" }}>
            {skills.slice(0, 4).map((s) => (
              <span key={s} style={{
                fontSize: "12px", color: "var(--text-secondary)",
                background: "var(--bg)", border: "1px solid var(--border)",
                padding: "2px 8px", borderRadius: "4px",
                fontFamily: "'Inter', sans-serif",
              }}>
                {s}
              </span>
            ))}
            {skills.length > 4 && (
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "'Inter', sans-serif", padding: "2px 0" }}>
                +{skills.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Footer: source badge + match count */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          borderTop: "1px solid var(--border)", paddingTop: "10px",
        }}>
          <span style={{
            fontSize: "11px", fontWeight: "600", padding: "2px 7px", borderRadius: "4px",
            color: srcCfg.color, background: srcCfg.bg,
            fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            {srcLabel}
          </span>
          <span style={{ marginInlineStart: "auto", fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--text-muted)" }}>
            {activeMatches.length > 0 ? t.matched(activeMatches.length) : "—"}
          </span>
        </div>
      </div>
    </Link>
  );
}
