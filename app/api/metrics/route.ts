import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [pfRes, crewRes, jobsRes, cashflowRes] = await Promise.all([
    admin.from('pf_accounts').select('name, balance'),
    supabase.from('crew').select('name, sentiment_score').is('deleted_at', null).eq('active', true),
    supabase.from('jobs').select('id, quoted_total_value, actual_labour_hours, dna_margin').is('deleted_at', null).eq('status', 'complete').order('updated_at', { ascending: false }).limit(10),
    supabase.from('cashflow_events').select('amount, paid_date').eq('type', 'inflow').gte('paid_date', monthStart).lte('paid_date', monthEnd),
  ])

  const pfAccounts = Object.fromEntries((pfRes.data ?? []).map(a => [a.name, a.balance]))
  const crew = crewRes.data ?? []
  const completedJobs = jobsRes.data ?? []
  const thisMonthInflows = cashflowRes.data ?? []

  // GP/hr average from last 3 complete jobs with hours data
  const jobsWithHours = completedJobs.filter(j => j.actual_labour_hours && j.actual_labour_hours > 0 && j.quoted_total_value)
  const last3 = jobsWithHours.slice(0, 3)
  const gpHrAvg = last3.length > 0
    ? last3.reduce((sum, j) => {
        const gp = (j.quoted_total_value ?? 0) * ((j.dna_margin ?? 45) / 100)
        const hrs = j.actual_labour_hours ?? 1
        return sum + gp / hrs
      }, 0) / last3.length
    : 0

  // Crew sentiment average
  const crewWithSentiment = crew.filter(c => c.sentiment_score != null)
  const crewSentimentAvg = crewWithSentiment.length > 0
    ? crewWithSentiment.reduce((s, c) => s + (c.sentiment_score ?? 0), 0) / crewWithSentiment.length
    : 0

  // Baylee sentiment
  const baylee = crew.find(c => c.name.toLowerCase().includes('baylee'))
  const bayleeSentiment = baylee?.sentiment_score ?? 0

  // Revenue this month
  const revenueThisMonth = thisMonthInflows.reduce((s, e) => s + e.amount, 0)

  // Avg GP% from completed jobs with dna_margin
  const jobsWithGP = completedJobs.filter(j => j.dna_margin != null)
  const avgGPpct = jobsWithGP.length > 0
    ? jobsWithGP.reduce((s, j) => s + (j.dna_margin ?? 0), 0) / jobsWithGP.length / 100
    : 0.45

  return NextResponse.json({
    profitAccount: pfAccounts['profit'] ?? 0,
    cashTransactions: pfAccounts['transactions'] ?? 0,
    gpHrAvg3Jobs: Math.round(gpHrAvg),
    consecutiveDaysAbove20k: 0, // requires cashflow projection — defaulting to 0
    crewSentimentAvg: Math.round(crewSentimentAvg * 10) / 10,
    baylee_effort_avg: Math.round(bayleeSentiment * 10) / 10,
    revenueThisMonth: Math.round(revenueThisMonth),
    avgMonthlyRevenue: Math.round(revenueThisMonth),
    avgGPpct: Math.round(avgGPpct * 100) / 100,
    consecutiveJobsClean: completedJobs.length,
    weeksOffTools: 0,
  })
}
