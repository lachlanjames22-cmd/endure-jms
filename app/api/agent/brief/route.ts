import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const JARVIS_SYSTEM = `You are Jarvis, the AI business manager for Endure Decking, Perth WA. You have full visibility of every job, timesheet, cashflow event, quote, crew check-in, and marketing metric in the business.

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
4. GP is always on labour value, never total revenue — this is non-negotiable`

// POST /api/agent/brief — generate startup morning brief on login
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch full business context
  const contextRes = await fetch(`${req.nextUrl.origin}/api/agent/context`, {
    headers: { cookie: req.headers.get('cookie') ?? '' },
  })
  const context = await contextRes.json()

  // Check if we already gave a brief today to avoid duplicate on page refreshes
  const todayStr = new Date().toISOString().split('T')[0]
  const { data: recentBrief } = await admin
    .from('conversation_history')
    .select('id, created_at')
    .eq('user_id', user.id)
    .eq('role', 'assistant')
    .gte('created_at', `${todayStr}T00:00:00`)
    .limit(1)

  if (recentBrief && recentBrief.length > 0) {
    // Already briefed today — return the existing brief
    const { data: existing } = await admin
      .from('conversation_history')
      .select('content')
      .eq('user_id', user.id)
      .eq('role', 'assistant')
      .gte('created_at', `${todayStr}T00:00:00`)
      .order('created_at', { ascending: true })
      .limit(1)
    return NextResponse.json({
      brief: existing?.[0]?.content ?? '',
      cached: true,
    })
  }

  const systemWithContext = `${JARVIS_SYSTEM}

Current business context:
${JSON.stringify(context, null, 2)}

Today: ${new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} AEST

Standing instructions:
${(context.standing_instructions ?? []).map((i: string, n: number) => `${n + 1}. ${i}`).join('\n')}`

  const prompt = `I just logged into Endure OS. Give me my morning brief. Cover:
1. Cash position — what's the balance today and what's coming in/out this week?
2. Active jobs — what's in progress, is anything at risk?
3. Pipeline — anything I need to follow up on today?
4. Crew — any alerts or things to watch?
5. Top priority action for today — just one, the most important thing.

Keep it tight. Use real numbers from the context. No filler.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: systemWithContext,
    messages: [{ role: 'user', content: prompt }],
  })

  const brief = response.content[0].type === 'text' ? response.content[0].text : ''

  // Save both the trigger and the response to conversation history
  await admin.from('conversation_history').insert([
    {
      user_id: user.id,
      role: 'user',
      content: '[Morning brief requested on login]',
      metadata: { type: 'morning_brief', date: todayStr },
    },
    {
      user_id: user.id,
      role: 'assistant',
      content: brief,
      metadata: {
        type: 'morning_brief',
        model: response.model,
        usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
      },
    },
  ])

  return NextResponse.json({ brief, cached: false })
}
