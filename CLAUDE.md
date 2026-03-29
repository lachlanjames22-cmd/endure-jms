# Endure OS — Claude Code Context

## Business
Endure Decking, Perth WA. Owner: Lachlan James (Lachy).
Residential decking installation — timber and composite. Full subframe, over-concrete, redeck.
2-person field crew: Baylee Taylor (leading hand) + Marius Hauser. BDM handles sales.
Operating model: quote → win → cashflow claims (10/50/20/20) → build → close → DNA review.

## Stack
- Next.js 14 App Router, TypeScript, Tailwind CSS — deployed on Vercel
- Supabase (Postgres + Auth + Storage) — never modify schema without reading lib/types/database.ts first
- Anthropic claude-opus-4-6 — powers in-app Jarvis agent
- Two client types: `lib/supabase/client.ts` (browser, anon key) and `lib/supabase/admin.ts` (service role, RLS bypass — server only)

## App Routes
- `/dashboard` — hero KPIs, scorecard, pipeline summary, alerts
- `/ops` — job kanban, job costing (actuals), scheduling
- `/finance` — cashflow chart (30-day rolling), GP dashboard, Profit First accounts
- `/sales` — quote calculator, pipeline, site visit tool (`/sales/site-visit`)
- `/hr` — crew cards, sentiment, timesheets
- `/marketing` — ad performance
- `/jarvis` — in-app AI agent chat with memory and tool use
- `/settings` — business settings

## Architecture Rules
- Never modify `/app/api/quotes/route.ts` quote calculator logic — it is the financial source of truth
- Never change Supabase schema — work with existing tables only
- Check `lib/types/database.ts` before any Supabase query to get correct column names
- Use `createAdminClient()` only in server routes, never in client components
- All cashflow amounts stored ex-GST. GST applied at display layer only
- GP is always calculated on labour value, never on total revenue
- `actual_gp_pct` stored as decimal (0.45 = 45%) — not percentage integer
- Job status flow: `quoted → won → scheduled → in_progress → complete` (also `lost`, `on_hold`)
- When a job moves to `won`, 4 cashflow claims auto-generate (10/50/20/20 split) — see `app/api/jobs/[id]/route.ts`

## Key Business Numbers (fallback constants — DB is source of truth)
- GP target: 45% | Amber: 36%
- Labour charge-out: $2,400/day | Backcost: $1,800/day
- Revenue/hr target: $100 | Amber: $80
- Cash warning: $20k | Cash critical: $10k
- Monthly fixed costs: ~$33,725 (labour $25,010 + opex $8,715)
- Payroll: fortnightly Thursdays

## Jarvis Agent (in-app)
System prompt lives in `app/api/agent/message/route.ts` as `JARVIS_SYSTEM`.
Tools (7): `update_job`, `create_job`, `create_cashflow_event`, `update_cashflow_event`, `run_quote_calculation`, `log_material_purchase`, `update_opening_balance`
Context fetched fresh on every message via `app/api/agent/context/route.ts` — includes cash position, jobs, pipeline, payroll, DNA, cashflow events.
Memory persisted via `agent_memory` table using `<save_memory>` tags in responses.
Skills for Jarvis will be loaded via context route — not yet implemented.

## Available Skills
Read these before working on related areas:

| Skill | When to read |
|---|---|
| `.claude/skills/quote-logic.md` | Touching quote calc, pricing, margins, GP |
| `.claude/skills/profit-first.md` | Touching PF accounts, allocations, owner pay |
| `.claude/skills/job-dna.md` | Touching DNA scoring, efficiency, retrospectives |
| `.claude/skills/cashflow.md` | Touching cashflow events, claim schedule, projections |
| `.claude/skills/jarvis-agent.md` | Touching agent loop, tools, system prompt, context |

## Do Not Touch
- Quote calculator logic (`app/api/quotes/route.ts`)
- Supabase schema
- Auth setup (middleware.ts, lib/supabase/) — auth bypass is not active, keep it working
