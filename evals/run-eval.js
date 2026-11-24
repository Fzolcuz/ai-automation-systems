// Runs the Support Desk on the 12 test tickets in support-cases.json and reports accuracy.
// Needs real keys and the private instructions (see .env.example): this calls Grok (and Claude if Grok fails).
// Cost: about half a cent per ticket. Run: npm run eval
import { readFileSync } from "node:fs";
import { run } from "../src/desk-engine/engine.js";

const cases = JSON.parse(readFileSync(new URL("./support-cases.json", import.meta.url), "utf8"));
let cat = 0, urg = 0, cost = 0;
for (const c of cases) {
  const r = await run("support", { text: c.text, channel: "eval" }, { addMondayRow: async () => null });
  const okCat = r.result.category === c.expect.category, okUrg = r.result.urgency === c.expect.urgency;
  cat += okCat; urg += okUrg; cost += r.costUsd || 0;
  console.log(`${okCat && okUrg ? "PASS" : "MISS"}  ${r.result.category}/${r.result.urgency}  expected ${c.expect.category}/${c.expect.urgency}  ${(r.ms / 1000).toFixed(1)} s  ${r.ai}`);
}
console.log(`Category ${cat}/${cases.length}, urgency ${urg}/${cases.length}, cost $${cost.toFixed(4)}`);
