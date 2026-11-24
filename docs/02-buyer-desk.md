# 2. Buyer Desk

**Every buyer reply from WhatsApp, LinkedIn and email: read, translated, ranked by how ready the buyer is, and answered in the buyer's own language.**
Engine: [`src/desk-engine/engine.js`](../src/desk-engine/engine.js), module `buyer`. Status: live.

## Step by step

### 1. Collect
All conversations are read from the database, **read-only**: the desk can never change a customer record. The AI reads the **whole conversation**, not just the last line.

### 2. Through n8n (the live path for new messages)
1. **Doorbell**: a webhook that needs our secret key in the request header; a wrong key is refused at the door (tested: refused with 403).
2. **Duplicate check**: n8n remembers the **last 500 messages** (sender and text) in its saved workflow data; the same message again is skipped in **0 seconds**.

### 3. Grok reads it
* **Model**: Grok 4.7 (xAI), temperature 0 (the same answer every time), with a **strict JSON schema**, so it can only answer in our fixed form.
* **Timer**: **40 seconds** on the website, **45 seconds** in n8n.
* **The form it fills**: language, the message in English, brand, buyer type, what they want, urgency (urgent, high, normal or low only), hot score 0 to 10, owner, summary, a draft reply in the buyer's language plus its English, next step, confidence.
* **Real example** (a buyer in Lebanon, in Arabic): "I want photos and models of your jewellery" became: to answer next, high, hot 6/10, a reply in Arabic asking which category to send first, next step: the telecaller sends a short photo selection today.

### 4. If Grok fails, Claude takes over by itself
* **Who decides Grok failed**: our own code. Every AI call runs on a stopwatch.
* **Counts as failed**: no answer within the timer, an error from Grok's server, or an answer that is not in our fixed form.
* **Then**: Claude Opus 5.5 is called at once with the same form: a **45-second** timer on the website; **90 seconds with 2 tries, 2 seconds apart** in n8n.
* **The team knows**: the ticket is marked "answered by backup AI" and a person checks it.
* **Both fail**: nothing is sent and nothing is guessed; the screen says both failed.
* **Proven live**: with Grok switched off, Claude answered in **about 8 seconds**.

### 5. Code checks (rules the AI cannot break)
* "Stop contacting me" (and similar), checked on the original and the English translation: always **urgent**.
* Scores are kept between 0 and 10.
* A reply that promises money, says "cheapest" or "best", or shouts in CAPITALS is **flagged**.
* **Below 70% confidence**: a person decides.

### 6. Deadline, set by code
Urgent **2 hours**, high **24 hours**, normal **3 days**, low **7 days**.

### 7. Monday.com
* Board **SJF Buyer Desk**: one row per buyer, **125 rows**.
* Columns: urgency, action, owner, channel, brand, language, country, hot score, due in, what they want, next step. Groups: Urgent, High, Normal, Low.
* Inside each row (as an update): the buyer's message, the English translation and the drafted reply waiting for approval.
* Written with **3 tries, 2 seconds apart, 60-second limit**; if Monday is down the answer is still returned and never lost.

### 8. A person approves and sends
On the SJF AI Desk website the team sees every buyer, can filter, approve a reply, or run the desk again on the latest message. Phone numbers are masked on screen.

## Results
125 real buyer conversations, **219 messages read, 0 errors, $1.01 in total** (about half a cent to one cent per message). 17 marked urgent or high. 101 Arabic messages translated and answered in Arabic. Tested first on 10 conversations for 8 cents, checked by hand, then all 125.

## Why each choice
| Choice | Why | Why not the alternative |
|---|---|---|
| Grok 4.7 | Strong in Arabic and English, reliable with a fixed form, about half a cent to one cent per message | Grok 4.3 is cheaper and fine for simple sorting, but these words reach real customers |
| Claude Opus 5.5 as backup | The most reliable Claude; it only runs when Grok fails, so its price barely matters | A backup must never be the weak link |
| Rules after the AI | Stop requests, money promises and unsure answers must never go wrong | Asking an AI to "be careful" is not a guarantee |
| n8n | Free, unlimited, data stays with us | Zapier and Make charge per step |
| Monday.com | One shared board with owners, colours and deadlines the team already understands | A spreadsheet has no owners, deadlines or alerts |
| Built twice (code and n8n) | Many teams prefer to see and edit the boxes | |

## What I would change next
Learn each buyer's preferred language and channel from history, and alert the owner when a hot buyer has waited 30 minutes.
