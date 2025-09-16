'use client';

import { use, useState } from 'react';

export default function EvalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = use(params);
  const [orgId, setOrgId] = useState('');

  async function run() {
    if (!orgId) return alert('Enter your Org ID');

    // Use FormData to avoid Content-Type issues
    const fd = new FormData();
    fd.set('org_id', orgId);
    fd.set('case_id', caseId);

    const res = await fetch('/api/evaluate', {
      method: 'POST',
      body: fd,
    });

    const j = await res.json();
    if (!res.ok) return alert(j.error || 'Failed');
    alert('Evaluation queued. It will complete in ~1–2 minutes.');
  }

  return (
    <main className="p-8 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Run Evaluation</h1>
      <input
        className="border p-2 w-full"
        placeholder="Org ID"
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
        name="org_id"
      />
      <button
        className="bg-green-900 text-white px-4 py-2 rounded"
        onClick={run}
      >
        Run
      </button>
    </main>
  );
}
