// Desk engine: the shared core behind the Buyer Desk, Ticket Desk, Support Desk, Ad Desk and
// AI Telecaller summaries. (The `qualify` module powers the live Lead Gen demo; the production Lead Gen
// pipeline checks businesses with Claude Haiku in overnight batches, see docs/01-lead-gen.md.)
//
// One request in, one structured decision out:
//   1. Grok (xAI) reads the message first. Fast and cheap, with a hard 40 s timer.
//   2. If Grok times out, errors or returns something unusable, Claude takes over automatically.
//   3. Both models must answer in a fixed JSON shape (structured outputs), so code can trust the fields.
//   4. Fixed rules in plain code run AFTER the AI. The AI cannot override them.
//   5. The result becomes a row on the team's Monday.com board, and the drafted reply waits for a person.
//
// The AI instructions (prompts) for each module are kept private and loaded at runtime.
// The rest is the production logic, tidied for reading and split into testable functions.
// (In production the Monday retries live in the n8n workflow; here they are in code so they can be tested.)

import { loadPrivateInstructions, instructionsVersion } from "./private-instructions.js";

const S = (props) => ({ type: "object", additionalProperties: false, required: Object.keys(props), properties: props });
const str = { type: "string" }, int = { type: "integer" }, num = { type: "number" }, bool = { type: "boolean" };
const URGENCY = { type: "string", enum: ["urgent", "high", "normal", "low"] };

// Each module = its instructions (private) + the exact JSON shape the AI must return + a Monday row title.
export const MODULES = {
  buyer: {
    label: "Buyer Desk",
    schema: S({ language: str, message_english: str, brand: str, buyer_type: str, wants: str, urgency: URGENCY, hot_score: int, owner: str, summary: str, suggested_reply: str, suggested_reply_english: str, next_step: str, confidence: num }),
    rowTitle: (t) => `Buyer · ${t.urgency} · hot ${t.hot_score}/10 · ${t.brand}`,
  },
  support: {
    label: "Support Desk",
    schema: S({ language: str, message_english: str, category: str, urgency: URGENCY, team: str, sentiment: str, churn_risk: int, credit_review: bool, summary: str, suggested_reply: str, next_step: str, confidence: num }),
    rowTitle: (t) => `Support · ${t.urgency} · ${t.category}`,
  },
  adlead: {
    label: "Ad Desk",
    schema: S({ language: str, message_english: str, intent: str, lead_quality: { type: "string", enum: ["hot", "warm", "cold", "junk"] }, urgency: URGENCY, hot_score: int, city_or_region: str, summary: str, suggested_reply: str, next_step: str, confidence: num }),
    rowTitle: (t) => `Ad lead · ${t.lead_quality} · hot ${t.hot_score}/10`,
  },
  call: {
    label: "AI Telecaller",
    schema: S({ language: str, outcome: str, urgency: URGENCY, hot_score: int, wants: str, objections: str, summary: str, follow_up_task: str, follow_up_when: str, suggested_reply: str, confidence: num }),
    rowTitle: (t) => `Call · ${t.outcome} · hot ${t.hot_score}/10`,
  },
  // Customer-success call intelligence: a recorded client call (e.g. from Fathom) becomes a summary, action items
  // with owners, sentiment, upsell signals and a churn risk, organised on Monday.com.
  callintel: {
    label: "Call intelligence",
    schema: S({
      summary: str,
      action_items: { type: "array", items: S({ task: str, owner: str, due: str }) },
      sentiment: { type: "string", enum: ["positive", "neutral", "mixed", "negative"] },
      upsell_signals: { type: "array", items: str },
      churn_risk: int, urgency: URGENCY, next_step: str, confidence: num,
    }),
    rowTitle: (t) => `Client call · ${t.sentiment} · ${t.action_items.length} actions${t.upsell_signals.length ? " · upsell" : ""}`,
  },
  qualify: {
    label: "Lead Gen",
    schema: S({ fit: { type: "string", enum: ["strong", "possible", "weak", "not_a_fit"] }, buyer_type: str, reasons: str, best_brand: str, channel: str, urgency: URGENCY, hot_score: int, summary: str, suggested_reply: str, next_step: str, confidence: num }),
    rowTitle: (t) => `Prospect · ${t.fit} · ${t.buyer_type}`,
  },
};

// Reply deadlines are set by code from the urgency, never by the AI.
// Support is faster than sales because an unhappy customer is waiting right now.
export const DEADLINE_HOURS = {
  sales: { urgent: 2, high: 24, normal: 72, low: 168 },
  support: { urgent: 1, high: 4, normal: 24, low: 72 },
};
export const deadlineHours = (module, urgency) =>
  (module === "support" ? DEADLINE_HOURS.support : DEADLINE_HOURS.sales)[urgency] ?? 24;

