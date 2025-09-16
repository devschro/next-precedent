// src/app/api/orgs/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    // 1) Read "name" from either JSON or FormData
    const ct = req.headers.get("content-type") || "";
    let name = "";

    if (ct.includes("application/json")) {
      const body = await req.json();
      name = String(body?.name ?? "").trim();
    } else {
      const form = await req.formData();
      name = String(form.get("name") || "").trim();
    }

    if (!name) {
      return NextResponse.json({ error: "Org name required" }, { status: 400 });
    }


    // 2) Get the signed-in user from cookies
    const sbAuth = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: userErr,
    } = await sbAuth.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // 3) Server client for DB writes (service role)
    const server = supabaseServer();

    // 4) Generate a URL-safe base slug from the name
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40);

    // Ensure slug is unique by appending -2, -3, ...
    let slug = base;
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;

      const { data: existing, error: existsErr } = await server
        .from("orgs")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();

      // PostgREST "no rows" is fine; any other error bubbles up
      if (existsErr && (existsErr as any).code !== "PGRST116") {
        throw existsErr;
      }

      if (!existing) {
        slug = candidate;
        break;
      }
    }

    // 5) Insert the organization
    const { data: org, error: orgErr } = await server
      .from("orgs")
      .insert({ name, slug })
      .select()
      .single();

    if (orgErr) {
      return NextResponse.json({ error: orgErr.message }, { status: 400 });
    }

    // 6) Insert membership for the creator
    // IMPORTANT:
    //   - If you have not updated your DB constraint yet, change "OrgOwner" -> "admin"
    //     to match your current CHECK constraint (ARRAY['admin','member']).
    const { error: memErr } = await server.from("org_users").insert({
      org_id: org.id,
      user_id: user.id,
      role: "OrgOwner", // <-- change to "admin" temporarily if you didn't run the schema fix yet
    });

    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, org }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
