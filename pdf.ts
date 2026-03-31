import { PDFDocument, degrees } from "pdf-lib";

export interface PDFInfo {
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  creationDate?: string;
  fileSizeBytes: number;
}

export async function getPDFInfo(file: File): Promise<PDFInfo> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  return {
    pageCount:    pdf.getPageCount(),
    title:        pdf.getTitle()  ?? undefined,
    author:       pdf.getAuthor() ?? undefined,
    subject:      pdf.getSubject() ?? undefined,
    creator:      pdf.getCreator() ?? undefined,
    creationDate: pdf.getCreationDate()?.toISOString(),
    fileSizeBytes: file.size,
  };
}

export async function mergePDFs(files: File[]): Promise<Blob> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const buf = await file.arrayBuffer();
    const pdf = await PDFDocument.load(buf);
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  const bytes = await merged.save();
  return new Blob([bytes], { type: "application/pdf" });
}

export async function splitPDF(
  file: File,
  ranges: Array<[number, number]> // 1-based inclusive
): Promise<Blob[]> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf);
  const total = pdf.getPageCount();

  return Promise.all(
    ranges.map(async ([start, end]) => {
      const part = await PDFDocument.create();
      const s = Math.max(0, start - 1);
      const e = Math.min(total - 1, end - 1);
      const pages = await part.copyPages(pdf, Array.from(
        { length: e - s + 1 },
        (_, i) => s + i
      ));
      pages.forEach(p => part.addPage(p));
      const bytes = await part.save();
      return new Blob([bytes], { type: "application/pdf" });
    })
  );
}

export async function rotatePDF(
  file: File,
  angleDeg: 90 | 180 | 270,
  pageIndices?: number[]
): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf);
  const targets = pageIndices ?? pdf.getPageIndices();
  for (const i of targets) {
    const page = pdf.getPage(i);
    page.setRotation(degrees((page.getRotation().angle + angleDeg) % 360));
  }
  const bytes = await pdf.save();
  return new Blob([bytes], { type: "application/pdf" });
}

// Crop by trimming white margins (client-side approximation via canvas)
export async function detectAndCropPDFMargins(
  _file: File,
  _percentRetain = 10
): Promise<{ message: string }> {
  // Full PDF margin detection requires server-side (pdfCropMargins python lib)
  // We return a message directing to the API route
  return {
    message: "Margin detection requires server processing — sending to /api/tools/pdf-crop",
  };
}

export async function compressPDF(file: File): Promise<Blob> {
  // Client-side: re-save with pdf-lib (removes redundant objects)
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf);
  const bytes = await pdf.save({ useObjectStreams: true });
  return new Blob([bytes], { type: "application/pdf" });
}

export async function extractPDFPages(
  file: File,
  pageIndices: number[]
): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const src = await PDFDocument.load(buf);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, pageIndices.map(i => i - 1));
  pages.forEach(p => out.addPage(p));
  const bytes = await out.save();
  return new Blob([bytes], { type: "application/pdf" });
}
