# Signpost run-01 — PASS (Trajectory 1: two independent capabilities)

**Experiment:** provider-declared capabilities + a *journey-blind* semantic resolver +
a generic agent = self-orchestration of a **compound** objective across **independent**
providers, with the resolver holding no journey state.

**Verdict: PASS.** A generic ChatGPT WebMCP browser agent, given one compound objective
and no follow-up, landed on Signpost, discovered `resolve_surface`, **decomposed the
objective itself** into two independent single-capability needs, resolved each to the
correct provider surface, navigated to each, rediscovered and executed the providers'
native tools, and returned both provider-minted confirmations — while Signpost's log
shows only independent, journey-free lookups and a byte-identical index.

---

## Harness

| | |
|---|---|
| Signpost | `resolver-test-mu.vercel.app/signpost/` (staging in `Ugly-Tool/resolver-test`, `signpost/`) · one tool `resolve_surface` |
| Declarations | provider-authored, fetched live via the same-origin proxy `/api/declaration` — `2/2 loaded — ok` |
| Providers | Valentin Coffee (`valentincoffee.cafe`) · Timothy George (`timothygeorge.design`) — independent origins |
| Agent | ChatGPT browser (agent mode; composer showed "5.5") · **1m 22s** · single prompt, no follow-up |
| Prompt | *"I want to grab a coffee and get a haircut. Use the site tools available to you to sort out both"* — no capability wording, no tool name, no decomposition coaching |

## The four instrumented dimensions — all clean

| Dimension | Observed |
|---|---|
| **Query shape** | **Decomposed, independent.** Two `resolve_surface` calls, each ONE need in the agent's words: `"order a coffee"`, `"book a haircut"`. Compound objective never sent to Signpost. |
| **Retrieval precision** | **2/2 correct top matches.** `order a coffee` → `order_coffee_for_pickup@valentincoffee.cafe` (1.5); `book a haircut` → `book_hair_appointment@timothygeorge.design` (1.275). |
| **Journey ownership** | Objective + sequencing lived only in the agent. Signpost log carries no objective/order/session/cursor/next; index byte-identical before & after; revisit issued **no** re-query (agent self-carried both `surface_url`s). |
| **Native execution** | Both provider-minted confirmations returned — **VC-7660** (latte, $4.75) and **TG-9185** ("The Cut", Fri 2026-08-28 09:00, $45) — which only each provider's native tools produce. |
| **Per-page prompting** | **Zero.** One prompt drove the whole traversal. |

## Why this is a PASS (maps to the rubric)

- Agent completed the objective; **Signpost's log shows only independent
  single-capability needs**, no retained state, **correct top matches**; provider-native
  tools discovered + executed after navigation. → *evidence that provider-declared +
  journey-blind-semantic-resolution + agent-orchestration works for **independent**
  capabilities.*
- Bonus finding (positive): the agent's phrasing (`coffee`, `haircut`) differed from the
  providers' declared `id`/`description` wording (`order_coffee_for_pickup`, `hair`), and
  lexical retrieval bridged the gap with no shared vocabulary — assumption **A1** held here.

## What this PASS does NOT prove (explicit)

Universal sufficiency; carried-result dependencies (**T2**, still gated); ordered tasks;
retrieval quality at ecosystem scale or with adversarial/overlapping descriptions;
provider discovery/indexing at scale; a real independent-party origination boundary
(**A5** — same team runs shops + Signpost; origination is structural).

## Archived evidence — `runs/run-01/`

- [x] `prompt.txt` — the exact single prompt.
- [x] `signpost-query-log.md` — Signpost's own event log (the key new evidence), with
      per-dimension analysis.
- [x] `final-response.md` — ChatGPT's verbatim final response + results table.
- [ ] `tool-use-provenance.md` — the Signpost side is fully captured in the query log
      above. The **ChatGPT Sources panel** (the per-origin native-tool trail, as in the
      Dial-1 run-01) is not yet attached; the provider-minted confirmations already
      evidence native execution, but adding the Sources panel would complete the
      per-tool provenance. Drop it in when available.
- [ ] `screenshots/` — see `screenshots.md`; add the PNG(s).

## Freeze

Freeze this run by the commit that lands this archive on `Ugly-Tool/resolver-test`
(`signpost/runs/run-01/`). Do not modify Signpost's `resolve_surface` or the proxy
after this point without cutting a new run. **Dial-1 (frozen `list_provider_surfaces`)
proved a stateless *directory* resolver; Signpost run-01 proves a stateless
*journey-blind semantic* resolver over provider-authored declarations.** The next
question — cross-provider **carried-result** dependency (T2) — is a separate,
still-gated trajectory.
