import { test } from "node:test";
import assert from "node:assert/strict";
import { applyRules, deadlineHours, decide, run } from "../src/desk-engine/engine.js";

test("'Stop contacting me' is always urgent, whatever the AI said", () => {
  const t = { urgency: "low", suggested_reply: "Noted.", confidence: 0.9 };
  const { fixes } = applyRules("Please stop messaging me and remove my number", t);
  assert.equal(t.urgency, "urgent");
  assert.equal(fixes.length, 1);
});

test("'cancel the meeting' is not a customer leaving", () => {
  const t = { urgency: "normal", churn_risk: 2, suggested_reply: "", confidence: 0.9 };
  applyRules("Can we cancel the meeting on Friday and move it to Monday?", t);
  assert.equal(t.churn_risk, 2);
});

test("a customer who says they will cancel is at least 7/10 risk", () => {
  const t = { urgency: "normal", churn_risk: 3, suggested_reply: "", confidence: 0.9 };
  applyRules("If this is late again we will cancel the contract", t);
  assert.equal(t.churn_risk, 7);
});

test("replies that promise money, use banned claims or ALL CAPS are flagged for a person", () => {
  const t = { urgency: "normal", suggested_reply: "We will refund you today, we are the CHEAPEST and best quality", confidence: 0.95 };
  const { flags } = applyRules("where is my order", t);
  assert.ok(flags.includes("Reply promises money"));
  assert.ok(flags.includes("Banned claim in reply"));
  assert.ok(flags.includes("ALL CAPS in reply"));
});

test("low confidence goes to a person", () => {
  const { flags } = applyRules("hello", { urgency: "normal", suggested_reply: "Hi", confidence: 0.55 });
  assert.ok(flags.some((f) => f.startsWith("Low confidence")));
});

test("reply deadlines come from code: support is faster than sales", () => {
  assert.equal(deadlineHours("support", "urgent"), 1);
  assert.equal(deadlineHours("buyer", "urgent"), 2);
  assert.equal(deadlineHours("support", "low"), 72);
  assert.equal(deadlineHours("buyer", "low"), 168);
});

test("if Grok fails, Claude takes over automatically and the answer is marked as backup", async () => {
  const grok = async () => { throw new Error("Grok HTTP 503"); };
  const claude = async () => ({ out: { urgency: "high" }, tokens: 10 });
  const d = await decide("support", "text", { grok, claude });
  assert.equal(d.ai, "Claude Opus 5.5");
  assert.equal(d.backup, true);
  assert.equal(d.steps[0].ok, false);
});

test("a full run: rules applied, backup flagged, nothing sent without approval", async () => {
  const grok = async () => { throw new Error("timed out"); };
  const claude = async () => ({ out: { urgency: "normal", churn_risk: 2, category: "cancellation_risk", suggested_reply: "Sorry for the delay, a manager will call you today.", confidence: 0.9 }, tokens: 50 });
  const r = await run("support", { text: "Stop calling me, I am going to cancel." }, { grok, claude });
  assert.equal(r.result.urgency, "urgent");
  assert.equal(r.result.churn_risk, 7);
  assert.equal(r.replyWithinHours, 1);
  assert.equal(r.status, "Needs review");
  assert.ok(r.flags.includes("Answered by backup AI"));
});

test("opt-out requests are caught in other languages through the English translation", () => {
  const t = { urgency: "normal", message_english: "Please stop contacting me on this number.", suggested_reply: "", confidence: 0.9 };
  applyRules("الرجاء التوقف عن التواصل معي على هذا الرقم", t);
  assert.equal(t.urgency, "urgent");
});