export const TIMEOUTS = { grokMs: 40_000, claudeMs: 45_000 };
export const CONFIDENCE_FLOOR = 0.7;   // below this, a person must check before anything happens

export function withTimeout(promise, ms, label) {
  let timer;
  const limit = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000} s`)), ms); });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}
const need = (key, name) => { if (!key) throw new Error(`${name} is not configured`); return key; };

// Published prices, US$ per million tokens [input, output]. Used to put a cost on every run.
export const PRICES = { "Grok 4.7": [2, 6], "Claude Opus 5.5": [4, 20] };
export const costUsd = (ai, inTok = 0, outTok = 0) => {
  const p = PRICES[ai]; return p ? +((inTok * p[0] + outTok * p[1]) / 1e6).toFixed(6) : null;
};

// Both models are asked for a strict JSON shape, but the answer is still checked here: a missing field, a value
// outside an allowed list or a wrong type counts as a failed answer, so the backup AI takes over.
export function checkShape(value, schema, path = "answer") {
  const t = schema.type;
  if (t === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} is not an object`);
    for (const k of schema.required || []) if (!(k in value)) throw new Error(`${path}.${k} is missing`);
    for (const [k, sub] of Object.entries(schema.properties || {})) if (k in value) checkShape(value[k], sub, `${path}.${k}`);
  } else if (t === "array") {
    if (!Array.isArray(value)) throw new Error(`${path} is not a list`);
    value.forEach((v, i) => checkShape(v, schema.items, `${path}[${i}]`));
  } else if (t === "string") {
    if (typeof value !== "string") throw new Error(`${path} is not text`);
    if (schema.enum && !schema.enum.includes(value)) throw new Error(`${path} "${value}" is not an allowed value`);
  } else if (t === "integer") {
    if (!Number.isInteger(value)) throw new Error(`${path} is not a whole number`);
  } else if (t === "number") {
    if (typeof value !== "number" || Number.isNaN(value)) throw new Error(`${path} is not a number`);
  } else if (t === "boolean") {
    if (typeof value !== "boolean") throw new Error(`${path} is not true/false`);
  }
  return value;
}
const parseChecked = (text, module) => {
  let out;
  try { out = JSON.parse(text); } catch { throw new Error("Answer is not readable JSON"); }
  return checkShape(out, MODULES[module].schema);
};

// ---- AI providers -------------------------------------------------------------------------

export async function askGrok(module, userText, { fetchImpl = fetch, apiKey = process.env.XAI_API_KEY } = {}) {
  const instructions = await loadPrivateInstructions(module);
  const res = await withTimeout(fetchImpl("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${need(apiKey, "XAI_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "grok-4.7", temperature: 0,
      messages: [{ role: "system", content: instructions }, { role: "user", content: userText }],
      response_format: { type: "json_schema", json_schema: { name: "result", strict: true, schema: MODULES[module].schema } },
    }),
  }), TIMEOUTS.grokMs, "Grok");
  if (!res.ok) throw new Error(`Grok HTTP ${res.status}`);
  const j = await res.json();
  return { out: parseChecked(j.choices[0].message.content, module), inTok: j.usage?.prompt_tokens || 0, outTok: j.usage?.completion_tokens || 0 };
}

export async function askClaude(module, userText, { fetchImpl = fetch, apiKey = process.env.ANTHROPIC_API_KEY } = {}) {
  const instructions = await loadPrivateInstructions(module);
  const res = await withTimeout(fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": need(apiKey, "ANTHROPIC_API_KEY"), "anthropic-version": "2026-10-21", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-opus-5-5", max_tokens: 4000, system: instructions,
      messages: [{ role: "user", content: userText }],
      output_config: { effort: "low", format: { type: "json_schema", schema: MODULES[module].schema } },
    }),
  }), TIMEOUTS.claudeMs, "Claude");
  if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
  const j = await res.json();
  if (j.stop_reason === "refusal") throw new Error("Claude declined");
  const text = j.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return { out: parseChecked(text, module), inTok: j.usage?.input_tokens || 0, outTok: j.usage?.output_tokens || 0 };
}

