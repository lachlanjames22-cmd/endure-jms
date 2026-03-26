import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CashflowType, CashflowCategory } from '@/lib/types/database'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { job_id, gross_quote, client_name } = await req.json() as {
    job_id: string
    gross_quote: number
    client_name?: string
  }

  if (!job_id || !gross_quote) {
    return NextResponse.json({ error: 'job_id and gross_quote are required' }, { status: 400 })
  }

  const today = new Date()
  const label = client_name ?? 'Job'
  const claims: Array<{ pct: number; name: string; category: CashflowCategory; daysOffset: number }> = [
    { pct: 0.10, name: '10% Deposit',   category: 'deposit',          daysOffset: 0  },
    { pct: 0.50, name: '50% Materials', category: 'materials',        daysOffset: 7  },
    { pct: 0.20, name: '20% Subframe',  category: 'subframe_claim',   daysOffset: 21 },
    { pct: 0.20, name: 'Final',         category: 'completion_claim', daysOffset: 35 },
  ]

  const events = claims.map(c => {
    const d = new Date(today)
    d.setDate(d.getDate() + c.daysOffset)
    return {
      job_id,
      type: 'inflow' as CashflowType,
      category: c.category,
      label: `${label} — ${c.name}`,
      amount: Math.round(gross_quote * c.pct),
      scheduled_date: d.toISOString().split('T')[0],
    }
  })

  const { data, error } = await supabase
    .from('cashflow_events')
    .insert(events)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ created: data }, { status: 201 })
}
