import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('job_id')

  let query = supabase.from('material_actuals').select('*').order('created_at')
  if (jobId) query = query.eq('job_id', jobId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('material_actuals')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-create cashflow outflow event for this material purchase
  if (body.actual_amount && body.purchase_date) {
    await supabase.from('cashflow_events').insert({
      job_id: body.job_id,
      type: 'outflow',
      category: 'materials',
      label: `Materials — ${body.description} (${body.supplier})`,
      amount: body.actual_amount,
      scheduled_date: body.purchase_date,
      paid_date: body.purchase_date,
      auto_generated: true,
    })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id, ...body } = await req.json()
  const { data, error } = await supabase
    .from('material_actuals')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
