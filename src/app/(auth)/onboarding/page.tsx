"use client";
import { useState } from "react";

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");

      // ✅ go straight to case creation with the new org id
      window.location.href = `/cases/new?org=${json.org.id}`;
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Create your organization</h1>
      <form className="space-y-4" onSubmit={createOrg}>
        <input className="border p-2 w-full" placeholder="Organization name"
               value={name} onChange={e=>setName(e.target.value)} required />
        <button className="bg-green-900 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? "Creating…" : "Create organization"}
        </button>
      </form>
      {err && <p className="mt-3 text-red-600">{err}</p>}
    </main>
  );
}
