# Worked example: from "we are losing leads" to a running system

## 1. The loose problem
As it first arrived: buyers were replying, but deals were not moving, and nobody could say why.

## 2. Measuring it first (a sales audit of real conversations)
* Warm buyers waited **hours to days** for a reply. Ad leads waited **85 hours** for a first reply.
* A buyer who asked a price question was sent an **18-page company PDF** instead of an answer.
* Personal buyers were asked for **GST (business tax) details** they did not have.
* Some replies were written in **ALL CAPS**, and **promised call-backs** did not happen.
* Messages came in through **WhatsApp, LinkedIn, email, Etsy and a website inbox**, and nobody could see them all in one place. Many were in **Arabic**.

## 3. What that turned into (the spec)
| Finding | Requirement |
|---|---|
| Slow replies | Every message gets an urgency and a reply-by deadline, set by code: 2 h, 24 h, 3 days, 7 days |
| Wrong answers (PDF instead of price, GST to personal buyers) | A drafted reply that answers the actual question, under 80 words, one next step |
| ALL CAPS, broken promises | Rules in code after the AI: capitals, money promises and banned claims are flagged; a person approves every reply |
| Five inboxes | One intake (n8n webhook with a secret key), one board (Monday.com), one row per buyer |
| Arabic | Translate to English for the team; reply in the buyer's language |
| AI outages | Grok first with a timer; Claude takes over automatically; backup answers flagged |
| Repeats | Duplicate messages skipped |

## 4. Building it small, on real data
* First on **10 real conversations for 8 cents**, every result checked by hand.
* Then all **125 conversations: 219 messages, 0 errors, $1.01**.
* Then the live n8n path, tested four ways: a normal Arabic message, the same message again (skipped in 0.0 s), Grok forced to fail (Claude answered in about 8 s), and a wrong key (refused).

## 5. The result
* 17 buyers surfaced as urgent or high who had been waiting; 101 Arabic messages translated and answered in Arabic.
* 90 open jobs, each with an owner and a deadline, on the team's Monday board; 35 conversations correctly needed no action.
* The same pattern became the Support Desk (customer problems, faster deadlines: 1 h, 4 h, 24 h, 72 h) and the Ad Desk (a draft first reply in seconds instead of 85 hours).

## 6. Documented and handed over
A plain-English guide for the team, a slide deck explaining each step with the real numbers, a "small details" page with every timer and retry, and a walkthrough. This repository is the technical version of the same.
