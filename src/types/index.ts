export type FileFormat =
  | "epub" | "kepub" | "pdf" | "mobi" | "azw3" | "cbz" | "cbr"
  | "txt" | "html" | "docx" | "fb2" | "lit" | "djvu" | "zip"
  | "unknown";

export interface EbookFile {
  id: string;
  name: string;
  originalName: string;
  format: FileFormat;
  size: number;        // bytes
  megaUrl?: string;    // MEGA shareable link
  megaNodeHandle?: string;
  uploadedAt: string;  // ISO date
  metadata?: BookMetadata;
  thumbnailUrl?: string;
  tags?: string[];
  status: "local" | "uploading" | "uploaded" | "error";
  uploadProgress?: number;
}

export interface BookMetadata {
  title?: string;
  author?: string;
  publisher?: string;
  year?: number;
  isbn?: string;
  language?: string;
  description?: string;
  series?: string;
  seriesIndex?: number;
  cover?: string; // base64 or URL
}

export type ConversionJobStatus =
  | "queued" | "processing" | "done" | "error";

export interface ConversionJob {
  id: string;
  sourceFile: EbookFile;
  targetFormat: FileFormat;
  status: ConversionJobStatus;
  progress: number;
  resultFile?: EbookFile;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  options?: ConversionOptions;
}

export interface ConversionOptions {
  // kepubify
  kepubify?: {
    smartenPunctuation?: boolean;
  };
  // PDF crop
  pdfCropMargins?: {
    percentRetain?: number; // default 10
    uniformMargin?: number;
    noCleanup?: boolean;
  };
  // Calibre-style
  calibre?: {
    outputProfile?: "kindle" | "kobo" | "tablet" | "phone" | "default";
    fontScale?: number;
    enableHeuristics?: boolean;
    smarten?: boolean;
  };
  // General
  outputName?: string;
}

export interface ShareSession {
  id: string;
  code: string;  // 6-char code
  files: EbookFile[];
  createdAt: string;
  expiresAt: string;
  accessCount: number;
  maxAccess?: number;
  password?: string;
  deviceInfo?: string;
}

export interface MegaCredentials {
  email: string;
  password: string;
}

export interface AppSettings {
  megaConnected: boolean;
  megaEmail?: string;
  defaultConversionFormat: FileFormat;
  autoUploadToMega: boolean;
  keepLocalCopy: boolean;
  theme: "dark" | "auto";
  language: "fr" | "en";
}

export interface TransferLink {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  url: string;
  qrCode?: string;
  expiresAt: string;
  downloadCount: number;
  maxDownloads?: number;
}

export type ToolId =
  | "kepubify"
  | "pdf-crop"
  | "pdf-compress"
  | "pdf-merge"
  | "pdf-split"
  | "epub-meta"
  | "epub-cover"
  | "cbz-make"
  | "txt-clean"
  | "dedrm-info"
  | "file-info"
  | "batch-rename";

export interface Tool {
  id: ToolId;
  name: string;
  description: string;
  icon: string;
  accepts: FileFormat[];
  outputs: FileFormat[];
  badge?: string;
  experimental?: boolean;
}
