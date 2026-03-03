'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatPercent, formatDateShort, daysSince, gpTrafficLight, cn } from '@/lib/utils'
import { AlertTriangle, Calendar, Clock, Plus, X } from 'lucide-react'
import type { Job, Crew } from '@/lib/types/database'
import type { JobStatus } from '@/lib/types/database'

const COLUMNS: { status: JobStatus; label: string }[] = [
  { status: 'quoted',      label: 'Quoted' },
  { status: 'won',         label: 'Won' },
  { status: 'scheduled',  label: 'Scheduled' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'complete',   label: 'Complete' },
]

interface JobWithProduct extends Job {
  products?: { id: string; name: string; category: string } | null
}

interface Props {
  initialJobs: JobWithProduct[]
  crew: Crew[]
}

// ── Date modal (mandatory when moving to Won) ─────────────────────────────────
interface DateModalProps {
  job: JobWithProduct
  onSave: (dates: {
    start_date: string
    materials_order_date: string
    materials_delivery_date: string
    subframe_complete_date: string
    completion_date: string
  }) => void
  onClose: () => void
}

function DateModal({ job, onSave, onClose }: DateModalProps) {
  const [dates, setDates] = useState({
    start_date: '',
    materials_order_date: '',
    materials_delivery_date: '',
    subframe_complete_date: '',
    completion_date: '',
  })
  const [saving, setSaving] = useState(false)

  function set(key: string, value: string) {
    setDates(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!dates.start_date || !dates.materials_delivery_date || !dates.subframe_complete_date || !dates.completion_date) {
      alert('All 4 key dates are required to generate cashflow events.')
      return
    }
    setSaving(true)
    onSave(dates)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-md rounded-xl border border-[#222] bg-[#0c0c0c] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-['Georgia',serif] text-[#e8ddd0]">Set Job Dates</h2>
            <p className="text-xs text-[#444] mt-0.5">{job.name} — required before proceeding</p>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-[#e8ddd0]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Input
            label="Start Date"
            type="date"
            value={dates.start_date}
            onChange={e => set('start_date', e.target.value)}
          />
          <Input
            label="Materials Order Date"
            type="date"
            value={dates.materials_order_date}
            onChange={e => set('materials_order_date', e.target.value)}
          />
          <Input
            label="Materials Delivery Date *"
            type="date"
            value={dates.materials_delivery_date}
            onChange={e => set('materials_delivery_date', e.target.value)}
          />
          <Input
            label="Subframe Complete Date *"
            type="date"
            value={dates.subframe_complete_date}
            onChange={e => set('subframe_complete_date', e.target.value)}
          />
          <Input
            label="Completion Date *"
            type="date"
            value={dates.completion_date}
            onChange={e => set('completion_date', e.target.value)}
          />
        </div>

        <div className="mt-2 rounded bg-[#b8935a]/5 border border-[#b8935a]/20 p-2.5 text-xs text-[#b8935a]">
          Setting these dates will auto-generate 4 cashflow events (10/50/20/20% claims) and notify Finance.
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={handleSave}>
            Save & Confirm Won
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Job card ──────────────────────────────────────────────────────────────────
function JobCard({
  job,
  onStatusChange,
}: {
  job: JobWithProduct
  onStatusChange: (job: JobWithProduct, newStatus: JobStatus) => void
}) {
  const gp = job.actual_gp_pct ?? job.quoted_gp_pct
  const lv = job.actual_labour_value ?? job.quoted_labour_value
  const gpLight = gp != null ? gpTrafficLight(gp) : null
  const daysInStatus = daysSince(job.updated_at)
  const noDatesSet = job.status === 'won' && !job.start_date

  return (
    <div className={cn(
      'rounded-lg border bg-[#0c0c0c] p-3 text-xs space-y-2 cursor-default',
      noDatesSet ? 'border-amber-400/30' : 'border-[#161616]'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-[#e8ddd0] font-medium truncate">{job.name}</p>
          <p className="text-[#444] truncate">{job.client_name}</p>
        </div>
        <Badge variant={job.jw_tier === 'red' ? 'red' : job.jw_tier === 'black' ? 'muted' : 'gold'}>
          {job.jw_tier.toUpperCase()}
        </Badge>
      </div>

      {/* Details */}
      <div className="flex gap-3 text-[#444]">
        {job.sqm && <span>{job.sqm}m²</span>}
        {job.products?.name && <span className="truncate">{job.products.name}</span>}
      </div>

      {/* Financials */}
      <div className="flex items-center justify-between">
        <span className="text-[#e8ddd0] font-mono">{formatCurrency(lv)}</span>
        {gp != null && (
          <span className={`font-mono font-medium ${
            gpLight === 'green' ? 'text-green-400'
            : gpLight === 'amber' ? 'text-amber-400'
            : 'text-red-400'
          }`}>
            {formatPercent(gp)} GP
          </span>
        )}
      </div>

      {/* Dates / warnings */}
      {noDatesSet && (
        <div className="flex items-center gap-1 text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          <span>No dates set</span>
        </div>
      )}
      {job.start_date && (
        <div className="flex items-center gap-1 text-[#444]">
          <Calendar className="h-3 w-3" />
          <span>Starts {formatDateShort(job.start_date)}</span>
        </div>
      )}
      {daysInStatus != null && daysInStatus > 0 && (
        <div className="flex items-center gap-1 text-[#2a2a2a]">
          <Clock className="h-3 w-3" />
          <span>{daysInStatus}d in status</span>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-1 pt-1 border-t border-[#111]">
        {job.status === 'quoted' && (
          <>
            <button
              onClick={() => onStatusChange(job, 'won')}
              className="flex-1 text-center text-green-400 hover:bg-green-400/10 rounded py-1 transition-colors"
            >
              Won
            </button>
            <button
              onClick={() => onStatusChange(job, 'lost')}
              className="flex-1 text-center text-red-400 hover:bg-red-400/10 rounded py-1 transition-colors"
            >
              Lost
            </button>
          </>
        )}
        {job.status === 'won' && (
          <button
            onClick={() => onStatusChange(job, 'scheduled')}
            className="flex-1 text-center text-[#b8935a] hover:bg-[#b8935a]/10 rounded py-1 transition-colors"
          >
            Schedule
          </button>
        )}
        {job.status === 'scheduled' && (
          <button
            onClick={() => onStatusChange(job, 'in_progress')}
            className="flex-1 text-center text-[#b8935a] hover:bg-[#b8935a]/10 rounded py-1 transition-colors"
          >
            Start
          </button>
        )}
        {job.status === 'in_progress' && (
          <button
            onClick={() => onStatusChange(job, 'complete')}
            className="flex-1 text-center text-green-400 hover:bg-green-400/10 rounded py-1 transition-colors"
          >
            Complete
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Kanban ───────────────────────────────────────────────────────────────
export function JobKanban({ initialJobs, crew }: Props) {
  const [jobs, setJobs] = useState<JobWithProduct[]>(initialJobs)
  const [pendingWon, setPendingWon] = useState<JobWithProduct | null>(null)
  const [lostReason, setLostReason] = useState('')
  const [pendingLost, setPendingLost] = useState<JobWithProduct | null>(null)

  async function updateJobStatus(job: JobWithProduct, newStatus: JobStatus, extra: Record<string, unknown> = {}) {
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, _oldStatus: job.status, ...extra }),
    })
    if (res.ok) {
      const updated = await res.json()
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, ...updated } : j))
    }
  }

  function handleStatusChange(job: JobWithProduct, newStatus: JobStatus) {
    if (newStatus === 'won') {
      setPendingWon(job)
    } else if (newStatus === 'lost') {
      setPendingLost(job)
    } else {
      updateJobStatus(job, newStatus)
    }
  }

  async function handleWonSave(dates: Parameters<DateModalProps['onSave']>[0]) {
    if (!pendingWon) return
    await updateJobStatus(pendingWon, 'won', dates)
    setPendingWon(null)
  }

  async function handleLostConfirm() {
    if (!pendingLost) return
    await updateJobStatus(pendingLost, 'lost', { lost_reason: lostReason })
    setPendingLost(null)
    setLostReason('')
  }

  const activeJobs = jobs.filter(j => !['lost', 'complete'].includes(j.status))

  return (
    <>
      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colJobs = jobs.filter(j => j.status === col.status)
          const colValue = colJobs.reduce((s, j) => s + (j.quoted_labour_value ?? 0), 0)

          return (
            <div key={col.status} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-[#e8ddd0] uppercase tracking-wider">
                  {col.label}
                </h3>
                <div className="flex items-center gap-1">
                  <Badge variant="muted">{colJobs.length}</Badge>
                  {colValue > 0 && (
                    <span className="text-xs text-[#444]">{formatCurrency(colValue)}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 min-h-[200px]">
                {colJobs.map(job => (
                  <JobCard key={job.id} job={job} onStatusChange={handleStatusChange} />
                ))}
                {colJobs.length === 0 && (
                  <div className="h-20 rounded-lg border border-dashed border-[#161616] flex items-center justify-center">
                    <span className="text-xs text-[#2a2a2a]">Empty</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Date modal */}
      {pendingWon && (
        <DateModal
          job={pendingWon}
          onSave={handleWonSave}
          onClose={() => setPendingWon(null)}
        />
      )}

      {/* Lost reason modal */}
      {pendingLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm rounded-xl border border-[#222] bg-[#0c0c0c] p-6">
            <h2 className="text-lg font-['Georgia',serif] text-[#e8ddd0] mb-4">Mark as Lost</h2>
            <Input
              label="Lost Reason (optional)"
              placeholder="Price, timing, competition..."
              value={lostReason}
              onChange={e => setLostReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingLost(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleLostConfirm}>Confirm Lost</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
