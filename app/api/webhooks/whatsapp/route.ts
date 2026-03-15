import { NextRequest, NextResponse } from 'next/server'
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

You are responding via WhatsApp. Keep messages concise — WhatsApp is not a place for long reports. Use short paragraphs, no markdown headers (they render as literal text on WhatsApp). Use emoji sparingly to signal status (✅ good, ⚠️ watch, 🚨 critical).

GP is always on labour value, never total revenue.`

// Twilio WhatsApp webhook — POST /api/webhooks/whatsapp
// Twilio sends: Body (message text), From (whatsapp:+61...)
// Returns TwiML XML response
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const body    = formData.get('Body') as string
  const from    = formData.get('From') as string // e.g. whatsapp:+61412345678

  if (!body || !from) {
    return twimlResponse("I didn't catch that. Try again.")
  }

  const admin = createAdminClient()

  // Match sender to a user in the DB
  // Phone numbers stored as +61412345678 in profiles/settings
  const phone = from.replace('whatsapp:', '')
  const { data: userMatch } = await admin
    .from('settings')
    .select('value')
    .eq('key', 'owner_phone')
    .single()

  // Allow any registered phone number through — just log unmatched
  const ownerPhone = (userMatch?.value as string) ?? process.env.OWNER_WHATSAPP_NUMBER
  const isOwner    = ownerPhone ? phone === ownerPhone : true // allow all if not configured

  if (!isOwner) {
    // Log unknown sender
    admin.from('notifications').insert({
      type: 'whatsapp_unknown',
      title: 'Unknown WhatsApp sender',
      body: `Message from ${phone}: ${body.slice(0, 100)}`,
      role: 'owner' as const,
      read: false,
    }) // non-fatal, fire-and-forget

    return twimlResponse("I don't recognise this number. If you're the owner, add your WhatsApp number in Endure OS Settings.")
  }

  // Fetch full business context (uses service role — no user session needed)
  const origin = req.nextUrl.origin
  let context: Record<string, unknown> = {}
  try {
    // We need to call context without a user session — use service key header
    const contextRes = await fetch(`${origin}/api/agent/context/internal`, {
      headers: { 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY ?? '' },
    })
    if (contextRes.ok) {
      context = await contextRes.json()
    }
  } catch {
    // Non-fatal — Jarvis will respond without full context
  }

  // Fetch recent WhatsApp conversation history (last 10 messages)
  const { data: history } = await admin
    .from('conversation_history')
    .select('role, content')
    .eq('metadata->>channel', 'whatsapp')
    .eq('metadata->>phone', phone)
    .order('created_at', { ascending: false })
    .limit(10)

  const messages: Anthropic.MessageParam[] = [
    ...((history ?? []).reverse().map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }))),
    { role: 'user', content: body },
  ]

  const systemWithContext = `${JARVIS_SYSTEM}

Current business context:
${JSON.stringify(context, null, 2)}

Today: ${new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} AEST`

  let reply = ''
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500, // Keep WhatsApp replies concise
      system: systemWithContext,
      messages,
    })
    reply = response.content[0].type === 'text' ? response.content[0].text : 'Something went wrong — try again.'

    // Save to conversation history with WhatsApp channel tag
    await admin.from('conversation_history').insert([
      {
        role: 'user',
        content: body,
        metadata: { channel: 'whatsapp', phone },
      },
      {
        role: 'assistant',
        content: reply,
        metadata: { channel: 'whatsapp', phone, model: response.model },
      },
    ])
  } catch (e) {
    reply = 'Jarvis is having trouble right now. Check the OS dashboard for status.'
  }

  return twimlResponse(reply)
}

function twimlResponse(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`
  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
