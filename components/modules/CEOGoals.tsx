'use client'

import { useState } from "react";
// ─── DESIGN SYSTEM ────────────────────────────────────────────────────────────
const C = {
  bg:        "#0e0e14",
  surface:   "#16161f",
  surface2:  "#1e1e2a",
  border:    "#252535",
  border2:   "#2e2e42",
  gold:      "#c9a06a",
  goldBright:"#e8c285",
  text:      "#f0ebe3",
  textMid:   "#9090a0",
  textDim:   "#505060",
  green:     "#34d399",
  amber:     "#fbbf24",
  red:       "#f87171",
  blue:      "#60a5fa",
  purple:    "#a78bfa",
};
// ─── LIVE METRICS (replace with useBusinessContext() in Claude Code) ──────────
const M = {
  profitAccount:            4600,
  cashTransactions:         24300,
  gpHrAvg3Jobs:             41,
  consecutiveDaysAbove20k:  12,
  crewSentimentAvg:         7.2,
  baylee_effort_avg:        8.2,
  revenueThisMonth:         45027,
  avgMonthlyRevenue:        45027,
  avgGPpct:                 0.45,
  consecutiveJobsClean:     2,
  weeksOffTools:            0,
};
// ─── FINANCE MODELS ───────────────────────────────────────────────────────────
interface FinanceModel {
  purchasePrice: number; deposit?: number; loanTermYears: number; interestRate: number;
  existingCostMo?: number; businessUsePct?: number; taxRate?: number;
  fuelDeltaMo?: number; insuranceMo?: number; regoMo?: number; isOneTime: boolean;
  softROI: Array<{ label: string; note: string }>;
  replacedCosts: string[]; perPerson?: boolean;
}
const FINANCE: Record<string, FinanceModel> = {
  silverado: {
    purchasePrice: 112000, deposit: 0,
    loanTermYears: 5, interestRate: 0.075,
    existingCostMo: 400, businessUsePct: 0.80, taxRate: 0.275,
    fuelDeltaMo: 150, insuranceMo: 180, regoMo: 30,
    isOneTime: false,
    softROI: [
      { label: "Client perception",     note: "A $110k ute signals operator, not tradie. Closes premium clients differently." },
      { label: "Black label alignment", note: "Vehicle, finish, pricing — visual consistency of the JW Black brand." },
      { label: "Owner motivation",      note: "A business owner who feels rewarded performs. That's real ROI." },
    ],
    replacedCosts: ["Current ute rego, insurance, fuel, maintenance — ~$400/mo"],
  },
  holiday: {
    purchasePrice: 8000, loanTermYears: 0, interestRate: 0,
    existingCostMo: 0, businessUsePct: 0, taxRate: 0,
    fuelDeltaMo: 0, insuranceMo: 0, regoMo: 0, isOneTime: true,
    softROI: [
      { label: "Owner wellbeing",  note: "Burnt out owners make bad decisions. A break is a business investment." },
      { label: "Proof of concept", note: "Business running while you're gone is the first real test of the OS." },
      { label: "Family",           note: "You're building this for more than the business." },
    ],
    replacedCosts: [],
  },
  tools_upgrade: {
    purchasePrice: 3500, loanTermYears: 0, interestRate: 0,
    existingCostMo: 0, businessUsePct: 1.0, taxRate: 0.275,
    fuelDeltaMo: 0, insuranceMo: 0, regoMo: 0, isOneTime: true,
    softROI: [
      { label: "Job quality", note: "Better tools = cleaner finish = better DNA scores = repeat clients." },
      { label: "Crew morale", note: "Good gear signals you take the craft seriously." },
    ],
    replacedCosts: ["Replaces worn tooling — deferred maintenance cost"],
  },
  beers: {
    purchasePrice: 300, loanTermYears: 0, interestRate: 0,
    existingCostMo: 0, businessUsePct: 1.0, taxRate: 0.275,
    fuelDeltaMo: 0, insuranceMo: 0, regoMo: 0, isOneTime: true,
    softROI: [
      { label: "Retention", note: "Small cost, high signal. They remember it." },
      { label: "Culture",   note: "A business that celebrates together performs together." },
    ],
    replacedCosts: [],
  },
  site_lunch: {
    purchasePrice: 200, loanTermYears: 0, interestRate: 0,
    existingCostMo: 0, businessUsePct: 1.0, taxRate: 0.275,
    fuelDeltaMo: 0, insuranceMo: 0, regoMo: 0, isOneTime: true,
    softROI: [
      { label: "Immediate reward", note: "Tied directly to job performance. Clean feedback loop." },
    ],
    replacedCosts: [],
  },
  crew_bonus: {
    purchasePrice: 2000, loanTermYears: 0, interestRate: 0,
    existingCostMo: 0, businessUsePct: 1.0, taxRate: 0.275,
    fuelDeltaMo: 0, insuranceMo: 0, regoMo: 0, isOneTime: true, perPerson: true,
    softROI: [
      { label: "Retention",   note: "$4k total is less than one month of recruiting + onboarding a replacement." },
      { label: "Performance", note: "Tied to clean execution — reinforces the right behaviours." },
    ],
    replacedCosts: [],
  },
};
interface CalcResult {
  repaymentMo: number; runningCostsMo: number; grossNewCostMo: number; existingCostMo: number;
  netNewCostMo: number; deductibleAmt: number; taxSavingMo: number; realNetCostMo: number;
  totalInterest: number; hoursToBreakEven: number; jobsToBreakEven: string;
  isOneTime: boolean; purchasePrice: number; businessUsePct: number; taxRate: number;
  softROI: Array<{ label: string; note: string }>; replacedCosts: string[]; perPerson: boolean;
}
function calcFinance(f: FinanceModel): CalcResult {
  let repaymentMo = 0;
  if (!f.isOneTime && f.loanTermYears > 0 && f.interestRate > 0) {
    const principal = f.purchasePrice - (f.deposit || 0);
    const r = f.interestRate / 12, n = f.loanTermYears * 12;
    repaymentMo = principal * (r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1);
  }
  const runningCostsMo = (f.fuelDeltaMo||0) + (f.insuranceMo||0) + (f.regoMo||0);
  const grossNewCostMo = repaymentMo + runningCostsMo;
  const netNewCostMo   = grossNewCostMo - (f.existingCostMo||0);
  const deductibleAmt  = grossNewCostMo * (f.businessUsePct||0);
  const taxSavingMo    = deductibleAmt * (f.taxRate||0);
  const realNetCostMo  = netNewCostMo - taxSavingMo;
  const totalInterest  = !f.isOneTime && f.loanTermYears > 0
    ? (repaymentMo * f.loanTermYears * 12) - (f.purchasePrice-(f.deposit||0)) : 0;
  const gpHr             = M.gpHrAvg3Jobs;
  const hoursToBreakEven = realNetCostMo > 0 ? Math.round(realNetCostMo / gpHr) : 0;
  const jobGP            = (M.avgMonthlyRevenue * M.avgGPpct) / 2.2;
  const jobsToBreakEven  = realNetCostMo > 0 ? (realNetCostMo / jobGP).toFixed(1) : "0";
  return {
    repaymentMo: Math.round(repaymentMo), runningCostsMo: Math.round(runningCostsMo),
    grossNewCostMo: Math.round(grossNewCostMo), existingCostMo: Math.round(f.existingCostMo||0),
    netNewCostMo: Math.round(netNewCostMo), deductibleAmt: Math.round(deductibleAmt),
    taxSavingMo: Math.round(taxSavingMo), realNetCostMo: Math.round(realNetCostMo),
    totalInterest: Math.round(totalInterest), hoursToBreakEven, jobsToBreakEven,
    isOneTime: f.isOneTime, purchasePrice: f.purchasePrice,
    businessUsePct: f.businessUsePct||0, taxRate: f.taxRate||0,
    softROI: f.softROI||[], replacedCosts: f.replacedCosts||[],
    perPerson: f.perPerson||false,
  };
}
// ─── GOAL DEFINITIONS ─────────────────────────────────────────────────────────
interface Condition { label: string; target: number; current: number; fmt: (v: number) => string }
interface Goal {
  id: string; tier: string; name: string; emoji: string; tagline: string;
  locked: boolean; unlockedDate?: string;
  conditions: Condition[];
  jarvisNext: string | null; unlockMessage: string;
  financeKey: string | null; jarvisFinanceNote: string | null;
}
const GOALS: Goal[] = [
  {
    id: "silverado", tier: "owner", name: "Silverado", emoji: "🛻",
    tagline: "The truck. Financed. Justified.", locked: true,
    conditions: [
      { label: "Profit account",      target: 20000,  current: M.profitAccount,           fmt: v => "$"+Math.round(v/1000)+"k" },
      { label: "Cash above $20k",     target: 60,     current: M.consecutiveDaysAbove20k, fmt: v => v+"d" },
      { label: "GP/hr 3-job avg",     target: 48,     current: M.gpHrAvg3Jobs,            fmt: v => "$"+v+"/hr" },
      { label: "Avg monthly revenue", target: 60000,  current: M.avgMonthlyRevenue,       fmt: v => "$"+Math.round(v/1000)+"k" },
    ],
    jarvisNext: "GP/hr is the fastest lever — one Black label job above $55/hr shifts the avg. Revenue needs one more $60k+ month. That's 3 solid jobs in a row.",
    unlockMessage: "Numbers check out. Finance case is solid. The Silverado's justified — and you earned it. What colour?",
    financeKey: "silverado",
    jarvisFinanceNote: "The Silverado adds $1,316/mo net after tax savings and replacing the current ute cost. At current revenue that's absorbed with roughly 0.4 jobs of margin. The conditions exist to make sure the business is consistently above that threshold before you commit to the repayment.",
  },
  {
    id: "holiday", tier: "owner", name: "Family Holiday", emoji: "✈️",
    tagline: "Wheels up. Business holds itself.", locked: true,
    conditions: [
      { label: "Profit account",      target: 20000,  current: M.profitAccount,           fmt: v => "$"+Math.round(v/1000)+"k" },
      { label: "Cash above $20k",     target: 90,     current: M.consecutiveDaysAbove20k, fmt: v => v+"d" },
      { label: "Baylee leading solo", target: 8.5,    current: M.baylee_effort_avg,       fmt: v => v.toFixed(1)+"/10" },
    ],
    jarvisNext: "Profit account is the blocker — $15,400 short. Two jobs above target closes it. Baylee's nearly there at 8.2.",
    unlockMessage: "Cash is real, Baylee's ready, profit covers the trip. Book it.",
    financeKey: "holiday",
    jarvisFinanceNote: "$8k from the profit account — no impact on cash flow or opex. The only risk is timing. Don't take it when BAS is due or payroll is tight. The 90-day cash condition protects against that.",
  },
  {
    id: "tools_upgrade", tier: "owner", name: "Tools Upgrade", emoji: "🔧",
    tagline: "New gear. Earned, not financed.", locked: false, unlockedDate: "2026-02-14",
    conditions: [
      { label: "Profit account",      target: 5000,   current: M.profitAccount,           fmt: v => "$"+Math.round(v/1000)+"k" },
      { label: "GP/hr avg",           target: 35,     current: M.gpHrAvg3Jobs,            fmt: v => "$"+v+"/hr" },
    ],
    jarvisNext: null,
    unlockMessage: "Margins solid, profit account there. Buy the tools with profit money, not cash.",
    financeKey: "tools_upgrade",
    jarvisFinanceNote: "$3,500 one-time, fully deductible at 100% business use. Effective after-tax cost is ~$2,538. Paid from profit allocation — doesn't touch Transactions.",
  },
  {
    id: "lambo", tier: "dream", name: "Lambo", emoji: "🟡",
    tagline: "The dream. A real target. Not a joke.", locked: true,
    conditions: [
      { label: "Profit account",      target: 150000, current: M.profitAccount,           fmt: v => "$"+Math.round(v/1000)+"k" },
      { label: "Monthly revenue",     target: 200000, current: M.avgMonthlyRevenue,       fmt: v => "$"+Math.round(v/1000)+"k" },
      { label: "Weeks off tools",     target: 8,      current: M.weeksOffTools,           fmt: v => v+" wks" },
    ],
    jarvisNext: "2–3 years at current trajectory. The path runs through TradiScale — first external operator unlocks the revenue multiplier.",
    unlockMessage: "Yeah. You actually did it.",
    financeKey: null, jarvisFinanceNote: null,
  },
  {
    id: "beers", tier: "crew", name: "Beers for the Boys", emoji: "🍺",
    tagline: "Baylee and Marius. They earned it too.", locked: true,
    conditions: [
      { label: "GP/hr 3-job avg",     target: 45,     current: M.gpHrAvg3Jobs,            fmt: v => "$"+v+"/hr" },
      { label: "Crew sentiment avg",  target: 7.5,    current: M.crewSentimentAvg,        fmt: v => v+"/10" },
    ],
    jarvisNext: "GP/hr is $4 short. One clean Black label job closes it. Tell the boys it's coming — that alone lifts sentiment.",
    unlockMessage: "GP/hr record. Sentiment up. Friday afternoon. Beers on Endure.",
    financeKey: "beers",
    jarvisFinanceNote: "$300 fully deductible as staff entertainment. After-tax cost: ~$218. This is noise in the P&L with real retention value.",
  },
  {
    id: "site_lunch", tier: "crew", name: "Site Lunch", emoji: "🥩",
    tagline: "Job closes clean. Lunch is on Endure.", locked: false, unlockedDate: "2026-03-01",
    conditions: [
      { label: "Job closes on time",  target: 1,      current: M.consecutiveJobsClean,    fmt: v => v+" job" },
      { label: "GP/hr above bench",   target: 30,     current: M.gpHrAvg3Jobs,            fmt: v => "$"+v+"/hr" },
    ],
    jarvisNext: null,
    unlockMessage: "Closed clean and above benchmark. Lunch on you.",
    financeKey: "site_lunch",
    jarvisFinanceNote: "$200 deductible. Do it every time conditions are met — it compounds into culture.",
  },
  {
    id: "crew_bonus", tier: "crew", name: "Crew Bonus", emoji: "💰",
    tagline: "Cash in hand. Performance-linked.", locked: true,
    conditions: [
      { label: "Consecutive clean jobs", target: 4,    current: M.consecutiveJobsClean, fmt: v => v+" jobs" },
      { label: "Profit account",         target: 15000, current: M.profitAccount,       fmt: v => "$"+Math.round(v/1000)+"k" },
      { label: "Crew sentiment avg",     target: 8.0,  current: M.crewSentimentAvg,    fmt: v => v.toFixed(1)+"/10" },
    ],
    jarvisNext: "2 more clean jobs. Sentiment needs 0.8 points — talk to Marius this week. Profit account is the biggest blocker at $10,400 short.",
    unlockMessage: "Four clean jobs. Sentiment up. Profit solid. Pay the bonus — they know why.",
    financeKey: "crew_bonus",
    jarvisFinanceNote: "$4,000 total across Baylee and Marius. Deductible. One resignation costs $40k+ in downtime and recruitment. This is not a cost — it's insurance.",
  },
  {
    id: "200k_month", tier: "milestone", name: "First $200k Month", emoji: "📈",
    tagline: "The number that changes the conversation.", locked: true,
    conditions: [
      { label: "Monthly revenue", target: 200000, current: M.avgMonthlyRevenue, fmt: v => "$"+Math.round(v/1000)+"k" },
    ],
    jarvisNext: "You need 4.4× current volume or a fundamental pricing shift. 6 Black label jobs at premium pricing gets you there. Pipeline × pricing × zero lost days.",
    unlockMessage: "Two hundred thousand. Screenshot this.",
    financeKey: null, jarvisFinanceNote: null,
  },
  {
    id: "off_tools", tier: "milestone", name: "First Week Off Tools", emoji: "🧠",
    tagline: "Business runs without you. Proof of concept.", locked: true,
    conditions: [
      { label: "Baylee effort avg",   target: 8.5,  current: M.baylee_effort_avg,        fmt: v => v.toFixed(1)+"/10" },
      { label: "Cash above $20k",     target: 30,   current: M.consecutiveDaysAbove20k, fmt: v => v+"d" },
    ],
    jarvisNext: "Baylee is 0.3 points off. Cash needs 18 more days above $20k. You could take a week in 6 weeks if both hold.",
    unlockMessage: "Baylee held it. Jobs ran clean. You weren't there. This is the beginning.",
    financeKey: null, jarvisFinanceNote: null,
  },
];
const TIER_META: Record<string, { label: string; color: string; order: number }> = {
  owner:     { label: "OWNER REWARDS",  color: C.gold,   order: 0 },
  crew:      { label: "CREW REWARDS",   color: C.green,  order: 1 },
  milestone: { label: "MILESTONES",     color: C.blue,   order: 2 },
  dream:     { label: "THE DREAM",      color: C.purple, order: 3 },
};
const fmt$ = (v: number) => "$" + Math.abs(Math.round(v)).toLocaleString();
const goalPct = (g: Goal) => Math.round(g.conditions.reduce((s,c) => s + Math.min(1, c.current/c.target), 0) / g.conditions.length * 100);
function Bar({ value, max, color, h = 3 }: { value: number; max: number; color: string; h?: number }) {
  const p = Math.min(100, (value/max)*100);
  return (
    <div style={{ height: h, background: C.border, borderRadius: 1, position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${p}%`, background: p>=100 ? color : color+"88", transition: "width 0.8s ease", borderRadius: 1 }} />
    </div>
  );
}
// ─── FINANCE PANEL ────────────────────────────────────────────────────────────
function FinancePanel({ goal, fin, tier }: { goal: Goal; fin: CalcResult | null; tier: { label: string; color: string; order: number } }) {
  if (!fin && !goal.jarvisFinanceNote) return (
    <div style={{ padding: "20px", textAlign: "center", color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "9px" }}>
      Milestone — no financial model.
    </div>
  );
  if (!fin) return (
    <div style={{ background: C.surface2, borderLeft: `3px solid ${C.gold}`, padding: "14px 16px" }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.gold, marginBottom: "5px" }}>JARVIS · FINANCE NOTE</div>
      <div style={{ fontSize: "12px", color: C.textMid, lineHeight: 1.7 }}>{goal.jarvisFinanceNote}</div>
    </div>
  );
  const verdict = fin.isOneTime
    ? { label: "ONE-TIME · PROFIT ACCOUNT", color: C.blue, note: `${fmt$(fin.purchasePrice)} from profit allocation. No monthly cash impact.` }
    : fin.realNetCostMo <= 0
    ? { label: "SELF-FUNDING",  color: C.green, note: "Tax savings + replaced costs exceed the new expense." }
    : fin.realNetCostMo < 600
    ? { label: "LOW IMPACT",    color: C.green, note: `${fmt$(fin.realNetCostMo)}/mo net sits within normal monthly revenue variation.` }
    : fin.realNetCostMo < 1600
    ? { label: "MANAGEABLE",   color: C.amber, note: `${fmt$(fin.realNetCostMo)}/mo net requires consistent performance to absorb comfortably.` }
    : { label: "SIGNIFICANT",  color: C.red,   note: `${fmt$(fin.realNetCostMo)}/mo is a material fixed cost increase. Conditions are non-negotiable.` };
  return (
    <div>
      <div style={{ background: verdict.color+"14", border: `1px solid ${verdict.color}44`, borderLeft: `3px solid ${verdict.color}`, padding: "10px 14px", marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: verdict.color, letterSpacing: "0.1em" }}>{verdict.label}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "13px", color: verdict.color }}>
            {fin.isOneTime ? fmt$(fin.purchasePrice) : fmt$(fin.realNetCostMo)+"/mo"}
          </div>
        </div>
        <div style={{ fontSize: "11px", color: C.textMid, lineHeight: 1.6 }}>{verdict.note}</div>
      </div>
      {!fin.isOneTime && (
        <div style={{ border: `1px solid ${C.border}`, marginBottom: "12px" }}>
          {[
            { label: "Monthly repayment",                                              val: fin.repaymentMo,    sign: -1, color: C.red   },
            { label: `Running costs (fuel, ins, rego)`,                                val: fin.runningCostsMo, sign: -1, color: C.red   },
            { label: "Replaces current ute cost",                                      val: fin.existingCostMo, sign: +1, color: C.green },
            { label: `Tax deduction (${Math.round(fin.businessUsePct*100)}% biz use × 27.5%)`, val: fin.taxSavingMo, sign: +1, color: C.green },
          ].map((r, i, arr) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: "11px", color: C.textMid }}>{r.label}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: r.color }}>{r.sign > 0 ? "+" : "−"}{fmt$(r.val)}</div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: C.border+"44" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.text }}>Real net cost / month</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "14px", color: verdict.color }}>{fmt$(fin.realNetCostMo)}</div>
          </div>
        </div>
      )}
      {!fin.isOneTime && fin.realNetCostMo > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          {[
            { label: "Hrs to cover / mo", value: fin.hoursToBreakEven+"h", sub: `at $${M.gpHrAvg3Jobs}/hr GP` },
            { label: "Jobs to cover / mo", value: fin.jobsToBreakEven, sub: "at current avg job GP" },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface2, border: `1px solid ${C.border}`, padding: "10px 12px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginBottom: "3px" }}>{s.label.toUpperCase()}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "20px", color: C.text, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginTop: "3px" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}
      {fin.totalInterest > 0 && (
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginBottom: "12px", padding: "8px 12px", background: C.surface2, border: `1px solid ${C.border}` }}>
          Total interest paid over 5 years: {fmt$(fin.totalInterest)} — the real cost of financing vs paying cash.
        </div>
      )}
      {fin.softROI.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, letterSpacing: "0.1em", marginBottom: "8px" }}>SOFT ROI</div>
          {fin.softROI.map((r, i) => (
            <div key={i} style={{ padding: "8px 12px", background: C.surface2, border: `1px solid ${C.border}`, marginBottom: "4px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: tier.color, marginBottom: "3px" }}>{r.label.toUpperCase()}</div>
              <div style={{ fontSize: "11px", color: C.textMid, lineHeight: 1.6 }}>{r.note}</div>
            </div>
          ))}
        </div>
      )}
      {goal.jarvisFinanceNote && (
        <div style={{ background: C.surface2, borderLeft: `3px solid ${C.gold}`, padding: "11px 14px" }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.gold, letterSpacing: "0.1em", marginBottom: "5px" }}>JARVIS · ADVISORY</div>
          <div style={{ fontSize: "11px", color: C.textMid, lineHeight: 1.75 }}>{goal.jarvisFinanceNote}</div>
        </div>
      )}
    </div>
  );
}
// ─── GOAL CARD ────────────────────────────────────────────────────────────────
function GoalCard({ goal, onSelect, selected }: { goal: Goal; onSelect: (id: string) => void; selected: boolean }) {
  const tier = TIER_META[goal.tier];
  const p    = goalPct(goal);
  const fin  = goal.financeKey ? calcFinance(FINANCE[goal.financeKey]) : null;
  return (
    <div onClick={() => onSelect(goal.id)}
      style={{ background: selected ? C.surface2 : C.surface, border: `1px solid ${selected ? tier.color+"99" : goal.locked ? C.border : tier.color+"55"}`, padding: "15px 17px", cursor: "pointer", position: "relative", overflow: "hidden", transition: "all 0.15s" }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.borderColor = tier.color+"66"; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.borderColor = goal.locked ? C.border : tier.color+"55"; }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: goal.locked ? C.border2 : tier.color, opacity: goal.locked ? 0.4 : 1 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "20px", marginBottom: "3px", filter: goal.locked ? "saturate(0.4)" : "none" }}>{goal.emoji}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: goal.locked ? C.textMid : C.text, letterSpacing: "0.04em" }}>{goal.name.toUpperCase()}</div>
          <div style={{ fontSize: "10px", color: C.textDim, marginTop: "2px", lineHeight: 1.4 }}>{goal.tagline}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "15px", color: goal.locked ? C.textDim : tier.color }}>
            {goal.locked ? p+"%" : "✓"}
          </div>
          {fin && !fin.isOneTime && goal.locked && (
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "7px", color: C.textDim, marginTop: "1px" }}>
              {fmt$(fin.realNetCostMo)}/mo
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: "3px" }}>
        {goal.conditions.map((c, i) => <div key={i} style={{ flex: 1 }}><Bar value={c.current} max={c.target} color={tier.color} /></div>)}
      </div>
      {goal.unlockedDate && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "7px", color: tier.color+"88", marginTop: "6px" }}>unlocked {goal.unlockedDate}</div>}
    </div>
  );
}
// ─── DETAIL PANEL ─────────────────────────────────────────────────────────────
function DetailPanel({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const [tab, setTab] = useState("progress");
  const tier = TIER_META[goal.tier];
  const p    = goalPct(goal);
  const fin  = goal.financeKey ? calcFinance(FINANCE[goal.financeKey]) : null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${tier.color}44`, position: "sticky", top: "0" }}>
      <div style={{ padding: "20px 22px 0", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: tier.color, letterSpacing: "0.2em", marginBottom: "3px" }}>{tier.label}</div>
            <div style={{ fontSize: "24px", marginBottom: "2px" }}>{goal.emoji}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "12px", color: C.text, letterSpacing: "0.06em" }}>{goal.name.toUpperCase()}</div>
            <div style={{ fontSize: "11px", color: C.textDim, marginTop: "2px" }}>{goal.tagline}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.textDim, cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: "0" }}>×</button>
        </div>
        <div style={{ display: "flex" }}>
          {([["progress","Progress"],["finance","Finance Case"]] as [string,string][]).map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ background: "transparent", border: "none", borderBottom: tab===v ? `2px solid ${tier.color}` : "2px solid transparent", color: tab===v ? tier.color : C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "8px", padding: "8px 14px", cursor: "pointer", letterSpacing: "0.1em" }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "18px 22px", maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}>
        {tab === "progress" && (
          <div>
            <div style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>OVERALL PROGRESS</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: goal.locked ? C.textMid : tier.color }}>{goal.locked ? p+"%" : "UNLOCKED ✓"}</div>
              </div>
              <div style={{ height: "6px", background: C.border }}>
                <div style={{ height: "100%", width: `${p}%`, background: goal.locked ? tier.color+"88" : tier.color, transition: "width 1s", boxShadow: goal.locked ? "none" : `0 0 8px ${tier.color}66` }} />
              </div>
            </div>
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, letterSpacing: "0.1em", marginBottom: "10px" }}>THE GAP — WHAT YOU NEED</div>
              {goal.conditions.map((c, i) => {
                const done = c.current >= c.target;
                return (
                  <div key={i} style={{ marginBottom: "13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: done ? tier.color : "transparent", border: `1px solid ${done ? tier.color : C.border2}` }} />
                        <div style={{ fontSize: "11px", color: done ? C.text : C.textMid }}>{c.label}</div>
                      </div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: done ? tier.color : C.textDim }}>
                        {c.fmt(c.current)} / {c.fmt(c.target)}
                      </div>
                    </div>
                    <div style={{ marginLeft: "13px" }}>
                      <Bar value={c.current} max={c.target} color={tier.color} />
                      {!done && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginTop: "3px" }}>need {c.fmt(c.target - c.current)} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            {goal.locked && goal.jarvisNext && (
              <div style={{ background: C.surface2, borderLeft: `3px solid ${C.gold}`, padding: "11px 14px", marginBottom: "14px" }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.gold, letterSpacing: "0.1em", marginBottom: "5px" }}>JARVIS · NEXT MOVE</div>
                <div style={{ fontSize: "11px", color: C.textMid, lineHeight: 1.75 }}>{goal.jarvisNext}</div>
              </div>
            )}
            {!goal.locked ? (
              <div style={{ background: tier.color+"18", border: `1px solid ${tier.color}44`, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ fontSize: "22px", marginBottom: "6px" }}>{goal.emoji}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: tier.color, letterSpacing: "0.12em" }}>UNLOCKED · {goal.unlockedDate}</div>
                <div style={{ fontSize: "12px", color: C.textMid, marginTop: "8px", fontStyle: "italic", lineHeight: 1.7 }}>"{goal.unlockMessage}"</div>
              </div>
            ) : (
              <div style={{ border: `1px dashed ${C.border2}`, padding: "12px 16px", textAlign: "center", opacity: 0.4 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginBottom: "6px" }}>WHEN THIS UNLOCKS, JARVIS SAYS</div>
                <div style={{ fontSize: "11px", color: C.textMid, fontStyle: "italic", lineHeight: 1.6 }}>"{goal.unlockMessage}"</div>
              </div>
            )}
          </div>
        )}
        {tab === "finance" && <FinancePanel goal={goal} fin={fin} tier={tier} />}
      </div>
    </div>
  );
}
// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function CEOGoals() {
  const [selected, setSelected] = useState<string | null>("silverado");
  const [filter,   setFilter]   = useState("all");
  const tiers     = Object.keys(TIER_META).sort((a,b) => TIER_META[a].order - TIER_META[b].order);
  const unlockedN = GOALS.filter(g => !g.locked).length;
  const overallPct = Math.round(GOALS.reduce((s,g) => s + goalPct(g), 0) / GOALS.length);
  const selectedGoal = GOALS.find(g => g.id === selected);
  const visible = (tier: string) => GOALS.filter(g => {
    if (filter === "locked")   return  g.locked && g.tier === tier;
    if (filter === "unlocked") return !g.locked && g.tier === tier;
    return g.tier === tier;
  });
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Georgia,serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');`}</style>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "20px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.gold, letterSpacing: "0.25em", marginBottom: "4px" }}>ENDURE OS · CEO</div>
            <div style={{ fontSize: "24px" }}>The Game Board</div>
            <div style={{ fontSize: "12px", color: C.textDim, marginTop: "3px" }}>Every reward justified. Every unlock earned. Every number real.</div>
          </div>
          <div style={{ display: "flex", gap: "22px", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "32px", color: C.gold, lineHeight: 1 }}>{overallPct}<span style={{ fontSize: "13px" }}>%</span></div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginTop: "2px" }}>ACROSS THE BOARD</div>
            </div>
            <div style={{ width: "1px", height: "36px", background: C.border }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "22px", color: C.green, lineHeight: 1 }}>{unlockedN}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginTop: "2px" }}>UNLOCKED</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "22px", color: C.textMid, lineHeight: 1 }}>{GOALS.length - unlockedN}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginTop: "2px" }}>LOCKED</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: "14px", height: "3px", background: C.border }}>
          <div style={{ height: "100%", width: `${overallPct}%`, background: `linear-gradient(90deg, ${C.gold}88, ${C.goldBright})`, transition: "width 1s", boxShadow: `0 0 8px ${C.gold}44` }} />
        </div>
      </div>
      {/* Filter */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 28px", display: "flex" }}>
        {([["all","All"],["locked","Locked"],["unlocked","Unlocked"]] as [string,string][]).map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ background: "transparent", border: "none", borderBottom: filter===v ? `2px solid ${C.gold}` : "2px solid transparent", color: filter===v ? C.gold : C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "8px", padding: "10px 14px", cursor: "pointer", letterSpacing: "0.1em" }}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      {/* Body */}
      <div style={{ display: "grid", gridTemplateColumns: selectedGoal ? "1fr 380px" : "1fr", gap: "0", padding: "24px 28px", alignItems: "start" }}>
        <div style={{ paddingRight: selectedGoal ? "20px" : "0" }}>
          {tiers.map(tier => {
            const gs = visible(tier);
            if (!gs.length) return null;
            const meta = TIER_META[tier];
            return (
              <div key={tier} style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: meta.color, letterSpacing: "0.2em" }}>{meta.label}</div>
                  <div style={{ flex: 1, height: "1px", background: meta.color+"33" }} />
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim }}>{gs.filter(g=>!g.locked).length}/{gs.length} unlocked</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
                  {gs.map(g => (
                    <GoalCard key={g.id} goal={g} onSelect={id => setSelected(id===selected ? null : id)} selected={selected===g.id} />
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{ background: C.surface, borderLeft: `3px solid ${C.gold}`, padding: "14px 18px", marginTop: "4px" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.gold, letterSpacing: "0.1em", marginBottom: "6px" }}>JARVIS · GAME BRIEF</div>
            <div style={{ fontSize: "12px", color: C.textMid, lineHeight: 1.8 }}>
              Board is {overallPct}% complete — {unlockedN} live, {GOALS.length-unlockedN} locked.
              The Silverado adds $1,316/mo net after tax and replacing the current ute. At $45k/month revenue that's absorbed comfortably — but the conditions exist to confirm you're consistently above that level before committing.
              Every Black label job above $48/hr GP moves the Silverado, holiday, and crew bonus conditions simultaneously.
              The Lambo is on the board. It's not a joke. It's a 3-year target that runs through TradiScale. Keep building.
            </div>
          </div>
        </div>
        {selectedGoal && <DetailPanel goal={selectedGoal} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}
