"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";
import ImageGallery from "@/components/linkedin/ImageGallery";

type LiImage = { id: number; filename: string; label: string | null; createdAt: string };

export default function GalleryPage() {
  const { lang } = useLang();
  const t = translations[lang];

  const [images, setImages]           = useState<LiImage[]>([]);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchImages = () =>
    fetch("/api/linkedin/images").then((r) => r.json()).then(setImages);

  useEffect(() => { fetchImages(); }, []);

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("label", file.name.replace(/\.[^.]+$/, ""));
        const res = await fetch("/api/linkedin/images/upload", { method: "POST", body: form });
        if (!res.ok) throw new Error("Upload failed");
      }
      await fetchImages();
    } catch {
      setUploadError(t.linkedin.errorUpload);
    } finally {
      setUploading(false);
    }
  };

  const removeImages = async (ids: number[]) => {
    await Promise.all(ids.map((id) => fetch(`/api/linkedin/images/${id}`, { method: "DELETE" })));
    await fetchImages();
  };

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <div className="accent-rule" style={{ marginBottom: "12px" }} />
        <h2 style={{ fontFamily: "var(--font-body)", fontSize: "32px", fontWeight: 800, letterSpacing: "-0.5px", color: "var(--navy)", lineHeight: 1.1, margin: 0 }}>
          {t.sidebar.gallery}
        </h2>
      </div>

      <ImageGallery
        images={images}
        uploading={uploading}
        uploadError={uploadError}
        onUpload={uploadFiles}
        onRemove={removeImages}
        t={{
          imageGallery:    t.linkedin.imageGallery,
          uploadBtn:       t.linkedin.uploadBtn,
          uploading:       t.linkedin.uploading,
          dropHere:        t.linkedin.dropHere,
          noImagesTitle:   t.linkedin.noImagesTitle,
          noImagesBody:    t.linkedin.noImagesBody,
          removeImage:     t.linkedin.removeImage,
          errorUpload:     t.linkedin.errorUpload,
          createWithAI:    t.linkedin.createWithAI,
          createWithAIHint: t.linkedin.createWithAIHint,
          removeSelected:  t.linkedin.removeSelected,
          clearSelection:  t.linkedin.clearSelection,
          selected:        t.linkedin.selected,
        }}
      />
    </div>
  );
}
