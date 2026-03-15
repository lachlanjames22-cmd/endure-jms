'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#080808',
  surface: '#0c0c0f',
  surface2:'#111114',
  border:  '#1a1a20',
  border2: '#22222a',
  gold:    '#b8935a',
  text:    '#e8ddd0',
  textMid: '#7a7570',
  textDim: '#4e4a45',
  green:   '#4ade80',
  red:     '#f87171',
  amber:   '#fbbf24',
}

// ─── Jarvis notes per step ─────────────────────────────────────────────────────
const JARVIS_NOTES = [
  null, // welcome — handled separately
  "I'll use your name every time you log in and your number for WhatsApp alerts. If cash goes critical at 11pm, I text you — not your inbox.",
  "This is the most important number in the business. I use your transactions account balance as the starting point for all cashflow forecasting. The tax account is separate — it's not yours to spend.",
  "I use loaded rates to calculate your true labour cost on every job. Loaded = base + super + WorkCover. For a $38/hr carpenter, loaded is typically around $48–50/hr.",
  "GP% is always measured on labour value — not total revenue. That's what separates a margin problem from a volume problem. 45% on labour value is the target.",
  "If you've got jobs on the go or in the pipeline, add them now. I'll track cashflow, GP, and follow-up timing from day one. You can always add more later.",
]

type CrewMember = { name: string; type: string; loadedRate: string }
type Job = { name: string; suburb: string; value: string; status: string }

interface WizardData {
  ownerName: string
  phone: string
  openingBalance: string
  taxBalance: string
  crew: CrewMember[]
  targetGp: string
  dayRateTarget: string
  billableDays: string
  jobs: Job[]
}

const DEFAULTS: WizardData = {
  ownerName: '',
  phone: '',
  openingBalance: '',
  taxBalance: '',
  crew: [{ name: '', type: 'full_time', loadedRate: '' }],
  targetGp: '45',
  dayRateTarget: '2400',
  billableDays: '17.2',
  jobs: [],
}

