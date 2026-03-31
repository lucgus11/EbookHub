import { ReactNode } from "react";
import Navbar from "./Navbar";

interface Props {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function Layout({ children, title, subtitle, actions }: Props) {
  return (
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      <Navbar />

      <main style={{
        flex: 1,
        marginLeft: "220px",
        marginBottom: 0,
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }} className="main-content">
        {(title || actions) && (
          <header style={{
            padding: "2rem 2rem 1.5rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}>
            <div>
              {title && (
                <h1 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.75rem",
                  fontWeight: 600,
                  color: "var(--cream)",
                  lineHeight: 1.2,
                }}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>{actions}</div>}
          </header>
        )}

        <div style={{ flex: 1, padding: "2rem" }}>
          {children}
        </div>
      </main>

      <style jsx global>{`
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0 !important;
            margin-bottom: 72px;
          }
          .main-content > div {
            padding: 1rem !important;
          }
          .main-content > header {
            padding: 1.25rem 1rem 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
