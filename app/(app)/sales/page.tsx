import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QuoteCalculator } from './quote-calculator'
import { Pipeline } from './pipeline'
import { HeroMetrics } from '@/components/layout/hero-metrics'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-['Georgia',serif] text-[#e8ddd0]">Sales</h1>
          <p className="text-sm text-[#444] mt-1">Quote calculator and pipeline</p>
        </div>
        <Link
          href="/sales/site-visit"
          className="flex items-center gap-2 rounded-lg border border-[#b8935a]/30 bg-[#b8935a]/10 px-4 py-2.5 text-sm font-medium text-[#b8935a] hover:bg-[#b8935a]/20 transition-colors"
        >
          <ClipboardList className="h-4 w-4" />
          Site Visit
        </Link>
      </div>

      <HeroMetrics />

      <div className="grid gap-6 xl:grid-cols-2">
        <QuoteCalculator products={products ?? []} />
        <Pipeline jobs={jobs ?? []} />
      </div>
    </div>
  )
}
