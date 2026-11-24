# 5. Image Studio

**Turns one product photo into up to 24 studio pictures and a 15-second video, made by AI, with spending safety built in.**
Code: [`src/image-studio/kie_batch.py`](../src/image-studio/kie_batch.py). Checking website: SJF Lumière (team sign-in). Status: live.

## Step by step
1. **Pick the products**: a person picks rings from the catalogue folders.
2. **Plan**: a planner builds the request list for each ring: 24 shots (different angles, settings, on a model), each with its reference pictures. The picture instructions live in these private plan files.
3. **Check the references**: each reference picture is downloaded and checked to be a real, complete image before anything is sent; a broken link stops the run with nothing spent.
4. **Check the ledger**: anything already sent is never sent again: if it is still being made the run waits for it; if it was made, its result is fetched again for free. Only a failed request (which kie.ai does not charge for) may be sent again; a deliberate remake gets a new name.
5. **Check the cost**: the run prints what it will cost and stops before sending anything if that is more than `MAX_CREDITS`. Each run must also fit the budget of **Rs 3,500 (about $36)**.
6. **Test first**: always one test ring, checked by a person, before a group.
7. **Stage 1, three pictures**: the three shots that go wrong most often (in an audit: stones close-up 26%, marble 18%) are made first. When the model misreads a ring it misreads it in most pictures, so a misread ring now costs **18 credits instead of 144**.
8. **Stage 2, the other 21**: only after a person approves stage 1.
9. **Make**: kie.ai with **Nano Banana 2.1 at 2K**, **6 credits a picture** (GPT Image would be 10). One run waits up to an hour for every picture, polling every 8 seconds, so nothing is sent twice while kie.ai is busy.
10. **Save**: a cut-off download is fetched again from the same link (a complete video must contain its index), never remade. Every picture gets the house colour standard: red up and blue down by 2 out of 255, so diamonds look true to life; nothing else changes.
11. **Video**: **Veo 3.1 Lite** makes three short clips at **35 credits each**; code joins them into one 15-second video. The video is 42% of a ring's cost, so it is optional per product.
12. **New colours**: existing pictures are **recoloured**, not remade: 318 pictures for 1,908 credits.
13. **Record**: every request goes into the shared ledger, which is locked, re-read and merged before every write, so runs at the same time never overwrite each other.
14. **Text**: Claude writes the product titles and text in a half-price overnight batch.
15. **Evening check**: n8n at **8 pm** (or by hand) lists new photos, checks the cost against the budget and adds a status row on the team's Monday board.

## Cost
| Item | Credits | Rupees | Dollars |
|---|---|---|---|
| One picture | 6 | Rs 3 | $0.03 |
| One video clip | 35 | Rs 17.50 | $0.18 |
| 24 pictures | 144 | Rs 72 | $0.75 |
| 3 clips (15-second video) | 105 | about Rs 52 | $0.53 |
| **Full ring** | **249** | **about Rs 124** | **about $1.25** |

kie.ai was **half the price** of Atlas Cloud for pictures and **73% cheaper** for video.

## Results
127 rings processed, 1,200 pictures made so far (not every ring has the full set yet); 318 recoloured.

## What I would change next
* Move the "already sent?" check inside the ledger lock and write a "sending" entry before the paid call, so even a crash or two simultaneous runs can never pay twice.
* Check `MAX_CREDITS` during a run, not only when it is planned.
* Automatic checks of each picture against the CAD drawing, so a person only looks at the doubtful ones.
