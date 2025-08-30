'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const r = useRouter();

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    const supa = supabaseBrowser();
    const { error } = await supa.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    r.push('/onboarding'); // first time, go create org
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    const supa = supabaseBrowser();
    const { error } = await supa.auth.signUp({ email, password });
    if (error) return alert(error.message);
    alert('Check your email to confirm, then sign in.');
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Sign in to Next Precedent</h1>
      <form className="space-y-4" onSubmit={onSignIn}>
        <input className="border p-2 w-full" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="border p-2 w-full" placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="bg-green-900 text-white px-4 py-2 rounded" type="submit">Sign in</button>
      </form>
      <button className="mt-4 underline text-sm" onClick={onSignUp}>Create an account</button>
    </main>
  );
}