// Grok first; on ANY failure (timeout, HTTP error, unreadable answer, answer not in the fixed shape) Claude answers instead.
// The caller is told which AI answered, so backup answers are always flagged for a person.
export async function decide(module, userText, deps = {}) {
  const steps = [];
  const t0 = Date.now();
  try {
    if (deps.simulateGrokDown) throw new Error("Grok unavailable (outage test)");
    const r = await (deps.grok || askGrok)(module, userText, deps);
    steps.push({ step: "Grok reads it", ok: true, ms: Date.now() - t0 });
    return { ...r, ai: "Grok 4.7", backup: false, steps };
  } catch (e) {
    steps.push({ step: "Grok reads it", ok: false, ms: Date.now() - t0, note: e.message });
    const t1 = Date.now();
    const r = await (deps.claude || askClaude)(module, userText, deps);   // if this also fails, the caller returns 502
    steps.push({ step: "Backup: Claude takes over", ok: true, ms: Date.now() - t1 });
    return { ...r, ai: "Claude Opus 5.5", backup: true, steps };
  }
}

// ---- Fixed safety rules: plain code, run after the AI, cannot be talked out of ---------------

// Opt-out and cancel phrases. They are checked on the original message AND on the AI's English translation,
// so a request in Arabic or any other language is caught too.
export const OPT_OUT = /^\s*(stop|stopall|unsubscribe|end|quit)\s*[.!]*\s*$|\b(stop (calling|texting|messaging|emailing|contacting|sending)|don'?t (call|contact|message|text|email)|do not (call|contact|message|text|email)|remove (me|my number|my email)|take my number|opt[- ]?out|unsubscribe|leave me alone)\b/;
// Only a customer leaving counts, not "cancel the meeting" or "cancellation policy".
export const CANCEL = /\b((i|we)('ll| will| want to| are going to| am going to| going to) cancel|cancel (my|our|the) (order|contract|account|subscription|service)|cancell?ing (my|our) (order|contract|account|subscription|service)|terminate (my|our|the) (contract|account|service)|end (the|our) contract|moving to another (supplier|agency|provider))\b/;

export function applyRules(originalText, t) {
  const fixes = [], flags = [];
  // Phones type curly apostrophes (don’t, I’ll): make them plain so the rules match either way.
  const plain = (s) => String(s || "").replace(/[\u2018\u2019\u02bc]/g, "'").toLowerCase();
  const x = `${plain(originalText)}\n${plain(t.message_english)}`;
  const firstLine = plain(originalText).trim();

  // "Stop contacting me" is always urgent: it is a legal and reputation risk, whatever the AI thought.
  if ((OPT_OUT.test(x) || OPT_OUT.test(firstLine)) && t.urgency !== "urgent") {
    t.urgency = "urgent"; fixes.push("“Stop contacting me”: marked urgent");
  }
  // A customer who says they will cancel is at least 7/10 risk of leaving.
  if ("churn_risk" in t && CANCEL.test(x) && t.churn_risk < 7) {
    t.churn_risk = 7; fixes.push("Wants to leave: risk raised to 7 of 10");
  }
  for (const k of ["hot_score", "churn_risk"]) if (k in t) t[k] = Math.max(0, Math.min(10, t[k] | 0));

  // Checks on the drafted reply. These never auto-correct: they flag it for the person approving.
  const reply = String(t.suggested_reply || "");
  if (/\b(we will|we'll|i will|i'll)\s+(refund|credit|reimburse)|\bfull refund\b/i.test(reply)) flags.push("Reply promises money");
  if (/\b(cheapest|best quality|leading)\b/i.test(reply)) flags.push("Banned claim in reply");
  if (/\b[A-Z]{6,}\b/.test(reply)) flags.push("ALL CAPS in reply");
  if (typeof t.confidence === "number" && t.confidence < CONFIDENCE_FLOOR) flags.push("Low confidence: a person decides");
  return { fixes, flags };
}

// ---- Monday.com: every decision becomes a row the team works from --------------------------

// The item title carries the module, urgency and score (e.g. "Support · urgent · cancellation_risk"); the full
// message, English translation, drafted reply and next step go inside the item as an update. If the board's
// column IDs are given (MONDAY_COLUMNS, e.g. {"urgency":"status","owner":"text","deadline":"date4"}), the urgency,
// owner or team, and the reply-by date are also filled as real columns the team can sort and filter by.
export async function addMondayRow(title, html, { fetchImpl = fetch, token = process.env.MONDAY_API_TOKEN, boardId = process.env.MONDAY_BOARD_ID, columnValues = null, tries = 3, retryDelayMs = 2000 } = {}) {
  if (!token || !boardId) return null;
  // API-Version 2025-04 is the version the live SJF boards were written with on 23 Nov 2026.
  const q = async (query, variables) => {
    const r = await fetchImpl("https://api.monday.com/v2", { method: "POST", headers: { Authorization: token, "Content-Type": "application/json", "API-Version": "2025-04" }, body: JSON.stringify({ query, variables }) });
    const j = await r.json(); if (j.errors) throw new Error("Monday error"); return j.data;
  };
  // Each step is retried on its own (3 tries, 2 s apart), so a failed second step never creates a duplicate row.
  const retry = async (fn) => {
    for (let i = 1; ; i++) {
      try { return await fn(); } catch (e) { if (i >= tries) throw e; await new Promise((r) => setTimeout(r, retryDelayMs)); }
    }
  };
  const d = await retry(() => q(`mutation ($b: ID!, $n: String!, $c: JSON) { create_item(board_id: $b, item_name: $n, column_values: $c) { id } }`, { b: boardId, n: title.slice(0, 200), c: columnValues ? JSON.stringify(columnValues) : null }));
  const id = d.create_item.id;
  await retry(() => q(`mutation ($i: ID!, $body: String!) { create_update(item_id: $i, body: $body) { id } }`, { i: id, body: html }));
  return id;
}

// ---- The full run ----------------------------------------------------------------------------

export function mondayColumns(t, hours, map, now = new Date()) {
  if (!map) return null;
  const cols = {};
  if (map.urgency) cols[map.urgency] = { label: t.urgency };
  if (map.owner && (t.owner || t.team)) cols[map.owner] = t.owner || t.team;
  if (map.deadline) cols[map.deadline] = { date: new Date(now.getTime() + hours * 3600e3).toISOString().slice(0, 10) };
  return Object.keys(cols).length ? cols : null;
}

// Contact details are not needed to understand a message, so they are masked before any text is sent to an AI
// provider. The original stays in our own systems (the rules and the Monday item use it).
export const redactForAI = (s) => String(s || "")
  .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
  .replace(/\+?\d[\d ()-]{7,}\d/g, (m) => (m.replace(/\D/g, "").length >= 9 ? "[phone]" : m));   // 9+ digits: a phone, not a date or order number

export async function run(module, { text, from, country, channel = "web" }, deps = {}) {
  if (!MODULES[module]) throw new Error("Unknown module");
  const started = Date.now();
  const userText = `From: ${redactForAI(from) || "Unknown"}${country ? ", " + country : ""}\nChannel: ${channel}\n\n${redactForAI(text)}`;
  const d = await decide(module, userText, deps);
  const t = d.out;
  const { fixes, flags } = applyRules(text, t);
  if (d.backup) flags.push("Answered by backup AI");
  const steps = [...d.steps, { step: "Safety rules", ok: true, note: fixes.length ? fixes.join("; ") : "All passed" }];
  const hours = deadlineHours(module, t.urgency);

  // Monday: a failure here is recorded but never loses the decision, which is still returned to the caller.
  let mondayItem = null;
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  try {
    mondayItem = await (deps.addMondayRow || addMondayRow)(`${MODULES[module].rowTitle(t)} · ${from || channel}`,
      `<p><b>Message (${esc(channel)})</b><br>${esc(text)}</p>` +
      (t.message_english ? `<p><b>In English</b><br>${esc(t.message_english)}</p>` : "") +
      `<p><b>Summary</b><br>${esc(t.summary)}</p>` +
      (Array.isArray(t.action_items) && t.action_items.length ? `<p><b>Action items</b><br>${t.action_items.map((a) => `• ${esc(a.task)} (${esc(a.owner)}, ${esc(a.due)})`).join("<br>")}</p>` : "") +
      (Array.isArray(t.upsell_signals) && t.upsell_signals.length ? `<p><b>Upsell signals</b><br>${t.upsell_signals.map(esc).join("<br>")}</p>` : "") +
      (t.suggested_reply ? `<p><b>Draft reply, waiting for approval</b><br>${esc(t.suggested_reply)}</p>` : "") +
      `<p><b>Next</b><br>${esc(t.next_step || t.follow_up_task || "")} (reply within ${hours} h)</p><p>Processed by ${d.ai}${d.backup ? " (backup)" : ""}</p>`,
      { ...deps, columnValues: mondayColumns(t, hours, deps.mondayColumns || (process.env.MONDAY_COLUMNS ? JSON.parse(process.env.MONDAY_COLUMNS) : null)) });
    steps.push({ step: "Monday board", ok: true, note: mondayItem ? `Item ${mondayItem}` : "Not configured" });
  } catch (e) { steps.push({ step: "Monday board", ok: false, note: e.message }); }

  return {
    module, ai: d.ai, backup: d.backup, result: t, fixes, flags,
    status: flags.length ? "Needs review" : "Ready for approval",   // a person always approves before sending
    replyWithinHours: hours, mondayItem, steps,
    ms: Date.now() - started,                                    // for monitoring/metrics.js
    instructionsVersion: instructionsVersion(module),
    tokens: (d.inTok || 0) + (d.outTok || 0),
    costUsd: costUsd(d.ai, d.inTok, d.outTok),
  };
}
