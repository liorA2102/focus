"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/positions", label: "Positions", icon: "📋" },
  { href: "/candidates", label: "Candidates", icon: "👤" },
  { href: "/linkedin", label: "LinkedIn", icon: "✍️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: "220px",
        minHeight: "100vh",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "32px 20px",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: "40px", paddingLeft: "8px" }}>
        <h1
          style={{
            fontSize: "24px",
            color: "var(--accent)",
            margin: 0,
            letterSpacing: "-0.5px",
          }}
        >
          Focus
        </h1>
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            margin: "2px 0 0",
          }}
        >
          Jacob&apos;s Desk
        </p>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {nav.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 12px",
                borderRadius: "10px",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: active ? "600" : "400",
                color: active ? "var(--accent)" : "var(--text-secondary)",
                background: active ? "var(--accent-light)" : "transparent",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "18px" }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ marginTop: "auto", paddingLeft: "8px" }}>
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            lineHeight: "1.5",
          }}
        >
          Good morning, Jacob 👋
        </p>
      </div>
    </aside>
  );
}
