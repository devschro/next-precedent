import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    // ---- Parse body: accept JSON or FormData ----
    const ct = req.headers.get('content-type') || '';
    let org_id = '';
    let case_id = '';

    if (ct.includes('application/json')) {
      const body = await req.json();
      org_id = String(body?.org_id ?? '').trim();
      case_id = String(body?.case_id ?? '').trim();
    } else {
      const form = await req.formData();
      org_id = String(form.get('org_id') || '').trim();
      case_id = String(form.get('case_id') || '').trim();
    }

    if (!org_id || !case_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supa = supabaseServer();

    // ---- Find a usable credit ----
    const { data: credits, error: creditErr } = await supa
      .from('org_credits')
      .select('id,quantity,consumed,expires_at,created_at')
      .eq('org_id', org_id)
      .order('created_at', { ascending: true });

    if (creditErr) {
      return NextResponse.json({ error: creditErr.message }, { status: 400 });
    }

    const avail = (credits || []).find(
      (c) =>
        (c.quantity ?? 0) > (c.consumed ?? 0) &&
        (!c.expires_at || new Date(c.expires_at) > new Date())
    );

    if (!avail) {
      return NextResponse.json(
        { error: 'No credits. Purchase Single-Use credit first.' },
        { status: 402 } // Payment Required-ish
      );
    }

    // ---- Consume one credit (simple optimistic update) ----
    const { error: consumeErr } = await supa
      .from('org_credits')
      .update({ consumed: (avail.consumed ?? 0) + 1 })
      .eq('id', avail.id);

    if (consumeErr) {
      return NextResponse.json(
        { error: 'Failed to consume credit.' },
        { status: 400 }
      );
    }

    // ---- Enqueue the evaluation job ----
    const { error: jobErr } = await supa.from('jobs').insert({
      kind: 'evaluate',
      org_id,
      case_id,
      payload: {},   // keep if your worker expects it; otherwise use input
      status: 'queued',
    });

    if (jobErr) {
      return NextResponse.json({ error: jobErr.message }, { status: 400 });
    }

    // ---- Kick the Supabase worker (optional) ----
    try {
      const fnUrl = process.env.SUPABASE_FUNCTION_URL;
      const secret = process.env.CRON_SECRET;
      if (fnUrl && secret) {
        // Fire-and-forget; don't block the response
        fetch(fnUrl, { method: 'GET', headers: { 'x-cron-secret': secret } }).catch(() => {});
      }
    } catch {
      // ignore — cron or manual ping can process queued jobs
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
