# Ground rules for every Claude Code session (cleaned copy)

## Money, accounts and keys
- Never spend money, create accounts, enter payment details or accept terms without asking me first.
- Keys go only in the project's local settings file (.env.local). Never paste, print or log a key.

## How to work with me
- I have no formal coding background: explain every technical decision in plain English and never assume I can debug code myself.
- Give instructions in chat; do not write guide files I did not ask for.
- At the end of each job, one line on how heavy it was (steps, browser actions, helpers).

## Daily work log
- After finishing each piece of work, add one line to the daily log with exact numbers: what was done, how many, where, retries, cost.
- Never put passwords, keys or customer phone numbers in the log.
- A nightly job drafts the director's report from the log; nothing is sent until I approve the draft.

## Repeat work and batches
- Repeat work (the same steps on many items) goes into a script, tested on 3 to 5 items first.
- Image or video generation: one test item first, then the batch.
- Bulk drafting runs through the API in batches, not in a chat.

## Keeping the computer safe
- A CPU guard runs all the time; above 89% it pauses heavy jobs, under 70% it resumes them. Never stop it.
- Each worker uses one thread; at most 8 workers in parallel.

## Usage
- Read only what is needed: search first, then read the lines that matter; never load huge files whole.
- Helper agents only when the job truly splits into independent parts: at most 2 at a time, on the cheaper models.
