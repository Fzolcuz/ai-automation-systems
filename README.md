# AI automation systems — Farukh Shaikh

Selected code and design notes from eight AI automation systems I designed and built with Claude Code
for **Surati Jewellery Factory (SJF)**, a jewellery manufacturer in Surat, India, that sells to shops and
wholesalers in the Gulf, the US, the UK and Asia. Before that, I spent four years running LinkedIn lead
generation and appointment setting for US and UK clients at **Malek Media Marketing**.

The numbers below come from the live systems, their cost ledgers and, where marked, test runs.

> **Shared for evaluation only.** The AI instructions, scoring rules, customer data and the complete
> systems are private. What is here is enough to see how each system works and how it is engineered.
> See [LICENSE](LICENSE).

---

## The eight systems at a glance

| # | System | What it does | Real result | Status |
|---|---|---|---|---|
| 1 | [Lead Gen Command Centre](docs/01-lead-gen.md) | Finds businesses, checks each one is a real buyer, writes a personal first message, quality-gates it | 4,352 messages to 2,235 contacts, 125 buyers replied; about $12 a month in pay-per-use AI and data, about $236 a month all-in with subscriptions | Live |
| 2 | [Buyer Desk](docs/02-buyer-desk.md) | Reads every buyer reply in any language, translates it, ranks how ready they are to buy, drafts the reply | 219 messages read, 0 errors, $1.01 in total (one run feeds both desks) | Live |
| 3 | [Ticket Desk](docs/03-ticket-desk.md) | The same engine run, seen as jobs: the next step, the owner (from a fixed list) and the deadline, in 11 Monday columns | 90 jobs on the team board, from the same $1.01 run | Live |
| 4 | [Support Desk](docs/04-support-desk.md) | Sorts customer problems, sets a reply deadline, scores the risk of losing the customer, drafts a safe reply | Test run: 12 of 12 tickets sorted correctly, about half a cent each | Built, on test tickets |
| 5 | [Image Studio](docs/05-image-studio.md) | Up to 24 product pictures and a 15-second video per product, made by AI, with a never-pay-twice ledger | 127 rings processed, 1,200 pictures so far; a full set costs about $1.25 | Live |
| 6 | [Price Engine](docs/06-price-engine.md) | Prices every design every day from the live gold rate, with no AI touching a price | 8,569 designs priced daily; every price recalculated a second, independent way: 0 mismatches | Live |
| 7 | [Ad Desk](docs/07-ad-desk.md) | Writes and checks ads, drafts a first reply to every new ad lead in seconds | Test: $176 over 30 days gave 195 WhatsApp chats and 277 shop visits | In progress |
| 8 | [AI Telecaller](docs/08-ai-telecaller.md) | AI voice agents that call and answer buyers, then log a summary and follow-up | Test: 48 calls, about 0.6 s to answer, about $0.09 a minute | In progress |

Start with **[STATUS.md](STATUS.md)** (what is live and what is not), the **[worked example](docs/13-worked-example.md)**
(from a loose problem to a running system), the **[live test on 12 unseen tickets](docs/evidence/holdout-eval-2026-11-24.md)**
(12 of 12 correct) and **[how I build with Claude Code](docs/14-how-i-use-claude-code.md)**.

Also: **Vroom's first projects and how I would start** ([docs/11](docs/11-vroom-first-projects.md)), **how I work** ([docs/12](docs/12-how-i-work.md)), the team's **task board and daily reporting** ([docs/09](docs/09-team-reporting.md)), the **SJF AI Desk** command centre
([docs/10](docs/10-ai-desk.md)), four customer websites (house site, Gold Live prices, lab diamonds, silver), and my
four years before SJF at **Malek Media Marketing** ([docs/00](docs/00-background.md)).

Every system page has a **step-by-step** section: what goes in, which tool or AI does each step, the exact timers,
retries, limits, discounts and costs, what comes out, and what happens when something fails.

How they fit together, and the engineering patterns they share: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## What is in this repository

