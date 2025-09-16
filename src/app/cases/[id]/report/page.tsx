import { supabaseServer } from "@/lib/supabase-server";

export default async function Report({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = await params;

  const supa = supabaseServer();
  const { data: evals, error } = await supa
    .from("evaluations")
    .select("output, created_at, status")
    .eq("case_id", caseId)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return (
      <main className="p-8">
        <p className="text-red-700">Error: {error.message}</p>
      </main>
    );
  }

  const out: any = evals?.[0]?.output;
  if (!out) return <main className="p-8">No report yet.</main>;

  // ---- Backward compatibility (map old keys if new ones are missing) ----
  const settle =
    typeof out.settleProbability === "number" ? out.settleProbability : 0;

  // If no new 'dismissalProbability', approximate from old 'winProbability'
  const dismissal =
    typeof out.dismissalProbability === "number"
      ? out.dismissalProbability
      : typeof out.winProbability === "number"
      ? out.winProbability
      : 0;

  const winAtTrial =
    typeof out.winAtTrialProbability === "number"
      ? out.winAtTrialProbability
      : 0;

  // If no new 'lossAtTrialProbability', approximate from old 'trialProbability'
  const lossAtTrial =
    typeof out.lossAtTrialProbability === "number"
      ? out.lossAtTrialProbability
      : typeof out.trialProbability === "number"
      ? Math.max(out.trialProbability - (settle + dismissal), 0)
      : 0;

  const pct = (x: number) => ((Number(x) || 0) * 100).toFixed(1) + "%";

  const damagesMin =
    out?.damages && typeof out.damages.min === "number"
      ? out.damages.min
      : null;
  const damagesMed =
    out?.damages && typeof out.damages.median === "number"
      ? out.damages.median
      : null;
  const damagesMax =
    out?.damages && typeof out.damages.max === "number"
      ? out.damages.max
      : null;

  const keyFactors: any[] = Array.isArray(out?.explanation?.keyFactors)
    ? out.explanation.keyFactors
    : [];

  const precedents: any[] = Array.isArray(out?.precedents)
    ? out.precedents
    : [];

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Case Report</h1>

      {/* Four independent probabilities */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Settlement Likelihood", value: settle },
          { label: "Dismissal / SJ Likelihood", value: dismissal },
          { label: "Win at Trial", value: winAtTrial },
          { label: "Loss at Trial", value: lossAtTrial },
        ].map((row, i) => (
          <div key={i} className="border p-4 rounded">
            <div className="text-sm text-gray-600">{row.label}</div>
            <div className="text-2xl">{pct(row.value as number)}</div>
          </div>
        ))}
      </section>

      <section className="border p-4 rounded">
        <div className="text-sm text-gray-600">Estimated Damages (USD)</div>
        <div className="text-xl">
          {damagesMin != null ? `$${damagesMin.toLocaleString()}` : "—"} —{" "}
          <strong>
            {damagesMed != null ? `$${damagesMed.toLocaleString()}` : "—"}
          </strong>{" "}
          — {damagesMax != null ? `$${damagesMax.toLocaleString()}` : "—"}
        </div>
      </section>

      <section className="border p-4 rounded">
        <div className="text-sm text-gray-600 mb-2">Key Factors</div>
        {keyFactors.length ? (
          <ul className="list-disc pl-6">
            {keyFactors.map((k: any, idx: number) => (
              <li key={idx}>
                {typeof k === "string" ? k : k?.factor || "Factor"}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500 text-sm">No key factors extracted.</div>
        )}
      </section>

      <section className="border p-4 rounded">
        <div className="text-sm text-gray-600 mb-2">Precedents</div>
        {precedents.length ? (
          <ul className="list-disc pl-6">
            {precedents.map((p: any, idx: number) => {
              const name = p?.caseName || "Case TBD";
              const citation = p?.citation ? `, ${p.citation}` : "";
              const authority = p?.authority ? ` — ${p.authority}` : "";
              const sim =
                typeof p?.similarityScore === "number"
                  ? ` (${Math.round(p.similarityScore * 100)}%)`
                  : "";
              return (
                <li key={idx}>
                  <strong>{name}</strong>
                  {citation}
                  {authority}
                  {sim}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-gray-500 text-sm">No precedents listed.</div>
        )}
      </section>

      <p className="text-xs text-gray-500">
        For informational purposes only. Not legal advice.
      </p>
    </main>
  );
}
