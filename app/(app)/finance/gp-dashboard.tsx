'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MetricCard } from '@/components/ui/metric-card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercent, gpTrafficLight, revenuePerHourTrafficLight } from '@/lib/utils'
import type { Job } from '@/lib/types/database'
import { TARGETS } from '@/lib/constants'

interface JobWithProduct extends Job {
  products?: { name: string; category: string } | null
}

export function GpDashboard() {
  const [jobs, setJobs] = useState<JobWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

    supabase
      .from('jobs')
      .select('*, products(name, category)')
      .in('status', ['in_progress', 'complete', 'won', 'scheduled'])
      .gte('won_date', monthStart)
      .is('deleted_at', null)
      .order('won_date', { ascending: false })
      .then(({ data }) => {
        setJobs(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-6">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse bg-[#111] rounded" />
          ))}
        </div>
      </div>
    )
  }

  // Aggregate metrics
  const completeJobs = jobs.filter(j => j.status === 'complete')
  const activeJobs = jobs.filter(j => ['in_progress', 'won', 'scheduled'].includes(j.status))

  const totalLabourValue = jobs.reduce((s, j) => s + (j.actual_labour_value ?? j.quoted_labour_value ?? 0), 0)
  const totalGpAmount = jobs.reduce((s, j) => s + (j.actual_gp_amount ?? j.quoted_gp_amount ?? 0), 0)
  const avgGpPct = totalLabourValue > 0 ? totalGpAmount / totalLabourValue : null
  const totalHours = jobs.reduce((s, j) => s + (j.actual_labour_hours ?? j.quoted_labour_hours ?? 0), 0)
  const revenuePerHour = totalHours > 0 ? totalLabourValue / totalHours : null

  return (
    <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-6 space-y-5">
      <div>
        <h2 className="text-sm font-medium text-[#e8ddd0]">GP Dashboard</h2>
        <p className="text-xs text-[#444] mt-0.5">Month to date — {jobs.length} jobs</p>
      </div>

      {/* Aggregate metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Avg GP%"
          value={avgGpPct != null ? formatPercent(avgGpPct) : '—'}
          traffic={avgGpPct != null ? gpTrafficLight(avgGpPct) : undefined}
          sub="on labour value"
          size="sm"
        />
        <MetricCard
          label="Labour Revenue"
          value={formatCurrency(totalLabourValue)}
          size="sm"
        />
        <MetricCard
          label="Rev / Hour"
          value={revenuePerHour != null ? `$${Math.round(revenuePerHour)}` : '—'}
          traffic={revenuePerHour != null ? revenuePerHourTrafficLight(revenuePerHour) : undefined}
          size="sm"
        />
      </div>

      {/* Per-job GP table */}
      <div>
        <p className="text-xs text-[#444] uppercase tracking-wider mb-2">Per Job</p>
        {jobs.length === 0 ? (
          <p className="text-sm text-[#444] py-4 text-center">No jobs this month</p>
        ) : (
          <div className="space-y-1">
            {jobs.map(j => {
              const gp = j.actual_gp_pct ?? j.quoted_gp_pct
              const lv = j.actual_labour_value ?? j.quoted_labour_value
              const isActual = !!j.actual_gp_pct
              const light = gp != null ? gpTrafficLight(gp) : null

              return (
                <div key={j.id} className="flex items-center gap-3 py-2 border-b border-[#111] text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="text-[#e8ddd0] truncate">{j.name}</p>
                    <p className="text-[#444]">{j.client_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[#e8ddd0] font-mono">{formatCurrency(lv)}</p>
                    <p className="text-[#444]">labour value</p>
                  </div>
                  <div className="text-right shrink-0 w-16">
                    <p className={`font-mono font-medium ${
                      light === 'green' ? 'text-green-400'
                      : light === 'amber' ? 'text-amber-400'
                      : light === 'red' ? 'text-red-400'
                      : 'text-[#444]'
                    }`}>
                      {gp != null ? formatPercent(gp) : '—'}
                    </p>
                    <p className="text-[#333]">{isActual ? 'actual' : 'quoted'}</p>
                  </div>
                  <Badge
                    variant={j.status === 'complete' ? 'green' : j.status === 'in_progress' ? 'gold' : 'muted'}
                  >
                    {j.status.replace('_', ' ')}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Credit facility — info only */}
      <div className="rounded border border-[#161616] bg-[#111] p-3">
        <p className="text-xs text-[#444] uppercase tracking-wider mb-1.5">Credit Facility (info only)</p>
        <div className="flex justify-between text-xs">
          <span className="text-[#444]">Limit</span>
          <span className="text-[#e8ddd0] font-mono">$65,000</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-[#444]">Drawn</span>
          <span className="text-[#e8ddd0] font-mono">$5,000</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-[#444]">Headroom</span>
          <span className="text-green-400 font-mono">$60,000</span>
        </div>
        <p className="text-[#2a2a2a] text-xs mt-2">Not factored into cashflow calculations</p>
      </div>
    </div>
  )
}
