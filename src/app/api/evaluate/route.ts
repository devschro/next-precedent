import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { org_id, case_id } = await req.json();
    if (!org_id || !case_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supa = supabaseServer();

    const { data: credits } = await supa
      .from('org_credits')
      .select('id,quantity,consumed,expires_at')
      .eq('org_id', org_id)
      .order('created_at', { ascending: true });

    const avail = (credits || []).find(
      (c) =>
        c.quantity > c.consumed &&
        (!c.expires_at || new Date(c.expires_at) > new Date())
    );
    if (!avail) {
      return NextResponse.json(
        { error: 'No credits. Purchase Single-Use credit first.' },
        { status: 402 }
      );
    }

    await supa
      .from('org_credits')
      .update({ consumed: avail.consumed + 1 })
      .eq('id', avail.id);

    const { error: jobErr } = await supa.from('jobs').insert({
      kind: 'evaluate',
      org_id,
      case_id,
      payload: {},
      status: 'queued', // (ok if your trigger defaults this)
    });
    if (jobErr) throw jobErr;

    // ---- Kick the Supabase worker immediately ----
    // Safe to ignore failures; jobs will still be picked up later.
    try {
      const fnUrl = process.env.SUPABASE_FUNCTION_URL;
      const secret = process.env.CRON_SECRET;

      if (!fnUrl || !secret) {
        console.warn(
          'Missing SUPABASE_FUNCTION_URL or CRON_SECRET; worker not pinged.'
        );
      } else {
        await fetch(fnUrl, {
          method: 'GET',
          headers: { 'x-cron-secret': secret },
        });
      }
    } catch {
      // ignore; background sweep or manual ping can process queued jobs
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 });
  }
}
