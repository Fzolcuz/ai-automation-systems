# 7. Ad Desk (in progress)

**Writes and checks Meta ads, and drafts a first reply to every new ad lead in seconds, ready for a person to approve.**

## Step by step
1. **Audit**: past ad leads were read and the delays measured: leads waited **85 hours** for a first reply. Speed to lead was the problem, not the ads.
2. **Safety rules**: spending limits in code that the AI cannot break; any change in ad spend needs a person's yes.
3. **Safety tests**: **32 tests** try to push the desk into overspending; all hold. (They live in the Ad Desk's own codebase, which is not in this repository.)
4. **Writing the ads**:
   * Claude Opus 5.5 writes the ad words (the strongest Claude, because we pay to show these words).
   * Two AI reviewers check every ad: one acts as a buyer panel, one as a strict rules editor.
   * An ad must **average 8 out of 10 and score at least 7 on every point**.
   * **At most 2 rewrites**, then a person decides, so it can never loop and waste money.
   * The long brief is **cached for 1 hour** and reused, so that part costs far less.
   * A person approves every ad.
5. **A new lead arrives** (n8n):
   1. **New Meta lead**: a lead form from Facebook or Instagram.
   2. **Prepare**: tidies the name, city and message.
   3. **Grok drafts the first reply** in the lead's own language, within **45 seconds**; or **Claude takes over** (90 seconds, 2 tries).
   4. **Monday row** for the sales team: lead quality (hot, warm, cold, junk), intent, region, hot score; **3 tries, 2 seconds apart**.
   5. **Wait for approval**: the workflow stops until a person approves; nothing is sent on its own.

## Results so far (last 30 days of tests)
Rs 16,862 (about $176) of ad spend. About Rs 6,800 of it brought **195 WhatsApp chats at about Rs 35 ($0.36) each**; about Rs 9,400 brought **277 Etsy shop visits at about Rs 34 ($0.35) each**.
