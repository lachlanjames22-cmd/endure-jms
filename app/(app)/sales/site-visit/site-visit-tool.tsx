'use client'

import { useState, useCallback } from 'react'
import { formatCurrency, cn } from '@/lib/utils'
import type { Product } from '@/lib/types/database'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Printer, Save, DollarSign, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CheckItem {
  id: string
  label: string
  script?: string
  type: 'bool' | 'select' | 'text'
  options?: string[]
  value: boolean | string
}

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
    revenue_per_hour: number
    gp_status: 'green' | 'amber' | 'red'
    rph_status: 'green' | 'amber' | 'red'
  }
  job_fields: Record<string, unknown>
}

// ─── Initial checklist ───────────────────────────────────────────────────────

const INITIAL_CHECKLIST: CheckItem[] = [
  // Intro
  { id: 'decision_maker', label: 'Decision maker present', script: "\"Are you the main person making the decision, or is your partner involved too? Just want to make sure everyone's across it.\"", type: 'bool', value: false },
  { id: 'budget_discussed', label: 'Budget discussed', script: '"Do you have a rough budget in mind for this project?"', type: 'bool', value: false },
  { id: 'timeline', label: 'Timeline preference', script: '"When are you hoping to have this done by? Any events or dates we\'re working toward?"', type: 'select', options: ['ASAP', '1–2 months', '3+ months', 'Flexible'], value: '' },
  { id: 'competitor_quotes', label: 'Getting other quotes', script: '"Have you spoken to anyone else about this, or are we your first call?"', type: 'bool', value: false },

  // Site
  { id: 'access', label: 'Site access', script: 'Check: driveway width, side gate clearance, any overhead wires or obstacles.', type: 'select', options: ['Easy', 'Tight', 'Restricted'], value: '' },
  { id: 'slope', label: 'Ground slope', script: 'Walk the area and note rise. Affects subframe complexity and post heights.', type: 'select', options: ['Flat', 'Slight', 'Steep'], value: '' },
  { id: 'existing_deck', label: 'Existing structure to remove', script: 'Is there an existing deck? Condition? Our team handles removal — factor into scope.', type: 'bool', value: false },
  { id: 'services', label: 'Services / restrictions', script: 'Any council setbacks, heritage overlay, retaining walls, drainage issues to note.', type: 'bool', value: false },
  { id: 'photos', label: 'Photos taken', script: 'Capture all four sides of the area + access path + any tricky details.', type: 'bool', value: false },

  // Close
  { id: 'walkthrough', label: 'Confirmed product preference', script: '"Based on what you\'ve told me, I\'d suggest [product]. Here\'s why that suits this area..."', type: 'bool', value: false },
  { id: 'next_step', label: 'Next step agreed', script: '"I\'ll send through a formal quote today. If you\'re happy with it, we can lock in a start date with a 10% deposit."', type: 'bool', value: false },
]

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  products: Product[]
}

