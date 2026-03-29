# Job DNA — Endure Decking

## Purpose
Every completed job gets a DNA score — a 5-dimension profile used to identify which job types
to target, which to avoid, and what operational patterns drive margin.

## The 5 Dimensions (all scored 1–10)
```
margin        — auto-calculated from actual_gp_pct vs target (45%)
efficiency    — auto-calculated from actual hours vs quoted hours
complexity    — subjective: how hard was this job to deliver?
repeatability — subjective: would we want to do this exact job again?
client        — subjective: how was the client to work with?
```

## Scoring formulas (lib/dna.ts → recalcJobDNA)

### Efficiency score
```
ratio = quoted_labour_hours / actual_labour_hours

ratio ≥ 1.2  → 10   (finished 20%+ under hours — excellent)
ratio = 1.0  → 7    (on target)
ratio = 0.7  → 3    (over by 30%)
ratio ≤ 0.5  → 1    (over by 50%+ — serious problem)
```

### Margin score
```
ratio = actual_gp_pct / 0.45 (target GP)

ratio ≥ 1.2  → 10
ratio = 1.0  → 7    (hit target GP)
ratio = 0.6  → 3
ratio < 0.4  → 1
```

## DB fields (jobs table)
```
actual_labour_hours   — total hours worked (from timesheets or JobCosting)
actual_labour_value   — hours × loaded rate
actual_gp_amount      — gross_quote - materials - labour
actual_gp_pct         — gp_amount / gross_quote  (DECIMAL: 0.45 not 45)
actual_days           — calendar days on site
dna_margin            — auto score 1–10
dna_efficiency        — auto score 1–10
dna_complexity        — user score 1–10
dna_repeatability     — user score 1–10
dna_client            — user score 1–10
dna_reviewed_at       — timestamp set when DNA PATCH is submitted
```

## Flow: close job → DNA
1. JobCosting: user fills actuals (labour hours, material costs)
2. closeJob() in `components/modules/JobCosting.tsx`:
   - PATCH 1: set `status: 'complete'`
   - PATCH 2: save actuals to jobs table
   - PATCH 3: POST to `/api/jobs/[id]/dna` with subjective scores
3. DNA PATCH handler (`app/api/jobs/[id]/dna/route.ts`):
   - Calls `recalcJobDNA(id)` — calculates margin + efficiency scores from actuals
   - Saves complexity, repeatability, client scores
   - Sets `dna_reviewed_at` to now
4. JobDNA component fetches `GET /api/jobs?status=complete` — shows ALL complete jobs
   (no `dna_reviewed_at` filter — all complete jobs appear)

## Common issues
- Job doesn't appear in DNA: check `status = 'complete'` and actuals are saved
- Efficiency score is 5 (default): `actual_labour_hours` is null — actuals not saved
- Margin score is 5 (default): `actual_gp_pct` is null — actuals not saved
- `actual_gp_pct` must be decimal (0.45), not integer (45) — easy to get wrong

## Using DNA for strategy
High margin + high efficiency = core product, actively pursue
High margin + low efficiency = good money, site-specific — watch access/complexity
Low margin + high efficiency = volume play — acceptable if pipeline thin
Low margin + low efficiency = avoid, diagnose cause before repricing
