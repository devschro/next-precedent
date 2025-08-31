import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron');
  if (!isVercelCron) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const fnUrl = process.env.SUPABASE_FUNCTION_URL!;
  const secret = process.env.CRON_SECRET!;
  try {
    const res = await fetch(fnUrl, {
      method: 'GET',
      headers: { 'x-cron-secret': secret }
    });
    const body = await res.text();
    return new NextResponse(body, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'fetch failed' }, { status: 500 });
  }
}
