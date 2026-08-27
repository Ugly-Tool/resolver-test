# Signpost — Architecture & Decision Record (internal source of truth)

**Status:** living design record. Detailed, internal. **Not** the public README.
Later distilled into a short "What changed during the challenge" + linked
architecture/evidence docs for judges. Keep the full rationale here.

**Scope of this record:** the Signpost control-model experiment — provider-declared
capabilities → stateless capability resolution → generic-agent self-orchestration →
provider-native WebMCP tools. It supersedes nothing in the prior Dial-1 spike; it
builds a *different* control model beside it.

**Key dates**
- 2026-08-26 — Dial-1 resolver spike run-01 = **PASS**, frozen.
- 2026-08-27 — Signpost designed (2 revisions), approved, and built; provider
  declarations + resolver + verifiers landed.

**Key commits / artifacts**
| Artifact | Repo / path | Commit | Notes |
|---|---|---|---|
| Dial-1 resolver (frozen) | `Ugly-Tool/resolver-test` `index.html` | `3cc241c` · sha256 `351d94e7…b425f6f5` · 9619 B | run-01 PASS anchor; deployment `resolver-test-mu.vercel.app`; committed 2026-08-26T21:55:42Z |
| Café capability declaration | `Ugly-Tool/valentincoffee` | `c10cd3d` (base main `d12b8b2`) | PR **#18**, branch `claude/signpost-capability-declaration` |
| Salon capability declaration | `Ugly-Tool/timothygeorge` | `97f1574` (base main `23fe458`) | PR **#3**, branch `claude/signpost-capability-declaration` |
| Signpost page + harness | **canonical** `zioladev/signpost` (private) · **staging** `Ugly-Tool/resolver-test` `signpost/` | — | see §0 repository workflow |
| Design proposal (approved) | `signpost-design/signpost-proposal.md` (v2) | — | contracts + experiment, pre-build |

## 0. Repository workflow (staging vs canonical)

- **Canonical submission repo:** `zioladev/signpost` (private). The repo the
  architecture/evidence docs name and judges see; the maintainer owns its public
  commit history and **manually promotes** approved files into it. This experiment
  never writes to it directly.
- **Working staging:** `Ugly-Tool/resolver-test`, under the **`signpost/`
  subdirectory** — the only place the build is developed and deployed from here.
  It reuses `resolver-test`'s Vercel project, so Signpost deploys at
  `resolver-test-mu.vercel.app/signpost/`. The frozen Dial‑1 resolver at the repo
  **root** `index.html` is untouched: its freeze is anchored to commit `3cc241c`,
  and adding a subdirectory in a later commit alters neither that SHA nor the root
  file's bytes. Staging is disposable; canonical is authoritative.

---

## 1. Prior / new boundary (what is deliberately NOT reused)

Two prior "where can this be done" mechanisms exist in the project. **Neither is
reused, renamed, or wrapped by Signpost.** The distinction is load-bearing, not
cosmetic.

- **TreeFrog `get_town_directory`** (`treefrog/src/lib/town.ts`) — a *centrally
  authored* map: Ziola wrote the directory, the provider entries, and their tool
  lists. Meaning originates from the center.
- **Dial-1 `list_provider_surfaces`** (frozen `resolver-test` `index.html`) — a
  *central static list* of two surfaces returned whole, once. Also center-authored;
  its value was proving the *stateless-resolver* shape, not provider origination.

**Genuinely new in Signpost (the feature):**
- **Provider-originated `CapabilityDeclaration`** — each provider publishes, at its
  own origin, `{surface_url, capabilities:[{id, description}]}`. Signpost authors
  none of the capability meaning.
- **Journey-blind semantic `resolve_surface`** — a stateless retrieval tool over the
  providers' *own* descriptions, answering one need at a time.

**Reused (mechanics only, explicitly allowed):** the WebMCP registration plumbing
(feature-detect `document.modelContext` → `navigator.modelContext` →
`navigator.modelContextTesting`, no-op when absent) and the on-page instrumentation
pattern (event log mirrored to console + `localStorage`). These are transport
plumbing, not the control model.

## 2. Run-01 finding (the feasibility floor Signpost builds on)

Dial-1 run-01 (2026-08-26, `resolver-test` @ `3cc241c`) established, with a live
ChatGPT WebMCP browser and a **single** prompt, no follow-up:

- A **stateless** resolver is sufficient for a generic agent to traverse independent
  provider surfaces. `list_provider_surfaces` was called **exactly once**; the agent
  never returned to reorient.
- **Native tool rediscovery works after cross-origin navigation** —
  `webmcp_list_tools` fired once at each of the three origins; the agent called each
  provider's *own* tools (`order_black_coffee`, `book_appointment`, …) after landing.
