'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MetricCard } from '@/components/ui/metric-card'
import { formatCurrency, formatPercent, gpTrafficLight, revenuePerHourTrafficLight, cn } from '@/lib/utils'
import type { Product } from '@/lib/types/database'
import { TARGETS } from '@/lib/constants'
import { CheckCircle, Zap } from 'lucide-react'

interface QuoteResult {
  quote: {
    line_items: Array<{ type: string; description: string; amount: number; tag: string }>
    subtotal_ex_gst: number
    gst: number
    total_inc_gst: number
  }
  backcost: {
    days: number
    total_hours: number
    labour_value: number
    gp_amount: number
    gp_pct: number
    gp_per_hour: number
    revenue_per_hour: number
    projected_np_per_hour: number
    labour_backcost: number
    total_backcost: number
    gp_status: 'green' | 'amber' | 'red'
    rph_status: 'green' | 'amber' | 'red'
  }
  job_fields: Record<string, unknown>
}

interface Props {
  products: Product[]
}

export function QuoteCalculator({ products }: Props) {
  const [clientName, setClientName] = useState('')
  const [address, setAddress] = useState('')
  const [suburb, setSuburb] = useState('')
  const [sqm, setSqm] = useState('')
  const [installType, setInstallType] = useState<'fullSubframe' | 'overConcrete' | 'redeck'>('fullSubframe')
  const [useH4, setUseH4] = useState(false)
  const [tier, setTier] = useState<'red' | 'black' | 'blue'>('red')
  const [productId, setProductId] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'timber' | 'composite'>('all')
  const [stairs, setStairs] = useState('')
  const [handrailLm, setHandrailLm] = useState('')
  const [curveHrs, setCurveHrs] = useState('')
  const [otherHrs, setOtherHrs] = useState('')
  const [result, setResult] = useState<QuoteResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const selectedProduct = products.find(p => p.id === productId)
  const filteredProducts = products.filter(p => categoryFilter === 'all' || p.category === categoryFilter)

  const calculate = useCallback(async () => {
    if (!sqm || !productId || !selectedProduct) return
    setCalculating(true)

    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sqm: parseFloat(sqm),
        install_type: installType,
        use_h4: useH4,
        jw_tier: tier,
        product: selectedProduct,
        complexity_stairs: parseInt(stairs || '0'),
        complexity_handrail_lm: parseFloat(handrailLm || '0'),
        complexity_curve_hrs: parseFloat(curveHrs || '0'),
        complexity_other_hrs: parseFloat(otherHrs || '0'),
      }),
    })

    if (res.ok) {
      setResult(await res.json())
    }
    setCalculating(false)
  }, [sqm, productId, selectedProduct, installType, useH4, tier, stairs, handrailLm, curveHrs, otherHrs])

  async function saveQuote() {
    if (!result || !clientName || !selectedProduct) return
    setSaving(true)

    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${clientName} — ${suburb || address || selectedProduct.name}`,
        client_name: clientName,
        address,
        suburb,
        sqm: parseFloat(sqm),
        install_type: installType,
        use_h4: useH4,
        jw_tier: tier,
        product_id: productId,
        status: 'quoted',
        ...result.job_fields,
      }),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const tagColors: Record<string, string> = {
    labour: 'text-green-400',
    materials: 'text-[#b8935a]',
    adj: 'text-[#444]',
  }

  return (
    <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-6 space-y-5">
      <h2 className="text-sm font-medium text-[#e8ddd0]">Quote Calculator</h2>

      {/* Client details */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Client Name" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Smith residence" />
        <Input label="Suburb" value={suburb} onChange={e => setSuburb(e.target.value)} placeholder="Cottesloe" />
      </div>
      <Input label="Address" value={address} onChange={e => setAddress(e.target.value)} placeholder="12 Beach St" />

      {/* m² — large and prominent */}
      <div>
        <label className="text-xs text-[#444] uppercase tracking-wider">Area (m²)</label>
        <input
          type="number"
          value={sqm}
          onChange={e => { setSqm(e.target.value); setResult(null) }}
          placeholder="0"
          className="mt-1 block w-full rounded-md border border-[#222] bg-[#111] px-4 text-4xl font-mono font-bold text-[#e8ddd0] py-3 focus:outline-none focus:border-[#b8935a]/50"
        />
      </div>

      {/* Install type */}
      <div className="flex gap-2">
        {(['fullSubframe', 'overConcrete', 'redeck'] as const).map(type => (
          <button
            key={type}
            onClick={() => { setInstallType(type); setResult(null) }}
            className={cn(
              'flex-1 rounded-md border py-2 text-xs font-medium transition-colors',
              installType === type
                ? 'border-[#b8935a] bg-[#b8935a]/10 text-[#b8935a]'
                : 'border-[#161616] text-[#444] hover:border-[#222]'
            )}
          >
            {type === 'fullSubframe' ? 'Full Subframe' : type === 'overConcrete' ? 'Over Concrete' : 'Re-deck'}
          </button>
        ))}
      </div>

      {/* H4 toggle + Tier */}
      <div className="flex gap-3 items-center">
        <button
          onClick={() => { setUseH4(!useH4); setResult(null) }}
          className={cn(
            'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
            useH4 ? 'border-[#b8935a] bg-[#b8935a]/10 text-[#b8935a]' : 'border-[#161616] text-[#444]'
          )}
        >
          H4 {useH4 ? 'ON' : 'OFF'} (+$20/m²)
        </button>

        <div className="flex gap-1 ml-auto">
          {(['red', 'black', 'blue'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTier(t); setResult(null) }}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium border transition-colors',
                tier === t
                  ? t === 'red' ? 'border-red-400/50 bg-red-400/10 text-red-400'
                    : t === 'black' ? 'border-[#444] bg-[#222] text-[#e8ddd0]'
                    : 'border-[#b8935a]/50 bg-[#b8935a]/10 text-[#b8935a]'
                  : 'border-[#161616] text-[#333]'
              )}
            >
              JW {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Product selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-[#444] uppercase tracking-wider">Product</label>
          <div className="flex gap-1">
            {(['all', 'timber', 'composite'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'px-2 py-0.5 rounded text-xs',
                  categoryFilter === cat ? 'bg-[#b8935a]/10 text-[#b8935a]' : 'text-[#444]'
                )}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {filteredProducts.map(p => (
            <button
              key={p.id}
              onClick={() => { setProductId(p.id); setResult(null) }}
              className={cn(
                'w-full flex items-center gap-3 rounded px-3 py-2 text-xs text-left transition-colors',
                productId === p.id
                  ? 'bg-[#b8935a]/10 border border-[#b8935a]/30'
                  : 'bg-[#111] border border-transparent hover:border-[#222]'
              )}
            >
              <div className="flex-1 min-w-0">
                <p className={cn('font-medium', productId === p.id ? 'text-[#b8935a]' : 'text-[#e8ddd0]')}>
                  {p.name}
                </p>
                <p className="text-[#444]">${p.cost_per_m2}/m² cost</p>
              </div>
              {/* Durability bar */}
              <div className="flex items-center gap-1 shrink-0">
                <div className="h-1.5 w-12 rounded-full bg-[#161616]">
                  <div
                    className="h-1.5 rounded-full bg-[#b8935a]"
                    style={{ width: `${(p.durability_score / 9.5) * 100}%` }}
                  />
                </div>
                <span className="text-[#333]">{p.durability_score}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Black tier complexity */}
      {tier === 'black' && (
        <div className="rounded border border-[#161616] bg-[#111] p-3 space-y-3">
          <p className="text-xs text-[#444] uppercase tracking-wider">Black Tier Complexity</p>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Stairs (flights)" type="number" value={stairs} onChange={e => { setStairs(e.target.value); setResult(null) }} />
            <Input label="Handrail (lm)" type="number" value={handrailLm} onChange={e => { setHandrailLm(e.target.value); setResult(null) }} />
            <Input label="Curves (hrs)" type="number" value={curveHrs} onChange={e => { setCurveHrs(e.target.value); setResult(null) }} />
            <Input label="Other (hrs)" type="number" value={otherHrs} onChange={e => { setOtherHrs(e.target.value); setResult(null) }} />
          </div>
        </div>
      )}

      <Button
        variant="primary"
        className="w-full"
        loading={calculating}
        onClick={calculate}
        disabled={!sqm || !productId}
      >
        <Zap className="h-4 w-4" />
        Calculate Quote
      </Button>

      {/* Results */}
      {result && (
        <div className="space-y-4 border-t border-[#161616] pt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* LEFT — Client quote */}
            <div>
              <p className="text-xs text-[#444] uppercase tracking-wider mb-2">Quote (Client)</p>
              <div className="space-y-1">
                {result.quote.line_items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 text-xs">
                    <span className={cn('flex-1', tagColors[item.tag] ?? 'text-[#444]')}>
                      {item.description}
                    </span>
                    <span className="font-mono text-[#e8ddd0] shrink-0">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="border-t border-[#161616] pt-1 mt-1">
                  <div className="flex justify-between text-xs text-[#444]">
                    <span>Subtotal ex GST</span>
                    <span className="font-mono">{formatCurrency(result.quote.subtotal_ex_gst)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#444]">
                    <span>GST (10%)</span>
                    <span className="font-mono">{formatCurrency(result.quote.gst)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-[#e8ddd0] mt-1">
                    <span>Total inc GST</span>
                    <span className="font-mono">{formatCurrency(result.quote.total_inc_gst)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — Backcost */}
            <div>
              <p className="text-xs text-[#444] uppercase tracking-wider mb-2">Backcost (You)</p>
              <div className="space-y-2">
                <MetricCard
                  label="GP Margin"
                  value={formatPercent(result.backcost.gp_pct)}
                  sub={`${formatCurrency(result.backcost.gp_amount)} on labour`}
                  traffic={result.backcost.gp_status}
                  size="sm"
                />
                <MetricCard
                  label="Revenue / Hour"
                  value={`$${Math.round(result.backcost.revenue_per_hour)}`}
                  sub={`${result.backcost.total_hours}hrs / ${result.backcost.days}d`}
                  traffic={result.backcost.rph_status}
                  size="sm"
                />
                <div className="text-xs text-[#444] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Labour backcost</span>
                    <span className="font-mono text-[#e8ddd0]">{formatCurrency(result.backcost.labour_backcost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GP per hour</span>
                    <span className="font-mono text-[#e8ddd0]">${Math.round(result.backcost.gp_per_hour)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target GP (45%)</span>
                    <span className="font-mono text-[#444]">{formatCurrency(result.backcost.labour_value * TARGETS.gpPct)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save */}
          <Button
            variant={saved ? 'gold' : 'secondary'}
            className="w-full"
            loading={saving}
            onClick={saveQuote}
            disabled={!clientName}
          >
            {saved ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-400" />
                Quote Saved
              </>
            ) : 'Save Quote to Pipeline'}
          </Button>
          {!clientName && (
            <p className="text-xs text-amber-400 text-center">Enter client name above to save</p>
          )}
        </div>
      )}
    </div>
  )
}
