"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/context/LanguageContext";
import translations from "@/lib/t";

export default function Sidebar() {
  const pathname = usePathname();
  const { lang, toggle } = useLang();
  const t = translations[lang].sidebar;

  const mainNav = [
    { href: "/positions",         label: t.positions,  icon: <GridIcon />     },
    { href: "/customers",         label: t.customers,  icon: <BuildingIcon /> },
    { href: "/candidates",        label: t.candidates, icon: <PersonIcon />   },
    { href: "/linkedin/gallery",  label: t.gallery,    icon: <GalleryIcon />  },  ];

  const settingsNav = [
    { href: "/email", label: t.emailInbox, icon: <InboxIcon /> },
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

      {/* Logo */}
      <div style={{ padding: "4px 8px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "5px", height: "20px", background: "var(--coral)", borderRadius: "3px", flexShrink: 0 }} />
          <div style={{ fontFamily: "var(--font-body)", fontSize: "16px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2 }}>
            קבוצת פוקוס
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "rgba(255,255,255,0.28)", letterSpacing: "0.07em", marginTop: "8px", textTransform: "uppercase" }}>
          {t.recruiterDesk}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {mainNav.map(({ href, label, icon }) => {
          const active = href === "/linkedin"
            ? pathname === "/linkedin"
            : pathname.startsWith(href);
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
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                fontWeight: active ? "600" : "400",
                color: active ? "#FFFFFF" : "var(--sidebar-text)",
                background: active ? "var(--sidebar-active-bg)" : "transparent",
                borderInlineStart: `3px solid ${active ? "var(--coral)" : "transparent"}`,
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

        {/* Settings section */}
        <div style={{ marginTop: "16px", marginBottom: "4px", padding: "0 12px" }}>
          <span style={{
            fontFamily: "var(--font-body)",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.28)",
          }}>
            {t.settingsSection}
          </span>
        </div>

        {settingsNav.map(({ href, label, icon }) => {
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
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                fontWeight: active ? "600" : "400",
                color: active ? "#FFFFFF" : "var(--sidebar-text)",
                background: active ? "var(--sidebar-active-bg)" : "transparent",
                borderInlineStart: `3px solid ${active ? "var(--coral)" : "transparent"}`,
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
        <div style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.32)", marginBottom: "2px" }}>
          {greeting},
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: "600", color: "rgba(255,255,255,0.80)" }}>
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
                fontFamily: l === "he" ? "var(--font-body)" : "var(--font-body)",
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
          fontFamily: "var(--font-body)",
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

function InboxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M1 6h4l1.5 2h3L11 6h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="9" y="1" width="6" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="1" y="8" width="6" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="9" y="8" width="6" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
