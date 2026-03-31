import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  onFiles: (files: File[]) => void;
  accept?: string[];
  multiple?: boolean;
  maxSize?: number;
  label?: string;
  sublabel?: string;
  compact?: boolean;
}

const DEFAULT_ACCEPT = [
  ".epub", ".kepub", ".pdf", ".mobi", ".azw3",
  ".cbz", ".cbr", ".txt", ".html", ".docx",
  ".fb2", ".lit", ".djvu", ".zip",
];

export default function DropZone({
  onFiles,
  accept = DEFAULT_ACCEPT,
  multiple = true,
  maxSize = 500 * 1024 * 1024,
  label = "Déposez vos fichiers ici",
  sublabel = "ou cliquez pour parcourir",
  compact = false,
}: Props) {
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setDragOver(false);
    if (accepted.length > 0) onFiles(accepted);
  }, [onFiles]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    multiple,
    maxSize,
    accept: accept.reduce((acc, ext) => {
      // map extension to MIME
      const mimes: Record<string, string> = {
        ".epub":  "application/epub+zip",
        ".kepub": "application/epub+zip",
        ".pdf":   "application/pdf",
        ".mobi":  "application/x-mobipocket-ebook",
        ".azw3":  "application/vnd.amazon.ebook",
        ".cbz":   "application/vnd.comicbook+zip",
        ".cbr":   "application/vnd.comicbook-rar",
        ".txt":   "text/plain",
        ".html":  "text/html",
        ".htm":   "text/html",
        ".docx":  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".fb2":   "application/x-fictionbook+xml",
        ".djvu":  "image/vnd.djvu",
        ".zip":   "application/zip",
        ".lit":   "application/x-ms-reader",
      };
      const mime = mimes[ext] ?? "application/octet-stream";
      if (!acc[mime]) acc[mime] = [];
      acc[mime].push(ext);
      return acc;
    }, {} as Record<string, string[]>),
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
  });

  const active = isDragActive || dragOver;

  return (
    <div>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${active ? "var(--gold)" : "var(--border-2)"}`,
          borderRadius: "var(--radius-xl)",
          padding: compact ? "1.5rem" : "3rem 2rem",
          textAlign: "center",
          cursor: "pointer",
          background: active ? "var(--gold-glow)" : "var(--bg-3)",
          transition: "all 0.2s",
          transform: active ? "scale(1.01)" : "scale(1)",
          boxShadow: active ? "0 0 40px var(--gold-glow)" : "none",
        }}
      >
        <input {...getInputProps()} />
        <div style={{ marginBottom: compact ? "0.5rem" : "1rem" }}>
          <span style={{
            fontSize: compact ? "2rem" : "3rem",
            display: "block",
            filter: active ? "brightness(1.5)" : "none",
            transition: "all 0.2s",
          }}>
            {active ? "⬇" : "📚"}
          </span>
        </div>
        <p style={{
          color: active ? "var(--gold)" : "var(--text)",
          fontFamily: "var(--font-display)",
          fontSize: compact ? "1rem" : "1.2rem",
          fontWeight: 600,
          marginBottom: "0.4rem",
          fontStyle: "italic",
        }}>
          {active ? "Relâchez pour ajouter" : label}
        </p>
        {!active && (
          <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
            {sublabel}
          </p>
        )}
        {!compact && !active && (
          <div style={{
            display: "flex", gap: "0.35rem", justifyContent: "center",
            marginTop: "1.25rem", flexWrap: "wrap",
          }}>
            {["EPUB", "KEPUB", "PDF", "MOBI", "AZW3", "CBZ", "DOCX", "FB2"].map(fmt => (
              <span key={fmt} className="badge badge-dim">{fmt}</span>
            ))}
          </div>
        )}
      </div>

      {fileRejections.length > 0 && (
        <div style={{
          marginTop: "0.75rem",
          padding: "0.75rem 1rem",
          background: "rgba(224,82,82,0.08)",
          border: "1px solid rgba(224,82,82,0.3)",
          borderRadius: "var(--radius)",
          fontSize: "0.8rem",
          color: "var(--red)",
        }}>
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name}>
              <strong>{file.name}</strong>: {errors.map(e => e.message).join(", ")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
