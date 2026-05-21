"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";

type LiStatus = { connected: boolean; name?: string; picture?: string };
type LiImage  = { id: number; filename: string; label: string | null; createdAt: string };
type PostType = "job" | "holiday" | "pr";

const LI_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

export default function LinkedInPage() {
  const { lang } = useLang();
  const t = translations[lang].linkedin;

  // Connection
  const [status, setStatus] = useState<LiStatus | null>(null);

  // Gallery
  const [images, setImages]       = useState<LiImage[]>([]);

  // Composer
  const [postType, setPostType]   = useState<PostType>("job");
  const [lang2, setLang2]         = useState<"he" | "en">("he");
  const [hint, setHint]           = useState("");
  const [postText, setPostText]   = useState("");
  const [generating, setGenerating] = useState(false);
  const [imageIdx, setImageIdx]   = useState<number | null>(null);
  const [posting, setPosting]     = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postSuccess, setPostSuccess] = useState<string | null>(null);

  const fetchStatus = () =>
    fetch("/api/linkedin/status").then((r) => r.json()).then(setStatus);
  const fetchImages = () =>
    fetch("/api/linkedin/images").then((r) => r.json()).then(setImages);

  useEffect(() => {
    fetchStatus();
    fetchImages();
  }, []);

  // ── Generate ──────────────────────────────────────────────────────────────
  const generate = async (action?: "shorten" | "expand") => {
    setGenerating(true);
    setPostError(null);
    try {
      const res = await fetch("/api/linkedin/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postType, hint: hint.trim() || undefined, lang: lang2, action, currentText: postText }),
      });
      const data = await res.json();
      if (data.text) setPostText(data.text);
    } catch {
      setPostError(t.errorGenerate);
    } finally {
      setGenerating(false);
    }
  };

  // ── Post ──────────────────────────────────────────────────────────────────
  const post = async () => {
    setPosting(true);
    setPostError(null);
    setPostSuccess(null);
    try {
      const selectedImage = imageIdx !== null ? images[imageIdx] : undefined;
      const res = await fetch("/api/linkedin/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: postText, imageFilename: selectedImage?.filename ?? null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPostError(data.error ?? t.errorPost);
      } else {
        setPostSuccess(data.postUrl ?? "posted");
        setPostText("");
        setHint("");
      }
    } catch {
      setPostError(t.errorPost);
    } finally {
      setPosting(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selectedImage = imageIdx !== null ? (images[imageIdx] ?? null) : null;
  const postTypes: { key: PostType; label: string }[] = [
    { key: "job",     label: t.typeJob     },
    { key: "holiday", label: t.typeHoliday },
    { key: "pr",      label: t.typePR      },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="accent-rule" style={{ marginBottom: "12px" }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "34px", fontWeight: "400", letterSpacing: "-0.3px", color: "var(--navy)", lineHeight: 1.1 }}>
            {t.title}
          </h2>
        </div>
        {/* Connection status */}
        {status !== null && (
          status.connected ? (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              padding: "8px 16px", borderRadius: "8px",
              background: "#E8F0FD", color: "#0A66C2",
              fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600,
            }}>
              {LI_ICON} ✓ {t.connectedAs} {status.name}
            </span>
          ) : (
            <a
              href="/api/linkedin/auth"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "10px 18px", borderRadius: "8px",
                background: "#0A66C2", color: "#fff",
                fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 600,
                textDecoration: "none", transition: "opacity 140ms ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.85"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
            >
              {LI_ICON} {t.connectBtn}
            </a>
          )
        )}
      </div>

      {/* ── Post Composer + Preview ── */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "12px", overflow: "hidden",
      }}>
        <div style={{
          padding: "16px 24px", borderBottom: "1px solid var(--border)",
          fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "16px", color: "var(--navy)",
        }}>
          {t.composer}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>

          {/* LEFT: Editor */}
          <div style={{
            padding: "20px 24px", borderRight: "1px solid var(--border)",
            display: "flex", flexDirection: "column", gap: "14px",
          }}>

            {/* Post type tabs */}
            <div style={{ display: "flex", gap: "6px" }}>
              {postTypes.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPostType(key)}
                  style={{
                    padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 600,
                    fontFamily: "var(--font-body)", border: "1.5px solid",
                    borderColor: postType === key ? "#0A66C2" : "var(--border)",
                    background: postType === key ? "#E8F0FD" : "transparent",
                    color: postType === key ? "#0A66C2" : "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Lang toggle */}
            <div style={{ display: "flex", gap: "6px" }}>
              {(["he", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang2(l)}
                  style={{
                    padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                    fontFamily: "var(--font-body)", border: "1.5px solid",
                    borderColor: lang2 === l ? "var(--steel)" : "var(--border)",
                    background: lang2 === l ? "var(--steel-light)" : "transparent",
                    color: lang2 === l ? "var(--steel)" : "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  {l === "he" ? "עברית" : "English"}
                </button>
              ))}
            </div>

            {/* Hint input */}
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder={t.hintPlaceholder}
              dir={lang2 === "he" ? "rtl" : "ltr"}
              style={{
                padding: "9px 12px", borderRadius: "8px", fontSize: "13px",
                border: "1.5px solid var(--border)", outline: "none",
                fontFamily: "var(--font-body)", color: "var(--text-primary)",
                background: "var(--bg)",
              }}
            />

            {/* Generate button */}
            <button
              disabled={generating}
              onClick={() => generate()}
              style={{
                padding: "9px 16px", borderRadius: "8px",
                background: generating ? "var(--light-gray)" : "#0A66C2",
                color: generating ? "var(--text-muted)" : "#fff",
                border: "none", cursor: generating ? "not-allowed" : "pointer",
                fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 600,
                transition: "background 140ms ease",
              }}
            >
              {generating ? t.generating : t.generateBtn}
            </button>

            {/* Textarea */}
            <div style={{ position: "relative" }}>
              {generating && (
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "8px", zIndex: 2,
                  fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)",
                }}>
                  {t.generating}
                </div>
              )}
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                dir={lang2 === "he" ? "rtl" : "ltr"}
                rows={10}
                placeholder={t.textareaPlaceholder}
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
                  disabled={generating || !postText}
                  onClick={() => generate(action)}
                  style={{
                    padding: "6px 14px", borderRadius: "8px", fontSize: "13px",
                    fontFamily: "var(--font-body)", fontWeight: 500,
                    border: "1.5px solid var(--border)", background: "var(--bg)",
                    color: "var(--text-secondary)", cursor: "pointer",
                    opacity: generating || !postText ? 0.5 : 1,
                  }}
                >
                  {action === "shorten" ? t.shorten : t.expand}
                </button>
              ))}
            </div>

            {/* Image selector */}
            {images.length > 0 && (
              <div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {t.selectImage}
                </div>
                {imageIdx === null ? (
                  <button
                    onClick={() => setImageIdx(0)}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "8px", cursor: "pointer",
                      border: "2px dashed var(--border)", background: "var(--bg)",
                      fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)",
                      transition: "border-color 140ms ease",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#0A66C2"; (e.currentTarget as HTMLButtonElement).style.color = "#0A66C2"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                  >
                    + {t.attachImage}
                  </button>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        onClick={() => setImageIdx((i) => ((i ?? 0) - 1 + images.length) % images.length)}
                        style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                      >‹</button>
                      <div style={{ flex: 1, borderRadius: "8px", overflow: "hidden", aspectRatio: "16/9", border: "1px solid var(--border)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/linkedin-images/${images[imageIdx].filename}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <button
                        onClick={() => setImageIdx((i) => ((i ?? 0) + 1) % images.length)}
                        style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                      >›</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "5px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{imageIdx + 1} / {images.length}</span>
                      <button
                        onClick={() => setImageIdx(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "var(--coral)", fontFamily: "var(--font-body)" }}
                      >
                        {t.removeImage}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error / Success */}
            {postError && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--coral)" }}>{postError}</div>
            )}
            {postSuccess && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#1A6B4A" }}>
                {t.postSuccess}{" "}
                {postSuccess !== "posted" && (
                  <a href={postSuccess} target="_blank" rel="noopener noreferrer" style={{ color: "#0A66C2" }}>{t.viewPost}</a>
                )}
              </div>
            )}

            {/* Post button */}
            <button
              disabled={posting || !postText || !status?.connected}
              onClick={post}
              style={{
                padding: "11px 20px", borderRadius: "10px",
                background: posting || !postText || !status?.connected ? "#ccc" : "#0A66C2",
                color: "#fff", border: "none",
                cursor: posting || !postText || !status?.connected ? "not-allowed" : "pointer",
                fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 700,
                marginTop: "auto",
              }}
            >
              {posting ? t.posting : t.postBtn}
            </button>
            {!status?.connected && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
                {t.notConnectedHint}
              </div>
            )}
          </div>

          {/* RIGHT: Preview */}
          <div style={{ padding: "20px 24px", background: "#F3F2EF", overflowY: "auto" }}>
            <div style={{
              fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600,
              color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px",
            }}>
              {t.preview}
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.12)", overflow: "hidden" }}>
              {/* Profile row */}
              <div style={{ padding: "16px 16px 0", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/jacob-avatar.jpg" alt="Jacob" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: "#000" }}>Jacob Avidar</div>
                  <div style={{ fontSize: "13px", color: "#666", lineHeight: 1.3 }}>CEO at Focus Group</div>
                  <div style={{ fontSize: "12px", color: "#999", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                    <span>Just now</span><span>·</span>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="#999"><path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14.5C4.41 14.5 1.5 11.59 1.5 8S4.41 1.5 8 1.5 14.5 4.41 14.5 8 11.59 14.5 8 14.5z"/></svg>
                  </div>
                </div>
              </div>

              {/* Text */}
              <div style={{
                padding: "12px 16px",
                fontFamily: "var(--font-body)", fontSize: "14px", lineHeight: 1.6,
                color: "#1a1a1a", whiteSpace: "pre-wrap",
                direction: lang2 === "he" ? "rtl" : "ltr",
                textAlign: lang2 === "he" ? "right" : "left",
                minHeight: 80,
              }}>
                {postText || <span style={{ color: "#bbb" }}>…</span>}
              </div>

              {/* Image */}
              {selectedImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/linkedin-images/${selectedImage.filename}`} alt="" style={{ width: "100%", display: "block" }} />
              )}

              {/* Reactions bar */}
              <div style={{
                padding: "10px 16px", borderTop: "1px solid #e0e0e0",
                display: "flex", gap: "20px",
                fontFamily: "var(--font-body)", fontSize: "13px", color: "#666",
              }}>
                {["👍 Like", "💬 Comment", "🔁 Repost", "📤 Send"].map((l) => (
                  <span key={l} style={{ opacity: 0.6 }}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
