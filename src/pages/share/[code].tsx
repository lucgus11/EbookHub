import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import type { ShareSession, EbookFile } from "@/types";
import { formatBytes, detectFormat } from "@/utils";

export default function SharePage() {
  const router = useRouter();
  const { code } = router.query;
  const [session, setSession] = useState<ShareSession | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code || typeof code !== "string") return;
    fetch(`/api/share?code=${code.toUpperCase()}`)
      .then(async r => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error ?? "Code invalide");
        }
        return r.json();
      })
      .then(setSession)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [code]);

  const baseStyle: React.CSSProperties = {
    minHeight: "100dvh",
    background: "var(--bg)",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "2rem 1rem",
    fontFamily: "var(--font-body)",
  };

  if (loading) return (
    <div style={baseStyle}>
      <div className="animate-spin" style={{ fontSize: "2rem", color: "var(--gold)" }}>◌</div>
    </div>
  );

  if (error) return (
    <div style={baseStyle}>
      <Head><title>Lien invalide — EbookHub</title></Head>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--cream)", marginBottom: "0.5rem" }}>
          Lien invalide
        </h1>
        <p style={{ color: "var(--text-dim)" }}>{error}</p>
        <a href="/" className="btn btn-ghost" style={{ marginTop: "1.5rem", display: "inline-flex" }}>
          ← Retour à EbookHub
        </a>
      </div>
    </div>
  );

  return (
    <div style={baseStyle}>
      <Head><title>Partage EbookHub — {code}</title></Head>

      {/* Logo */}
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <a href="/" style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--gold)", fontStyle: "italic", textDecoration: "none" }}>
          EbookHub
        </a>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
          FILE BRIDGE
        </div>
      </div>

      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border-2)",
        borderRadius: "var(--radius-xl)",
        padding: "2rem",
        width: "100%", maxWidth: "500px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "1.5rem",
            letterSpacing: "0.2em", color: "var(--gold)",
          }}>
            {session?.code}
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
            {session?.files.length} fichier(s) partagé(s) ·
            expire {session?.expiresAt ? new Date(session.expiresAt).toLocaleString("fr-FR") : ""}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {session?.files.map(f => (
            <FileRow key={f.id} file={f} />
          ))}
        </div>

        <div style={{
          marginTop: "1.5rem",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          textAlign: "center",
        }}>
          <a href="/" style={{ color: "var(--gold)" }}>Ouvrir dans EbookHub →</a>
        </div>
      </div>
    </div>
  );
}

function FileRow({ file }: { file: EbookFile }) {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (file.megaUrl) {
      window.open(file.megaUrl, "_blank");
      return;
    }
    setDownloading(true);
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <div style={{
      display: "flex", gap: "0.75rem", alignItems: "center",
      padding: "0.75rem",
      background: "var(--bg-3)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
    }}>
      <div style={{
        width: "40px", height: "52px",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.6rem", fontFamily: "var(--font-mono)",
        fontWeight: 600, color: "var(--gold)",
        textTransform: "uppercase",
      }}>
        {file.format}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--cream)", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.15rem" }}>
          {file.name}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {formatBytes(file.size)}
        </div>
      </div>
      <button
        className="btn btn-primary btn-sm"
        onClick={download}
        disabled={downloading || !file.megaUrl}
        title={!file.megaUrl ? "Pas de lien direct disponible" : undefined}
      >
        {downloading ? "⟳" : "↓"}
      </button>
    </div>
  );
}
