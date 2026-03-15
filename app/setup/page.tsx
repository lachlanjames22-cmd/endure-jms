import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SetupWizard } from '@/components/setup/SetupWizard'

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <SetupWizard userId={user.id} />
}
