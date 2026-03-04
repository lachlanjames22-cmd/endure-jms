import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ComplianceClient } from './compliance-client'

export default async function CompliancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') redirect('/dashboard')

  const { data: items } = await supabase
    .from('compliance_items')
    .select('*')
    .order('renewal_date', { ascending: true })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-['Georgia',serif] text-[#e8ddd0]">Compliance</h1>
        <p className="text-sm text-[#444] mt-1">Renewals, licences, registrations — never let one expire</p>
      </div>
      <ComplianceClient initial={items ?? []} />
    </div>
  )
}