test("the Monday row is created with the module, urgency and the full message inside", async () => {
  let got = null;
  const addMondayRow = async (title, html) => { got = { title, html }; return "123"; };
  const grok = async () => ({ out: { urgency: "high", category: "invoice_dispute", churn_risk: 4, message_english: "", suggested_reply: "We are checking the invoice now.", summary: "Charged twice", next_step: "Billing checks", confidence: 0.92 }, tokens: 9 });
  const r = await run("support", { text: "You charged me twice", from: "Test" }, { grok, addMondayRow });
  assert.equal(r.mondayItem, "123");
  assert.match(got.title, /^Support · high · invoice_dispute/);
  assert.match(got.html, /Draft reply, waiting for approval/);
  assert.match(got.html, /reply within 4 h/);
});

test("Monday retries each step on its own, so a failed update never creates a second row", async () => {
  let creates = 0, updates = 0;
  const fetchImpl = async (_url, opts) => {
    const q = JSON.parse(opts.body).query;
    if (q.includes("create_item")) { creates++; return { json: async () => ({ data: { create_item: { id: "9" } } }) }; }
    updates++;
    if (updates === 1) return { json: async () => ({ errors: [{ message: "busy" }] }) };
    return { json: async () => ({ data: { create_update: { id: "1" } } }) };
  };
  const { addMondayRow } = await import("../src/desk-engine/engine.js");
  const id = await addMondayRow("t", "<p>x</p>", { fetchImpl, token: "x", boardId: "1", retryDelayMs: 1 });
  assert.equal(id, "9");
  assert.equal(creates, 1);
  assert.equal(updates, 2);
});

test("a slow AI is cut off by the timer", async () => {
  const { withTimeout } = await import("../src/desk-engine/engine.js");
  await assert.rejects(withTimeout(new Promise((r) => setTimeout(r, 200)), 20, "Grok"), /timed out/);
});

test("phone-style opt-outs are caught: curly apostrophes and a plain STOP", () => {
  for (const msg of ["Please don’t contact me again", "STOP", "stop.", "Unsubscribe"]) {
    const t = { urgency: "low", suggested_reply: "", confidence: 0.9 };
    applyRules(msg, t);
    assert.equal(t.urgency, "urgent", msg);
  }
  const t = { urgency: "normal", churn_risk: 1, suggested_reply: "", confidence: 0.9 };
  applyRules("I’ll cancel my contract if this happens again", t);
  assert.equal(t.churn_risk, 7);
});

test("an answer in the wrong shape counts as a failure, so Claude takes over", async () => {
  process.env.INSTRUCTIONS_SUPPORT = "test instructions";
  const { askGrok, decide } = await import("../src/desk-engine/engine.js");
  const badShape = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ urgency: "panic" }) } }], usage: {} }) });
  await assert.rejects(askGrok("support", "x", { fetchImpl: badShape, apiKey: "k" }), /missing|not an allowed value/);
  const claude = async () => ({ out: { urgency: "high" }, inTok: 1000, outTok: 200 });
  const d = await decide("support", "x", { grok: (m, u) => askGrok(m, u, { fetchImpl: badShape, apiKey: "k" }), claude });
  assert.equal(d.backup, true);
});

test("every run reports its time and cost for monitoring", async () => {
  const grok = async () => ({ out: { urgency: "normal", category: "delivery", churn_risk: 2, suggested_reply: "We are checking.", summary: "s", next_step: "n", confidence: 0.9 }, inTok: 1_000_000, outTok: 100_000 });
  const r = await run("support", { text: "Where is my parcel?" }, { grok });
  assert.equal(r.costUsd, 2.6);            // Grok 4.7: $2 per million in + $6 per million out
  assert.equal(typeof r.ms, "number");
});

test("Monday columns: urgency, owner or team, and the reply-by date", async () => {
  const { mondayColumns } = await import("../src/desk-engine/engine.js");
  const cols = mondayColumns({ urgency: "high", team: "billing" }, 4, { urgency: "status", owner: "text", deadline: "date4" }, new Date("2026-11-24T10:00:00Z"));
  assert.deepEqual(cols, { status: { label: "high" }, text: "billing", date4: { date: "2026-11-24" } });
});
