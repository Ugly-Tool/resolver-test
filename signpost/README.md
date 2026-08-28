# Signpost — a journey-blind capability resolver

Signpost tests a **different control model** from the frozen Dial‑1 resolver
(`resolver-test`, run‑01 PASS). The question is no longer "can a stateless
resolver hand out a directory" — Dial‑1 answered that. The question here is:

> If **providers declare their own capabilities** at their own origins, and a
> resolver answers only *"where can capability X be performed?"* by matching a
> need against **the providers' own words** — can a generic in‑browser agent
> self‑orchestrate a compound objective across independent providers, with the
> resolver holding **no** journey state?

```
compound objective ─► [ GENERIC AGENT ]  owns: decomposition, cursor, sequencing (the whole journey)
                            │  per single capability NEED, independently:
                            ▼
                    resolve_surface("book me a haircut")
                            │
                            ▼
                     [ SIGNPOST ]  stateless lexical retrieval over provider-authored descriptions.
                            │        holds no objective / session / cursor / sequence / history / next.
                            ▼        matches; never decomposes; never picks; never remembers.
                     candidate surface(s)  — { surface_url, capability{ id, description } }
                            │
                            ▼
             navigate + DISCOVER + execute each provider's native WebMCP tools
```

The boundary that keeps Signpost a **resolver** and not a **coordinator** is
**journey state, not matching sophistication.** Signpost may be as smart as it
likes at *matching* (here: transparent lexical/fuzzy retrieval); it holds
**zero** journey state. The instant it carried a session, a cursor, history, or
a "next", it would be the central coordinator this experiment is trying to
avoid. Full design rationale: `../signpost-design/signpost-proposal.md`.

## What's here

| File | Role |
|---|---|
| `index.html` | The Signpost page. Seeds **declaration URLs only**, loads them through the same-origin proxy, builds a lexical index, and registers the single WebMCP tool `resolve_surface`. |
| `api/declaration.js` | Same-origin declaration **proxy** (Vercel Node function). Fetches a seeded provider declaration server-to-server (no browser CORS) and relays it verbatim; allowlist-guarded (not an open proxy). |
| `retrieve.js` | Pure, side‑effect‑free retrieval engine. No embeddings, no model dependency — every score is visible token overlap. Imported unchanged by the page and by the verifiers. |
| `verify.mjs` | Node mechanical checks of the retrieval engine + Contract‑B invariants + the proxy SSRF guard. `node verify.mjs` |
| `verify-browser.mjs` | Playwright + WebMCP‑polyfill checks of the actual page pipeline (proxy fetch → index → register → execute → public projection). `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node verify-browser.mjs` |
| `fixtures/` | Local copies of the two provider declarations, for offline verification. The **live** declarations are fetched by the proxy from the provider origins. |
| `docs/architecture-decision-record.md` | Internal source-of-truth design record — full rationale (prior/new boundary, contracts + exclusions, journey-state boundary, proxy acquisition + CORS history, degradation, lexical findings, T1/T2, claims/limits, commits). |

Both verifiers are green (25 + 24 checks). Run them before deploying.

## The two contracts (v1)

**Contract A — Provider Capability Declaration** (published *by the provider, at
its own origin*, e.g. `https://valentincoffee.cafe/agent-capabilities.json`):

```json
{
  "surface_url": "https://valentincoffee.cafe",
  "capabilities": [
    { "id": "order_coffee_for_pickup", "description": "Order a coffee for pickup at Valentin Coffee. …" }
  ]
}
```

No tool list, no ordering, no session, no ranking. Native tool discovery still
happens after navigation. The `description` is the text retrieval matches
against, so capability meaning is **provider‑authored end to end**.

**Contract B — `resolve_surface({ capability })`** — the single WebMCP tool
Signpost registers. One capability need in; candidate surface(s) out:

```
resolve_surface({ capability: "book me a haircut" })
  → { matches: [ { surface_url, capability: { id, description } } ] }
```

Invariants (these *are* the contract):
- **Journey‑blind.** Never receives/holds/uses the objective, a session, a
  cursor, sequencing, cross‑call history, or a "next". Cannot answer "what
  next" — only "where can *this* be done".
- **Stateless & pure.** Output is a function of `(query, current index)` only.
  Two identical calls → identical results; the index is unchanged by calls.
- **Matches, never decomposes.** A compound query is *retrieved over* (likely
  poorly), never parsed into a plan. Decomposition is the agent's job.
