import Link from "next/link";
import { useRouter } from "next/router";
import { clsx } from "clsx";

const NAV = [
  { href: "/",         label: "Accueil",    icon: "⌂" },
  { href: "/library",  label: "Bibliothèque", icon: "◫" },
  { href: "/transfer", label: "Transfert",  icon: "⇄" },
  { href: "/tools",    label: "Outils",     icon: "⚙" },
  { href: "/settings", label: "Réglages",   icon: "≡" },
];

export default function Navbar() {
  const { pathname } = useRouter();

  return (
    <>
      {/* Desktop sidebar */}
      <aside style={{
        position: "fixed", left: 0, top: 0, bottom: 0,
        width: "220px", zIndex: 100,
        background: "var(--bg-2)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        padding: "0",
      }} className="hide-mobile">
        {/* Logo */}
        <div style={{ padding: "1.75rem 1.5rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--gold)", fontStyle: "italic" }}>
            EbookHub
          </span>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "0.2rem", letterSpacing: "0.05em" }}>
            FILE BRIDGE
          </div>
        </div>

        <nav style={{ flex: 1, padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.6rem 0.85rem",
                borderRadius: "var(--radius)",
                fontSize: "0.875rem",
                fontWeight: active ? 500 : 400,
                color: active ? "var(--gold)" : "var(--text-dim)",
                background: active ? "var(--gold-glow)" : "transparent",
                border: `1px solid ${active ? "var(--gold-dim)" : "transparent"}`,
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)"; (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-3)"; } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-dim)"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; } }}
              >
                <span style={{ fontSize: "1rem", width: "1.2rem", textAlign: "center" }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            v1.0.0 · PWA
          </div>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        zIndex: 100,
        background: "var(--bg-2)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        padding: "0.5rem 0 calc(0.5rem + env(safe-area-inset-bottom))",
      }} className="hide-desktop">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: "0.2rem",
              fontSize: "0.62rem",
              color: active ? "var(--gold)" : "var(--text-muted)",
              textDecoration: "none",
              padding: "0.25rem 0",
              transition: "color 0.15s",
            }}>
              <span style={{ fontSize: "1.25rem" }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
