import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { JarvisChat } from './jarvis-chat'

export default async function JarvisPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { session: sessionId } = await searchParams
  const admin = createAdminClient()

  // Load sessions list
  const { data: sessions } = await admin
    .from('jarvis_sessions')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  // Load messages for active session (or latest session if none specified)
  let activeSessionId = sessionId ?? (sessions?.[0]?.id ?? null)
  let history: { role: 'user' | 'assistant'; content: string; created_at?: string }[] = []

  if (activeSessionId) {
    const { data: msgs } = await admin
      .from('conversation_history')
      .select('role, content, created_at')
      .eq('session_id', activeSessionId)
      .order('created_at', { ascending: true })
      .limit(100)
    history = (msgs ?? []) as typeof history
  }

  // Load memories
  const { data: memories } = await admin
    .from('agent_memory')
    .select('id, type, content, context, created_at')
    .eq('active', true)
    .order('created_at', { ascending: false })

  return (
    <JarvisChat
      initialHistory={history}
      sessions={sessions ?? []}
      activeSessionId={activeSessionId}
      memories={memories ?? []}
    />
  )
}
