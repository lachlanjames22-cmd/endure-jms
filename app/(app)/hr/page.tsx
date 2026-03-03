import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HeroMetrics } from '@/components/layout/hero-metrics'
import { CrewOverview } from './crew-overview'

export default async function HRPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: crew } = await supabase.from('crew').select('*').order('name')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-['Georgia',serif] text-[#e8ddd0]">Team</h1>
        <p className="text-sm text-[#444] mt-1">Crew check-ins and sentiment</p>
      </div>
      <HeroMetrics />
      <CrewOverview crew={crew ?? []} />
    </div>
  )
}
