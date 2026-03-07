'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateShort, cn } from '@/lib/utils'
import { CheckCircle2, Plus, X } from 'lucide-react'

interface CashflowEvent {
  id: string
  type: 'inflow' | 'outflow'
  category: string
  label: string
  amount: number
  scheduled_date: string
  paid_date: string | null
  job_id: string | null
}

const CATEGORIES = ['deposit', 'materials_claim', 'subframe_claim', 'completion_claim', 'payroll', 'materials', 'opex', 'tax', 'adhoc']
const CAT_LABELS: Record<string, string> = {
  deposit: 'Deposit', materials_claim: 'Materials claim', subframe_claim: 'Subframe claim',
  completion_claim: 'Completion claim', payroll: 'Payroll', materials: 'Materials',
  opex: 'Opex', tax: 'Tax', adhoc: 'Ad-hoc',
}

function AddEventForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const supabase = createClient()
  const [type, setType]         = useState<'inflow' | 'outflow'>('inflow')
  const [category, setCategory] = useState('adhoc')
  const [label, setLabel]       = useState('')
  const [amount, setAmount]     = useState('')
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0])
  const [markPaid, setMarkPaid] = useState(false)
  const [saving, setSaving]     = useState(false)

  async function save() {
    if (!label || !amount || !date) return
    setSaving(true)
    await supabase.from('cashflow_events').insert({
      type,
      category,
      label,
      amount: parseFloat(amount),
      scheduled_date: date,
      paid_date: markPaid ? date : null,
      auto_generated: false,
    })
    setSaving(false)
    onSave()
  }

  return (
    <div className="rounded-lg border border-[#b8935a]/20 bg-[#0c0c0c] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#b8935a] uppercase tracking-wider">Add Cash Event</p>
        <button onClick={onCancel} className="text-[#444] hover:text-[#e8ddd0]">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Type */}
      <div className="flex gap-2">
        {(['inflow', 'outflow'] as const).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              'flex-1 rounded py-1.5 text-xs font-medium border transition-colors',
              type === t
                ? t === 'inflow' ? 'border-green-400/40 bg-green-400/10 text-green-400' : 'border-red-400/40 bg-red-400/10 text-red-400'
                : 'border-[#161616] text-[#444]'
            )}
          >
            {t === 'inflow' ? '+ Inflow' : '− Outflow'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Category */}
        <div>
          <label className="text-xs text-[#444]">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="mt-1 w-full rounded border border-[#222] bg-[#111] px-2 py-1.5 text-xs text-[#e8ddd0] focus:outline-none focus:border-[#b8935a]/40"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="text-xs text-[#444]">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="mt-1 w-full rounded border border-[#222] bg-[#111] px-2 py-1.5 text-xs text-[#e8ddd0] focus:outline-none focus:border-[#b8935a]/40"
          />
        </div>

        {/* Label */}
        <div className="col-span-2">
          <label className="text-xs text-[#444]">Description</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Smith deposit received"
            className="mt-1 w-full rounded border border-[#222] bg-[#111] px-2 py-1.5 text-xs text-[#e8ddd0] placeholder:text-[#333] focus:outline-none focus:border-[#b8935a]/40"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-[#444]">Amount ($)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            className="mt-1 w-full rounded border border-[#222] bg-[#111] px-2 py-1.5 text-xs text-[#e8ddd0] placeholder:text-[#333] focus:outline-none focus:border-[#b8935a]/40"
          />
        </div>

        {/* Already paid toggle */}
        <div className="flex items-end pb-1.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setMarkPaid(p => !p)}
              className={cn(
                'h-4 w-7 rounded-full border transition-colors cursor-pointer',
                markPaid ? 'bg-green-400/20 border-green-400/40' : 'bg-[#111] border-[#222]'
              )}
            >
              <div className={cn(
                'h-3 w-3 rounded-full bg-[#444] m-0.5 transition-transform',
                markPaid && 'translate-x-3 bg-green-400'
              )} />
            </div>
            <span className="text-xs text-[#444]">Already received</span>
          </label>
        </div>
      </div>

      <button
        onClick={save}
        disabled={!label || !amount || saving}
        className="w-full rounded-lg bg-[#b8935a] py-2 text-xs font-medium text-[#080808] hover:bg-[#c9a46a] transition-colors disabled:opacity-40"
      >
        {saving ? 'Saving...' : 'Add Event'}
      </button>
    </div>
  )
}

