# Support Desk on 12 unseen tickets (24 Nov 2026)

Twelve new agency-style support tickets that the Support Desk had never seen (they are not the 12 tickets it was
tuned on), written before the run with the expected category and urgency, then sent through the live desk with
real Grok calls. Test set: [evals/holdout-cases.json](../../evals/holdout-cases.json). Raw results:
[holdout-run-raw.json](holdout-run-raw.json).

**Result: category 12 of 12, urgency 12 of 12.**

| # | Ticket | Expected | Got | Time | AI |
|---|---|---|---|---|---|
| 1 | Hi, the 14 leads you sent last week all had wrong phone numbers. We paid for this. What happens now? | lead_quality / high | lead_quality / high | 18.0 s | Grok 4.7 |
| 2 | Please take us off your texting list. We did not sign up for this. | opt_out / urgent | opt_out / urgent | 8.8 s | Grok 4.7 |
| 3 | We're thinking of ending our contract at the end of the month. The appointments just aren't closing. | cancellation_risk / urgent | cancellation_risk / urgent | 9.1 s | Grok 4.7 |
| 4 | Two homeowners booked for Tuesday never showed up and nobody confirmed them the day before. | appointment_no_show / high | appointment_no_show / high | 20.1 s | Grok 4.7 |
| 5 | Our card was charged twice for November. Can someone fix this? | invoice_dispute / high | invoice_dispute / high | 9.2 s | Grok 4.7 |
| 6 | The calendar booking widget on our site stopped loading this morning. | tech_issue / high | tech_issue / high | 12.0 s | Grok 4.7 |
| 7 | Can we switch our ads from roofing to gutters for the next two weeks? | pause_or_change / normal | pause_or_change / normal | 13.4 s | Grok 4.7 |
| 8 | New client here, where do I upload our logo and service area? | onboarding / normal | onboarding / normal | 18.7 s | Grok 4.7 |
| 9 | Just wanted to say the new campaign is booking great jobs, thank you! | compliment / low | compliment / low | 11.6 s | Grok 4.7 |
| 10 | URGENT: claim your $500 gift card now, click this link | spam / low | spam / low | 17.1 s | Grok 4.7 |
| 11 | When will our monthly report arrive? It's usually here by the 5th. | other / normal | other / normal | 15.6 s | Grok 4.7 |
| 12 | If I get one more robocall from your team I'm reporting you. Stop calling me. | opt_out / urgent | opt_out / urgent | 8.2 s | Grok 4.7 |

## The monitoring report for this run (from `src/monitoring/metrics.js`)
| Metric | Value |
|---|---|
| Runs | 12 |
| Median time to a ready ticket | 12 s |
| 95% of tickets ready within | 20.1 s |
| Backup AI needed | 0% |
| Tickets needing a person's review | 0% |
| Alerts | none |

Notes: the first ticket's network connection dropped after it was answered, so its time was read from the console.
A small set like this shows the desk generalises to agency tickets; before going live for a new team I would run it on
50 to 100 of that team's real tickets.
