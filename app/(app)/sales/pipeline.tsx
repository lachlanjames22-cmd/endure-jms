'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercent, formatDateShort, daysSince, gpTrafficLight } from '@/lib/utils'
import type { Job } from '@/lib/types/database'
import { AlertTriangle, TrendingUp, DollarSign, Target, Percent } from 'lucide-react'

interface JobWithProduct extends Job {
  products?: { name: string } | null
}

type FilterStatus = 'all' | 'quoted' | 'won' | 'lost'

interface Props {
  jobs: JobWithProduct[]
}

export function Pipeline({ jobs: initialJobs }: Props) {
  const [jobs] = useState(initialJobs)
  const [filter, setFilter] = useState<FilterStatus>('all')

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter)

  // ── Metrics ──────────────────────────────────────────────────────────────────
  const quotedJobs  = jobs.filter(j => j.status === 'quoted')
  const wonJobs     = jobs.filter(j => j.status === 'won')
  const lostJobs    = jobs.filter(j => j.status === 'lost')
  const decidedJobs = [...wonJobs, ...lostJobs]

  const pipelineValue = quotedJobs.reduce((s, j) => s + (j.quoted_total_value ?? 0), 0)
  const wonValue      = wonJobs.reduce((s, j) => s + (j.quoted_total_value ?? 0), 0)
  const winRate       = decidedJobs.length > 0 ? wonJobs.length / decidedJobs.length : null

  const allDeals   = jobs.filter(j => (j.quoted_total_value ?? 0) > 0)
  const avgDeal    = allDeals.length > 0
    ? allDeals.reduce((s, j) => s + (j.quoted_total_value ?? 0), 0) / allDeals.length
    : 0

  const avgGP = wonJobs.filter(j => j.quoted_gp_pct != null).length > 0
    ? wonJobs.reduce((s, j) => s + (j.quoted_gp_pct ?? 0), 0) / wonJobs.filter(j => j.quoted_gp_pct != null).length
    : null

  return (
    <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-[#e8ddd0]">Pipeline</h2>
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
              {s !== 'all' && (
                <span className="ml-1 text-[#333]">
                  ({s === 'quoted' ? quotedJobs.length : s === 'won' ? wonJobs.length : lostJobs.length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* BDM Metrics Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-[#161616] bg-[#111] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="h-3 w-3 text-[#444]" />
            <p className="text-[10px] text-[#444] uppercase tracking-wider">Pipeline</p>
          </div>
          <p className="font-mono text-sm font-medium text-[#e8ddd0]">{formatCurrency(pipelineValue)}</p>
          <p className="text-[10px] text-[#333] mt-0.5">{quotedJobs.length} quotes open</p>
        </div>

        <div className="rounded-md border border-[#161616] bg-[#111] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3 w-3 text-[#444]" />
            <p className="text-[10px] text-[#444] uppercase tracking-wider">Won</p>
          </div>
          <p className="font-mono text-sm font-medium text-[#e8ddd0]">{formatCurrency(wonValue)}</p>
          <p className="text-[10px] text-[#333] mt-0.5">{wonJobs.length} job{wonJobs.length !== 1 ? 's' : ''} won</p>
        </div>

        <div className="rounded-md border border-[#161616] bg-[#111] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="h-3 w-3 text-[#444]" />
            <p className="text-[10px] text-[#444] uppercase tracking-wider">Win Rate</p>
          </div>
          <p className="font-mono text-sm font-medium text-[#e8ddd0]">
            {winRate != null ? `${Math.round(winRate * 100)}%` : '—'}
          </p>
          <p className="text-[10px] text-[#333] mt-0.5">
            {decidedJobs.length > 0 ? `${wonJobs.length}/${decidedJobs.length} decided` : 'no decisions yet'}
          </p>
        </div>

        <div className="rounded-md border border-[#161616] bg-[#111] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Percent className="h-3 w-3 text-[#444]" />
            <p className="text-[10px] text-[#444] uppercase tracking-wider">Avg Deal</p>
          </div>
          <p className="font-mono text-sm font-medium text-[#e8ddd0]">{formatCurrency(avgDeal)}</p>
          <p className={`text-[10px] mt-0.5 ${
            avgGP != null
              ? gpTrafficLight(avgGP) === 'green' ? 'text-green-500'
              : gpTrafficLight(avgGP) === 'amber' ? 'text-amber-400'
              : 'text-red-400'
              : 'text-[#333]'
          }`}>
            {avgGP != null ? `${formatPercent(avgGP)} avg GP` : 'no GP data'}
          </p>
        </div>
      </div>

      {/* Job list */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-sm text-[#444] py-8 text-center">No quotes yet</p>
        )}
        {filtered.map(job => {
          const gp = job.quoted_gp_pct
          const daysOld = daysSince(job.quote_sent_date)
          const isOverdue  = job.status === 'quoted' && daysOld != null && daysOld > 10
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
                  <p className="text-[#444]">Total ex GST</p>
                  <p className="font-mono text-[#e8ddd0] font-medium">{formatCurrency(job.quoted_total_value)}</p>
                </div>
                {job.quoted_labour_value && (
                  <div>
                    <p className="text-[#444]">Labour</p>
                    <p className="font-mono text-[#e8ddd0]">{formatCurrency(job.quoted_labour_value)}</p>
                  </div>
                )}
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
                  {isExpiring && <Badge variant="red">Expiring</Badge>}
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
