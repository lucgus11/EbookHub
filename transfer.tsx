import { useState } from "react";
import Layout from "@/components/Layout";
import DropZone from "@/components/DropZone";
import type { EbookFile, ShareSession } from "@/types";
import { detectFormat, addLocalFile, formatBytes } from "@/utils";
import { uploadToMega } from "@/services/mega";
import { v4 as uuidv4 } from "uuid";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";

export default function Transfer() {
  const [tab, setTab] = useState<"send" | "receive">("send");

  // Send
  const [sendFiles, setSendFiles]   = useState<File[]>([]);
  const [sendCode, setSendCode]     = useState<string | null>(null);
  const [sendExpiry, setSendExpiry] = useState<string | null>(null);
  const [sending, setSending]       = useState(false);
  const [sendHours, setSendHours]   = useState(24);

  // Receive
  const [code, setCode]       = useState("");
  const [session, setSession] = useState<ShareSession | null>(null);
  const [fetching, setFetching] = useState(false);

  const handleSend = async () => {
    if (!sendFiles.length) return;
    setSending(true);
    try {
      // Build EbookFile entries (without actual upload — use share session)
      const fileEntries: EbookFile[] = sendFiles.map(f => ({
        id:           uuidv4(),
        name:         f.name,
        originalName: f.name,
        format:       detectFormat(f.name),
        size:         f.size,
        uploadedAt:   new Date().toISOString(),
        status:       "local" as const,
      }));

      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: fileEntries, expiresInHours: sendHours }),
      });
      if (!res.ok) throw new Error("Création du partage échouée");
      const data = await res.json();
      setSendCode(data.code);
      setSendExpiry(data.expiresAt);
      toast.success("Session de transfert créée !");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSending(false);
    }
  };

  const handleReceive = async () => {
    if (!code.trim()) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/share?code=${code.trim().toUpperCase()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Code invalide ou expiré");
      }
      const data: ShareSession = await res.json();
      setSession(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setFetching(false);
    }
  };

  const downloadFromSession = async (file: EbookFile) => {
    if (file.megaUrl) {
      window.open(file.megaUrl, "_blank");
    } else {
      toast("Ce fichier n'a pas de lien direct. Demandez à l'expéditeur de l'uploader sur MEGA.", { icon: "ℹ" });
    }
    // Save to local library
    addLocalFile({ ...file, status: "local" });
    toast.success("Ajouté à votre bibliothèque !");
  };

  const shareUrl = sendCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${sendCode}`
    : null;

  return (
    <Layout
      title="Transfert"
      subtitle="Envoyez et recevez des fichiers entre vos appareils"
    >
      {/* Tabs */}
      <div style={{
        display: "flex", gap: 0, marginBottom: "2rem",
        borderBottom: "1px solid var(--border)",
      }}>
        {(["send", "receive"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "0.7rem 1.5rem",
              background: "none", border: "none",
              borderBottom: `2px solid ${tab === t ? "var(--gold)" : "transparent"}`,
              color: tab === t ? "var(--gold)" : "var(--text-dim)",
              cursor: "pointer", fontSize: "0.9rem", fontWeight: 500,
              transition: "all 0.15s",
              marginBottom: "-1px",
            }}
          >
            {t === "send" ? "↑ Envoyer" : "↓ Recevoir"}
          </button>
        ))}
      </div>

      {/* SEND */}
      {tab === "send" && (
        <div style={{ maxWidth: "600px" }}>
          {!sendCode ? (
            <>
              <DropZone onFiles={f => setSendFiles(prev => [...prev, ...f])} compact />

              {sendFiles.length > 0 && (
                <div style={{ marginTop: "1rem", marginBottom: "1.25rem" }}>
                  {sendFiles.map((f, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "0.5rem 0.75rem",
                      background: "var(--bg-3)",
                      borderRadius: "var(--radius)",
                      marginBottom: "0.4rem",
                      fontSize: "0.85rem",
                    }}>
                      <span style={{ color: "var(--text)" }}>{f.name}</span>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                          {formatBytes(f.size)}
                        </span>
                        <button
                          style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer" }}
                          onClick={() => setSendFiles(prev => prev.filter((_, j) => j !== i))}
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginBottom: "0.5rem" }}>
                  Durée de validité du lien
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {[1, 6, 24, 72, 168].map(h => (
                    <button
                      key={h}
                      className={`btn btn-sm ${sendHours === h ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setSendHours(h)}
                    >
                      {h < 24 ? `${h}h` : `${h / 24}j`}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg"
                onClick={handleSend}
                disabled={sendFiles.length === 0 || sending}
              >
                {sending ? "⟳ Création du partage…" : "Générer le code de transfert →"}
              </button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", padding: "1rem 0" }}>
              <div style={{
                padding: "1.5rem 2rem",
                background: "var(--bg-3)",
                border: "1px solid var(--border-2)",
                borderRadius: "var(--radius-xl)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: "0.5rem" }}>
                  CODE DE TRANSFERT
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "3rem",
                  letterSpacing: "0.3em",
                  color: "var(--gold)",
                  fontWeight: 700,
                }}>
                  {sendCode}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                  expire le {new Date(sendExpiry!).toLocaleString("fr-FR")}
                </div>
              </div>

              <img
                src={`/api/qr?text=${encodeURIComponent(shareUrl!)}&size=200`}
                alt="QR"
                style={{ borderRadius: "var(--radius)", border: "1px solid var(--border-2)" }}
              />

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => { navigator.clipboard.writeText(shareUrl!); toast.success("Lien copié"); }}
                >
                  Copier le lien
                </button>
                <button className="btn btn-ghost" onClick={() => setSendCode(null)}>
                  Nouveau transfert
                </button>
              </div>

              <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", textAlign: "center", maxWidth: "320px" }}>
                Sur l'autre appareil, allez dans <strong style={{ color: "var(--text)" }}>Transfert → Recevoir</strong> et saisissez ce code.
              </p>
            </div>
          )}
        </div>
      )}

      {/* RECEIVE */}
      {tab === "receive" && (
        <div style={{ maxWidth: "600px" }}>
          {!session ? (
            <>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "0.5rem" }}>
                  Saisissez le code de transfert
                </label>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <input
                    className="input"
                    placeholder="ex. AB3X7K"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                    onKeyDown={e => e.key === "Enter" && handleReceive()}
                    style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", letterSpacing: "0.2em", maxWidth: "180px" }}
                    maxLength={6}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleReceive}
                    disabled={code.length < 6 || fetching}
                  >
                    {fetching ? "⟳" : "Accéder →"}
                  </button>
                </div>
              </div>

              <div style={{
                padding: "1.25rem",
                background: "var(--bg-3)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                fontSize: "0.85rem",
                color: "var(--text-dim)",
              }}>
                <p style={{ marginBottom: "0.5rem", color: "var(--text)" }}>💡 Comment ça marche :</p>
                <ol style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <li>Sur l'appareil émetteur, allez dans <strong style={{ color: "var(--text)" }}>Transfert → Envoyer</strong></li>
                  <li>Sélectionnez vos fichiers et générez un code</li>
                  <li>Saisissez le code ici pour accéder aux fichiers</li>
                </ol>
              </div>
            </>
          ) : (
            <div>
              <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ color: "var(--cream)", fontFamily: "var(--font-display)", fontStyle: "italic" }}>
                    Session de transfert
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    Code: {session.code} · {session.files.length} fichier(s)
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSession(null)}>
                  Changer de code
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {session.files.map(f => (
                  <div key={f.id} className="card" style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "var(--cream)", fontSize: "0.9rem", fontWeight: 500, marginBottom: "0.2rem" }}>
                        {f.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {f.format.toUpperCase()} · {formatBytes(f.size)}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => downloadFromSession(f)}
                    >
                      ↓ Télécharger
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
