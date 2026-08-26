# run-01 — screenshots

Three screenshots were captured during the live run. **The image files need to be added here manually**
(drop them into `runs/run-01/screenshots/` and commit, or upload via the GitHub UI) — they were shared into
the chat session and their bytes can't be written from there. Their content is described below so the record
is complete even before the PNGs land.

| File (to add) | What it shows |
|---|---|
| `screenshots/01-sources-panel.png` | ChatGPT's **Sources** panel — the per-origin tool-use trail: `timothygeorge.design` (book_appointment, find_available_appointment, confirm_pricing, read_menu_items, webmcp_list_tools — each once), `valentincoffee.cafe` (order_black_coffee, confirm_price, read_menu, webmcp_list_tools — each once), `resolver-test-mu.vercel.app` (list_provider_surfaces, webmcp_list_tools — each once). This is the source of `tool-use-provenance.md`. |
| `screenshots/02-browser-run.png` | The ChatGPT browser mid/post-run: left rail shows the single prompt ("Order a coffee from Valentin and book a hair appointment at Timothy George…"), "Worked for 1m 21s", and the final response; the page is `timothygeorge.design` showing the booked appointment (`TG-5797` · "The Cut" · Wed Aug 26 · 1:30 PM · Stylist) with a **"WEBMCP • 6 TOOLS LIVE"** indicator. |
| `screenshots/03-final-response.png` | Zoom of ChatGPT's final response — both provider results (Valentin order VC-5866 $3.50; Timothy George TG-5797 $45, Location "22 Bishop Row, Treefrog") and the demo-action disclaimer. Source of `final-response.md`. |

Notable detail visible in `02`: the provider page itself advertises `WEBMCP • 6 TOOLS LIVE` — the agent's
`webmcp_list_tools` call at that origin corresponds to a real, live native surface, not a shim.
