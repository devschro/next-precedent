import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Next Precedent</h1>
      <p className="text-gray-600">Quick links</p>
      <ul className="list-disc pl-6 space-y-2">
        <li><Link className="underline" href="/login">Sign in / Create account</Link></li>
        <li><Link className="underline" href="/onboarding">Create organization</Link></li>
        <li><Link className="underline" href="/cases/new">New case</Link></li>
      </ul>
    </main>
  );
}