- **Candidates, not a decision.** Returns matches; the agent chooses.
- **Score stays diagnostic.** Retrieval score/token‑hits are **not** in the v1
  public output — only in the on‑page log / console, as diagnostic metadata.

## Running the experiment (live agent)

The mechanical verifiers prove the page. The *experiment* needs the live
ChatGPT WebMCP browser, exactly as run‑01 did — captured by hand.

**Rulings baked into this protocol:**
- Give ChatGPT **only the compound objective**. Do **not** teach it the word
  "capability", the tool name, decomposition, or how to phrase a lookup.
- **Observe the query shape it naturally sends** to `resolve_surface`.
- Retrieval **misses are findings**, not failures — record them.
- **T1 only** (two *independent* capabilities). **T2 (carried‑result) stays
  gated** — do not run an ordered/dependent objective here.

**Protocol**
1. Deploy (below). Confirm both provider declarations load (green dots on the
   Signpost page) and the page shows `resolve_surface registered`.
2. Open ChatGPT's WebMCP browser (agent mode, same target as run‑01) and land
   it on the deployed Signpost URL.
3. Give it **one** prompt — the compound objective, nothing else. Suggested,
   deliberately capability‑agnostic:

   > **"I want to grab a coffee and get a haircut. Use the site tools available to you to sort out both."**

   No follow‑up, no per‑page prompting, no mention of `resolve_surface` or of
   "capabilities".
4. Let it run. Capture:
   - **Signpost's query log** (Copy log button, or the `[SIGNPOST]` console
     lines) — the exact `capability` strings it sent, their tokens, and the
     diagnostic top matches.
   - **ChatGPT's Sources / tool‑use trail** across all origins (as in run‑01).
   - **Final response** (both provider confirmations).
   - **Screenshots.**

**Record, per proof dimension:**

| Dimension | What to look for |
|---|---|
| Query shape | Did ChatGPT send **independent single‑capability** needs, or paste the whole objective as one compound query? (Either is a finding — the latter tests "matches, never decomposes".) |
| Retrieval precision | For each query, was the **top match the correct provider**? Note any wrong/mixed top match, and whether the agent corrected it. |
| Journey ownership | The compound objective + sequencing live only in the agent; Signpost's log shows no objective/order/session/next; index byte‑identical before/after. |
| Native execution | `webmcp_list_tools` + the provider's own tools fire **after** each navigation (rediscovery), not from Signpost. |
| Per‑page prompting | Ideally **zero** — one prompt drove the whole traversal. |

**Verdict**
- **PASS** — agent completes both tasks; Signpost's log shows only independent
  single‑capability needs, correct top matches, no retained state; native tools
  discovered + executed after navigation. → *provider‑declared +
  journey‑blind‑semantic‑resolution + agent‑orchestration works for
  **independent** capabilities.*
- **PARTIAL** — completes, but: a wrong/mixed top match the agent had to
  correct; or it sent a **compound** query and leaned on Signpost to sort it
  out; or it had to be handed capability wording. Record the exact crutch.
- **FAIL** — retrieval can't surface the right provider for a reasonable need;
  or the agent can't self‑sequence without a coordinator. Report where.

**A PASS does NOT prove:** universal sufficiency; carried‑result dependencies
(T2); ordered tasks; retrieval quality at ecosystem scale or with adversarial /
overlapping descriptions; provider discovery/indexing. All out of scope.

Archive the run under `runs/run-01/` mirroring the Dial‑1 layout
(`prompt.txt`, `final-response.md`, `tool-use-provenance.md`,
`signpost-query-log.md`, `screenshots.md`) and freeze it by commit SHA once it's
recorded.

## Findings (lexical v1 — pinned by `verify.mjs`, not bugs)

Transparent lexical retrieval has honest limits. These are recorded as
first‑class, tested findings so v2 (embeddings/hybrid) has a baseline:

- **Negation‑blindness.** The salon's demo disclaimer contains *"booking
  **reserves** nothing"*. A short query like *"reserve a table"* grazes it via
  `reserve~reserves` and false‑positives on the salon — even though it takes no
  table bookings. Lexical matching sees the token, not the negation.