export function CashflowEvents() {
  const supabase = createClient()
  const [events, setEvents]     = useState<CashflowEvent[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [marking, setMarking]   = useState<string | null>(null)

  const load = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const future = new Date()
    future.setDate(future.getDate() + 45)
    const futureStr = future.toISOString().split('T')[0]

    const { data } = await supabase
      .from('cashflow_events')
      .select('*')
      .gte('scheduled_date', today)
      .lte('scheduled_date', futureStr)
      .order('scheduled_date', { ascending: true })
      .limit(30)

    setEvents(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Listen for Jarvis tool actions
  useEffect(() => {
    const handler = () => load()
    window.addEventListener('jarvis:refresh', handler)
    return () => window.removeEventListener('jarvis:refresh', handler)
  }, [load])

  async function markPaid(eventId: string) {
    setMarking(eventId)
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('cashflow_events').update({ paid_date: today }).eq('id', eventId)
    await load()
    setMarking(null)
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-6">
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse bg-[#111] rounded" />)}
        </div>
      </div>
    )
  }

  const unpaid = events.filter(e => !e.paid_date)
  const paid   = events.filter(e => e.paid_date)

  return (
    <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-[#e8ddd0]">Cash Events</h2>
          <p className="text-xs text-[#444] mt-0.5">Next 45 days · click to mark paid</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 rounded-lg border border-[#222] px-2.5 py-1.5 text-xs text-[#444] hover:border-[#b8935a]/30 hover:text-[#b8935a] transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add event
        </button>
      </div>

      {showForm && (
        <AddEventForm
          onSave={() => { setShowForm(false); load() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {unpaid.length === 0 && !showForm && (
        <p className="text-xs text-[#2a2a2a] text-center py-4">No upcoming events</p>
      )}

      {/* Unpaid events */}
      <div className="space-y-1">
        {unpaid.map(ev => (
          <div
            key={ev.id}
            className="flex items-center gap-3 rounded-lg border border-[#161616] bg-[#111] px-3 py-2.5 group hover:border-[#222] transition-colors"
          >
            <div className={cn(
              'text-xs font-medium w-2 h-2 rounded-full shrink-0',
              ev.type === 'inflow' ? 'bg-green-400' : 'bg-red-400'
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#e8ddd0] truncate">{ev.label}</p>
              <p className="text-xs text-[#444]">{formatDateShort(ev.scheduled_date)} · {CAT_LABELS[ev.category] ?? ev.category}</p>
            </div>
            <span className={cn(
              'text-xs font-mono shrink-0',
              ev.type === 'inflow' ? 'text-green-400' : 'text-red-400'
            )}>
              {ev.type === 'inflow' ? '+' : '−'}{formatCurrency(ev.amount)}
            </span>
            <button
              onClick={() => markPaid(ev.id)}
              disabled={marking === ev.id}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[#444] hover:text-green-400"
              title="Mark as paid/received"
            >
              <CheckCircle2 className={cn('h-4 w-4', marking === ev.id && 'animate-spin')} />
            </button>
          </div>
        ))}
      </div>

      {/* Paid events (collapsed) */}
      {paid.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-[#2a2a2a] uppercase tracking-wider">Received</p>
          {paid.map(ev => (
            <div
              key={ev.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 opacity-40"
            >
              <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
              <p className="text-xs text-[#e8ddd0] flex-1 truncate line-through">{ev.label}</p>
              <span className="text-xs font-mono text-[#444]">{formatCurrency(ev.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
