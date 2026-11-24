// A small HTTP server that puts the desk engine and the connectors behind real webhook endpoints.
//
//   POST /api/run           { module, text, from, country, channel }  -> the desk engine's decision
//   POST /webhooks/ghl      GoHighLevel inbound message               -> tags and a note for the contact
//   POST /webhooks/fathom   Fathom "meeting ended"                    -> call intelligence + Monday item
//   GET  /api/metrics       response times, backup rate, review rate, cost (from this server's run log)
//
// Every POST needs the shared secret in the x-webhook-secret header (compared in constant time), bodies are
// limited to 1 MB, repeats are skipped, and every run is added to the log that monitoring reads.
// Run: WEBHOOK_SECRET=... node src/server.js   (plus the keys in .env.example)

import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { run } from "./desk-engine/engine.js";
import { handleInbound } from "./integrations/gohighlevel.js";
import { handleMeetingEnded } from "./integrations/fathom.js";
import { summarise, alerts } from "./monitoring/metrics.js";

const MAX_BODY = 1_000_000;

export function secretOk(given, expected) {
  if (!expected || !given) return false;
  const a = Buffer.from(String(given)), b = Buffer.from(String(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

// The routing, kept separate from the network so it can be tested directly.
export function createApp({ secret = process.env.WEBHOOK_SECRET, engine = run } = {}) {
  const log = [], seenGhl = new Set(), seenFathom = new Set();
  const runEngine = async (module, input) => {
    const r = await engine(module, input);
    log.push({ module, ms: r.ms, backup: r.backup, status: r.status, costUsd: r.costUsd || 0, at: new Date().toISOString() });
    return r;
  };
  return {
    log,
    async handle({ method, path, headers = {}, body }) {
      if (method === "GET" && path === "/api/metrics") { const s = summarise(log); return { status: 200, json: { ...s, alerts: alerts(s) } }; }
      if (method !== "POST") return { status: 405, json: { error: "POST only" } };
      if (!secretOk(headers["x-webhook-secret"], secret)) return { status: 403, json: { error: "Wrong or missing secret" } };
      try {
        if (path === "/api/run") {
          if (!body?.text || String(body.text).length > 6000) return { status: 400, json: { error: "Text missing or longer than 6,000 characters" } };
          return { status: 200, json: await runEngine(body.module || "support", body) };
        }
        if (path === "/webhooks/ghl") return { status: 200, json: await handleInbound(body || {}, { runEngine, seen: seenGhl }) };
        if (path === "/webhooks/fathom") return { status: 200, json: await handleMeetingEnded(body || {}, { runEngine, seen: seenFathom }) };
        return { status: 404, json: { error: "Not found" } };
      } catch (e) {
        return { status: 502, json: { error: e.message } };   // e.g. both AI providers failed: nothing is guessed
      }
    },
  };
}

export function startServer(port = process.env.PORT || 3000, app = createApp()) {
  const server = http.createServer((req, res) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > MAX_BODY) { res.writeHead(413).end(); req.destroy(); } else chunks.push(c); });
    req.on("end", async () => {
      let body = null;
      try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null; } catch { res.writeHead(400, { "Content-Type": "application/json" }).end('{"error":"Body is not JSON"}'); return; }
      const out = await app.handle({ method: req.method, path: req.url.split("?")[0], headers: req.headers, body });
      res.writeHead(out.status, { "Content-Type": "application/json" }).end(JSON.stringify(out.json));
    });
  });
  return server.listen(port);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("server.js")) startServer();
