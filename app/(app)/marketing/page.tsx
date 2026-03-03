import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HeroMetrics } from '@/components/layout/hero-metrics'

export default async function MarketingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adPerf } = await supabase
    .from('ad_performance')
    .select('*')
    .order('date', { ascending: false })
    .limit(60)

  const googleData = adPerf?.filter(d => d.platform === 'google') ?? []
  const metaData = adPerf?.filter(d => d.platform === 'meta') ?? []

  const totalSpend = adPerf?.reduce((s, d) => s + (d.spend ?? 0), 0) ?? 0
  const totalLeads = adPerf?.reduce((s, d) => s + (d.leads_generated ?? 0), 0) ?? 0
  const costPerLead = totalLeads > 0 ? totalSpend / totalLeads : null

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-['Georgia',serif] text-[#e8ddd0]">Marketing</h1>
        <p className="text-sm text-[#444] mt-1">Ad performance and lead analytics</p>
      </div>

      <HeroMetrics />

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-4">
          <p className="text-xs text-[#444] uppercase tracking-wider mb-1">Total Spend (30d)</p>
          <p className="text-2xl font-mono font-semibold text-[#e8ddd0]">
            ${totalSpend.toLocaleString('en-AU', { minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-4">
          <p className="text-xs text-[#444] uppercase tracking-wider mb-1">Total Leads</p>
          <p className="text-2xl font-mono font-semibold text-[#e8ddd0]">{totalLeads}</p>
        </div>
        <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-4">
          <p className="text-xs text-[#444] uppercase tracking-wider mb-1">Cost per Lead</p>
          <p className="text-2xl font-mono font-semibold text-[#e8ddd0]">
            {costPerLead != null ? `$${Math.round(costPerLead)}` : '—'}
          </p>
        </div>
      </div>

      {adPerf?.length === 0 && (
        <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-12 text-center">
          <p className="text-sm text-[#444]">No ad data yet.</p>
          <p className="text-xs text-[#2a2a2a] mt-1">
            Connect Google Ads and Meta via Settings once API keys are configured.
          </p>
        </div>
      )}
    </div>
  )
}
