import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// One-time seed endpoint. Upserts all reference data — safe to re-run.
// Hit POST /api/seed to populate the database.

export async function POST() {
  const admin = createAdminClient()
  const errors: string[] = []

  // ── 1. Settings ─────────────────────────────────────────────────────────────
  const settings = [
    { key: 'opening_balance',        value: '34200' },
    { key: 'cash_warn',              value: '20000' },
    { key: 'cash_critical',          value: '10000' },
    { key: 'credit_facility_limit',  value: '65000' },
    { key: 'credit_facility_drawn',  value: '5000' },
    { key: 'labour_chargeout_day',   value: '2400' },
    { key: 'labour_backcost_day',    value: '1800' },
    { key: 'gp_target',             value: '45' },
    { key: 'gp_warn',               value: '36' },
    { key: 'revenue_per_hr_target',  value: '100' },
    { key: 'revenue_per_hr_warn',    value: '80' },
    { key: 'quote_followup_days',    value: '10' },
    { key: 'owner_pay_day',          value: 'tuesday' },
    { key: 'target_gp_pct',         value: '0.45' },
  ]

  for (const s of settings) {
    const { error } = await admin
      .from('settings')
      .upsert(s, { onConflict: 'key' })
    if (error) errors.push(`settings.${s.key}: ${error.message}`)
  }

  // ── 2. Crew ──────────────────────────────────────────────────────────────────
  const crew = [
    { name: 'Baylee Taylor', type: 'full_time' as const, pay_cycle: 'fortnightly' as const, base_rate: 45, loaded_rate: 55,    active: true,  employment_type: 'fulltime' as const },
    { name: 'Marius Hauser', type: 'full_time' as const, pay_cycle: 'fortnightly' as const, base_rate: 38, loaded_rate: 43.77, active: true,  employment_type: 'fulltime' as const },
    { name: 'Ash',           type: 'casual'    as const, pay_cycle: 'weekly'      as const, base_rate: 38, loaded_rate: 45.60, active: false, employment_type: 'casual'   as const },
    { name: 'Lachy',         type: 'casual'    as const, pay_cycle: 'weekly'      as const, base_rate: 60, loaded_rate: 72,    active: false, employment_type: 'casual'   as const },
    { name: 'Labourer',      type: 'subby'     as const, pay_cycle: 'invoice'     as const, base_rate: 35, loaded_rate: 35,    active: false, employment_type: 'abn'      as const },
  ]

  for (const c of crew) {
    // Upsert on name — check if exists first
    const { data: existing } = await admin.from('crew').select('id').eq('name', c.name).maybeSingle()
    if (existing) {
      const { error } = await admin.from('crew').update(c).eq('id', existing.id)
      if (error) errors.push(`crew.${c.name}: ${error.message}`)
    } else {
      const { error } = await admin.from('crew').insert(c)
      if (error) errors.push(`crew.${c.name}: ${error.message}`)
    }
  }

  // ── 3. Products ──────────────────────────────────────────────────────────────
  // Rates: rate_full_subframe = cost_per_m2 + subframe ($110/m²) + labour + margin
  // These are client charge-out rates (what appears in the quote total / m²)
  // Using realistic all-in rates per m² for each install type
  const products = [
    // Timber
    { name: 'Merbau',         category: 'timber'    as const, cost_per_m2: 85,  rate_full_subframe: 350, rate_over_concrete: 240, rate_redeck: 220, durability_score: 8 },
    { name: 'Spotted Gum',    category: 'timber'    as const, cost_per_m2: 95,  rate_full_subframe: 370, rate_over_concrete: 255, rate_redeck: 235, durability_score: 9 },
    { name: 'Blackbutt',      category: 'timber'    as const, cost_per_m2: 90,  rate_full_subframe: 360, rate_over_concrete: 248, rate_redeck: 228, durability_score: 8 },
    { name: 'Treated Pine',   category: 'timber'    as const, cost_per_m2: 45,  rate_full_subframe: 280, rate_over_concrete: 185, rate_redeck: 165, durability_score: 5 },
    { name: 'Grey Ironbark',  category: 'timber'    as const, cost_per_m2: 110, rate_full_subframe: 410, rate_over_concrete: 290, rate_redeck: 268, durability_score: 10 },
    // Composite
    { name: 'Trex Enhance',           category: 'composite' as const, cost_per_m2: 155, rate_full_subframe: 470, rate_over_concrete: 340, rate_redeck: 318, durability_score: 10 },
    { name: 'Trex Select',            category: 'composite' as const, cost_per_m2: 130, rate_full_subframe: 430, rate_over_concrete: 308, rate_redeck: 288, durability_score: 9 },
    { name: 'Millboard Enhanced',     category: 'composite' as const, cost_per_m2: 195, rate_full_subframe: 540, rate_over_concrete: 398, rate_redeck: 375, durability_score: 10 },
    { name: 'Modwood',                category: 'composite' as const, cost_per_m2: 120, rate_full_subframe: 418, rate_over_concrete: 296, rate_redeck: 275, durability_score: 8 },
    { name: 'Ekodeck',                category: 'composite' as const, cost_per_m2: 115, rate_full_subframe: 410, rate_over_concrete: 288, rate_redeck: 268, durability_score: 8 },
    { name: 'Futurewood',             category: 'composite' as const, cost_per_m2: 125, rate_full_subframe: 425, rate_over_concrete: 302, rate_redeck: 282, durability_score: 9 },
    { name: 'Kebony',                 category: 'composite' as const, cost_per_m2: 175, rate_full_subframe: 510, rate_over_concrete: 370, rate_redeck: 348, durability_score: 10 },
    { name: 'Decking Co. Pro',        category: 'composite' as const, cost_per_m2: 140, rate_full_subframe: 448, rate_over_concrete: 320, rate_redeck: 298, durability_score: 9 },
  ]

  for (const p of products) {
    const { data: existing } = await admin.from('products').select('id').eq('name', p.name).maybeSingle()
    if (existing) {
      const { error } = await admin.from('products').update({ ...p, active: true }).eq('id', existing.id)
      if (error) errors.push(`products.${p.name}: ${error.message}`)
    } else {
      const { error } = await admin.from('products').insert({ ...p, active: true })
      if (error) errors.push(`products.${p.name}: ${error.message}`)
    }
  }

  // ── 4. Jobs ──────────────────────────────────────────────────────────────────
  // Fetch product IDs for jobs
  const { data: productRows } = await admin.from('products').select('id, name')
  const pid = (name: string) => productRows?.find(p => p.name === name)?.id ?? null

  const jobs = [
    {
      name: 'Henderson — Applecross',
      client_name: 'Henderson',
      suburb: 'Applecross',
      install_type: 'fullSubframe' as const,
      sqm: 48,
      product_id: pid('Merbau'),
      jw_tier: 'red' as const,
      quoted_total_value: 38400,
      quoted_labour_value: 21120,
      quoted_gp_pct: 0.45,
      status: 'won' as const,
      quote_sent_date: '2026-03-10',
      notes: 'Standard merbau. Good access.',
    },
    {
      name: 'Nguyen — Cottesloe',
      client_name: 'Nguyen',
      suburb: 'Cottesloe',
      install_type: 'redeck' as const,
      sqm: 32,
      product_id: pid('Trex Enhance'),
      jw_tier: 'blue' as const,
      quoted_total_value: 29600,
      quoted_labour_value: 15680,
      quoted_gp_pct: 0.43,
      status: 'in_progress' as const,
      quote_sent_date: '2026-03-05',
      notes: 'Composite redeck. Side gate access.',
    },
    {
      name: 'Carmody — Nedlands',
      client_name: 'Carmody',
      suburb: 'Nedlands',
      install_type: 'fullSubframe' as const,
      sqm: 28,
      product_id: pid('Spotted Gum'),
      jw_tier: 'black' as const,
      quoted_total_value: 34800,
      quoted_labour_value: 18096,
      quoted_gp_pct: 0.47,
      status: 'quoted' as const,
      quote_sent_date: '2026-03-20',
      notes: 'JW Black. Elevated with steel posts.',
    },
  ]

  const insertedJobIds: Record<string, string> = {}

  for (const j of jobs) {
    // Skip if already exists (match on client_name + suburb)
    const { data: existing } = await admin
      .from('jobs')
      .select('id')
      .eq('client_name', j.client_name)
      .eq('suburb', j.suburb)
      .maybeSingle()

    if (existing) {
      insertedJobIds[j.client_name] = existing.id
      continue
    }

    const { data: inserted, error } = await admin
      .from('jobs')
      .insert(j)
      .select('id')
      .single()

    if (error) errors.push(`jobs.${j.client_name}: ${error.message}`)
    else if (inserted) insertedJobIds[j.client_name] = inserted.id
  }

  // ── 5. Cashflow events ───────────────────────────────────────────────────────
  const today = new Date('2026-04-04')
  const date = (daysOffset: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + daysOffset)
    return d.toISOString().split('T')[0]
  }

  const hendersonId = insertedJobIds['Henderson']
  const nguyenId    = insertedJobIds['Nguyen']

  const cashflowEvents = [
    // Henderson (won — 10/50/20/20)
    ...(hendersonId ? [
      { job_id: hendersonId, type: 'inflow' as const, category: 'deposit'          as const, label: 'Henderson — 10% Deposit',   amount: 3840,  scheduled_date: '2026-03-10', paid_date: '2026-03-12', auto_generated: true },
      { job_id: hendersonId, type: 'inflow' as const, category: 'materials'        as const, label: 'Henderson — 50% Materials', amount: 19200, scheduled_date: '2026-04-07', paid_date: null,         auto_generated: true },
      { job_id: hendersonId, type: 'inflow' as const, category: 'subframe_claim'   as const, label: 'Henderson — 20% Subframe',  amount: 7680,  scheduled_date: '2026-04-11', paid_date: null,         auto_generated: true },
      { job_id: hendersonId, type: 'inflow' as const, category: 'completion_claim' as const, label: 'Henderson — Final 20%',     amount: 7680,  scheduled_date: '2026-04-14', paid_date: null,         auto_generated: true },
    ] : []),
    // Nguyen (in_progress)
    ...(nguyenId ? [
      { job_id: nguyenId, type: 'inflow' as const, category: 'deposit'          as const, label: 'Nguyen — 10% Deposit',   amount: 2960,  scheduled_date: '2026-03-05', paid_date: '2026-03-06', auto_generated: true },
      { job_id: nguyenId, type: 'inflow' as const, category: 'materials'        as const, label: 'Nguyen — 50% Materials', amount: 14800, scheduled_date: '2026-03-24', paid_date: '2026-03-24', auto_generated: true },
      { job_id: nguyenId, type: 'inflow' as const, category: 'subframe_claim'   as const, label: 'Nguyen — 20% Subframe',  amount: 5920,  scheduled_date: date(0),       paid_date: null,         auto_generated: true },
      { job_id: nguyenId, type: 'inflow' as const, category: 'completion_claim' as const, label: 'Nguyen — Final 20%',     amount: 5920,  scheduled_date: date(3),       paid_date: null,         auto_generated: true },
    ] : []),
    // Standing outflows
    { job_id: null, type: 'outflow' as const, category: 'payroll' as const, label: 'Crew payroll — Baylee + Marius', amount: 3887, scheduled_date: date(3),  paid_date: null, auto_generated: false },
    { job_id: null, type: 'outflow' as const, category: 'opex'    as const, label: 'Monthly fixed costs',            amount: 8715, scheduled_date: date(0),  paid_date: null, auto_generated: false },
  ]

  for (const ev of cashflowEvents) {
    // Skip if a matching event already exists (same job_id + category + amount)
    if (ev.job_id) {
      const { data: existing } = await admin
        .from('cashflow_events')
        .select('id')
        .eq('job_id', ev.job_id)
        .eq('category', ev.category)
        .maybeSingle()
      if (existing) continue
    }

    const { error } = await admin.from('cashflow_events').insert(ev)
    if (error) errors.push(`cashflow.${ev.label}: ${error.message}`)
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 207 })
  }

  return NextResponse.json({
    ok: true,
    seeded: {
      settings: settings.length,
      crew: crew.length,
      products: products.length,
      jobs: Object.keys(insertedJobIds).length,
      cashflow_events: cashflowEvents.length,
    },
  })
}
