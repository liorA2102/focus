"use client";

import { useState } from "react";

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

export default function NewPositionModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    title: "",
    client: "",
    location: "",
    salaryRange: "",
    description: "",
    requirements: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.client.trim()) {
      setError("Job title and client name are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      onCreated();
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "24px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "20px",
          padding: "40px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <h2 style={{ margin: 0, fontSize: "26px" }}>New Position</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: "4px 8px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Field label="Job Title *" hint="e.g. Senior Software Engineer">
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Senior Software Engineer"
              style={inputStyle}
            />
          </Field>

          <Field label="Client *" hint="Company or person you're recruiting for">
            <input
              type="text"
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
              placeholder="Acme Corp"
              style={inputStyle}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Field label="Location">
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Tel Aviv"
                style={inputStyle}
              />
            </Field>
            <Field label="Salary Range">
              <input
                type="text"
                value={form.salaryRange}
                onChange={(e) => setForm({ ...form, salaryRange: e.target.value })}
                placeholder="₪25,000 – ₪35,000"
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Job Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the role, responsibilities, company culture..."
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>

          <Field label="Requirements">
            <textarea
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              placeholder="Skills, experience, qualifications needed..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>

          {error && (
            <p style={{ color: "var(--danger)", margin: 0, fontSize: "15px" }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "13px 24px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                fontSize: "16px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "13px 28px",
                borderRadius: "10px",
                border: "none",
                background: saving ? "var(--text-muted)" : "var(--accent)",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "600",
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {saving ? "Saving..." : "Create Position"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
        {label}
        {hint && (
          <span style={{ fontWeight: "400", color: "var(--text-muted)", marginLeft: "6px", fontSize: "13px" }}>
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  fontSize: "16px",
  color: "var(--text-primary)",
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color 0.15s",
};
