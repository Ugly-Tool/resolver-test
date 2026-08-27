// Signpost — mechanical verification of the retrieval engine + the two
// contract invariants that make it a resolver rather than a coordinator.
//
// Runs in plain Node against LOCAL fixtures (copies of the provider
// declarations). It does NOT need a browser or a WebMCP runtime — it exercises
// retrieve.js directly, which is exactly the code path index.html registers.
//
//   node verify.mjs
//
// Two classes of check:
//   1. Retrieval quality — natural-language needs land on the right provider,
//      cross-need queries stay separated, and genuine misses are misses (which
//      the experiment treats as findings, so they are asserted, not hidden).
//   2. Journey-blindness / statelessness — the properties from Contract B:
//      pure per call, no state retained, public output strips score, and the
//      index is byte-identical before and after a batch of calls.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex, resolve, toPublicContract } from './retrieve.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');

const declarations = readdirSync(FIXTURES)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(FIXTURES, f), 'utf8')));

let pass = 0;
let fail = 0;
const failures = [];
function check(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; failures.push(name + (extra ? ` — ${extra}` : '')); console.log('  ✗', name, extra ? `— ${extra}` : ''); }
}

const host = (u) => new URL(u).host;
const index = buildIndex(declarations);

console.log(`\nLoaded ${declarations.length} provider declaration(s), ${index.entries.length} capability(ies).\n`);
console.log('── Retrieval quality (natural-language need → correct provider) ──');

// Each probe is a phrasing an agent might plausibly use for ONE capability.
// `want` is the host we expect as the top match; null means "expect a miss".
const probes = [
  { q: 'order a coffee', want: 'valentincoffee.cafe' },
  { q: 'buy me a latte for pickup', want: 'valentincoffee.cafe' },
  { q: 'grab a black coffee', want: 'valentincoffee.cafe' },
  { q: 'book a haircut', want: 'timothygeorge.design' },
  { q: 'book me a hair appointment', want: 'timothygeorge.design' },
  { q: 'schedule a shave at the barber', want: 'timothygeorge.design' },
  { q: 'walk my dog', want: null },            // no lexical overlap at all → clean miss
  { q: 'reserve a table for dinner', want: null }, // stray "reserve~reserves" hit is diluted below floor
];

for (const { q, want } of probes) {
  const r = resolve(index, q);
  const top = r.matches[0];
  if (want === null) {
    check(`"${q}" → miss (no provider offers this)`, !top, top ? `unexpectedly matched ${host(top.surface_url)} (score ${top.score})` : '');
  } else {
    check(`"${q}" → ${want}`, top && host(top.surface_url) === want,
      top ? `got ${host(top.surface_url)} (score ${top.score})` : 'no match');
  }
}

console.log('\n── Known lexical-retrieval findings (pinned, NOT bugs — see README) ──');
{
  // Lexical retrieval is negation-blind. The salon's demo disclaimer contains
  // "booking RESERVES nothing", so a short query like "reserve a table" grazes
  // it via reserve~reserves even though the salon does not take table bookings.
  // The SAME stray hit is diluted below the floor once the query is longer
  // ("reserve a table for dinner", asserted as a miss above) — a clean
  // illustration that a single boilerplate token's influence is length-sensitive.
  const r = resolve(index, 'reserve a table');
  const top = r.matches[0];
  check('FINDING: "reserve a table" false-positives on salon via "reserves" (negation-blind)',
    top && host(top.surface_url) === 'timothygeorge.design',
    top ? `score ${top.score} — documented limitation of lexical v1` : 'no match (finding no longer reproduces)');
}

console.log('\n── "Matches, never decomposes": a COMPOUND query is retrieved, not planned ──');
{
  // The agent is supposed to decompose; if it (wrongly) sends the whole
  // objective, Signpost must still just RETRIEVE over it — never return an
  // ordered plan, a "next", or a sequence. We assert only that it returns flat
  // candidates and invents no plan/next/order field.
  const r = resolve(index, 'order a coffee and book a haircut');
  const pub = toPublicContract(r);
  check('compound query returns flat candidate list', Array.isArray(pub.matches));
  check('compound query invents no ordering/next/plan/session field',
    !('next' in pub) && !('order' in pub) && !('plan' in pub) && !('session' in pub) &&
    pub.matches.every((m) => Object.keys(m).sort().join(',') === 'capability,surface_url'));
}

console.log('\n── Public contract projection (score stays diagnostic, out of v1 contract) ──');
{
  const diag = resolve(index, 'book a haircut');
  const pub = toPublicContract(diag);
  const s = JSON.stringify(pub);
  check('diagnostic result DOES carry score (internal)', diag.matches.every((m) => typeof m.score === 'number'));
  check('public result carries NO score', !s.includes('score') && pub.matches.every((m) => !('score' in m)));
  check('public result carries NO token hits', !s.includes('hits') && pub.matches.every((m) => !('hits' in m)));
  check('public result echoes NO query', !('query' in pub) && !('query_tokens' in pub));
  check('public match shape is exactly { surface_url, capability{ id, description } }',
    pub.matches.every((m) =>
      Object.keys(m).sort().join(',') === 'capability,surface_url' &&
      Object.keys(m.capability).sort().join(',') === 'description,id'));
}

console.log('\n── Statelessness / journey-blindness (Contract B invariants) ──');
{
  // Purity: identical calls → identical results.
  const a = JSON.stringify(resolve(index, 'order a coffee'));
  const b = JSON.stringify(resolve(index, 'order a coffee'));
  check('two identical calls → byte-identical results (pure)', a === b);

  // Order independence: the result for a query does not depend on what was
  // asked before it (no cross-call history influencing retrieval).
  resolve(index, 'book a haircut');
  resolve(index, 'reserve a table');
  const after = JSON.stringify(resolve(index, 'order a coffee'));
  check('result is independent of prior calls (no history)', a === after);

  // Index immutability: a batch of resolves does not mutate the index.
  const before = JSON.stringify(index);
  for (const { q } of probes) resolve(index, q);
  const idxAfter = JSON.stringify(index);
  check('index is byte-identical before and after a run', before === idxAfter);

  // Rebuild determinism: building the index twice from the same declarations
  // yields the same structure (no hidden state/ordering).
  check('index rebuild is deterministic', JSON.stringify(buildIndex(declarations)) === JSON.stringify(buildIndex(declarations)));
}

console.log('\n── Meaning is provider-authored (Signpost injects no taxonomy) ──');
{
  // Every capability the index can return must be traceable to a declaration —
  // Signpost must never surface an id/description it authored itself.
  const declared = new Set();
  for (const d of declarations) for (const c of d.capabilities) declared.add(`${d.surface_url}::${c.id}::${c.description}`);
  const r = resolve(index, 'order a coffee and book a haircut');
  check('every returned capability is verbatim from a provider declaration',
    r.matches.every((m) => declared.has(`${m.surface_url}::${m.capability.id}::${m.capability.description}`)));
}

console.log(`\n${fail === 0 ? '✓ ALL PASS' : '✗ FAILURES'} — ${pass} passed, ${fail} failed.`);
if (fail > 0) { for (const f of failures) console.log('   • ' + f); process.exit(1); }
