# The SJF AI Desk (command centre website)

(The website's own code is not in this repository; the engine it calls is.) One website that brings all eight systems together, so the director and team see who needs an answer now, in which language, and what to send. Static page plus serverless functions on Vercel.

* **Overview**: buyers tracked, messages processed, buyers to answer next, urgent or high, not in English; where conversations stand; languages; every system with its live link.
* **Live engine** (`/api/run`): the desk engine in this repository, for every module, with Grok first and Claude as backup.
* **Connections** (`/api/health`): checks Grok, Claude and Monday live on every page load and shows a light for each; keys are never shown.
* **Run history**: every run with the AI that answered, how long it took, urgency, and whether Claude took over.
* **Buyers and tickets**: filters by urgency, the full conversation, the translation, the draft reply, approve, and run again on the latest message.
* **Safety**: an access code on every private screen; phone numbers masked on screen; **40 runs an hour** per visitor; messages longer than **6,000 characters** refused.
