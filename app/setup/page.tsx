import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SetupWizard } from '@/components/setup/SetupWizard'

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'setup_complete')
    .single()

  if (setting?.value) redirect('/dashboard')

  return <SetupWizard userId={user.id} />
}
