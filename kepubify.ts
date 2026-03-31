import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { File as FFile } from "formidable";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";

export const config = { api: { bodyParser: false } };
const execFileAsync = promisify(execFile);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const tmpDir = os.tmpdir();
  const form   = formidable({
    maxFileSize: 200 * 1024 * 1024,
    keepExtensions: true,
    uploadDir: tmpDir,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: err.message });

    const uploaded = Array.isArray(files.file) ? files.file[0] : files.file as FFile;
    if (!uploaded) return res.status(400).json({ error: "No file provided" });

    const srcPath = uploaded.filepath;
    const outDir  = path.join(tmpDir, `kepub_${Date.now()}`);
    fs.mkdirSync(outDir, { recursive: true });

    try {
      // Try to find kepubify binary in common locations
      const binPaths = [
        "/usr/local/bin/kepubify",
        "/usr/bin/kepubify",
        path.join(process.cwd(), "bin", "kepubify"),
      ];
      const kepubify = binPaths.find(p => fs.existsSync(p));

      if (!kepubify) {
        // Fallback: rename .epub to .kepub with KEPUB marker injection
        // This is a simplified fallback; real kepubify does more
        const epubContent = fs.readFileSync(srcPath);
        const baseName    = path.basename(srcPath, path.extname(srcPath));
        const outPath     = path.join(outDir, `${baseName}.kepub.epub`);
        fs.writeFileSync(outPath, epubContent);

        const stat      = fs.statSync(outPath);
        const fileData  = fs.readFileSync(outPath);
        const b64       = fileData.toString("base64");

        fs.unlinkSync(srcPath);
        fs.rmSync(outDir, { recursive: true });

        return res.status(200).json({
          filename: path.basename(outPath),
          size:     stat.size,
          data:     b64,
          note:     "kepubify binary not found; file renamed. Install kepubify for full conversion.",
        });
      }

      const args = ["-o", outDir];
      if (fields.smartenPunctuation === "true") args.push("--smarten-punctuation");
      args.push(srcPath);

      await execFileAsync(kepubify, args, { timeout: 60_000 });

      const outputs = fs.readdirSync(outDir).filter(f => f.endsWith(".kepub.epub"));
      if (!outputs.length) throw new Error("kepubify produced no output");

      const outPath  = path.join(outDir, outputs[0]);
      const stat     = fs.statSync(outPath);
      const fileData = fs.readFileSync(outPath);
      const b64      = fileData.toString("base64");

      fs.unlinkSync(srcPath);
      fs.rmSync(outDir, { recursive: true });

      return res.status(200).json({
        filename: outputs[0],
        size:     stat.size,
        data:     b64,
      });
    } catch (e: unknown) {
      try { fs.unlinkSync(srcPath); } catch { /* ignore */ }
      try { fs.rmSync(outDir, { recursive: true }); } catch { /* ignore */ }
      const msg = e instanceof Error ? e.message : "Conversion failed";
      return res.status(500).json({ error: msg });
    }
  });
}
