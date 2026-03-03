'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Send, Bot, User, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

interface Props {
  initialHistory: Message[]
}

const STARTERS = [
  'What\'s the business health today?',
  'Which jobs are at GP risk?',
  'When does cash get tight this month?',
  'What should I be worried about?',
  'Give me a pipeline update.',
]

export function JarvisChat({ initialHistory }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialHistory)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const res = await fetch('/api/agent/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Check your ANTHROPIC_API_KEY in .env.local.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // Format Jarvis response — bold, line breaks
  function formatMessage(content: string) {
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#e8ddd0]">$1</strong>')
      .replace(/\n/g, '<br />')
  }

  return (
    <div className="flex h-screen flex-col bg-[#080808]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#161616] px-6 py-4 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b8935a]/20 border border-[#b8935a]/30">
          <Bot className="h-4 w-4 text-[#b8935a]" />
        </div>
        <div>
          <h1 className="text-sm font-medium text-[#e8ddd0]">Jarvis</h1>
          <p className="text-xs text-[#444]">Business AI · Full context loaded</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#b8935a]/10 border border-[#b8935a]/20">
              <Bot className="h-8 w-8 text-[#b8935a]" />
            </div>
            <div className="text-center">
              <p className="text-[#e8ddd0] font-['Georgia',serif] text-lg">G'day.</p>
              <p className="text-[#444] text-sm mt-1">
                I have full visibility of jobs, cash, crew, and pipeline.<br />What do you need?
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-[#161616] bg-[#0c0c0c] px-3 py-2 text-xs text-[#444] hover:border-[#222] hover:text-[#e8ddd0] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
            {/* Avatar */}
            <div className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
              msg.role === 'assistant'
                ? 'bg-[#b8935a]/10 border border-[#b8935a]/20'
                : 'bg-[#111] border border-[#222]'
            )}>
              {msg.role === 'assistant'
                ? <Bot className="h-3.5 w-3.5 text-[#b8935a]" />
                : <User className="h-3.5 w-3.5 text-[#444]" />
              }
            </div>

            {/* Bubble */}
            <div className={cn(
              'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'assistant'
                ? 'bg-[#0c0c0c] border border-[#161616] text-[#e8ddd0] rounded-tl-sm'
                : 'bg-[#111] border border-[#222] text-[#e8ddd0] rounded-tr-sm'
            )}>
              {msg.role === 'assistant' ? (
                <div
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  className="prose-sm"
                />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#b8935a]/10 border border-[#b8935a]/20">
              <Bot className="h-3.5 w-3.5 text-[#b8935a]" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-[#0c0c0c] border border-[#161616] px-4 py-3">
              <Loader2 className="h-4 w-4 text-[#444] animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#161616] px-6 py-4 shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask Jarvis anything about the business..."
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-xl border border-[#222] bg-[#111] px-4 py-3',
              'text-sm text-[#e8ddd0] placeholder:text-[#333]',
              'focus:outline-none focus:border-[#b8935a]/50',
              'max-h-32 overflow-y-auto'
            )}
            style={{ minHeight: '44px' }}
          />
          <Button
            variant="primary"
            size="md"
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="shrink-0 rounded-xl h-11 w-11 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-[#2a2a2a] mt-2 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
