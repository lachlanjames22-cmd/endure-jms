import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { COPS, TARGETS, PAYROLL } from '@/lib/constants'

// Returns the full business snapshot used by Jarvis on every message
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const day3 = new Date(today); day3.setDate(day3.getDate() + 3)
  const day3Str = day3.toISOString().split('T')[0]
  const day10 = new Date(today); day10.setDate(day10.getDate() + 10)

  // Parallel fetch everything needed
  const [
    jobsRes,
    cashflowRes,
    settingsRes,
    agentMemoryRes,
    notifRes,
    crewRes,
  ] = await Promise.all([
    admin.from('jobs').select('*').is('deleted_at', null),
    admin.from('cashflow_events').select('*').order('scheduled_date'),
    admin.from('settings').select('key, value'),
    admin.from('agent_memory').select('*').eq('active', true).eq('type', 'instruction'),
    admin.from('notifications').select('*').eq('read', false).order('created_at', { ascending: false }).limit(20),
    admin.from('crew').select('*').eq('active', true),
  ])

  const jobs = jobsRes.data ?? []
  const cashflowEvents = cashflowRes.data ?? []
  const settings = Object.fromEntries((settingsRes.data ?? []).map(s => [s.key, s.value]))
  const instructions = agentMemoryRes.data ?? []
  const notifications = notifRes.data ?? []
  const crew = crewRes.data ?? []

  const openingBalance = Number(settings['opening_balance'] ?? 0)

  // ── Cash position ─────────────────────────────────────────────────────────
  let runningBalance = openingBalance
  const dailyBalances: Record<string, number> = {}

  // Apply all paid events to get to today
  for (const ev of cashflowEvents) {
    const evDate = ev.paid_date ?? ev.scheduled_date
    if (evDate <= todayStr) {
      runningBalance += ev.type === 'inflow' ? ev.amount : -ev.amount
    }
  }
  const balanceToday = runningBalance

  // Project 30 days forward
  let projected = runningBalance
  let lowest = runningBalance
  let lowestDate = todayStr

  for (let i = 0; i <= 30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const ds = d.toISOString().split('T')[0]

    const dayEvents = cashflowEvents.filter(ev => {
      const evDate = ev.paid_date ?? ev.scheduled_date
      return evDate === ds && evDate > todayStr
    })

    for (const ev of dayEvents) {
      projected += ev.type === 'inflow' ? ev.amount : -ev.amount
    }

    dailyBalances[ds] = projected
    if (projected < lowest) {
      lowest = projected
      lowestDate = ds
    }
  }

  const cashStatus = lowest < 0 ? 'critical'
    : lowest < TARGETS.cashCritical ? 'critical'
    : lowest < TARGETS.cashWarning ? 'warning'
    : 'healthy'

  // ── Payroll ───────────────────────────────────────────────────────────────
  // Next fortnightly payroll — find next Thursday on or after today
  function nextPayrollDate(): string {
    const d = new Date(today)
    const day = d.getDay() // 0=Sun, 4=Thu
    const daysToThur = (4 - day + 7) % 7 || 7
    d.setDate(d.getDate() + daysToThur)
    return d.toISOString().split('T')[0]
  }

  const nextCrewDate = nextPayrollDate()
  const cashOnNextCrewDate = dailyBalances[nextCrewDate] ?? balanceToday
  const nextCrewAmount = PAYROLL.fixedWeeklyField // weekly equivalent, fortnight = ×2

  // ── Jobs ──────────────────────────────────────────────────────────────────
  const activeStatuses = ['quoted', 'won', 'scheduled', 'in_progress']
  const monthlyStatuses = ['in_progress', 'complete']

  const inProgressJobs = jobs.filter(j => j.status === 'in_progress')
  const quotedJobs = jobs.filter(j => j.status === 'quoted')
  const wonNotStarted = jobs.filter(j => j.status === 'won')
  const completedThisMonth = jobs.filter(j =>
    j.status === 'complete' && j.won_date && j.won_date >= monthStart
  )

  const mtdJobs = jobs.filter(j =>
    monthlyStatuses.includes(j.status) && j.won_date && j.won_date >= monthStart
  )
  const mtdLabourValue = mtdJobs.reduce((s, j) => s + (j.actual_labour_value ?? j.quoted_labour_value ?? 0), 0)
  const mtdGp = mtdJobs.reduce((s, j) => {
    const lv = j.actual_labour_value ?? j.quoted_labour_value ?? 0
    return s + lv * (j.actual_gp_pct ?? j.quoted_gp_pct ?? 0)
  }, 0)
  const avgGpPctMtd = mtdLabourValue > 0 ? mtdGp / mtdLabourValue : null

  // ── Pipeline ─────────────────────────────────────────────────────────────
  const pipelineJobs = jobs.filter(j => activeStatuses.includes(j.status))
  const quotesOverdueFu = quotedJobs.filter(j => {
    if (!j.quote_sent_date) return false
    const days = Math.floor((today.getTime() - new Date(j.quote_sent_date).getTime()) / 86400000)
    return days > TARGETS.quoteFollowupDays
  })
  const quotesExpiring = quotedJobs.filter(j => {
    if (!j.quote_sent_date) return false
    const days = Math.floor((today.getTime() - new Date(j.quote_sent_date).getTime()) / 86400000)
    return days > 25
  })

  // ── COPS ─────────────────────────────────────────────────────────────────
  const daysWorkedThisMonth = completedThisMonth.reduce((s, j) => s + (j.actual_days ?? j.quoted_days ?? 0), 0)
  const daysRemainingThisMonth = COPS.billableDaysPerMonth - daysWorkedThisMonth
  const onTrackToBreakeven = mtdLabourValue >= (COPS.monthlyTotal * (daysWorkedThisMonth / COPS.billableDaysPerMonth))

  // ── Alerts ────────────────────────────────────────────────────────────────
  const alerts = []

  if (lowest < 0) {
    alerts.push({
      severity: 'critical',
      type: 'cash_negative',
      title: `Cash goes negative on ${lowestDate}`,
      body: `Projected balance: $${Math.round(lowest).toLocaleString()}. Immediate action required.`,
    })
  }
  if (cashOnNextCrewDate < nextCrewAmount * 1.5) {
    alerts.push({
      severity: 'critical',
      type: 'payroll_cash_low',
      title: `Cash low before payroll on ${nextCrewDate}`,
      body: `Balance: $${Math.round(cashOnNextCrewDate).toLocaleString()} vs payroll $${Math.round(nextCrewAmount).toLocaleString()}`,
    })
  }
  if (balanceToday < TARGETS.cashCritical) {
    alerts.push({ severity: 'critical', type: 'cash_critical', title: `Cash below $${TARGETS.cashCritical.toLocaleString()}`, body: `Current: $${Math.round(balanceToday).toLocaleString()}` })
  } else if (balanceToday < TARGETS.cashWarning) {
    alerts.push({ severity: 'warning', type: 'cash_warning', title: `Cash below $${TARGETS.cashWarning.toLocaleString()}`, body: `Current: $${Math.round(balanceToday).toLocaleString()}` })
  }
  for (const j of quotesOverdueFu) {
    const days = Math.floor((today.getTime() - new Date(j.quote_sent_date!).getTime()) / 86400000)
    alerts.push({ severity: 'warning', type: 'quote_overdue', title: `${j.name} — ${days} days since quote`, body: `Client: ${j.client_name}. Value: $${j.quoted_labour_value?.toLocaleString()}` })
  }
  for (const j of wonNotStarted) {
    if (!j.start_date) {
      const days = j.won_date ? Math.floor((today.getTime() - new Date(j.won_date).getTime()) / 86400000) : 0
      if (days >= 3) {
        alerts.push({ severity: 'warning', type: 'no_dates_set', title: `${j.name} — won ${days} days ago, no dates set`, body: 'Ops: set start/completion dates to generate cashflow.' })
      }
    }
  }
  for (const j of inProgressJobs) {
    if (j.quoted_gp_pct && j.quoted_gp_pct < TARGETS.gpPctAmber) {
      alerts.push({ severity: 'critical', type: 'gp_below_warn', title: `${j.name} — GP ${Math.round(j.quoted_gp_pct * 100)}% below threshold`, body: `Minimum 36%. Review costs immediately.` })
    }
  }

  return NextResponse.json({
    snapshot_date: todayStr,
    cash: {
      balance_today: Math.round(balanceToday),
      projected_day_30: Math.round(projected),
      lowest_balance: Math.round(lowest),
      lowest_date: lowestDate,
      status: cashStatus,
    },
    cops: {
      monthly_total: COPS.monthlyTotal,
      daily_rate: COPS.dailyTotal,
      days_worked_this_month: daysWorkedThisMonth,
      days_remaining_this_month: daysRemainingThisMonth,
      on_track_to_breakeven: onTrackToBreakeven,
      breakeven_revenue_monthly: COPS.breakevenMonthly,
    },
    jobs: {
      in_progress: inProgressJobs,
      quoted: quotedJobs,
      won_not_started: wonNotStarted,
      completed_this_month: completedThisMonth,
      avg_gp_pct_month_to_date: avgGpPctMtd,
      total_labour_value_mtd: Math.round(mtdLabourValue),
    },
    pipeline: {
      total_labour_value: pipelineJobs.reduce((s, j) => s + (j.quoted_labour_value ?? 0), 0),
      total_job_value: pipelineJobs.reduce((s, j) => s + (j.quoted_total_value ?? 0), 0),
      by_tier: {
        red: pipelineJobs.filter(j => j.jw_tier === 'red').length,
        black: pipelineJobs.filter(j => j.jw_tier === 'black').length,
        blue: pipelineJobs.filter(j => j.jw_tier === 'blue').length,
      },
      quotes_overdue_followup: quotesOverdueFu.map(j => ({
        id: j.id, name: j.name, client: j.client_name,
        days_since_sent: Math.floor((today.getTime() - new Date(j.quote_sent_date!).getTime()) / 86400000),
        labour_value: j.quoted_labour_value,
      })),
      quotes_expiring: quotesExpiring.map(j => ({
        id: j.id, name: j.name, client: j.client_name,
        days_since_sent: Math.floor((today.getTime() - new Date(j.quote_sent_date!).getTime()) / 86400000),
      })),
    },
    payroll: {
      next_crew_date: nextCrewDate,
      next_crew_amount: nextCrewAmount * 2, // fortnightly
      cash_on_next_crew_date: Math.round(cashOnNextCrewDate),
      owner_weekly_gross: PAYROLL.ownerWeeklyGross,
    },
    team: {
      crew_active: crew.map(c => ({ id: c.id, name: c.name, type: c.type })),
      crew_on_jobs_today: inProgressJobs.length > 0 ? crew.filter(c => c.type === 'full_time') : [],
    },
    alerts: alerts.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 }
      return order[a.severity as keyof typeof order] - order[b.severity as keyof typeof order]
    }),
    targets: TARGETS,
    standing_instructions: instructions.map(m => m.content),
  })
}
