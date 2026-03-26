import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabase
    .from('crew')
    .select('id, name, type, base_rate, loaded_rate, active')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const crew = (data ?? []).map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    baseRate: c.base_rate ?? 0,
    loadedRate: c.loaded_rate ?? 0,
    hoursPerWeek: c.type === 'full_time' ? 42 : 0,
    active: c.active,
  }))

  return NextResponse.json(crew)
}
