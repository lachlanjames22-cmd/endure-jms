'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'

interface Allocation {
  id: string
  amount_received: number
  tax_amount: number
  profit_amount: number
  owner_pay_amount: number
  float_amount: number
  actioned: boolean
  actioned_at: string | null
  created_at: string
  cashflow_events?: { description: string; scheduled_date: string } | null
}

const BUCKETS = [
  { key: 'tax_amount',       label: 'Tax (15%)',       color: 'text-red-400',    bg: 'bg-red-400/10' },
  { key: 'profit_amount',    label: 'Profit (10%)',    color: 'text-green-400',  bg: 'bg-green-400/10' },
  { key: 'owner_pay_amount', label: 'Owner Pay (35%)', color: 'text-[#b8935a]',  bg: 'bg-[#b8935a]/10' },
  { key: 'float_amount',     label: 'Float (40%)',     color: 'text-blue-400',   bg: 'bg-blue-400/10' },
]

export function CashAllocation() {
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    fetch('/api/cashflow/allocate')
      .then(r => r.json())
      .then(d => { setAllocations(d.allocations ?? []); setLoading(false) })
  }, [])

  function calcPreview(val: string) {
    const n = parseFloat(val)
    if (!n || n <= 0) { setPreview(null); return }
    setPreview({
      tax_amount:       Number((n * 0.15).toFixed(2)),
      profit_amount:    Number((n * 0.10).toFixed(2)),
      owner_pay_amount: Number((n * 0.35).toFixed(2)),
      float_amount:     Number((n * 0.40).toFixed(2)),
    })
  }

  async function allocate() {
    const n = parseFloat(amount)
    if (!n || n <= 0) return
    setSubmitting(true)
    const res = await fetch('/api/cashflow/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: n }),
    })
    const data = await res.json()
    if (data.allocation) {
      setAllocations(prev => [data.allocation, ...prev])
      setAmount('')
      setPreview(null)
      setShowForm(false)
    }
    setSubmitting(false)
  }

  async function markActioned(id: string) {
    await fetch('/api/cashflow/allocate', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAllocations(prev => prev.map(a => a.id === id ? { ...a, actioned: true, actioned_at: new Date().toISOString() } : a))
  }

  const pending = allocations.filter(a => !a.actioned)

  return (
    <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-[#e8ddd0]">Profit First Allocation</h2>
          <p className="text-xs text-[#444] mt-0.5">Split every inflow · Tax 15 · Profit 10 · Pay 35 · Float 40</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border border-[#222] text-[#b8935a] hover:bg-[#b8935a]/10 transition-colors"
        >
          + Allocate inflow
        </button>
      </div>

      {/* Quick allocate form */}
      {showForm && (
        <div className="rounded-lg border border-[#222] bg-[#111] p-4 space-y-3">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-[#444]">$</span>
            <input
              type="number"
              value={amount}
              onChange={e => { setAmount(e.target.value); calcPreview(e.target.value) }}
              placeholder="Amount received"
              className="flex-1 bg-transparent text-sm text-[#e8ddd0] outline-none placeholder:text-[#333]"
            />
          </div>

          {preview && (
            <div className="grid grid-cols-2 gap-2">
              {BUCKETS.map(b => (
                <div key={b.key} className={`rounded p-2 ${b.bg}`}>
                  <p className="text-xs text-[#444]">{b.label}</p>
                  <p className={`text-sm font-medium ${b.color}`}>{formatCurrency(preview[b.key])}</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={allocate}
            disabled={!amount || submitting}
            className="w-full py-2 rounded-lg bg-[#b8935a] text-[#080808] text-sm font-medium disabled:opacity-40 hover:bg-[#c9a46a] transition-colors"
          >
            {submitting ? 'Saving…' : 'Allocate'}
          </button>
        </div>
      )}

      {/* Pending transfers */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-medium text-amber-400 mb-2">Needs actioning ({pending.length})</p>
          <div className="space-y-2">
            {pending.map(a => (
              <div key={a.id} className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#e8ddd0]">{formatCurrency(a.amount_received)} received</p>
                    <p className="text-xs text-[#444] mt-0.5">
                      {a.cashflow_events?.description ?? 'Manual entry'} ·{' '}
                      {new Date(a.created_at).toLocaleDateString('en-AU')}
                    </p>
                    <div className="flex gap-3 mt-2 flex-wrap">
                      {BUCKETS.map(b => (
                        <span key={b.key} className={`text-xs ${b.color}`}>
                          {b.label.split(' ')[0]}: {formatCurrency((a as unknown as Record<string, unknown>)[b.key] as number)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => markActioned(a.id)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-green-400/30 text-green-400 hover:bg-green-400/10 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {!loading && allocations.filter(a => a.actioned).length > 0 && (
        <div>
          <p className="text-xs font-medium text-[#444] mb-2">Recent</p>
          <div className="space-y-1.5">
            {allocations.filter(a => a.actioned).slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center justify-between py-1">
                <span className="text-xs text-[#444]">
                  {formatCurrency(a.amount_received)} · {new Date(a.created_at).toLocaleDateString('en-AU')}
                </span>
                <span className="text-xs text-green-400">Actioned</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[1,2].map(i => <div key={i} className="h-16 rounded animate-pulse bg-[#111]" />)}
        </div>
      )}
    </div>
  )
}
