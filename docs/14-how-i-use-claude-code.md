# How I build with Claude Code

I design the system and the rules; Claude Code writes and runs the code; I test every result on real data and
decide what ships. I work mostly by voice, in plain English, and I can explain every step of every system.

## The loop, every time
1. **Plan first.** A short written plan: the steps, the files, what "done" means, and anything that costs money (which I approve before it runs).
2. **Test on 3 to 5 real items first.** One test ring before a group of images; 10 conversations before 125; 12 tickets before a new desk goes live.
3. **Build.** Claude Code writes the code and the tests.
4. **Check the result myself** against the real data, not just the tests.
5. **Independent review.** A separate AI reviewer that has not seen the build reads the work like an outsider and lists what is broken, inconsistent or weak. This repository went through that loop three times: 6.5 → 8 → 8 out of 10 against Vroom's job description, with every finding fixed or stated honestly in [STATUS.md](../STATUS.md).
6. **Fix, re-test, log.** Every finished job is logged with exact numbers (what, how many, cost, retries).

## The rules I give Claude Code
A standing rules file is loaded into every session. A cleaned copy is in [`claude/CLAUDE.example.md`](../claude/CLAUDE.example.md). The rules that matter most:
* Never spend money, create accounts, enter payment details or accept terms without asking first.
* Keys live only in local settings files; they are never printed, logged or put in code.
* Explain every technical decision in plain English.
* Repeat work goes into a script, tested on 3 to 5 items before the batch; image or video generation always starts with one test item.
* Log every finished job with exact numbers for the nightly director's report.
* Keep the computer safe: heavy jobs run through a guard that pauses them above 89% CPU.
* Read only what is needed (search first, then read the lines that matter), and use helper agents only when work truly splits, on the cheaper models.
