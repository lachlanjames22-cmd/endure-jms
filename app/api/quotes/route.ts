import { NextRequest, NextResponse } from 'next/server'
import { PRICING, TARGETS, daysRequired } from '@/lib/constants'

interface QuoteInput {
  sqm: number
  install_type: 'fullSubframe' | 'overConcrete' | 'redeck'
  use_h4: boolean
  jw_tier: 'red' | 'black' | 'blue'
  product: {
    cost_per_m2: number
    rate_full_subframe: number
    rate_over_concrete: number
    rate_redeck: number
  }
  complexity_stairs?: number
  complexity_handrail_lm?: number
  complexity_curve_hrs?: number
  complexity_other_hrs?: number
}

// Pure calculation — no DB required
export async function POST(req: NextRequest) {
  const body: QuoteInput = await req.json()
  const {
    sqm,
    install_type,
    use_h4,
    jw_tier,
    product,
    complexity_stairs = 0,
    complexity_handrail_lm = 0,
    complexity_curve_hrs = 0,
    complexity_other_hrs = 0,
  } = body

  const isRedeck = install_type === 'redeck'

  // ── Days & hours ────────────────────────────────────────────────────────────
  const days = daysRequired(sqm, isRedeck)
  const base_hours = days * 8

  // Complexity hours (Black tier only)
  const complexity_hours = jw_tier === 'black'
    ? (complexity_stairs * PRICING.complexityStairsHrs)
    + (complexity_handrail_lm * PRICING.complexityHandrailHrs)
    + complexity_curve_hrs
    + complexity_other_hrs
    : 0

  const total_hours = base_hours + complexity_hours

  // ── Labour ──────────────────────────────────────────────────────────────────
  const labour_amount = days * PRICING.labourDayRate

  // Black tier +20%
  const tier_adjustment = jw_tier === 'black' ? labour_amount * PRICING.blackTierMarkup : 0
  const complexity_amount = complexity_hours * PRICING.complexityHourly

  const total_labour_charge = labour_amount + tier_adjustment + complexity_amount

  // ── Materials ───────────────────────────────────────────────────────────────
  const base_material_cost = product.cost_per_m2 * sqm
  const material_with_buffer = base_material_cost * (1 + PRICING.materialMarkup)

  // ── Subframe ────────────────────────────────────────────────────────────────
  const subframe_rate = PRICING.subframeRatePerM2 + (use_h4 ? PRICING.subframeH4Premium : 0)
  const subframe_amount = install_type === 'fullSubframe' ? subframe_rate * sqm : 0

  // ── Product rate (the all-in m² rate from the selected product) ─────────────
  const product_rate = install_type === 'fullSubframe'
    ? product.rate_full_subframe
    : install_type === 'overConcrete'
    ? product.rate_over_concrete
    : product.rate_redeck

  // Labour value = total charge-out rate × sqm (as quoted to client for the whole job)
  // Per spec: labour_value is what we earn after subtracting materials passthrough
  const gross_quote = product_rate * sqm + (use_h4 ? PRICING.subframeH4Premium * sqm : 0)
  const labour_value = gross_quote - material_with_buffer
  const design_admin = PRICING.designAdminFixed

  const subtotal_ex_gst = gross_quote + design_admin + tier_adjustment + complexity_amount
  const gst = subtotal_ex_gst * PRICING.gstRate
  const total_inc_gst = subtotal_ex_gst + gst

  // ── Backcost & GP ───────────────────────────────────────────────────────────
  const labour_backcost = days * PRICING.labourBackcostDay
  const total_backcost = labour_backcost + base_material_cost
  const gp_amount = labour_value - labour_backcost
  const gp_pct = labour_value > 0 ? gp_amount / labour_value : 0
  const revenue_per_hour = total_hours > 0 ? labour_value / total_hours : 0
  const gp_per_hour = total_hours > 0 ? gp_amount / total_hours : 0
  const projected_np_per_hour = gp_per_hour - PRICING.labourDayRate / 8 // rough opex allocation

  // ── Line items ──────────────────────────────────────────────────────────────
  const line_items = [
    { type: 'labour', description: `Labour (${days} day${days !== 1 ? 's' : ''})`, amount: labour_amount, tag: 'labour' },
    { type: 'materials', description: `Materials (${sqm}m² + 10% buffer)`, amount: material_with_buffer, tag: 'materials' },
    ...(subframe_amount > 0 ? [{ type: 'subframe', description: `Subframe${use_h4 ? ' (H4)' : ''} — ${sqm}m²`, amount: subframe_amount, tag: 'labour' }] : []),
    { type: 'design_admin', description: 'Design & Admin', amount: design_admin, tag: 'labour' },
    ...(tier_adjustment > 0 ? [{ type: 'tier_adj', description: 'Black Tier Adjustment (+20%)', amount: tier_adjustment, tag: 'adj' }] : []),
    ...(complexity_amount > 0 ? [{ type: 'complexity', description: `Complexity (${complexity_hours}hrs @ $${PRICING.complexityHourly}/hr)`, amount: complexity_amount, tag: 'adj' }] : []),
  ]

  return NextResponse.json({
    // Quote (client view)
    quote: {
      line_items,
      subtotal_ex_gst: Math.round(subtotal_ex_gst * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      total_inc_gst: Math.round(total_inc_gst * 100) / 100,
    },
    // Backcost (internal view)
    backcost: {
      days,
      total_hours: Math.round(total_hours * 10) / 10,
      labour_value: Math.round(labour_value * 100) / 100,
      gp_amount: Math.round(gp_amount * 100) / 100,
      gp_pct: Math.round(gp_pct * 10000) / 10000,
      gp_per_hour: Math.round(gp_per_hour * 100) / 100,
      revenue_per_hour: Math.round(revenue_per_hour * 100) / 100,
      projected_np_per_hour: Math.round(projected_np_per_hour * 100) / 100,
      labour_backcost: Math.round(labour_backcost * 100) / 100,
      total_backcost: Math.round(total_backcost * 100) / 100,
      // Traffic lights
      gp_status: gp_pct >= TARGETS.gpPct ? 'green' : gp_pct >= TARGETS.gpPctAmber ? 'amber' : 'red',
      rph_status: revenue_per_hour >= TARGETS.revenuePerHour ? 'green' : revenue_per_hour >= TARGETS.revenuePerHourAmber ? 'amber' : 'red',
    },
    // Fields to save to jobs table
    job_fields: {
      quoted_total_value: Math.round(subtotal_ex_gst * 100) / 100,
      quoted_labour_value: Math.round(labour_value * 100) / 100,
      quoted_gp_amount: Math.round(gp_amount * 100) / 100,
      quoted_gp_pct: Math.round(gp_pct * 10000) / 10000,
      quoted_labour_hours: Math.round(total_hours * 10) / 10,
      quoted_days: days,
      complexity_stairs,
      complexity_handrail_lm,
      complexity_curve_hrs,
      complexity_other_hrs,
    },
  })
}
