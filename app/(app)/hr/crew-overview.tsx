'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/ui/metric-card'
import { sentimentTrafficLight, formatDate } from '@/lib/utils'
import type { Crew } from '@/lib/types/database'
import { MessageCircle } from 'lucide-react'

interface Props {
  crew: Crew[]
}

export function CrewOverview({ crew }: Props) {
  const active = crew.filter(c => c.active)

  async function triggerCheckin(crewId: string, name: string) {
    if (!confirm(`Trigger check-in for ${name}?`)) return
    // TODO: call Jarvis WhatsApp webhook when Twilio integrated
    alert(`Check-in queued for ${name}. Jarvis will message via WhatsApp once Twilio is configured.`)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {active.map(member => {
        const traffic = member.sentiment_score != null
          ? sentimentTrafficLight(member.sentiment_score)
          : undefined

        return (
          <div key={member.id} className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#e8ddd0]">{member.name}</p>
                <p className="text-xs text-[#444] capitalize">{member.type.replace('_', ' ')}</p>
              </div>
              <Badge variant={
                member.type === 'full_time' ? 'green'
                : member.type === 'casual' ? 'gold'
                : member.type === 'subby' ? 'muted'
                : 'outline'
              }>
                {member.type === 'full_time' ? 'FT' : member.type === 'casual' ? 'CAS' : member.type === 'subby' ? 'SUBBY' : 'EXP'}
              </Badge>
            </div>

            {/* Rates */}
            <div className="flex gap-3 text-xs text-[#444]">
              {member.base_rate && <span>${member.base_rate}/hr base</span>}
              {member.loaded_rate && <span>${member.loaded_rate}/hr loaded</span>}
            </div>

            {/* Sentiment */}
            <MetricCard
              label="Sentiment Score"
              value={member.sentiment_score != null ? `${member.sentiment_score}/10` : 'No data'}
              traffic={traffic}
              sub={member.last_checkin_date ? `Last: ${formatDate(member.last_checkin_date)}` : 'No check-ins yet'}
              size="sm"
            />

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => triggerCheckin(member.id, member.name)}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Trigger Check-in
            </Button>
          </div>
        )
      })}
    </div>
  )
}