export function SiteVisitTool({ products }: Props) {
  // ── Client + checklist state
  const [clientName,  setClientName]  = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [address,     setAddress]     = useState('')
  const [suburb,      setSuburb]      = useState('')
  const [notes,       setNotes]       = useState('')
  const [checklist,   setChecklist]   = useState<CheckItem[]>(INITIAL_CHECKLIST)
  const [openSection, setOpenSection] = useState<'client' | 'checklist' | 'quote' | 'deposit' | null>('client')

  // ── Quote state (mirrors QuoteCalculator)
  const [sqm,         setSqm]         = useState('')
  const [installType, setInstallType] = useState<'fullSubframe' | 'overConcrete' | 'redeck'>('fullSubframe')
  const [useH4,       setUseH4]       = useState(false)
  const [tier,        setTier]        = useState<'red' | 'black' | 'blue'>('red')
  const [productId,   setProductId]   = useState('')
  const [result,      setResult]      = useState<QuoteResult | null>(null)
  const [calculating, setCalculating] = useState(false)

  // ── Save / deposit state
  const [saving,       setSaving]       = useState(false)
  const [savedJobId,   setSavedJobId]   = useState<string | null>(null)
  const [depositAmt,   setDepositAmt]   = useState('')
  const [depositSaved, setDepositSaved] = useState(false)
  const [recordingDep, setRecordingDep] = useState(false)

  const selectedProduct = products.find(p => p.id === productId)
  const categoryFilter  = useState<'all' | 'timber' | 'composite'>('all')[0]
  const filteredProducts = products.filter(p => categoryFilter === 'all' || p.category === categoryFilter)

  // ── Checklist helpers
  function toggleCheck(id: string) {
    setChecklist(prev => prev.map(item =>
      item.id === id && item.type === 'bool'
        ? { ...item, value: !item.value }
        : item
    ))
  }
  function setSelectValue(id: string, val: string) {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, value: val } : item))
  }

  const checklistComplete = checklist.filter(i => i.type === 'bool').every(i => i.value === true || true) // soft — not required
  const checklistDone = checklist.filter(i => i.type === 'bool' && i.value === true).length

  // ── Quote calculation
  const calculate = useCallback(async () => {
    if (!sqm || !productId || !selectedProduct) return
    setCalculating(true)
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sqm: parseFloat(sqm),
          install_type: installType,
          use_h4: useH4,
          jw_tier: tier,
          product: selectedProduct,
          complexity_stairs: 0,
          complexity_handrail_lm: 0,
          complexity_curve_hrs: 0,
          complexity_other_hrs: 0,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        // Pre-fill deposit as 10% of total
        setDepositAmt(String(Math.round(data.quote.subtotal_ex_gst * 0.10)))
      }
    } finally {
      setCalculating(false)
    }
  }, [sqm, productId, selectedProduct, installType, useH4, tier])

  // ── Save to pipeline
  async function saveToPipeline() {
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
        notes,
        ...result.job_fields,
      }),
    })
    if (res.ok) {
      const job = await res.json()
      setSavedJobId(job.id)
    }
    setSaving(false)
  }

  // ── Record deposit
  async function recordDeposit() {
    const amount = parseFloat(depositAmt)
    if (!amount || amount <= 0) return
    setRecordingDep(true)
    const today = new Date().toISOString().split('T')[0]
    await fetch('/api/cashflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'inflow',
        category: 'deposit',
        label: `${clientName || 'Client'} — Deposit`,
        amount,
        scheduled_date: today,
        paid_date: today,
        job_id: savedJobId ?? null,
        auto_generated: false,
      }),
    })
    setDepositSaved(true)
    setRecordingDep(false)
  }

  // ── Print
  function printQuote() {
    window.print()
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080808] pb-20">

      {/* Print-only quote header */}
      <div className="hidden print:block p-8 border-b border-[#222]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-['Georgia',serif] text-[#b8935a]">ENDURE</h1>
            <p className="text-xs text-[#444] tracking-widest mt-0.5">DECKING + OUTDOOR LIVING</p>
          </div>
          <div className="text-right text-xs text-[#444]">
            <p>{new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        {clientName && (
          <div className="mt-6">
            <p className="text-sm text-[#e8ddd0] font-medium">{clientName}</p>
            {address && <p className="text-xs text-[#444]">{address}</p>}
            {suburb && <p className="text-xs text-[#444]">{suburb}</p>}
          </div>
        )}
      </div>

      {/* Screen header */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between border-b border-[#161616] bg-[#080808] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/sales" className="text-[#444] hover:text-[#e8ddd0]">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-sm font-medium text-[#e8ddd0]">Site Visit</h1>
            <p className="text-[10px] text-[#444]">
              {checklistDone}/{checklist.filter(i => i.type === 'bool').length} checklist · {result ? formatCurrency(result.quote.subtotal_ex_gst) + ' ex GST' : 'no quote yet'}
            </p>
          </div>
        </div>
        {result && (
          <button
            onClick={printQuote}
            className="flex items-center gap-1.5 rounded-md border border-[#b8935a]/30 bg-[#b8935a]/10 px-3 py-1.5 text-xs text-[#b8935a]"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Quote
          </button>
        )}
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-3 print:p-0 print:space-y-0">

        {/* ── Section 1: Client Details */}
        <Section
          title="Client Details"
          id="client"
          open={openSection === 'client'}
          onToggle={() => setOpenSection(openSection === 'client' ? null : 'client')}
          badge={clientName ? clientName : undefined}
        >
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client Name">
                <input
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Smith"
                  className="field-input"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="0400 000 000"
                  className="field-input"
                />
              </Field>
            </div>
            <Field label="Email">
              <input
                type="email"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                placeholder="client@email.com"
                className="field-input"
              />
            </Field>
            <Field label="Address">
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="12 Example St"
                className="field-input"
              />
            </Field>
            <Field label="Suburb">
              <input
                value={suburb}
                onChange={e => setSuburb(e.target.value)}
                placeholder="Cottesloe"
                className="field-input"
              />
            </Field>
          </div>
        </Section>

        {/* ── Section 2: Checklist + Script */}
        <Section
          title="Checklist & Script"
          id="checklist"
          open={openSection === 'checklist'}
          onToggle={() => setOpenSection(openSection === 'checklist' ? null : 'checklist')}
          badge={`${checklistDone}/${checklist.filter(i => i.type === 'bool').length}`}
        >
          <div className="space-y-2 pt-1">
            {checklist.map(item => (
              <div key={item.id} className="rounded-md border border-[#161616] bg-[#111] p-3">
                <div className="flex items-start gap-2.5">
                  {item.type === 'bool' ? (
                    <button
                      onClick={() => toggleCheck(item.id)}
                      className="mt-0.5 shrink-0 text-[#333] hover:text-[#b8935a] transition-colors"
                    >
                      {item.value
                        ? <CheckCircle2 className="h-4 w-4 text-[#b8935a]" />
                        : <Circle className="h-4 w-4" />
                      }
                    </button>
                  ) : (
                    <div className="mt-0.5 w-4 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#e8ddd0]">{item.label}</p>
                    {item.script && (
                      <p className="mt-1 text-[11px] text-[#444] italic leading-relaxed">{item.script}</p>
                    )}
                    {item.type === 'select' && item.options && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.options.map(opt => (
                          <button
                            key={opt}
                            onClick={() => setSelectValue(item.id, opt)}
                            className={cn(
                              'rounded px-2 py-0.5 text-[11px] border transition-colors',
                              item.value === opt
                                ? 'border-[#b8935a]/50 bg-[#b8935a]/10 text-[#b8935a]'
                                : 'border-[#222] text-[#444] hover:border-[#333]'
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                    {item.type === 'text' && (
                      <input
                        value={item.value as string}
                        onChange={e => setSelectValue(item.id, e.target.value)}
                        className="mt-1 field-input text-[11px]"
                        placeholder="Notes…"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}

            <Field label="Site Notes">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Anything else to capture about the site…"
                rows={3}
                className="field-input resize-none"
              />
            </Field>
          </div>
        </Section>

        {/* ── Section 3: Quote */}
        <Section
          title="Quote Calculator"
          id="quote"
          open={openSection === 'quote'}
          onToggle={() => setOpenSection(openSection === 'quote' ? null : 'quote')}
          badge={result ? formatCurrency(result.quote.subtotal_ex_gst) : undefined}
        >
          <div className="space-y-4 pt-2">
            {/* m² */}
            <Field label="Area (m²)">
              <input
                type="number"
                value={sqm}
                onChange={e => { setSqm(e.target.value); setResult(null) }}
                placeholder="0"
                className="block w-full rounded-md border border-[#222] bg-[#0a0a0a] px-4 text-4xl font-mono font-bold text-[#e8ddd0] py-3 focus:outline-none focus:border-[#b8935a]/50"
              />
            </Field>

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
                      : 'border-[#161616] text-[#444]'
                  )}
                >
                  {type === 'fullSubframe' ? 'Full Sub' : type === 'overConcrete' ? 'Over Conc.' : 'Re-deck'}
                </button>
              ))}
            </div>

            {/* H4 + Tier */}
            <div className="flex gap-2 items-center">
              <button
                onClick={() => { setUseH4(!useH4); setResult(null) }}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                  useH4 ? 'border-[#b8935a] bg-[#b8935a]/10 text-[#b8935a]' : 'border-[#161616] text-[#444]'
                )}
              >
                H4 {useH4 ? 'ON' : 'OFF'}
              </button>
              <div className="flex gap-1 ml-auto">
                {(['red', 'black', 'blue'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTier(t); setResult(null) }}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs font-medium border transition-colors',
                      tier === t
                        ? t === 'red'   ? 'border-red-400/50 bg-red-400/10 text-red-400'
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

            {/* Product */}
            <Field label="Product">
              <select
                value={productId}
                onChange={e => { setProductId(e.target.value); setResult(null) }}
                className="field-input"
              >
                <option value="">Select a product…</option>
                {['timber', 'composite'].map(cat => (
                  <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                    {filteredProducts
                      .filter(p => p.category === cat)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))
                    }
                  </optgroup>
                ))}
              </select>
            </Field>

            {/* Calculate button */}
            <button
              onClick={calculate}
              disabled={!sqm || !productId || calculating}
              className={cn(
                'w-full rounded-lg py-3 text-sm font-medium transition-colors',
                sqm && productId
                  ? 'bg-[#b8935a] text-[#080808] hover:bg-[#a07840]'
                  : 'bg-[#161616] text-[#333] cursor-not-allowed'
              )}
            >
              {calculating ? 'Calculating…' : 'Calculate Quote'}
            </button>

            {/* Result */}
            {result && (
              <div className="rounded-lg border border-[#b8935a]/20 bg-[#b8935a]/5 p-4 space-y-3">
                <div className="space-y-1">
                  {result.quote.line_items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-[#666]">{item.description}</span>
                      <span className="font-mono text-[#e8ddd0]">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#b8935a]/20 pt-3 space-y-1">
                  <div className="flex justify-between text-xs text-[#444]">
                    <span>Subtotal ex GST</span>
                    <span className="font-mono">{formatCurrency(result.quote.subtotal_ex_gst)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#444]">
                    <span>GST</span>
                    <span className="font-mono">{formatCurrency(result.quote.gst)}</span>
                  </div>
                  <div className="flex justify-between text-base font-medium">
                    <span className="text-[#e8ddd0]">Total inc GST</span>
                    <span className="font-mono text-[#b8935a]">{formatCurrency(result.quote.total_inc_gst)}</span>
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] pt-1">
                  <span className={result.backcost.gp_status === 'green' ? 'text-green-400' : result.backcost.gp_status === 'amber' ? 'text-amber-400' : 'text-red-400'}>
                    GP {Math.round(result.backcost.gp_pct * 100)}%
                  </span>
                  <span className="text-[#333]">·</span>
                  <span className={result.backcost.rph_status === 'green' ? 'text-green-400' : result.backcost.rph_status === 'amber' ? 'text-amber-400' : 'text-red-400'}>
                    ${Math.round(result.backcost.revenue_per_hour)}/hr
                  </span>
                  <span className="text-[#333]">·</span>
                  <span className="text-[#444]">{result.backcost.days} day{result.backcost.days !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── Section 4: Actions */}
        {result && (
          <Section
            title="Save & Deposit"
            id="deposit"
            open={openSection === 'deposit'}
            onToggle={() => setOpenSection(openSection === 'deposit' ? null : 'deposit')}
          >
            <div className="space-y-3 pt-2">
              {/* Save to pipeline */}
              {!savedJobId ? (
                <button
                  onClick={saveToPipeline}
                  disabled={saving || !clientName}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors',
                    clientName
                      ? 'border-[#b8935a]/30 bg-[#b8935a]/10 text-[#b8935a] hover:bg-[#b8935a]/20'
                      : 'border-[#161616] text-[#333] cursor-not-allowed'
                  )}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save Quote to Pipeline'}
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-green-400/20 bg-green-400/5 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">Quote saved to pipeline</span>
                </div>
              )}

              {!clientName && (
                <p className="text-[11px] text-[#444] text-center">Enter client name to save</p>
              )}

              {/* Deposit */}
              <div className="space-y-2">
                <p className="text-xs text-[#444] uppercase tracking-wider">Record Deposit</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444] text-sm">$</span>
                    <input
                      type="number"
                      value={depositAmt}
                      onChange={e => setDepositAmt(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-md border border-[#222] bg-[#0a0a0a] pl-7 pr-3 py-2.5 text-sm font-mono text-[#e8ddd0] focus:outline-none focus:border-[#b8935a]/50"
                    />
                  </div>
                  <button
                    onClick={recordDeposit}
                    disabled={recordingDep || depositSaved || !depositAmt}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
                      depositSaved
                        ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                        : depositAmt
                        ? 'bg-[#b8935a] text-[#080808] hover:bg-[#a07840]'
                        : 'bg-[#161616] text-[#333] cursor-not-allowed'
                    )}
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    {depositSaved ? 'Recorded' : recordingDep ? 'Saving…' : 'Record'}
                  </button>
                </div>
                <p className="text-[11px] text-[#444]">
                  10% deposit = {result ? formatCurrency(result.quote.subtotal_ex_gst * 0.10) : '—'}.
                  This records the deposit in cashflow as received today.
                </p>
              </div>
            </div>
          </Section>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Field input styles */}
      <style>{`
        .field-input {
          display: block;
          width: 100%;
          border-radius: 6px;
          border: 1px solid #222;
          background: #0a0a0a;
          padding: 8px 12px;
          font-size: 13px;
          color: #e8ddd0;
          outline: none;
          transition: border-color 0.15s;
        }
        .field-input:focus { border-color: rgba(184,147,90,0.5); }
        .field-input::placeholder { color: #333; }
        select.field-input option { background: #111; }
      `}</style>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Section({
  title, id, open, onToggle, badge, children
}: {
  title: string
  id: string
  open: boolean
  onToggle: () => void
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] print:border-0 print:rounded-none">
      <button
        onClick={onToggle}
        className="print:hidden w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#e8ddd0]">{title}</span>
          {badge && (
            <span className="rounded bg-[#b8935a]/10 px-1.5 py-0.5 text-[10px] text-[#b8935a]">{badge}</span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-[#444]" /> : <ChevronDown className="h-4 w-4 text-[#444]" />}
      </button>
      {open && (
        <div className="px-4 pb-4 print:px-0 print:py-4">
          {children}
        </div>
      )}
      {/* Always visible in print */}
      <div className="hidden print:block px-0 py-4">
        {id === 'quote' && children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-[#444] uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  )
}
