import type { FileFormat, EbookFile } from "@/types";

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function detectFormat(filename: string): FileFormat {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, FileFormat> = {
    epub: "epub", kepub: "kepub", pdf: "pdf",
    mobi: "mobi", azw3: "azw3", cbz: "cbz",
    cbr: "cbr", txt: "txt", html: "html",
    htm: "html", docx: "docx", fb2: "fb2",
    lit: "lit", djvu: "djvu", zip: "zip",
  };
  return map[ext] ?? "unknown";
}

export function formatColor(fmt: FileFormat): string {
  const map: Record<string, string> = {
    epub: "gold", kepub: "green", pdf: "red",
    mobi: "blue", azw3: "blue", cbz: "purple",
    cbr: "purple", txt: "dim", html: "dim",
    docx: "blue",
  };
  return map[fmt] ?? "dim";
}

export function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60)    return "à l'instant";
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

export function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function canConvert(from: FileFormat, to: FileFormat): boolean {
  const routes: Partial<Record<FileFormat, FileFormat[]>> = {
    epub:  ["kepub", "pdf", "mobi", "azw3", "txt", "html"],
    pdf:   ["txt"],
    mobi:  ["epub", "kepub", "pdf"],
    azw3:  ["epub", "kepub", "pdf"],
    docx:  ["epub", "pdf", "txt"],
    txt:   ["epub", "html"],
    html:  ["epub", "pdf"],
    fb2:   ["epub"],
    cbr:   ["cbz"],
  };
  return routes[from]?.includes(to) ?? false;
}

export function getConversionPairs(): Array<[FileFormat, FileFormat]> {
  return [
    ["epub",  "kepub"],
    ["epub",  "pdf"],
    ["epub",  "mobi"],
    ["epub",  "azw3"],
    ["mobi",  "epub"],
    ["azw3",  "epub"],
    ["pdf",   "txt"],
    ["docx",  "epub"],
    ["txt",   "epub"],
    ["fb2",   "epub"],
    ["cbr",   "cbz"],
  ];
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

// Build a localStorage-backed file store
const STORE_KEY = "ebookhub_files";
export function getLocalFiles(): EbookFile[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
  } catch { return []; }
}
export function saveLocalFiles(files: EbookFile[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(files));
}
export function addLocalFile(f: EbookFile): void {
  const files = getLocalFiles();
  files.unshift(f);
  saveLocalFiles(files);
}
export function removeLocalFile(id: string): void {
  saveLocalFiles(getLocalFiles().filter(f => f.id !== id));
}
export function updateLocalFile(id: string, patch: Partial<EbookFile>): void {
  saveLocalFiles(getLocalFiles().map(f => f.id === id ? { ...f, ...patch } : f));
}
