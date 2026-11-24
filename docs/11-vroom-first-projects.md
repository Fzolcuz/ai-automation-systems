# Vroom's first projects, and how I would start

Your job description names four first projects. For each: what I have already built that does the same job,
what carries over directly, and how I would deliver it for Vroom.

## 1. AI support ticketing (intake, triage, routing, drafted responses, escalation)
**Already built**: the [Support Desk](04-support-desk.md) and [Ticket Desk](03-ticket-desk.md), on the
[desk engine](../src/desk-engine/engine.js). It is built for agency tickets too (lead quality, appointment no-shows, billing,
opt-outs and cancellation risk) and tested on test tickets ([eval set](../evals/support-cases.json)).

| Your need | How the desk does it today |
|---|---|
| Intake | n8n webhook with a secret key ([live workflow](../n8n/inquiry-desk.workflow.json)); [`server.js`](../src/server.js) endpoints for GoHighLevel and Fathom with a shared secret and duplicate checks |
| Triage | Category, urgency, sentiment, risk of losing the client (0-10), credit review, in a fixed JSON shape |
| Routing | Team (account manager, billing, onboarding, tech support, compliance...) and a reply deadline set by code (1 h / 4 h / 24 h / 72 h) |
| Drafted responses | A safe reply in the client's language; money promises, banned claims and capitals flagged |
| Escalation | Opt-outs forced urgent and sent to compliance; cancel threats raise risk to 7+; under 70% sure goes to a person; backup-AI answers flagged |
| Where the team sees it | Monday.com item with the message, translation, reply and deadline; or tags and a note in GoHighLevel |

**How I would deliver it for Vroom**
* **Week 1**: sit with the support lead; pull 50 to 100 real tickets; write down Vroom's categories, teams, deadlines and escalation rules; agree what "good" looks like (correct category %, time to first response, % needing a person).
* **Week 2**: build Vroom's own version on Vroom's tickets (never SJF data): instructions, rules, Monday board columns or GoHighLevel tags; test against the 50 to 100 tickets until the agreed accuracy is met.
* **Week 3**: run it next to the team (shadow mode): it drafts, the team still answers; compare.
* **Week 4**: switch on with a person approving every reply; a one-page guide and a 15-minute walkthrough for the team; a weekly numbers report.

## 2. Sales lead sourcing bot (find, qualify, enrich, push into the pipeline)
**Already built**: the [Lead Gen Command Centre](01-lead-gen.md): 4,352 messages to 2,235 contacts, 125 buyers replied.

| Your need | How Lead Gen does it |
|---|---|
| Find prospects matching the ideal client profile | Sales Navigator saved searches, Apify Google Maps lists, web search; decision makers only |
| Qualify | Claude Haiku reads each website and decides fit (1,836 checked, 831 approved); buy rank 1 to 10 |
| Enrich | Website research note, Instagram, owner's own profile, WhatsApp number check |
| Push into the pipeline | Database and dashboard today; GoHighLevel contact upsert ready in [`gohighlevel.js`](../src/integrations/gohighlevel.js) |
| Outreach | Personal first message, quality-gated (nothing under 7/10), person-sent on WhatsApp and LinkedIn |

For a home-improvement agency the ideal client profile changes (contractors by trade, region and size), the sources
change (Google Maps categories, licence registers, Apollo or Clay if Vroom already pays for them), and the pipeline
becomes GoHighLevel. The engine, the quality gate and the safety rules stay the same.

## 3. Customer-success call intelligence (summaries, action items, sentiment, upsell signals into Monday.com)
**Already built**: the [call intelligence module and Fathom connector](../src/integrations/fathom.js), and the
[AI Telecaller](08-ai-telecaller.md) call summaries (48 test calls).

A recorded client call ends, Fathom sends it to a webhook, the desk engine (`callintel` module, Grok first, Claude backup)
returns a summary, action items with owners and due dates, sentiment, upsell signals and churn risk, and one Monday item is
created with every action item inside. Tested with stand-ins; I would connect it to Vroom's Fathom account in week 1.

## 4. Whatever comes next: reporting, campaign workflows, internal tools
* **Reporting**: the nightly director's report ([team reporting](09-team-reporting.md)) and the [monitoring code](../src/monitoring/metrics.js): response times, backup rate, review rate, cost and hours saved per system.
* **Campaign workflows**: the [Ad Desk](07-ad-desk.md): AI-written ads with two reviewers, spend limits in code, every new lead answered with a draft in seconds.
* **Internal tools**: the [SJF AI Desk](10-ai-desk.md) command centre, the task board, the Lumière image studio.

## Responsibilities in the job description, and where they are shown
| Responsibility | Where |
|---|---|
| Audit workflows and find the highest-impact automations | The ad-lead audit (85 hours to first reply) decided what to build: [Ad Desk](07-ad-desk.md); [how I work](12-how-i-work.md) |
| Design, build, test and deploy with Claude Code, Grok and related APIs | Every system; [`engine.js`](../src/desk-engine/engine.js); 28 tests |
| Integrate with Monday.com, GHL, email, call recording, calendar, lead data | Monday (live), GoHighLevel and Fathom connectors, email sending, Calendly (agency), Sales Navigator and Apify |
| Reliable, monitored, easy-to-update prompts, agents and workflows | Timers and backups everywhere; [monitoring](../src/monitoring/metrics.js); instructions kept outside the code so they can be updated without a deploy |
| Write documentation and train the team | This repository; plain-English guides and slide decks for every system; [how I work](12-how-i-work.md) |
| Track results | Time to first reply, cost per message, accuracy on test tickets, reply rates per channel |
| Handle data securely | Keys in environment variables, access codes, masked phone numbers, read-only database access, [compliance section](../ARCHITECTURE.md#compliance-privacy-and-ai-safety) |
| Recommend new AI tools | Every choice was tested against alternatives: [how I work](12-how-i-work.md#choosing-tools) |
