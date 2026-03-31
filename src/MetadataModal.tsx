import { useState, useEffect } from "react";
import type { EbookFile, BookMetadata } from "@/types";
import { searchBookMetadata } from "@/services/metadata";
import { updateLocalFile } from "@/utils";
import toast from "react-hot-toast";

interface Props {
  file: EbookFile;
  onClose: () => void;
  onSave?: (file: EbookFile) => void;
}

export default function MetadataModal({ file, onClose, onSave }: Props) {
  const [meta, setMeta]       = useState<BookMetadata>(file.metadata ?? {});
  const [query, setQuery]     = useState(`${meta.author ?? ""} ${meta.title ?? ""}`.trim());
  const [results, setResults] = useState<BookMetadata[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving]   = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await searchBookMetadata(query);
      setResults(r);
    } catch { /* ignore */ }
    finally { setSearching(false); }
  };

  const apply = (m: BookMetadata) => {
    setMeta(prev => ({ ...prev, ...m }));
    setResults([]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated: EbookFile = { ...file, metadata: meta };
      updateLocalFile(file.id, { metadata: meta });
      onSave?.(updated);
      toast.success("Métadonnées sauvegardées");
      onClose();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    key: keyof BookMetadata,
    type: "text" | "number" = "text"
  ) => (
    <div>
      <label style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "block", marginBottom: "0.35rem" }}>
        {label}
      </label>
      <input
        className="input"
        type={type}
        value={(meta[key] as string | number | undefined) ?? ""}
        onChange={e => setMeta(m => ({ ...m, [key]: type === "number" ? parseInt(e.target.value) || undefined : e.target.value }))}
      />
    </div>
  );

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(4px)",
        overflowY: "auto",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card animate-fade-up" style={{
        width: "100%", maxWidth: "580px",
        background: "var(--bg-2)",
        border: "1px solid var(--border-2)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        margin: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--cream)", fontSize: "1.3rem" }}>
            Métadonnées
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Online search */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginBottom: "0.4rem" }}>
            Recherche en ligne (Open Library · Google Books)
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              className="input"
              placeholder="Auteur, titre, ISBN…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-ghost" onClick={search} disabled={searching}>
              {searching ? "⟳" : "Chercher"}
            </button>
          </div>

          {results.length > 0 && (
            <div style={{
              marginTop: "0.5rem",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              maxHeight: "200px",
              overflowY: "auto",
            }}>
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => apply(r)}
                  style={{
                    display: "flex", gap: "0.75rem", alignItems: "center",
                    width: "100%", padding: "0.6rem 0.9rem",
                    background: "none", border: "none",
                    borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none",
                    cursor: "pointer", textAlign: "left",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                >
                  {r.cover && (
                    <img src={r.cover} alt="" style={{ width: "28px", height: "40px", objectFit: "cover", borderRadius: "2px" }} />
                  )}
                  <div>
                    <div style={{ color: "var(--cream)", fontSize: "0.85rem", fontWeight: 500 }}>{r.title}</div>
                    <div style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>
                      {r.author}{r.year ? ` · ${r.year}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <hr className="divider" />

        {/* Manual fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {field("Titre", "title")}
          {field("Auteur", "author")}
          {field("Éditeur", "publisher")}
          {field("Année", "year", "number")}
          {field("ISBN", "isbn")}
          {field("Langue", "language")}
          {field("Série", "series")}
          {field("N° de série", "seriesIndex", "number")}
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "block", marginBottom: "0.35rem" }}>
            Description
          </label>
          <textarea
            className="input"
            rows={3}
            value={meta.description ?? ""}
            onChange={e => setMeta(m => ({ ...m, description: e.target.value }))}
            style={{ resize: "vertical", fontFamily: "var(--font-body)" }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "⟳ Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}
