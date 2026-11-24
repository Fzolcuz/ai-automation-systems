# 8. AI Telecaller (in progress)

**AI phone agents that call and answer jewellery buyers, then log a summary, the outcome and a follow-up task.**

## Step by step
1. **Scenarios**: 16 call situations across 3 markets.
2. **Agents**: built on **ElevenLabs** (the voice platform: listens, speaks, runs the call) with three personas: **Riya** for India, **Maya** in English, **Reem** in Gulf Arabic.
3. **The brain**: **Claude Haiku 4.5** decides what to say next.
4. **Opening line**: every call says it is an AI and that the call is recorded. It only calls people who asked to be called; never cold calls.
5. **Expert desk**: when a buyer asks about prices, minimum orders, or has a complaint, a real person types the answer live.
6. **Testing**: **48 test calls**, 0 serious failures, about **0.6 seconds** to the first word. Gemini was used as a listener to score whether a recording sounds like a real person.
7. **After the call** (n8n):
   1. Call finished: the agent hands over the call notes.
   2. **Grok** writes the summary and outcome within **45 seconds**, or **Claude** takes over (90 seconds, 2 tries).
   3. **Monday**: a call row, and a follow-up task with an owner under it; **3 tries each, 2 seconds apart**.
   4. A person takes the next step.

## Why each choice, and the cost
| Choice | Why | Compared with |
|---|---|---|
| Claude Haiku 4.5 as the brain | Fast, follows the rules; **513 credits a minute, about Rs 9 ($0.09)** | Claude Sonnet used 839 credits a minute (64% more) with no better calls; GPT-4.1-mini followed the rules worse |
| ElevenLabs voices | Most natural in our tests, about 0.6 s to answer | Rime and Sarvam were tested and compared |
| Says it is an AI | Honest with every buyer, and the law in many places | Hiding it would break trust |
| No cold calling | Only people who asked | Cold calling annoys buyers and risks complaints |

Total monthly cost we worked out: **3,000 minutes about Rs 32,000 ($333); 6,000 about Rs 62,000 ($646); 12,000 about Rs 1.22 lakh ($1,270)**, against about Rs 1 lakh ($1,040) a month for the current calling team.
