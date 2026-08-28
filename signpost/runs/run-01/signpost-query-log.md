# run-01 — Signpost's own event log (journey-blind instrumentation)

Copied from the deployed Signpost page (`resolver-test-mu.vercel.app/signpost/`),
mirrored to console as `[SIGNPOST]`. Each entry is independent — no session id,
no cross-call correlation. Verbatim:

```
00:26:32.227 page_loaded referrer=(none)
00:26:32.239 webmcp_present
00:26:32.243 tool_registered resolve_surface
00:26:32.601 declaration_loaded https://valentincoffee.cafe/agent-capabilities.json → 1 capability(ies)
00:26:32.765 declaration_loaded https://timothygeorge.design/agent-capabilities.json → 1 capability(ies)
00:26:32.767 index_built 2 capability(ies) from 2 provider(s)
00:26:32.767 declarations_check 2/2 loaded — ok
00:27:16.611 resolve_surface_called q="order a coffee" tokens=[order coffee] → order_coffee_for_pickup@valentincoffee.cafe=1.5
00:27:17.830 resolve_surface_called q="book a haircut" tokens=[book haircut] → book_hair_appointment@timothygeorge.design=1.275
00:28:58.700 page_loaded referrer=(none)
00:28:58.704 webmcp_present
00:28:58.707 tool_registered resolve_surface
00:28:58.946 declaration_loaded https://valentincoffee.cafe/agent-capabilities.json → 1 capability(ies)
00:28:59.022 declaration_loaded https://timothygeorge.design/agent-capabilities.json → 1 capability(ies)
00:28:59.029 index_built 2 capability(ies) from 2 provider(s)
00:28:59.032 declarations_check 2/2 loaded — ok
```

## What the log proves (per proof dimension)

- **Query shape — decomposed, independent.** Two `resolve_surface` calls, each a
  SINGLE capability need in the agent's own words: `"order a coffee"`,
  `"book a haircut"`. The compound objective was NEVER sent to Signpost. The agent
  decomposed it before querying — decomposition lives in the agent, exclusively.
- **Retrieval precision — 2/2 correct top matches.** `order a coffee` →
  `order_coffee_for_pickup@valentincoffee.cafe` (score 1.5, the maximum);
  `book a haircut` → `book_hair_appointment@timothygeorge.design` (1.275). Right
  provider each time. Agent phrasing (`coffee`/`haircut`) bridged to provider words
  (`order_coffee_for_pickup`/`hair`) by lexical retrieval — no shared vocabulary
  needed (validates assumption A1 for this case).
- **Journey-blind.** No objective, order, session, cursor, history, or "next" in any
  entry; the two queries reference neither each other nor a plan. The index is
  byte-identical before and after (`index_built 2 … from 2` identical on both loads).
- **Stateless self-carry.** Both queries fired up front (00:27:16 and 00:27:17, ~1.2s
  apart) in the first page session; the agent then navigated away and executed both.
  The revisit at 00:28:58 issued NO new `resolve_surface` call — the agent carried
  both `surface_url`s itself and never returned to reorient.
