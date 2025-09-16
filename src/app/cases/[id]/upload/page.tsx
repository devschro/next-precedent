'use client';

import { use, useState } from 'react';

export default function UploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = use(params);
  const [orgId, setOrgId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return alert('Choose a file');

    const fd = new FormData(e.currentTarget);
    // ensure explicit keys exist
    fd.set('org_id', orgId);
    fd.set('case_id', caseId);
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
        <input
          className="border p-2 w-full"
          placeholder="Org ID (paste from Supabase)"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          name="org_id"
        />
        <input
          type="file"
          name="file"
          accept=".txt"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
        <button className="bg-green-900 text-white px-4 py-2 rounded">
          Upload
        </button>
      </form>
      <p className="mt-2 text-sm text-gray-600">
        MVP supports .txt best. Add PDF/DOCX extractor later.
      </p>
    </main>
  );
}
