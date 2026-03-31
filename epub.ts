import JSZip from "jszip";
import type { BookMetadata } from "@/types";

export async function readEpubMetadata(file: File): Promise<BookMetadata> {
  const zip = await JSZip.loadAsync(file);

  // Find OPF file location from container.xml
  const containerXml = await zip.file("META-INF/container.xml")?.async("text");
  if (!containerXml) throw new Error("Invalid EPUB: missing container.xml");

  const opfPath = containerXml.match(/full-path="([^"]+\.opf)"/)?.[1];
  if (!opfPath) throw new Error("Invalid EPUB: cannot find OPF path");

  const opfXml = await zip.file(opfPath)?.async("text");
  if (!opfXml) throw new Error("Invalid EPUB: missing OPF file");

  const parser = new DOMParser();
  const doc = parser.parseFromString(opfXml, "application/xml");

  const get = (name: string) =>
    doc.querySelector(`metadata > *[*|name="${name}"], metadata > ${name}, metadata > dc\\:${name}`)?.textContent?.trim();

  const title       = get("title");
  const author      = get("creator");
  const publisher   = get("publisher");
  const description = get("description");
  const language    = get("language");
  const isbn        = get("identifier");
  const dateStr     = get("date");
  const year        = dateStr ? parseInt(dateStr) : undefined;

  // Try to extract cover
  let cover: string | undefined;
  const coverId = doc.querySelector('meta[name="cover"]')?.getAttribute("content");
  if (coverId) {
    const coverItem = doc.querySelector(`item[id="${coverId}"]`);
    const coverHref = coverItem?.getAttribute("href");
    if (coverHref) {
      const opfDir  = opfPath.split("/").slice(0, -1).join("/");
      const fullPath = opfDir ? `${opfDir}/${coverHref}` : coverHref;
      const coverData = await zip.file(fullPath)?.async("base64");
      const mime = coverItem?.getAttribute("media-type") ?? "image/jpeg";
      if (coverData) cover = `data:${mime};base64,${coverData}`;
    }
  }

  return { title, author, publisher, description, language, isbn, year, cover };
}

export async function writEpubMetadata(
  file: File,
  meta: Partial<BookMetadata>
): Promise<Blob> {
  const zip = await JSZip.loadAsync(file);

  const containerXml = await zip.file("META-INF/container.xml")?.async("text");
  const opfPath = containerXml?.match(/full-path="([^"]+\.opf)"/)?.[1];
  if (!opfPath) throw new Error("Cannot find OPF");

  let opfXml = await zip.file(opfPath)?.async("text") ?? "";

  const replace = (tag: string, value: string | undefined) => {
    if (!value) return;
    const re = new RegExp(`(<(?:dc:)?${tag}[^>]*>)[^<]*(</(?:dc:)?${tag}>)`, "i");
    if (re.test(opfXml)) {
      opfXml = opfXml.replace(re, `$1${value}$2`);
    }
  };

  replace("title",       meta.title);
  replace("creator",     meta.author);
  replace("publisher",   meta.publisher);
  replace("description", meta.description);
  replace("language",    meta.language);

  zip.file(opfPath, opfXml);
  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}

export async function extractEpubCover(file: File): Promise<string | null> {
  try {
    const meta = await readEpubMetadata(file);
    return meta.cover ?? null;
  } catch { return null; }
}

export async function getEpubSpine(file: File): Promise<string[]> {
  const zip = await JSZip.loadAsync(file);
  const containerXml = await zip.file("META-INF/container.xml")?.async("text");
  const opfPath = containerXml?.match(/full-path="([^"]+\.opf)"/)?.[1];
  if (!opfPath) return [];

  const opfXml = await zip.file(opfPath)?.async("text") ?? "";
  const parser = new DOMParser();
  const doc    = parser.parseFromString(opfXml, "application/xml");

  const spineItems = Array.from(doc.querySelectorAll("spine > itemref"));
  const manifest   = doc.querySelector("manifest");

  return spineItems
    .map(ref => {
      const idref = ref.getAttribute("idref") ?? "";
      return manifest?.querySelector(`item[id="${idref}"]`)?.getAttribute("href") ?? idref;
    })
    .filter(Boolean);
}
