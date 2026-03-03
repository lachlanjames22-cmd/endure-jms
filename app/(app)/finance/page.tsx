import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CashflowChart } from './cashflow-chart'
import { GpDashboard } from './gp-dashboard'
import { HeroMetrics } from '@/components/layout/hero-metrics'

export default async function FinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['owner', 'finance'].includes(profile.role)) redirect('/dashboard')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-['Georgia',serif] text-[#e8ddd0]">Finance</h1>
        <p className="text-sm text-[#444] mt-1">Cashflow, GP, and financial position</p>
      </div>

      <HeroMetrics />

      <div className="grid gap-6 xl:grid-cols-2">
        <CashflowChart />
        <GpDashboard />
      </div>
    </div>
  )
}
