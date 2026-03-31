import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import DropZone from "@/components/DropZone";
import FileCard from "@/components/FileCard";
import ConvertModal from "@/components/ConvertModal";
import ShareModal from "@/components/ShareModal";
import MetadataModal from "@/components/MetadataModal";
import type { EbookFile } from "@/types";
import {
  detectFormat, getLocalFiles, addLocalFile, removeLocalFile, updateLocalFile, formatBytes,
} from "@/utils";
import { enrichMetadataFromFilename } from "@/services/metadata";
import { uploadToMega } from "@/services/mega";
import { readEpubMetadata } from "@/services/epub";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

// In-memory file map so we can access the actual File object later
if (typeof window !== "undefined") {
  (window as typeof window & { _ebookFiles: Map<string, File> })._ebookFiles =
    (window as typeof window & { _ebookFiles?: Map<string, File> })._ebookFiles ?? new Map();
}

export default function Home() {
  const router  = useRouter();
  const [files, setFiles]               = useState<EbookFile[]>([]);
  const [convertTarget, setConvertTarget] = useState<EbookFile | null>(null);
  const [shareTarget, setShareTarget]     = useState<EbookFile | null>(null);
  const [metaTarget, setMetaTarget]       = useState<EbookFile | null>(null);

  useEffect(() => { setFiles(getLocalFiles()); }, []);

  const refresh = () => setFiles(getLocalFiles());

  const handleFiles = useCallback(async (dropped: File[]) => {
    for (const raw of dropped) {
      const id     = uuidv4();
      const format = detectFormat(raw.name);

      const entry: EbookFile = {
        id,
        name:         raw.name,
        originalName: raw.name,
        format,
        size:         raw.size,
        uploadedAt:   new Date().toISOString(),
        status:       "local",
      };

      // Store raw file reference
      (window as typeof window & { _ebookFiles: Map<string, File> })._ebookFiles.set(id, raw);

      addLocalFile(entry);
      refresh();

      // Try to extract metadata
      try {
        let metadata = entry.metadata ?? {};
        if (format === "epub") {
          metadata = { ...metadata, ...(await readEpubMetadata(raw)) };
        } else {
          metadata = { ...metadata, ...(await enrichMetadataFromFilename(raw.name)) };
        }
        updateLocalFile(id, { metadata });
        refresh();
      } catch { /* metadata not critical */ }
    }
    toast.success(`${dropped.length} fichier${dropped.length > 1 ? "s" : ""} ajouté${dropped.length > 1 ? "s" : ""}`);
  }, []);

  const handleDelete = (id: string) => {
    removeLocalFile(id);
    (window as typeof window & { _ebookFiles: Map<string, File> })._ebookFiles?.delete(id);
    refresh();
    toast.success("Supprimé");
  };

  const handleUploadMega = async (file: EbookFile) => {
    const raw = (window as typeof window & { _ebookFiles: Map<string, File> })._ebookFiles?.get(file.id);
    if (!raw) {
      toast.error("Fichier introuvable. Re-déposez-le dans la zone de dépôt.");
      return;
    }

    updateLocalFile(file.id, { status: "uploading", uploadProgress: 0 });
    refresh();

    try {
      const result = await uploadToMega(raw, pct => {
        updateLocalFile(file.id, { uploadProgress: pct });
        refresh();
      });
      updateLocalFile(file.id, {
        status:          "uploaded",
        megaUrl:         result.shareUrl,
        megaNodeHandle:  result.nodeHandle,
        uploadProgress:  100,
      });
      refresh();
      toast.success("Uploadé sur MEGA !");
    } catch (e: unknown) {
      updateLocalFile(file.id, { status: "error", uploadProgress: 0 });
      refresh();
      toast.error(e instanceof Error ? e.message : "Upload MEGA échoué");
    }
  };

  const recentFiles = files.slice(0, 6);

  // Stats
  const totalSize  = files.reduce((s, f) => s + f.size, 0);
  const megaCount  = files.filter(f => f.status === "uploaded").length;
  const fmtCounts  = files.reduce((acc, f) => {
    acc[f.format] = (acc[f.format] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topFormat  = Object.entries(fmtCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <Layout>
      {/* Hero */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "2.5rem",
            fontWeight: 700,
            color: "var(--cream)",
            fontStyle: "italic",
            lineHeight: 1,
          }}>
            EbookHub
          </h1>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.1em" }}>
            FILE BRIDGE
          </span>
        </div>
        <p style={{ color: "var(--text-dim)", fontSize: "1rem", maxWidth: "540px" }}>
          Transférez, convertissez et gérez vos ebooks entre liseuse, téléphone et ordinateur — via MEGA et liens partagés.
        </p>
      </div>

      {/* Stats row */}
      {files.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "0.75rem", marginBottom: "2rem",
        }}>
          {[
            { label: "Fichiers",    value: files.length },
            { label: "Taille tot.", value: formatBytes(totalSize) },
            { label: "Sur MEGA",   value: megaCount },
            { label: "Format top", value: topFormat ? topFormat[0].toUpperCase() : "—" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", color: "var(--gold)", fontWeight: 600 }}>
                {s.value}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div style={{ marginBottom: "2rem" }}>
        <DropZone onFiles={handleFiles} />
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => router.push("/library")}>
          ◫ Bibliothèque complète
        </button>
        <button className="btn btn-ghost" onClick={() => router.push("/transfer")}>
          ⇄ Recevoir un fichier
        </button>
        <button className="btn btn-ghost" onClick={() => router.push("/tools")}>
          ⚙ Outils de conversion
        </button>
      </div>

      {/* Recent files */}
      {recentFiles.length > 0 && (
        <section>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "1rem",
          }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--cream)", fontStyle: "italic" }}>
              Fichiers récents
            </h2>
            {files.length > 6 && (
              <button className="btn btn-ghost btn-sm" onClick={() => router.push("/library")}>
                Voir tout →
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {recentFiles.map(f => (
              <FileCard
                key={f.id}
                file={f}
                onDelete={handleDelete}
                onShare={setShareTarget}
                onConvert={setConvertTarget}
                onUploadMega={handleUploadMega}
                onEditMeta={setMetaTarget}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {files.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📖</div>
          <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--text-dim)", fontSize: "1.1rem" }}>
            Votre bibliothèque est vide.
          </p>
          <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
            Déposez des fichiers ci-dessus pour commencer.
          </p>
        </div>
      )}

      {/* Modals */}
      {convertTarget && (
        <ConvertModal
          file={convertTarget}
          onClose={() => setConvertTarget(null)}
          onDone={() => { refresh(); setConvertTarget(null); }}
        />
      )}
      {shareTarget && (
        <ShareModal file={shareTarget} onClose={() => setShareTarget(null)} />
      )}
      {metaTarget && (
        <MetadataModal
          file={metaTarget}
          onClose={() => setMetaTarget(null)}
          onSave={() => { refresh(); setMetaTarget(null); }}
        />
      )}
    </Layout>
  );
}
