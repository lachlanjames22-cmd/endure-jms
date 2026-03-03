import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JarvisChat } from './jarvis-chat'

export default async function JarvisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load recent history
  const { data: history } = await supabase
    .from('conversation_history')
    .select('role, content, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(50)

  return <JarvisChat initialHistory={history ?? []} />
}