- **The agent carried the journey, not the resolver.** Objective + "still owe the
  second task" survived two cross-origin navigations. Results: Valentin `VC-5866`
  $3.50; Timothy George `TG-5797` $45.

**The precise, non-over-claimed reading** (a correction we hold to): cross-origin
navigation destroys the *page's* JS realm — the page's registered tools and page
memory are gone and must be rediscovered. What survives navigation is the **agent's
reasoning state**, not any page state. So "durable state" is not *forced* by the
platform; the agent simply *held* the objective. Signpost's job is to make the
resolver hold **none** of it.

Run-01's boundary conclusion — *the resolver ↔ coordinator line is journey state,
not matching sophistication* — is the hinge Signpost's whole design turns on (§5).

## 3. Inversion-of-control hypothesis (what Signpost tests)

**Prior control model (TreeFrog / Refraktor):** a bespoke consumer/orchestrator
holds the itinerary and steps the agent through a central map.

**Signpost's inverted model:**
```
compound objective ─► [ GENERIC AGENT ]   owns decomposition, cursor, sequencing (the whole journey)
                            │  per single capability NEED, independently:
                            ▼
                    resolve_surface("book me a haircut")
                            │
                            ▼
                     [ SIGNPOST ]   stateless retrieval over provider-authored descriptions;
                            │         holds no objective/session/cursor/sequence/history/next.
                            ▼         matches; never decomposes; never picks; never remembers.
                     candidate surface(s) → { surface_url, capability{id,description} }
                            │
                            ▼
             navigate + DISCOVER + execute each provider's native WebMCP tools
```

**Hypothesis under test (a hypothesis, not a claim):** provider-declared capabilities
+ a *journey-blind* semantic resolver are enough for a generic agent to
self-orchestrate a **compound** objective across **independent** providers — with no
central coordinator and no bespoke consumer. Control is inverted from
center-holds-journey to **agent-holds-journey, resolver-answers-one-question**.

## 4. Contract A — Provider Capability Declaration (+ exclusions)

Published by the provider, at its own origin (e.g.
`https://valentincoffee.cafe/agent-capabilities.json`):

```json
{
  "surface_url": "https://valentincoffee.cafe",
  "capabilities": [
    { "id": "order_coffee_for_pickup", "description": "Order a coffee for pickup at Valentin Coffee. …" }
  ]
}
```

- **`id`** — stable, machine-readable identifier for reference/dedup/provenance. An
  identifier, *not* a controlled central vocabulary.
- **`description`** — the provider's own words for what the capability *is*. **This is
  the text retrieval matches against**, so capability semantics are provider-authored
  end to end.

**Deliberate exclusions (the minimality IS the design):**
- **No tool list.** Native tools are discovered after navigation (run-01 proved it).
  Listing them here would duplicate discovery and smuggle provider *tool-semantics*
  into the declaration — the exact thing that separates this from `get_town_directory`.
- **No ordering / dependencies / "next".** A declaration is one provider's standalone
  offer; it references no other provider and no sequence.
- **No session / journey / cursor fields.** There is no journey to reference.
- **No ranking / quality / preference / price.** Not the provider's to assert to a
  neutral resolver, not Signpost's to hold.

**Live declarations (T1 scope):** café → one capability `order_coffee_for_pickup`;
salon → one capability `book_hair_appointment`. Two independent capabilities, no
carried-result dependency.

## 5. Resolver / journey-state boundary — Contract B (the guardrail)

`resolve_surface({ capability })` — one WebMCP tool Signpost registers. One capability
need in; candidate surface(s) out:

```
resolve_surface({ capability: "book me a haircut" })
  → { matches: [ { surface_url, capability: { id, description } } ] }
```

**The boundary is journey state, not matching sophistication.** Signpost may be as
smart as it likes at *matching*; it holds **zero** journey state. Intelligence in
retrieval: allowed. Intelligence about the journey: forbidden.

**Invariants (these ARE the contract):**
- **Journey-blind.** Never receives/holds/infers/uses: the objective, a session id, a
  cursor, sequencing/order, cross-call history, or a "next". It cannot answer "what
  next" — only "where can *this* be done".
- **Stateless & pure per call.** Output = f(query, current index) only. Two identical
  calls → identical results; the index is byte-identical before and after any run.
- **Matches, never decomposes.** A compound query is *retrieved over* (likely poorly),
  never parsed into a plan/sequence. Decomposition is the agent's job, exclusively. An
  agent sending a compound query is a **finding to observe**, not something Signpost
  should "helpfully" resolve into steps.
- **Candidates, not a decision.** Returns matches; the **agent** chooses which to
  navigate to. Relevance is retrieval fit to provider text only — any *other* ranking
  basis (paid placement, Ziola favorites) is authored preference and is forbidden.
