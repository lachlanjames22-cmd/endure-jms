'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercent, formatDateShort, daysSince, gpTrafficLight } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'
import type { Job } from '@/lib/types/database'

export function PipelineSummary() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('jobs')
      .select('*')
      .in('status', ['quoted', 'won', 'scheduled', 'in_progress'])
      .is('deleted_at', null)
      .order('quote_sent_date', { ascending: false })
      .then(({ data }) => {
        setJobs(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="h-40 rounded-lg border border-[#161616] bg-[#0c0c0c] animate-pulse" />

  const kanbanCounts = ['quoted', 'won', 'scheduled', 'in_progress'].map(s => ({
    status: s,
    count: jobs.filter(j => j.status === s).length,
    value: jobs.filter(j => j.status === s).reduce((sum, j) => sum + (j.quoted_labour_value ?? 0), 0),
  }))

  const overdue = jobs.filter(j => {
    if (j.status !== 'quoted' || !j.quote_sent_date) return false
    return (daysSince(j.quote_sent_date) ?? 0) > 10
  })

  const noDates = jobs.filter(j => j.status === 'won' && !j.start_date)

  return (
    <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-5 space-y-4">
      <h2 className="text-sm font-medium text-[#e8ddd0]">Live Pipeline</h2>

      {/* Kanban summary */}
      <div className="grid grid-cols-4 gap-2">
        {kanbanCounts.map(({ status, count, value }) => (
          <div key={status} className="rounded border border-[#161616] bg-[#111] p-3 text-center">
            <p className="text-xs text-[#444] capitalize">{status.replace('_', ' ')}</p>
            <p className="text-xl font-mono font-semibold text-[#e8ddd0] mt-1">{count}</p>
            {value > 0 && (
              <p className="text-xs text-[#444] mt-0.5">{formatCurrency(value)}</p>
            )}
          </div>
        ))}
      </div>

      {/* Alerts */}
      {overdue.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-[#444] uppercase tracking-wider">Follow-ups overdue</p>
          {overdue.slice(0, 5).map(j => (
            <div key={j.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-[#111]">
              <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="flex-1 text-[#e8ddd0] truncate">{j.name}</span>
              <span className="text-[#444]">{daysSince(j.quote_sent_date)}d old</span>
              <span className="font-mono text-[#444]">{formatCurrency(j.quoted_labour_value)}</span>
            </div>
          ))}
        </div>
      )}

      {noDates.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-[#444] uppercase tracking-wider">Won — no dates set</p>
          {noDates.map(j => (
            <div key={j.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-[#111]">
              <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="flex-1 text-[#e8ddd0] truncate">{j.name}</span>
              <Badge variant="amber">Set dates in Ops</Badge>
            </div>
          ))}
        </div>
      )}

      {overdue.length === 0 && noDates.length === 0 && (
        <p className="text-xs text-green-400">All clear — no overdue follow-ups or missing dates.</p>
      )}
    </div>
  )
}
