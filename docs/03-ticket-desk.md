# 3. Ticket Desk

**Turns every reply that needs action into a job: what to do, who does it, and by when.**
Same engine as the Buyer Desk (module `buyer`): the Buyer Desk is about the **person** (who they are, how ready to buy), the Ticket Desk is about the **job**. Status: live.

## Step by step
1. **Reply arrives** from WhatsApp, LinkedIn or email, into n8n (secret key, duplicate check, as in the Buyer Desk).
2. **Grok reads the whole conversation** (45-second timer in n8n; Claude backup, 90 seconds, 2 tries) and works out what the buyer wants.
3. **The ticket**: the action, the owner, the urgency, plus a ready reply in the buyer's language.
   * Actions seen in the real conversations: follow up, send catalogue, send quote, partnership call, custom design brief, arrange sample, process order or payment.
   * Owners: telecaller, director, export or production. The team can change the owner on the board in one click.
4. **No action needed, no ticket**: of 125 conversations, 35 needed no action (or only a polite close), so 90 became tickets.
5. **Rules check**: stop requests, banned claims, money promises, under 70% sure goes to a person.
6. **Deadline by code**: urgent 2 h, high 24 h, normal 3 days, low 7 days.
7. **Monday**: board **SJF Ticket Desk**, colour-coded and grouped by urgency; 3 tries, 2 seconds apart.
8. **A person approves** the reply; the website shows the same tickets live with filters, approve and run again.

## The 90 open tickets
| Action | Tickets | Usual owner |
|---|---|---|
| Follow up | 41 | Telecaller |
| Send catalogue | 22 | Telecaller |
| Send quote | 14 | Director |
| Partnership call | 7 | Director |
| Custom design brief | 3 | Production |
| Arrange sample | 2 | Production, export |
| Process order or payment | 1 | Export |

By owner: telecaller 57, director 23, export 9, production 1.

## Cost
125 conversations turned into 90 tickets for **$1.01**, under one cent each.
