import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { JobStatus, JWTier } from '@/lib/types/database'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const suburb = searchParams.get('suburb')
  const tier = searchParams.get('tier')

  let query = supabase
    .from('jobs')
    .select(`
      *,
      products (id, name, category, durability_score)
    `)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (status) query = query.eq('status', status as JobStatus)
  if (suburb) query = query.ilike('suburb', `%${suburb}%`)
  if (tier) query = query.eq('jw_tier', tier as JWTier)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()

  // Set quote_sent_date to today if creating a quote
  if (!body.quote_sent_date && body.status === 'quoted') {
    body.quote_sent_date = new Date().toISOString().split('T')[0]
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
