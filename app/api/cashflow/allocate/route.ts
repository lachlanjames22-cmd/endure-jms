import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Profit First default splits
const SPLITS = {
  tax:       0.15,
  profit:    0.10,
  owner_pay: 0.35,
  float:     0.40,
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { cashflow_event_id, amount, custom_splits } = await req.json()
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Amount required' }, { status: 400 })

  const splits = { ...SPLITS, ...custom_splits }
  const total = splits.tax + splits.profit + splits.owner_pay + splits.float
  if (Math.abs(total - 1) > 0.001) {
    return NextResponse.json({ error: 'Splits must sum to 100%' }, { status: 400 })
  }

  const allocation = {
    cashflow_event_id: cashflow_event_id ?? null,
    amount_received:   amount,
    tax_pct:           splits.tax,
    tax_amount:        Number((amount * splits.tax).toFixed(2)),
    profit_pct:        splits.profit,
    profit_amount:     Number((amount * splits.profit).toFixed(2)),
    owner_pay_pct:     splits.owner_pay,
    owner_pay_amount:  Number((amount * splits.owner_pay).toFixed(2)),
    float_pct:         splits.float,
    float_amount:      Number((amount * splits.float).toFixed(2)),
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from('cash_allocations') as any)
    .insert(allocation)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ allocation: data })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') ?? '20')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from('cash_allocations') as any)
    .select('*, cashflow_events(description, scheduled_date)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ allocations: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('cash_allocations') as any)
    .update({ actioned: true, actioned_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
