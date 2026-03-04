import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Generate dates for a fortnightly recurring event anchored to a date
function fortnightlyDates(anchorStr: string, from: Date, to: Date): string[] {
  const anchor = new Date(anchorStr)
  const msPerFortnight = 14 * 24 * 60 * 60 * 1000
  const dates: string[] = []

  // Align anchor to the fortnightly cycle closest to `from`
  let cur = new Date(anchor)
  const diffMs = from.getTime() - cur.getTime()
  const fortnightsPast = Math.floor(diffMs / msPerFortnight)
  cur.setDate(cur.getDate() + fortnightsPast * 14)

  // Step forward until we're on or after `from`
  while (cur < from) cur.setDate(cur.getDate() + 14)

  while (cur <= to) {
    dates.push(cur.toISOString().split('T')[0])
    cur = new Date(cur)
    cur.setDate(cur.getDate() + 14)
  }
  return dates
}

// Generate dates for a weekly event on a specific day-of-week
function weeklyDates(dayName: string, from: Date, to: Date): string[] {
  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  }
  const target = dayMap[dayName.toLowerCase()] ?? 2 // default Tuesday
  const dates: string[] = []

  let cur = new Date(from)
  // Advance to first occurrence of the target day
  while (cur.getDay() !== target) cur.setDate(cur.getDate() + 1)

  while (cur <= to) {
    dates.push(cur.toISOString().split('T')[0])
    cur = new Date(cur)
    cur.setDate(cur.getDate() + 7)
  }
  return dates
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '30')

  const [eventsRes, settingsRes] = await Promise.all([
    supabase.from('cashflow_events').select('*').order('scheduled_date', { ascending: true }),
    supabase.from('settings').select('key, value'),
  ])

  if (eventsRes.error) return NextResponse.json({ error: eventsRes.error.message }, { status: 500 })

  // Build settings map
  const sm = Object.fromEntries((settingsRes.data ?? []).map(s => [s.key, s.value as unknown]))
  const openingBalance   = Number(sm['opening_balance'] ?? 0)
  const payrollAnchor    = (sm['payroll_anchor_date'] as string) ?? '2026-01-01'
  const ownerPayDay      = ((sm['owner_pay_day'] as string) ?? 'tuesday').toLowerCase()
  const fieldPayroll     = Number(sm['payroll_fixed_weekly_field'] ?? 3886.89)
  const ownerWeekly      = Number(sm['payroll_owner_weekly_gross'] ?? 1884.62)
  const monthlyOpex      = Number(sm['cops_monthly_opex'] ?? 8714.93)
  const weeklyOpex       = Math.round((monthlyOpex / (52 / 12)) * 100) / 100 // ≈ $2,178.73

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + days - 1)

  // Generate virtual recurring outflows for the window
  const payrollDates = fortnightlyDates(payrollAnchor, today, endDate)
  const ownerDates   = weeklyDates(ownerPayDay, today, endDate)
  const opexDates    = weeklyDates('thursday', today, endDate) // opex drip every Thursday

  type VirtualEvent = {
    id: string
    type: 'inflow' | 'outflow'
    category: string
    label: string
    amount: number
    scheduled_date: string
    paid_date: null
    auto_generated: boolean
  }

  const virtualEvents: VirtualEvent[] = [
    ...payrollDates.map(d => ({
      id: `v-payroll-${d}`,
      type: 'outflow' as const,
      category: 'payroll',
      label: 'Crew payroll (Baylee + Marius)',
      amount: fieldPayroll,
      scheduled_date: d,
      paid_date: null,
      auto_generated: true,
    })),
    ...ownerDates.map(d => ({
      id: `v-owner-${d}`,
      type: 'outflow' as const,
      category: 'payroll',
      label: 'Owner pay',
      amount: ownerWeekly,
      scheduled_date: d,
      paid_date: null,
      auto_generated: true,
    })),
    ...opexDates.map(d => ({
      id: `v-opex-${d}`,
      type: 'outflow' as const,
      category: 'opex',
      label: 'Weekly opex',
      amount: weeklyOpex,
      scheduled_date: d,
      paid_date: null,
      auto_generated: true,
    })),
  ]

  const dbEvents = eventsRes.data ?? []
  const allEvents = [...dbEvents, ...virtualEvents]
    .sort((a, b) => ((a.scheduled_date > b.scheduled_date) ? 1 : -1))

  // Running balance = opening + all PAID DB events before today
  let runningBalance = openingBalance
  for (const ev of dbEvents) {
    if (ev.paid_date && new Date(ev.paid_date) < today) {
      runningBalance += ev.type === 'inflow' ? Number(ev.amount) : -Number(ev.amount)
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
      if (ev.type === 'inflow') dayInflow += Number(ev.amount)
      else dayOutflow += Number(ev.amount)
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

  const lowestDay   = days_array.reduce((min, d) => d.balance < min.balance ? d : min, days_array[0])
  const warningDays  = days_array.filter(d => d.balance < 20000 && d.balance >= 10000)
  const criticalDays = days_array.filter(d => d.balance < 10000)
  const negativeDays = days_array.filter(d => d.balance < 0)

  return NextResponse.json({
    opening_balance: openingBalance,
    days: days_array,
    summary: {
      today_balance:  days_array[0]?.balance ?? openingBalance,
      day30_balance:  days_array[days - 1]?.balance ?? openingBalance,
      lowest_balance: lowestDay?.balance,
      lowest_date:    lowestDay?.date,
      negative_days:  negativeDays.length,
      warning_days:   warningDays.length,
      critical_days:  criticalDays.length,
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
