import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { File as FFile } from "formidable";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.MEGA_EMAIL || !process.env.MEGA_PASSWORD) {
    return res.status(503).json({ error: "MEGA credentials not configured" });
  }

  const form = formidable({ maxFileSize: 500 * 1024 * 1024, keepExtensions: true });

  form.parse(req, async (err, _fields, files) => {
    if (err) return res.status(400).json({ error: err.message });

    const uploaded = Array.isArray(files.file) ? files.file[0] : files.file as FFile;
    if (!uploaded) return res.status(400).json({ error: "No file provided" });

    try {
      // Dynamic import to avoid SSR issues
      const { Storage } = await import("megajs");

      const storage = new Storage({
        email:    process.env.MEGA_EMAIL!,
        password: process.env.MEGA_PASSWORD!,
      });

      await new Promise<void>((resolve, reject) => {
        storage.on("ready", resolve);
        storage.on("error", reject);
      });

      // Find or create /EbookHub folder
      let folder = storage.root.children?.find(
        (n: { name: string; directory: boolean }) => n.name === "EbookHub" && n.directory
      );
      if (!folder) {
        folder = await storage.mkdir("EbookHub");
      }

      const fileBuffer = fs.readFileSync(uploaded.filepath);
      const fileName   = uploaded.originalFilename ?? path.basename(uploaded.filepath);

      const uploadStream = folder.upload({
        name: fileName,
        size: fileBuffer.length,
      });

      uploadStream.write(fileBuffer);
      uploadStream.end();

      const uploadedNode = await new Promise<{ nodeId: string }>((resolve, reject) => {
        uploadStream.on("complete", (node: { nodeId: string }) => resolve(node));
        uploadStream.on("error",    reject);
      });

      const shareUrl = await new Promise<string>((resolve, reject) => {
        uploadedNode.link((err: Error | null, url: string) => {
          if (err) reject(err); else resolve(url);
        });
      });

      // Cleanup temp file
      fs.unlinkSync(uploaded.filepath);
      storage.close();

      return res.status(200).json({
        nodeHandle: (uploadedNode as unknown as { nodeId: string }).nodeId,
        shareUrl,
        name: fileName,
        size: fileBuffer.length,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      console.error("[MEGA upload]", msg);
      return res.status(500).json({ error: msg });
    }
  });
}
