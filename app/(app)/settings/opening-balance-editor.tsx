'use client'

import { useState } from 'react'
import { Check, Pencil, X, Loader2 } from 'lucide-react'

interface Props {
  initialValue: number
}

export function OpeningBalanceEditor({ initialValue }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(initialValue))
  const [saved, setSaved] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const num = parseFloat(value.replace(/[^0-9.-]/g, ''))
    if (isNaN(num)) {
      setError('Enter a valid number')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'opening_balance', value: num }),
      })

      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Save failed')
        return
      }

      setSaved(num)
      setEditing(false)
    } catch {
      setError('Network error — try again')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setValue(String(saved))
    setEditing(false)
    setError(null)
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  return (
    <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-5">
      <h2 className="text-sm font-medium text-[#e8ddd0] mb-1">Opening Cash Balance</h2>
      <p className="text-xs text-[#444] mb-4">
        Starting balance used as the base for all cashflow projections. Set this to the current
        bank balance before any recorded cashflow events.
      </p>

      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <div className="flex items-center gap-1">
              <span className="text-[#444] text-sm font-mono">$</span>
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKey}
                autoFocus
                className="w-40 rounded-lg border border-[#b8935a]/50 bg-[#111] px-3 py-2 text-sm font-mono text-[#e8ddd0] focus:outline-none focus:border-[#b8935a]"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-400 hover:bg-green-500/20 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Save
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-[#222] bg-[#111] px-3 py-2 text-xs text-[#444] hover:text-[#e8ddd0] transition-colors"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-2xl font-mono font-semibold text-[#e8ddd0]">
              ${saved.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </span>
            <button
              onClick={() => { setValue(String(saved)); setEditing(true) }}
              className="flex items-center gap-1.5 rounded-lg border border-[#222] bg-[#111] px-3 py-2 text-xs text-[#444] hover:text-[#e8ddd0] hover:border-[#333] transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
