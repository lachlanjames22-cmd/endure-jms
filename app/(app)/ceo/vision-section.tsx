'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface VisionItem {
  id: string
  category: string
  content: string
}

const CATEGORIES = [
  { key: 'why',             label: 'Why Endure exists' },
  { key: 'mission',         label: 'Mission' },
  { key: 'values',          label: 'Non-negotiables' },
  { key: 'goals',           label: '3-year vision' },
  { key: 'scenarios',       label: 'Growth scenarios' },
  { key: 'nonnegotiables',  label: 'What we never compromise' },
]

export function VisionSection({ initial }: { initial: VisionItem[] }) {
  const [items, setItems] = useState<VisionItem[]>(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(cat: string) {
    const existing = items.find(i => i.category === cat)
    setDraft(existing?.content ?? '')
    setEditing(cat)
  }

  async function save(cat: string) {
    if (!draft.trim()) return
    setSaving(true)
    const supabase = createClient()
    const existing = items.find(i => i.category === cat)

    if (existing) {
      // @ts-ignore
      await supabase.from('ceo_vision').update({ content: draft, updated_at: new Date().toISOString() }).eq('id', existing.id)
      setItems(prev => prev.map(i => i.id === existing.id ? { ...i, content: draft } : i))
    } else {
      // @ts-ignore
      const { data } = await supabase.from('ceo_vision').insert({ category: cat, content: draft }).select().single()
      if (data) setItems(prev => [...prev, data])
    }

    setEditing(null)
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-['Georgia',serif] text-[#e8ddd0]">Foundation</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORIES.map(({ key, label }) => {
          const item = items.find(i => i.category === key)
          const isEditing = editing === key

          return (
            <div key={key} className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-[#444] uppercase tracking-wider">{label}</p>
                {!isEditing && (
                  <button
                    onClick={() => startEdit(key)}
                    className="text-xs text-[#333] hover:text-[#b8935a] transition-colors"
                  >
                    {item ? 'Edit' : '+ Add'}
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    rows={4}
                    autoFocus
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e8ddd0] placeholder:text-[#333] focus:outline-none focus:border-[#b8935a]/50 resize-none"
                    placeholder={`Write your ${label.toLowerCase()}…`}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => save(key)}
                      disabled={saving}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#b8935a] text-[#080808] font-medium hover:bg-[#c9a46a] transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[#222] text-[#444] hover:text-[#e8ddd0] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${item ? 'text-[#e8ddd0]' : 'text-[#2a2a2a] italic'}`}>
                  {item?.content ?? 'Not set yet.'}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