- **Length‑sensitivity of a stray hit.** The *same* stray token is diluted
  below the score floor once the query is longer (*"reserve a table for
  dinner"* → correctly a miss). A single boilerplate token's influence depends
  on query length — an artifact of coverage‑normalized scoring.
- **Boilerplate bleed.** The café's *"mock order"* text weakly matches *"book"*;
  the `floor` (0.25) is set specifically so such single weak fuzzy hits don't
  clear the bar, while genuine needs (≥ 0.5) clear it comfortably.

None of these are patched by hand‑editing provider descriptions (that would be
gaming the provider's own words). They are the measured precision/recall
behavior of lexical v1 and the reason the design flags embeddings as a possible
v2 — chosen against for v1 precisely so the match stays inspectable.

## Repository workflow (staging vs canonical)

- **Canonical submission repo:** `zioladev/signpost` (private). This is the repo
  referenced in the architecture/evidence docs and the one judges see. Approved
  files are **manually promoted** into it by the maintainer, who owns its public
  commit history. Nothing in this experiment writes to it directly.
- **Working staging:** `Ugly-Tool/resolver-test`, under the **`signpost/`
  subdirectory**. This is the only place the build is developed and deployed from
  here. It reuses `resolver-test`'s existing Vercel project, so Signpost deploys
  at **`resolver-test-mu.vercel.app/signpost/`** with no new project. The frozen
  Dial‑1 resolver at the repo **root** `index.html` is untouched — its freeze is
  anchored to commit `3cc241c`, which adding a subdirectory does not alter.

Signpost is a page (`signpost/`) plus one serverless function (`api/declaration.js`).
The page's `./retrieve.js` import resolves to `/signpost/retrieve.js`; the page loads
declarations through the **absolute** same-origin path `/api/declaration?url=…`, so
the subpath does not affect resolution. In `resolver-test` the function lives at the
repo **root** `api/declaration.js` and serves at `/api/declaration` — the same
absolute path in either layout.

**Why a proxy (not a direct browser fetch).** A browser cross-origin `fetch()` of a
provider-controlled file is gated by CORS, which the providers' `@astrojs/vercel`
(Build Output API) setup did not reliably send. Rather than depend on a provider-side
Vercel Build-Command setting we can't see, the page calls Signpost's **own**
same-origin proxy, which fetches each provider's file **server-to-server** (no browser
CORS) and relays it verbatim — the prior "Vercel as proxy" pattern. Meaning stays
provider-originated; the proxy is allowlist-guarded (not an open proxy). See ADR §6.

## Deployment handoff

**Prerequisite — provider declarations are live (done).** Both merged to their
provider mains:
- `Ugly-Tool/valentincoffee` PR **#18** → merged (`f208a5c`); CORS build-step PR **#19** (now moot).
- `Ugly-Tool/timothygeorge` PR **#3** → merged (`51922a5`); CORS build-step PR **#4** (now moot).

The provider-side CORS changes are harmless but no longer relied upon — the proxy
removes the browser-CORS dependency entirely.

**Deploy Signpost:**
1. Land `signpost/` **and** `api/declaration.js` on `Ugly-Tool/resolver-test` `main`
   (via the staging PR). Vercel auto‑deploys the page at
   `resolver-test-mu.vercel.app/signpost/` and the function at `/api/declaration`
   (zero-config — an `api/` file is deployed as a Serverless Function automatically).
2. Open the `/signpost/` URL in a browser. Status reads *"WebMCP not detected"* for a
   non‑agent browser (correct — the page is inert for humans). Use the **Try a
   lookup** box to sanity‑check retrieval.

**Empirical production check (browser‑only, no curl):** the deployed page does it
itself. On load it fetches each declaration through the proxy and renders a
per‑provider dot plus an aggregate verdict:
- **✓ Declarations loaded — 2/2** (two green dots) → both declarations resolve
  end-to-end in production via the proxy. **Screenshot this; it is the check.**
- **⚠ Partial / ✗ FAILED** with a red row → per‑provider load failure (proxy or
  provider deploy); Signpost degrades per‑provider and still serves the loaded one.

This is the authoritative production CORS verification for a cloud‑only operator
— it exercises the exact cross‑origin fetch the agent's browser will make during
the run, from the deployed origin, and needs no shell.

3. Once both dots are green, run the live experiment above with the ChatGPT
   WebMCP browser.

**Boundary reminder (do not cross):** this is the *new* control model. Do not
reuse or repackage `get_town_directory` or the frozen Dial‑1
`list_provider_surfaces` — the whole point is provider‑originated declarations +
journey‑blind semantic resolution. Do not add itinerary state, a cursor, or any
"next" to Signpost. T2 stays gated.
