import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HeroMetrics } from '@/components/layout/hero-metrics'
import { AlertFeed } from './alert-feed'
import { BusinessScorecard } from './business-scorecard'
import { PipelineSummary } from './pipeline-summary'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-['Georgia',serif] text-[#e8ddd0]">
          {profile?.full_name ? `G'day, ${profile.full_name.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="text-sm text-[#444] mt-1">
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Hero metrics — always visible */}
      <HeroMetrics />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <BusinessScorecard />
          <PipelineSummary />
        </div>
        <AlertFeed />
      </div>
    </div>
  )
}
