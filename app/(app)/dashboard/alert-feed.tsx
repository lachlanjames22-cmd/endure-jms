'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { XCircle, AlertTriangle, Info } from 'lucide-react'

interface Alert {
  severity: 'critical' | 'warning' | 'info'
  type: string
  title: string
  body: string
}

export function AlertFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Restore dismissed alerts from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('jarvis_dismissed_alerts')
      if (saved) setDismissed(new Set(JSON.parse(saved)))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetch('/api/agent/context')
      .then(r => r.json())
      .then(d => {
        setAlerts(d.alerts ?? [])
        setLoading(false)
      })
  }, [])

  const visible = alerts.filter(a => !dismissed.has(a.type))

  const Icon = (severity: string) => ({
    critical: <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />,
    warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />,
    info: <Info className="h-3.5 w-3.5 text-[#b8935a] shrink-0" />,
  })[severity] ?? null

  return (
    <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-5 space-y-4 h-fit">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-[#e8ddd0]">Jarvis Alerts</h2>
        {visible.length > 0 && (
          <Badge variant={visible.some(a => a.severity === 'critical') ? 'red' : 'amber'}>
            {visible.length}
          </Badge>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse bg-[#111] rounded" />
          ))}
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-xs text-green-400">All clear</p>
          <p className="text-xs text-[#444] mt-1">No active alerts</p>
        </div>
      )}

      <div className="space-y-2">
        {visible.map((alert) => (
          <div
            key={alert.type}
            className={`rounded-lg border p-3 text-xs space-y-1 ${
              alert.severity === 'critical'
                ? 'border-red-400/20 bg-red-400/5'
                : alert.severity === 'warning'
                ? 'border-amber-400/20 bg-amber-400/5'
                : 'border-[#b8935a]/20 bg-[#b8935a]/5'
            }`}
          >
            <div className="flex items-start gap-2">
              {Icon(alert.severity)}
              <div className="flex-1 min-w-0">
                <p className={`font-medium leading-tight ${
                  alert.severity === 'critical' ? 'text-red-400'
                  : alert.severity === 'warning' ? 'text-amber-400'
                  : 'text-[#b8935a]'
                }`}>
                  {alert.title}
                </p>
                <p className="text-[#444] mt-0.5 leading-relaxed">{alert.body}</p>
              </div>
              <button
                onClick={() => setDismissed(prev => {
                const next = new Set([...prev, alert.type])
                try { localStorage.setItem('jarvis_dismissed_alerts', JSON.stringify([...next])) } catch { /* ignore */ }
                return next
              })}
                className="text-[#2a2a2a] hover:text-[#444] shrink-0"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <a
        href="/jarvis"
        className="inline-flex items-center justify-center w-full h-7 px-2.5 text-xs rounded font-medium transition-colors text-[#444] hover:bg-[#111] hover:text-[#e8ddd0]"
      >
        Ask Jarvis →
      </a>
    </div>
  )
}
