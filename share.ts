import type { NextApiRequest, NextApiResponse } from "next";
import { generateShareCode } from "@/utils";
import type { ShareSession } from "@/types";
import { v4 as uuidv4 } from "uuid";

// In-memory store for development; in production use Vercel KV or Redis
const sessions = new Map<string, ShareSession>();

// Cleanup expired sessions every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of sessions.entries()) {
      if (new Date(v.expiresAt).getTime() < now) sessions.delete(k);
    }
  }, 10 * 60 * 1000);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Try Vercel KV if available
  let kv: { get: (k: string) => Promise<unknown>; set: (k: string, v: unknown, opts?: { ex?: number }) => Promise<void>; del: (k: string) => Promise<void> } | null = null;
  try {
    const { kv: _kv } = await import("@vercel/kv");
    kv = _kv;
  } catch { /* not available */ }

  const getSession = async (code: string): Promise<ShareSession | null> => {
    if (kv) return (await kv.get(`share:${code}`)) as ShareSession | null;
    return sessions.get(code) ?? null;
  };
  const setSession = async (code: string, session: ShareSession): Promise<void> => {
    const ttl = Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000);
    if (kv) await kv.set(`share:${code}`, session, { ex: ttl });
    else sessions.set(code, session);
  };
  const delSession = async (code: string): Promise<void> => {
    if (kv) await kv.del(`share:${code}`);
    else sessions.delete(code);
  };

  if (req.method === "POST") {
    // Create a new share session
    const { files, expiresInHours = 24, maxAccess } = req.body;
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: "files array required" });
    }

    const code: string = generateShareCode();
    const now  = new Date();
    const exp  = new Date(now.getTime() + expiresInHours * 3600 * 1000);

    const session: ShareSession = {
      id:          uuidv4(),
      code,
      files,
      createdAt:   now.toISOString(),
      expiresAt:   exp.toISOString(),
      accessCount: 0,
      maxAccess,
      deviceInfo:  req.headers["user-agent"] ?? undefined,
    };

    await setSession(code, session);
    return res.status(201).json({ code, expiresAt: session.expiresAt });
  }

  if (req.method === "GET") {
    const { code } = req.query;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "code required" });
    }

    const session = await getSession(code.toUpperCase());
    if (!session) return res.status(404).json({ error: "Session not found or expired" });

    const now = Date.now();
    if (new Date(session.expiresAt).getTime() < now) {
      await delSession(code.toUpperCase());
      return res.status(410).json({ error: "Session expired" });
    }

    if (session.maxAccess && session.accessCount >= session.maxAccess) {
      return res.status(410).json({ error: "Access limit reached" });
    }

    session.accessCount++;
    await setSession(code.toUpperCase(), session);
    return res.status(200).json(session);
  }

  if (req.method === "DELETE") {
    const { code } = req.query;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "code required" });
    }
    await delSession(code.toUpperCase());
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