```
src/
  desk-engine/engine.js        The shared core of the Buyer, Ticket and Support desks, Ad Desk, Telecaller
                               summaries and Lead Gen qualification: Grok first, automatic Claude backup,
                               structured outputs, fixed safety rules, code-set deadlines, Monday.com rows
  lead-gen/quality-checks.js   The plain-code half of the Lead Gen quality gate (generalised): claims a message
                               may never make, caught in code where no AI grader can talk itself past them
  price-engine/rates.cjs       Live gold, silver and rupee rates from free sources, each checked two ways
                               before it can reach a customer, with a saved-rates fallback
  price-engine/price.js        How one design's four prices are worked out each day
  integrations/gohighlevel.js  GoHighLevel connector: contact upsert, approved-only sending, inbound webhook
  integrations/fathom.js       Call intelligence: a recorded client call becomes summary, action items, sentiment,
                               upsell signals and a Monday item
  monitoring/metrics.js        Response times, backup-AI rate, review rate, cost and hours saved, with alerts
  server.js                    Webhook endpoints (/api/run, /webhooks/ghl, /webhooks/fathom, /api/metrics) with a shared
                               secret, a 1 MB limit, duplicate checks and a run log for monitoring
  image-studio/kie_batch.py    The spending safety of the image pipeline: a locked, shared ledger so nothing
                               is ever paid for twice, a credit cap that stops a run before anything is sent,
                               and a 3-picture first stage before the other 21 are paid for
tests/                         40 JavaScript tests (npm test) + 3 Python tests for the image ledger
evals/                         12 support test tickets with expected answers, and a script that scores the live desk
n8n/                           Three real n8n workflows, exported (instructions removed): the live Inquiry Desk, the
                               Telecaller (call finished to Monday row and follow-up task) and the Ad Desk (new Meta lead
                               to draft reply, Monday row, wait for approval)
claude/                        A cleaned copy of the rules file I give Claude Code in every session
STATUS.md                      Every part, plainly: live, tested with stand-ins only, or in progress
docs/                          One page per system: flow, decisions, safety, costs, what I would change
```

## How to run

* Tests (Node 20+): `npm test` runs 40 tests; `python -m unittest discover -s tests -p "test_*.py"` runs the 3 image-ledger tests. No keys or network needed: the AI, Monday, GoHighLevel and kie.ai calls are replaced by stand-ins.
* Live accuracy check (needs keys, about half a cent a ticket): `npm run eval`.
* Webhook server: `WEBHOOK_SECRET=... node src/server.js`.
* The desk engine needs `XAI_API_KEY`, `ANTHROPIC_API_KEY`, the private instructions and, optionally, `MONDAY_API_TOKEN` and `MONDAY_BOARD_ID` (see `.env.example`).
* The image runner needs Python 3.11+, `pip install -r src/image-studio/requirements.txt`, `KIE_API_KEY` and a private plan file.

---

## How this matches the AI Automation Engineer role

**Vroom's first projects** (full plan: [docs/11-vroom-first-projects.md](docs/11-vroom-first-projects.md))

| First project | What I have already built |
|---|---|
| 1. AI support ticketing: intake, triage, routing, drafted responses, escalation | Support Desk and Ticket Desk on the desk engine: category, team, deadline, churn risk, safe reply, escalation rules, Monday or GoHighLevel. Built for agency tickets too (bad leads, no-shows, billing) and tested on them |
| 2. Sales lead sourcing bot: find, qualify, enrich, push into the pipeline | Lead Gen: Sales Navigator, Apify, web research, AI qualification (1,836 checked, 831 approved), buy rank, quality gate, 4,352 messages, 125 buyers replied |
| 3. Customer-success call intelligence into Monday.com | `callintel` module + Fathom connector: summary, action items with owners, sentiment, upsell signals, churn risk, one Monday item per call |
| 4. Reporting, campaign workflows, internal tools | Monitoring code, nightly director's report, Ad Desk, SJF AI Desk command centre, task board |

**Requirements**

