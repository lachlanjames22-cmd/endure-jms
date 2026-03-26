import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CashflowType, CashflowCategory } from '@/lib/types/database'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      products (*),
      timesheets (*, crew (*)),
      material_actuals (*),
      cashflow_events (*),
      quote_line_items (*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const oldStatus = body._oldStatus
  delete body._oldStatus

  // Set won_date when transitioning to won
  if (body.status === 'won' && oldStatus !== 'won' && !body.won_date) {
    body.won_date = new Date().toISOString().split('T')[0]
  }

  // Set lost_date when transitioning to lost
  if (body.status === 'lost' && !body.lost_date) {
    body.lost_date = new Date().toISOString().split('T')[0]
  }

  const { data, error } = await supabase
    .from('jobs')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If marking complete, trigger snapshot via admin client (SECURITY DEFINER fn)
  if (body.status === 'complete' && oldStatus !== 'complete') {
    const admin = createAdminClient()
    await admin.rpc('complete_job_snapshot', { p_job_id: id })
  }

  // If transitioning to won, auto-generate 4 cashflow claim events (if not already created)
  const jobValue = data.quoted_total_value ?? 0
  if (body.status === 'won' && oldStatus !== 'won' && jobValue > 0) {
    const { count } = await supabase
      .from('cashflow_events')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', id)
      .eq('category', 'deposit' as CashflowCategory)

    if ((count ?? 0) === 0) {
      const today = new Date()
      const label = data.client_name ?? 'Job'
      const claims: Array<{ pct: number; name: string; category: CashflowCategory; days: number }> = [
        { pct: 0.10, name: '10% Deposit',   category: 'deposit',         days: 0  },
        { pct: 0.50, name: '50% Materials', category: 'materials',       days: 7  },
        { pct: 0.20, name: '20% Subframe',  category: 'subframe_claim',  days: 21 },
        { pct: 0.20, name: 'Final',         category: 'completion_claim', days: 35 },
      ]
      const events = claims.map(c => {
        const d = new Date(today)
        d.setDate(d.getDate() + c.days)
        return {
          job_id: id,
          type: 'inflow' as CashflowType,
          category: c.category,
          label: `${label} — ${c.name}`,
          amount: Math.round(jobValue * c.pct),
          scheduled_date: d.toISOString().split('T')[0],
        }
      })
      await supabase.from('cashflow_events').insert(events)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Soft delete
  const { error } = await supabase
    .from('jobs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
