import { useState } from "react";
import type { EbookFile, FileFormat, ConversionOptions } from "@/types";
import { canConvert, getConversionPairs, formatColor } from "@/utils";
import toast from "react-hot-toast";
import { saveAs } from "file-saver";

interface Props {
  file: EbookFile;
  onClose: () => void;
  onDone?: (result: EbookFile) => void;
}

const FORMAT_LABELS: Partial<Record<FileFormat, string>> = {
  kepub: "KEPUB (Kobo)",
  epub:  "EPUB",
  pdf:   "PDF",
  mobi:  "MOBI (Kindle)",
  azw3:  "AZW3 (Kindle)",
  txt:   "Texte brut",
  html:  "HTML",
  cbz:   "CBZ",
};

export default function ConvertModal({ file, onClose, onDone }: Props) {
  const [target, setTarget]     = useState<FileFormat | "">("");
  const [options, setOptions]   = useState<ConversionOptions>({});
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState(0);

  // What can this file be converted to?
  const pairs = getConversionPairs();
  const targets = pairs
    .filter(([from]) => from === file.format)
    .map(([, to]) => to);

  const handleConvert = async () => {
    if (!target) return;
    setLoading(true);
    setProgress(10);

    try {
      let endpoint = "";
      const formData = new FormData();

      // We need the actual File object; try to get it from IndexedDB or re-upload
      // For demo: fetch file from mega URL or local
      if (target === "kepub" && file.format === "epub") {
        endpoint = "/api/tools/kepubify";
        if (options.kepubify?.smartenPunctuation) {
          formData.append("smartenPunctuation", "true");
        }
      } else if (target === "pdf" && file.format === "epub") {
        endpoint = "/api/tools/epub-to-pdf";
      } else {
        endpoint = "/api/tools/convert";
        formData.append("targetFormat", target);
      }

      // If we have a file handle from IndexedDB, use it
      // Otherwise tell the user to re-drop the file
      const storedFile = (window as typeof window & { _ebookFiles?: Map<string, File> })._ebookFiles?.get(file.id);
      if (!storedFile) {
        toast.error("Glissez à nouveau le fichier dans la zone de dépôt, puis relancez la conversion.");
        setLoading(false);
        return;
      }

      formData.append("file", storedFile);
      setProgress(30);

      const res = await fetch(endpoint, { method: "POST", body: formData });
      setProgress(80);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Conversion failed (${res.status})`);
      }

      const data = await res.json();
      setProgress(95);

      // Decode base64 and trigger download
      const bytes  = Uint8Array.from(atob(data.data), c => c.charCodeAt(0));
      const blob   = new Blob([bytes], { type: "application/octet-stream" });
      saveAs(blob, data.filename ?? `${file.name.replace(/\.[^.]+$/, "")}.${target}`);

      setProgress(100);
      toast.success(`Converti en ${target.toUpperCase()} avec succès !`);
      onDone?.({
        ...file,
        id:     crypto.randomUUID(),
        name:   data.filename ?? `${file.name}.${target}`,
        format: target,
        size:   data.size ?? bytes.length,
        status: "local",
        uploadedAt: new Date().toISOString(),
      });
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Conversion échouée");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
      backdropFilter: "blur(4px)",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card animate-fade-up" style={{
        width: "100%", maxWidth: "480px",
        background: "var(--bg-2)",
        border: "1px solid var(--border-2)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--cream)", fontSize: "1.3rem" }}>
              Convertir
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
              {file.name}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {targets.length === 0 ? (
          <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
            Aucune conversion disponible pour le format {file.format.toUpperCase()}.
          </p>
        ) : (
          <>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "0.5rem" }}>
                Format cible
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {targets.map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setTarget(fmt)}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius)",
                      border: `1px solid ${target === fmt ? "var(--gold-dim)" : "var(--border)"}`,
                      background: target === fmt ? "var(--gold-glow)" : "var(--bg-3)",
                      color: target === fmt ? "var(--gold)" : "var(--text)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{fmt.toUpperCase()}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                      {FORMAT_LABELS[fmt] ?? fmt}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* KEPUB options */}
            {target === "kepub" && (
              <div style={{
                padding: "1rem",
                background: "var(--bg-3)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                marginBottom: "1rem",
              }}>
                <div style={{ fontSize: "0.8rem", color: "var(--gold)", marginBottom: "0.75rem", fontWeight: 500 }}>
                  Options kepubify
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.85rem" }}>
                  <input
                    type="checkbox"
                    checked={options.kepubify?.smartenPunctuation ?? false}
                    onChange={e => setOptions(o => ({ ...o, kepubify: { ...o.kepubify, smartenPunctuation: e.target.checked } }))}
                    style={{ accentColor: "var(--gold)" }}
                  />
                  Smarten punctuation (guillemets typographiques)
                </label>
              </div>
            )}

            {loading && (
              <div style={{ marginBottom: "1rem" }}>
                <div className="progress-bar">
                  <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem", fontFamily: "var(--font-mono)" }}>
                  Conversion en cours... {progress}%
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Annuler</button>
              <button
                className="btn btn-primary"
                onClick={handleConvert}
                disabled={!target || loading}
              >
                {loading ? "⟳ Conversion…" : "Convertir →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
