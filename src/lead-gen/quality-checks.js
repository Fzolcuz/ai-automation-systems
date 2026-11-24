// Lead Gen quality checks: the plain-code half of the quality gate.
//
// Every first message is marked out of 10 by an AI grader, and anything under 7 is rewritten before a person
// sees it. AI graders can be talked into things (one once scored a draft 9/10 that invented "we already work
// with partners across the United States"), so the claims a message must NEVER make are checked here in code,
// where no grader can talk itself past them.
//
// This is a generalised version of the production checks. The production rules are company-specific facts
// (what the business may and may not claim) and are private; the rules below are typical examples, and every
// list is configuration, so a different business only changes the rules, not the code.

export const DEFAULT_RULES = {
  // Words that make outreach sound generic or salesy.
  bannedWords: ["exquisite", "delighted", "elevate", "synergy", "game-changer", "seamless"],
  // Claims that are untrue unless the facts file says otherwise. [pattern, what it means]
  truth: [
    [/\b(?:already|currently)\b[^.?!\n]{0,60}\b(?:supply|work(?:ing)?\s+with|serve|serving|partner(?:s|ing)?\s+with)\b[^.?!\n]{0,50}\b(?:in|across|throughout)\b/i, "claims existing clients in a place"],
    [/\b(?:partners|clients|customers)\s+(?:across|throughout)\s+(?:the\s+)?[A-Z]/, "claims existing clients in a place"],
    [/(?:\$|usd|aed|inr|₹|€|£)\s?\d|\bper\s+(?:gram|unit|piece)\b/i, "mentions a price"],
    [/\b\d+\s*(?:-|–|to)?\s*\d*\s*(?:hours?|days?|weeks?)\b/i, "promises a turnaround time"],
    [/\b(?:we|our\s+\w+)\s+speciali[sz]e\b|\bour\s+speciali(?:ty|sm)\b|\bexperts?\s+in\b/i, "claims a speciality the facts do not state"],
    [/\b\d+\+?\s*(?:employees|staff|craftsmen|designers)\b/i, "gives a headcount"],
    [/(?<![-\w])free\b(?!\s+to\b)/i, "uses the word \"free\" as an offer"],
    [/!/, "uses an exclamation mark"],
  ],
  // Openers that sound like a template instead of a person who looked at the business.
  genericOpeners: [
    /\b(?:retailers|shops|buyers|businesses)\s+(?:across|in|throughout)\s+(?:the\s+)?(?:region|market|country)\s+(?:are|face|tend)\b/i,
    /\b(?:that|which|this)\s+(?:usually\s+)?(?:means|tells\s+me|points\s+to)\b/i,
    /\bwhen\s+(?:a\s+)?(?:retailer|store|shop|business)\s+(?:sources?|buys?|orders?)\b/i,
  ],
  // Openers that criticise the reader's business ("very little", "barely any").
  deficiencyOpeners: [/\b(?:very\s+little|little\s+to\s+no|barely\s+any|hardly\s+any|lacking\s+(?:in|any))\b/i],
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// The opening = the first line that is not a greeting ("Hello Maria,"), up to 250 characters.
const opening = (text) => {
  const lines = String(text || "").split("\n").map((l) => l.trim()).filter(Boolean);
  return (lines.find((l) => !l.endsWith(",") && l.length > 20) || lines[0] || "").slice(0, 250);
};

export function checkMessage(text, rules = DEFAULT_RULES) {
  const t = String(text || "");
  const problems = [];
  for (const w of rules.bannedWords) if (new RegExp(`\\b${escapeRegex(w)}\\b`, "i").test(t)) problems.push(`banned word: ${w}`);
  for (const [re, label] of rules.truth) if (re.test(t)) problems.push(label);
  if (/[^\s](?:\s*)(--|–|—)(?:\s*)[^\s]/.test(t)) problems.push("dash used as a sentence connector");
  const first = opening(t);
  for (const re of rules.genericOpeners) { const m = first.match(re); if (m) { problems.push(`generic opener: "${m[0]}"`); break; } }
  for (const re of rules.deficiencyOpeners) { const m = first.match(re); if (m) { problems.push(`opener criticises the reader: "${m[0]}"`); break; } }
  return { ok: problems.length === 0, problems: [...new Set(problems)] };
}
