import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const isVercelCron = req.headers["x-vercel-cron"];
  if (!isVercelCron) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const fnUrl = process.env.SUPABASE_FUNCTION_URL!;
  const secret = process.env.CRON_SECRET!;

  try {
    const r = await fetch(fnUrl, { method: "GET", headers: { "x-cron-secret": secret } });
    const body = await r.text();
    res.status(r.status).setHeader("Content-Type", "application/json").send(body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "fetch failed" });
  }
}
