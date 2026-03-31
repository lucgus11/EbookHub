import type { NextApiRequest, NextApiResponse } from "next";
import { createCanvas } from "canvas";

// Tiny QR code generator without heavy deps
// Uses the qrcode npm package if available, otherwise encodes as text

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { text, size = "200" } = req.query;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text param required" });
  }

  try {
    const QRCode = await import("qrcode");
    const sz = Math.min(Math.max(parseInt(size as string), 100), 800);
    const png = await QRCode.default.toBuffer(text, {
      type: "png",
      width: sz,
      margin: 2,
      color: { dark: "#c8a96e", light: "#0a0a0f" },
    });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(png);
  } catch {
    // Fallback: SVG QR-ish placeholder
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#0a0a0f"/>
      <text x="100" y="105" font-family="monospace" font-size="12" fill="#c8a96e" text-anchor="middle">QR: install qrcode pkg</text>
    </svg>`;
    res.setHeader("Content-Type", "image/svg+xml");
    return res.send(svg);
  }
}
