'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Win {
  id: string
  title: string
  description: string | null
  category: string
  win_date: string
  source: string
}

const CATEGORIES = ['financial', 'operational', 'team', 'personal', 'client']

const CAT_COLORS: Record<string, string> = {
  financial:   'text-green-400 bg-green-400/10 border-green-400/20',
  operational: 'text-[#b8935a] bg-[#b8935a]/10 border-[#b8935a]/20',
  team:        'text-blue-400 bg-blue-400/10 border-blue-400/20',
  personal:    'text-purple-400 bg-purple-400/10 border-purple-400/20',
  client:      'text-amber-400 bg-amber-400/10 border-amber-400/20',
}

export function WinsBoard({ initial }: { initial: Win[] }) {
  const [wins, setWins] = useState<Win[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'financial', win_date: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)

  async function addWin() {
    if (!form.title.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('wins_board')
      // @ts-ignore
      .insert({ ...form, source: 'owner' })
      .select()
      .single()
    if (data) setWins(prev => [data, ...prev])
    setForm({ title: '', description: '', category: 'financial', win_date: new Date().toISOString().slice(0, 10) })
    setShowForm(false)
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-['Georgia',serif] text-[#e8ddd0]">Wins Board</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border border-[#222] text-[#b8935a] hover:bg-[#b8935a]/10 transition-colors"
        >
          + Log a win
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-4 space-y-3">
          <input
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="What did we win?"
            className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e8ddd0] placeholder:text-[#333] focus:outline-none focus:border-[#b8935a]/50"
          />
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Details (optional)…"
            rows={2}
            className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e8ddd0] placeholder:text-[#333] focus:outline-none focus:border-[#b8935a]/50 resize-none"
          />
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setForm(p => ({ ...p, category: cat }))}
                className={`text-xs px-2 py-1 rounded border transition-colors capitalize ${
                  form.category === cat
                    ? CAT_COLORS[cat]
                    : 'border-[#222] text-[#444] hover:border-[#333]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={form.win_date}
              onChange={e => setForm(p => ({ ...p, win_date: e.target.value }))}
              className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-[#e8ddd0] focus:outline-none"
            />
            <button
              onClick={addWin}
              disabled={saving || !form.title.trim()}
              className="ml-auto text-xs px-4 py-1.5 rounded-lg bg-[#b8935a] text-[#080808] font-medium hover:bg-[#c9a46a] disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : 'Log it'}
            </button>
          </div>
        </div>
      )}

      {wins.length === 0 && !showForm && (
        <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] py-10 text-center">
          <p className="text-sm text-[#333]">No wins logged yet.</p>
          <p className="text-xs text-[#2a2a2a] mt-1">Start celebrating what you've built.</p>
        </div>
      )}

      <div className="space-y-2">
        {wins.map(win => (
          <div key={win.id} className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-4 flex gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <p className="text-sm font-medium text-[#e8ddd0]">{win.title}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded border capitalize ${CAT_COLORS[win.category] ?? 'text-[#444] border-[#222]'}`}>
                  {win.category}
                </span>
              </div>
              {win.description && <p className="text-xs text-[#444] mt-1">{win.description}</p>}
            </div>
            <p className="text-xs text-[#333] shrink-0">
              {new Date(win.win_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
