import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JobKanban } from './job-kanban'
import { HeroMetrics } from '@/components/layout/hero-metrics'

export default async function OpsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch initial data server-side
  const [jobsRes, crewRes, productsRes] = await Promise.all([
    supabase.from('jobs').select('*, products(id, name, category)').is('deleted_at', null).order('updated_at', { ascending: false }),
    supabase.from('crew').select('*').eq('active', true),
    supabase.from('products').select('*').eq('active', true).is('deleted_at', null),
  ])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-['Georgia',serif] text-[#e8ddd0]">Ops</h1>
        <p className="text-sm text-[#444] mt-1">Job board, timesheets, scheduling</p>
      </div>

      <HeroMetrics />

      <JobKanban
        initialJobs={jobsRes.data ?? []}
        crew={crewRes.data ?? []}
      />
    </div>
  )
}
