"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
  phone: string | null;
  location: string | null;
  source: "jobmaster" | "linkedin" | "manual" | "website";
  createdAt: string;
  matches: PositionMatch[];
};

type UploadItem = {
  id: string;
  fileName: string;
  state: "uploading" | "done" | "error" | "duplicate";
  matchedPositions?: number;
};

const SOURCE_CFG: Record<string, { color: string; bg: string; dot: string }> = {
  manual:    { color: "var(--text-muted)", bg: "var(--light-gray)",  dot: "#9CA3AF" },
  jobmaster: { color: "var(--steel)",      bg: "var(--steel-light)", dot: "var(--steel)" },
  linkedin:  { color: "#0A66C2",           bg: "#E8F3FF",            dot: "#0A66C2" },
  website:   { color: "#7C3AED",           bg: "#EDE9FE",            dot: "#7C3AED" },
};

export default function CandidatesPage() {
  const { lang } = useLang();
  const t = translations[lang].candidates;
  const isRtl = lang === "he";

  const [candidates, setCandidates]    = useState<Candidate[]>([]);
  const [loaded, setLoaded]            = useState(false);
  const [query, setQuery]              = useState("");
  const [debouncedQuery, setDebounced] = useState("");
  const [uploads, setUploads]          = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging]    = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

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

  const uploadFile = async (file: File) => {
    const uid = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setUploads(prev => [...prev, { id: uid, fileName: file.name, state: "uploading" }]);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/candidates/upload", { method: "POST", body: form });
      if (res.status === 409) {
        setUploads(prev => prev.map(u => u.id === uid ? { ...u, state: "duplicate" } : u));
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUploads(prev => prev.map(u => u.id === uid ? { ...u, state: "done", matchedPositions: data.matchedPositions } : u));
      const qs   = debouncedQuery ? `?q=${encodeURIComponent(debouncedQuery)}` : "";
      const res2 = await fetch(`/api/candidates${qs}`);
      if (res2.ok) setCandidates(await res2.json());
    } catch {
      setUploads(prev => prev.map(u => u.id === uid ? { ...u, state: "error" } : u));
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  };

  const dismissUpload = (uid: string) =>
    setUploads(prev => prev.filter(u => u.id !== uid));

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px" }}>
        <div>
          <div className="accent-rule" style={{ marginBottom: "10px" }} />
          <h2 style={{ fontFamily: "var(--font-body)", fontSize: "32px", fontWeight: 800, letterSpacing: "-0.5px", color: "var(--navy)", lineHeight: 1.1, margin: 0 }}>
            {t.title}
          </h2>
        </div>
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
          {t.uploadBtn}
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" multiple
          style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* ── Drop zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? "var(--coral)" : "var(--border)"}`,
          borderRadius: "12px", padding: "28px 24px", textAlign: "center",
          cursor: "pointer",
          background: isDragging ? "var(--coral-light)" : "var(--surface)",
          transition: "all 150ms var(--ease-out)",
          marginBottom: uploads.length > 0 ? "10px" : "24px",
          userSelect: "none",
        }}
      >
        <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: "500",
          color: isDragging ? "var(--coral)" : "var(--text-secondary)", marginBottom: "4px" }}>
          {t.dropzone}
        </p>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>
          {t.dropzoneSub}
        </p>
      </div>

      {/* ── Upload progress ── */}
      {uploads.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "24px" }}>
          {uploads.map(u => (
            <div key={u.id} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 14px", background: "var(--surface)",
              border: `1px solid ${u.state === "error" ? "var(--coral)" : u.state === "done" ? "#1A6B4A44" : u.state === "duplicate" ? "var(--possible-bg)" : "var(--border)"}`,
              borderRadius: "8px", fontFamily: "var(--font-body)", fontSize: "13px",
            }}>
              <span style={{ fontSize: "16px", flexShrink: 0 }}>
                {u.state === "uploading" ? "⏳" : u.state === "done" ? "✅" : u.state === "duplicate" ? "⚠️" : "❌"}
              </span>
              <span style={{ flex: 1, color: "var(--text-primary)", fontWeight: "500",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {u.fileName}
              </span>
              <span style={{ color: u.state === "error" ? "var(--coral)" : u.state === "done" ? "#1A6B4A" : u.state === "duplicate" ? "var(--possible)" : "var(--text-muted)",
                whiteSpace: "nowrap", flexShrink: 0 }}>
                {u.state === "uploading" ? t.processing
                  : u.state === "done" ? (u.matchedPositions !== undefined ? t.matched(u.matchedPositions) : t.parsed)
                  : u.state === "duplicate" ? t.alreadyExists
                  : t.failedParse}
              </span>
              {u.state !== "uploading" && (
                <button onClick={() => dismissUpload(u.id)} style={{
                  background: "none", border: "none", color: "var(--text-muted)",
                  fontSize: "16px", cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0,
                }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Search ── */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <span style={{
          position: "absolute", insetInlineStart: "14px", top: "50%", transform: "translateY(-50%)",
          color: "var(--text-muted)", fontSize: "15px", pointerEvents: "none",
        }}>🔍</span>
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          style={{
            width: "100%", boxSizing: "border-box",
            paddingTop: "11px", paddingBottom: "11px",
            paddingInlineStart: "42px", paddingInlineEnd: "40px",
            fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)",
            background: "var(--surface)", border: "1.5px solid var(--border)",
            borderRadius: "10px", outline: "none",
            transition: "border-color 150ms ease, box-shadow 150ms ease",
          }}
          onFocus={e => { e.currentTarget.style.borderColor = "var(--coral)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232,80,58,0.10)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{
            position: "absolute", insetInlineEnd: "12px", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", color: "var(--text-muted)",
            fontSize: "18px", cursor: "pointer", padding: "2px", lineHeight: 1,
          }}>×</button>
        )}
      </div>

      {/* ── Content ── */}
      {!loaded ? null : candidates.length === 0 && !query ? (
        <EmptyPoolState t={t} onUpload={() => fileInputRef.current?.click()} />
      ) : candidates.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: "10px" }}>
          <div style={{ fontSize: "32px", opacity: 0.2 }}>◫</div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", fontWeight: "600", color: "var(--text-secondary)" }}>
            {t.noResults}
          </p>
          <button onClick={() => setQuery("")} style={{
            marginTop: "4px", padding: "7px 18px", borderRadius: "20px",
            border: "1.5px solid var(--border)", background: "transparent",
            color: "var(--text-secondary)", fontSize: "13px", fontWeight: "500",
            cursor: "pointer", fontFamily: "var(--font-body)",
          }}>{t.clearSearch}</button>
        </div>
      ) : (
        <CandidateTable candidates={candidates} t={t} isRtl={isRtl} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Table
───────────────────────────────────────────── */
type CandidatesT = (typeof translations)[keyof typeof translations]["candidates"];

function CandidateTable({ candidates, t, isRtl }: { candidates: Candidate[]; t: CandidatesT; isRtl: boolean }) {
  const cols = [
    { key: "name",    label: isRtl ? "שם"     : "Name",    width: "minmax(180px,2fr)" },
    { key: "title",   label: isRtl ? "תפקיד"  : "Title",   width: "minmax(160px,2fr)" },
    { key: "matches", label: isRtl ? "התאמות" : "Matches", width: "minmax(80px,1fr)"  },
    { key: "source",  label: isRtl ? "מקור"   : "Source",  width: "minmax(100px,1fr)" },
    { key: "wa",      label: "",                            width: "50px"              },
  ];

  return (
    <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid var(--border)" }}>
    <div style={{
      background: "var(--surface)",
      minWidth: "520px",
    }}>
      {/* Header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: cols.map(c => c.width).join(" "),
        borderBottom: "2px solid var(--border)",
        background: "var(--bg)",
        position: "sticky", top: 0, zIndex: 1,
      }}>
        {cols.map(col => (
          <div key={col.key} style={{
            padding: "10px 14px",
            fontFamily: "var(--font-body)",
            fontSize: "11px", fontWeight: "700",
            textTransform: "uppercase", letterSpacing: "0.07em",
            color: "var(--text-muted)",
            borderInlineEnd: "1px solid var(--border)",
          }}>
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      {candidates.map((c, i) => (
        <CandidateRow key={c.id} candidate={c} t={t} even={i % 2 === 0} cols={cols} />
      ))}
    </div>
    </div>
  );
}

function waLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? "972" + digits.slice(1) : digits;
  return `https://wa.me/${normalized}`;
}

