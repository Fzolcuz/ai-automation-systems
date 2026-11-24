# How I work

## From a loosely defined problem to a documented solution
1. **Find the real cost first.** Before building anything I measure the problem. Our ad leads waited 85 hours for a first reply: that number told me to build for speed, not more ads.
2. **Map how the work flows today.** Where messages come in, who touches them, where they get stuck. At SJF: three apps (WhatsApp, LinkedIn, email), many replies in Arabic, nobody seeing it all in one place.
3. **Build the smallest useful version on real data.** 10 real conversations for 8 cents, checked by hand, then all 125. One test ring before a group of images.
4. **AI for judgement, code for rules, a person for the final yes.** The AI reads and drafts; rules that must never break are plain code; under 70% sure goes to a person; every AI call has a timer and a backup.
5. **Put results where the team already works.** Monday.com rows with an owner and a deadline, so nobody learns a new tool.
6. **Keep it cheap, then measure and improve.** The cheapest model that does the job well, half-price overnight batches, cached instructions, credit caps; then watch the numbers and fix what they show.

## How I build
* I design the system and the rules; Claude Code writes the code; I test everything on real data before it goes live, and I can explain every step.
* Every system is written up in plain English for the people who use it, then improved from their feedback.
* Instructions (prompts) are tested on real samples before they go live (for example 12 support tickets of every type, 10 buyer conversations) and versioned; when results drift, the run log shows it (see [monitoring](../src/monitoring/metrics.js)).

## Documentation and training
For every system I produce: a plain-English guide for the team, a slide deck that explains it step by step with real numbers, a "small details" page (timers, retries, limits, costs), and a walkthrough. The SJF team uses spoken daily reports in English, Hindi and Gujarati because that is how they work best: the tools fit the team, not the other way round.

## Measuring results
| What | How it is measured | Example |
|---|---|---|
| Speed | Time from message to a ready draft | 85 hours to first reply before; a draft in about 10 to 20 seconds now |
| Accuracy | Share of test tickets sorted correctly | 12 of 12 |
| Reliability | Errors, backup-AI rate | 219 messages, 0 errors; Claude takeover in about 8 s when Grok is off |
| Cost | Cost per message, per lead, per image | under 1 cent a message; about $1.25 a ring |
| Output | Messages sent, replies, tickets created | 4,352 messages, 125 buyers replied, 90 tickets |
| Time saved | Runs × the measured minutes a person used to spend | from [`metrics.js`](../src/monitoring/metrics.js) |

## Choosing tools
Every tool was chosen by testing it against an alternative on real work. The numbers behind each choice:

| Decision | Tested against | The numbers |
|---|---|---|
| Grok 4.7 for reading replies | Grok 4.3 | 4.7 costs $2 / $6 per million tokens in / out, 4.3 costs $1.25 / $2.50. At our message size 4.7 is still under 1 cent a conversation ($1.01 for 125), and these words reach customers, so the stronger model wins |
| Claude Opus 5.5 as the backup | Running two cheap models | Opus costs $4 / $20 per million, but only runs when Grok fails (0 of 12 unseen tickets needed it), so its price barely matters |
| Claude Haiku for checking and grading | Claude Sonnet | Haiku did 502 Lead Gen jobs for about $2.55 (about half a cent each); Sonnet did 323 writing jobs for about $10.50 (about 3 cents each). Grading with Sonnet would cost about twice as much for the same marks |
| Claude Sonnet for writing | Claude Opus | Opus wrote no better short letters and costs about twice Sonnet |
| Overnight batches | Live calls | 50% off, plus 90% off the cached rules block: 351 personal letters for $10.30 |
| Claude Haiku as the voice brain | Claude Sonnet, GPT-4.1-mini | Haiku 513 credits a minute (about $0.09), Sonnet 839 (+64%) with no better calls; GPT-4.1-mini followed the call rules worse |
| ElevenLabs voices | Rime, Sarvam | Most natural voices in blind listening tests; about 0.6 s to the first word |
| kie.ai for images and video | Atlas Cloud, fal | Pictures half the price, video 73% cheaper; an 8-second Veo clip about $0.175 on kie.ai against about $0.40 on fal; a 6-page monthly plan about $133 on kie.ai against $248 to $366 on Atlas |
| Nano Banana 2.1 at 2K | GPT Image | 6 credits a picture instead of 10, same quality in side-by-side checks |
| n8n self-hosted | Zapier, Make | $0 per run on our own computer; Zapier and Make charge for every step of every run |
| Free search and reading first (TinyFish, Tavily, Jina) | Paid scrapers | TinyFish 1,000 reads a day and Tavily 1,000 searches a month free; Apify only where cheaper than doing it by hand (about $0.45 per 1,000 map places) |
| Monday.com | A spreadsheet | Owners, colours, deadlines and alerts the team already understands |
