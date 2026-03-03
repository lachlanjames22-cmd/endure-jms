import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '30')
  const from = new Date()
  const to = new Date()
  to.setDate(to.getDate() + days)

  // Fetch all events in range (plus all paid events for running balance)
  const [rangeRes, settingsRes] = await Promise.all([
    supabase
      .from('cashflow_events')
      .select('*')
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('settings')
      .select('key, value')
      .eq('key', 'opening_balance'),
  ])

  if (rangeRes.error) return NextResponse.json({ error: rangeRes.error.message }, { status: 500 })

  const openingBalance = Number(settingsRes.data?.[0]?.value ?? 0)
  const allEvents = rangeRes.data ?? []

  // Build day-by-day cashflow for the next N days
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Running balance = opening + all PAID events before today
  let runningBalance = openingBalance
  for (const ev of allEvents) {
    if (ev.paid_date && new Date(ev.paid_date) < today) {
      runningBalance += ev.type === 'inflow' ? ev.amount : -ev.amount
    }
  }

  const days_array: {
    date: string
    balance: number
    events: typeof allEvents
    inflow: number
    outflow: number
  }[] = []

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]

    const dayEvents = allEvents.filter(ev => {
      const evDate = ev.paid_date ?? ev.scheduled_date
      return evDate === dateStr
    })

    let dayInflow = 0
    let dayOutflow = 0
    for (const ev of dayEvents) {
      if (ev.type === 'inflow') dayInflow += ev.amount
      else dayOutflow += ev.amount
    }

    runningBalance += dayInflow - dayOutflow

    days_array.push({
      date: dateStr,
      balance: Math.round(runningBalance * 100) / 100,
      events: dayEvents,
      inflow: dayInflow,
      outflow: dayOutflow,
    })
  }

  // Summary
  const lowestDay = days_array.reduce((min, d) => d.balance < min.balance ? d : min, days_array[0])
  const warningDays = days_array.filter(d => d.balance < 20000 && d.balance >= 10000)
  const criticalDays = days_array.filter(d => d.balance < 10000)
  const negativeDays = days_array.filter(d => d.balance < 0)

  return NextResponse.json({
    opening_balance: openingBalance,
    days: days_array,
    summary: {
      today_balance: days_array[0]?.balance ?? openingBalance,
      day30_balance: days_array[days - 1]?.balance ?? openingBalance,
      lowest_balance: lowestDay?.balance,
      lowest_date: lowestDay?.date,
      negative_days: negativeDays.length,
      warning_days: warningDays.length,
      critical_days: criticalDays.length,
      status: negativeDays.length > 0 ? 'critical'
        : criticalDays.length > 0 ? 'critical'
        : warningDays.length > 0 ? 'warning'
        : 'healthy',
    },
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('cashflow_events')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id, ...body } = await req.json()
  const { data, error } = await supabase
    .from('cashflow_events')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
