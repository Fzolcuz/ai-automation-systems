import { test } from "node:test";
import assert from "node:assert/strict";
import { transcriptText, handleMeetingEnded } from "../src/integrations/fathom.js";
import { summarise, alerts } from "../src/monitoring/metrics.js";
import { run } from "../src/desk-engine/engine.js";

test("a Fathom transcript given as speaker lines becomes readable text", () => {
  const text = transcriptText({ transcript: [{ speaker: { display_name: "Client" }, text: "We want more leads in Ohio." }, { speaker: "AM", text: "I'll send a plan by Friday." }] });
  assert.equal(text, "Client: We want more leads in Ohio.\nAM: I'll send a plan by Friday.");
});

test("a very long call keeps its start and end", () => {
  const text = transcriptText({ transcript: "a".repeat(40_000) + "b".repeat(40_000) });
  assert.ok(text.length < 61_000);
  assert.ok(text.startsWith("a") && text.endsWith("b"));
});

test("a client call becomes summary, sentiment, upsell signals and action items with owners, on Monday", async () => {
  let row;
  const grok = async () => ({ out: { summary: "Client happy with volume, unhappy with no-shows", action_items: [{ task: "Add reminder texts", owner: "Ops", due: "Friday" }], sentiment: "mixed", upsell_signals: ["Asked about a second territory"], churn_risk: 4, urgency: "high", next_step: "Send the reminder plan", confidence: 0.9 }, tokens: 100 });
  const runEngine = (m, input) => run(m, input, { grok, addMondayRow: async (title, html) => { row = { title, html }; return "77"; } });
  const out = await handleMeetingEnded({ title: "Monthly review", attendees: [{ name: "Client A" }], transcript: "..." }, { runEngine });
  assert.equal(out.sentiment, "mixed");
  assert.deepEqual(out.upsell, ["Asked about a second territory"]);
  assert.equal(out.actionItems[0].owner, "Ops");
  assert.equal(out.mondayItem, "77");
  assert.match(row.title, /^Client call · mixed · 1 actions · upsell/);
  assert.match(row.html, /Add reminder texts \(Ops, Friday\)/);
  assert.match(row.html, /second territory/);
});

test("monitoring: response times, backup rate, review rate, cost and hours saved", () => {
  const runs = [
    { module: "support", ms: 8000, backup: false, status: "Ready for approval", costUsd: 0.005 },
    { module: "support", ms: 12000, backup: true, status: "Needs review", costUsd: 0.02 },
    { module: "buyer", ms: 10000, backup: false, status: "Ready for approval", costUsd: 0.006 },
    { module: "buyer", ms: 40000, backup: false, status: "Needs review", costUsd: 0.007 },
  ];
  const s = summarise(runs, { minutesSavedPerRun: 6 });
  assert.equal(s.runs, 4);
  assert.equal(s.medianSeconds, 10);
  assert.equal(s.p95Seconds, 40);
  assert.equal(s.backupRate, 0.25);
  assert.equal(s.reviewRate, 0.5);
  assert.equal(s.hoursSaved, 0.4);
  assert.equal(s.byModule.support.runs, 2);
  assert.deepEqual(alerts(s), ["Backup AI answered 25% of runs: check the main AI", "Slow: 95% of answers within 40 s"]);
});

test("alerts are delivered to a person, one message each", async () => {
  const { deliverAlerts } = await import("../src/monitoring/metrics.js");
  const sent = [];
  const n = await deliverAlerts(["Slow: 95% of answers within 40 s"], { send: async (t) => sent.push(t) });
  assert.equal(n, 1);
  assert.deepEqual(sent, ["AI desk alert: Slow: 95% of answers within 40 s"]);
});

test("phone numbers and emails are masked before text reaches the AI; each run records its instruction version", async () => {
  process.env.INSTRUCTIONS_SUPPORT_VERSION = "support-v7";
  let seenByAI = "";
  const grok = async (m, userText) => { seenByAI = userText; return { out: { urgency: "normal", category: "delivery", churn_risk: 1, suggested_reply: "Checking.", summary: "s", next_step: "n", confidence: 0.9 } }; };
  const r = await run("support", { text: "Call me on +1 555 201 7788 or mail jo@example.com about my parcel", from: "jo@example.com" }, { grok });
  assert.ok(!seenByAI.includes("555") && !seenByAI.includes("jo@example.com"));
  assert.match(seenByAI, /\[phone\].*\[email\]/s);
  assert.equal(r.instructionsVersion, "support-v7");
});

test("masking keeps dates and order numbers", async () => {
  const { redactForAI } = await import("../src/desk-engine/engine.js");
  assert.equal(redactForAI("Order 4471 shipped on 2026-11-20"), "Order 4471 shipped on 2026-11-20");
  assert.equal(redactForAI("call +1 555 010 0199"), "call [phone]");
});
