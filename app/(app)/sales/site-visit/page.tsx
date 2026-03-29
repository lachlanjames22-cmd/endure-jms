import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SiteVisitTool } from './site-visit-tool'

export default async function SiteVisitPage() {
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

  return <SiteVisitTool products={products ?? []} />
}
