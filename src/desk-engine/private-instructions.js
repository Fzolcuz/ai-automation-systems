// The AI instructions (prompts) for each module are the result of many rounds of testing on real
// customer messages. They are kept private and loaded from outside the repository at runtime.
//
// What each module's instructions cover, in short:
//   buyer   - read a buyer message, translate it, judge urgency and readiness to buy, pick the brand
//             and owner, draft a reply in the buyer's own language under 80 words
//   support - sort a support ticket (order, damage, delivery, invoice, lead quality, no-show, opt-out,
//             cancellation risk...), set urgency and team, score the risk of losing the customer
//   adlead  - score a new ad lead and draft the first reply within minutes
//   call    - summarise an AI voice call, judge the outcome, set the follow-up task and WhatsApp message
//   callintel - turn a recorded client call into a summary, action items, sentiment and upsell signals
//   qualify - decide if a business is a real potential buyer and draft a personal first message
// Shared reply rules: under 80 words, in the sender's language, one clear next step, never promise
// a refund, credit, discount or exact price, never claim cheapest or best, no ALL CAPS.

export async function loadPrivateInstructions(module) {
  const text = process.env[`INSTRUCTIONS_${module.toUpperCase()}`];
  if (!text) throw new Error(`Private instructions for "${module}" are not configured`);
  return text;
}

// Every change to the instructions gets a version label (for example "support-v7"), and each run records the
// version that produced it, so a drop in accuracy can be traced to the change that caused it.
export const instructionsVersion = (module) =>
  process.env[`INSTRUCTIONS_${module.toUpperCase()}_VERSION`] || process.env.INSTRUCTIONS_VERSION || "unversioned";
