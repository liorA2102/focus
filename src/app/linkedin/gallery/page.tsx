"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";
import PageHeader from "@/components/ui/PageHeader";
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
      <PageHeader title={t.sidebar.gallery} />

      <ImageGallery
        images={images}
        uploading={uploading}
        uploadError={uploadError}
        onUpload={uploadFiles}
        onRemove={removeImages}
        onRefresh={fetchImages}
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
