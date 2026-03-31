import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import FileCard from "@/components/FileCard";
import DropZone from "@/components/DropZone";
import ConvertModal from "@/components/ConvertModal";
import ShareModal from "@/components/ShareModal";
import MetadataModal from "@/components/MetadataModal";
import type { EbookFile, FileFormat } from "@/types";
import {
  detectFormat, getLocalFiles, addLocalFile, removeLocalFile, updateLocalFile,
} from "@/utils";
import { readEpubMetadata } from "@/services/epub";
import { enrichMetadataFromFilename } from "@/services/metadata";
import { uploadToMega } from "@/services/mega";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

const FORMATS: Array<FileFormat | "all"> = [
  "all", "epub", "kepub", "pdf", "mobi", "azw3", "cbz", "cbr", "txt", "docx"
];

export default function Library() {
  const [files, setFiles]       = useState<EbookFile[]>([]);
  const [filter, setFilter]     = useState<FileFormat | "all">("all");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [convertTarget, setConvert] = useState<EbookFile | null>(null);
  const [shareTarget, setShare]     = useState<EbookFile | null>(null);
  const [metaTarget, setMeta]       = useState<EbookFile | null>(null);
  const [showDrop, setShowDrop] = useState(false);
  const [sortBy, setSortBy]     = useState<"date" | "name" | "size">("date");

  useEffect(() => { setFiles(getLocalFiles()); }, []);
  const refresh = () => setFiles(getLocalFiles());

  const filtered = files
    .filter(f => filter === "all" || f.format === filter)
    .filter(f => {
      const q = search.toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        f.metadata?.title?.toLowerCase().includes(q) ||
        f.metadata?.author?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "size") return b.size - a.size;
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });

  const handleFiles = async (dropped: File[]) => {
    for (const raw of dropped) {
      const id     = uuidv4();
      const format = detectFormat(raw.name);
      const entry: EbookFile = {
        id, name: raw.name, originalName: raw.name,
        format, size: raw.size,
        uploadedAt: new Date().toISOString(),
        status: "local",
      };
      (window as typeof window & { _ebookFiles: Map<string, File> })._ebookFiles?.set(id, raw);
      addLocalFile(entry);
      refresh();
      try {
        const metadata = format === "epub"
          ? await readEpubMetadata(raw)
          : await enrichMetadataFromFilename(raw.name);
        updateLocalFile(id, { metadata });
        refresh();
      } catch { /* ignore */ }
    }
    toast.success(`${dropped.length} fichier(s) ajouté(s)`);
    setShowDrop(false);
  };

  const handleDelete = (id: string) => {
    removeLocalFile(id);
    refresh();
    toast.success("Supprimé");
  };

  const handleDeleteSelected = () => {
    for (const id of selected) removeLocalFile(id);
    setSelected(new Set());
    refresh();
    toast.success(`${selected.size} fichier(s) supprimé(s)`);
  };

  const handleUploadMega = async (file: EbookFile) => {
    const raw = (window as typeof window & { _ebookFiles: Map<string, File> })._ebookFiles?.get(file.id);
    if (!raw) { toast.error("Re-déposez le fichier pour pouvoir l'envoyer sur MEGA."); return; }
    updateLocalFile(file.id, { status: "uploading", uploadProgress: 0 });
    refresh();
    try {
      const result = await uploadToMega(raw, pct => {
        updateLocalFile(file.id, { uploadProgress: pct });
        setFiles(getLocalFiles());
      });
      updateLocalFile(file.id, { status: "uploaded", megaUrl: result.shareUrl, megaNodeHandle: result.nodeHandle });
      refresh();
      toast.success("Uploadé sur MEGA !");
    } catch (e: unknown) {
      updateLocalFile(file.id, { status: "error" });
      refresh();
      toast.error(e instanceof Error ? e.message : "Erreur upload MEGA");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(s => {
      const ns = new Set(s);
      ns.has(id) ? ns.delete(id) : ns.add(id);
      return ns;
    });
  };

  return (
    <Layout
      title="Bibliothèque"
      subtitle={`${files.length} fichier${files.length > 1 ? "s" : ""} · ${filtered.length} affiché${filtered.length > 1 ? "s" : ""}`}
      actions={
        <>
          {selected.size > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected}>
              Supprimer {selected.size} sélectionné(s)
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setShowDrop(v => !v)}>
            + Ajouter
          </button>
        </>
      }
    >
      {/* Drop zone (toggleable) */}
      {showDrop && (
        <div style={{ marginBottom: "1.5rem" }}>
          <DropZone onFiles={handleFiles} compact />
        </div>
      )}

      {/* Filters & search */}
      <div style={{
        display: "flex", gap: "0.75rem", marginBottom: "1.5rem",
        flexWrap: "wrap", alignItems: "center",
      }}>
        <input
          className="input"
          placeholder="Rechercher par titre, auteur, nom…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: "260px" }}
        />

        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {FORMATS.filter(f => f === "all" || files.some(fi => fi.format === f)).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`}
            >
              {f === "all" ? "Tous" : f.toUpperCase()}
            </button>
          ))}
        </div>

        <select
          className="input"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          style={{ width: "auto", padding: "0.5rem 0.75rem" }}
        >
          <option value="date">Date ↓</option>
          <option value="name">Nom A→Z</option>
          <option value="size">Taille ↓</option>
        </select>
      </div>

      {/* File list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>◫</div>
            <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>Aucun fichier trouvé.</p>
          </div>
        ) : (
          filtered.map(f => (
            <FileCard
              key={f.id}
              file={f}
              onDelete={handleDelete}
              onShare={setShare}
              onConvert={setConvert}
              onUploadMega={handleUploadMega}
              onEditMeta={setMeta}
              selected={selected.has(f.id)}
              onSelect={toggleSelect}
            />
          ))
        )}
      </div>

      {convertTarget && <ConvertModal file={convertTarget} onClose={() => setConvert(null)} onDone={refresh} />}
      {shareTarget   && <ShareModal   file={shareTarget}   onClose={() => setShare(null)} />}
      {metaTarget    && <MetadataModal file={metaTarget}   onClose={() => setMeta(null)} onSave={refresh} />}
    </Layout>
  );
}
