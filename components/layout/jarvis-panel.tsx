'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useJarvis } from '@/lib/jarvis-context'
import { cn } from '@/lib/utils'
import { Send, Bot, User, Loader2, X, Zap } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  tools_used?: Array<{ name: string; result: string }>
}

const STARTERS = [
  "What's the business health today?",
  'Which jobs are at GP risk?',
  'When does cash get tight?',
  'What should I be worried about?',
]

const TOOL_LABELS: Record<string, string> = {
  update_job_status:     'Updated job status',
  set_job_dates:         'Set job dates',
  mark_payment_received: 'Marked payment received',
  create_cashflow_event: 'Created cashflow event',
  update_setting:        'Updated setting',
  update_crew_sentiment: 'Updated crew sentiment',
}

// Dispatch a custom event so data-showing components can refresh
function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jarvis:refresh'))
  }
}

function formatMessage(content: string) {
  return content
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#e8ddd0]">$1</strong>')
    .replace(/\n/g, '<br />')
}

export function JarvisPanel() {
  const { open, close } = useJarvis()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  // Escape key closes panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const res  = await fetch('/api/agent/message', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)

      setMessages(prev => [...prev, {
        role:       'assistant',
        content:    data.message,
        tools_used: data.tools_used ?? [],
      }])

      // If Jarvis executed any tools, trigger a UI refresh
      if (data.tools_used?.length > 0) notifyDataChanged()

    } catch (err) {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: err instanceof Error ? err.message : 'Something went wrong.',
      }])
    } finally {
      setLoading(false)
    }
  }, [input, loading])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-screen w-full max-w-[440px]',
          'flex flex-col bg-[#080808] border-l border-[#161616]',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#161616] px-5 py-4 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b8935a]/20 border border-[#b8935a]/30">
            <Bot className="h-4 w-4 text-[#b8935a]" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-medium text-[#e8ddd0]">Jarvis</h2>
            <p className="text-xs text-[#444]">Business AI · can read and write</p>
          </div>
          <button
            onClick={close}
            className="text-[#444] hover:text-[#e8ddd0] transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full space-y-5 py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#b8935a]/10 border border-[#b8935a]/20">
                <Bot className="h-7 w-7 text-[#b8935a]" />
              </div>
              <div className="text-center">
                <p className="text-[#e8ddd0] font-['Georgia',serif] text-base">G&apos;day.</p>
                <p className="text-[#444] text-xs mt-1 leading-relaxed">
                  Full context loaded. I can answer questions<br />and make changes directly to the business.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 max-w-sm">
                {STARTERS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-lg border border-[#161616] bg-[#0c0c0c] px-3 py-1.5 text-xs text-[#444] hover:border-[#222] hover:text-[#e8ddd0] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className="space-y-1.5">
              <div className={cn('flex gap-2.5', msg.role === 'user' && 'flex-row-reverse')}>
                {/* Avatar */}
                <div className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5',
                  msg.role === 'assistant'
                    ? 'bg-[#b8935a]/10 border border-[#b8935a]/20'
                    : 'bg-[#111] border border-[#222]'
                )}>
                  {msg.role === 'assistant'
                    ? <Bot className="h-3 w-3 text-[#b8935a]" />
                    : <User className="h-3 w-3 text-[#444]" />
                  }
                </div>

                {/* Bubble */}
                <div className={cn(
                  'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  msg.role === 'assistant'
                    ? 'bg-[#0c0c0c] border border-[#161616] text-[#e8ddd0] rounded-tl-sm'
                    : 'bg-[#111] border border-[#222] text-[#e8ddd0] rounded-tr-sm'
                )}>
                  {msg.role === 'assistant' ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                      className="prose-sm"
                    />
                  ) : msg.content}
                </div>
              </div>

              {/* Tool action chips */}
              {msg.tools_used && msg.tools_used.length > 0 && (
                <div className="ml-8 flex flex-wrap gap-1">
                  {msg.tools_used.map((t, j) => (
                    <div
                      key={j}
                      className="flex items-center gap-1 rounded-full border border-[#b8935a]/20 bg-[#b8935a]/5 px-2 py-0.5 text-xs text-[#b8935a]"
                    >
                      <Zap className="h-2.5 w-2.5" />
                      {TOOL_LABELS[t.name] ?? t.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#b8935a]/10 border border-[#b8935a]/20">
                <Bot className="h-3 w-3 text-[#b8935a]" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-[#0c0c0c] border border-[#161616] px-3.5 py-2.5">
                <Loader2 className="h-3.5 w-3.5 text-[#444] animate-spin" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#161616] px-5 py-4 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKey}
              placeholder="Ask or instruct Jarvis..."
              rows={1}
              className={cn(
                'flex-1 resize-none rounded-xl border border-[#222] bg-[#111] px-3.5 py-2.5',
                'text-sm text-[#e8ddd0] placeholder:text-[#333]',
                'focus:outline-none focus:border-[#b8935a]/50',
              )}
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className={cn(
                'shrink-0 h-[42px] w-[42px] rounded-xl flex items-center justify-center transition-colors',
                'bg-[#b8935a] hover:bg-[#c9a46a] text-[#080808]',
                'disabled:opacity-30 disabled:cursor-not-allowed'
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-[#2a2a2a] mt-1.5 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  )
}
