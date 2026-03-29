# Profit First — Endure Decking

## Concept
Profit First is a cash management method where revenue is split across dedicated bank accounts
before expenses are paid. Endure uses 5 accounts.

## The 5 Accounts
```
INCOME      — all revenue lands here first, then gets allocated out
PROFIT      — owner's profit reserve (target: 5% of revenue)
OWNER PAY   — Lachlan's salary account (target: 30% of revenue)
TAX         — GST + income tax reserve (target: 15% of revenue)
OPEX        — operating expenses — everything else runs from here
```

## Allocation logic
On receipt of any inflow (deposit, claim payment):
1. Land in INCOME
2. Allocate percentages to each account
3. Pay expenses only from OPEX
4. Never touch PROFIT unless quarterly distribution

Target percentages (adjust as business matures):
```
PROFIT:    5%
OWNER PAY: 30%
TAX:       15%
OPEX:      50%
```

## DB table: pf_accounts
```
name    — 'income' | 'profit' | 'owner_pay' | 'tax' | 'opex'
balance — current balance (numeric)
```

Type: `PFAccountName = 'income' | 'profit' | 'owner_pay' | 'tax' | 'opex'`

## API routes
- `GET /api/pf-accounts` — returns `{ income, profit, owner_pay, tax, opex }` as object
- `PATCH /api/pf-accounts` — update a single account balance `{ name, balance }`

## Key rules
- All amounts are ex-GST in DB. GST collected flows into TAX account
- Owner pay day: Tuesday (fortnightly)
- Quarterly Profit distributions: transfer from PROFIT to personal
- OPEX account must cover: crew wages, materials, van, insurance, software, ads
- Monthly fixed costs ~$33,725 — OPEX account must maintain buffer
- If OPEX runs low, do NOT touch PROFIT — find revenue first

## Jarvis context
Jarvis sees current PF account balances via `/api/agent/context`.
Tool: `update_opening_balance` — updates cash opening balance in settings.
No tool yet for direct PF allocation — manual via settings page.