| The role asks for | Where it is |
|---|---|
| **Claude Code**, real projects | Every system here was built with it. I design the system and the rules, Claude Code writes the code, I test everything on real data, and a separate AI reviewer audits the result: [docs/14](docs/14-how-i-use-claude-code.md), [rules file](claude/CLAUDE.example.md) |
| **Grok (xAI) API**, real projects | `askGrok()` in the desk engine: Grok 4.7, temperature 0, strict JSON schema, 40 s timer, automatic Claude backup. 219 real buyer messages, 0 errors, $1.01. |
| **2+ years** building automations | 4 years building lead-generation automation at Malek Media Marketing with no-code tools and my own Google Apps Script (PhantomBuster, Dux-Soup, ChatGPT scoring, per-client tracking sheets); since July 2026, five months building software with Claude Code: everything in this repository. [docs/00](docs/00-background.md) |
| **Python / JavaScript, REST APIs, webhooks, JSON** | JavaScript (desk engine, connectors, monitoring, price rates), Python (image pipeline); REST calls to xAI, Anthropic, Monday (GraphQL), GoHighLevel, kie.ai, rate services; webhooks in n8n, GoHighLevel and Fathom; strict JSON schemas throughout |
| **Monday.com and GoHighLevel** | Monday: live, two boards (125 buyers, 90 jobs), items with message, translation, reply and deadline, no-duplicate retries. GoHighLevel: connector for contacts, approved-only sending and inbound webhooks (tested with stand-ins, not yet on a live account) |
| **Prompt engineering, AI agents, multi-step workflows** | Fixed-shape outputs, a writer-plus-grader loop (nothing under 7/10), a two-reviewer ad gate (average 8, every point 7+), voice agents with three personas, n8n multi-step flows with backup paths |
| **Loosely defined problems into documented solutions** | [docs/12-how-i-work.md](docs/12-how-i-work.md): measure the cost, map the flow, smallest version on real data, then document and measure |
| **Clear written and spoken English** | This repository; every system has a plain-English guide; four years as the only contact for US and UK clients |
| **Nice to have: agency experience** | 4 years at Malek Media Marketing, a US/UK appointment-setting agency: 13 client accounts at once, about $32,500 MRR at the peak |
| **Nice to have: Make, Zapier or n8n** | Seven n8n workflows; three exported here as real, importable files: the live Inquiry Desk (secret key, duplicate check, Grok with Claude backup, 11 Monday columns, retries), the Telecaller and the Ad Desk: [n8n/](n8n/) |
| **Nice to have: call recording or speech-to-text** | Fathom connector for call intelligence (tested with stand-ins); AI Telecaller on ElevenLabs, which listens and speaks in real time (48 test calls); team reports spoken into the browser's speech-to-text in three languages |
| **Nice to have: lead enrichment and scraping (Apollo, Clay), data privacy** | Lead Gen does the same jobs with Sales Navigator, Apify, Jina Reader, TinyFish and Tavily; privacy, opt-outs and consent in the [compliance section](ARCHITECTURE.md#compliance-privacy-and-ai-safety) |
| **Nice to have: helpdesk or ticketing systems** | Support Desk and Ticket Desk |

**Responsibilities**: auditing workflows, building and testing, integrating, monitoring, documenting and training, tracking results, handling data securely and recommending tools, each with an example: [docs/11](docs/11-vroom-first-projects.md#responsibilities-in-the-job-description-and-where-they-are-shown).

## Principles I build by

1. **Start from the real cost of the problem.** Our ad leads waited 85 hours for a first reply; that number decided what to build.
2. **AI for judgement, code for rules, a person for the final yes.** Anything that must never go wrong is plain code that runs after the AI.
3. **Every AI call has a timer and a backup.** When Grok fails, Claude answers (about 8 seconds in the live test) and the answer is flagged for a person.
4. **Test small on real data first.** 10 real conversations for 8 cents, checked by hand, before all 125. One test ring before a group.
5. **Never pay twice, never overspend.** Ledgers, credit caps and budget checks before any paid run.
6. **Put results where the team already works.** Monday.com, not another new tool.
7. **Measure, then improve.** Every system records what it did and what it cost.

## Contact

Farukh Shaikh · AI automation · India (remote)
