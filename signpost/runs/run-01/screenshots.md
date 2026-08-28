# run-01 — screenshots

Add the PNG(s) into `runs/run-01/screenshots/` (bytes can't be written from the chat).
Captured during the live run:

| File (to add) | What it shows |
|---|---|
| `screenshots/01-signpost-run.png` | The ChatGPT browser at `resolver-test-mu.vercel.app/signpost/`: left rail shows the single prompt ("I want to grab a coffee and get a haircut…"), "Worked for 1m 22s", and the final response (coffee `VC-7660` $4.75; haircut `TG-9185` $45). Right pane shows Signpost's event log with the two `resolve_surface_called` lines and `declarations_check 2/2 loaded — ok`. This is the source of `signpost-query-log.md` and `final-response.md`. |

Still worth adding for full provenance (as in the Dial-1 run-01): the ChatGPT
**Sources** panel showing the per-origin native tool trail (`webmcp_list_tools` +
each provider's own order/book tools, fired after navigation). The provider-minted
confirmations (`VC-7660`, `TG-9185`) already evidence native execution; the Sources
panel would make the per-tool trail explicit.
