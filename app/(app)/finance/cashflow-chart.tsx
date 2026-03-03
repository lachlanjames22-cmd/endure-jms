'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Dot
} from 'recharts'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'
import { TARGETS } from '@/lib/constants'

interface DayData {
  date: string
  balance: number
  inflow: number
  outflow: number
  events: Array<{ type: string; category: string; label: string; amount: number }>
}

interface CashflowData {
  summary: {
    today_balance: number
    day30_balance: number
    lowest_balance: number
    lowest_date: string
    negative_days: number
    status: string
  }
  days: DayData[]
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: DayData }>
  label?: string
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload

  return (
    <div className="rounded-lg border border-[#222] bg-[#111] p-3 text-xs shadow-xl">
      <p className="text-[#444] mb-1">{formatDateShort(d.date)}</p>
      <p className="font-mono font-semibold text-[#e8ddd0] text-sm">
        {formatCurrency(d.balance)}
      </p>
      {d.inflow > 0 && <p className="text-green-400 mt-1">+ {formatCurrency(d.inflow)}</p>}
      {d.outflow > 0 && <p className="text-red-400">− {formatCurrency(d.outflow)}</p>}
      {d.events?.slice(0, 3).map((ev, i) => (
        <p key={i} className="text-[#333] mt-0.5">{ev.label}</p>
      ))}
    </div>
  )
}

export function CashflowChart() {
  const [data, setData] = useState<CashflowData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cashflow?days=30')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-6">
        <div className="h-64 animate-pulse bg-[#111] rounded" />
      </div>
    )
  }

  if (!data) return null

  const { summary, days } = data
  const hasNegative = summary.negative_days > 0

  // Build chart data — label every 3rd day
  const chartData = days.map((d, i) => ({
    ...d,
    label: i % 3 === 0 ? formatDateShort(d.date) : '',
    // Gradient fill: below 0 = red, below 10k = red, below 20k = amber, else green
    fill: d.balance < 0 ? '#f87171'
      : d.balance < TARGETS.cashCritical ? '#f87171'
      : d.balance < TARGETS.cashWarning ? '#fbbf24'
      : '#4ade80',
  }))

  return (
    <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-[#e8ddd0]">30-Day Cash Projection</h2>
          <p className="text-xs text-[#444] mt-0.5">
            Today {formatCurrency(summary.today_balance)} → Day 30 {formatCurrency(summary.day30_balance)}
          </p>
        </div>
        {hasNegative && (
          <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-2 py-1">
            <AlertTriangle className="h-3 w-3" />
            Goes negative {formatDateShort(summary.lowest_date)}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ade80" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#161616" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#444', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fill: '#444', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Critical threshold — dashed red */}
          <ReferenceLine
            y={TARGETS.cashCritical}
            stroke="#f87171"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{ value: '$10k', fill: '#f87171', fontSize: 10, position: 'right' }}
          />
          {/* Warning threshold — dashed amber */}
          <ReferenceLine
            y={TARGETS.cashWarning}
            stroke="#fbbf24"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{ value: '$20k', fill: '#fbbf24', fontSize: 10, position: 'right' }}
          />
          {/* Zero line */}
          <ReferenceLine y={0} stroke="#f87171" strokeOpacity={0.8} />

          <Area
            type="monotone"
            dataKey="balance"
            stroke="#4ade80"
            strokeWidth={1.5}
            fill="url(#cashGrad)"
            dot={(props) => {
              const { cx, cy, payload } = props
              if (payload.inflow > 0) return <Dot cx={cx} cy={cy} r={3} fill="#4ade80" stroke="none" />
              if (payload.outflow > 0 && payload.inflow === 0) return <Dot cx={cx} cy={cy} r={2} fill="#f87171" stroke="none" />
              return <></>
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Day-by-day table — first 7 days */}
      <div className="mt-4 border-t border-[#161616] pt-4">
        <p className="text-xs text-[#444] mb-2 uppercase tracking-wider">Next 7 days</p>
        <div className="space-y-1">
          {days.slice(0, 7).map(d => {
            const balColor = d.balance < TARGETS.cashCritical ? 'text-red-400'
              : d.balance < TARGETS.cashWarning ? 'text-amber-400'
              : 'text-green-400'
            return (
              <div key={d.date} className="flex items-center gap-3 text-xs">
                <span className="w-16 text-[#444]">{formatDateShort(d.date)}</span>
                {d.inflow > 0 && <span className="text-green-400">+{formatCurrency(d.inflow)}</span>}
                {d.outflow > 0 && <span className="text-red-400">−{formatCurrency(d.outflow)}</span>}
                {d.inflow === 0 && d.outflow === 0 && <span className="text-[#2a2a2a]">—</span>}
                <span className={`ml-auto font-mono ${balColor}`}>{formatCurrency(d.balance)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
