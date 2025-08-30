'use client';
import { useState } from 'react';

export default function UploadPage({ params }: { params: { id: string }}) {
  const [orgId, setOrgId] = useState('');
  const [file, setFile] = useState<File|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return alert('Choose a file');
    const fd = new FormData();
    fd.set('org_id', orgId);
    fd.set('case_id', params.id);
    fd.set('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const j = await res.json();
    if (!res.ok) return alert(j.error || 'Upload failed');
    alert('Uploaded. Background embedding will run shortly.');
  }

  return (
    <main className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Upload document</h1>
      <form className="space-y-4" onSubmit={submit}>
        <input className="border p-2 w-full" placeholder="Org ID (paste from Supabase)" value={orgId} onChange={e=>setOrgId(e.target.value)} />
        <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} />
        <button className="bg-green-900 text-white px-4 py-2 rounded">Upload</button>
      </form>
      <p className="mt-2 text-sm text-gray-600">MVP supports .txt best. Add PDF/DOCX extractor later.</p>
    </main>
  );
}
