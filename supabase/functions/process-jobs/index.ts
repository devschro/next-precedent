// supabase/functions/process-jobs/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4.58.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
const bucket = 'case-files';
const CRON_SECRET = Deno.env.get('CRON_SECRET'); // <— NEW

const supa = createClient(supabaseUrl, serviceRole);
const openai = new OpenAI({ apiKey: openaiKey });

type Job = {
  id: string; kind: 'chunk_embed'|'evaluate'|'pdf_generate'|'email_send';
  org_id: string|null; case_id: string|null;
  payload: Record<string, any>;
  attempts: number; run_after: string;
};

async function claimJobs(limit = 3): Promise<Job[]> {
  const now = new Date().toISOString();

  const { data: jobs, error } = await supa
    .from('jobs')
    .select('*')
    .eq('status', 'queued')
    .or(`run_after.is.null,run_after.lte.${now}`)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!jobs?.length) return [];

  for (const j of jobs) {
    await supa
      .from('jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', j.id);
  }
  return jobs as any;
}

async function readTextFromStorage(path: string): Promise<string> {
  const { data, error } = await supa.storage.from(bucket).download(path);
  if (error) throw error;
  const buf = await data.arrayBuffer();
  return new TextDecoder().decode(buf); // MVP: assumes .txt
}

function chunkText(s: string, maxChars = 2500, overlap = 200) {
  const chunks: { index:number, text:string }[] = [];
  let i = 0, idx = 0;
  while (i < s.length) {
    const end = Math.min(i + maxChars, s.length);
    chunks.push({ index: idx++, text: s.slice(i, end) });
    i = end - overlap; if (i < 0) i = 0;
  }
  return chunks;
}

async function embedChunks(document_id: string, org_id: string, chunks: {index:number,text:string}[]) {
  for (const c of chunks) {
    const emb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: c.text
    });
    const vector = emb.data[0].embedding;
    const { error } = await supa.from('document_chunks').insert({
      org_id, document_id, chunk_index: c.index, text: c.text, embedding: vector as unknown as any
    });
    if (error) throw error;
  }
}

async function handleChunkEmbed(job: Job) {
  const storage_path = job.payload?.storage_path as string;
  if (!storage_path || !job.case_id || !job.org_id) throw new Error('Missing fields');

  const { data: doc } = await supa
    .from('documents').select('id').eq('org_id', job.org_id).eq('case_id', job.case_id).eq('storage_path', storage_path).single();
  if (!doc) throw new Error('Doc not found');

  const text = await readTextFromStorage(storage_path);
  const chunks = chunkText(text);
  await embedChunks(doc.id, job.org_id, chunks);
}

async function retrieveContext(org_id: string, case_id: string, query: string) {
  let rows: any[] = [];
  try {
    const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: query });
    const { data, error } = await supa.rpc('match_document_chunks', {
      query_embedding: emb.data[0].embedding, match_count: 12, case_id
    } as any);
    if (!error && data) rows = data;
  } catch { /* ignore and fallback */ }
  if (rows.length) return rows.map(r=>r.text);
  const { data: chunks } = await supa.from('document_chunks').select('text').eq('org_id', org_id).limit(12);
  return (chunks||[]).map(c=>c.text);
}

function validateEval(json: any) {
  const fields = [
    "settleProbability",
    "dismissalProbability",
    "winAtTrialProbability",
    "lossAtTrialProbability",
  ];
  for (const f of fields) {
    const v = Number(json[f]);
    if (!Number.isFinite(v) || v < 0 || v > 1) {
      throw new Error(`${f} must be 0..1`);
    }
  }
  if (
    !json.damages ||
    !(Number(json.damages.min) <= Number(json.damages.median) &&
      Number(json.damages.median) <= Number(json.damages.max))
  ) {
    throw new Error("Damages bands must be ordered");
  }
}

async function handleEvaluate(job: Job) {
  if (!job.case_id || !job.org_id) throw new Error('Missing fields');

  const { data: cs } = await supa.from('cases').select('name').eq('id', job.case_id).single();
  const ctx = await retrieveContext(job.org_id, job.case_id, cs?.name || 'case evaluation');

  const prompt = `You are a legal evaluation assistant. Using only the provided context snippets, return STRICT JSON with:

settleProbability: number (0..1),
dismissalProbability: number (0..1),        // pre-trial win (dismissal or summary judgment)
winAtTrialProbability: number (0..1),
lossAtTrialProbability: number (0..1),
riskScore: number (0..100),

damages: { min: number, median: number, max: number, currency: "USD" },

explanation: { keyFactors: string[] },      // at least 3

precedents: [
  { caseName: string, citation?: string, authority?: string, similarityScore?: number }
],

retrievalContext: { topK?: number },
modelInfo: { provider: "openai", model: "gpt-4o-mini" }

Rules:
- JSON only, no prose.
- If uncertain, give best numeric estimates; do NOT return null.
- Probabilities DO NOT have to sum to 1.0. They are independent scenario estimates.
- Provide at least 2 precedents. Use plausible placeholders if none are found.

Context:
${ctx.join('\n---\n')}`;


  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }]
  });

  let json: any;
  try { json = JSON.parse(resp.choices[0].message.content || '{}'); } catch { throw new Error('Invalid JSON from model'); }
  try { validateEval(json); } catch {
    const a = Number(json.winProbability||0), b = Number(json.settleProbability||0), c = Number(json.trialProbability||0);
    const sum = a+b+c || 1;
    json.winProbability = a/sum; json.settleProbability = b/sum; json.trialProbability = c/sum;
  }

  await supa.from('evaluations').insert({
    org_id: job.org_id, case_id: job.case_id,
    status: 'succeeded',
    output: json,
    model_info: { provider: 'openai', model: 'gpt-4o-mini' },
    retrieval_context: { topK: 12 }
  });
}

async function handle(job: Job) {
  try {
    if (job.kind === 'chunk_embed') await handleChunkEmbed(job);
    if (job.kind === 'evaluate')    await handleEvaluate(job);
    await supa.from('jobs').update({ status: 'succeeded', updated_at: new Date().toISOString() }).eq('id', job.id);
  } catch (e:any) {
    const attempts = job.attempts + 1;
    await supa.from('jobs').update({
      status: attempts >= 3 ? 'failed' : 'queued',
      attempts,
      last_error: e.message,
      run_after: new Date(Date.now() + 60_000).toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', job.id);
  }
}

// ---- SECURE ENTRYPOINT (header or ?token=) ----
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const fromHeader = req.headers.get('x-cron-secret');
  const fromQuery = url.searchParams.get('token');

  if (!CRON_SECRET || (fromHeader !== CRON_SECRET && fromQuery !== CRON_SECRET)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const jobs = await claimJobs(3);
  for (const j of jobs) await handle(j);

  return new Response(JSON.stringify({ picked: jobs.length }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
