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

    const srcPath  = uploaded.filepath;
    const baseName = path.basename(srcPath, ".pdf");
    const outPath  = path.join(tmpDir, `${baseName}_cropped_${Date.now()}.pdf`);

    const percentRetain = fields.percentRetain ?? "10";
    const uniform       = fields.uniformMargin as string | undefined;

    try {
      // pdfCropMargins installed via pip: pip install pdfCropMargins
      const args: string[] = [srcPath, "-o", outPath];

      if (uniform) {
        args.push("-a", uniform.toString());
      } else {
        args.push("-p", percentRetain.toString());
      }

      // Try python3 -m pdfCropMargins first, then pdfcropmargins binary
      let ran = false;
      try {
        await execFileAsync("python3", ["-m", "pdfCropMargins", ...args], { timeout: 120_000 });
        ran = true;
      } catch {
        try {
          await execFileAsync("pdf-crop-margins", args, { timeout: 120_000 });
          ran = true;
        } catch { /* binary not found */ }
      }

      if (!ran || !fs.existsSync(outPath)) {
        // Fallback: return original with note
        const fileData = fs.readFileSync(srcPath);
        fs.unlinkSync(srcPath);
        return res.status(200).json({
          filename: path.basename(uploaded.originalFilename ?? "output.pdf"),
          size:     fileData.length,
          data:     fileData.toString("base64"),
          note:     "pdfCropMargins not installed on server. Install with: pip install pdfCropMargins",
        });
      }

      const fileData = fs.readFileSync(outPath);
      fs.unlinkSync(srcPath);
      fs.unlinkSync(outPath);

      return res.status(200).json({
        filename: `${path.basename(uploaded.originalFilename ?? "output", ".pdf")}_cropped.pdf`,
        size:     fileData.length,
        data:     fileData.toString("base64"),
      });
    } catch (e: unknown) {
      try { fs.unlinkSync(srcPath); } catch { /* ignore */ }
      try { fs.unlinkSync(outPath); } catch { /* ignore */ }
      const msg = e instanceof Error ? e.message : "Crop failed";
      return res.status(500).json({ error: msg });
    }
  });
}
