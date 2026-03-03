import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QuoteCalculator } from './quote-calculator'
import { Pipeline } from './pipeline'
import { HeroMetrics } from '@/components/layout/hero-metrics'

export default async function SalesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .is('deleted_at', null)
    .order('category')
    .order('name')

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, products(name)')
    .in('status', ['quoted', 'won', 'lost'])
    .is('deleted_at', null)
    .order('quote_sent_date', { ascending: false })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-['Georgia',serif] text-[#e8ddd0]">Sales</h1>
        <p className="text-sm text-[#444] mt-1">Quote calculator and pipeline</p>
      </div>

      <HeroMetrics />

      <div className="grid gap-6 xl:grid-cols-2">
        <QuoteCalculator products={products ?? []} />
        <Pipeline jobs={jobs ?? []} />
      </div>
    </div>
  )
}
