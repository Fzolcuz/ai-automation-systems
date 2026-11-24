# 4. Support Desk

**Customer support messages, sorted live: category, team, reply deadline, risk of losing the customer, and a safe reply.**
Engine: [`src/desk-engine/engine.js`](../src/desk-engine/engine.js), module `support`. Tests: [`tests/desk-engine.test.js`](../tests/desk-engine.test.js). Status: built and running on the website, tested on 12 tickets.

## Step by step
1. **Inbox**: email, WhatsApp or a web form, into n8n (secret key, duplicate check of the last 500).
2. **Grok fills a strict ticket form** (40-second timer on the website, 45 in n8n):
   * **Category**: order issue, damaged goods, delivery, invoice dispute, lead quality, appointment no-show, tech issue, opt-out, pause or change, onboarding, cancellation risk, compliment, spam or other. It handles both a manufacturer's tickets and a lead-generation agency's tickets (bad leads, no-shows, billing).
   * **Urgency**: urgent (stop-contact request, cancel threat, legal), high (money or a working system affected), normal, low (thanks or spam).
   * **Team**: account manager, dispatch, production, billing, onboarding, tech support, compliance or none.
   * Also: sentiment, **risk of losing the customer (0 to 10)**, whether a credit needs review, summary, safe reply in the customer's language, next step, confidence.
3. **Claude backup** fills the same form if Grok fails (45 seconds on the website; 90 seconds, 2 tries, 2 seconds apart in n8n), marked "answered by backup AI".
4. **Rules the AI cannot break** (code, on every answer):
   | Rule | What happens |
   |---|---|
   | "Stop calling", "remove my number", "opt out", "don't contact" (also caught through the English translation) | Forced to **urgent**, sent to compliance |
   | "I'll cancel", "cancel my order/contract/account", "moving to another supplier" | Risk of losing the customer raised to **at least 7 of 10** ("cancel the meeting" does not count) |
   | Reply promises a refund or credit | Flagged and sent to a person |
   | ALL CAPS or a banned claim ("cheapest", "best quality") | Flagged |
   | AI less than 70% sure | Sent to a person |
5. **Reply deadline, by code**: urgent **1 hour**, high **4 hours**, normal **24 hours**, low **72 hours**. Support is faster than sales because an unhappy customer is waiting right now.
6. **Monday**: a ticket with the deadline, team and status; the message, translation and draft reply inside; 3 tries, 2 seconds apart.
7. **A person approves** the reply.

## Live proof on the running system
| Test | Result |
|---|---|
| 12 support tickets covering every type | 12 of 12 sorted correctly, 0 errors, about half a cent each (12 cost 6 cents) |
| A hard case: "Stop calling me... I'll cancel" | Urgent, risk 8 of 10, calm reply and Monday row in about 23 seconds |
| Grok switched off | Claude answered in about 8 seconds |
| The same message twice | Second one skipped in 0.0 seconds |
| No secret key | Refused (403) |

## Unseen tickets
On 24 Nov 2026, 12 new agency-style tickets the desk had never seen were run live: **12 of 12 right on category and urgency**, median 12 s, all answered by Grok ([results](evidence/holdout-eval-2026-11-24.md)).

## How I would build a ticketing system for a new team
Take 50 real tickets as a sample, build the categories and teams from them, run the desk on those, review every result with the team, adjust, then go live with a person approving every reply.
