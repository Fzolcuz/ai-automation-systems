import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp, secretOk } from "../src/server.js";
import { sendApprovedReply, API_VERSION } from "../src/integrations/gohighlevel.js";

const fakeEngine = async (module, input) => ({
  module, ai: "Grok 4.7", backup: false, status: "Needs review", replyWithinHours: 1, ms: 9000, costUsd: 0.006, mondayItem: "5",
  result: { urgency: "urgent", category: "appointment_no_show", summary: `Handled: ${input.text}`, suggested_reply: "Sorry, checking now.", sentiment: "negative", action_items: [], upsell_signals: [], churn_risk: 6 },
});

test("the shared secret is required and compared safely", () => {
  assert.equal(secretOk("abc", "abc"), true);
  assert.equal(secretOk("abd", "abc"), false);
  assert.equal(secretOk(undefined, "abc"), false);
});

test("webhooks: wrong secret refused, GoHighLevel message handled once, metrics reported", async () => {
  const app = createApp({ secret: "s3", engine: fakeEngine });
  const bad = await app.handle({ method: "POST", path: "/webhooks/ghl", headers: { "x-webhook-secret": "nope" }, body: {} });
  assert.equal(bad.status, 403);
  const ev = { messageId: "m1", contactId: "c1", body: "3 of my 5 appointments were no-shows" };
  const first = await app.handle({ method: "POST", path: "/webhooks/ghl", headers: { "x-webhook-secret": "s3" }, body: ev });
  const again = await app.handle({ method: "POST", path: "/webhooks/ghl", headers: { "x-webhook-secret": "s3" }, body: ev });
  assert.deepEqual(first.json.tags, ["urgency:urgent", "category:appointment_no_show"]);
  assert.deepEqual(again.json, { skipped: "duplicate" });
  const m = await app.handle({ method: "GET", path: "/api/metrics" });
  assert.equal(m.json.runs, 1);
  assert.equal(m.json.medianSeconds, 9);
});

test("a Fathom webhook delivered twice creates one result", async () => {
  const app = createApp({ secret: "s3", engine: fakeEngine });
  const meeting = { recording_id: "r9", title: "Monthly review", transcript: "Client: we are unhappy with no-shows." };
  const a = await app.handle({ method: "POST", path: "/webhooks/fathom", headers: { "x-webhook-secret": "s3" }, body: meeting });
  const b = await app.handle({ method: "POST", path: "/webhooks/fathom", headers: { "x-webhook-secret": "s3" }, body: meeting });
  assert.equal(a.json.mondayItem, "5");
  assert.deepEqual(b.json, { skipped: "duplicate" });
});

test("over-long input is refused before any AI is called", async () => {
  const app = createApp({ secret: "s3", engine: async () => { throw new Error("should not run"); } });
  const r = await app.handle({ method: "POST", path: "/api/run", headers: { "x-webhook-secret": "s3" }, body: { text: "x".repeat(6001) } });
  assert.equal(r.status, 400);
});

test("GoHighLevel: conversations use their own API version; email sends a subject and HTML", async () => {
  let call;
  const fetchImpl = async (url, opts) => { call = { url, opts, body: JSON.parse(opts.body) }; return { ok: true, status: 200, json: async () => ({}) }; };
  await sendApprovedReply({ approved: true, contactId: "c1", channel: "Email", text: "Line 1\nLine 2", subject: "Your leads" }, { token: "t", fetchImpl });
  assert.equal(call.opts.headers.Version, API_VERSION.conversations);
  assert.deepEqual(call.body, { type: "Email", contactId: "c1", subject: "Your leads", html: "Line 1<br>Line 2" });
});
