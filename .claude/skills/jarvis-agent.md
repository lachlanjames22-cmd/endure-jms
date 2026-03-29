# Jarvis Agent — Endure Decking

## Architecture
Jarvis is a server-side agentic loop running on Anthropic claude-opus-4-6.
Entry point: `POST /api/agent/message`
Tools: `lib/jarvis/tools.ts`
Execution: `lib/jarvis/execute-tool.ts`
Context: `GET /api/agent/context` — fetched fresh on every message

## System prompt
Lives in `app/api/agent/message/route.ts` as the `JARVIS_SYSTEM` constant.
To update Jarvis's personality or rules, edit this constant.
Key rules already in prompt: GP on labour value only, cite specific evidence, end with one action.

## Agentic loop
```
1. Fetch full business context (cash, jobs, pipeline, payroll, DNA, cashflow events)
2. Fetch active agent_memory rows
3. Fetch conversation history for the session
4. POST to Anthropic with: system prompt + context + memory + history + new message
5. If response contains tool_use: execute tool, append result, loop (max 6 iterations)
6. Extract <save_memory> tags, persist to agent_memory table
7. Save user + assistant messages to conversation_history
8. Return final text response
```

## Tools (7)
```
update_job              — update job status or fields (needs job UUID)
create_job              — create new job record
create_cashflow_event   — insert cashflow event
update_cashflow_event   — update existing cashflow event (e.g. mark paid)
run_quote_calculation   — call /api/quotes and return result
log_material_purchase   — create outflow cashflow event for materials
update_opening_balance  — update settings.opening_balance
```

## Memory system
Jarvis can save memories using `<save_memory>` tags at end of responses:
```
<save_memory type="decision|preference|context|instruction">content</save_memory>
```
Memories persist in `agent_memory` table, loaded back into context every message.
Active memories only (`active: true`).

## Sessions
Each conversation is a session in `jarvis_sessions` table.
History stored in `conversation_history` with `{ channel, session_id, role, content }`.
Channel: 'app' for in-browser, 'whatsapp' for WhatsApp messages.

## WhatsApp
Receive-only webhook at `/api/webhooks/whatsapp` — TwiML.
Inbound messages go through same Jarvis loop.
NO outbound push capability — can only reply to inbound messages.
To add outbound: needs Twilio REST API (separate from TwiML).

## Context snapshot (what Jarvis sees every message)
```
cash_position           — today's balance, 30-day projection, lowest point
alerts                  — cash warnings, overdue invoices
jobs                    — all active jobs (status, value, GP, days)
pipeline                — quoted jobs, win rate
payroll                 — next payroll date + amount, cash after payroll
dna_intelligence        — recent completed jobs with DNA scores
cashflow_events         — next 60 days upcoming + last 14 days paid
agent_memory            — all active saved memories
```

## Morning brief
Separate endpoint: `POST /api/agent/brief`
Auto-fires on new session in the Jarvis chat UI.
One-shot — no tool use, no memory save. Just a situational summary.

## Frontend
Chat UI: `app/(app)/jarvis/jarvis-chat.tsx` (~1800 lines)
Features: sessions panel, memory panel, morning brief auto-fire, starter prompts.

## What Jarvis cannot do yet
- Proactively push messages (no outbound WhatsApp)
- React to DB changes in real time (no Supabase Realtime subscriptions)
- Read skill files from disk (skills only help Claude Code, not in-app Jarvis)
- MYOB integration (not started)
