import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import type { JobStatus, CashflowType, CashflowCategory, Json } from '@/lib/types/database'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const JARVIS_SYSTEM = `You are Jarvis, the AI business manager for Endure Decking, Perth WA. You have full visibility of every job, timesheet, cashflow event, quote, crew check-in, and marketing metric in the business.

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

Diagnostic rules:
1. Never recommend repricing without first ruling out efficiency, site conditions, and product mix
2. Separate margin problems from volume problems from timing problems — different fixes
3. Cite specific evidence: job numbers, dates, crew names
4. Flag when sample size is too small to conclude
5. Distinguish cash feel vs cash reality
6. GP is always on labour value, never total revenue — this is non-negotiable

When you suggest an action, format it clearly as:
**Recommended action:** [specific action]

When presenting financial data, use Australian dollars and format clearly.

You have access to tools that let you make real changes to the business data. Use them when the owner asks you to update something or when an action is clearly required. Always confirm what you did after using a tool.`

// ── Tool definitions ───────────────────────────────────────────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'update_job_status',
    description: 'Update the status of a job in the system. Use when owner instructs a status change (e.g. mark won, in_progress, complete, lost).',
    input_schema: {
      type: 'object' as const,
      properties: {
        job_id: { type: 'string', description: 'UUID of the job to update' },
        status: {
          type: 'string',
          enum: ['quoted', 'won', 'scheduled', 'in_progress', 'complete', 'lost'],
          description: 'New status for the job',
        },
      },
      required: ['job_id', 'status'],
    },
  },
  {
    name: 'set_job_dates',
    description: 'Set key scheduling dates on a job. Triggers automatic cashflow event creation when all 4 dates are provided on a won/scheduled job.',
    input_schema: {
      type: 'object' as const,
      properties: {
        job_id: { type: 'string', description: 'UUID of the job' },
        start_date: { type: 'string', description: 'Job start date (YYYY-MM-DD)' },
        materials_delivery_date: { type: 'string', description: 'Materials delivery date (YYYY-MM-DD)' },
        subframe_complete_date: { type: 'string', description: 'Subframe completion date (YYYY-MM-DD)' },
        completion_date: { type: 'string', description: 'Job completion date (YYYY-MM-DD)' },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'mark_payment_received',
    description: 'Mark a cashflow event as paid — i.e. cash has actually been received or paid out. Use when owner confirms a deposit, claim, or invoice has landed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: { type: 'string', description: 'UUID of the cashflow_event row' },
        paid_date: {
          type: 'string',
          description: 'Date payment was received (YYYY-MM-DD). Defaults to today if omitted.',
        },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'add_cashflow_event',
    description: 'Add a new cashflow event — ad-hoc income or expense not tied to job progress claims (e.g. unexpected supplier invoice, tax payment, one-off income).',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', enum: ['inflow', 'outflow'], description: 'Money coming in or going out' },
        category: {
          type: 'string',
          enum: ['deposit', 'materials_claim', 'subframe_claim', 'completion_claim', 'payroll', 'materials', 'opex', 'tax', 'adhoc'],
          description: 'Category of cashflow event',
        },
        label: { type: 'string', description: 'Human-readable label shown on cashflow reports' },
        amount: { type: 'number', description: 'Amount in AUD (always positive)' },
        scheduled_date: { type: 'string', description: 'Date the event is scheduled (YYYY-MM-DD)' },
        job_id: { type: 'string', description: 'Optional: UUID of the associated job' },
        paid_date: { type: 'string', description: 'Optional: set if already paid (YYYY-MM-DD)' },
      },
      required: ['type', 'category', 'label', 'amount', 'scheduled_date'],
    },
  },
  {
    name: 'update_settings',
    description: 'Update a business constant in the settings table (e.g. opening_balance, cops_monthly_total, cash thresholds). Use when owner explicitly requests a settings change.',
    input_schema: {
      type: 'object' as const,
      properties: {
        key: { type: 'string', description: 'Settings key (e.g. "opening_balance", "cash_warning_threshold")' },
        value: { description: 'New value — number, string, object, or array depending on the setting' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'update_crew_sentiment',
    description: 'Record an observation about a crew member\'s morale, engagement, or attitude. Stored in agent memory for ongoing HR monitoring.',
    input_schema: {
      type: 'object' as const,
      properties: {
        crew_name: { type: 'string', description: 'Name of the crew member' },
        sentiment: {
          type: 'string',
          enum: ['positive', 'neutral', 'concern', 'at_risk'],
          description: 'Overall sentiment level',
        },
        note: { type: 'string', description: 'Specific observation or context — what was said or noticed' },
      },
      required: ['crew_name', 'sentiment', 'note'],
    },
  },
]

// ── Tool execution ─────────────────────────────────────────────────────────────
async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  admin: ReturnType<typeof createAdminClient>,
): Promise<string> {
  const today = new Date().toISOString().split('T')[0]

  switch (toolName) {
    case 'update_job_status': {
      const { job_id, status } = toolInput as { job_id: string; status: JobStatus }
      const { error } = await admin.from('jobs').update({ status }).eq('id', job_id)
      if (error) return `Error updating job status: ${error.message}`
      return `Job ${job_id} status updated to "${status}".`
    }

    case 'set_job_dates': {
      const { job_id, ...dates } = toolInput as { job_id: string; [key: string]: string | undefined }
      type JobDateUpdate = {
        start_date?: string | null
        materials_delivery_date?: string | null
        subframe_complete_date?: string | null
        completion_date?: string | null
      }
      const cleanDates = Object.fromEntries(Object.entries(dates).filter(([, v]) => v !== undefined)) as JobDateUpdate
      const { error } = await admin.from('jobs').update(cleanDates).eq('id', job_id)
      if (error) return `Error setting job dates: ${error.message}`
      return `Job ${job_id} dates updated: ${Object.entries(cleanDates).map(([k, v]) => `${k}=${v}`).join(', ')}.`
    }

    case 'mark_payment_received': {
      const { event_id, paid_date } = toolInput as { event_id: string; paid_date?: string }
      const { error } = await admin
        .from('cashflow_events')
        .update({ paid_date: paid_date ?? today })
        .eq('id', event_id)
      if (error) return `Error marking payment: ${error.message}`
      return `Cashflow event ${event_id} marked as paid on ${paid_date ?? today}.`
    }

    case 'add_cashflow_event': {
      const { error, data } = await admin
        .from('cashflow_events')
        .insert(toolInput as { type: CashflowType; category: CashflowCategory; label: string; amount: number; scheduled_date: string; job_id?: string; paid_date?: string })
        .select('id, label')
        .single()
      if (error) return `Error adding cashflow event: ${error.message}`
      return `Cashflow event added — "${data?.label}" (id: ${data?.id}).`
    }

    case 'update_settings': {
      const { key, value } = toolInput as { key: string; value: Json }
      const { error } = await admin.from('settings').update({ value }).eq('key', key)
      if (error) return `Error updating setting: ${error.message}`
      return `Setting "${key}" updated to ${JSON.stringify(value)}.`
    }

    case 'update_crew_sentiment': {
      const { crew_name, sentiment, note } = toolInput as {
        crew_name: string
        sentiment: string
        note: string
      }
      const content = `[Crew Sentiment] ${crew_name}: ${sentiment.toUpperCase()} — ${note}`
      const { error } = await admin.from('agent_memory').insert({
        type: 'context',
        content,
        context: 'crew_sentiment',
        active: true,
      })
      if (error) return `Error recording crew sentiment: ${error.message}`
      return `Crew sentiment for ${crew_name} recorded: ${sentiment}. "${note}"`
    }

    default:
      return `Unknown tool: ${toolName}`
  }
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to your .env.local or Vercel environment variables.' },
      { status: 503 },
    )
  }

  const admin = createAdminClient()

  try {

  // Fetch full business context
  const contextRes = await fetch(`${req.nextUrl.origin}/api/agent/context`, {
    headers: { cookie: req.headers.get('cookie') ?? '' },
  })
  const context = await contextRes.json()

  // Fetch recent conversation history
  const { data: history } = await admin
    .from('conversation_history')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const systemWithContext = `${JARVIS_SYSTEM}

Current business context:
${JSON.stringify(context, null, 2)}

Today: ${new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} AEST

Standing instructions:
${(context.standing_instructions ?? []).map((i: string, n: number) => `${n + 1}. ${i}`).join('\n')}`

  // Build message history (chronological)
  const baseMessages: Anthropic.MessageParam[] = [
    ...((history ?? []).reverse().map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }))),
    { role: 'user', content: message },
  ]

  // Save user message immediately
  await admin.from('conversation_history').insert({
    user_id: user.id,
    role: 'user',
    content: message,
    metadata: { snapshot_date: context.snapshot_date },
  })

  // ── Agentic loop (handles tool_use stop_reason) ────────────────────────────
  let currentMessages: Anthropic.MessageParam[] = baseMessages
  let assistantContent = ''
  const toolsUsed: string[] = []

  for (let iteration = 0; iteration < 6; iteration++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemWithContext,
      messages: currentMessages,
      tools: TOOLS,
    })

    if (response.stop_reason === 'end_turn' || response.stop_reason !== 'tool_use') {
      assistantContent = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n')
      break
    }

    // stop_reason === 'tool_use' — execute tools then loop
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    )

    // Append assistant turn (with tool_use blocks) to history
    currentMessages = [...currentMessages, { role: 'assistant', content: response.content }]

    // Execute all tools in parallel
    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
        toolsUsed.push(block.name)
        const result = await executeTool(
          block.name,
          block.input as Record<string, unknown>,
          admin,
        )
        return {
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: result,
        }
      }),
    )

    // Append tool results as user message and continue loop
    currentMessages = [...currentMessages, { role: 'user', content: toolResults }]
  }

  // Save assistant response
  await admin.from('conversation_history').insert({
    user_id: user.id,
    role: 'assistant',
    content: assistantContent,
    metadata: {
      model: 'claude-sonnet-4-6',
      tools_used: toolsUsed.length > 0 ? toolsUsed : undefined,
    },
  })

  return NextResponse.json({
    message: assistantContent,
    tools_used: toolsUsed.length > 0 ? toolsUsed : undefined,
  })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Jarvis] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
