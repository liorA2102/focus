import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: "28px",
      gap: "20px",
    }}>
      <div>
        <div className="accent-rule" style={{ marginBottom: "10px" }} />
        <h2 style={{
          fontFamily: "var(--font-body)",
          fontSize: "32px",
          fontWeight: 800,
          letterSpacing: "-0.5px",
          color: "var(--navy)",
          lineHeight: 1.1,
          margin: 0,
        }}>
          {title}
        </h2>
      </div>
      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
