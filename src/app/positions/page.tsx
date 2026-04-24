"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NewPositionModal from "@/components/positions/NewPositionModal";

type Position = {
  id: number;
  title: string;
  client: string;
  location: string | null;
  salaryRange: string | null;
  status: "open" | "in_review" | "offer_sent" | "filled" | "closed";
  postedJobMaster: boolean;
  postedLinkedin: boolean;
  createdAt: string;
};

const STATUS_LABEL: Record<Position["status"], string> = {
  open: "Open",
  in_review: "In Review",
  offer_sent: "Offer Sent",
  filled: "Filled",
  closed: "Closed",
};

const STATUS_COLOR: Record<Position["status"], string> = {
  open: "var(--strong)",
  in_review: "var(--possible)",
  offer_sent: "var(--possible)",
  filled: "var(--text-muted)",
  closed: "var(--text-muted)",
};

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "filled" | "closed">("all");

  const fetchPositions = async () => {
    const res = await fetch("/api/positions");
    if (res.ok) setPositions(await res.json());
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  const filtered = positions.filter((p) => {
    if (filter === "all") return true;
    if (filter === "open") return p.status === "open" || p.status === "in_review" || p.status === "offer_sent";
    return p.status === filter;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h2 style={{ fontSize: "32px", margin: "0 0 4px", color: "var(--text-primary)" }}>
            Positions
          </h2>
          <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "17px" }}>
            {positions.filter((p) => p.status === "open" || p.status === "in_review").length} active roles
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            padding: "14px 24px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          + New Position
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {(["all", "open", "filled", "closed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 18px",
              borderRadius: "20px",
              border: "1px solid",
              borderColor: filter === f ? "var(--accent)" : "var(--border)",
              background: filter === f ? "var(--accent-light)" : "var(--surface)",
              color: filter === f ? "var(--accent)" : "var(--text-secondary)",
              fontSize: "15px",
              fontWeight: filter === f ? "600" : "400",
              cursor: "pointer",
              fontFamily: "inherit",
              textTransform: "capitalize",
            }}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            color: "var(--text-muted)",
          }}
        >
          <p style={{ fontSize: "20px", margin: "0 0 8px" }}>No positions yet</p>
          <p style={{ fontSize: "16px" }}>Click &ldquo;+ New Position&rdquo; to get started</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/positions/${p.id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  padding: "24px",
                  cursor: "pointer",
                  transition: "box-shadow 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-strong)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                }}
              >
                {/* Status badge */}
                <div style={{ marginBottom: "12px" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: STATUS_COLOR[p.status],
                      background: p.status === "open" ? "var(--strong-bg)" : p.status === "in_review" || p.status === "offer_sent" ? "var(--possible-bg)" : "var(--weak-bg)",
                      padding: "4px 10px",
                      borderRadius: "6px",
                    }}
                  >
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>

                <h3 style={{ fontSize: "20px", margin: "0 0 4px", color: "var(--text-primary)" }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: "16px", color: "var(--text-secondary)", margin: "0 0 16px" }}>
                  {p.client}
                </p>

                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {p.location && (
                    <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                      📍 {p.location}
                    </span>
                  )}
                  {p.salaryRange && (
                    <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                      💰 {p.salaryRange}
                    </span>
                  )}
                </div>

                {/* Post badges */}
                {(p.postedJobMaster || p.postedLinkedin) && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                    {p.postedJobMaster && (
                      <span style={{ fontSize: "12px", color: "var(--text-muted)", background: "var(--bg)", padding: "3px 8px", borderRadius: "4px", border: "1px solid var(--border)" }}>
                        JobMaster ✓
                      </span>
                    )}
                    {p.postedLinkedin && (
                      <span style={{ fontSize: "12px", color: "var(--text-muted)", background: "var(--bg)", padding: "3px 8px", borderRadius: "4px", border: "1px solid var(--border)" }}>
                        LinkedIn ✓
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <NewPositionModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            fetchPositions();
          }}
        />
      )}
    </div>
  );
}
