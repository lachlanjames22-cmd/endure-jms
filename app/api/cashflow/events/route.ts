import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const [eventsRes, settingsRes] = await Promise.all([
    supabase
      .from('cashflow_events')
      .select('id, type, category, label, amount, scheduled_date, paid_date, job_id')
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('settings')
      .select('key, value')
      .eq('key', 'opening_balance')
      .maybeSingle(),
  ])

  if (eventsRes.error) return NextResponse.json({ error: eventsRes.error.message }, { status: 500 })

  const openingBalance = Number(settingsRes.data?.value ?? 0)
  const events = (eventsRes.data ?? []).map(ev => ({
    id: ev.id,
    date: ev.paid_date ?? ev.scheduled_date,
    label: ev.label,
    amount: ev.type === 'inflow' ? ev.amount : -ev.amount,
    type: ev.type === 'inflow' ? 'receivable' : 'expense',
    jobId: ev.job_id,
    locked: false,
  }))

  return NextResponse.json({ opening_balance: openingBalance, events })
}
