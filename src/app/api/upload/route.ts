import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const org_id = String(form.get('org_id')||'').trim();
    const case_id = String(form.get('case_id')||'').trim();
    const file = form.get('file') as File | null;

    if (!org_id || !case_id || !file) {
      return NextResponse.json({ error: 'Missing org_id, case_id, or file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    const supa = supabaseServer();
    const storage_path = `org/${org_id}/cases/${case_id}/${file.name}`;

    const { error: upErr } = await supa.storage.from('case-files').upload(storage_path, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true
    });
    if (upErr) throw upErr;

    const { error: docErr } = await supa.from('documents').insert({
      org_id, case_id, storage_path, filename: file.name,
      mime: file.type || 'application/octet-stream',
      size_bytes: buffer.length, sha256
    });
    if (docErr) throw docErr;

    const { error: jobErr } = await supa.from('jobs').insert({
      kind: 'chunk_embed', org_id, case_id, payload: { storage_path }
    });
    if (jobErr) throw jobErr;

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 });
  }
}
