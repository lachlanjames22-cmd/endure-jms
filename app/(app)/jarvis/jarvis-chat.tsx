'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Send, Bot, User, Loader2, Plus, MessageSquare, Brain, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

interface Session {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface Memory {
  id: string
  type: string
  content: string
  context?: string | null
  created_at: string
}

interface Props {
  initialHistory: Message[]
  sessions: Session[]
  activeSessionId: string | null
  memories: Memory[]
}

const STARTERS = [
  'What\'s the business health today?',
  'Which jobs are at GP risk?',
  'When does cash get tight this month?',
  'What should I be worried about?',
  'Give me a pipeline update.',
]

const MEMORY_TYPE_LABELS: Record<string, string> = {
  instruction: 'Instruction',
  decision: 'Decision',
  preference: 'Preference',
  context: 'Note',
}

export function JarvisChat({ initialHistory, sessions: initialSessions, activeSessionId: initialSessionId, memories: initialMemories }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialHistory)
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId)
  const [memories, setMemories] = useState<Memory[]>(initialMemories)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [briefLoading, setBriefLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false)
  const [newMemoryContent, setNewMemoryContent] = useState('')
  const [savingMemory, setSavingMemory] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const briefFired = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fire morning brief only on a completely empty new session
  useEffect(() => {
    if (briefFired.current) return
    if (initialHistory.length > 0) return
    if (initialSessionId) return  // existing session — don't auto-brief
    briefFired.current = true
    setBriefLoading(true)
    fetch('/api/agent/brief', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.brief) {
          setMessages([{ role: 'assistant', content: data.brief }])
        }
      })
      .catch(() => {})
      .finally(() => setBriefLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function newChat() {
    setMessages([])
    setActiveSessionId(null)
    briefFired.current = false
    router.push('/jarvis')
  }

  async function loadSession(sessionId: string) {
    if (sessionId === activeSessionId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/agent/sessions/${sessionId}`)
      const data = await res.json()
      setMessages(data.messages ?? [])
      setActiveSessionId(sessionId)
      router.push(`/jarvis?session=${sessionId}`, { scroll: false })
    } catch {
      // non-fatal
    } finally {
      setLoading(false)
    }
  }

  async function deleteSession(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/agent/sessions/${sessionId}`, { method: 'DELETE' })
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (activeSessionId === sessionId) {
      newChat()
    }
  }

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const res = await fetch('/api/agent/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, session_id: activeSessionId }),
      })

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])

      // Update active session and session list
      if (data.session_id) {
        setActiveSessionId(data.session_id)
        // Refresh session list
        fetch('/api/agent/sessions')
          .then(r => r.json())
          .then(updated => setSessions(updated))
          .catch(() => {})
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Check your ANTHROPIC_API_KEY in .env.local.',
      }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, activeSessionId])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  async function saveMemory() {
    if (!newMemoryContent.trim()) return
    setSavingMemory(true)
    try {
      const res = await fetch('/api/agent/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'context', content: newMemoryContent.trim() }),
      })
      const data = await res.json()
      setMemories(prev => [data, ...prev])
      setNewMemoryContent('')
    } catch {
      // non-fatal
    } finally {
      setSavingMemory(false)
    }
  }

  async function deleteMemory(id: string) {
    await fetch(`/api/agent/memory?id=${id}`, { method: 'DELETE' })
    setMemories(prev => prev.filter(m => m.id !== id))
  }

  function formatMessage(content: string) {
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#e8ddd0]">$1</strong>')
      .replace(/\n/g, '<br />')
  }

  const activeSession = sessions.find(s => s.id === activeSessionId)

  return (
    <div className="flex h-screen bg-[#080808] overflow-hidden">
      {/* Sessions sidebar */}
      <div className={cn(
        'flex flex-col border-r border-[#161616] bg-[#080808] transition-all duration-200 shrink-0',
        sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'
      )}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-[#161616]">
          <span className="text-xs font-medium text-[#444] uppercase tracking-wider">Conversations</span>
          <button
            onClick={newChat}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-[#222] bg-[#0c0c0c] hover:border-[#b8935a]/40 hover:text-[#b8935a] text-[#444] transition-colors"
            title="New conversation"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto py-2">
          {sessions.length === 0 && (
            <p className="px-3 py-4 text-xs text-[#333] text-center">No conversations yet</p>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => loadSession(s.id)}
              className={cn(
                'group flex items-start gap-2 px-3 py-2 cursor-pointer rounded-md mx-1 transition-colors',
                s.id === activeSessionId
                  ? 'bg-[#111] border border-[#1e1e1e]'
                  : 'hover:bg-[#0c0c0c]'
              )}
            >
              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-[#333]" />
              <span className="flex-1 text-xs text-[#666] group-hover:text-[#e8ddd0] leading-snug line-clamp-2 transition-colors min-w-0">
                {s.title}
              </span>
              <button
                onClick={(e) => deleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 shrink-0 text-[#333] hover:text-[#f87171] transition-all"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Memory button */}
        <div className="border-t border-[#161616] p-3">
          <button
            onClick={() => setMemoryPanelOpen(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#444] hover:bg-[#0c0c0c] hover:text-[#b8935a] transition-colors"
          >
            <Brain className="h-3.5 w-3.5" />
            <span>Memory</span>
            {memories.length > 0 && (
              <span className="ml-auto text-[#333] text-[10px]">{memories.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#161616] px-4 py-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="text-[#333] hover:text-[#444] transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b8935a]/20 border border-[#b8935a]/30">
            <Bot className="h-4 w-4 text-[#b8935a]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-medium text-[#e8ddd0]">Jarvis</h1>
            <p className="text-xs text-[#444] truncate">
              {briefLoading
                ? 'Uploading the brain...'
                : activeSession
                  ? activeSession.title
                  : 'Business AI · Full context loaded'}
            </p>
          </div>
          <button
            onClick={newChat}
            className="flex items-center gap-1.5 rounded-lg border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-1.5 text-xs text-[#444] hover:border-[#222] hover:text-[#e8ddd0] transition-colors"
          >
            <Plus className="h-3 w-3" />
            New
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#b8935a]/10 border border-[#b8935a]/20">
                {briefLoading
                  ? <Loader2 className="h-8 w-8 text-[#b8935a] animate-spin" />
                  : <Bot className="h-8 w-8 text-[#b8935a]" />
                }
              </div>
              <div className="text-center">
                {briefLoading ? (
                  <>
                    <p className="text-[#e8ddd0] font-['Georgia',serif] text-lg">Loading the brain...</p>
                    <p className="text-[#444] text-sm mt-1">Jarvis is reading your business context</p>
                  </>
                ) : (
                  <>
                    <p className="text-[#e8ddd0] font-['Georgia',serif] text-lg">G&apos;day.</p>
                    <p className="text-[#444] text-sm mt-1">
                      I have full visibility of jobs, cash, crew, pipeline, and job DNA.<br />What do you need?
                    </p>
                  </>
                )}
              </div>
              {!briefLoading && (
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
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
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
              placeholder="Ask Jarvis anything... or say 'remember this' to save a note"
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
            Enter to send · Shift+Enter for new line · Say "remember this" to save a note
          </p>
        </div>
      </div>

      {/* Memory panel overlay */}
      {memoryPanelOpen && (
        <div className="absolute inset-0 z-50 flex items-start justify-end pointer-events-none">
          <div className="pointer-events-auto w-80 h-full bg-[#0a0a0a] border-l border-[#161616] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#161616]">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-[#b8935a]" />
                <span className="text-sm font-medium text-[#e8ddd0]">Jarvis Memory</span>
              </div>
              <button onClick={() => setMemoryPanelOpen(false)} className="text-[#444] hover:text-[#e8ddd0] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Add new memory */}
            <div className="px-4 py-3 border-b border-[#161616]">
              <textarea
                value={newMemoryContent}
                onChange={e => setNewMemoryContent(e.target.value)}
                placeholder="Add a note Jarvis should always remember..."
                rows={2}
                className="w-full resize-none rounded-lg border border-[#222] bg-[#111] px-3 py-2 text-xs text-[#e8ddd0] placeholder:text-[#333] focus:outline-none focus:border-[#b8935a]/50"
              />
              <button
                onClick={saveMemory}
                disabled={!newMemoryContent.trim() || savingMemory}
                className="mt-2 w-full rounded-lg border border-[#222] bg-[#111] py-1.5 text-xs text-[#444] hover:border-[#b8935a]/40 hover:text-[#b8935a] disabled:opacity-40 transition-colors"
              >
                {savingMemory ? 'Saving...' : 'Save note'}
              </button>
            </div>

            {/* Memory list */}
            <div className="flex-1 overflow-y-auto py-2">
              {memories.length === 0 && (
                <p className="px-4 py-6 text-xs text-[#333] text-center">No memories yet.<br />Chat with Jarvis and say "remember this".</p>
              )}
              {memories.map(m => (
                <div key={m.id} className="group mx-3 mb-2 rounded-lg border border-[#161616] bg-[#0c0c0c] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn(
                      'text-[10px] font-medium uppercase tracking-wider rounded px-1 py-0.5',
                      m.type === 'instruction' ? 'text-[#b8935a] bg-[#b8935a]/10' :
                      m.type === 'decision' ? 'text-[#60a5fa] bg-[#60a5fa]/10' :
                      m.type === 'preference' ? 'text-[#4ade80] bg-[#4ade80]/10' :
                      'text-[#7a7570] bg-[#111]'
                    )}>
                      {MEMORY_TYPE_LABELS[m.type] ?? m.type}
                    </span>
                    <button
                      onClick={() => deleteMemory(m.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#333] hover:text-[#f87171] transition-all shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-[#666] leading-relaxed">{m.content}</p>
                  {m.context && (
                    <p className="mt-1 text-[10px] text-[#333] italic">{m.context}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
