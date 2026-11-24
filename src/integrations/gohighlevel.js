// GoHighLevel connector for the desk engine.
//
// The same pattern as Monday.com, pointed at GoHighLevel:
//   * OUT: once a person approves a drafted reply, upsert the contact in GoHighLevel and send the reply
//     from GoHighLevel (SMS, WhatsApp or email), so the conversation lives in the client's CRM.
//   * IN: GoHighLevel calls a webhook when a lead replies; the message is run through the desk engine
//     (Grok first, Claude backup, rules in code) and the decision comes back as tags and a note.
//
// Written against GoHighLevel's public API v2 (LeadConnector). Covered by tests with a stand-in fetch;
// not yet run against a live GoHighLevel account.

const BASE = "https://services.leadconnectorhq.com";
// GoHighLevel versions its API per area: contacts use 2021-07-28, conversations use 2021-04-15.
export const API_VERSION = { contacts: "2021-07-28", conversations: "2021-04-15" };
const headers = (token, version) => ({ Authorization: `Bearer ${token}`, Version: version, "Content-Type": "application/json", Accept: "application/json" });

async function call(path, body, version, { token, fetchImpl = fetch }) {
  if (!token) throw new Error("GHL_TOKEN is not configured");
  const r = await fetchImpl(BASE + path, { method: "POST", headers: headers(token, version), body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`GoHighLevel ${path} HTTP ${r.status}`);
  return j;
}

// Create or update the contact (matched by phone or email) and return its id.
export async function upsertContact({ locationId, name, phone, email, tags = [] }, opts) {
  const j = await call("/contacts/upsert", { locationId, name, phone, email, tags }, API_VERSION.contacts, opts);
  return j.contact?.id;
}

// Send an approved reply. Refuses anything a person has not approved.
export async function sendApprovedReply({ approved, contactId, channel = "SMS", text, subject }, opts) {
  if (!approved) throw new Error("Not approved: a person must approve every reply before it is sent");
  const type = { SMS: "SMS", WhatsApp: "WhatsApp", Email: "Email" }[channel];
  if (!type) throw new Error(`Unknown channel ${channel}`);
  const body = type === "Email"
    ? { type, contactId, subject: subject || "Re: your message", html: String(text).replace(/\n/g, "<br>") }
    : { type, contactId, message: text };
  return call("/conversations/messages", body, API_VERSION.conversations, opts);
}

// Inbound webhook: a lead replied in GoHighLevel. Run it through the desk engine and return what to write back
// (tags for urgency and category, and a note with the summary and the drafted reply waiting for approval).
// `seen` is a store of message ids already handled, so a webhook delivered twice is processed once.
export async function handleInbound(event, { runEngine, module = "support", seen = new Set() }) {
  const id = event.messageId || event.id;
  if (id && seen.has(id)) return { skipped: "duplicate" };
  const text = String(event.body || event.message || "").trim();
  if (!text) return { skipped: "empty message" };
  if (id) seen.add(id);
  const r = await runEngine(module, { text, from: event.contactName || event.contactId, channel: event.messageType || "SMS" });
  const t = r.result;
  return {
    contactId: event.contactId,
    tags: [`urgency:${t.urgency}`, t.category ? `category:${t.category}` : `module:${module}`, r.backup ? "answered-by-backup-ai" : null].filter(Boolean),
    note: `${t.summary}\n\nDraft reply (waiting for approval, reply within ${r.replyWithinHours} h):\n${t.suggested_reply}`,
    needsReview: r.status !== "Ready for approval",
  };
}
