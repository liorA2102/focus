import { ReactNode } from "react";

interface EmptyStateProps {
  icon: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function EmptyState({
  icon,
  iconBg = "var(--coral-light)",
  title,
  subtitle,
  action,
}: EmptyStateProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "80px 24px",
      background: "var(--surface)",
      border: "1.5px dashed var(--border)",
      borderRadius: "16px",
      gap: "12px",
    }}>
      <div style={{
        width: "56px", height: "56px", borderRadius: "14px",
        background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "26px",
      }}>
        {icon}
      </div>
      <p style={{
        fontFamily: "var(--font-body)", fontSize: "20px", fontWeight: 700,
        color: "var(--navy)", letterSpacing: "-0.3px", marginTop: "4px", margin: 0,
      }}>
        {title}
      </p>
      {subtitle && (
        <p style={{
          fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)",
          maxWidth: "280px", textAlign: "center", lineHeight: "1.65", margin: 0,
        }}>
          {subtitle}
        </p>
      )}
      {action && <div style={{ marginTop: "8px" }}>{action}</div>}
    </div>
  );
}
