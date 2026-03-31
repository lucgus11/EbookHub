import { useState, useEffect } from "react";
import type { EbookFile } from "@/types";
import toast from "react-hot-toast";

interface Props {
  file: EbookFile;
  onClose: () => void;
}

export default function ShareModal({ file, onClose }: Props) {
  const [code, setCode]         = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [hours, setHours]       = useState(24);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied]     = useState(false);

  const shareUrl = code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${code}`
    : null;

  const createSession = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [file], expiresInHours: hours }),
      });
      if (!res.ok) throw new Error("Création échouée");
      const data = await res.json();
      setCode(data.code);
      setExpiresAt(data.expiresAt);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCreating(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(4px)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card animate-fade-up" style={{
        width: "100%", maxWidth: "460px",
        background: "var(--bg-2)",
        border: "1px solid var(--border-2)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--cream)", fontSize: "1.3rem" }}>
            Partager
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginBottom: "1.25rem" }}>
          {file.name}
        </p>

        {!code ? (
          <>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "0.5rem" }}>
                Durée de validité
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {[1, 6, 24, 72, 168].map(h => (
                  <button
                    key={h}
                    onClick={() => setHours(h)}
                    className={`btn btn-sm ${hours === h ? "btn-primary" : "btn-ghost"}`}
                  >
                    {h < 24 ? `${h}h` : `${h / 24}j`}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary" onClick={createSession} disabled={creating}>
                {creating ? "⟳ Création…" : "Générer le lien →"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>
            {/* QR Code */}
            <img
              src={`/api/qr?text=${encodeURIComponent(shareUrl!)}&size=180`}
              alt="QR Code"
              width={180}
              height={180}
              style={{ borderRadius: "var(--radius)", border: "1px solid var(--border)" }}
            />

            {/* Share code */}
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: "2.5rem",
                letterSpacing: "0.3em",
                color: "var(--gold)",
                fontWeight: 600,
              }}>
                {code}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                Code de partage · expire {new Date(expiresAt!).toLocaleString("fr-FR")}
              </div>
            </div>

            {/* URL */}
            <div style={{
              width: "100%",
              background: "var(--bg-3)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "0.6rem 0.9rem",
              display: "flex", gap: "0.5rem", alignItems: "center",
            }}>
              <span style={{
                flex: 1, fontSize: "0.8rem", color: "var(--text-dim)",
                fontFamily: "var(--font-mono)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {shareUrl}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => copy(shareUrl!)}
                style={{ flexShrink: 0 }}
              >
                {copied ? "✓" : "Copier"}
              </button>
            </div>

            {/* MEGA link if available */}
            {file.megaUrl && (
              <div style={{ width: "100%" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  Lien MEGA direct
                </div>
                <div style={{
                  background: "var(--bg-3)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "0.6rem 0.9rem",
                  display: "flex", gap: "0.5rem", alignItems: "center",
                }}>
                  <span style={{
                    flex: 1, fontSize: "0.8rem", color: "var(--text-dim)",
                    fontFamily: "var(--font-mono)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {file.megaUrl}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => copy(file.megaUrl!)}>
                    Copier
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", width: "100%", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setCode(null)}>
                Nouveau lien
              </button>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
