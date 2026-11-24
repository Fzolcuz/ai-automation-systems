# 6. Gold Catalogue and Live Price Engine

**Turns a pile of design photos into catalogues, and prices every design every day from the live gold, silver and rupee rates. No AI touches a price.**
Code: [`src/price-engine/rates.cjs`](../src/price-engine/rates.cjs) (production), [`src/price-engine/price.js`](../src/price-engine/price.js). Tests: [`tests/price-engine.test.js`](../tests/price-engine.test.js). Website: SJF Gold Live. Status: live.

## Step by step: the catalogue
1. **Collect**: about 19,700 jewellery designs collected from Pinterest through a Chrome tab.
2. **Clean**: free text reading and duplicate checks removed copies and pictures with AI watermarks: **17,929 photos** grouped into **8,569 designs**.
3. **Review**: Claude Sonnet helpers reviewed the designs once, before the catalogues.
4. **Build**: **102 catalogues, 2,671 pages**, by code.

## Step by step: the price
1. **Rates**: the catalogue prices are recalculated every day at 1 pm India time; the Gold Live website fetches the live rate on demand (cached for 6 hours):
   * Gold and silver: **gold-api.com** (spot), backup **Yahoo Finance** (front-month futures, close to spot).
   * Rupee: **open.er-api.com**, backup **frankfurter.dev**; the pound the same way.
   * Each source gets **6 seconds** to answer.
2. **Is the number believable?** Checked two ways:
   * **Outer limits**: gold $1,000 to $12,000 an ounce, silver $10 to $300, rupees per dollar 60 to 130, rupees per pound 80 to 170.
   * **Daily band** against the last saved rates: metal may not move more than **40%**, the rupee more than **15%**.
   * Two sources that disagree by more than **5%**: the one closer to the saved rate wins; with nothing to judge by, it says nothing rather than guess.
3. **Fallback**: if nothing believable comes back, the site keeps the saved rates and says "(saved rates)" next to the date. The rate is cached for 6 hours (and served while refreshing for up to 12 more), so the site never breaks.
4. **Work out each price**: only the **metal** part moves: metal value × (today's rate ÷ the manager's reference rate). Fixed parts:
   * Making charge: **Rs 800 (about $8.30) a gram on gold, Rs 500 (about $5.20) on silver**.
   * Lab-grown diamonds: **Rs 10,000 to 22,000 (about $104 to $229) a carat**, by carat slab.
   * Four prices per design: **18K, 14K, 9K gold and 925 silver**, shown in rupees, dollars or pounds.
5. **Recalculate everything**: **129,752 price entries** across all catalogues and metals, by code.
6. **Audit**: every price recalculated a second, separate way: **0 mismatches**. When diamond prices rose 25%, 2,092 prices changed and 5 audits confirmed them.
7. **A person** approves big changes.
8. **Early warning**: an n8n workflow (built and ready to switch on) checks the rate at 1 pm and adds an alert row on Monday if gold moves more than **3%** or the rate is missing; otherwise it logs "all well".

## Why no AI
A price must be exact and the same every time. AI can make mistakes with numbers. One bad rate would reprice every item wrongly, which is why every number is checked twice before it counts. The rate services are free, so there is no daily AI bill.
