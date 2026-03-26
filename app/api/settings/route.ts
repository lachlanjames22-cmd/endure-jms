import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/types/database'

// Keys that Jarvis (and the settings UI) are allowed to update via API
const ALLOWED_KEYS = [
  'opening_balance',
  'owner_phone',
  'billable_days_month',
  'target_gp_pct',
] as const

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('settings').select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(Object.fromEntries((data ?? []).map(s => [s.key, s.value])))
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json() as Record<string, unknown>
  const admin = createAdminClient()
  const updated: Record<string, unknown> = {}

  for (const key of ALLOWED_KEYS) {
    if (!(key in body)) continue
    const value = body[key] as Json

    // Check if the row exists first
    const { data: existing } = await admin
      .from('settings')
      .select('key')
      .eq('key', key)
      .maybeSingle()

    if (existing) {
      // Row exists — update it
      const { error } = await admin
        .from('settings')
        .update({ value })
        .eq('key', key)
      if (error) return NextResponse.json({ error: `Failed to update ${key}: ${error.message}` }, { status: 500 })
    } else {
      // Row doesn't exist — insert it
      const { error } = await admin
        .from('settings')
        .insert({ key, value })
      if (error) return NextResponse.json({ error: `Failed to create ${key}: ${error.message}` }, { status: 500 })
    }

    updated[key] = value
  }

  if (Object.keys(updated).length === 0) {
    return NextResponse.json({ error: `No valid keys. Allowed: ${ALLOWED_KEYS.join(', ')}` }, { status: 400 })
  }

  return NextResponse.json({ updated })
}
