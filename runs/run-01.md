# run-01 — PASS

**Spike:** Can ChatGPT's WebMCP-capable browser traverse independent provider surfaces from a **stateless
resolver**, without a bespoke consumer (no Refraktor, no custom agent loop)?

**Verdict: PASS.** Trajectory 1 (two-provider, independent tasks, dial 1). A generic ChatGPT browser agent,
given one objective and no follow-up, called the stateless resolver once and traversed
`resolver → Valentin Coffee → Timothy George` on its own — rediscovering each origin's native WebMCP tools
after navigation, completing both independent tasks, retaining the objective/cursor across the navigation,
and returning both provider results. **Dial 1 is sufficient. No itinerary state, no capability stepping,
no coordinator required.**

---

## Frozen harness (immutable reference)

| | |
|---|---|
| Repo | `github.com/Ugly-Tool/resolver-test` |
| Deployed commit | `3cc241c9d9c74f61787d93150a775b839f7e6bf8` (`3cc241c`) — **immutable freeze anchor** |
| Frozen artifact | `index.html` · **9619 bytes** · `sha256:351d94e7b0798027b936cbcace1df183b6c680e56ccd8331e4214fadb425f6f5` |
| Git tag / release | `run-01` intended at the commit above — **not yet created**: this session can push branches but not tag refs (HTTP 403). Create it via GitHub → Releases → tag `run-01` @ `3cc241c`. The commit SHA + sha256 already freeze the exact bytes; the tag is only a friendly alias. |
| Deployment URL | `https://resolver-test.vercel.app/` *(confirm exact project domain)* |
| Resolver tool | `list_provider_surfaces` — stateless directory, one call, returns 2 surfaces |
| Committed at | 2026-08-26T21:55:42Z |
| Archived at | 2026-08-26T22:12:40Z |

The resolver holds **no** journey/cursor/step/state/progress fields (enforced by `verify.mjs`). Everything
carried across the navigation was carried by the **agent**, not the resolver.

## Trajectory

| | |
|---|---|
| Type | Two independent sub-tasks, no cross-provider data dependency |
| Dial | 1 — directory returned whole, once; agent self-decomposes + self-sequences |
| Provider A | **Valentin Coffee** — `valentincoffee.cafe` — order a drink |
| Provider B | **Timothy George** — `timothygeorge.design` — book an appointment |
| Agent | ChatGPT — *build/version/mode: TBD (fill from the session)* |

## Observed result (the four instrumented dimensions — all clean)

| Dimension | Observed |
|---|---|
| **Navigation** | Agent navigated `resolver → Valentin → Timothy George` unaided, from the resolver's returned URLs. |
| **Tool rediscovery** | Native WebMCP tools discovered + called **after navigation** at **both** provider origins. |
| **Objective / cursor retention** | Objective + "still owe the second task" retained across the navigation; no dropped sub-task. |
| **Per-page prompting** | **Zero.** One prompt, no follow-up interaction. |
| Resolver `tool_called` | **1** (`list_provider_surfaces`, once) — no re-query to reorient. |

## Verdict rubric → PASS

Both sub-tasks completed · native tools rediscovered after each nav · objective self-carried · **0** extra
prompts · resolver queried **once**. → *A stateless resolver is sufficient; no bespoke consumer, no external
state.*

---

## Archived evidence

Provenance artifacts from the live ChatGPT session. **Status: pending attachment** — paste/attach these and
they'll be committed into `runs/run-01/`:

- [ ] `prompt.txt` — the **exact** objective prompt given to ChatGPT (verbatim, one prompt).
- [ ] `final-response.md` — ChatGPT's final response text (both provider results as returned).
- [ ] `tool-use-provenance.md` — the tool-call trail: `list_provider_surfaces` (resolver) + the native
      provider tools it discovered/called at each origin, in order.
- [ ] `screenshots/` — the run screenshots (resolver page, each provider, final result).

*(The prompt in `README.md` is the suggested wording; replace with the exact text used if it differed.)*

## Conclusion & next (not yet — do not modify the resolver)

Dial-1 feasibility is **demonstrated** for independent tasks. The next question — **cross-provider carried
state** — is a *separate* trajectory (T2), gated on a genuine carried-result dependency (see `README.md`).
Per direction: do **not** add itinerary state or capability stepping. This resolver version is frozen as
`run-01`.
