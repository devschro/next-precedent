import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const browserClient = createRouteHandlerClient({ cookies });
  const { data: { user }, error: userErr } = await browserClient.auth.getUser();
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user)   return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const server = supabaseServer();

  const { data: org, error: orgErr } = await server
    .from("orgs")
    .insert({ name })
    .select()
    .single();
  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 400 });

  // set a role value that's allowed by your constraint (likely 'admin' or 'member')
  const { error: memErr } = await server
    .from("org_users")
    .insert({ org_id: org.id, user_id: user.id, role: "admin" });
  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, org });
}
