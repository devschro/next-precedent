'use server';
import { supabaseServer } from '@/lib/supabase';

export async function createOrgAndJoin(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  if (!name) throw new Error('Org name required');

  const supa = supabaseServer();
  const { data: userRes, error: userErr } = await supa.auth.getUser();
  if (userErr || !userRes?.user) throw new Error('Not signed in');

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,40);

  const { data: org, error } = await supa.from('orgs').insert({ name, slug }).select('id').single();
  if (error) throw error;

  const { error: e2 } = await supa.from('org_users').insert({ org_id: org.id, user_id: userRes.user.id, role: 'OrgOwner' });
  if (e2) throw e2;

  return { orgId: org.id, slug };
}
