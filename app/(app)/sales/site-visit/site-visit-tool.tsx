'use client'

import { useState, useCallback } from 'react'
import { formatCurrency, cn } from '@/lib/utils'
import type { Product } from '@/lib/types/database'
import {
  ChevronDown, ChevronUp, Printer, Save, DollarSign,
  ArrowLeft, Camera, StickyNote, X, AlertCircle, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CheckItem {
  id: string
  label: string
  script?: string
  required: boolean
  type: 'bool' | 'select'
  options?: string[]        // for select type; bool always gets Yes/No
  value: null | boolean | string   // null = unanswered
  notes: string
  photos: string[]          // blob URLs
}

interface QuoteResult {
  quote: {
    line_items: Array<{ description: string; amount: number; tag: string }>
    subtotal_ex_gst: number
    gst: number
    total_inc_gst: number
  }
  backcost: {
    days: number
    total_hours: number
    gp_pct: number
    revenue_per_hour: number
    gp_status: 'green' | 'amber' | 'red'
    rph_status: 'green' | 'amber' | 'red'
  }
  job_fields: Record<string, unknown>
}

// ─── Checklist definition ─────────────────────────────────────────────────────

const INITIAL_CHECKLIST: Omit<CheckItem, 'notes' | 'photos' | 'value'>[] = [
  // Qualify
  {
    id: 'decision_maker', required: true, type: 'bool',
    label: 'Decision maker present',
    script: '"Are you the main person making the call on this, or is your partner involved too? Want to make sure everyone sees it."',
  },
  {
    id: 'budget', required: true, type: 'select',
    options: ['Under $15k', '$15k–$30k', '$30k–$50k', '$50k+', 'Not discussed'],
    label: 'Budget range',
    script: '"Do you have a rough budget in mind? Just helps me make sure I\'m recommending the right product."',
  },
  {
    id: 'timeline', required: true, type: 'select',
    options: ['ASAP', '1–2 months', '3+ months', 'Flexible'],
    label: 'Timeline',
    script: '"When are you hoping to have this done? Any dates or events we\'re working toward?"',
  },
  {
    id: 'other_quotes', required: true, type: 'bool',
    label: 'Getting other quotes',
    script: '"Have you spoken to anyone else, or are we your first call?"',
  },
  // Site
  {
    id: 'access', required: true, type: 'select',
    options: ['Easy', 'Tight', 'Restricted'],
    label: 'Site access',
    script: 'Check driveway width, side gate clearance, overhead wires. Photo the access point.',
  },
  {
    id: 'slope', required: true, type: 'select',
    options: ['Flat', 'Slight slope', 'Steep'],
    label: 'Ground slope',
    script: 'Walk the area. Note rise — affects subframe, post heights, cost. Photo from the side.',
  },
  {
    id: 'existing', required: true, type: 'bool',
    label: 'Existing structure to remove',
    script: 'Is there an existing deck? Condition? Our team handles removal — make sure it\'s in scope.',
  },
  {
    id: 'soil', required: true, type: 'select',
    options: ['Sand', 'Clay', 'Rock', 'Unknown'],
    label: 'Soil / footing conditions',
    script: 'Ask or probe. Rock and clay add cost. Important for post-hole pricing.',
  },
  {
    id: 'services', required: false, type: 'bool',
    label: 'Services or restrictions',
    script: 'Council setbacks, heritage overlay, retaining walls, drainage issues, power lines.',
  },
  // Measure
  {
    id: 'measured', required: true, type: 'bool',
    label: 'Area measured',
    script: 'Measure length × width. Note any cutouts. Photo the tape or sketch.',
  },
  {
    id: 'photos_taken', required: true, type: 'bool',
    label: 'Photos taken (all 4 sides + access)',
    script: 'Capture every angle before you leave. You will not remember it all.',
  },
  // Close
  {
    id: 'product_agreed', required: false, type: 'bool',
    label: 'Product preference confirmed',
    script: '"Based on your budget and what I\'ve seen here, I\'d suggest [product]. Here\'s why it suits this site..."',
  },
  {
    id: 'next_step', required: true, type: 'bool',
    label: 'Next step agreed',
    script: '"I\'ll send through a formal quote today. If you\'re happy with it, we lock in a start date with a 10% deposit."',
  },
]

function buildChecklist(): CheckItem[] {
  return INITIAL_CHECKLIST.map(item => ({ ...item, value: null, notes: '', photos: [] }))
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SiteVisitTool({ products }: { products: Product[] }) {

  // Client details
  const [clientName,  setClientName]  = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [address,     setAddress]     = useState('')
  const [suburb,      setSuburb]      = useState('')

  // Checklist
  const [checklist, setChecklist] = useState<CheckItem[]>(buildChecklist)
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set())

  // Sections
  const [openSection, setOpenSection] = useState<string>('client')

  // Quote
  const [sqm,         setSqm]         = useState('')
  const [installType, setInstallType] = useState<'fullSubframe' | 'overConcrete' | 'redeck'>('fullSubframe')
  const [useH4,       setUseH4]       = useState(false)
  const [tier,        setTier]        = useState<'red' | 'black' | 'blue'>('red')
  const [productId,   setProductId]   = useState('')
  const [result,      setResult]      = useState<QuoteResult | null>(null)
  const [calculating, setCalculating] = useState(false)

  // Save / deposit
  const [saving,       setSaving]       = useState(false)
  const [savedJobId,   setSavedJobId]   = useState<string | null>(null)
  const [depositAmt,   setDepositAmt]   = useState('')
  const [depositSaved, setDepositSaved] = useState(false)
  const [recordingDep, setRecordingDep] = useState(false)

  const selectedProduct  = products.find(p => p.id === productId)
  const filteredProducts = products.filter(p => p.active)

  // ── Derived checklist stats
  const required      = checklist.filter(i => i.required)
  const unanswered    = required.filter(i => i.value === null)
  const totalAnswered = checklist.filter(i => i.value !== null).length
  const blocking      = unanswered.length

  // ── Checklist mutations
  function answer(id: string, val: boolean | string) {
    setChecklist(prev => prev.map(i => i.id === id ? { ...i, value: val } : i))
  }
  function setNotes(id: string, notes: string) {
    setChecklist(prev => prev.map(i => i.id === id ? { ...i, notes } : i))
  }
  function addPhoto(id: string, files: FileList | null) {
    if (!files) return
    const urls = Array.from(files).map(f => URL.createObjectURL(f))
    setChecklist(prev => prev.map(i => i.id === id ? { ...i, photos: [...i.photos, ...urls] } : i))
  }
  function removePhoto(id: string, idx: number) {
    setChecklist(prev => prev.map(i => {
      if (i.id !== id) return i
      const photos = [...i.photos]
      URL.revokeObjectURL(photos[idx])
      photos.splice(idx, 1)
      return { ...i, photos }
    }))
  }
  function toggleEvidence(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Quote calc
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

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080808] pb-24">

      {/* ── Sticky header */}
      <div className="print:hidden sticky top-0 z-10 border-b border-[#161616] bg-[#080808]/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/sales" className="text-[#444] hover:text-[#e8ddd0] transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-sm font-medium text-[#e8ddd0]">Site Visit</h1>
              <p className="text-[10px] mt-0.5">
                {blocking > 0
                  ? <span className="text-amber-400">{blocking} required {blocking === 1 ? 'item' : 'items'} outstanding</span>
                  : <span className="text-green-400">Checklist complete</span>
                }
                {result && <span className="text-[#444]"> · {formatCurrency(result.quote.subtotal_ex_gst)} ex GST</span>}
              </p>
            </div>
          </div>
          {result && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-md border border-[#b8935a]/30 bg-[#b8935a]/10 px-3 py-1.5 text-xs font-medium text-[#b8935a] active:bg-[#b8935a]/20"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Quote
            </button>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">

        {/* ── 1. Client Details */}
        <Accordion
          title="Client Details"
          open={openSection === 'client'}
          onToggle={() => setOpenSection(openSection === 'client' ? '' : 'client')}
          badge={clientName || undefined}
        >
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <FField label="Name *">
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Smith" className="fi" />
              </FField>
              <FField label="Phone">
                <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="0400 000 000" className="fi" />
              </FField>
            </div>
            <FField label="Email">
              <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" className="fi" />
            </FField>
            <div className="grid grid-cols-2 gap-3">
              <FField label="Address">
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="12 Example St" className="fi" />
              </FField>
              <FField label="Suburb">
                <input value={suburb} onChange={e => setSuburb(e.target.value)} placeholder="Cottesloe" className="fi" />
              </FField>
            </div>
          </div>
        </Accordion>

        {/* ── 2. Checklist */}
        <Accordion
          title="Checklist"
          open={openSection === 'checklist'}
          onToggle={() => setOpenSection(openSection === 'checklist' ? '' : 'checklist')}
          badge={`${totalAnswered}/${checklist.length}`}
          alert={blocking > 0 ? `${blocking} required` : undefined}
        >
          <div className="space-y-2 pt-1">
            {checklist.map(item => {
              const unansweredRequired = item.required && item.value === null
              const isOpen = expanded.has(item.id)
              const hasEvidence = item.notes.length > 0 || item.photos.length > 0

              return (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-lg border bg-[#0e0e0e] overflow-hidden transition-colors',
                    unansweredRequired
                      ? 'border-amber-400/30'
                      : item.value !== null
                      ? 'border-[#1a1a1a]'
                      : 'border-[#161616]'
                  )}
                >
                  {/* Item header */}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {unansweredRequired && (
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                        )}
                        {!unansweredRequired && item.value !== null && (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#b8935a]" />
                        )}
                        {!unansweredRequired && item.value === null && (
                          <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-[#333]" />
                        )}
                        <p className="text-xs font-medium text-[#e8ddd0] leading-tight">
                          {item.label}
                          {item.required && <span className="text-amber-400 ml-0.5">*</span>}
                        </p>
                      </div>
                      {/* Evidence toggle */}
                      <button
                        onClick={() => toggleEvidence(item.id)}
                        className={cn(
                          'shrink-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors',
                          hasEvidence
                            ? 'bg-[#b8935a]/10 text-[#b8935a]'
                            : 'text-[#333] hover:text-[#555]'
                        )}
                      >
                        {item.photos.length > 0 && <Camera className="h-3 w-3" />}
                        {item.notes.length > 0 && <StickyNote className="h-3 w-3" />}
                        <span>{isOpen ? 'Hide' : 'Notes'}</span>
                        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </div>

                    {/* Script */}
                    {item.script && (
                      <p className="text-[11px] text-[#3a3a3a] italic leading-relaxed mb-2 ml-5">{item.script}</p>
                    )}

                    {/* Answer buttons */}
                    {item.type === 'bool' && (
                      <div className="flex gap-2 ml-5">
                        <button
                          onClick={() => answer(item.id, true)}
                          className={cn(
                            'flex-1 rounded-md py-2 text-xs font-medium border transition-colors',
                            item.value === true
                              ? 'border-green-500/50 bg-green-500/10 text-green-400'
                              : 'border-[#222] text-[#444] hover:border-[#333] hover:text-[#666]'
                          )}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => answer(item.id, false)}
                          className={cn(
                            'flex-1 rounded-md py-2 text-xs font-medium border transition-colors',
                            item.value === false
                              ? 'border-red-400/40 bg-red-400/10 text-red-400'
                              : 'border-[#222] text-[#444] hover:border-[#333] hover:text-[#666]'
                          )}
                        >
                          No
                        </button>
                      </div>
                    )}

                    {item.type === 'select' && item.options && (
                      <div className="flex flex-wrap gap-1.5 ml-5">
                        {item.options.map(opt => (
                          <button
                            key={opt}
                            onClick={() => answer(item.id, opt)}
                            className={cn(
                              'rounded-md px-3 py-1.5 text-xs font-medium border transition-colors',
                              item.value === opt
                                ? 'border-[#b8935a]/50 bg-[#b8935a]/10 text-[#b8935a]'
                                : 'border-[#222] text-[#444] hover:border-[#333] hover:text-[#666]'
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Evidence drawer */}
                  {isOpen && (
                    <div className="border-t border-[#161616] bg-[#0a0a0a] p-3 space-y-3">
                      {/* Notes */}
                      <FField label="Notes">
                        <textarea
                          value={item.notes}
                          onChange={e => setNotes(item.id, e.target.value)}
                          placeholder="Observations, measurements, anything to capture…"
                          rows={2}
                          className="fi resize-none"
                        />
                      </FField>

                      {/* Photos */}
                      <div>
                        <p className="text-[10px] text-[#444] uppercase tracking-wider mb-1.5">Photos</p>

                        {/* Thumbnails */}
                        {item.photos.length > 0 && (
                          <div className="flex gap-2 flex-wrap mb-2">
                            {item.photos.map((url, idx) => (
                              <div key={idx} className="relative group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt=""
                                  className="h-16 w-16 rounded-md object-cover border border-[#222]"
                                />
                                <button
                                  onClick={() => removePhoto(item.id, idx)}
                                  className="absolute -top-1.5 -right-1.5 rounded-full bg-[#111] border border-[#333] p-0.5 text-[#666] hover:text-red-400 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add photo button */}
                        <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-[#2a2a2a] px-3 py-2.5 text-xs text-[#444] hover:border-[#444] hover:text-[#666] transition-colors">
                          <Camera className="h-3.5 w-3.5" />
                          <span>Take photo or choose from library</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            className="sr-only"
                            onChange={e => addPhoto(item.id, e.target.files)}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Accordion>

        {/* ── 3. Quote Calculator */}
        <Accordion
          title="Quote Calculator"
          open={openSection === 'quote'}
          onToggle={() => setOpenSection(openSection === 'quote' ? '' : 'quote')}
          badge={result ? formatCurrency(result.quote.subtotal_ex_gst) + ' ex GST' : undefined}
        >
          <div className="space-y-4 pt-2">
            {/* m² — big */}
            <FField label="Area (m²) *">
              <input
                type="number"
                inputMode="decimal"
                value={sqm}
                onChange={e => { setSqm(e.target.value); setResult(null) }}
                placeholder="0"
                className="block w-full rounded-md border border-[#222] bg-[#0a0a0a] px-4 text-4xl font-mono font-bold text-[#e8ddd0] py-3 focus:outline-none focus:border-[#b8935a]/50"
              />
            </FField>

            {/* Install type */}
            <div className="flex gap-2">
              {(['fullSubframe', 'overConcrete', 'redeck'] as const).map(t => (
                <button key={t}
                  onClick={() => { setInstallType(t); setResult(null) }}
                  className={cn(
                    'flex-1 rounded-md border py-2.5 text-xs font-medium transition-colors',
                    installType === t ? 'border-[#b8935a] bg-[#b8935a]/10 text-[#b8935a]' : 'border-[#1a1a1a] text-[#444]'
                  )}
                >
                  {t === 'fullSubframe' ? 'Full Sub' : t === 'overConcrete' ? 'Over Conc.' : 'Re-deck'}
                </button>
              ))}
            </div>

            {/* H4 + tier */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setUseH4(!useH4); setResult(null) }}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                  useH4 ? 'border-[#b8935a] bg-[#b8935a]/10 text-[#b8935a]' : 'border-[#1a1a1a] text-[#444]'
                )}
              >
                H4 {useH4 ? 'ON' : 'OFF'}
              </button>
              <div className="flex gap-1 ml-auto">
                {(['red', 'black', 'blue'] as const).map(t => (
                  <button key={t}
                    onClick={() => { setTier(t); setResult(null) }}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs font-medium border transition-colors',
                      tier === t
                        ? t === 'red'   ? 'border-red-400/40 bg-red-400/10 text-red-400'
                          : t === 'black' ? 'border-[#555] bg-[#222] text-[#e8ddd0]'
                          : 'border-[#b8935a]/40 bg-[#b8935a]/10 text-[#b8935a]'
                        : 'border-[#1a1a1a] text-[#333]'
                    )}
                  >
                    JW {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Product */}
            <FField label="Product *">
              <select
                value={productId}
                onChange={e => { setProductId(e.target.value); setResult(null) }}
                className="fi"
              >
                <option value="">Select a product…</option>
                {(['timber', 'composite'] as const).map(cat => (
                  <optgroup key={cat} label={cat[0].toUpperCase() + cat.slice(1)}>
                    {filteredProducts.filter(p => p.category === cat).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </FField>

            <button
              onClick={calculate}
              disabled={!sqm || !productId || calculating}
              className={cn(
                'w-full rounded-lg py-3 text-sm font-semibold transition-colors',
                sqm && productId
                  ? 'bg-[#b8935a] text-[#080808] active:bg-[#a07840]'
                  : 'bg-[#161616] text-[#333] cursor-not-allowed'
              )}
            >
              {calculating ? 'Calculating…' : 'Calculate Quote'}
            </button>

            {result && (
              <div className="rounded-lg border border-[#b8935a]/20 bg-[#b8935a]/5 p-4 space-y-3">
                <div className="space-y-1.5">
                  {result.quote.line_items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-[#555]">{item.description}</span>
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
                    <span>GST (10%)</span>
                    <span className="font-mono">{formatCurrency(result.quote.gst)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold pt-1">
                    <span className="text-[#e8ddd0]">Total inc GST</span>
                    <span className="font-mono text-[#b8935a]">{formatCurrency(result.quote.total_inc_gst)}</span>
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] pt-0.5">
                  <span className={result.backcost.gp_status === 'green' ? 'text-green-400' : result.backcost.gp_status === 'amber' ? 'text-amber-400' : 'text-red-400'}>
                    GP {Math.round(result.backcost.gp_pct * 100)}%
                  </span>
                  <span className="text-[#333]">·</span>
                  <span className={result.backcost.rph_status === 'green' ? 'text-green-400' : result.backcost.rph_status === 'amber' ? 'text-amber-400' : 'text-red-400'}>
                    ${Math.round(result.backcost.revenue_per_hour)}/hr
                  </span>
                  <span className="text-[#333]">·</span>
                  <span className="text-[#444]">{result.backcost.days}d</span>
                </div>
              </div>
            )}
          </div>
        </Accordion>

        {/* ── 4. Save & Deposit */}
        {result && (
          <Accordion
            title="Save & Deposit"
            open={openSection === 'actions'}
            onToggle={() => setOpenSection(openSection === 'actions' ? '' : 'actions')}
          >
            <div className="space-y-3 pt-2">
              {!savedJobId ? (
                <button
                  onClick={saveToPipeline}
                  disabled={saving || !clientName}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors',
                    clientName
                      ? 'border-[#b8935a]/30 bg-[#b8935a]/10 text-[#b8935a] active:bg-[#b8935a]/20'
                      : 'border-[#1a1a1a] text-[#333] cursor-not-allowed'
                  )}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save Quote to Pipeline'}
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">Saved to pipeline</span>
                </div>
              )}
              {!clientName && <p className="text-[11px] text-[#444] text-center">Enter client name above to save</p>}

              <div className="space-y-1.5">
                <p className="text-[10px] text-[#444] uppercase tracking-wider">Record Deposit Received</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444] text-sm font-medium">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
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
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : depositAmt
                        ? 'bg-[#b8935a] text-[#080808] active:bg-[#a07840]'
                        : 'bg-[#161616] text-[#333] cursor-not-allowed'
                    )}
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    {depositSaved ? 'Recorded' : recordingDep ? '…' : 'Record'}
                  </button>
                </div>
                <p className="text-[11px] text-[#333]">
                  10% = {formatCurrency(result.quote.subtotal_ex_gst * 0.10)} ex GST · marks as received in cashflow today
                </p>
              </div>
            </div>
          </Accordion>
        )}
      </div>

      {/* Global styles */}
      <style>{`
        .fi {
          display: block; width: 100%; border-radius: 6px;
          border: 1px solid #1e1e1e; background: #0a0a0a;
          padding: 8px 12px; font-size: 13px; color: #e8ddd0;
          outline: none; transition: border-color 0.15s;
        }
        .fi:focus { border-color: rgba(184,147,90,0.4); }
        .fi::placeholder { color: #2e2e2e; }
        select.fi option, select.fi optgroup { background: #111; }
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Accordion({
  title, open, onToggle, badge, alert, children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  badge?: string
  alert?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-[#161616] bg-[#0c0c0c]">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#e8ddd0]">{title}</span>
          {badge && <span className="rounded bg-[#b8935a]/10 px-1.5 py-0.5 text-[10px] text-[#b8935a]">{badge}</span>}
          {alert && <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-400">{alert}</span>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-[#333]" /> : <ChevronDown className="h-4 w-4 text-[#333]" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function FField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-[#444] uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  )
}
