import { useState } from "react";
import type { EbookFile } from "@/types";
import { formatBytes, formatColor, timeAgo, truncate } from "@/utils";

interface Props {
  file: EbookFile;
  onDelete?: (id: string) => void;
  onShare?: (file: EbookFile) => void;
  onConvert?: (file: EbookFile) => void;
  onUploadMega?: (file: EbookFile) => void;
  onEditMeta?: (file: EbookFile) => void;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export default function FileCard({
  file, onDelete, onShare, onConvert, onUploadMega, onEditMeta, selected, onSelect,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const color = formatColor(file.format);

  return (
    <div
      className={`card card--glow animate-fade-up`}
      style={{
        position: "relative",
        display: "flex", gap: "1rem", alignItems: "flex-start",
        cursor: onSelect ? "pointer" : "default",
        outline: selected ? "2px solid var(--gold)" : "none",
        outlineOffset: "2px",
        transition: "all 0.18s",
      }}
      onClick={() => onSelect?.(file.id)}
    >
      {/* Format badge / cover */}
      <div style={{
        width: "52px", minWidth: "52px", height: "68px",
        background: "var(--bg-3)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        position: "relative",
      }}>
        {file.metadata?.cover ? (
          <img
            src={file.metadata.cover}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.6rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: `var(--${color})`,
          }}>
            {file.format}
          </span>
        )}
        {file.status === "uploading" && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(10,10,15,0.7)",
            display: "flex", alignItems: "flex-end",
          }}>
            <div className="progress-bar" style={{ margin: 0, borderRadius: 0 }}>
              <div className="progress-bar__fill" style={{ width: `${file.uploadProgress ?? 0}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          marginBottom: "0.25rem", flexWrap: "wrap",
        }}>
          <span style={{
            fontWeight: 500, color: "var(--cream)",
            fontSize: "0.9rem",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            maxWidth: "260px",
          }} title={file.name}>
            {truncate(file.name, 40)}
          </span>
          <span className={`badge badge-${color}`}>{file.format.toUpperCase()}</span>
          {file.status === "uploaded" && (
            <span className="badge badge-green">MEGA ↑</span>
          )}
          {file.status === "error" && (
            <span className="badge badge-red">Erreur</span>
          )}
        </div>

        {file.metadata?.author && (
          <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginBottom: "0.2rem" }}>
            {file.metadata.author}
            {file.metadata.year ? ` · ${file.metadata.year}` : ""}
          </div>
        )}

        <div style={{
          display: "flex", gap: "0.75rem", alignItems: "center",
          fontSize: "0.75rem", color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
        }}>
          <span>{formatBytes(file.size)}</span>
          <span>·</span>
          <span>{timeAgo(file.uploadedAt)}</span>
          {file.megaUrl && (
            <>
              <span>·</span>
              <a
                href={file.megaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ color: "var(--gold)", textDecoration: "none" }}
              >
                MEGA ↗
              </a>
            </>
          )}
        </div>

        {/* Tags */}
        {file.tags && file.tags.length > 0 && (
          <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            {file.tags.map(t => (
              <span key={t} className="badge badge-dim">{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Actions menu */}
      <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ padding: "0.35rem 0.6rem" }}
          onClick={() => setMenuOpen(v => !v)}
          title="Actions"
        >
          ⋮
        </button>

        {menuOpen && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 10 }}
              onClick={() => setMenuOpen(false)}
            />
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 4px)",
              background: "var(--surface-2)",
              border: "1px solid var(--border-2)",
              borderRadius: "var(--radius)",
              minWidth: "160px",
              zIndex: 20,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}>
              {[
                onConvert    && { label: "Convertir",      icon: "⇄", action: () => { onConvert(file);    setMenuOpen(false); } },
                onShare      && { label: "Partager",       icon: "↗", action: () => { onShare(file);      setMenuOpen(false); } },
                onUploadMega && { label: "Upload MEGA",    icon: "☁", action: () => { onUploadMega(file); setMenuOpen(false); } },
                onEditMeta   && { label: "Métadonnées",    icon: "✎", action: () => { onEditMeta(file);   setMenuOpen(false); } },
                onDelete     && { label: "Supprimer",      icon: "✕", action: () => { onDelete(file.id);  setMenuOpen(false); }, danger: true },
              ].filter(Boolean).map((item, i) => item && (
                <button
                  key={i}
                  onClick={item.action}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.6rem",
                    width: "100%", padding: "0.6rem 0.9rem",
                    background: "none", border: "none",
                    color: (item as { danger?: boolean }).danger ? "var(--red)" : "var(--text)",
                    fontSize: "0.85rem", cursor: "pointer",
                    transition: "background 0.1s",
                    textAlign: "left",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                >
                  <span style={{ width: "1rem", textAlign: "center", opacity: 0.7 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