export function SetupWizard({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const TOTAL_STEPS = 7 // 0=welcome, 1=you, 2=cash, 3=crew, 4=targets, 5=jobs, 6=done
  const progress = Math.round((step / (TOTAL_STEPS - 1)) * 100)

  function set<K extends keyof WizardData>(key: K, val: WizardData[K]) {
    setData(d => ({ ...d, [key]: val }))
  }

  function upsertSetting(key: string, value: unknown) {
    return supabase.from('settings').upsert({ key, value })
  }

  async function saveStep() {
    setSaving(true)
    setError('')
    try {
      if (step === 1) {
        await Promise.all([
          supabase.from('profiles').update({ full_name: data.ownerName }).eq('id', userId),
          upsertSetting('owner_name', data.ownerName),
          upsertSetting('owner_phone', data.phone),
        ])
      }
      if (step === 2) {
        await Promise.all([
          upsertSetting('opening_balance', parseFloat(data.openingBalance) || 0),
          upsertSetting('tax_account_balance', parseFloat(data.taxBalance) || 0),
        ])
      }
      if (step === 3) {
        const validCrew = data.crew.filter(c => c.name.trim())
        if (validCrew.length > 0) {
          await supabase.from('crew').insert(
            validCrew.map(c => ({
              name: c.name.trim(),
              type: c.type,
              loaded_rate: parseFloat(c.loadedRate) || 0,
              base_rate: Math.round((parseFloat(c.loadedRate) || 0) / 1.15),
              pay_cycle: c.type === 'subby' ? 'invoice' : 'fortnightly',
              active: true,
            }))
          )
        }
      }
      if (step === 4) {
        await Promise.all([
          upsertSetting('target_gp_pct', parseFloat(data.targetGp) / 100),
          upsertSetting('day_rate_target', parseFloat(data.dayRateTarget) || 2400),
          upsertSetting('billable_days_month', parseFloat(data.billableDays) || 17.2),
        ])
      }
      if (step === 5) {
        const validJobs = data.jobs.filter(j => j.name.trim())
        if (validJobs.length > 0) {
          await supabase.from('jobs').insert(
            validJobs.map(j => ({
              name: j.name.trim(),
              client_name: j.name.trim(),
              suburb: j.suburb.trim(),
              quoted_total_value: parseFloat(j.value) || 0,
              quoted_labour_value: Math.round((parseFloat(j.value) || 0) * 0.55),
              status: j.status,
              jw_tier: 'red',
            }))
          )
        }
      }
      if (step === TOTAL_STEPS - 2) {
        // About to show done screen — mark complete
        await upsertSetting('setup_complete', true)
      }
      setStep(s => s + 1)
    } catch (e) {
      setError('Something went wrong saving. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function canAdvance() {
    if (step === 1) return data.ownerName.trim().length > 0
    if (step === 2) return data.openingBalance.trim().length > 0
    return true
  }

  // ─── Step content ──────────────────────────────────────────────────────────

  function StepWelcome() {
    return (
      <div style={{ textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: C.gold + '18', border: `1px solid ${C.gold}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', fontSize: '28px' }}>
          🧠
        </div>
        <h1 style={{ fontSize: '28px', fontFamily: 'Georgia,serif', color: C.text, marginBottom: '16px', fontWeight: 400 }}>
          G'day. I'm Jarvis.
        </h1>
        <p style={{ fontSize: '15px', color: C.textMid, lineHeight: 1.8, marginBottom: '12px' }}>
          I'm going to be your business brain for Endure Decking. I'll track your cash, jobs, crew, and pipeline — and tell you what to do before you have to ask.
        </p>
        <p style={{ fontSize: '14px', color: C.textDim, lineHeight: 1.7, marginBottom: '32px' }}>
          Setup takes about 5 minutes. By the end I'll have everything I need to give you a real morning brief — no guessing, no placeholder data.
        </p>
        <button
          onClick={() => setStep(1)}
          style={{ background: C.gold, color: C.bg, border: 'none', fontFamily: "'DM Mono',monospace", fontSize: '11px', padding: '14px 32px', cursor: 'pointer', letterSpacing: '0.15em' }}>
          LET'S GO →
        </button>
      </div>
    )
  }

  function StepYou() {
    return (
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        <StepHeader step={1} title="About you" />
        <Field label="Your name">
          <input
            autoFocus
            type="text"
            value={data.ownerName}
            onChange={e => set('ownerName', e.target.value)}
            placeholder="Lachlan"
            style={inputStyle}
          />
        </Field>
        <Field label="Mobile / WhatsApp number" hint="Used for Jarvis alerts via WhatsApp">
          <input
            type="tel"
            value={data.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="+61 412 345 678"
            style={inputStyle}
          />
        </Field>
      </div>
    )
  }

  function StepCash() {
    return (
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        <StepHeader step={2} title="Cash position today" />
        <Field label="Transactions account — opening balance" hint="What's in the account right now, in dollars">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '14px', color: C.textDim }}>$</span>
            <input
              autoFocus
              type="number"
              value={data.openingBalance}
              onChange={e => set('openingBalance', e.target.value)}
              placeholder="24,300"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </Field>
        <Field label="Tax / BAS account balance" hint="What's sitting in your tax account right now">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '14px', color: C.textDim }}>$</span>
            <input
              type="number"
              value={data.taxBalance}
              onChange={e => set('taxBalance', e.target.value)}
              placeholder="11,200"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </Field>
      </div>
    )
  }

  function StepCrew() {
    return (
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        <StepHeader step={3} title="Your crew" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {data.crew.map((c, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px 32px', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={c.name}
                onChange={e => {
                  const next = [...data.crew]
                  next[i] = { ...next[i], name: e.target.value }
                  set('crew', next)
                }}
                placeholder={i === 0 ? "Baylee" : i === 1 ? "Marius" : "Name"}
                style={inputStyle}
              />
              <select
                value={c.type}
                onChange={e => {
                  const next = [...data.crew]
                  next[i] = { ...next[i], type: e.target.value }
                  set('crew', next)
                }}
                style={{ ...inputStyle, background: C.surface2 }}
              >
                <option value="full_time">Full time</option>
                <option value="casual">Casual</option>
                <option value="subby">Subby / ABN</option>
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '11px', color: C.textDim }}>$</span>
                <input
                  type="number"
                  value={c.loadedRate}
                  onChange={e => {
                    const next = [...data.crew]
                    next[i] = { ...next[i], loadedRate: e.target.value }
                    set('crew', next)
                  }}
                  placeholder="57.60"
                  style={{ ...inputStyle, fontSize: '12px' }}
                />
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '10px', color: C.textDim }}>/hr</span>
              </div>
              <button
                onClick={() => set('crew', data.crew.filter((_, j) => j !== i))}
                style={{ background: 'transparent', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
                onMouseEnter={e => (e.currentTarget.style.color = C.red)}
                onMouseLeave={e => (e.currentTarget.style.color = C.textDim)}
              >×</button>
            </div>
          ))}
        </div>
        <button
          onClick={() => set('crew', [...data.crew, { name: '', type: 'full_time', loadedRate: '' }])}
          style={{ background: 'transparent', border: `1px dashed ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: '9px', padding: '8px 16px', cursor: 'pointer', letterSpacing: '0.1em', width: '100%' }}
        >
          + ADD CREW MEMBER
        </button>
        <div style={{ marginTop: '12px', padding: '10px 12px', background: C.surface2, border: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '9px', color: C.textDim }}>
            TYPICAL LOADED RATES · Full time carpenter: $55–63/hr · Casual: $45–55/hr · Subby / ABN: rate as invoiced
          </span>
        </div>
      </div>
    )
  }

  function StepTargets() {
    return (
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        <StepHeader step={4} title="Operations targets" />
        <Field label="Target GP% on labour value" hint="The gross profit margin you aim for on every job. 45% is the benchmark.">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              autoFocus
              type="number"
              value={data.targetGp}
              onChange={e => set('targetGp', e.target.value)}
              style={{ ...inputStyle, width: '100px' }}
            />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '14px', color: C.textDim }}>%</span>
          </div>
        </Field>
        <Field label="Day rate target (labour value / day)" hint="Minimum revenue per working day to hit breakeven. Typically $2,400–$3,200.">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '14px', color: C.textDim }}>$</span>
            <input
              type="number"
              value={data.dayRateTarget}
              onChange={e => set('dayRateTarget', e.target.value)}
              style={inputStyle}
            />
          </div>
        </Field>
        <Field label="Billable working days per month" hint="Exclude weekends, public holidays, typical rain days. Default: 17.2">
          <input
            type="number"
            step="0.1"
            value={data.billableDays}
            onChange={e => set('billableDays', e.target.value)}
            style={{ ...inputStyle, width: '120px' }}
          />
        </Field>
      </div>
    )
  }

  function StepJobs() {
    return (
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <StepHeader step={5} title="Current jobs" />
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '10px', color: C.textDim, marginBottom: '16px', letterSpacing: '0.05em' }}>
          Add jobs that are currently active, scheduled, or in your pipeline. Skip if you're starting fresh.
        </p>
        {data.jobs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {data.jobs.map((j, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 120px 100px 32px', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={j.name}
                  onChange={e => {
                    const next = [...data.jobs]
                    next[i] = { ...next[i], name: e.target.value }
                    set('jobs', next)
                  }}
                  placeholder="Client name"
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={j.suburb}
                  onChange={e => {
                    const next = [...data.jobs]
                    next[i] = { ...next[i], suburb: e.target.value }
                    set('jobs', next)
                  }}
                  placeholder="Suburb"
                  style={inputStyle}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '11px', color: C.textDim }}>$</span>
                  <input
                    type="number"
                    value={j.value}
                    onChange={e => {
                      const next = [...data.jobs]
                      next[i] = { ...next[i], value: e.target.value }
                      set('jobs', next)
                    }}
                    placeholder="42,000"
                    style={{ ...inputStyle, fontSize: '12px' }}
                  />
                </div>
                <select
                  value={j.status}
                  onChange={e => {
                    const next = [...data.jobs]
                    next[i] = { ...next[i], status: e.target.value }
                    set('jobs', next)
                  }}
                  style={{ ...inputStyle, background: C.surface2, fontSize: '11px' }}
                >
                  <option value="quoted">Quoted</option>
                  <option value="won">Won</option>
                  <option value="in_progress">In Progress</option>
                  <option value="scheduled">Scheduled</option>
                </select>
                <button
                  onClick={() => set('jobs', data.jobs.filter((_, j) => j !== i))}
                  style={{ background: 'transparent', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.red)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.textDim)}
                >×</button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => set('jobs', [...data.jobs, { name: '', suburb: '', value: '', status: 'quoted' }])}
          style={{ background: 'transparent', border: `1px dashed ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: '9px', padding: '8px 16px', cursor: 'pointer', letterSpacing: '0.1em', width: '100%' }}
        >
          + ADD JOB
        </button>
      </div>
    )
  }

  function StepDone() {
    return (
      <div style={{ textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: C.green + '18', border: `1px solid ${C.green}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', fontSize: '28px' }}>
          ✓
        </div>
        <h1 style={{ fontSize: '28px', fontFamily: 'Georgia,serif', color: C.text, marginBottom: '16px', fontWeight: 400 }}>
          Brain uploaded.
        </h1>
        <p style={{ fontSize: '15px', color: C.textMid, lineHeight: 1.8, marginBottom: '8px' }}>
          I've got everything I need. Cash position, crew rates, targets, jobs — it's all in.
        </p>
        <p style={{ fontSize: '14px', color: C.textDim, lineHeight: 1.7, marginBottom: '32px' }}>
          I'm going to give you your first morning brief now. It'll be waiting for you in Jarvis.
        </p>
        <button
          onClick={() => router.push('/jarvis')}
          style={{ background: C.gold, color: C.bg, border: 'none', fontFamily: "'DM Mono',monospace", fontSize: '11px', padding: '14px 32px', cursor: 'pointer', letterSpacing: '0.15em' }}>
          OPEN JARVIS →
        </button>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '9px', color: C.textDim, marginTop: '16px' }}>
          or go to <a href="/dashboard" style={{ color: C.gold, textDecoration: 'none' }}>Dashboard</a>
        </p>
      </div>
    )
  }

  // ─── Sub-components ─────────────────────────────────────────────────────────

  function StepHeader({ step: s, title }: { step: number; title: string }) {
    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '9px', color: C.gold, letterSpacing: '0.2em', marginBottom: '6px' }}>
          STEP {s} OF {TOTAL_STEPS - 2}
        </div>
        <h2 style={{ fontSize: '22px', fontFamily: 'Georgia,serif', color: C.text, fontWeight: 400 }}>{title}</h2>
      </div>
    )
  }

  function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '9px', color: C.textDim, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</div>
        {hint && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '9px', color: C.textDim, marginBottom: '8px', lineHeight: 1.6, opacity: 0.7 }}>{hint}</div>}
        {children}
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: C.surface2,
    border: `1px solid ${C.border2}`,
    color: C.text,
    fontFamily: 'Georgia,serif',
    fontSize: '14px',
    padding: '10px 12px',
    outline: 'none',
  }

  const stepContent = [
    <StepWelcome key="welcome" />,
    <StepYou key="you" />,
    <StepCash key="cash" />,
    <StepCrew key="crew" />,
    <StepTargets key="targets" />,
    <StepJobs key="jobs" />,
    <StepDone key="done" />,
  ]

  const jarvisNote = step > 0 && step < TOTAL_STEPS - 1 ? JARVIS_NOTES[step] : null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Georgia,serif', display: 'flex', flexDirection: 'column' }}>
      {/* Progress bar */}
      {step > 0 && step < TOTAL_STEPS - 1 && (
        <div style={{ height: '2px', background: C.border, position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: C.gold, transition: 'width 0.4s ease' }} />
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '24px 32px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: C.gold + '20', border: `1px solid ${C.gold}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
          🧠
        </div>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '11px', color: C.gold, letterSpacing: '0.15em' }}>
          ENDURE OS · SETUP
        </span>
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '9px', color: C.textDim, marginLeft: 'auto' }}>
            {step} / {TOTAL_STEPS - 2} complete
          </span>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '640px' }}>
          {stepContent[step]}
        </div>
      </div>

      {/* Jarvis note */}
      {jarvisNote && (
        <div style={{ padding: '0 32px 20px' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', padding: '12px 16px', background: C.surface, borderLeft: `3px solid ${C.gold}`, borderTop: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '8px', color: C.gold, letterSpacing: '0.15em', marginBottom: '5px' }}>JARVIS</div>
            <div style={{ fontSize: '12px', color: C.textMid, lineHeight: 1.7 }}>{jarvisNote}</div>
          </div>
        </div>
      )}

      {/* Nav buttons */}
      {step > 0 && step < TOTAL_STEPS - 1 && (
        <div style={{ padding: '20px 32px 32px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ background: 'transparent', border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: '9px', padding: '10px 20px', cursor: 'pointer', letterSpacing: '0.1em' }}
            >
              ← BACK
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              {error && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '9px', color: C.red }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                {step === 5 && (
                  <button
                    onClick={() => {
                      // Skip jobs step
                      saveStep()
                    }}
                    disabled={saving}
                    style={{ background: 'transparent', border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: '9px', padding: '10px 20px', cursor: 'pointer', letterSpacing: '0.1em' }}
                  >
                    SKIP
                  </button>
                )}
                <button
                  onClick={saveStep}
                  disabled={saving || !canAdvance()}
                  style={{
                    background: canAdvance() ? C.gold : C.border2,
                    color: canAdvance() ? C.bg : C.textDim,
                    border: 'none',
                    fontFamily: "'DM Mono',monospace",
                    fontSize: '9px',
                    padding: '10px 24px',
                    cursor: canAdvance() ? 'pointer' : 'not-allowed',
                    letterSpacing: '0.12em',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'SAVING...' : step === TOTAL_STEPS - 2 ? 'FINISH →' : 'CONTINUE →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
