// Server-side declaration proxy for Signpost (Vercel Node Serverless Function).
//
// Why this exists: Signpost's page must load each provider's capability
// declaration, but a *browser* cross-origin fetch of a provider-controlled file
// is gated by CORS, which the providers' Vercel+@astrojs/vercel setup doesn't
// reliably send. The prior working architecture (TreeFrog/Refraktor) never hit
// this because it aggregated provider data server-side ("Vercel as proxy") and
// the agent's provider calls were same-origin/navigation, never cross-origin
// fetches. This restores that: the page calls this SAME-ORIGIN endpoint, and the
// server fetches the provider's own live file server-to-server (no browser CORS).
//
// The declaration stays genuinely provider-originated — this returns each
// provider's own bytes verbatim; it authors nothing. It is NOT an open proxy:
// only the seeded provider declaration URLs are allowed (no SSRF).

const ALLOWED = new Set([
  'https://valentincoffee.cafe/agent-capabilities.json',
  'https://timothygeorge.design/agent-capabilities.json',
]);

module.exports = async function handler(req, res) {
  const url = req.query && typeof req.query.url === 'string' ? req.query.url : '';
  res.setHeader('Access-Control-Allow-Origin', '*'); // page is same-origin; harmless
  res.setHeader('Cache-Control', 'public, max-age=60');

  if (!ALLOWED.has(url)) {
    res.status(400).json({ error: 'url not in allowlist', allowed: [...ALLOWED] });
    return;
  }
  try {
    const upstream = await fetch(url, { headers: { accept: 'application/json' } });
    if (!upstream.ok) {
      res.status(502).json({ error: `upstream HTTP ${upstream.status}`, url });
      return;
    }
    const text = await upstream.text();
    // Relay verbatim as JSON. Validate it parses so a broken upstream surfaces
    // as an error the page records, rather than silently indexing garbage.
    try {
      JSON.parse(text);
    } catch {
      res.status(502).json({ error: 'upstream returned non-JSON', url });
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(text);
  } catch (err) {
    res.status(502).json({ error: 'fetch failed', detail: String((err && err.message) || err), url });
  }
};
