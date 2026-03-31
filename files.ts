import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.MEGA_EMAIL || !process.env.MEGA_PASSWORD) {
    return res.status(503).json({ error: "MEGA credentials not configured" });
  }

  try {
    const { Storage } = await import("megajs");
    const storage = new Storage({
      email:    process.env.MEGA_EMAIL!,
      password: process.env.MEGA_PASSWORD!,
    });

    await new Promise<void>((resolve, reject) => {
      storage.on("ready", resolve);
      storage.on("error", reject);
    });

    const folder = storage.root.children?.find(
      (n: { name: string; directory: boolean }) => n.name === "EbookHub" && n.directory
    );

    if (req.method === "GET") {
      const children = folder?.children ?? [];
      const files = await Promise.all(
        children.map(async (node: { name: string; size: number; nodeId: string; directory: boolean }) => {
          if (node.directory) return null;
          let shareUrl = "";
          try {
            shareUrl = await new Promise<string>((resolve, reject) => {
              node.link((err: Error | null, url: string) => {
                if (err) reject(err); else resolve(url);
              });
            });
          } catch { /* no link */ }
          return {
            nodeHandle: node.nodeId,
            shareUrl,
            name: node.name,
            size: node.size,
          };
        })
      );

      storage.close();
      return res.status(200).json(files.filter(Boolean));
    }

    if (req.method === "DELETE") {
      const { nodeHandle } = req.body;
      if (!nodeHandle) return res.status(400).json({ error: "nodeHandle required" });

      const node = folder?.children?.find(
        (n: { nodeId: string }) => n.nodeId === nodeHandle
      );
      if (!node) return res.status(404).json({ error: "File not found" });

      await node.delete();
      storage.close();
      return res.status(200).json({ success: true });
    }

    storage.close();
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "MEGA error";
    return res.status(500).json({ error: msg });
  }
}
