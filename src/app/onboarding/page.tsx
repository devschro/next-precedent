'use client';
import { useState } from 'react';
import { createOrgAndJoin } from './actions';
import { useRouter } from 'next/navigation';

export default function Onboarding() {
  const [name, setName] = useState('');
  const r = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set('name', name);
    try {
      await createOrgAndJoin(fd);
      alert('Organization created!');
      r.push('/cases/new'); // go create a case
    } catch (e:any) {
      alert(e.message || 'Error');
    }
  }

  return (
    <main className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Create your organization</h1>
      <p className="text-gray-600 mb-6">This represents your firm in Next Precedent.</p>
      <form className="space-y-4" onSubmit={submit}>
        <input className="border p-2 w-full" placeholder="Firm name" value={name} onChange={e=>setName(e.target.value)} />
        <button className="bg-green-900 text-white px-4 py-2 rounded">Create Organization</button>
      </form>
    </main>
  );
}
