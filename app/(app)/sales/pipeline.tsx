'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPercent, formatDateShort, daysSince, gpTrafficLight } from '@/lib/utils'
import type { Job } from '@/lib/types/database'
import { AlertTriangle } from 'lucide-react'

interface JobWithProduct extends Job {
  products?: { name: string } | null
}

type FilterStatus = 'all' | 'quoted' | 'won' | 'lost'

interface Props {
  jobs: JobWithProduct[]
}

export function Pipeline({ jobs: initialJobs }: Props) {
  const [jobs, setJobs] = useState(initialJobs)
  const [filter, setFilter] = useState<FilterStatus>('all')

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter)

  const totalLabourValue = jobs
    .filter(j => j.status === 'quoted')
    .reduce((s, j) => s + (j.quoted_labour_value ?? 0), 0)

  const winRate = (() => {
    const decided = jobs.filter(j => ['won', 'lost'].includes(j.status))
    const won = jobs.filter(j => j.status === 'won')
    return decided.length > 0 ? won.length / decided.length : null
  })()

  return (
    <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-[#e8ddd0]">Pipeline</h2>
          <p className="text-xs text-[#444] mt-0.5">
            {formatCurrency(totalLabourValue)} quoted labour value
            {winRate != null && ` · ${Math.round(winRate * 100)}% win rate`}
          </p>
        </div>
        <div className="flex gap-1">
          {(['all', 'quoted', 'won', 'lost'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-2 py-0.5 rounded text-xs ${
                filter === s ? 'bg-[#b8935a]/10 text-[#b8935a]' : 'text-[#444] hover:text-[#e8ddd0]'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-sm text-[#444] py-8 text-center">No quotes yet</p>
        )}
        {filtered.map(job => {
          const gp = job.quoted_gp_pct
          const daysOld = daysSince(job.quote_sent_date)
          const isOverdue = job.status === 'quoted' && daysOld != null && daysOld > 10
          const isExpiring = job.status === 'quoted' && daysOld != null && daysOld > 25

          return (
            <div key={job.id} className="rounded-lg border border-[#161616] bg-[#111] p-3 text-xs space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-[#e8ddd0] font-medium truncate">{job.name}</p>
                  <p className="text-[#444]">{job.client_name} · {job.suburb}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Badge variant={job.jw_tier === 'red' ? 'red' : job.jw_tier === 'black' ? 'muted' : 'gold'}>
                    JW {job.jw_tier.toUpperCase()}
                  </Badge>
                  <Badge variant={
                    job.status === 'won' ? 'green'
                    : job.status === 'lost' ? 'red'
                    : 'muted'
                  }>
                    {job.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[#444]">Labour value</p>
                  <p className="font-mono text-[#e8ddd0]">{formatCurrency(job.quoted_labour_value)}</p>
                </div>
                <div>
                  <p className="text-[#444]">Total ex GST</p>
                  <p className="font-mono text-[#e8ddd0]">{formatCurrency(job.quoted_total_value)}</p>
                </div>
                {gp != null && (
                  <div>
                    <p className="text-[#444]">GP</p>
                    <p className={`font-mono font-medium ${
                      gpTrafficLight(gp) === 'green' ? 'text-green-400'
                      : gpTrafficLight(gp) === 'amber' ? 'text-amber-400'
                      : 'text-red-400'
                    }`}>
                      {formatPercent(gp)}
                    </p>
                  </div>
                )}
                {job.sqm && (
                  <div>
                    <p className="text-[#444]">Size</p>
                    <p className="text-[#e8ddd0]">{job.sqm}m²</p>
                  </div>
                )}
              </div>

              {job.quote_sent_date && (
                <div className="flex items-center justify-between">
                  <span className="text-[#444]">
                    Sent {formatDateShort(job.quote_sent_date)}
                    {daysOld != null && ` (${daysOld}d ago)`}
                  </span>
                  {isExpiring && (
                    <Badge variant="red">Expiring</Badge>
                  )}
                  {isOverdue && !isExpiring && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Follow up due</span>
                    </div>
                  )}
                </div>
              )}

              {job.lost_reason && (
                <p className="text-[#333]">Lost: {job.lost_reason}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
