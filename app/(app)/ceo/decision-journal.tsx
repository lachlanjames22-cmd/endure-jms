'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Decision {
  id: string
  decision: string
  context: string | null
  jarvis_recommendation: string | null
  owner_decision: string | null
  outcome: string | null
  outcome_date: string | null
  created_at: string
}

export function DecisionJournal({ initial }: { initial: Decision[] }) {
  const [decisions, setDecisions] = useState<Decision[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ decision: '', context: '', jarvis_recommendation: '', owner_decision: '' })
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function addDecision() {
    if (!form.decision.trim()) return
    setSaving(true)
    const supabase = createClient()
    // @ts-ignore
    const { data } = await supabase.from('decision_journal' as never).insert(form as never).select().single()
    if (data) setDecisions(prev => [data, ...prev])
    setForm({ decision: '', context: '', jarvis_recommendation: '', owner_decision: '' })
    setShowForm(false)
    setSaving(false)
  }

  async function recordOutcome(id: string, outcome: string) {
    const supabase = createClient()
    // @ts-ignore
    await supabase.from('decision_journal' as never).update({ outcome, outcome_date: new Date().toISOString().slice(0,10) }).eq('id', id)
    setDecisions(prev => prev.map(d => d.id === id ? { ...d, outcome, outcome_date: new Date().toISOString().slice(0,10) } : d))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-['Georgia',serif] text-[#e8ddd0]">Decision Journal</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border border-[#222] text-[#b8935a] hover:bg-[#b8935a]/10 transition-colors"
        >
          + Log decision
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-4 space-y-3">
          <input
            value={form.decision}
            onChange={e => setForm(p => ({ ...p, decision: e.target.value }))}
            placeholder="What's the decision?"
            className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e8ddd0] placeholder:text-[#333] focus:outline-none focus:border-[#b8935a]/50"
          />
          <textarea
            value={form.context}
            onChange={e => setForm(p => ({ ...p, context: e.target.value }))}
            placeholder="Context — what led to this?"
            rows={2}
            className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e8ddd0] placeholder:text-[#333] focus:outline-none focus:border-[#b8935a]/50 resize-none"
          />
          <input
            value={form.jarvis_recommendation}
            onChange={e => setForm(p => ({ ...p, jarvis_recommendation: e.target.value }))}
            placeholder="What did Jarvis recommend?"
            className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e8ddd0] placeholder:text-[#333] focus:outline-none focus:border-[#b8935a]/50"
          />
          <input
            value={form.owner_decision}
            onChange={e => setForm(p => ({ ...p, owner_decision: e.target.value }))}
            placeholder="What did you decide?"
            className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e8ddd0] placeholder:text-[#333] focus:outline-none focus:border-[#b8935a]/50"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 rounded-lg border border-[#222] text-[#444] hover:text-[#e8ddd0] transition-colors">
              Cancel
            </button>
            <button
              onClick={addDecision}
              disabled={saving || !form.decision.trim()}
              className="text-xs px-4 py-1.5 rounded-lg bg-[#b8935a] text-[#080808] font-medium hover:bg-[#c9a46a] disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : 'Log it'}
            </button>
          </div>
        </div>
      )}

      {decisions.length === 0 && !showForm && (
        <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] py-10 text-center">
          <p className="text-sm text-[#333]">No decisions logged yet.</p>
          <p className="text-xs text-[#2a2a2a] mt-1">Track what you decided and why. Learn from it.</p>
        </div>
      )}

      <div className="space-y-2">
        {decisions.map(d => (
          <div key={d.id} className="rounded-lg border border-[#161616] bg-[#0c0c0c] overflow-hidden">
            <button
              className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-[#111] transition-colors"
              onClick={() => setExpanded(expanded === d.id ? null : d.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#e8ddd0] leading-tight">{d.decision}</p>
                <p className="text-xs text-[#444] mt-0.5">
                  {new Date(d.created_at).toLocaleDateString('en-AU')}
                  {d.outcome && <span className="ml-2 text-green-400">· Outcome recorded</span>}
                </p>
              </div>
              <span className="text-[#333] text-xs mt-0.5">{expanded === d.id ? '▲' : '▼'}</span>
            </button>

            {expanded === d.id && (
              <div className="px-4 pb-4 space-y-3 border-t border-[#111]">
                {d.context && (
                  <div>
                    <p className="text-xs text-[#444] mb-1">Context</p>
                    <p className="text-sm text-[#e8ddd0]">{d.context}</p>
                  </div>
                )}
                {d.jarvis_recommendation && (
                  <div>
                    <p className="text-xs text-[#444] mb-1">Jarvis said</p>
                    <p className="text-sm text-[#b8935a]">{d.jarvis_recommendation}</p>
                  </div>
                )}
                {d.owner_decision && (
                  <div>
                    <p className="text-xs text-[#444] mb-1">You decided</p>
                    <p className="text-sm text-[#e8ddd0]">{d.owner_decision}</p>
                  </div>
                )}
                {d.outcome ? (
                  <div>
                    <p className="text-xs text-[#444] mb-1">Outcome</p>
                    <p className="text-sm text-green-400">{d.outcome}</p>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <input
                      placeholder="Record outcome…"
                      className="flex-1 bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-[#e8ddd0] placeholder:text-[#333] focus:outline-none"
                      onKeyDown={async e => {
                        if (e.key === 'Enter') {
                          await recordOutcome(d.id, (e.target as HTMLInputElement).value)
                        }
                      }}
                    />
                    <p className="text-xs text-[#333]">Enter to save</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
