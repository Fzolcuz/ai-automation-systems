# Status of every part, plainly

| Part | Status | Evidence |
|---|---|---|
| Lead Gen Command Centre | **Live in production** since 28 Sep 2026 | 4,352 messages, 125 buyers replied, cost ledgers ([docs/01](docs/01-lead-gen.md)) |
| Buyer Desk (desk engine, website and n8n) | **Live in production** | 219 real messages, 0 errors, $1.01; Monday board with 125 rows |
| Ticket Desk | **Live in production** | Monday board with 90 tickets |
| Support Desk | **Built and running; tested on test tickets** | 12 of 12 test tickets; eval set in [evals/](evals/) |
| n8n Inquiry Desk | **Live** (the one workflow switched on) | [n8n/inquiry-desk.workflow.json](n8n/inquiry-desk.workflow.json) |
| Six other n8n workflows | **Built, switched off** | Described in [n8n/inquiry-desk.md](n8n/inquiry-desk.md) |
| Image Studio | **Live in production** | 127 rings, 1,200 pictures; ledger code and tests |
| Price Engine and SJF Gold Live | **Live in production** | 8,569 designs priced daily; rate code and tests |
| Ad Desk | **In progress** | 32 spending-safety tests (in its own codebase, not included), live ad test results |
| AI Telecaller | **In progress** | 48 test calls |
| Monday.com connection | **Live in production** | Two boards; n8n fills 11 columns per row |
| GoHighLevel connector | **Tested with stand-ins only** | [src/integrations/gohighlevel.js](src/integrations/gohighlevel.js); not yet run on a live account |
| Fathom call-intelligence connector | **Tested with stand-ins only** | [src/integrations/fathom.js](src/integrations/fathom.js); not yet run on a live account |
| Webhook server and monitoring | **Tested with stand-ins only** | [src/server.js](src/server.js), [src/monitoring/metrics.js](src/monitoring/metrics.js) |
| Team task board and nightly report | **Live in production** | [docs/09](docs/09-team-reporting.md) |

Not in this repository (private or containing customer data): the AI instruction texts, the Lead Gen app's full
code, the websites' code, the team guides and slide decks, and all customer data and keys.
