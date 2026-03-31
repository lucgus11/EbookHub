import { useState, useRef } from "react";
import Layout from "@/components/Layout";
import DropZone from "@/components/DropZone";
import { mergePDFs, splitPDF, compressPDF, rotatePDF, getPDFInfo } from "@/services/pdf";
import { readEpubMetadata, writEpubMetadata, getEpubSpine } from "@/services/epub";
import { formatBytes, detectFormat } from "@/utils";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";

type ToolId =
  | "kepubify" | "pdf-crop" | "pdf-merge" | "pdf-split" | "pdf-compress"
  | "pdf-rotate" | "pdf-info" | "epub-meta" | "epub-spine"
  | "cbr-to-cbz" | "batch-rename" | "txt-clean";

interface Tool {
  id: ToolId;
  icon: string;
  name: string;
  desc: string;
  accepts: string[];
  badge?: string;
  server?: boolean;
}

const TOOLS: Tool[] = [
  { id: "kepubify",     icon: "⇢", name: "EPUB → KEPUB",       desc: "Convertit un EPUB pour Kobo (kepubify)", accepts: [".epub"], badge: "Kobo" },
  { id: "pdf-crop",     icon: "✂", name: "PDF Crop Margins",    desc: "Supprime les marges blanches (pdfCropMargins)", accepts: [".pdf"], badge: "Liseuse", server: true },
  { id: "pdf-merge",    icon: "⊕", name: "Fusionner PDFs",      desc: "Assemble plusieurs PDF en un seul", accepts: [".pdf"] },
  { id: "pdf-split",    icon: "⊘", name: "Couper un PDF",       desc: "Extrait des plages de pages", accepts: [".pdf"] },
  { id: "pdf-compress", icon: "⊟", name: "Compresser PDF",      desc: "Réduit la taille du fichier PDF", accepts: [".pdf"] },
  { id: "pdf-rotate",   icon: "↻", name: "Pivoter PDF",         desc: "Fait pivoter les pages d'un PDF", accepts: [".pdf"] },
  { id: "pdf-info",     icon: "ℹ", name: "Infos PDF",           desc: "Affiche les métadonnées et stats du PDF", accepts: [".pdf"] },
  { id: "epub-meta",    icon: "✎", name: "Lire métadonnées EPUB", desc: "Extrait et affiche les métadonnées EPUB", accepts: [".epub"] },
  { id: "epub-spine",   icon: "≡", name: "Table des matières EPUB", desc: "Liste les chapitres/items de la spine EPUB", accepts: [".epub"] },
  { id: "cbr-to-cbz",  icon: "☰", name: "CBR → CBZ",           desc: "Convertit une archive CBR en CBZ (client-side)", accepts: [".cbr"] },
  { id: "txt-clean",   icon: "⌧", name: "Nettoyer TXT",        desc: "Retire les sauts de ligne superflus (textes OCR)", accepts: [".txt"] },
  { id: "batch-rename", icon: "⊞", name: "Renommage en lot",    desc: "Renomme selon le pattern Auteur - Titre", accepts: [".epub", ".pdf", ".mobi"] },
];

