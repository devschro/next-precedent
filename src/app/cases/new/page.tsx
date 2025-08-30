'use client';
import { useState } from 'react';
import { createCase } from './actions';

export default function NewCase() {
  const [orgId, setOrgId] = useState(''); // for MVP paste your org_id from Supabase UI once.
  const [name, setName] = useState('');
  const [pa, setPa] = useState('');
  const [jur, setJur] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set('org_id', orgId);
    fd.set('name', name);
    fd.set('practice_area', pa);
    fd.set('jurisdiction', jur);
    try {
      await createCase(fd);
      alert('Case created. Copy the case_id from Supabase or build a case list next; for now proceed to upload.');
    } catch (e:any) { alert(e.message); }
  }

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">New Case</h1>
      <form className="space-y-4" onSubmit={submit}>
        <input className="border p-2 w-full" placeholder="Org ID (paste from Supabase)" value={orgId} onChange={e=>setOrgId(e.target.value)} />
        <input className="border p-2 w-full" placeholder="Case name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="border p-2 w-full" placeholder="Practice area" value={pa} onChange={e=>setPa(e.target.value)} />
        <input className="border p-2 w-full" placeholder="Jurisdiction" value={jur} onChange={e=>setJur(e.target.value)} />
        <button className="bg-green-900 text-white px-4 py-2 rounded">Create</button>
      </form>
    </main>
  );
}
