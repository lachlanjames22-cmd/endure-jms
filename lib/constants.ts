// ── Business constants (mirrors settings seed) ────────────────────────────────
// These are used in calculations before settings are loaded from the DB.
// The DB is the source of truth — these are fallback / compile-time references.

export const COPS = {
  monthlyLabour: 25009.86,
  monthlyOpex: 8714.93,
  monthlyTotal: 33724.79,
  dailyTotal: 1873.60,
  dailyLabour: 1389.44,
  dailyOpex: 484.16,
  perHourRaw: 99.66,
  perHour75pct: 132.88,
  billableDaysPerMonth: 18,
  billableDaysPerYear: 210,
  breakevenMonthly: 33724.79,
  revenueTarget45gp: 74944,
}

export const TARGETS = {
  gpPct: 0.45,
  gpPctAmber: 0.36,
  revenuePerHour: 100,
  revenuePerHourAmber: 80,
  npOpexBenchmarkPerHour: 85,
  jobsPerMonth: 6,
  winRate: 0.40,
  monthlyRevenue: 45087.58,
  quotesPerMonth: 15,
  quoteFollowupDays: 10,
  quoteExpiryDays: 30,
  cashWarning: 20000,
  cashCritical: 10000,
  costPerWonJobMax: 2000,
}

export const PRICING = {
  labourDayRate: 2400,         // charge-out per day
  labourBackcostDay: 1800,     // actual cost per day
  designAdminFixed: 1000,
  subframeRatePerM2: 110,
  subframeH4Premium: 20,
  complexityHourly: 110,
  complexityStairsHrs: 6,       // per flight
  complexityHandrailHrs: 0.5,   // per lm
  materialMarkup: 0.10,
  gstRate: 0.10,
  blackTierMarkup: 0.20,
}

export const CLAIM_SCHEDULE = {
  deposit: 0.10,
  materials: 0.50,
  subframe: 0.20,
  completion: 0.20,
}

export const PAYROLL = {
  ownerSalaryAnnual: 98000,
  ownerWeeklyGross: 1884.62,
  ownerWeeklyNet: 1776,
  ownerBillableHrsWk: 10,
  ownerNonbillableHrsWk: 20,
  fixedWeeklyField: 3886.89,   // Baylee + Marius
  totalWeeklyIncOwner: 5771.51,
}

// ── Efficiency formula ────────────────────────────────────────────────────────
// Returns m² per day based on sqm and install type
export function efficiencyRate(sqm: number, isRedeck: boolean): number {
  if (isRedeck) {
    if (sqm <= 5) return sqm
    if (sqm <= 15) return 7
    if (sqm <= 20) return 8
    if (sqm <= 40) return 10
    return 13
  } else {
    if (sqm <= 5) return sqm
    if (sqm <= 15) return 5.5
    if (sqm <= 20) return 6
    if (sqm <= 40) return 7.5
    return 9
  }
}

export function daysRequired(sqm: number, isRedeck: boolean): number {
  return Math.ceil(sqm / efficiencyRate(sqm, isRedeck))
}

// ── Tier descriptions ─────────────────────────────────────────────────────────
export const TIER_LABELS = {
  red: 'JW Red',
  black: 'JW Black',
  blue: 'JW Blue',
}

export const STATUS_LABELS: Record<string, string> = {
  quoted: 'Quoted',
  won: 'Won',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  complete: 'Complete',
  lost: 'Lost',
}
