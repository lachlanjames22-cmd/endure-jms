'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { MetricCard } from '@/components/ui/metric-card'
import { AlertTriangle, Pencil, Check } from 'lucide-react'
import {
  formatCurrency,
  formatPercent,
  cashTrafficLight,
  gpTrafficLight,
} from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface HeroData {
  cashBalance: number | null
  openingBalance: number
  monthlyGpPct: number | null
  revenueThisMonth: number | null
  revenueTarget: number
  jobsInProgress: number
  alertsCount: number
}

export function HeroMetrics() {
  const [data, setData]               = useState<HeroData | null>(null)
  const [editingBalance, setEditing]  = useState(false)
  const [balanceInput, setBalanceInput] = useState('')
  const [saving, setSaving]           = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

    const [settingsRes, cashflowRes, jobsRes, notifRes] = await Promise.all([
      supabase.from('settings').select('key, value').in('key', [
        'opening_balance', 'sales_target_monthly_revenue',
      ]),
      supabase.from('cashflow_events')
        .select('type, amount')
        .not('paid_date', 'is', null),
      supabase.from('jobs')
        .select('status, actual_gp_pct, quoted_gp_pct, actual_labour_value, quoted_labour_value, won_date')
        .is('deleted_at', null),
      supabase.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('read', false),
    ])

    const settings = Object.fromEntries(
      (settingsRes.data ?? []).map(s => [s.key, s.value as number])
    )

    const openingBalance = Number(settings['opening_balance'] ?? 0)
    const revenueTarget  = Number(settings['sales_target_monthly_revenue'] ?? 45087.58)

    let cashBalance = openingBalance
    for (const event of cashflowRes.data ?? []) {
      cashBalance += event.type === 'inflow' ? event.amount : -event.amount
    }

    const allJobs  = jobsRes.data ?? []
    const inProgress = allJobs.filter(j => j.status === 'in_progress').length

    const monthJobs = allJobs.filter(j =>
      ['in_progress', 'complete'].includes(j.status) &&
      j.won_date && j.won_date >= monthStart
    )
    const totalLabourValue = monthJobs.reduce((sum, j) =>
      sum + (j.actual_labour_value ?? j.quoted_labour_value ?? 0), 0
    )
    const weightedGp = monthJobs.reduce((sum, j) => {
      const lv = j.actual_labour_value ?? j.quoted_labour_value ?? 0
      const gp = j.actual_gp_pct ?? j.quoted_gp_pct ?? 0
      return sum + lv * gp
    }, 0)
    const monthlyGpPct = totalLabourValue > 0 ? weightedGp / totalLabourValue : null

    const completedJobs = allJobs.filter(j =>
      j.status === 'complete' && j.won_date && j.won_date >= monthStart
    )
    const revenueThisMonth = completedJobs.reduce((sum, j) =>
      sum + (j.actual_labour_value ?? j.quoted_labour_value ?? 0), 0
    )

    setData({ cashBalance, openingBalance, monthlyGpPct, revenueThisMonth, revenueTarget, jobsInProgress: inProgress, alertsCount: (notifRes.count ?? 0) })
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Listen for Jarvis tool actions
  useEffect(() => {
    window.addEventListener('jarvis:refresh', load)
    return () => window.removeEventListener('jarvis:refresh', load)
  }, [load])

  useEffect(() => {
    if (editingBalance) setTimeout(() => inputRef.current?.focus(), 50)
  }, [editingBalance])

  async function saveBalance() {
    const val = parseFloat(balanceInput)
    if (isNaN(val)) { setEditing(false); return }
    setSaving(true)
    await supabase.from('settings').upsert({ key: 'opening_balance', value: val }, { onConflict: 'key' })
    setSaving(false)
    setEditing(false)
    await load()
  }

  function startEdit() {
    setBalanceInput(String(data?.openingBalance ?? 0))
    setEditing(true)
  }

  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-[#161616] bg-[#0c0c0c] animate-pulse" />
        ))}
      </div>
    )
  }

  const revenueProgress = data.revenueTarget > 0
    ? (data.revenueThisMonth ?? 0) / data.revenueTarget
    : 0

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {/* Cash Today — click to edit opening balance */}
      <div className="relative group rounded-lg border border-[#161616] bg-[#0c0c0c] p-4">
        {data.cashBalance != null && (
          <span className={`absolute top-3 right-8 h-2 w-2 rounded-full ${
            cashTrafficLight(data.cashBalance) === 'green' ? 'bg-green-400' :
            cashTrafficLight(data.cashBalance) === 'amber' ? 'bg-amber-400' : 'bg-red-400'
          }`} />
        )}
        <p className="text-xs text-[#444] uppercase tracking-wider mb-1">Cash Today</p>
        {editingBalance ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-[#444]">$</span>
            <input
              ref={inputRef}
              type="number"
              value={balanceInput}
              onChange={e => setBalanceInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveBalance(); if (e.key === 'Escape') setEditing(false) }}
              className="w-full bg-transparent text-lg font-mono font-semibold text-[#e8ddd0] focus:outline-none border-b border-[#b8935a]/40"
            />
            <button onClick={saveBalance} disabled={saving} className="text-green-400 shrink-0">
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <p className={`text-2xl font-mono font-semibold ${
            data.cashBalance != null
              ? cashTrafficLight(data.cashBalance) === 'green' ? 'text-green-400' :
                cashTrafficLight(data.cashBalance) === 'amber' ? 'text-amber-400' : 'text-red-400'
              : 'text-[#e8ddd0]'
          }`}>
            {formatCurrency(data.cashBalance)}
          </p>
        )}
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-[#2a2a2a]">base: {formatCurrency(data.openingBalance)}</p>
          {!editingBalance && (
            <button
              onClick={startEdit}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[#444] hover:text-[#b8935a]"
              title="Edit opening balance"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <MetricCard
        label="GP This Month"
        value={data.monthlyGpPct != null ? formatPercent(data.monthlyGpPct) : '—'}
        sub="on labour value"
        traffic={data.monthlyGpPct != null ? gpTrafficLight(data.monthlyGpPct) : undefined}
        size="md"
      />

      {/* Revenue progress */}
      <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-4">
        <p className="text-xs text-[#444] uppercase tracking-wider mb-1">Revenue vs Target</p>
        <p className="text-2xl font-mono font-semibold text-[#e8ddd0]">
          {formatCurrency(data.revenueThisMonth)}
        </p>
        <div className="mt-2 h-1 w-full rounded-full bg-[#161616]">
          <div
            className="h-1 rounded-full bg-[#b8935a] transition-all"
            style={{ width: `${Math.min(revenueProgress * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-[#444] mt-1">
          of {formatCurrency(data.revenueTarget)} target
        </p>
      </div>

      <MetricCard
        label="Jobs In Progress"
        value={String(data.jobsInProgress)}
        size="md"
      />

      {/* Alerts */}
      <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-4">
        <p className="text-xs text-[#444] uppercase tracking-wider mb-1">Active Alerts</p>
        <div className="flex items-center gap-2">
          <AlertTriangle className={data.alertsCount > 0 ? 'text-amber-400 h-5 w-5' : 'text-[#444] h-5 w-5'} />
          <p className={`text-2xl font-mono font-semibold ${data.alertsCount > 0 ? 'text-amber-400' : 'text-[#444]'}`}>
            {data.alertsCount}
          </p>
        </div>
      </div>
    </div>
  )
}
