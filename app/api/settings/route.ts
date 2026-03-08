import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/types/database'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('settings').select('*').order('key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Only owners can write settings
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden — owner only' }, { status: 403 })
  }

  const body = await req.json()
  const { key, value } = body as { key: string; value: Json }

  if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 })
  if (value === undefined) return NextResponse.json({ error: 'value is required' }, { status: 400 })

  // Use admin client so the update bypasses RLS session quirks
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('settings')
    .update({ value })
    .eq('key', key)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
