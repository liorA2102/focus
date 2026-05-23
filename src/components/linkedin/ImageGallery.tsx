"use client";

import { useRef, useState } from "react";
import GenerateImageModal from "./GenerateImageModal";

export type GalleryImage = {
  id: number;
  filename: string;
  label: string | null;
  createdAt: string;
};

interface Props {
  images: GalleryImage[];
  uploading: boolean;
  uploadError: string | null;
  onUpload: (files: FileList) => void;
  onRemove: (ids: number[]) => void;
  onRefresh: () => void;
  t: {
    imageGallery: string;
    uploadBtn: string;
    uploading: string;
    dropHere: string;
    noImagesTitle: string;
    noImagesBody: string;
    removeImage: string;
    errorUpload: string;
    createWithAI: string;
    createWithAIHint: string;
    removeSelected: (n: number) => string;
    clearSelection: string;
    selected: string;
  };
}

export default function ImageGallery({ images, uploading, uploadError, onUpload, onRemove, onRefresh, t }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const clearSelection = () => setSelected(new Set());

  const handleRemove = () => {
    onRemove([...selected]);
    setSelected(new Set());
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) onUpload(e.dataTransfer.files);
  };

  const hasImages   = images.length > 0;
  const selCount    = selected.size;

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "12px", overflow: "hidden",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: "16px 24px",
        borderBottom: selCount > 0 ? "none" : "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <h3 style={{
          fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "16px",
          color: "var(--navy)", margin: 0, flex: 1,
        }}>
          {t.imageGallery}
          {images.length > 0 && (
            <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 400, color: "var(--text-muted)", marginLeft: "6px" }}>
              ({images.length})
            </span>
          )}
        </h3>

        {/* Create with AI */}
        <button
          onClick={() => setGenerateOpen(true)}
          title={t.createWithAIHint}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "7px 14px", borderRadius: "8px",
            background: "var(--coral-light)", border: "1.5px solid var(--coral)",
            fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600,
            color: "var(--coral)", cursor: "pointer",
            transition: "opacity 140ms ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
        >
          ✦ {t.createWithAI}
        </button>

        {/* Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "7px 16px", borderRadius: "8px",
            background: "var(--navy)", color: "#fff",
            border: "none", fontFamily: "var(--font-body)",
            fontSize: "13px", fontWeight: 600,
            cursor: uploading ? "not-allowed" : "pointer",
            opacity: uploading ? 0.6 : 1,
            transition: "opacity 140ms ease",
          }}
          onMouseEnter={(e) => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = uploading ? "0.6" : "1"; }}
        >
          ↑ {uploading ? t.uploading : t.uploadBtn}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* ── Selection action bar ── */}
      {selCount > 0 && (
        <div style={{
          padding: "10px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: "12px",
          background: "#EAF0F9",
        }}>
          <span style={{
            fontFamily: "var(--font-body)", fontSize: "13px",
            fontWeight: 600, color: "#0A66C2", flex: 1,
          }}>
            {t.removeSelected(selCount)}
          </span>
          <button
            onClick={handleRemove}
            style={{
              padding: "6px 16px", borderRadius: "8px",
              background: "var(--coral)", color: "#fff",
              border: "none", cursor: "pointer",
              fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600,
              transition: "opacity 140ms ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            {t.removeImage}
          </button>
          <button
            onClick={clearSelection}
            style={{
              padding: "6px 12px", borderRadius: "8px",
              background: "none", color: "var(--text-muted)",
              border: "1.5px solid var(--border)", cursor: "pointer",
              fontFamily: "var(--font-body)", fontSize: "13px",
            }}
          >
            {t.clearSelection}
          </button>
        </div>
      )}

      {/* ── Upload error ── */}
      {uploadError && (
        <div style={{
          padding: "10px 24px",
          fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--coral)",
          borderBottom: "1px solid var(--border)",
        }}>
          {uploadError}
        </div>
      )}

      {/* ── Empty state ── */}
      {!hasImages ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: "72px 24px", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
            background: dragOver ? "#EAF0F9" : "transparent",
            transition: "background 140ms ease",
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: "16px",
            background: dragOver ? "#D0E4F7" : "var(--light-gray)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "28px", transition: "background 140ms ease",
          }}>
            🖼
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "17px", color: "var(--text-secondary)" }}>
            {t.noImagesTitle}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)", textAlign: "center", maxWidth: 340, lineHeight: 1.5 }}>
            {t.noImagesBody}
          </div>
        </div>

      ) : (
        /* ── Grid ── */
        <div style={{ padding: "24px" }}>

          {/* Drop zone strip */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "#0A66C2" : "var(--border)"}`,
              borderRadius: "8px", padding: "12px", cursor: "pointer",
              textAlign: "center", marginBottom: "20px",
              background: dragOver ? "#EAF0F9" : "transparent",
              transition: "all 140ms ease",
              fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)",
            }}
          >
            {uploading ? t.uploading : t.dropHere}
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "16px",
          }}>
            {images.map((img) => {
              const isSelected = selected.has(img.id);
              return (
                <div
                  key={img.id}
                  onClick={() => toggle(img.id)}
                  style={{
                    borderRadius: "10px", overflow: "hidden", cursor: "pointer",
                    border: `2px solid ${isSelected ? "#0A66C2" : "var(--border)"}`,
                    boxShadow: isSelected ? "0 0 0 3px #C5D9F1" : "none",
                    transition: "border-color 120ms ease, box-shadow 120ms ease",
                    position: "relative",
                    background: "var(--bg)",
                  }}
                >
                  {/* Thumbnail */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/linkedin-images/${img.filename}`}
                    alt={img.label ?? ""}
                    style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
                    draggable={false}
                  />

                  {/* Selection checkbox overlay */}
                  <div style={{
                    position: "absolute", top: 8, left: 8,
                    width: 22, height: 22, borderRadius: "50%",
                    border: `2px solid ${isSelected ? "#0A66C2" : "rgba(255,255,255,0.8)"}`,
                    background: isSelected ? "#0A66C2" : "rgba(0,0,0,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 120ms ease",
                    backdropFilter: "blur(2px)",
                  }}>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  {/* Label */}
                  <div style={{
                    padding: "8px 10px",
                    fontFamily: "var(--font-body)", fontSize: "12px",
                    color: "var(--text-muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    borderTop: "1px solid var(--border)",
                  }}>
                    {img.label ?? new Date(img.createdAt).toLocaleDateString("he-IL")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {generateOpen && (
        <GenerateImageModal
          onClose={() => setGenerateOpen(false)}
          onSaved={() => { setGenerateOpen(false); onRefresh(); }}
        />
      )}
    </div>
  );
}
