# 1. Lead Gen Command Centre

**Finds businesses, checks each one is a real buyer, writes a personal first message, quality-gates it, and hands it to a person to send.**
App: Next.js on Vercel, data in Supabase. Status: live since 28 Sep 2026.

## Step by step

### 1. Find businesses
* **Tools**: LinkedIn Sales Navigator (11 saved searches), Apify (Google Maps place lists and Instagram pages), web search.
* **Free first**: TinyFish (up to 1,000 website reads a day) and Tavily (1,000 searches a month) are used before anything paid.
* **Apify costs**: Google Maps lists at about $0.45 per 1,000 places (for example 7,889 places for $3.55); a WhatsApp check of a number about $0.0017 (690 numbers checked for $1.09, 54 confirmed on WhatsApp). Every Apify run is logged with its cost.
* **Decision makers only**: owner, founder, MD, CEO, partner, head buyer or an independent broker. Never sales staff.
* **Channel priority** (since 10 Nov 2026): WhatsApp, then LinkedIn, then email, because email replies were weakest.
* **Example day**: 4,085 LinkedIn profiles sorted down to 1,619 decision makers in one day, for about $20 in tools.
* **Out**: a list of businesses in the database.

### 2. Check each business
* **Tools**: Jina Reader turns each website into plain text; Claude Haiku 4.5 (the small, cheap model) reads it.
* **What it decides**: real potential buyer or not (wholesaler, retailer, broker, distributor, gifting company), and never a manufacturer, chain, franchise or big retail group.
* **Also**: a short research note on each business and its Instagram page.
* **Out**: approved or rejected, with a reason. **1,836 businesses with websites checked, 831 approved.** LinkedIn decision makers are qualified on their profile instead: one day sorted 4,085 profiles down to 1,619.

### 3. Rank the approved leads
* Every approved lead gets a buy rank from 1 to 10; the daily release sends the highest-ranked first.
* An owner search swaps a shop's general contact for the owner's own profile where one is found.

### 4. Write the first message
* **In the app**: Claude Sonnet 5.5 writes each personal first message from the research note.
* **Overnight batches**: large groups go through Anthropic's Message Batches, which cost **50% less**, and the long rules block is cached, so every reuse of it costs **90% less**. Both discounts stack. One overnight run wrote **351 personal letters for $10.30, about 3 cents each** (that run used Claude Opus 5.5 at the batch price). A spend limit stops a batch before it passes its budget.
* **Arabic**: Gulf buyers get WhatsApp messages in Arabic, checked by a second editor pass written for a native Gulf reader (about 5 cents extra per Arabic lead).
* **Follow-ups**: a 4-step WhatsApp follow-up sequence per lead, and email follow-ups that send automatically on a set cadence.
* **Daily run**: at 10:00 each day the system releases that day's quota of drafted leads to the team.

### 5. Quality gate (nothing under 7 out of 10 goes out)
1. Sonnet writes the message.
2. Haiku marks it on 5 points (about this business, warm, short, clear, no forbidden claims), each out of 10.
3. Any mark under 7: Sonnet rewrites it.
4. Haiku marks it again; only a pass moves on.
5. **Code checks** that no AI can talk its way past ([`src/lead-gen/quality-checks.js`](../src/lead-gen/quality-checks.js), a generalised version): no invented clients ("we already work with partners across the United States" was once scored 9/10 by an AI grader; now code blocks it), no prices, no turnaround promises, no headcounts, no "free" offers, no exclamation marks, no template openers, no banned words, no claims the company's facts file does not allow.

### 6. Safety gate before sending
* A **do-not-contact list of 233 people**, blocked by code, always.
* Daily caps per channel.

### 7. Send
* **Email**: automatic, with a daily limit per inbox that grows week by week as the inbox builds trust, so emails do not land in spam.
* **WhatsApp**: sent by a person from the AI draft, **10 to 15 a day per number**.
* **LinkedIn**: a person sends an invite with a personal note, then a message, written after reading the profile.

### 8. Replies
* **n8n, every 30 minutes**: reads new replies from the database (read-only, 60-second limit), puts them in one shape, stops if nothing is new, and hands each one to the SJF Inquiry Desk (2-minute limit), where Grok sorts it and a Monday row is created (see Buyer Desk).
* All replies land in one inbox for the director, and the customer list stays up to date.

## Results (28 Sep to 23 Nov 2026)
| Channel | How it is sent | Messages | Contacts reached |
|---|---|---|---|
| WhatsApp | By a person, from AI drafts (Arabic by Sonnet) | 2,475 | 880 |
| Email | Automatic, daily limit grows weekly | 1,028 | 562 |
| LinkedIn | By a person: invite, then message | 849 | 793 |
| **Total** | | **4,352** | **2,235** |

Contacts are counted per channel (2,235 = 880 + 562 + 793). 3,198 of the messages were sent in November alone.
**125 buyers replied** and are tracked as conversations in the Buyer Desk; WhatsApp brought the highest share of replies, then email, then LinkedIn.
A second Sales Navigator test: 210 personal invitations over 2.5 weeks brought 28 acceptances and 13 real replies (6.4%).

## What it costs
| | Sep | Oct | Nov (to 23rd) |
|---|---|---|---|
| Pay-per-use AI (logged job by job) | $3.40 | $9.61 | $0.05 |
| Apify | | about $24 across Oct and Nov | |

* Pay-per-use total: **about $37 over three months, about $12 a month**, under 1 cent per message.
* The overnight batches ($62.06 on 28 Oct and $4.27 on 29 Oct) ran on **free Anthropic API credits**: $0 cash.
* From November the drafting runs on my Claude plan, which is why November's pay-per-use AI is $0.05.
* App AI log since 21 Sep: $13.05 for 825 jobs (Haiku: 502 jobs, about $2.55; Sonnet: 323 jobs, about $10.50).
* Not counted: subscriptions (Claude plan $100 a month, LinkedIn Sales Navigator Rs 9,000, about $94, a month) and hosting shared with the other sites (about $30 a month). **All-in, about $236 a month.**

## Speed
The dashboard keeps the last lead list in the browser, so a repeat visit shows the numbers in about 1.5 seconds instead of about 10 (the full list is 27.7 MB for 4,175 leads and loads in the background).

## Why each choice
| Choice | Why | Why not the alternative |
|---|---|---|
| Haiku for checking | Simple, repeated hundreds of times: the cheapest model that does it well | Sonnet would cost about twice as much for the same marks |
| Sonnet for writing | A real buyer reads it, often in Arabic | Opus writes no better for short letters and costs about twice Sonnet |
| Grok for replies | Strong in Arabic and English, fills a fixed form reliably | Claude Opus stays as the backup so replies never stop |
| Overnight writing | Half price; letters are not needed within the minute | Writing live in the day costs double |
| n8n | Free on our own computer, unlimited runs, data stays with us | Zapier and Make charge for every step |
| WhatsApp and LinkedIn by a person | Those platforms block accounts that behave like robots | Email is safe to automate, within a daily limit |

## What I would change next
Track reply rates per message style so the writing improves from real replies, and merge the research and writing into one batch.
