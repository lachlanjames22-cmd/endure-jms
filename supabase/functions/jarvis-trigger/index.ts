/**
 * Jarvis Trigger — Supabase Edge Function
 *
 * Called by Supabase Database Webhooks on table events.
 * Set up webhooks in Supabase Dashboard → Database → Webhooks:
 *
 *   cashflow_events INSERT  → this function (payment_received trigger)
 *   jobs            UPDATE  → this function (job complete trigger)
 *
 * Env vars: same as jarvis-proactive
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const TWILIO_API    = `https://api.twilio.com/2010-04-01/Accounts/${Deno.env.get('TWILIO_ACCOUNT_SID')}/Messages.json`

async function callClaude(prompt: string): Promise<string> {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`)
  const data = await res.json()
  return data.content[0].text
}

async function sendWhatsApp(to: string, body: string) {
  const sid   = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')!
  const from  = Deno.env.get('TWILIO_WHATSAPP_FROM')!
  const params = new URLSearchParams({ To: to, From: from, Body: body })
  return fetch(TWILIO_API, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const { type, table, record, old_record } = payload

    const supabase    = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const ownerNumber = Deno.env.get('OWNER_WHATSAPP_NUMBER')!
    const hasTwilio   = !!(Deno.env.get('TWILIO_ACCOUNT_SID') && Deno.env.get('TWILIO_AUTH_TOKEN'))

    let triggerType: string | null = null
    let message: string | null = null

    // ── Payment received ──────────────────────────────────────
    if (table === 'cashflow_events' && type === 'INSERT' && record.type === 'inflow' && record.paid_date) {
      triggerType = 'payment_received'
      const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(record.amount)

      // Auto-allocate Profit First
      await supabase.from('cash_allocations').insert({
        cashflow_event_id: record.id,
        amount_received:   record.amount,
        tax_pct:           0.15, tax_amount:       Number((record.amount * 0.15).toFixed(2)),
        profit_pct:        0.10, profit_amount:    Number((record.amount * 0.10).toFixed(2)),
        owner_pay_pct:     0.35, owner_pay_amount: Number((record.amount * 0.35).toFixed(2)),
        float_pct:         0.40, float_amount:     Number((record.amount * 0.40).toFixed(2)),
      })

      const tax   = (record.amount * 0.15).toFixed(0)
      const prof  = (record.amount * 0.10).toFixed(0)
      const pay   = (record.amount * 0.35).toFixed(0)
      const float = (record.amount * 0.40).toFixed(0)

      message = `💰 ${aud} received — ${record.description ?? 'payment'}\n\n` +
        `Profit First split:\n` +
        `→ Tax: $${tax}\n` +
        `→ Profit: $${prof}\n` +
        `→ Owner pay: $${pay}\n` +
        `→ Float: $${float}\n\n` +
        `Reply DONE when transferred.`
    }

    // ── Job complete → start review sequence ─────────────────
    if (table === 'jobs' && type === 'UPDATE' &&
        old_record?.status !== 'complete' && record.status === 'complete') {
      triggerType = 'job_complete'

      const completionDate = new Date(record.completion_date ?? new Date())
      const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toISOString().slice(0,10) }

      // Schedule 4-step review sequence
      const sequences = [
        { step: 1, type: 'completion', days: 0,  msg: `G'day ${record.client_name}, your deck is done! Absolute pleasure working with you. Any issues at all, just reply here.` },
        { step: 2, type: 'completion', days: 2,  msg: `Hey ${record.client_name}, just checking in — everything looking good with the deck?` },
        { step: 3, type: 'review',     days: 4,  msg: `${record.client_name}, if you're happy with the work, a Google review goes a long way for us. Takes 2 min: [review link]. Appreciate it.` },
        { step: 4, type: 'referral',   days: 14, msg: `Hey ${record.client_name}, hope you're loving the deck! If you know anyone who'd be keen on a quote, we'd love the referral.` },
      ]

      await supabase.from('client_sequences').insert(
        sequences.map(s => ({
          job_id:         record.id,
          sequence_type:  s.type,
          step:           s.step,
          scheduled_date: addDays(completionDate, s.days),
          message_body:   s.msg,
        }))
      )

      // Notify owner
      const gpLabel = record.actual_gp_pct
        ? ` · GP ${(record.actual_gp_pct * 100).toFixed(1)}%`
        : ''
      message = `✅ Job complete: ${record.name}\nClient: ${record.client_name}${gpLabel}\n\nReview sequence scheduled. No action needed.`
    }

    // ── Cash warning ──────────────────────────────────────────
    if (table === 'cashflow_events' && type === 'INSERT') {
      // Check current cash position after this event
      const { data: events } = await supabase
        .from('cashflow_events')
        .select('type, amount, paid_date')
        .lte('scheduled_date', new Date().toISOString().slice(0,10))

      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'opening_balance')
        .single()

      const openingBalance = Number(settings?.value ?? 0)
      const cashPosition = (events ?? []).reduce((sum, e) => {
        if (e.paid_date) return sum + (e.type === 'inflow' ? e.amount : -e.amount)
        return sum
      }, openingBalance)

      if (cashPosition < 10000 && !triggerType) {
        triggerType = 'cash_critical'
        message = `🚨 CASH ALERT\nCurrent position: $${cashPosition.toFixed(0)}\nBelow $10k — action needed now.\n\nCheck Finance → Cashflow for detail.`
      } else if (cashPosition < 20000 && !triggerType) {
        triggerType = 'cash_warning'
        message = `⚠️ Cash at $${cashPosition.toFixed(0)} — getting tight. Review cashflow this week.`
      }
    }

    if (triggerType && message) {
      await supabase.from('proactive_messages').insert({
        trigger_type: triggerType,
        channel:      'whatsapp',
        recipient:    ownerNumber,
        message_body: message,
        sent:         hasTwilio,
        sent_at:      hasTwilio ? new Date().toISOString() : null,
      })

      if (hasTwilio) await sendWhatsApp(ownerNumber, message)
    }

    return new Response(JSON.stringify({ ok: true, trigger: triggerType }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
