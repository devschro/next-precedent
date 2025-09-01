'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const r = useRouter();

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const supa = supabaseBrowser();
      const { error } = await supa.auth.signInWithPassword({ email, password });
      if (error) throw error;
      r.push('/onboarding');
    } catch (e: any) {
      setErr(e.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  async function onSignUp(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const supa = supabaseBrowser();
      const { error } = await supa.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            typeof window !== 'undefined'
              ? `${window.location.origin}/onboarding`
              : undefined,
        },
      });
      if (error) throw error;
      alert('Account created. Check your email to confirm, then sign in.');
    } catch (e: any) {
      setErr(e.message || 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Sign in to Next Precedent</h1>

      <form className="space-y-4" onSubmit={onSignIn}>
        <input
          className="border p-2 w-full"
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          className="border p-2 w-full"
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <button
          className="bg-green-900 text-white px-4 py-2 rounded"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Signing inâ€¦' : 'Sign in'}
        </button>
      </form>

      <button
        className="mt-4 underline text-sm"
        onClick={onSignUp}
        disabled={loading}
      >
        Create an account
      </button>

      {err && <p className="mt-3 text-red-600">{err}</p>}
    </main>
  );
}
