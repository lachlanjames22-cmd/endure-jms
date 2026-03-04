/**
 * Jarvis Proactive — Supabase Edge Function
 *
 * Deployed as a scheduled function (cron) via Supabase Dashboard:
 *   Morning brief:     0 22 * * *   (7am AWST = 22:00 UTC prev day)
 *   End of day:        0 8 * * *    (4pm AWST = 08:00 UTC)
 *   Weekly review:     0 8 * * 5    (Friday 4pm AWST)
 *   Monthly CEO:       0 22 1 * *   (1st of month 7am AWST)
 *
 * Env vars required (set in Supabase Dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM     (e.g. whatsapp:+14155238886)
 *   OWNER_WHATSAPP_NUMBER    (e.g. whatsapp:+61412345678)
 *   APP_URL                  (e.g. https://endure.vercel.app)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const TWILIO_API    = `https://api.twilio.com/2010-04-01/Accounts/${Deno.env.get('TWILIO_ACCOUNT_SID')}/Messages.json`

// ── Helpers ─────────────────────────────────────────────────

function getAWSTHour() {
  const now = new Date()
  const awst = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Perth' }))
  return awst.getHours()
}

function getDayOfWeek() {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Perth' })).getDay()
}

function getDayOfMonth() {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Perth' })).getDate()
}

function detectTriggerType(): string {
  const hour = getAWSTHour()
  const dow  = getDayOfWeek()
  const dom  = getDayOfMonth()

  if (dom === 1 && hour < 10) return 'monthly_reflection'
  if (dow === 5 && hour >= 15) return 'weekly_review'
  if (hour < 10) return 'morning_brief'
  if (hour >= 15) return 'eod_summary'
  return 'morning_brief'
}

async function fetchContext(appUrl: string, supabaseUrl: string, serviceKey: string) {
  // Use service role to hit context endpoint internally
  const res = await fetch(`${appUrl}/api/agent/context`, {
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'x-supabase-internal': '1',
    },
  })
  if (!res.ok) throw new Error(`Context fetch failed: ${res.status}`)
  return res.json()
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`)
  const data = await res.json()
  return data.content[0].text
}

async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const sid   = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')!
  const from  = Deno.env.get('TWILIO_WHATSAPP_FROM')!

  const params = new URLSearchParams({ To: to, From: from, Body: body })
  const res = await fetch(TWILIO_API, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  return res.ok
}

// ── System prompts by trigger ────────────────────────────────

const SYSTEM_BASE = `You are Jarvis, the AI business manager for Endure Decking, Perth WA.
You are writing a WhatsApp message to Lachlan, the owner.
Rules:
- 150 words maximum — WhatsApp is not a report
- Direct and numbers-first. No corporate language. No fluff.
- One recommended action at the end, clearly marked **Action:**
- Cite specific jobs, amounts, dates — never generalise
- GP is always on labour value, never total revenue
- Use Australian dollars`

const PROMPTS: Record<string, string> = {
  morning_brief:       'Write a morning brief. What matters today. Cash position. Any job risks. One action.',
  eod_summary:         'Write an end-of-day summary. What happened today on jobs. Cash received. One thing to action tomorrow.',
  weekly_review:       'Write a weekly review. This week vs targets. Pipeline health. Crew performance. One priority for next week.',
  monthly_reflection:  'Write a monthly CEO reflection. Month vs targets. Biggest wins. Biggest lesson. Growth trajectory. One strategic decision needed.',
}

// ── Main handler ─────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const appUrl     = Deno.env.get('APP_URL')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ownerNumber = Deno.env.get('OWNER_WHATSAPP_NUMBER')!

    const supabase = createClient(supabaseUrl, serviceKey)

    // Detect what kind of message to send
    const triggerType = detectTriggerType()

    // Fetch business context
    let context: Record<string, unknown>
    try {
      context = await fetchContext(appUrl, supabaseUrl, serviceKey)
    } catch (_e) {
      // Fallback: fetch directly from DB
      const { data: jobs } = await supabase.from('jobs').select('status, quoted_labour_value, actual_gp_pct').is('deleted_at', null)
      context = { jobs: jobs ?? [], note: 'partial_context' }
    }

    // Build the message via Claude
    const systemPrompt = `${SYSTEM_BASE}\n\nCurrent business context:\n${JSON.stringify(context, null, 2)}\n\nToday: ${new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} AWST`
    const userPrompt   = PROMPTS[triggerType] ?? PROMPTS.morning_brief

    const message = await callClaude(systemPrompt, userPrompt)

    // Store log
    await supabase.from('proactive_messages').insert({
      trigger_type: triggerType,
      channel:      'whatsapp',
      recipient:    ownerNumber,
      message_body: message,
    })

    // Send via WhatsApp (only if Twilio configured)
    let sent = false
    if (Deno.env.get('TWILIO_ACCOUNT_SID') && Deno.env.get('TWILIO_AUTH_TOKEN')) {
      sent = await sendWhatsApp(ownerNumber, message)
      if (sent) {
        await supabase
          .from('proactive_messages')
          .update({ sent: true, sent_at: new Date().toISOString() })
          .order('created_at', { ascending: false })
          .limit(1)
      }
    }

    return new Response(JSON.stringify({ ok: true, trigger: triggerType, sent, preview: message.slice(0, 100) }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Jarvis proactive error:', msg)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
