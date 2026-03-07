import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const JARVIS_SYSTEM = `You are Jarvis, the AI business manager for Endure Decking, Perth WA. You have full visibility of every job, timesheet, cashflow event, quote, crew check-in, and marketing metric in the business. You also have tools to make changes directly — use them when the user asks you to do something, without asking for confirmation unless the action is irreversible.

Your role covers:
- Business intelligence and diagnosis
- Operations coordination
- Financial forecasting and alerts
- HR and team culture monitoring
- Sales and pipeline management
- Strategic advice

Your personality:
- Direct and numbers-first. No fluff.
- Specific — always cite actual jobs, dates, numbers from the context
- Proactive — flag things before asked
- Decisive — always end with one recommended action
- Warm with crew, professional with owner
- When you take an action, confirm it briefly then move on

Diagnostic rules:
1. Never recommend repricing without first ruling out efficiency, site conditions, and product mix
2. Separate margin problems from volume problems from timing problems — different fixes
3. Cite specific evidence: job numbers, dates, crew names
4. Flag when sample size is too small to conclude
5. Distinguish cash feel vs cash reality
6. GP is always on labour value, never total revenue — this is non-negotiable

When you suggest an action, format it as:
**Recommended action:** [specific action]

When presenting financial data, use Australian dollars and format clearly.`

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'update_job_status',
    description: 'Update the status of a job. Sets won_date, lost_date, or completion_date automatically.',
    input_schema: {
      type: 'object' as const,
      properties: {
        job_id:      { type: 'string', description: 'UUID of the job' },
        status:      { type: 'string', enum: ['quoted', 'won', 'scheduled', 'in_progress', 'complete', 'lost'] },
        notes:       { type: 'string' },
        lost_reason: { type: 'string' },
      },
      required: ['job_id', 'status'],
    },
  },
  {
    name: 'set_job_dates',
    description: 'Set key operational dates on a job.',
    input_schema: {
      type: 'object' as const,
      properties: {
        job_id:                  { type: 'string' },
        start_date:              { type: 'string', description: 'YYYY-MM-DD' },
        completion_date:         { type: 'string', description: 'YYYY-MM-DD' },
        materials_order_date:    { type: 'string', description: 'YYYY-MM-DD' },
        materials_delivery_date: { type: 'string', description: 'YYYY-MM-DD' },
        subframe_complete_date:  { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'mark_payment_received',
    description: 'Mark a cashflow event as received/paid by setting its paid_date.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id:  { type: 'string', description: 'UUID of the cashflow_events row' },
        paid_date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'create_cashflow_event',
    description: 'Create a new cashflow event — income received or an expense.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type:           { type: 'string', enum: ['inflow', 'outflow'] },
        category:       { type: 'string', enum: ['deposit', 'materials_claim', 'subframe_claim', 'completion_claim', 'payroll', 'materials', 'opex', 'tax', 'adhoc'] },
        label:          { type: 'string' },
        amount:         { type: 'number' },
        scheduled_date: { type: 'string', description: 'YYYY-MM-DD' },
        paid_date:      { type: 'string', description: 'YYYY-MM-DD — set if already received/paid' },
        job_id:         { type: 'string', description: 'Optional UUID of related job' },
      },
      required: ['type', 'category', 'label', 'amount', 'scheduled_date'],
    },
  },
  {
    name: 'update_setting',
    description: 'Update a business setting. Common keys: opening_balance, cash_warning_threshold, cash_critical_threshold.',
    input_schema: {
      type: 'object' as const,
      properties: {
        key:   { type: 'string' },
        value: { description: 'New value (number, string, or object)' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'update_crew_sentiment',
    description: 'Record a crew member sentiment check-in score (1–10).',
    input_schema: {
      type: 'object' as const,
      properties: {
        crew_id:         { type: 'string' },
        sentiment_score: { type: 'number', description: '1 (very bad) to 10 (excellent)' },
      },
      required: ['crew_id', 'sentiment_score'],
    },
  },
]

// ── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  switch (name) {
    case 'update_job_status': {
      const updates: Record<string, unknown> = { status: input.status }
      if (input.notes)       updates.notes       = input.notes
      if (input.lost_reason) updates.lost_reason = input.lost_reason
      if (input.status === 'won')      updates.won_date        = today
      if (input.status === 'lost')     updates.lost_date       = today
      if (input.status === 'complete') updates.completion_date = today
      const { error } = await admin.from('jobs').update(updates).eq('id', input.job_id as string)
      return error ? `Error: ${error.message}` : `Job status updated to ${input.status}`
    }

    case 'set_job_dates': {
      const updates: Record<string, unknown> = {}
      for (const f of ['start_date', 'completion_date', 'materials_order_date', 'materials_delivery_date', 'subframe_complete_date']) {
        if (input[f]) updates[f] = input[f]
      }
      if (!Object.keys(updates).length) return 'No dates provided'
      const { error } = await admin.from('jobs').update(updates).eq('id', input.job_id as string)
      return error ? `Error: ${error.message}` : `Dates updated: ${Object.keys(updates).join(', ')}`
    }

    case 'mark_payment_received': {
      const paid = (input.paid_date as string) ?? today
      const { error } = await admin.from('cashflow_events').update({ paid_date: paid }).eq('id', input.event_id as string)
      return error ? `Error: ${error.message}` : `Payment marked as received on ${paid}`
    }

    case 'create_cashflow_event': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin.from('cashflow_events') as any).insert({
        type:           input.type,
        category:       input.category,
        label:          input.label,
        amount:         input.amount,
        scheduled_date: input.scheduled_date,
        paid_date:      (input.paid_date as string) ?? null,
        job_id:         (input.job_id as string) ?? null,
        auto_generated: false,
      })
      return error ? `Error: ${error.message}` : `Event created: ${input.label} — ${input.type === 'inflow' ? '+' : '−'}$${Number(input.amount).toLocaleString()}`
    }

    case 'update_setting': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin.from('settings') as any).upsert({ key: input.key, value: input.value }, { onConflict: 'key' })
      return error ? `Error: ${error.message}` : `Setting '${input.key}' updated to ${JSON.stringify(input.value)}`
    }

    case 'update_crew_sentiment': {
      const { error } = await admin.from('crew').update({
        sentiment_score:   input.sentiment_score as number,
        last_checkin_date: today,
      }).eq('id', input.crew_id as string)
      return error ? `Error: ${error.message}` : `Sentiment updated to ${input.sentiment_score}/10`
    }

    default:
      return `Unknown tool: ${name}`
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const admin = createAdminClient()

  const [contextRes, historyRes] = await Promise.all([
    fetch(`${req.nextUrl.origin}/api/agent/context`, {
      headers: { cookie: req.headers.get('cookie') ?? '' },
    }),
    admin.from('conversation_history')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])
  const context = await contextRes.json()

  const priorMessages: Anthropic.MessageParam[] = (historyRes.data ?? [])
    .reverse()
    .map(h => ({ role: h.role as 'user' | 'assistant', content: h.content }))

  const systemWithContext = `${JARVIS_SYSTEM}

Current business context:
${JSON.stringify(context, null, 2)}

Today: ${new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} AEST

Standing instructions:
${(context.standing_instructions ?? []).map((i: string, n: number) => `${n + 1}. ${i}`).join('\n')}`

  await admin.from('conversation_history').insert({
    user_id:  user.id,
    role:     'user',
    content:  message,
    metadata: { snapshot_date: context.snapshot_date },
  })

  // ── Agentic loop ──────────────────────────────────────────────────────────
  const toolsUsed: Array<{ name: string; result: string }> = []
  let finalText = ''
  let lastUsage: Anthropic.Usage | null = null
  let currentMessages: Anthropic.MessageParam[] = [
    ...priorMessages,
    { role: 'user', content: message },
  ]

  try {
    for (let iter = 0; iter < 8; iter++) {
      const response = await anthropic.messages.create({
        model:      'claude-sonnet-4-5',
        max_tokens: 2048,
        system:     systemWithContext,
        messages:   currentMessages,
        tools:      TOOLS,
      })

      lastUsage = response.usage

      if (response.stop_reason === 'end_turn') {
        finalText = (response.content.find(b => b.type === 'text') as Anthropic.TextBlock | undefined)?.text ?? ''
        break
      }

      if (response.stop_reason === 'tool_use') {
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const result = await executeTool(block.name, block.input as Record<string, unknown>)
            toolsUsed.push({ name: block.name, result })
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
          }
        }
        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: response.content },
          { role: 'user',      content: toolResults },
        ]
        continue
      }

      break
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown Anthropic error'
    return NextResponse.json({ error: `Jarvis error: ${msg}` }, { status: 502 })
  }

  await admin.from('conversation_history').insert({
    user_id:  user.id,
    role:     'assistant',
    content:  finalText,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: { model: 'claude-sonnet-4-5', usage: lastUsage, tools_used: toolsUsed } as any,
  })

  return NextResponse.json({ message: finalText, tools_used: toolsUsed, usage: lastUsage })
}
