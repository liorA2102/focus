"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

type Step = "input" | "preview";
type ColorMode = "color" | "mono";
type TextLang = "he" | "en";
type Corner = "tl" | "tr" | "bl" | "br";
type ImageType = "image" | "poster";

export default function GenerateImageModal({ onClose, onSaved }: Props) {
  const { lang } = useLang();
  const t = translations[lang].linkedin.generateModal;

  const [step, setStep] = useState<Step>("input");
  const [prompt, setPrompt] = useState("");
  const [imageType, setImageType] = useState<ImageType>("poster");
  const [colorMode, setColorMode] = useState<ColorMode>("color");
  const [textLang, setTextLang] = useState<TextLang>("en");
  const [corner, setCorner] = useState<Corner>("br");
  const [generating, setGenerating] = useState(false);
  const [genPhase, setGenPhase] = useState<"prompt" | "image">("prompt");
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cost, setCost] = useState<number | null>(null);

  useEffect(() => () => { if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current); }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGenPhase("prompt");
    setError(null);
    phaseTimerRef.current = setTimeout(() => setGenPhase("image"), 2500);
    try {
      const res = await fetch("/api/linkedin/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, colorMode, textLanguage: textLang, imageType }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPreviewUrl(data.dataUrl);
      setCost(data.cost ?? null);
      setStep("preview");
    } catch (err) {
      console.error("[GenerateImageModal] generate failed:", err);
      setError(t.errorGenerate);
    } finally {
      setGenerating(false);
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    }
  };

  const handleSave = async () => {
    if (!previewUrl) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/linkedin/images/save-generated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: previewUrl, label: prompt.slice(0, 80), corner, colorMode, imageType }),
      });
      if (!res.ok) throw new Error();
      onSaved();
      onClose();
    } catch {
      setError(t.errorSave);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(10, 20, 40, 0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "560px",
          boxShadow: "0 24px 64px rgba(10,20,40,0.22)",
          overflow: "hidden",
          direction: lang === "he" ? "rtl" : "ltr",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{
            fontFamily: "var(--font-body)", fontWeight: 800, fontSize: "18px",
            color: "var(--navy)", letterSpacing: "-0.3px",
          }}>
            {step === "input" ? t.title : t.previewTitle}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "20px", color: "var(--text-muted)",
              lineHeight: 1, padding: "2px 6px",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px 24px" }}>
          {step === "input" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* Branding note */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                background: "#EEF8F1", border: "1px solid #B5DFC2",
                borderRadius: "8px", padding: "8px 12px",
              }}>
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: "13px",
                  color: "#2A7A47", fontWeight: 500,
                }}>
                  {t.brandingNote}
                </span>
              </div>

              {/* Prompt */}
              <div>
                <label style={{
                  display: "block", fontFamily: "var(--font-body)",
                  fontSize: "14px", fontWeight: 600, color: "var(--navy)",
                  marginBottom: "8px",
                }}>
                  {t.promptLabel}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={imageType === "poster" ? t.promptPlaceholderPoster : t.promptPlaceholderImage}
                  rows={4}
                  disabled={generating}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "12px 14px", borderRadius: "10px",
                    border: "1.5px solid var(--border)",
                    fontFamily: "var(--font-body)", fontSize: "15px",
                    color: "var(--navy)", resize: "vertical",
                    lineHeight: 1.6, outline: "none",
                    background: generating ? "var(--light-gray)" : "var(--bg)",
                    opacity: generating ? 0.6 : 1,
                    cursor: generating ? "not-allowed" : "text",
                    transition: "border-color 120ms ease, background 140ms ease, opacity 140ms ease",
                  }}
                  onFocus={(e) => { if (!generating) e.currentTarget.style.borderColor = "var(--navy)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              {/* All selectors */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", opacity: generating ? 0.5 : 1, pointerEvents: generating ? "none" : "auto", transition: "opacity 140ms ease" }}>
                <ToggleRow
                  label={t.typeLabel}
                  options={[
                    { value: "poster", label: t.typePoster },
                    { value: "image",  label: t.typeImage },
                  ]}
                  value={imageType}
                  onChange={(v) => setImageType(v as ImageType)}
                />
                <ToggleRow
                  label={t.colorLabel}
                  options={[
                    { value: "color", label: t.colorFull },
                    { value: "mono",  label: t.colorMono },
                  ]}
                  value={colorMode}
                  onChange={(v) => setColorMode(v as ColorMode)}
                />
                <ToggleRow
                  label={t.langLabel}
                  options={[
                    { value: "en", label: t.langEn },
                    { value: "he", label: t.langHe },
                  ]}
                  value={textLang}
                  onChange={(v) => setTextLang(v as TextLang)}
                />
              </div>

              {/* Error */}
              {error && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--coral)", margin: 0 }}>
                  {error}
                </p>
              )}

              {/* Divider */}
              <div style={{ borderTop: "1px solid var(--border)", margin: "0 -24px" }} />

              {/* Actions */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: "10px 20px", borderRadius: "8px",
                    background: "none", border: "1.5px solid var(--border)",
                    fontFamily: "var(--font-body)", fontSize: "14px",
                    color: "var(--text-muted)", cursor: "pointer",
                  }}
                >
                  {lang === "he" ? "ביטול" : "Cancel"}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "8px",
                    padding: "10px 22px", borderRadius: "8px",
                    background: !prompt.trim() || generating ? "var(--navy)" : "var(--navy)",
                    color: "#fff",
                    border: "none",
                    fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 700,
                    cursor: !prompt.trim() || generating ? "not-allowed" : "pointer",
                    opacity: !prompt.trim() ? 0.45 : 1,
                    transition: "opacity 140ms ease",
                  }}
                >
                  {generating && (
                    <span style={{
                      width: "14px", height: "14px", borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.35)",
                      borderTopColor: "#fff",
                      display: "inline-block",
                      animation: "spin 0.7s linear infinite",
                      flexShrink: 0,
                    }} />
                  )}
                  {generating
                    ? (genPhase === "prompt"
                        ? (lang === "he" ? "מנסח פרומפט…" : "Crafting prompt…")
                        : (lang === "he" ? "יוצר תמונה…"  : "Generating image…"))
                    : t.generateBtn}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Preview image with live logo overlay */}
              {previewUrl && (
                <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: "1px solid var(--border)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Generated preview"
                    style={{ width: "100%", display: "block", aspectRatio: "1/1", objectFit: "cover" }}
                  />
                  {/* Poster gradient strip */}
                  {imageType === "poster" && (
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      height: "28%",
                      background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.62))",
                      pointerEvents: "none",
                    }} />
                  )}
                  {/* Logo overlay */}
                  {(() => {
                    const lc: Corner = imageType === "poster" ? "bl" : corner;
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src="/logos/text-logo.svg"
                        alt="Focus Group logo"
                        style={{
                          position: "absolute",
                          height: "7%",
                          top:    lc === "tl" || lc === "tr" ? "16px" : "auto",
                          bottom: lc === "bl" || lc === "br" ? "16px" : "auto",
                          left:   lc === "tl" || lc === "bl" ? "16px" : "auto",
                          right:  lc === "tr" || lc === "br" ? "16px" : "auto",
                          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
                          pointerEvents: "none",
                        }}
                      />
                    );
                  })()}
                </div>
              )}

              {/* Corner picker — photo mode only */}
              {imageType === "image" && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{
                    fontFamily: "var(--font-body)", fontSize: "13px",
                    fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap",
                  }}>
                    {lang === "he" ? "מיקום לוגו" : "Logo position"}
                  </span>
                  <div style={{ display: "flex", gap: "5px" }}>
                    {(["tl", "tr", "bl", "br"] as Corner[]).map((c) => {
                      const isActive = corner === c;
                      return (
                        <button
                          key={c}
                          onClick={() => setCorner(c)}
                          style={{
                            width: "34px", height: "34px",
                            borderRadius: "8px",
                            border: `1.5px solid ${isActive ? "var(--navy)" : "var(--border)"}`,
                            background: isActive ? "var(--navy)" : "transparent",
                            color: isActive ? "#fff" : "var(--text-muted)",
                            fontSize: "15px", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 120ms ease",
                          }}
                        >
                          {c === "tl" ? "↖" : c === "tr" ? "↗" : c === "bl" ? "↙" : "↘"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cost indicator */}
              {cost !== null && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "6px 12px", borderRadius: "8px",
                  background: "#FFF8EC", border: "1px solid #F0D9A0",
                  alignSelf: "flex-start",
                }}>
                  <span style={{ fontSize: "13px" }}>💰</span>
                  <span style={{
                    fontFamily: "var(--font-body)", fontSize: "12px",
                    color: "#8A6A00", fontWeight: 500,
                  }}>
                    {t.approxCost}: ~${cost.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Error */}
              {error && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--coral)", margin: 0 }}>
                  {error}
                </p>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setStep("input"); setError(null); }}
                  style={{
                    padding: "10px 20px", borderRadius: "8px",
                    background: "none", border: "1.5px solid var(--border)",
                    fontFamily: "var(--font-body)", fontSize: "14px",
                    color: "var(--text-muted)", cursor: "pointer",
                  }}
                >
                  {t.backBtn}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: "10px 22px", borderRadius: "8px",
                    background: saving ? "var(--border)" : "var(--coral)",
                    color: saving ? "var(--text-muted)" : "#fff",
                    border: "none",
                    fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    transition: "background 140ms ease",
                  }}
                >
                  {saving ? t.saving : t.saveBtn}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

function ToggleRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <span style={{
        fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 600,
        color: "var(--navy)", minWidth: "100px",
      }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: "6px" }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "6px 16px", borderRadius: "8px",
              border: `1.5px solid ${value === opt.value ? "var(--navy)" : "var(--border)"}`,
              background: value === opt.value ? "var(--navy)" : "transparent",
              color: value === opt.value ? "#fff" : "var(--text-muted)",
              fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600,
              cursor: "pointer", transition: "all 120ms ease",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
