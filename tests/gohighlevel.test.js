import { test } from "node:test";
import assert from "node:assert/strict";
import { upsertContact, sendApprovedReply, handleInbound } from "../src/integrations/gohighlevel.js";

const recorder = () => {
  const calls = [];
  const fetchImpl = async (url, opts) => { calls.push({ url, opts, body: JSON.parse(opts.body) }); return { ok: true, status: 200, json: async () => ({ contact: { id: "c1" }, messageId: "m1" }) }; };
  return { calls, fetchImpl };
};

test("a contact is upserted with the API version header and the token", async () => {
  const { calls, fetchImpl } = recorder();
  const id = await upsertContact({ locationId: "loc", name: "Test Lead", phone: "+15550000000" }, { token: "t", fetchImpl });
  assert.equal(id, "c1");
  assert.match(calls[0].url, /\/contacts\/upsert$/);
  assert.equal(calls[0].opts.headers.Version, "2021-07-28");
  assert.equal(calls[0].opts.headers.Authorization, "Bearer t");
});

test("a reply that a person has not approved is never sent", async () => {
  const { calls, fetchImpl } = recorder();
  await assert.rejects(sendApprovedReply({ approved: false, contactId: "c1", text: "Hi" }, { token: "t", fetchImpl }), /Not approved/);
  assert.equal(calls.length, 0);
});

test("an approved reply goes out on the chosen channel", async () => {
  const { calls, fetchImpl } = recorder();
  await sendApprovedReply({ approved: true, contactId: "c1", channel: "WhatsApp", text: "Thanks, we are on it." }, { token: "t", fetchImpl });
  assert.deepEqual(calls[0].body, { type: "WhatsApp", contactId: "c1", message: "Thanks, we are on it." });
});

test("an inbound reply is run through the desk engine and comes back as tags and a note", async () => {
  const runEngine = async () => ({ result: { urgency: "urgent", category: "appointment_no_show", summary: "3 no-shows yesterday", suggested_reply: "Sorry, we are checking the confirmations now." }, replyWithinHours: 1, status: "Needs review", backup: false });
  const out = await handleInbound({ contactId: "c9", body: "3 of my 5 appointments were no-shows", messageType: "SMS" }, { runEngine });
  assert.deepEqual(out.tags, ["urgency:urgent", "category:appointment_no_show"]);
  assert.match(out.note, /reply within 1 h/);
  assert.equal(out.needsReview, true);
});
