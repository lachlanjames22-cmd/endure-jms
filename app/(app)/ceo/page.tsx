import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VisionSection } from './vision-section'
import { WinsBoard } from './wins-board'
import { DecisionJournal } from './decision-journal'

export default async function CeoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') redirect('/dashboard')

  const [visionRes, winsRes, decisionsRes] = await Promise.all([
    supabase.from('ceo_vision').select('*').order('category'),
    supabase.from('wins_board').select('*').order('win_date', { ascending: false }).limit(20),
    supabase.from('decision_journal').select('*').order('created_at', { ascending: false }).limit(20),
  ])

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-['Georgia',serif] text-[#e8ddd0]">CEO</h1>
        <p className="text-sm text-[#444] mt-1">Vision · Wins · Decisions</p>
      </div>

      <VisionSection initial={visionRes.data ?? []} />
      <WinsBoard initial={winsRes.data ?? []} />
      <DecisionJournal initial={decisionsRes.data ?? []} />
    </div>
  )
}
