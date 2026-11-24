// SJF live rates: one small Vercel function, no paid services, no keys.
// Tries each free source in order and uses the first one that answers WITH A BELIEVABLE NUMBER.
//
// SAFETY (added 17 Nov 2026 after the price audit): a source that answers with nonsense
// (0, text, a 10x spike, a 90% drop, a rupee rate of 1 or 1000) must never reach a customer.
// Every number is checked two ways:
//   1. against fixed outer limits (SANE below), and
//   2. against the rates saved at the last build (rates_ref.json, written by build.py) -
//      a wide +-40% band for metals and +-15% for the rupee, so a stale reference never
//      blocks a genuine slow move, but a spike or crash is thrown away.
// If two sources both answer and disagree by more than 5%, the one closer to the saved rate wins.
// If nothing believable is found the function answers 502 and the page keeps using the saved
// rates file and says "(saved rates)" next to the date.
const OZ = { gold: "XAU", silver: "XAG", platinum: "XPT" };
const YAHOO = { gold: "GC=F", silver: "SI=F", platinum: "PL=F" };

// Outer limits (US$ per troy ounce; rupees per US$). Widen only if the market truly leaves them.
const SANE = { gold: [1000, 12000], silver: [10, 300], platinum: [400, 6000], usd_inr: [60, 130], gbp_inr: [80, 170] };
const BAND = { gold: 0.4, silver: 0.4, platinum: 0.4, usd_inr: 0.15, gbp_inr: 0.15 };
let REF = {};
try { REF = require("./rates_ref.json"); } catch { /* no reference: outer limits only */ }

async function getJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (SJF rates)" }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
const num = (v) => (typeof v === "number" && isFinite(v) && v > 0 ? v : null);

// true only when v is a believable value for `key`
function believable(key, v, ref = REF) {
  if (num(v) === null) return false;
  const [lo, hi] = SANE[key];
  if (v < lo || v > hi) return false;
  const r = ref && ref[key];
  if (num(r) !== null && Math.abs(v - r) / r > BAND[key]) return false;
  return true;
}

// Ask every source, keep the believable answers, pick one.
async function pick(key, tries, ref = REF) {
  const got = [];
  for (const [src, fn] of tries) {
    try { const v = await fn(); if (believable(key, v, ref)) got.push({ v, src }); } catch { /* try next */ }
    if (got.length === 2) break; // two opinions are enough
  }
  if (!got.length) return null;
  if (got.length === 2 && Math.abs(got[0].v - got[1].v) / got[1].v > 0.05) {
    const r = ref && ref[key];
    if (num(r) !== null) return Math.abs(got[0].v - r) <= Math.abs(got[1].v - r) ? got[0] : got[1];
    return null; // sources disagree and nothing to judge by: say nothing rather than guess
  }
  return got[0];
}

const metal = (name, ref) => pick(name, [
  ["gold-api.com", async () => (await getJson("https://api.gold-api.com/price/" + OZ[name])).price],
  ["yahoo", async () => (await getJson("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(YAHOO[name]))).chart.result[0].meta.regularMarketPrice],
], ref);
const fx = (ref) => pick("usd_inr", [
  ["open.er-api.com", async () => (await getJson("https://open.er-api.com/v6/latest/USD")).rates.INR],
  ["frankfurter.dev", async () => (await getJson("https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR")).rates.INR],
], ref);
// Pounds: rupees per 1 GBP (open.er-api gives INR and GBP per US$, so GBP in rupees = INR / GBP)
const fxGbp = (ref) => pick("gbp_inr", [
  ["open.er-api.com", async () => { const r = (await getJson("https://open.er-api.com/v6/latest/USD")).rates; return r.INR / r.GBP; }],
  ["frankfurter.dev", async () => (await getJson("https://api.frankfurter.dev/v1/latest?base=GBP&symbols=INR")).rates.INR],
], ref);

async function handler(req, res) {
  const [g, s, p, f, b] = await Promise.all([metal("gold"), metal("silver"), metal("platinum"), fx(), fxGbp()]);
  // Platinum is no longer used for prices and the pound is optional (the page then uses the saved pound rate),
  // so only gold, silver and the rupee must be believable.
  if (!g || !s || !f) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "rates unavailable" });
    return;
  }
  // Cached at Vercel's edge for 6 hours, then served stale while refreshing (up to 12 more hours).
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=43200");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    gold: g.v, silver: s.v, platinum: p ? p.v : null, usd_inr: f.v, gbp_inr: b ? b.v : null,
    asOf: new Date().toISOString(),
    sources: { gold: g.src, silver: s.src, platinum: p ? p.src : null, fx: f.src, gbp: b ? b.src : null },
  });
}
module.exports = handler;
module.exports._test = { believable, pick }; // used only by the local failure tests
