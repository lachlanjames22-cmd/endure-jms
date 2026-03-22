import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recalcJobDNA } from '@/lib/dna'

type Params = { params: Promise<{ id: string }> }

// GET — return current DNA scores + trigger auto-recalc from actuals
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Recalculate auto fields first
  await recalcJobDNA(id)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('jobs')
    .select('id, name, dna_margin, dna_efficiency, dna_complexity, dna_repeatability, dna_client, dna_reviewed_at')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH — save subjective DNA scores (complexity, repeatability, client)
// Auto fields (efficiency, margin) are recalculated fresh before saving
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()

  // First, recalculate auto fields
  await recalcJobDNA(id)

  // Then save subjective scores + mark reviewed
  const admin = createAdminClient()
  const patch: Record<string, number | string> = {
    dna_reviewed_at: new Date().toISOString(),
  }

  if (typeof body.complexity === 'number')    patch.dna_complexity    = Math.max(1, Math.min(10, body.complexity))
  if (typeof body.repeatability === 'number') patch.dna_repeatability = Math.max(1, Math.min(10, body.repeatability))
  if (typeof body.client === 'number')        patch.dna_client        = Math.max(1, Math.min(10, body.client))

  const { data, error } = await admin
    .from('jobs')
    .update(patch)
    .eq('id', id)
    .select('id, name, dna_margin, dna_efficiency, dna_complexity, dna_repeatability, dna_client, dna_reviewed_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
