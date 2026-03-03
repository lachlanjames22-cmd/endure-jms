'use client'

import { useEffect, useState } from 'react'
import { MetricCard } from '@/components/ui/metric-card'
import { createClient } from '@/lib/supabase/client'
import {
  formatCurrency, formatPercent,
  cashTrafficLight, gpTrafficLight, winRateTrafficLight,
  revenuePerHourTrafficLight,
} from '@/lib/utils'
import { COPS, TARGETS } from '@/lib/constants'

export function BusinessScorecard() {
  const [data, setData] = useState<{
    gp: number | null
    revenuePerHour: number | null
    winRate: number | null
    breakEvenDays: number | null
    revenueThisMonth: number | null
  } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const today = new Date()
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

      const { data: jobs } = await supabase
        .from('jobs')
        .select('status, actual_gp_pct, quoted_gp_pct, actual_labour_value, quoted_labour_value, actual_labour_hours, quoted_labour_hours, won_date, lost_date, quote_sent_date')
        .is('deleted_at', null)

      const allJobs = jobs ?? []

      // GP this month
      const mtdJobs = allJobs.filter(j =>
        ['in_progress', 'complete'].includes(j.status) && j.won_date && j.won_date >= monthStart
      )
      const totalLV = mtdJobs.reduce((s, j) => s + (j.actual_labour_value ?? j.quoted_labour_value ?? 0), 0)
      const totalGP = mtdJobs.reduce((s, j) => {
        const lv = j.actual_labour_value ?? j.quoted_labour_value ?? 0
        return s + lv * (j.actual_gp_pct ?? j.quoted_gp_pct ?? 0)
      }, 0)
      const gp = totalLV > 0 ? totalGP / totalLV : null

      // Revenue per hour
      const totalHours = mtdJobs.reduce((s, j) => s + (j.actual_labour_hours ?? j.quoted_labour_hours ?? 0), 0)
      const revenuePerHour = totalHours > 0 ? totalLV / totalHours : null

      // Win rate (last 30 jobs decided)
      const decided = allJobs.filter(j => ['won', 'lost'].includes(j.status)).slice(-30)
      const won = decided.filter(j => j.status === 'won')
      const winRate = decided.length >= 3 ? won.length / decided.length : null

      // Breakeven days this month
      const dayOfMonth = today.getDate()
      const revenuePerDay = totalLV / dayOfMonth
      const breakEvenDays = revenuePerDay > 0
        ? Math.ceil(COPS.breakevenMonthly / revenuePerDay)
        : null

      setData({ gp, revenuePerHour, winRate, breakEvenDays, revenueThisMonth: totalLV })
    }
    load()
  }, [])

  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-[#161616] bg-[#0c0c0c] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-[#e8ddd0] mb-3">Business Health</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="GP% MTD"
          value={data.gp != null ? formatPercent(data.gp) : '—'}
          sub="target 45%"
          traffic={data.gp != null ? gpTrafficLight(data.gp) : undefined}
          size="sm"
        />
        <MetricCard
          label="Rev / Hour"
          value={data.revenuePerHour != null ? `$${Math.round(data.revenuePerHour)}` : '—'}
          sub="target $100"
          traffic={data.revenuePerHour != null ? revenuePerHourTrafficLight(data.revenuePerHour) : undefined}
          size="sm"
        />
        <MetricCard
          label="Win Rate"
          value={data.winRate != null ? formatPercent(data.winRate) : '—'}
          sub="target 40%"
          traffic={data.winRate != null ? winRateTrafficLight(data.winRate) : undefined}
          size="sm"
        />
        <MetricCard
          label="Breakeven Day"
          value={data.breakEvenDays != null ? `Day ${data.breakEvenDays}` : '—'}
          sub={`of ${COPS.billableDaysPerMonth} avail`}
          traffic={
            data.breakEvenDays == null ? undefined
            : data.breakEvenDays <= 10 ? 'green'
            : data.breakEvenDays <= 15 ? 'amber'
            : 'red'
          }
          size="sm"
        />
      </div>
    </div>
  )
}
