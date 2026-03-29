# Cashflow — Endure Decking

## DB table: cashflow_events
```
id               — uuid
job_id           — FK to jobs (nullable — opex/payroll events have no job)
type             — 'inflow' | 'outflow'
category         — see categories below
label            — human readable description
amount           — ex-GST, always positive
scheduled_date   — when expected
paid_date        — when actually received/paid (null = unpaid/pending)
auto_generated   — true if created by job-won flow
pf_allocation    — 'income' | 'profit' | 'owner_pay' | 'tax' | 'opex' | null
recurring        — boolean
recur_rule       — 'fortnightly_tuesday' | 'monthly_1st' | null
```

## Valid categories (CashflowCategory type)
```
Inflows:
  deposit           — 10% on job won
  materials         — 50% materials claim
  subframe_claim    — 20% subframe claim
  completion_claim  — 20% final payment
  materials_claim   — generic materials inflow

Outflows:
  payroll           — crew wages
  materials         — material purchases
  opex              — operating expenses
  tax               — GST + income tax
```

## Claim schedule (auto-generated on job → won)
```
10% deposit         — scheduled_date = won_date
50% materials       — scheduled_date = won_date + 7 days
20% subframe        — scheduled_date = won_date + 21 days
20% completion      — scheduled_date = won_date + 35 days
```
Logic lives in `app/api/jobs/[id]/route.ts` PATCH handler.
Duplicates prevented: checks for existing `category='deposit'` before creating.

## Cash position calculation
Opening balance from `settings` table key: `opening_balance`

Running balance = opening_balance + all paid inflows - all paid outflows
Projected balance = running balance + all future scheduled events

30-day projection built in `app/api/cashflow/route.ts` GET handler.

## Warning thresholds
```
Cash warning:  $20,000  — amber alert
Cash critical: $10,000  — red alert
Negative:      $0       — system critical
```

## API routes
- `GET  /api/cashflow?days=30` — returns day-by-day projection array + summary
- `POST /api/cashflow` — insert a cashflow_event row directly
- `PATCH /api/cashflow` — update existing event `{ id, ...fields }`
- `GET  /api/cashflow/events` — returns flat list for CashflowTracker component

## Jarvis tools
- `create_cashflow_event` — insert new event
- `update_cashflow_event` — update existing event (mark paid, change amount)
- `update_opening_balance` — update the opening_balance setting

## Common patterns
Mark deposit received:
```
PATCH /api/cashflow { id: <uuid>, paid_date: '2026-04-01' }
```

Create ad-hoc expense:
```
POST /api/cashflow {
  type: 'outflow', category: 'opex',
  label: 'Van service', amount: 450,
  scheduled_date: '2026-04-10', paid_date: '2026-04-10'
}
```
