import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET — list all sessions for the user with last message preview
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  const { data: sessions, error } = await admin
    .from('jarvis_sessions')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach last message preview for each session
  const withPreviews = await Promise.all(
    (sessions ?? []).map(async (s) => {
      const { data: last } = await admin
        .from('conversation_history')
        .select('role, content, created_at')
        .eq('session_id', s.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      return {
        ...s,
        last_message: last
          ? { role: last.role, preview: last.content.slice(0, 80), created_at: last.created_at }
          : null,
      }
    })
  )

  return NextResponse.json(withPreviews)
}

// POST — create a new session
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const title = body.title?.trim() || 'New conversation'

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('jarvis_sessions')
    .insert({ user_id: user.id, title })
    .select('id, title, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
