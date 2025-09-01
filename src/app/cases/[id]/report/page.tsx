import { supabaseServer } from '@/lib/supabase-server';

export default async function Report({ params }: { params: { id: string }}) {
  const supa = supabaseServer();
  const { data: evals } = await supa
    .from('evaluations')
    .select('output, created_at')
    .eq('case_id', params.id)
    .eq('status','succeeded')
    .order('created_at', { ascending: false })
    .limit(1);
  const out = evals?.[0]?.output;
  if (!out) return <main className="p-8">No report yet.</main>;

  const pct = (x:number)=> (x*100).toFixed(1)+'%';
  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Case Report</h1>
      <section className="grid grid-cols-3 gap-4">
        <div className="border p-4 rounded">
          <div className="text-sm text-gray-600">Favorable Outcome</div>
          <div className="text-2xl">{pct(out.winProbability)}</div>
        </div>
        <div className="border p-4 rounded">
          <div className="text-sm text-gray-600">Settlement Likelihood</div>
          <div className="text-2xl">{pct(out.settleProbability)}</div>
        </div>
        <div className="border p-4 rounded">
          <div className="text-sm text-gray-600">Trial Continuation Risk</div>
          <div className="text-2xl">{pct(out.trialProbability)}</div>
        </div>
      </section>
      <section className="border p-4 rounded">
        <div className="text-sm text-gray-600">Estimated Damages (USD)</div>
        <div className="text-xl">
          ${out.damages?.min?.toLocaleString()} â€” <strong>${out.damages?.median?.toLocaleString()}</strong> â€” ${out.damages?.max?.toLocaleString()}
        </div>
      </section>
      <section className="border p-4 rounded">
        <div className="text-sm text-gray-600 mb-2">Key Factors</div>
        <ul className="list-disc pl-6">{(out.explanation?.keyFactors||[]).map((k:any,i:number)=><li key={i}>{k.factor||k}</li>)}</ul>
      </section>
      <section className="border p-4 rounded">
        <div className="text-sm text-gray-600 mb-2">Precedents</div>
        <ul className="list-disc pl-6">{(out.precedents||[]).map((p:any,i:number)=><li key={i}>
          <strong>{p.caseName}</strong>{p.citation ? `, ${p.citation}` : ''} â€” {p.authority||''} {p.similarityScore ? `(${Math.round(p.similarityScore*100)}%)` : ''}
        </li>)}</ul>
      </section>
      <p className="text-xs text-gray-500">
        For informational purposes only. Not legal advice.
      </p>
    </main>
  );
}
