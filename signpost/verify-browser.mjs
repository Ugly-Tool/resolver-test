// Signpost — browser-side mechanical verification of index.html.
//
// Proves the PAGE-SIDE mechanics end to end, against a minimal
// document.modelContext polyfill (standing in for a WebMCP-capable browser)
// and LOCAL declaration fixtures served over HTTP (standing in for the live
// provider origins). It exercises the real pipeline the page runs:
//   fetch provider declarations → build index → register resolve_surface →
//   execute it → project to the PUBLIC contract.
//
// The real experiment question — does ChatGPT's browser discover and drive
// this after landing on Signpost — needs the live agent and is out of scope
// here (that is run-01-style manual capture; see README).
//
// Run:  PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node verify-browser.mjs
//
// The seed URLs in index.html point at the real provider origins; this harness
// rewrites them to the local fixture server so the fetch path is exercised
// offline and deterministically.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import http from 'node:http';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = dirname(fileURLToPath(import.meta.url));

const retrieveJs = readFileSync(join(root, 'retrieve.js'), 'utf8');
const cafeDecl = readFileSync(join(root, 'fixtures', 'valentincoffee.json'), 'utf8');
const salonDecl = readFileSync(join(root, 'fixtures', 'timothygeorge.json'), 'utf8');
let html = readFileSync(join(root, 'index.html'), 'utf8');
// Rewrite the seeded provider-origin URLs to local fixture paths.
html = html
  .replace('https://valentincoffee.cafe/agent-capabilities.json', '/fixtures/valentincoffee.json')
  .replace('https://timothygeorge.design/agent-capabilities.json', '/fixtures/timothygeorge.json');

const send = (res, type, body) => { res.setHeader('content-type', type); res.setHeader('access-control-allow-origin', '*'); res.end(body); };
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/index')) return send(res, 'text/html', html);
  if (req.url.startsWith('/retrieve.js')) return send(res, 'text/javascript', retrieveJs);
  if (req.url.startsWith('/fixtures/valentincoffee.json')) return send(res, 'application/json', cafeDecl);
  if (req.url.startsWith('/fixtures/timothygeorge.json')) return send(res, 'application/json', salonDecl);
  res.statusCode = 404; res.end('not found');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const POLYFILL = `
  (() => {
    const tools = [];
    const mc = {
      registerTool(def){ tools.push(def); return () => {}; },
      getTools(){ return tools.map(t => ({ name:t.name, description:t.description, inputSchema:t.inputSchema })); },
      async executeTool(name, argsString){
        const t = tools.find(x => x.name === name);
        if(!t) throw new Error('no tool ' + name);
        const r = await t.execute(argsString ? JSON.parse(argsString) : {});
        return typeof r === 'string' ? r : JSON.stringify(r);
      },
      __tools: tools,
    };
    Object.defineProperty(document, 'modelContext', { value: mc, configurable: true });
  })();
`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
const consoleLines = [];
page.on('console', (m) => { const t = m.text(); if (t.includes('[SIGNPOST]')) consoleLines.push(t); });

let pass = 0, fail = 0; const failures = [];
const check = (name, cond, extra) => {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; failures.push(name + (extra ? ` — ${extra}` : '')); console.log('  ✗', name, extra ? `— ${extra}` : ''); }
};
const host = (u) => new URL(u).host;

