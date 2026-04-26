"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";

export default function Sidebar() {
  const pathname = usePathname();
  const { lang, toggle } = useLang();
  const t = translations[lang].sidebar;

  const nav = [
    { href: "/positions",  label: t.positions,  icon: <GridIcon />     },
    { href: "/customers",  label: t.customers,  icon: <BuildingIcon /> },
    { href: "/candidates", label: t.candidates, icon: <PersonIcon />   },
    { href: "/linkedin",   label: t.linkedin,   icon: <PenIcon />      },
  ];

  const h = new Date().getHours();
  const greeting = h < 12 ? t.greetings[0] : h < 17 ? t.greetings[1] : t.greetings[2];

  return (
    <aside style={{
      width: "232px",
      minHeight: "100vh",
      background: "var(--sidebar-bg)",
      display: "flex",
      flexDirection: "column",
      padding: "24px 14px",
      flexShrink: 0,
      position: "sticky",
      top: 0,
      height: "100vh",
    }}>

      {/* Logo — force LTR so RTL layout doesn't mirror the icon */}
      <div style={{ padding: "4px 8px 28px", direction: "ltr" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Circle icon: CSS border-radius clips the rings reliably */}
          <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="20" fill="#E8503A" />
              <circle cx="9" cy="20" r="5"   fill="none" stroke="white" strokeWidth="3" />
              <circle cx="9" cy="20" r="11"  fill="none" stroke="white" strokeWidth="3" />
              <circle cx="9" cy="20" r="17"  fill="none" stroke="white" strokeWidth="3" />
              <circle cx="9" cy="20" r="23"  fill="none" stroke="white" strokeWidth="3" />
              <circle cx="9" cy="20" r="29"  fill="none" stroke="white" strokeWidth="3" />
            </svg>
          </div>
          {/* Text */}
          <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", lineHeight: 1 }}>
            <span style={{ fontWeight: 700, color: "#FFFFFF" }}>FOCUS</span>
            <span style={{ fontWeight: 300, color: "rgba(255,255,255,0.65)" }}>GROUP</span>
          </div>
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em", marginTop: "8px" }}>
          {t.recruiterDesk}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
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
                padding: "10px 12px",
                borderRadius: "8px",
                textDecoration: "none",
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                fontWeight: active ? "600" : "400",
                color: active ? "#FFFFFF" : "var(--sidebar-text)",
                background: active ? "var(--sidebar-active-bg)" : "transparent",
                borderInlineStart: `2px solid ${active ? "var(--coral)" : "transparent"}`,
                transition: "background 130ms ease, color 130ms ease, border-color 130ms ease",
                userSelect: "none",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "var(--sidebar-hover-bg)";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              }}
            >
              <span style={{ opacity: active ? 1 : 0.5, flexShrink: 0, color: active ? "var(--coral)" : "currentColor" }}>
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "16px", paddingInlineStart: "4px" }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.32)", marginBottom: "2px" }}>
          {greeting},
        </div>
        <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: "600", color: "rgba(255,255,255,0.80)" }}>
          Jacob
        </div>

        {/* Language toggle */}
        <div
          style={{
            marginTop: "16px",
            display: "inline-flex",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "20px",
            padding: "3px",
            gap: "2px",
          }}
        >
          {(["en", "he"] as const).map((l) => (
            <button
              key={l}
              onClick={toggle}
              style={{
                padding: "4px 12px",
                borderRadius: "16px",
                border: "none",
                background: lang === l ? "rgba(255,255,255,0.16)" : "transparent",
                color: lang === l ? "#fff" : "rgba(255,255,255,0.38)",
                fontSize: "12px",
                fontWeight: lang === l ? "700" : "400",
                cursor: "pointer",
                fontFamily: l === "he" ? "'Arial', sans-serif" : "'Inter', sans-serif",
                letterSpacing: lang === l ? "0.03em" : 0,
                transition: "all 150ms ease",
              }}
            >
              {l === "en" ? "EN" : "עב"}
            </button>
          ))}
        </div>

        {/* Brand tagline */}
        <div style={{
          marginTop: "16px",
          fontFamily: "'Inter', sans-serif",
          fontSize: "10px",
          color: "rgba(255,255,255,0.22)",
          letterSpacing: "0.03em",
          lineHeight: 1.5,
          whiteSpace: "pre-line",
        }}>
          {t.tagline}
        </div>
      </div>
    </aside>
  );
}


function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="3" fill="currentColor" />
      <path d="M2 13c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="5" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 15v-4h6v4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="4" y="8" width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="10" y="8" width="2" height="2" rx="0.4" fill="currentColor" />
      <path d="M5 5V3.5A1.5 1.5 0 0 1 6.5 2h3A1.5 1.5 0 0 1 11 3.5V5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M11 2l3 3-8 8H3v-3L11 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
