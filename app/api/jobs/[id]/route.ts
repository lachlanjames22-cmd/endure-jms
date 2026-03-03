import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