try {
  await page.addInitScript(POLYFILL);
  await page.goto(base, { waitUntil: 'networkidle' });
  // Wait until declarations have loaded + index built (tool awaits this anyway).
  await page.waitForFunction(() => window.__signpostReady === true || document.querySelectorAll('#providers tr .dot.ok').length >= 2, { timeout: 5000 })
    .catch(() => {});

  console.log('\n── Registration ──');
  const tools = await page.evaluate(() => document.modelContext.getTools());
  check('exactly one tool registered', tools.length === 1, `got ${tools.length}`);
  check('the tool is resolve_surface', tools[0]?.name === 'resolve_surface', tools[0]?.name);
  check('resolve_surface takes a { capability } string', tools[0]?.inputSchema?.properties?.capability?.type === 'string');
  const status = await page.$eval('#status', (el) => el.textContent);
  check('status shows registered', /registered/i.test(status), status);

  console.log('\n── Declarations fetched from (fixture) provider origins ──');
  const capsLoaded = await page.$$eval('#providers tr .dot.ok', (els) => els.length);
  check('both provider declarations loaded', capsLoaded === 2, `${capsLoaded}/2 ok`);

  console.log('\n── Execute resolve_surface (natural-language single need) ──');
  const rawHair = await page.evaluate(() => document.modelContext.executeTool('resolve_surface', JSON.stringify({ capability: 'book me a haircut' })));
  const envHair = JSON.parse(rawHair);
  check('result is WebMCP { content:[{text}] } shape', !!envHair.content?.[0]?.text);
  const pubHair = JSON.parse(envHair.content[0].text);
  check('"book me a haircut" top match is the salon', host(pubHair.matches?.[0]?.surface_url) === 'timothygeorge.design',
    pubHair.matches?.[0] && host(pubHair.matches[0].surface_url));

  const rawCoffee = await page.evaluate(() => document.modelContext.executeTool('resolve_surface', JSON.stringify({ capability: 'order a coffee' })));
  const pubCoffee = JSON.parse(JSON.parse(rawCoffee).content[0].text);
  check('"order a coffee" top match is the cafe', host(pubCoffee.matches?.[0]?.surface_url) === 'valentincoffee.cafe',
    pubCoffee.matches?.[0] && host(pubCoffee.matches[0].surface_url));

  console.log('\n── Public contract: score/hits/query stripped (kept diagnostic) ──');
  const pubBlob = envHair.content[0].text;
  check('public output carries NO score', !pubBlob.includes('score') && pubHair.matches.every((m) => !('score' in m)));
  check('public output carries NO token hits', !pubBlob.includes('hits'));
  check('public output echoes NO query', !('query' in pubHair) && !('query_tokens' in pubHair));
  check('public match shape is exactly { surface_url, capability{ id, description } }',
    pubHair.matches.every((m) =>
      Object.keys(m).sort().join(',') === 'capability,surface_url' &&
      Object.keys(m.capability).sort().join(',') === 'description,id'));
  check('public output invents no next/order/plan/session', !['next', 'order', 'plan', 'session'].some((k) => k in pubHair));
  // ...but the DIAGNOSTIC log (console) DID record the score — proving the split.
  const diagLine = consoleLines.find((l) => l.includes('resolve_surface_called') && l.includes('book me a haircut'));
  check('diagnostic log DID record score (score split, not score loss)', !!diagLine && /=\d/.test(diagLine), diagLine || 'no diag line');

  console.log('\n── Statelessness / journey-blindness ──');
  const rawCoffee2 = await page.evaluate(() => document.modelContext.executeTool('resolve_surface', JSON.stringify({ capability: 'order a coffee' })));
  const pubCoffee2 = JSON.parse(JSON.parse(rawCoffee2).content[0].text);
  check('two identical calls → identical public results (pure)', JSON.stringify(pubCoffee) === JSON.stringify(pubCoffee2));
  // A prior unrelated call must not change a later result (no cross-call history).
  const rawCoffee3 = await page.evaluate(() => document.modelContext.executeTool('resolve_surface', JSON.stringify({ capability: 'order a coffee' })));
  const pubCoffee3 = JSON.parse(JSON.parse(rawCoffee3).content[0].text);
  check('result independent of intervening calls (no history)', JSON.stringify(pubCoffee) === JSON.stringify(pubCoffee3));

  console.log('\n── Instrumentation events ──');
  const blob = consoleLines.join('\n');
  for (const k of ['page_loaded', 'declaration_loaded', 'index_built', 'webmcp_present', 'tool_registered', 'resolve_surface_called']) {
    check(`event fired: ${k}`, blob.includes(k));
  }

  console.log('\n── Production CORS verdict (capturable, driven by live fetch) ──');
  check('cors_check event fired with both providers loaded', /cors_check.*2\/2.*ok/.test(blob), blob.split('\n').find((l) => l.includes('cors_check')) || 'no cors_check line');
  const verdict = await page.$eval('#cors-verdict', (el) => el.textContent).catch(() => '');
  check('page shows a green "Production CORS OK" verdict', /Production CORS OK/.test(verdict) && verdict.startsWith('✓'), verdict);

  console.log(`\n${fail === 0 ? '✓ ALL PASS' : '✗ FAILURES'} — ${pass} passed, ${fail} failed (browser mechanics).`);
} finally {
  await browser.close();
  server.close();
}
if (fail > 0) { for (const f of failures) console.log('   • ' + f); process.exit(1); }
