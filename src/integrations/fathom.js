// Fathom (call recorder) connector: customer-success call intelligence.
//
// When a recorded client call ends, Fathom sends the meeting to a webhook. This turns it into:
//   * a summary, sentiment, churn risk and upsell signals (desk engine module `callintel`, Grok first, Claude backup)
//   * one Monday.com item for the call, with every action item listed inside with its owner and due date
// so the account manager never has to re-listen to a call to know what was promised.
//
// Written against Fathom's documented webhook (meeting title, attendees and transcript). It accepts the transcript
// as text or as a list of { speaker, text } lines. Covered by tests with stand-ins; not yet run on a live Fathom account.

const MAX_TRANSCRIPT = 60_000;   // characters; very long calls keep the start and the end, where decisions usually are

export function transcriptText(meeting) {
  const t = meeting.transcript;
  let text = Array.isArray(t)
    ? t.map((l) => `${l.speaker?.display_name || l.speaker || "Speaker"}: ${l.text}`).join("\n")
    : String(t || "");
  if (text.length > MAX_TRANSCRIPT) text = text.slice(0, MAX_TRANSCRIPT / 2) + "\n[... middle of call omitted ...]\n" + text.slice(-MAX_TRANSCRIPT / 2);
  return text;
}

// `seen` is a store of meeting ids already handled, so a webhook delivered twice creates one Monday item, not two.
export async function handleMeetingEnded(meeting, { runEngine, seen = new Set() }) {
  const id = meeting.recording_id || meeting.id || meeting.url;
  if (id && seen.has(id)) return { skipped: "duplicate" };
  const text = transcriptText(meeting);
  if (!text.trim()) return { skipped: "no transcript" };
  if (id) seen.add(id);
  const client = (meeting.calendar_invitees || meeting.attendees || []).map((a) => a.name || a.email).filter(Boolean).join(", ");
  const r = await runEngine("callintel", { text: `Meeting: ${meeting.title || "Client call"}\n\n${text}`, from: client || "Client call", channel: "Recorded call" });
  const t = r.result;
  return {
    title: meeting.title || "Client call",
    sentiment: t.sentiment,
    churnRisk: t.churn_risk,
    upsell: t.upsell_signals,
    actionItems: t.action_items,   // each { task, owner, due }: listed inside the Monday item for the account manager
    mondayItem: r.mondayItem,
    needsReview: r.status !== "Ready for approval",
  };
}
