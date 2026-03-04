'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface ComplianceItem {
  id: string
  name: string
  category: string
  renewal_date: string
  cost: number | null
  provider: string | null
  notes: string | null
  auto_renew: boolean
}

const CATEGORIES = ['registration','insurance','licence','vehicle','workcover','membership','other']

const CAT_LABELS: Record<string, string> = {
  registration: 'Registration',
  insurance:    'Insurance',
  licence:      'Licence',
  vehicle:      'Vehicle',
  workcover:    'WorkCover',
  membership:   'Membership',
  other:        'Other',
}

function daysUntil(date: string): number {
  const d = new Date(date)
  const now = new Date()
  now.setHours(0,0,0,0)
  return Math.ceil((d.getTime() - now.getTime()) / 86400000)
}

function urgencyClass(days: number) {
  if (days <= 7)  return 'text-red-400 border-red-400/20 bg-red-400/5'
  if (days <= 30) return 'text-amber-400 border-amber-400/20 bg-amber-400/5'
  if (days <= 60) return 'text-[#b8935a] border-[#b8935a]/20 bg-[#b8935a]/5'
  return 'text-[#444] border-[#161616] bg-[#0c0c0c]'
}

const BLANK = { name: '', category: 'registration', renewal_date: '', cost: '', provider: '', notes: '', auto_renew: false }

export function ComplianceClient({ initial }: { initial: ComplianceItem[] }) {
  const [items, setItems] = useState<ComplianceItem[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string, unknown>>(BLANK)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  const today = new Date().toISOString().slice(0, 10)
  const urgent   = items.filter(i => daysUntil(i.renewal_date) <= 30 && i.renewal_date >= today)
  const upcoming = items.filter(i => daysUntil(i.renewal_date) > 30 && i.renewal_date >= today)
  const expired  = items.filter(i => i.renewal_date < today)

  const displayed = filter === 'all'
    ? items
    : filter === 'urgent'
    ? urgent
    : filter === 'upcoming'
    ? upcoming
    : expired

  async function save() {
    if (!form.name || !form.renewal_date) return
    setSaving(true)
    const res = await fetch('/api/compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, cost: form.cost ? parseFloat(form.cost as string) : null }),
    })
    const data = await res.json()
    if (data.item) {
      setItems(prev => [...prev, data.item].sort((a,b) => a.renewal_date.localeCompare(b.renewal_date)))
      setForm(BLANK)
      setShowForm(false)
    }
    setSaving(false)
  }

  async function remove(id: string) {
    await fetch('/api/compliance', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'urgent',   label: `Urgent`, count: urgent.length,   color: 'text-red-400' },
          { key: 'upcoming', label: 'Upcoming', count: upcoming.length, color: 'text-amber-400' },
          { key: 'expired',  label: 'Expired',  count: expired.length,  color: 'text-[#444]' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(filter === s.key ? 'all' : s.key)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              filter === s.key ? 'border-[#b8935a]/30 bg-[#b8935a]/5' : 'border-[#161616] bg-[#0c0c0c] hover:border-[#222]'
            }`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-[#444] mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {['all', ...CATEGORIES].map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`text-xs px-2 py-1 rounded transition-colors capitalize ${
                filter === c ? 'bg-[#b8935a]/10 text-[#b8935a]' : 'text-[#444] hover:text-[#e8ddd0]'
              }`}
            >
              {c === 'all' ? 'All' : CAT_LABELS[c] ?? c}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-[#222] text-[#b8935a] hover:bg-[#b8935a]/10 transition-colors"
        >
          + Add item
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.name as string}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Name (e.g. Builder's registration)"
              className="col-span-2 bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e8ddd0] placeholder:text-[#333] focus:outline-none"
            />
            <select
              value={form.category as string}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e8ddd0] focus:outline-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
            <input
              type="date"
              value={form.renewal_date as string}
              onChange={e => setForm(p => ({ ...p, renewal_date: e.target.value }))}
              className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e8ddd0] focus:outline-none"
            />
            <input
              value={form.provider as string}
              onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}
              placeholder="Provider"
              className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e8ddd0] placeholder:text-[#333] focus:outline-none"
            />
            <input
              type="number"
              value={form.cost as string}
              onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
              placeholder="Annual cost ($)"
              className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e8ddd0] placeholder:text-[#333] focus:outline-none"
            />
          </div>
          <input
            value={form.notes as string}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Notes"
            className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e8ddd0] placeholder:text-[#333] focus:outline-none"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 rounded-lg border border-[#222] text-[#444] hover:text-[#e8ddd0] transition-colors">Cancel</button>
            <button
              onClick={save}
              disabled={saving || !form.name || !form.renewal_date}
              className="text-xs px-4 py-1.5 rounded-lg bg-[#b8935a] text-[#080808] font-medium hover:bg-[#c9a46a] disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      {displayed.length === 0 ? (
        <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] py-12 text-center">
          <p className="text-sm text-[#333]">No items{filter !== 'all' ? ' in this category' : ''}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed
            .sort((a, b) => a.renewal_date.localeCompare(b.renewal_date))
            .map(item => {
              const days = daysUntil(item.renewal_date)
              const isExpired = days < 0
              return (
                <div key={item.id} className={`rounded-lg border p-4 ${urgencyClass(isExpired ? -1 : days)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-[#e8ddd0]">{item.name}</p>
                        <span className="text-xs text-[#444] capitalize">{CAT_LABELS[item.category] ?? item.category}</span>
                        {item.auto_renew && <span className="text-xs text-green-400">Auto-renews</span>}
                      </div>
                      <div className="flex gap-4 mt-1 flex-wrap">
                        <p className="text-xs text-[#444]">
                          Renewal: {new Date(item.renewal_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        {item.provider && <p className="text-xs text-[#444]">{item.provider}</p>}
                        {item.cost != null && <p className="text-xs text-[#444]">{formatCurrency(item.cost)}/yr</p>}
                      </div>
                      {item.notes && <p className="text-xs text-[#333] mt-1">{item.notes}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className={`text-sm font-bold ${isExpired ? 'text-red-400' : days <= 7 ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-[#444]'}`}>
                        {isExpired ? `${Math.abs(days)}d overdue` : `${days}d`}
                      </div>
                      <button
                        onClick={() => remove(item.id)}
                        className="text-xs text-[#2a2a2a] hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
