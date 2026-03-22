import { createAdminClient } from '@/lib/supabase/admin'
import { TARGETS } from '@/lib/constants'

/**
 * Auto-calculate DNA efficiency + margin from a job's actual data.
 * Subjective fields (complexity, repeatability, client) stay untouched.
 */
export async function recalcJobDNA(jobId: string): Promise<void> {
  const admin = createAdminClient()

  // Fetch the job with its actuals
  const { data: job } = await admin
    .from('jobs')
    .select('*, timesheets(hours), material_actuals(actual_amount)')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single()

  if (!job) return

  const updates: Record<string, number | null> = {}

  // ── Efficiency score ─────────────────────────────────────────────────────
  // Based on actual vs quoted hours. >10% over = dips below 7.
  const totalActualHours = (job.timesheets as { hours: number }[])
    ?.reduce((s: number, t: { hours: number }) => s + (t.hours ?? 0), 0) ?? 0
  const quotedHours = job.quoted_labour_hours ?? 0

  if (quotedHours > 0 && totalActualHours > 0) {
    const ratio = quotedHours / totalActualHours  // >1 = under hours (good)
    // Scale: ratio 1.2+ → 10, ratio 1.0 → 7, ratio 0.7 → 3, ratio 0.5 → 1
    const raw = ratio >= 1.2 ? 10
      : ratio >= 1.0 ? Math.round(7 + (ratio - 1.0) / 0.2 * 3)
      : ratio >= 0.7 ? Math.round(3 + (ratio - 0.7) / 0.3 * 4)
      : 1
    updates.dna_efficiency = Math.max(1, Math.min(10, raw))
  }

  // ── Margin score ─────────────────────────────────────────────────────────
  // Based on actual GP% vs target GP%
  const gpPct = job.actual_gp_pct ?? job.quoted_gp_pct ?? null
  const target = TARGETS.gpPct  // e.g. 0.45

  if (gpPct !== null) {
    const ratio = gpPct / target  // 1.0 = on target, >1 = above
    // Scale: ratio >=1.2 → 10, ratio 1.0 → 7, ratio 0.6 → 3, ratio <0.4 → 1
    const raw = ratio >= 1.2 ? 10
      : ratio >= 1.0 ? Math.round(7 + (ratio - 1.0) / 0.2 * 3)
      : ratio >= 0.6 ? Math.round(3 + (ratio - 0.6) / 0.4 * 4)
      : 1
    updates.dna_margin = Math.max(1, Math.min(10, raw))
  }

  if (Object.keys(updates).length === 0) return

  await admin
    .from('jobs')
    .update(updates)
    .eq('id', jobId)
}
