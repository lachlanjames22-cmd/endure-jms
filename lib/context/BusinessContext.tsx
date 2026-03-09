'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Business constants shape ────────────────────────────────────────────────
// Mirrors the settings keys seeded in 006_endure_os_seed.sql
export interface BusinessSettings {
  // Salary & fixed costs
  owner_salary_weekly: number
  owner_salary_monthly: number
  opex_monthly: number
  total_fixed_monthly: number
  daily_fixed_burden: number
  full_cost_pool_monthly: number
  break_even_hourly: number
  target_hourly: number

  // GP / NP targets
  gp_target_pct: number  // stored as 45 = 45%
  np_target_pct: number

  // Cash thresholds
  cash_warn: number
  cash_crit: number
  credit_limit: number
  credit_drawn: number

  // Liability accrual
  liability_daily: number

  // Profit First splits (stored as whole numbers: 25 = 25%)
  pf_tax_pct: number
  pf_profit_pct: number
  pf_reserve_pct: number
  pf_transact_pct: number

  // BAS
  bas_q3_due: string
  bas_q3_amount: number

  // Payroll
  payroll_fortnightly_amount: number

  // Legacy COPS constants (from 003_seed.sql)
  cops_monthly_total?: number
  cops_daily_total?: number
  cops_per_billable_hour_75pct?: number
  cops_billable_days_per_month?: number
  cops_revenue_target_45gp?: number
  target_gp_pct?: number          // legacy key (0.45 fraction form)
  cash_warning_threshold?: number  // legacy key
  cash_critical_threshold?: number // legacy key
  credit_facility_limit?: number
  credit_facility_drawn?: number
}

// Profit First account balances
export interface PFAccounts {
  transactions: number
  tax: number
  reserve: number
  profit: number
}

interface BusinessContextValue {
  settings: BusinessSettings | null
  pfAccounts: PFAccounts | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

// ─── Defaults (compile-time fallbacks, DB is source of truth) ────────────────
const DEFAULTS: BusinessSettings = {
  owner_salary_weekly:    1884.62,
  owner_salary_monthly:   8167.00,
  opex_monthly:           8714.93,
  total_fixed_monthly:    16882.00,
  daily_fixed_burden:     982.00,
  full_cost_pool_monthly: 31508.00,
  break_even_hourly:      114.00,
  target_hourly:          100.00,
  gp_target_pct:          45,
  np_target_pct:          20,
  cash_warn:              20000,
  cash_crit:              10000,
  credit_limit:           65000,
  credit_drawn:           5000,
  liability_daily:        660.00,
  pf_tax_pct:             25,
  pf_profit_pct:          10,
  pf_reserve_pct:         10,
  pf_transact_pct:        55,
  bas_q3_due:             '2026-04-28',
  bas_q3_amount:          15151.00,
  payroll_fortnightly_amount: 3886.89,
}

const PF_DEFAULTS: PFAccounts = {
  transactions: 24300,
  tax:          11200,
  reserve:      12000,
  profit:        4600,
}

// ─── Context ──────────────────────────────────────────────────────────────────
const BusinessContext = createContext<BusinessContextValue>({
  settings:   null,
  pfAccounts: null,
  loading:    true,
  error:      null,
  refresh:    async () => {},
})

// ─── Provider ─────────────────────────────────────────────────────────────────
export function BusinessProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings]     = useState<BusinessSettings | null>(null)
  const [pfAccounts, setPFAccounts] = useState<PFAccounts | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Fetch all settings rows in one query
      const { data: rows, error: settingsErr } = await supabase
        .from('settings')
        .select('key, value')

      if (settingsErr) throw settingsErr

      // Build a flat object from key→value rows
      const raw: Record<string, unknown> = {}
      for (const row of rows ?? []) {
        raw[row.key] = row.value
      }

      // Map to BusinessSettings, coercing JSON values to numbers/strings
      const parsed: BusinessSettings = { ...DEFAULTS }
      const numericKeys: Array<keyof BusinessSettings> = [
        'owner_salary_weekly', 'owner_salary_monthly', 'opex_monthly',
        'total_fixed_monthly', 'daily_fixed_burden', 'full_cost_pool_monthly',
        'break_even_hourly', 'target_hourly', 'gp_target_pct', 'np_target_pct',
        'cash_warn', 'cash_crit', 'credit_limit', 'credit_drawn',
        'liability_daily', 'pf_tax_pct', 'pf_profit_pct', 'pf_reserve_pct',
        'pf_transact_pct', 'bas_q3_amount', 'payroll_fortnightly_amount',
        'cops_monthly_total', 'cops_daily_total', 'cops_per_billable_hour_75pct',
        'cops_billable_days_per_month', 'cops_revenue_target_45gp',
        'target_gp_pct', 'cash_warning_threshold', 'cash_critical_threshold',
        'credit_facility_limit', 'credit_facility_drawn',
      ]

      for (const key of numericKeys) {
        if (raw[key] !== undefined) {
          const v = raw[key]
          parsed[key] = (typeof v === 'number' ? v : Number(v)) as never
        }
      }

      // String keys
      if (raw['bas_q3_due']) {
        parsed.bas_q3_due = String(raw['bas_q3_due']).replace(/"/g, '')
      }

      setSettings(parsed)

      // Fetch Profit First accounts
      const { data: pfRows, error: pfErr } = await supabase
        .from('pf_accounts')
        .select('name, balance')

      if (pfErr) throw pfErr

      const pf: PFAccounts = { ...PF_DEFAULTS }
      for (const row of pfRows ?? []) {
        if (row.name in pf) {
          pf[row.name as keyof PFAccounts] = Number(row.balance)
        }
      }
      setPFAccounts(pf)

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load business settings'
      console.error('[BusinessContext]', msg)
      setError(msg)
      // Fall back to defaults so the app remains functional
      setSettings(DEFAULTS)
      setPFAccounts(PF_DEFAULTS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <BusinessContext.Provider value={{ settings, pfAccounts, loading, error, refresh: load }}>
      {children}
    </BusinessContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useBusinessContext(): BusinessContextValue {
  return useContext(BusinessContext)
}

// ─── Convenience: typed settings with fallback to defaults ───────────────────
export function useSettings(): BusinessSettings {
  const { settings } = useBusinessContext()
  return settings ?? DEFAULTS
}

export function usePFAccounts(): PFAccounts {
  const { pfAccounts } = useBusinessContext()
  return pfAccounts ?? PF_DEFAULTS
}
