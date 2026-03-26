import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PFAccountName } from '@/lib/types/database'

const VALID_ACCOUNTS: PFAccountName[] = ['transactions', 'tax', 'reserve', 'profit']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('pf_accounts').select('name, balance')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const accounts = Object.fromEntries((data ?? []).map(a => [a.name, a.balance]))
  return NextResponse.json(accounts)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json() as { name: string; balance: number }
  const accountName = body.name as PFAccountName

  if (!VALID_ACCOUNTS.includes(accountName)) {
    return NextResponse.json({ error: `Invalid account name. Valid: ${VALID_ACCOUNTS.join(', ')}` }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: existing } = await admin.from('pf_accounts').select('name').eq('name', accountName).maybeSingle()
  if (existing) {
    const { error } = await admin.from('pf_accounts').update({ balance: body.balance }).eq('name', accountName)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await admin.from('pf_accounts').insert({ name: accountName, balance: body.balance })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ name: accountName, balance: body.balance })
}