function CandidateRow({ candidate: c, t, even, cols }: {
  candidate: Candidate; t: CandidatesT; even: boolean;
  cols: { key: string; width: string }[];
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const activeMatches = c.matches.filter(m => m.candidateStatus !== "rejected" && m.strength !== "weak");
  const src           = SOURCE_CFG[c.source] ?? SOURCE_CFG.manual;
  const srcLabel      = t.sourceLabels[c.source] ?? c.source;
  const initials      = c.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const cellStyle = (key: string): React.CSSProperties => ({
    padding: "12px 14px",
    display: "flex", alignItems: "center",
    borderInlineEnd: "1px solid var(--border)",
    minWidth: 0,
    background: hovered
      ? "var(--bg)"
      : even ? "var(--surface)" : "color-mix(in srgb, var(--bg) 40%, var(--surface))",
    transition: "background 120ms ease",
    ...(key === "name" && hovered ? {
      boxShadow: "inset 3px 0 0 var(--navy)",
    } : {}),
  });

  return (
    <div
      onClick={() => router.push(`/candidates/${c.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: cols.map(col => col.width).join(" "),
        borderBottom: "1px solid var(--border)",
        cursor: "pointer",
      }}
    >
        {/* Name */}
        <div style={cellStyle("name")}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
            background: "var(--navy-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-body)", fontWeight: "700", fontSize: "10px",
            color: "var(--navy)", marginInlineEnd: "9px",
          }}>
            {initials}
          </div>
          <span style={{
            fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600",
            color: "var(--navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {c.fullName}
          </span>
        </div>

        {/* Title + exp */}
        <div style={cellStyle("title")}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--font-body)", fontSize: "13px",
              color: "var(--text-secondary)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {c.currentTitle ?? "—"}
            </div>
            {c.yearsExperience != null && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                {t.yrsExp(c.yearsExperience)}
              </div>
            )}
          </div>
        </div>

        {/* Matches */}
        <div style={{ ...cellStyle("matches"), justifyContent: "center" }}>
          {activeMatches.length > 0 ? (
            <span style={{
              fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "700",
              color: "var(--strong)",
              background: "var(--strong-bg)",
              padding: "2px 8px", borderRadius: "20px",
            }}>
              {activeMatches.length}
            </span>
          ) : (
            <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>—</span>
          )}
        </div>

        {/* Source */}
        <div style={cellStyle("source")}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            fontSize: "11px", fontWeight: "600", padding: "2px 7px", borderRadius: "4px",
            color: src.color, background: src.bg,
            fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: src.dot, flexShrink: 0 }} />
            {srcLabel}
          </span>
        </div>

        {/* WhatsApp */}
        <div style={{ ...cellStyle("wa"), borderInlineEnd: "none", justifyContent: "center", padding: "0" }}>
          {c.phone ? (
            <a
              href={waLink(c.phone)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title={c.phone}
              style={{
                width: "100%", height: "100%", minHeight: "44px",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: hovered ? "#25D366" : "var(--border)",
                transition: "color 150ms ease",
                textDecoration: "none",
              }}
            >
              <WhatsAppIcon />
            </a>
          ) : (
            <span style={{ color: "var(--border)", opacity: 0.3 }}>
              <WhatsAppIcon />
            </span>
          )}
        </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.557 4.122 1.526 5.855L.044 23.956l6.254-1.463A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.816 9.816 0 01-5.017-1.375l-.36-.214-3.713.869.936-3.41-.235-.374A9.816 9.816 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Empty state
───────────────────────────────────────────── */
function EmptyPoolState({ t, onUpload }: { t: CandidatesT; onUpload: () => void }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "80px 24px", background: "var(--surface)",
      border: "1.5px dashed var(--border)", borderRadius: "16px", gap: "12px",
    }}>
      <div style={{
        width: "56px", height: "56px", borderRadius: "14px",
        background: "var(--coral-light)", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "26px",
      }}>👤</div>
      <p style={{
        fontFamily: "var(--font-body)", fontSize: "20px", fontWeight: "700",
        color: "var(--navy)", letterSpacing: "-0.3px", marginTop: "4px",
      }}>{t.emptyTitle}</p>
      <p style={{
        fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)",
        maxWidth: "340px", textAlign: "center", lineHeight: "1.65",
      }}>{t.emptySubtitle}</p>
      <button className="btn btn-primary"
        style={{ marginTop: "8px", fontSize: "15px", padding: "12px 28px" }}
        onClick={onUpload}>{t.uploadBtn}</button>
    </div>
  );
}
