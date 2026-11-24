// Monitoring and results tracking.
//
// Every run of the desk engine returns which AI answered, whether the backup took over, how long each step took,
// the flags, and the tokens used. Stored as a run log, these give the numbers a team lead actually asks for:
// response times, how often the backup is needed, how often a person must review, cost, and time saved.

const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : 0);

// runs: [{ module, ms, backup, status, tokens, costUsd? }]
// opts.minutesSavedPerRun: how long a person used to spend on one message by hand (measured, not guessed)
export function summarise(runs, { minutesSavedPerRun = 0 } = {}) {
  const byModule = {};
  for (const r of runs) (byModule[r.module] ||= []).push(r);
  const stats = (list) => {
    const ms = list.map((r) => r.ms).sort((a, b) => a - b);
    return {
      runs: list.length,
      medianSeconds: +(pct(ms, 50) / 1000).toFixed(1),
      p95Seconds: +(pct(ms, 95) / 1000).toFixed(1),
      backupRate: list.length ? +(list.filter((r) => r.backup).length / list.length).toFixed(3) : 0,
      reviewRate: list.length ? +(list.filter((r) => r.status === "Needs review").length / list.length).toFixed(3) : 0,
      costUsd: +list.reduce((a, r) => a + (r.costUsd || 0), 0).toFixed(4),
    };
  };
  const all = stats(runs);
  return {
    ...all,
    costPerRunUsd: runs.length ? +(all.costUsd / runs.length).toFixed(4) : 0,
    hoursSaved: +((runs.length * minutesSavedPerRun) / 60).toFixed(1),
    byModule: Object.fromEntries(Object.entries(byModule).map(([m, l]) => [m, stats(l)])),
  };
}

// Alerts worth waking someone for: the backup AI is doing too much of the work, answers are slow,
// or too many answers need a person (the instructions may need updating).
export function alerts(summary, { maxBackupRate = 0.2, maxP95Seconds = 30, maxReviewRate = 0.5 } = {}) {
  const out = [];
  if (summary.backupRate > maxBackupRate) out.push(`Backup AI answered ${(summary.backupRate * 100).toFixed(0)}% of runs: check the main AI`);
  if (summary.p95Seconds > maxP95Seconds) out.push(`Slow: 95% of answers within ${summary.p95Seconds} s`);
  if (summary.reviewRate > maxReviewRate) out.push(`${(summary.reviewRate * 100).toFixed(0)}% of answers needed a person: review the instructions`);
  return out;
}

// Alerts reach a person, not just a log: `send` posts the text wherever the team looks
// (a Monday update, an email, a Slack or WhatsApp webhook). Returns how many were sent.
export async function deliverAlerts(list, { send, title = "AI desk alert" }) {
  let n = 0;
  for (const a of list) { await send(`${title}: ${a}`); n++; }
  return n;
}
