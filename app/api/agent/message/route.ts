import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import { JARVIS_TOOLS } from '@/lib/jarvis/tools'
import { executeTool } from '@/lib/jarvis/execute-tool'

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

You have tools to take real actions in the system. Use them when the owner asks you to update jobs, log cashflow, create records, or run calculations. When you use a tool, confirm what you did and what changed.

Diagnostic rules:
1. Never recommend repricing without first ruling out efficiency, site conditions, and product mix
2. Separate margin problems from volume problems from timing problems — different fixes
3. Cite specific evidence: job numbers, dates, crew names
4. Flag when sample size is too small to conclude
5. Distinguish cash feel vs cash reality
6. GP is always on labour value, never total revenue — this is non-negotiable

Memory commands — if the user says "remember this", "save this", "note that", or similar, respond normally AND include a JSON block at the very end of your response in this exact format (nothing after it):
<save_memory type="decision|preference|context">The memory content to save</save_memory>

When presenting financial data, use Australian dollars and format clearly.
When you suggest an action, format it clearly as:
**Recommended action:** [specific action]`

// Extract <save_memory> tags from Jarvis response and persist them
async function extractAndSaveMemories(content: string): Promise<string> {
  const admin = createAdminClient()
  const regex = /<save_memory type="([^"]+)">([^<]+)<\/save_memory>/g
  let match
  let cleaned = content

  while ((match = regex.exec(content)) !== null) {
    const type = match[1] as 'decision' | 'preference' | 'context' | 'instruction'
    const memContent = match[2].trim()
    if (memContent) {
      try { await admin.from('agent_memory').insert({ type, content: memContent, active: true }) } catch { /* non-fatal */ }
    }
    cleaned = cleaned.replace(match[0], '').trim()
  }

  return cleaned
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { message, session_id } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const admin = createAdminClient()

  // Resolve or create session
  let activeSessionId = session_id as string | null

  if (!activeSessionId) {
    const title = message.trim().slice(0, 50) + (message.trim().length > 50 ? '…' : '')
    const { data: newSession } = await admin
      .from('jarvis_sessions')
      .insert({ user_id: user.id, title })
      .select('id')
      .single()
    activeSessionId = newSession?.id ?? null
  } else {
    await admin
      .from('jarvis_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activeSessionId)
      .eq('user_id', user.id)
  }

  // Fetch full business context
  const contextRes = await fetch(`${req.nextUrl.origin}/api/agent/context`, {
    headers: { cookie: req.headers.get('cookie') ?? '' },
  })
  const context = await contextRes.json()

  // Fetch this session's conversation history (last 30 turns)
  const historyQuery = admin
    .from('conversation_history')
    .select('role, content')
    .order('created_at', { ascending: false })
    .limit(30)

  if (activeSessionId) {
    historyQuery.eq('session_id', activeSessionId)
  } else {
    historyQuery.eq('user_id', user.id)
  }

  const { data: history } = await historyQuery

  const messages: Anthropic.MessageParam[] = [
    ...((history ?? []).reverse().map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }))),
    { role: 'user', content: message },
  ]

  // Save user message
  await admin.from('conversation_history').insert({
    user_id: user.id,
    role: 'user',
    content: message,
    session_id: activeSessionId,
    metadata: { snapshot_date: context.snapshot_date },
  })

  const systemWithContext = `${JARVIS_SYSTEM}

Current business context:
${JSON.stringify(context, null, 2)}

Today: ${new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} AEST

Standing instructions:
${(context.standing_instructions ?? []).map((i: string, n: number) => `${n + 1}. ${i}`).join('\n')}`

  // Agentic loop — runs until end_turn or max iterations
  const MAX_ITERATIONS = 6
  let finalContent = ''
  let totalInputTokens = 0
  let totalOutputTokens = 0
  const cookie = req.headers.get('cookie') ?? ''
  const origin = req.nextUrl.origin

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      system: systemWithContext,
      tools: JARVIS_TOOLS,
      messages,
    })

    totalInputTokens += response.usage.input_tokens
    totalOutputTokens += response.usage.output_tokens

    if (response.stop_reason === 'end_turn') {
      finalContent = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('')
      break
    }

    if (response.stop_reason === 'tool_use') {
      // Append assistant message (contains tool_use blocks)
      messages.push({ role: 'assistant', content: response.content })

      // Execute all requested tools
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            origin,
            cookie,
          )
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          })
        }
      }

      // Feed results back as user message
      messages.push({ role: 'user', content: toolResults })
      continue
    }

    // Any other stop reason — extract whatever text is there and stop
    finalContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
    break
  }

  // Extract and save any memories Jarvis tagged
  const assistantContent = await extractAndSaveMemories(finalContent)

  // Save assistant response
  await admin.from('conversation_history').insert({
    user_id: user.id,
    role: 'assistant',
    content: assistantContent,
    session_id: activeSessionId,
    metadata: {
      model: 'claude-opus-4-6',
      usage: { input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
    },
  })

  return NextResponse.json({
    message: assistantContent,
    session_id: activeSessionId,
    usage: { input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
  })
}
