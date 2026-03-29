# Quote Logic — Endure Decking

## Source of truth
`app/api/quotes/route.ts` — pure calculation, no DB. DO NOT modify this file.
Constants live in `lib/constants.ts` under `PRICING`, `TARGETS`, `COPS`, `PAYROLL`.

## Input fields
```
sqm             — area in square metres
install_type    — 'fullSubframe' | 'overConcrete' | 'redeck'
use_h4          — boolean, adds $20/m² H4 treatment premium to subframe
jw_tier         — 'red' | 'black' | 'blue' (black adds 20% labour + complexity billing)
product         — { cost_per_m2, rate_full_subframe, rate_over_concrete, rate_redeck }
complexity_*    — stairs (flights), handrail_lm, curve_hrs, other_hrs — Black tier only
```

## Days calculation
```
efficiencyRate(sqm, isRedeck) → m²/day lookup table
daysRequired = ceil(sqm / efficiencyRate)

Redeck rates:  ≤5→sqm, ≤15→7, ≤20→8, ≤40→10, >40→13
Full sub rates: ≤5→sqm, ≤15→5.5, ≤20→6, ≤40→7.5, >40→9
```

## Labour calculation
```
labour_amount       = days × $2,400/day (charge-out)
tier_adjustment     = labour_amount × 20% if Black tier
complexity_amount   = complexity_hours × $110/hr
total_labour_charge = labour_amount + tier_adjustment + complexity_amount

complexity_hours = (stairs × 6hrs) + (handrail_lm × 0.5hrs) + curve_hrs + other_hrs
```

## Materials
```
base_material_cost  = product.cost_per_m2 × sqm
material_with_buffer = base_material_cost × 1.10   (10% buffer)
```

## Subframe (fullSubframe only)
```
subframe_rate   = $110/m² + ($20 if H4)
subframe_amount = subframe_rate × sqm   (zero for overConcrete/redeck)
```

## Gross quote & labour value
```
gross_quote   = product_rate × sqm + (H4 premium × sqm if applicable)
  product_rate = product.rate_full_subframe | rate_over_concrete | rate_redeck

labour_value  = gross_quote - material_with_buffer
  ⚠️ GP is always on labour_value, NEVER on gross_quote or total revenue
```

## Totals (client-facing)
```
subtotal_ex_gst = gross_quote + $1,000 design_admin + tier_adjustment + complexity_amount
gst             = subtotal_ex_gst × 10%
total_inc_gst   = subtotal_ex_gst + gst
```

## Backcost & GP (internal only)
```
labour_backcost = days × $1,800/day
total_backcost  = labour_backcost + base_material_cost (no buffer)

gp_amount       = labour_value - labour_backcost
gp_pct          = gp_amount / labour_value

revenue_per_hour = labour_value / total_hours
gp_per_hour      = gp_amount / total_hours
```

## Traffic lights
```
GP%:        ≥45% → green  |  ≥36% → amber  |  <36% → red
Rev/hr:     ≥$100 → green  |  ≥$80 → amber  |  <$80 → red
```

## What saves to jobs table (job_fields)
```
quoted_total_value     = subtotal_ex_gst
quoted_labour_value    = labour_value
quoted_gp_amount       = gp_amount
quoted_gp_pct          = gp_pct (decimal: 0.45 not 45)
quoted_labour_hours    = total_hours
quoted_days            = days
complexity_*           = passed through
```

## When a job is won
4 cashflow events auto-generate in `app/api/jobs/[id]/route.ts`:
```
10% deposit          — due day 0
50% materials claim  — due day 7
20% subframe claim   — due day 21
20% completion claim — due day 35
```
Categories: `deposit`, `materials`, `subframe_claim`, `completion_claim`
