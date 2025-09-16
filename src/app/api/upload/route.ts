// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const BUCKET = "case-files";

export async function POST(req: Request) {
  try {
    // 1) Parse form-data (must be multipart/form-data)
    const form = await req.formData();
    const case_id = String(form.get("case_id") || "").trim();
    const file = form.get("file") as File | null;

    if (!case_id || !file) {
      return NextResponse.json(
        { error: "case_id and file are required" },
        { status: 400 }
      );
    }

    const supa = supabaseServer();

    // 2) Derive org_id from the case (prevents FK errors)
    const { data: c, error: caseErr } = await supa
      .from("cases")
      .select("org_id")
      .eq("id", case_id)
      .single();

    if (caseErr || !c?.org_id) {
      return NextResponse.json({ error: "Invalid case_id" }, { status: 400 });
    }
    const org_id = c.org_id as string;

    // 3) Upload file to Storage
    const safeName = (file.name || "upload.txt").replace(/[^\w.\- ]+/g, "_");
    const storage_path = `cases/${case_id}/${Date.now()}-${safeName}`;

    const { error: uploadErr } = await supa.storage
      .from(BUCKET)
      .upload(storage_path, file, { upsert: false });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 400 });
    }

   // 4) Create document record (must include filename + mime + size_bytes)
    const filename = safeName || `upload-${Date.now()}.txt`;
    const mime =
      (typeof file.type === "string" && file.type.length ? file.type : "text/plain");
    const size_bytes =
     typeof file.size === "number" && file.size > 0 ? file.size : 0;

    const { data: doc, error: docInsErr } = await supa
      .from("documents")
      .insert({
        org_id,
       case_id,
       storage_path,
       filename,    // required by schema
       mime,        // required by schema
       size_bytes,  // required by schema
      })
      .select("id")
      .single();

    if (docInsErr) {
      return NextResponse.json({ error: docInsErr.message }, { status: 400 });
    }

    // 5) Enqueue chunk_embed job
    const { error: jobErr } = await supa.from("jobs").insert({
      kind: "chunk_embed",
      org_id,
      case_id,
      payload: { storage_path },
      status: "queued",
    });
    if (jobErr) {
      return NextResponse.json({ error: jobErr.message }, { status: 400 });
    }

    // 6) (Optional) ping the worker immediately
    try {
      const fnUrl = process.env.SUPABASE_FUNCTION_URL;
      const secret = process.env.CRON_SECRET;
      if (fnUrl && secret) {
        await fetch(fnUrl, { method: "GET", headers: { "x-cron-secret": secret } });
      }
    } catch {
      // ignore; cron/next ping will pick it up
    }

    return NextResponse.json({ ok: true, document_id: doc?.id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