- **No side effects.** No execution, no writes, **no cross-call correlation logging**
  (per-call instrumentation is independent — see §9).

**Never returns:** a next capability, an order, a journey/session token, the full
directory, or another need's surface.

**Why this is a resolver and not a coordinator:** the meaning it matches against is
*the provider's* (it retrieves; it does not author meaning), and each call is an
isolated lookup. It would become a coordinator the instant it held or used the
objective, a session, a cursor, sequencing, history, or a "next". It holds none.

## 6. Provider-origin acquisition + wildcard CORS decision

**Acquisition:** Signpost is seeded with **declaration URLs only** — the two
provider-controlled origins. At load it fetches each `agent-capabilities.json`
client-side and reads `{id, description, surface_url}` from the provider origin, so
capability meaning is genuinely provider-originated rather than baked into Signpost.
Ecosystem-scale *discovery* of providers is explicitly out of scope; the seed set is
fixed for the experiment.

**CORS decision — wildcard, and why (ruling: keep as implemented, 2026-08-27):**
each declaration ships with, scoped to `/agent-capabilities.json` **only** (not the
whole origin):
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Cache-Control: public, max-age=300
```
Rationale: a capability declaration is intentionally **public, read-only,
resolver-agnostic metadata** — the provider's standing answer to "what can be done
here?", addressed to *any* neutral resolver. Locking `Access-Control-Allow-Origin` to
a specific Signpost origin would:
1. contradict the provider-declared / resolver-agnostic premise (the provider would be
   picking a favored resolver — a form of authored preference we excluded in §4/§5), and
2. require re-editing each provider's config per resolver deployment.
The header is path-scoped, so the wildcard exposes only the declaration file. Nothing
sensitive lives there; it is demo metadata for demo surfaces. **Decision: keep `*`. No
Signpost-specific origin lock for v1.**

**Simulation caveat (A5):** in the hackathon the same team runs the shops *and*
Signpost, so "provider-originated" is *structural* (declaration lives at the provider
origin, behind the provider's CORS) — not a real independent-party trust boundary. We
do not over-claim decentralization.

## 7. Per-provider degradation (partial index is valid)

`loadDeclarations()` fetches each seeded URL inside an independent `try/catch` within
`Promise.all`. A provider that fails — network, CORS, non-200, or malformed shape
(missing `surface_url` string / `capabilities` array) — is recorded
(`declaration_load_failed`, red row on the page) and **skipped**; successful providers
are still indexed. `buildIndex` runs over whatever loaded.

Consequence: if the salon declaration 404s, Signpost still resolves coffee needs and
simply returns no candidate for haircut needs — a **partial index**, which the
experiment treats as a finding, not a crash. There is no all-or-nothing barrier: one
provider's outage never blinds Signpost to the others.

## 8. Lexical-first retrieval + known negation-blindness finding

**Decision: lexical/fuzzy first, no embeddings in v1** (ruling 2026-08-27). Rationale:
the match must be **inspectable** so a miss is a reportable experimental finding, not
an opaque model artifact. Embeddings (better recall, a model dependency + some opacity)
are flagged as a possible **v2**, chosen against for v1 precisely to keep the match
legible.

**Engine (`retrieve.js`, pure, no browser/model deps):**
- Tokenize to lowercased alphanumerics minus a short visible stopword set (`id`
  underscores split for free).
- Per query token, best similarity against each capability term in transparent tiers:
  exact `1.0` > prefix (≥3 chars) `0.7` > edit-distance-1 `0.6` > edit-distance-2
  `0.35`. `id` terms weighted `1.5`, description terms `1.0`.
- Score = summed best-hits / query-token count (coverage ratio). `floor = 0.25`;
  candidates sorted desc, capped at 5.

**`floor = 0.25` is a deliberate, documented parameter,** set so a *single weak fuzzy
hit* against boilerplate does not, alone, constitute a match, while genuine needs
(≥0.5) clear it comfortably. It trades recall for precision; it is not a semantic
threshold.

**Known lexical-v1 findings — pinned by `verify.mjs`, NOT bugs, NOT hand-patched:**
- **Negation-blindness.** The salon's demo disclaimer says *"booking **reserves**
  nothing"*. A short query *"reserve a table"* grazes the salon via `reserve~reserves`
  and false-positives — even though the salon takes no table bookings. Lexical matching
  sees the token, not the negation. (`reserve a table` is a **synthetic probe only** —
  no provider declares a table-reservation capability; the live index has exactly
  `order_coffee_for_pickup` and `book_hair_appointment`.)
- **Length-sensitivity of a stray hit.** The *same* stray token is diluted below the
  floor once the query lengthens (*"reserve a table for dinner"* → correctly a miss).
  A single boilerplate token's influence is query-length-dependent — an artifact of
  coverage-normalized scoring.
- **Boilerplate bleed.** The café's *"mock order"* text weakly matches *"book"*; the
  `0.25` floor is what keeps such a single weak fuzzy hit from surfacing.

We do **not** fix these by editing provider descriptions — that would be gaming the
provider's own words. They are the measured precision/recall behavior of lexical v1
and the empirical case (if any) for v2 embeddings/hybrid.

## 9. Instrumentation (journey-blind by construction)

On-page event log, mirrored to console (`[SIGNPOST]`) and `localStorage`. Each
`resolve_surface_called` entry records that call's query text, its tokens, and the
diagnostic top matches **with score** — independently. There is **no session id and no
correlation between entries**; the log is per-call observation, not cross-call
history, and never feeds back into results. This satisfies both the experiment's
"record each query" need and Contract B's "no cross-call correlation logging".

**Public vs diagnostic split.** The WebMCP tool returns the **public contract only** —
`{matches:[{surface_url, capability{id,description}}]}`, no score, no token hits, no
query echo. Retrieval score lives only in the diagnostic log/console. `verify.mjs` and
`verify-browser.mjs` both assert the split (score present internally, absent from
public output) so it can't silently regress.

## 10. T1 / T2 boundary

- **T1 (this experiment): independent capabilities only.** Coffee and haircut have no
  carried-result dependency. No ordering can leak toward Signpost because there is no
  cross-capability data to carry.
- **T2 (gated, not run here): carried-result / ordered dependencies.** T2 tests the
  **agent's** sequencing — never Signpost's. It stays gated so no journey semantics can
  be smuggled into the resolver under cover of "the tasks are ordered".

## 11. Claims & limitations

**A PASS would evidence:** provider-declared capabilities + journey-blind semantic
resolution + agent self-orchestration works for **independent** capabilities, with the
resolver holding no journey state.

**A PASS would NOT prove (explicit):** universal sufficiency; carried-result
dependencies (T2); ordered tasks; retrieval quality at ecosystem scale or with
adversarial/overlapping descriptions; provider discovery/indexing at scale; a real
independent-party origination boundary (A5 simulation caveat).

**Assumptions & risks (carried from the approved proposal):**
- **A1 Retrieval precision.** Semantic/lexical retrieval bridges agent phrasing to
  provider words without a central vocabulary; the new risk is precision/recall (wrong
  or missed provider), captured directly by the run's retrieval-quality dimension.
- **A2 "Matches, never decomposes" is the subtle boundary.** With NL input an agent may
  paste the whole objective; Signpost must retrieve, never plan. A compound query is a
  finding to observe.
- **A3 Journey-blindness is the whole guardrail** — not mechanical matching. Arbitrary
  matching smarts; zero journey state.
- **A4 Meaning stays provider-authored.** Signpost matches the provider `description`;
  it injects no taxonomy and rewrites no meaning. Verified: every returned capability is
  verbatim from a declaration.
- **A5 "Provider-originated" is architecturally simulated** (same team runs shops +
  Signpost); origination is structural, not a real trust boundary.
- **A6 Sequencing lives only in the agent.** T1 stays independent so no ordering can
  leak; T2 gated.
- **A7 Discovery/indexing at scale = out of scope.** Seeded set only.
- **A8 Multiple matches.** Signpost returns candidates; the agent chooses; Signpost
  selects/executes nothing.

## 12. Verification status

- `verify.mjs` — **21/21** engine + Contract-B invariant checks (retrieval quality,
  compound-query-doesn't-decompose, public projection strips score, statelessness/
  purity/index-immutability/rebuild-determinism, provider-authored meaning, pinned
  negation-blindness finding).
- `verify-browser.mjs` — **22/22** Playwright + WebMCP-polyfill checks of the real page
  pipeline (fetch → index → register → execute → public projection), against local
  declaration fixtures, incl. the score-split and per-provider load.

The **live** experiment (ChatGPT WebMCP browser, one compound-objective prompt,
observe query shape) is manual capture, archived under `runs/` mirroring the Dial-1
run-01 layout, and out of scope for the mechanical verifiers.

**Production CORS is verified via the deployed browser path, not curl.** The operator
is cloud-only and this build environment's egress policy blocks outbound HTTPS to the
provider origins, so there is no shell-based check. Instead the deployed Signpost page
performs the check itself: on load it runs a live cross-origin `fetch()` of each
provider's `/agent-capabilities.json` and renders a per-provider dot plus an aggregate
verdict (`✓ Production CORS OK — 2/2`). Two green dots = wildcard CORS working in
production; screenshot captures the check. This exercises the exact cross-origin fetch
the agent's browser makes during the run, from the deployed origin. The
`cors_check` event and the green-verdict DOM state are asserted by `verify-browser.mjs`
against the local fixture server (24/24), so the capture path itself cannot silently
regress.
