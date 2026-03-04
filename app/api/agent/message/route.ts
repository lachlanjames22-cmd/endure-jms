import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

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

When presenting financial data, use Australian dollars and format clearly.`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { message, conversation_id } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const admin = createAdminClient()

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

  const messages: Anthropic.MessageParam[] = [
    // Recent history (reversed to chronological)
    ...((history ?? []).reverse().map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }))),
    // Current message
    {
      role: 'user',
      content: message,
    },
  ]

  // Save user message
  await admin.from('conversation_history').insert({
    user_id: user.id,
    role: 'user',
    content: message,
    metadata: { snapshot_date: context.snapshot_date },
  })

  const systemWithContext = `${JARVIS_SYSTEM}

Current business context:
${JSON.stringify(context, null, 2)}

Today: ${new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} AEST

Standing instructions:
${(context.standing_instructions ?? []).map((i: string, n: number) => `${n + 1}. ${i}`).join('\n')}`

  let response
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemWithContext,
      messages,
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown Anthropic error'
    // Surface a readable error — most likely a missing or invalid ANTHROPIC_API_KEY
    return NextResponse.json({ error: `Jarvis error: ${errMsg}` }, { status: 502 })
  }

  const assistantContent = response.content[0].type === 'text'
    ? response.content[0].text
    : ''

  // Save assistant response
  await admin.from('conversation_history').insert({
    user_id: user.id,
    role: 'assistant',
    content: assistantContent,
    metadata: { model: response.model, usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens } },
  })

  return NextResponse.json({
    message: assistantContent,
    usage: response.usage,
  })
}
