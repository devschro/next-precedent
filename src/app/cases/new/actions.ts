'use server';
import { supabaseServer } from '@/lib/supabase';

export async function createCase(formData: FormData) {
  const name = String(formData.get('name')||'').trim();
  const practice_area = String(formData.get('practice_area')||'').trim();
  const jurisdiction = String(formData.get('jurisdiction')||'').trim();
  const org_id = String(formData.get('org_id')||'').trim();
  if (!org_id || !name) throw new Error('Missing fields');

  const supa = supabaseServer();
  const { error } = await supa.from('cases').insert({ org_id, name, practice_area, jurisdiction });
  if (error) throw error;
}
