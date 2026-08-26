# run-01 — tool-use provenance

From ChatGPT's own "Sources" panel (screenshot `sources-panel`). Each tool was called **once**. Grouped by
origin, in the order the agent visited them.

## 1. `resolver-test-mu.vercel.app` — the stateless resolver (visited first)
- `list_provider_surfaces` ×1  ← the resolver's one tool
- `webmcp_list_tools` ×1        ← discovery on arrival

## 2. `valentincoffee.cafe` — Provider A (after navigation)
- `webmcp_list_tools` ×1        ← **rediscovery after cross-origin navigation**
- `read_menu` ×1
- `confirm_price` ×1
- `order_black_coffee` ×1       ← the commit; returned confirmation VC-5866

## 3. `timothygeorge.design` — Provider B (after navigation)
- `webmcp_list_tools` ×1        ← **rediscovery after cross-origin navigation**
- `read_menu_items` ×1
- `find_available_appointment` ×1
- `confirm_pricing` ×1
- `book_appointment` ×1         ← the commit; returned confirmation TG-5797

## What this proves (maps to the four instrumented dimensions)

- **Tool rediscovery after navigation** — `webmcp_list_tools` fires **once at each of the three origins**.
  The agent re-enumerates the native WebMCP tool surface *every time it lands on a new origin*. This is the
  single most important line of evidence: native discovery works after cross-origin navigation, with no
  bespoke consumer.
- **Stateless resolver, queried once** — `list_provider_surfaces` fires **exactly once**. The agent did not
  return to the resolver to reorient. Everything after that first call — sequencing both errands, carrying
  the objective across two navigations — was carried by the **agent**, not the resolver.
- **Native execution at each provider** — the agent used each site's *own* tools (`order_black_coffee`,
  `book_appointment`, plus the read/confirm helpers), not a generic shim.
- **Zero per-page prompting** — this entire 11-call trail came from one user prompt with no follow-up.

## Note on tool choice
The prompt said "order a coffee" (unspecified); the agent chose `order_black_coffee`. It also used each
provider's read/confirm tools (`read_menu`/`confirm_price`, `read_menu_items`/`confirm_pricing`,
`find_available_appointment`) before committing — sensible inspect-before-commit behavior it decided on its
own.