export default function Tools() {
  const [active, setActive]   = useState<ToolId | null>(null);
  const [files, setFiles]     = useState<File[]>([]);
  const [result, setResult]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  // tool-specific state
  const [splitRange, setSplitRange]   = useState("1-5");
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90);
  const [cropPct, setCropPct]         = useState(10);
  const [renamePattern, setRenamePattern] = useState("{author} - {title}");

  const tool = TOOLS.find(t => t.id === active);

  const run = async () => {
    if (!files.length || !active) return;
    setLoading(true);
    setProgress(10);
    setResult(null);

    try {
      switch (active) {

        case "kepubify": {
          const fd = new FormData();
          fd.append("file", files[0]);
          setProgress(30);
          const res = await fetch("/api/tools/kepubify", { method: "POST", body: fd });
          setProgress(80);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          const bytes = Uint8Array.from(atob(data.data), c => c.charCodeAt(0));
          saveAs(new Blob([bytes]), data.filename);
          if (data.note) setResult(`ℹ ${data.note}`);
          else setResult(`✓ Converti : ${data.filename} (${formatBytes(data.size)})`);
          toast.success("Converti en KEPUB !");
          break;
        }

        case "pdf-crop": {
          const fd = new FormData();
          fd.append("file", files[0]);
          fd.append("percentRetain", String(cropPct));
          setProgress(30);
          const res = await fetch("/api/tools/pdf-crop", { method: "POST", body: fd });
          setProgress(80);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          const bytes = Uint8Array.from(atob(data.data), c => c.charCodeAt(0));
          saveAs(new Blob([bytes], { type: "application/pdf" }), data.filename);
          setResult(data.note
            ? `ℹ ${data.note}`
            : `✓ Marges coupées : ${data.filename} (${formatBytes(data.size)})`
          );
          toast.success("Marges coupées !");
          break;
        }

        case "pdf-merge": {
          setProgress(40);
          const blob = await mergePDFs(files);
          setProgress(90);
          saveAs(blob, "merged.pdf");
          setResult(`✓ ${files.length} PDFs fusionnés → merged.pdf (${formatBytes(blob.size)})`);
          toast.success("PDFs fusionnés !");
          break;
        }

        case "pdf-split": {
          const ranges: Array<[number, number]> = splitRange
            .split(",")
            .map(r => r.trim().split("-").map(Number))
            .filter(r => r.length === 2)
            .map(r => [r[0], r[1]]);
          if (!ranges.length) throw new Error("Format invalide. Ex: 1-5, 6-10");
          setProgress(30);
          const blobs = await splitPDF(files[0], ranges);
          setProgress(85);
          blobs.forEach((b, i) => {
            const name = files[0].name.replace(".pdf", `_part${i + 1}.pdf`);
            saveAs(b, name);
          });
          setResult(`✓ ${blobs.length} fichier(s) exporté(s)`);
          toast.success(`PDF découpé en ${blobs.length} partie(s) !`);
          break;
        }

        case "pdf-compress": {
          setProgress(40);
          const blob = await compressPDF(files[0]);
          setProgress(90);
          const name = files[0].name.replace(".pdf", "_compressed.pdf");
          saveAs(blob, name);
          const saved = files[0].size - blob.size;
          setResult(`✓ ${name} · ${formatBytes(blob.size)} ${saved > 0 ? `(−${formatBytes(saved)})` : ""}`);
          toast.success("PDF compressé !");
          break;
        }

        case "pdf-rotate": {
          setProgress(40);
          const blob = await rotatePDF(files[0], rotateAngle);
          setProgress(90);
          const name = files[0].name.replace(".pdf", `_rot${rotateAngle}.pdf`);
          saveAs(blob, name);
          setResult(`✓ Pivoté de ${rotateAngle}°`);
          toast.success("PDF pivoté !");
          break;
        }

        case "pdf-info": {
          setProgress(50);
          const info = await getPDFInfo(files[0]);
          setProgress(100);
          setResult(
            `📄 ${files[0].name}\n` +
            `Pages: ${info.pageCount}\n` +
            `Taille: ${formatBytes(info.fileSizeBytes)}\n` +
            (info.title    ? `Titre: ${info.title}\n` : "") +
            (info.author   ? `Auteur: ${info.author}\n` : "") +
            (info.creator  ? `Logiciel: ${info.creator}\n` : "") +
            (info.creationDate ? `Créé: ${new Date(info.creationDate).toLocaleDateString("fr-FR")}` : "")
          );
          break;
        }

        case "epub-meta": {
          setProgress(50);
          const meta = await readEpubMetadata(files[0]);
          setProgress(100);
          setResult(
            `📚 ${files[0].name}\n` +
            Object.entries(meta)
              .filter(([k, v]) => k !== "cover" && v)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n")
          );
          break;
        }

        case "epub-spine": {
          setProgress(50);
          const spine = await getEpubSpine(files[0]);
          setProgress(100);
          setResult(`Spine (${spine.length} items):\n` + spine.map((s, i) => `${i + 1}. ${s}`).join("\n"));
          break;
        }

        case "txt-clean": {
          const text = await files[0].text();
          setProgress(50);
          // Remove single newlines (keep double), normalize spaces
          const cleaned = text
            .replace(/([^\n])\n([^\n])/g, "$1 $2")
            .replace(/ {2,}/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
          setProgress(90);
          const blob = new Blob([cleaned], { type: "text/plain" });
          saveAs(blob, files[0].name.replace(".txt", "_clean.txt"));
          const saved = files[0].size - blob.size;
          setResult(`✓ Nettoyé · ${formatBytes(blob.size)} ${saved > 0 ? `(−${formatBytes(saved)})` : ""}`);
          toast.success("Texte nettoyé !");
          break;
        }

        case "batch-rename": {
          const results: string[] = [];
          for (const f of files) {
            // Try to get metadata from filename pattern "Author - Title.ext"
            const base = f.name.replace(/\.[^.]+$/, "");
            const parts = base.split(" - ");
            const author = parts.length >= 2 ? parts[0].trim() : "";
            const title  = parts.length >= 2 ? parts.slice(1).join(" - ").trim() : base;
            const ext    = f.name.split(".").pop() ?? "";
            const newName = renamePattern
              .replace("{author}", author || "Inconnu")
              .replace("{title}",  title  || "Sans titre")
              + "." + ext;
            results.push(`${f.name} → ${newName}`);
          }
          setResult("Prévisualisation :\n" + results.join("\n"));
          break;
        }

        default:
          toast("Outil non encore implémenté.", { icon: "🚧" });
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
      setResult(null);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <Layout
      title="Outils"
      subtitle="Convertissez, analysez et manipulez vos fichiers"
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "2rem" }}
        className="tools-grid">
        {/* Tool picker */}
        <div>
          <div style={{ marginBottom: "1rem", fontSize: "0.8rem", color: "var(--text-dim)" }}>
            Sélectionnez un outil
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {TOOLS.map(t => (
              <button
                key={t.id}
                onClick={() => { setActive(t.id); setFiles([]); setResult(null); }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "0.75rem",
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius)",
                  border: `1px solid ${active === t.id ? "var(--gold-dim)" : "var(--border)"}`,
                  background: active === t.id ? "var(--gold-glow)" : "var(--surface)",
                  cursor: "pointer", textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "1.2rem", color: "var(--gold)", minWidth: "1.5rem" }}>{t.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: "flex", gap: "0.4rem", alignItems: "center",
                    color: active === t.id ? "var(--gold)" : "var(--text)",
                    fontSize: "0.875rem", fontWeight: 500,
                  }}>
                    {t.name}
                    {t.badge && <span className="badge badge-gold" style={{ fontSize: "0.6rem" }}>{t.badge}</span>}
                    {t.server && <span className="badge badge-blue" style={{ fontSize: "0.6rem" }}>Serveur</span>}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                    {t.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tool panel */}
        <div>
          {!active ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%",
              color: "var(--text-muted)", textAlign: "center", gap: "1rem",
              padding: "3rem",
            }}>
              <span style={{ fontSize: "3rem" }}>⚙</span>
              <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--text-dim)" }}>
                Sélectionnez un outil à gauche
              </p>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--cream)", fontSize: "1.25rem", marginBottom: "0.3rem" }}>
                  {tool?.icon} {tool?.name}
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>{tool?.desc}</p>
              </div>

              <DropZone
                onFiles={f => setFiles(prev =>
                  ["pdf-merge"].includes(active) ? [...prev, ...f] : [f[0]]
                )}
                accept={tool?.accepts}
                multiple={active === "pdf-merge" || active === "batch-rename"}
                compact
                label={active === "pdf-merge" ? "Déposez les PDFs à fusionner" : `Déposez votre ${tool?.accepts.join(", ")}`}
              />

              {files.length > 0 && (
                <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--text-dim)" }}>
                  {files.length === 1
                    ? `${files[0].name} · ${formatBytes(files[0].size)}`
                    : `${files.length} fichiers sélectionnés`}
                </div>
              )}

              {/* Tool-specific options */}
              {active === "pdf-split" && (
                <div style={{ marginTop: "1rem" }}>
                  <label style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "block", marginBottom: "0.35rem" }}>
                    Plages de pages (ex: 1-5, 6-10)
                  </label>
                  <input
                    className="input"
                    value={splitRange}
                    onChange={e => setSplitRange(e.target.value)}
                    placeholder="1-5, 6-10, 11-20"
                  />
                </div>
              )}

              {active === "pdf-rotate" && (
                <div style={{ marginTop: "1rem" }}>
                  <label style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "block", marginBottom: "0.35rem" }}>
                    Angle de rotation
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {([90, 180, 270] as const).map(a => (
                      <button
                        key={a}
                        className={`btn btn-sm ${rotateAngle === a ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setRotateAngle(a)}
                      >
                        {a}°
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {active === "pdf-crop" && (
                <div style={{ marginTop: "1rem" }}>
                  <label style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "block", marginBottom: "0.35rem" }}>
                    % de marge à conserver : {cropPct}%
                  </label>
                  <input
                    type="range" min={0} max={30} value={cropPct}
                    onChange={e => setCropPct(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--gold)" }}
                  />
                </div>
              )}

              {active === "batch-rename" && (
                <div style={{ marginTop: "1rem" }}>
                  <label style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "block", marginBottom: "0.35rem" }}>
                    Pattern de renommage
                  </label>
                  <input
                    className="input"
                    value={renamePattern}
                    onChange={e => setRenamePattern(e.target.value)}
                    placeholder="{author} - {title}"
                  />
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                    Variables disponibles : {"{author}"}, {"{title}"}, {"{year}"}
                  </div>
                </div>
              )}

              {loading && (
                <div style={{ marginTop: "1rem" }}>
                  <div className="progress-bar">
                    <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem", fontFamily: "var(--font-mono)" }}>
                    Traitement… {progress}%
                  </p>
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={run}
                disabled={files.length === 0 || loading}
                style={{ marginTop: "1.25rem" }}
              >
                {loading ? "⟳ Traitement…" : `Lancer ${tool?.name} →`}
              </button>

              {result && (
                <div style={{
                  marginTop: "1.25rem",
                  padding: "1rem",
                  background: "var(--bg-3)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: "0.82rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.8,
                  maxHeight: "300px",
                  overflowY: "auto",
                }}>
                  {result}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .tools-grid {
          grid-template-columns: minmax(0,1fr) minmax(0,1fr);
        }
        @media (max-width: 768px) {
          .tools-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </Layout>
  );
}
