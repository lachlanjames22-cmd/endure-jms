'use client'

import { useState, useCallback, useEffect } from "react";
// ─── DESIGN SYSTEM ────────────────────────────────────────────────────────────
const C = {
  bg:       "#13131a",
  surface:  "#1c1c26",
  surface2: "#22222e",
  border:   "#2a2a38",
  border2:  "#333344",
  gold:     "#c9a06a",
  goldDim:  "#8a6a3a",
  text:     "#f0ebe3",
  textMid:  "#a09890",
  textDim:  "#6a6460",
  green:    "#34d399",
  amber:    "#fbbf24",
  red:      "#f87171",
  blue:     "#60a5fa",
  purple:   "#a78bfa",
};
// ─── BUSINESS CONSTANTS ───────────────────────────────────────────────────────
const PF = {
  tax:     0.25,
  profit:  0.10,
  reserve: 0.10,
  ops:     0.55,
};
const GST_RATE        = 0.10;
const SUPER_RATE      = 0.11;
const BAYLEE_BASE_HR  = 45;
const MARIUS_BASE_HR  = 38;
const HRS_PER_MONTH   = 8 * 17.2;
const MONTHLY_SUPER   = (BAYLEE_BASE_HR + MARIUS_BASE_HR) * HRS_PER_MONTH * SUPER_RATE;
const OWNER_ANNUAL    = 1884.62 * 52;
const PAYG_ANNUAL     = 14167 + (OWNER_ANNUAL - 45001) * 0.325 + OWNER_ANNUAL * 0.02;
const PAYG_MONTHLY    = PAYG_ANNUAL / 12;
const OPEX_GST_CREDIT = 7669.93 * 0.10;

function getUpcomingPayrolls(fromDate: Date, count = 8) {
  const anchor = new Date("2026-02-24");
  const result: Date[] = [];
  let d = new Date(anchor);
  while (result.length < count) {
    d = new Date(d.getTime() + 14 * 86400000);
    if (d > fromDate) result.push(new Date(d));
  }
  return result;
}

const BAS_QUARTERS = [
  { label: "Q3 FY26", period: "Jan–Mar 2026", due: new Date("2026-04-28"), months: 3 },
  { label: "Q4 FY26", period: "Apr–Jun 2026", due: new Date("2026-07-28"), months: 3 },
];

const TARGETS = {
  transactions: { min: 20000, healthy: 30000 },
  tax:          { min: 8000,  healthy: 15000  },
  reserve:      { min: 12000, healthy: 18000  },
  profit:       { min: 0,     healthy: 20000  },
};

const INSTALLMENT_TYPES = [
  { key: "deposit",   label: "10% Deposit",     pct: 0.10, triggersPF: false, color: C.textDim, desc: "Covers ad spend + momentum. No allocation." },
  { key: "materials", label: "50% Materials",   pct: 0.50, triggersPF: false, color: C.blue,    desc: "Passthrough. Spent on materials within 14 days." },
  { key: "subframe",  label: "20% Subframe",    pct: 0.20, triggersPF: true,  color: C.amber,   desc: "First Profit First trigger. Job is real and on site." },
  { key: "final",     label: "Final on Handover",pct: 0.20, triggersPF: true, color: C.green,   desc: "Full Profit First allocation. Job closed." },
];

const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
const pct = (n: number) => (n * 100).toFixed(0) + "%";
const tl  = (v: number, warn: number, crit: number) => v >= warn ? C.green : v >= crit ? C.amber : C.red;

const SEED_ACCOUNTS = {
  transactions: 24300,
  tax:          11200,
  reserve:      9800,
  profit:       4600,
};

const SEED_JOBS = [
  { id: 1, name: "Pereira / Mosman Park",   value: 28400, status: "active",  payments: ["deposit", "materials", "subframe"] },
  { id: 2, name: "Henderson / Applecross",  value: 22100, status: "active",  payments: ["deposit", "materials"] },
  { id: 3, name: "Mitchell / Cottesloe",    value: 31800, status: "quoted",  payments: [] as string[] },
];

const SEED_HISTORY = [
  { id: 1, date: "2026-03-01", job: "Wellard / Wellard",  type: "final",     amount: 4090,  pf: true,  allocations: { tax: 614, profit: 409, reserve: 409, ops: 2658 } },
  { id: 2, date: "2026-02-21", job: "Wellard / Wellard",  type: "subframe",  amount: 4090,  pf: true,  allocations: { tax: 614, profit: 409, reserve: 409, ops: 2658 } },
  { id: 3, date: "2026-02-14", job: "Wellard / Wellard",  type: "materials", amount: 10225, pf: false, allocations: null },
  { id: 4, date: "2026-02-07", job: "Wellard / Wellard",  type: "deposit",   amount: 2045,  pf: false, allocations: null },
  { id: 5, date: "2026-01-28", job: "Nguyen / Floreat",   type: "final",     amount: 3860,  pf: true,  allocations: { tax: 579, profit: 386, reserve: 386, ops: 2509 } },
];

const Label = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: color || C.textDim, letterSpacing: "0.15em", textTransform: "uppercase" as const, marginBottom: "6px" }}>
    {children}
  </div>
);

const Tag = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", padding: "2px 7px", background: (color || C.gold) + "22", color: color || C.gold, letterSpacing: "0.1em" }}>
    {children}
  </span>
);

function AccountCard({ id, label, balance, target, color, icon, onEdit }: {
  id: string; label: string; balance: number;
  target: { min: number; healthy: number }; color: string; icon: string;
  onEdit: (id: string) => void;
}) {
  const healthPct = Math.min(1, balance / target.healthy);
  const barColor  = tl(balance, target.healthy, target.min);
  const status    = balance >= target.healthy ? "HEALTHY" : balance >= target.min ? "WATCH" : "LOW";
  const statusCol = tl(balance, target.healthy, target.min);
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: color, opacity: 0.6 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, letterSpacing: "0.15em", marginBottom: "3px" }}>{label}</div>
          <div style={{ fontSize: "8px", color: statusCol, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em" }}>{status}</div>
        </div>
        <div style={{ fontSize: "20px", opacity: 0.4 }}>{icon}</div>
      </div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "28px", color: C.text, lineHeight: 1, marginBottom: "10px" }}>
        {fmt(balance)}
      </div>
      <div style={{ height: "3px", background: C.border, marginBottom: "8px" }}>
        <div style={{ height: "100%", width: `${healthPct * 100}%`, background: barColor, transition: "width 0.6s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim }}>
          target {fmt(target.healthy)} · floor {fmt(target.min)}
        </div>
        <button onClick={() => onEdit(id)}
          style={{ background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "8px", padding: "2px 8px", cursor: "pointer" }}>
          EDIT
        </button>
      </div>
    </div>
  );
}

function PaymentRow({ item, onAllocate }: {
  item: typeof SEED_HISTORY[0];
  onAllocate: (item: typeof SEED_HISTORY[0]) => void;
}) {
  const type = INSTALLMENT_TYPES.find(t => t.key === item.type);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px 80px 90px", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>{item.date}</div>
      <div>
        <div style={{ fontSize: "12px", color: C.text }}>{item.job}</div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: type?.color || C.textDim, marginTop: "2px" }}>{type?.label}</div>
      </div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "13px", color: C.gold, textAlign: "right" as const }}>{fmt(item.amount)}</div>
      <div style={{ textAlign: "center" as const }}>
        {item.pf ? <Tag color={C.green}>PF FIRED</Tag> : <Tag color={C.textDim}>PASS</Tag>}
      </div>
      <div style={{ textAlign: "right" as const }}>
        {item.allocations && (
          <button onClick={() => onAllocate(item)}
            style={{ background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "8px", padding: "3px 8px", cursor: "pointer" }}>
            VIEW
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProfitFirst() {
  const [accounts, setAccounts] = useState(SEED_ACCOUNTS);
  const [history,  setHistory]  = useState(SEED_HISTORY);
  const [jobs]                  = useState(SEED_JOBS);
  const [view,        setView]        = useState("accounts");
  const [showPayment, setShowPayment] = useState(false);
  const [showAlloc,   setShowAlloc]   = useState<typeof SEED_HISTORY[0] | null>(null);
  const [editAccount, setEditAccount] = useState<string | null>(null);
  const [pendingAlloc,setPendingAlloc]= useState<{amount:number;alloc:{tax:number;profit:number;reserve:number;ops:number};job:string;type:string}|null>(null);
  const [payment, setPayment] = useState({ jobId: "", type: "subframe", amount: "" });

  useEffect(() => {
    fetch('/api/pf-accounts')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object' && !data.error) {
          setAccounts(prev => ({
            ...prev,
            ...(data.transactions != null && { transactions: data.transactions }),
            ...(data.tax != null && { tax: data.tax }),
            ...(data.reserve != null && { reserve: data.reserve }),
            ...(data.profit != null && { profit: data.profit }),
          }));
        }
      })
      .catch(() => {});
  }, []);

  const calcAllocation = useCallback((amount: number) => ({
    tax:     Math.round(amount * PF.tax),
    profit:  Math.round(amount * PF.profit),
    reserve: Math.round(amount * PF.reserve),
    ops:     Math.round(amount * PF.ops),
  }), []);

  const applyAllocation = useCallback((amount: number, alloc: {tax:number;profit:number;reserve:number;ops:number}) => {
    setAccounts(prev => ({
      transactions: prev.transactions + alloc.ops,
      tax:          prev.tax          + alloc.tax,
      reserve:      prev.reserve      + alloc.reserve,
      profit:       prev.profit       + alloc.profit,
    }));
  }, []);

  const recordPayment = useCallback(() => {
    const amt = parseFloat(payment.amount);
    if (!amt || !payment.jobId) return;
    const type = INSTALLMENT_TYPES.find(t => t.key === payment.type);
    const job  = jobs.find(j => j.id === parseInt(payment.jobId));
    const pf   = type?.triggersPF ?? false;
    const alloc = pf ? calcAllocation(amt) : null;
    if (pf && alloc) {
      setPendingAlloc({ amount: amt, alloc, job: job?.name || "Unknown", type: type?.label || "" });
    } else {
      setAccounts(prev => ({ ...prev, transactions: prev.transactions + amt }));
      setHistory(prev => [{ id: Date.now(), date: new Date().toISOString().slice(0, 10), job: job?.name || "Unknown", type: payment.type, amount: amt, pf: false, allocations: null }, ...prev]);
      setShowPayment(false);
      setPayment({ jobId: "", type: "subframe", amount: "" });
    }
  }, [payment, jobs, calcAllocation]);

  const confirmAllocation = useCallback(() => {
    if (!pendingAlloc) return;
    applyAllocation(pendingAlloc.amount, pendingAlloc.alloc);
    setHistory(prev => [{ id: Date.now(), date: new Date().toISOString().slice(0, 10), job: pendingAlloc.job, type: payment.type, amount: pendingAlloc.amount, pf: true, allocations: pendingAlloc.alloc }, ...prev]);
    setPendingAlloc(null);
    setShowPayment(false);
    setPayment({ jobId: "", type: "subframe", amount: "" });
  }, [pendingAlloc, payment.type, applyAllocation]);

  const totalCash = Object.values(accounts).reduce((s, v) => s + v, 0);
  const ACCOUNT_META = [
    { id: "transactions", label: "Transactions",      color: C.gold,  icon: "⟳", target: TARGETS.transactions },
    { id: "tax",          label: "Tax Holding",        color: C.red,   icon: "⊖", target: TARGETS.tax          },
    { id: "reserve",      label: "Operating Reserve",  color: C.amber, icon: "◫", target: TARGETS.reserve      },
    { id: "profit",       label: "Profit",             color: C.green, icon: "◈", target: TARGETS.profit       },
  ];
  const tabs = ["accounts", "pipeline", "cfo", "history", "rules"];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Georgia,serif" }}>
      {/* HEADER */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.gold, letterSpacing: "0.2em", marginBottom: "2px" }}>ENDURE OS · PROFIT FIRST</div>
          <div style={{ fontSize: "20px", color: C.text }}>Cash Architecture</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ textAlign: "right" as const }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim }}>TOTAL CASH</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "18px", color: C.gold }}>{fmt(totalCash)}</div>
          </div>
          <button onClick={() => setShowPayment(true)}
            style={{ background: C.gold, color: C.bg, border: "none", fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "10px 18px", cursor: "pointer", letterSpacing: "0.1em" }}>
            + RECORD PAYMENT
          </button>
        </div>
      </div>
      {/* TABS */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setView(t)}
            style={{ background: "transparent", border: "none", borderBottom: view === t ? `2px solid ${C.gold}` : "2px solid transparent", color: view === t ? C.gold : C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "12px 16px", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
            {t}
          </button>
        ))}
      </div>
      <div style={{ padding: "24px" }}>
        {/* ACCOUNTS VIEW */}
        {view === "accounts" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
              {ACCOUNT_META.map(acc => (
                <AccountCard key={acc.id} {...acc} balance={accounts[acc.id as keyof typeof accounts]}
                  onEdit={(id) => setEditAccount(id)} />
              ))}
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: "16px" }}>
              <Label>Cash Composition</Label>
              <div style={{ display: "flex", height: "8px", gap: "2px", marginBottom: "10px" }}>
                {ACCOUNT_META.map(acc => (
                  <div key={acc.id} style={{ flex: accounts[acc.id as keyof typeof accounts] / totalCash, background: acc.color, opacity: 0.7, transition: "flex 0.6s ease" }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: "20px" }}>
                {ACCOUNT_META.map(acc => (
                  <div key={acc.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "8px", height: "8px", background: acc.color, opacity: 0.7 }} />
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>
                      {acc.label} {pct(accounts[acc.id as keyof typeof accounts] / totalCash)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: C.surface2, border: `1px solid ${C.border2}`, borderLeft: `3px solid ${C.gold}`, padding: "12px 16px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.gold, marginBottom: "6px", letterSpacing: "0.1em" }}>JARVIS · CASH BRIEF</div>
              <div style={{ fontSize: "12px", color: C.textMid, lineHeight: 1.6 }}>
                {accounts.transactions < TARGETS.transactions.min
                  ? `Transactions at ${fmt(accounts.transactions)} — below the $20k floor. Pereira subframe due soon. Hold expenses until it lands.`
                  : accounts.reserve < TARGETS.reserve.min
                  ? `Operating Reserve at ${fmt(accounts.reserve)} — below the $12k payroll buffer. Reserve needs topping from the next Profit First trigger.`
                  : `Cash position is solid at ${fmt(totalCash)} across 4 accounts. Reserve is the only watch — ${fmt(accounts.reserve)} vs $12k floor. Next Profit First trigger: Pereira subframe.`
                }
              </div>
            </div>
          </div>
        )}
        {/* PIPELINE VIEW */}
        {view === "pipeline" && (
          <div>
            <Label>Active Jobs — Upcoming Installments</Label>
            {jobs.filter(j => j.status !== "quoted").map(job => {
              const remaining = INSTALLMENT_TYPES.filter(t => !job.payments.includes(t.key));
              return (
                <div key={job.id} style={{ background: C.surface, border: `1px solid ${C.border}`, marginBottom: "12px", padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                    <div>
                      <div style={{ fontSize: "14px", color: C.text }}>{job.name}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, marginTop: "2px" }}>Total value {fmt(job.value)}</div>
                    </div>
                    <Tag color={job.status === "active" ? C.green : C.amber}>{job.status.toUpperCase()}</Tag>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                    {INSTALLMENT_TYPES.map(inst => {
                      const done = job.payments.includes(inst.key);
                      const amount = Math.round(job.value * inst.pct);
                      return (
                        <div key={inst.key} style={{ background: done ? inst.color + "15" : C.surface2, border: `1px solid ${done ? inst.color + "44" : C.border}`, padding: "10px 12px" }}>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: done ? inst.color : C.textDim, marginBottom: "4px" }}>{done ? "✓ " : ""}{inst.label}</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "14px", color: done ? inst.color : C.textMid }}>{fmt(amount)}</div>
                          {inst.triggersPF && (
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "7px", color: done ? C.green : C.textDim, marginTop: "4px" }}>{done ? "PF FIRED" : "PF ON RECEIPT"}</div>
                          )}
                          {!inst.triggersPF && (
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "7px", color: C.textDim, marginTop: "4px" }}>PASSTHROUGH</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {remaining.length > 0 && (
                    <div style={{ marginTop: "12px", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}` }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginBottom: "6px" }}>NEXT EXPECTED</div>
                      {remaining.slice(0, 1).map(inst => {
                        const amount = Math.round(job.value * inst.pct);
                        const alloc  = inst.triggersPF ? calcAllocation(amount) : null;
                        return (
                          <div key={inst.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: "12px", color: C.text }}>{inst.label} — {fmt(amount)}</div>
                            {alloc && (
                              <div style={{ display: "flex", gap: "12px" }}>
                                {([["Tax", alloc.tax, C.red], ["Profit", alloc.profit, C.green], ["Reserve", alloc.reserve, C.amber], ["Ops", alloc.ops, C.gold]] as [string,number,string][]).map(([l, v, c]) => (
                                  <div key={l} style={{ textAlign: "center" as const }}>
                                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "7px", color: C.textDim }}>{l}</div>
                                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: c }}>{fmt(v)}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {!alloc && <Tag color={C.textDim}>PASSTHROUGH — ALL TO TRANSACTIONS</Tag>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {jobs.filter(j => j.status === "quoted").length > 0 && (
              <div style={{ marginTop: "20px" }}>
                <Label color={C.textDim}>Quoted — Not Yet Active</Label>
                {jobs.filter(j => j.status === "quoted").map(job => (
                  <div key={job.id} style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
                    <div style={{ fontSize: "13px" }}>{job.name}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "13px", color: C.gold }}>{fmt(job.value)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* CFO VIEW */}
        {view === "cfo" && (() => {
          const today      = new Date("2026-03-09");
          const payrolls   = getUpcomingPayrolls(today, 6);
          const monthlyRev = 20467 * 2.2;
          const gstCollected = monthlyRev * GST_RATE;
          const netBAS_q   = (gstCollected * 3) - (OPEX_GST_CREDIT * 3);
          const superQ     = MONTHLY_SUPER * 3;
          const totalDue60d = netBAS_q + superQ;
          const taxAcct    = accounts.tax;
          const taxShortfall = totalDue60d - taxAcct;
          const totalAllCash = Object.values(accounts).reduce((s,v)=>s+v,0);
          const runway     = totalAllCash / 34497.60;
          const pipelineVal = jobs.reduce((s,j) => s + j.value, 0);
          const monthlyTgt = 45027.40;
          const pipelineMths = pipelineVal / monthlyTgt;
          const wcRatio    = totalAllCash / totalDue60d;
          const MONTHLY_FIXED_ALL = 8167 + 8714.93 + (3886.89 * 26 / 12);
          const fixedCoverageRatio = monthlyRev / MONTHLY_FIXED_ALL;
          const revenueCoversFixed = fixedCoverageRatio >= 1.0;
          const cashEvents = [
            { date: new Date("2026-03-15"), label: "Pereira subframe",   amount:  5680, type: "in",  pf: true  },
            { date: new Date("2026-03-28"), label: "Henderson materials", amount: 11050, type: "in",  pf: false },
            { date: new Date("2026-04-05"), label: "Pereira final",       amount:  5680, type: "in",  pf: true  },
            { date: new Date("2026-04-12"), label: "Henderson subframe",  amount:  4420, type: "in",  pf: true  },
            { date: new Date("2026-04-28"), label: "BAS Q3 due",          amount: -netBAS_q, type: "tax", pf: false },
            { date: new Date("2026-04-28"), label: "Super Q3 due",        amount: -superQ,   type: "tax", pf: false },
            { date: new Date("2026-04-30"), label: "Henderson final",     amount:  4420, type: "in",  pf: true  },
            ...payrolls.slice(0, 6).map((d: Date) => ({ date: d, label: "Payroll", amount: -3886.89, type: "out", pf: false })),
            ...Array.from({length: 3}, (_, i) => ({
              date: new Date(today.getFullYear(), today.getMonth() + i, 1),
              label: "Fixed opex", amount: -8714.93, type: "out", pf: false
            })),
          ].sort((a, b) => a.date.getTime() - b.date.getTime());
          let running = accounts.transactions;
          const forecast = cashEvents.map(ev => {
            running += ev.amount;
            return { ...ev, running };
          });
          return (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
                {[
                  { label: "Runway",          value: `${runway.toFixed(1)} mo`,           sub: "at zero revenue",              color: tl(runway, 3, 1.5)              },
                  { label: "Pipeline Cover",  value: `${pipelineMths.toFixed(1)} mo`,     sub: "of target revenue in jobs",    color: tl(pipelineMths, 3, 1.5)        },
                  { label: "Working Capital", value: `${wcRatio.toFixed(1)}x`,            sub: "liquid assets vs obligations", color: tl(wcRatio, 2, 1)               },
                  { label: "Fixed Coverage",  value: `${fixedCoverageRatio.toFixed(2)}x`, sub: revenueCoversFixed ? "costs covered" : "below fixed costs", color: tl(fixedCoverageRatio, 1.3, 1.0) },
                ].map(m => (
                  <div key={m.label} style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: m.color, opacity: 0.7 }} />
                    <Label>{m.label}</Label>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "26px", color: m.color, lineHeight: 1 }}>{m.value}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, marginTop: "4px" }}>{m.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                {/* Tax Obligation Tracker */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "18px 20px" }}>
                  <Label color={C.red}>Tax Obligation Tracker</Label>
                  {BAS_QUARTERS.map((q, qi) => {
                    const gstOwed  = gstCollected * q.months - OPEX_GST_CREDIT * q.months;
                    const superOwed = MONTHLY_SUPER * q.months;
                    const total    = gstOwed + superOwed;
                    const daysUntil = Math.round((q.due.getTime() - today.getTime()) / 86400000);
                    const onTrack  = taxAcct >= total;
                    return (
                      <div key={q.label} style={{ background: C.surface2, border: `1px solid ${onTrack ? C.border : C.red + "44"}`, padding: "12px 14px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                          <div>
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.text }}>{q.label} — {q.period}</div>
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginTop: "2px" }}>due {q.due.toLocaleDateString("en-AU", {day:"numeric",month:"short",year:"numeric"})} · {daysUntil} days</div>
                          </div>
                          <Tag color={onTrack ? C.green : C.red}>{onTrack ? "ON TRACK" : "SHORTFALL"}</Tag>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                          {([["GST net", gstOwed, C.red], ["Super", superOwed, C.amber], ["Total due", total, C.text]] as [string,number,string][]).map(([l,v,c]) => (
                            <div key={l}>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "7px", color: C.textDim, marginBottom: "2px" }}>{l}</div>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "12px", color: c }}>{fmt(v)}</div>
                            </div>
                          ))}
                        </div>
                        {qi === 0 && (
                          <div style={{ paddingTop: "8px", borderTop: `1px solid ${C.border}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim }}>Tax account now</div>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: taxShortfall > 0 ? C.red : C.green }}>{fmt(taxAcct)}</div>
                            </div>
                            {taxShortfall > 0 && (
                              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.red }}>Shortfall</div>
                                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: C.red }}>{fmt(taxShortfall)}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
                    <Label>Monthly Accruing (at 2.2 jobs)</Label>
                    {([
                      ["GST collected",    gstCollected,                    C.red   ],
                      ["Less GST on opex", -OPEX_GST_CREDIT,               C.textDim],
                      ["Net GST/month",    gstCollected - OPEX_GST_CREDIT, C.red   ],
                      ["Super/month",      MONTHLY_SUPER,                  C.amber ],
                      ["PAYG/month",       PAYG_MONTHLY,                   C.blue  ],
                    ] as [string,number,string][]).map(([l,v,c]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>{l}</div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: c }}>{v < 0 ? `(${fmt(Math.abs(v))})` : fmt(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Payroll Calendar */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "18px 20px" }}>
                  <Label color={C.amber}>Payroll Calendar — Next 12 Weeks</Label>
                  {payrolls.map((d: Date, i: number) => {
                    const daysAway = Math.round((d.getTime() - today.getTime()) / 86400000);
                    const isClose  = daysAway <= 5;
                    const projBal  = accounts.transactions - (3886.89 * (i + 1));
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                        <div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: isClose ? C.amber : C.text }}>
                            {d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
                          </div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim }}>{daysAway} days</div>
                        </div>
                        <div style={{ textAlign: "right" as const }}>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: C.amber }}>$3,886.89</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: tl(projBal, 20000, 10000) }}>
                            trans → {fmt(Math.max(0, projBal))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: "12px", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}` }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginBottom: "4px" }}>PAYROLL ANNUAL</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "14px", color: C.text }}>{fmt(3886.89 * 26)}/year</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginTop: "2px" }}>26 fortnights · Tuesdays</div>
                  </div>
                </div>
              </div>
              {/* 30/60/90 Day Forecast */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <Label color={C.blue}>30 / 60 / 90 Day Forecast — Transactions Account</Label>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>starting balance {fmt(accounts.transactions)}</div>
                </div>
                <div style={{ overflowX: "auto" as const }}>
                  <div style={{ minWidth: "600px" }}>
                    {forecast.map((ev, i) => {
                      const daysOut = Math.round((ev.date.getTime() - today.getTime()) / 86400000);
                      const band    = daysOut <= 30 ? C.green : daysOut <= 60 ? C.amber : C.blue;
                      const isNeg   = ev.amount < 0;
                      return (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 180px 100px 100px 30px", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: band }}>
                            {ev.date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                          </div>
                          <div style={{ fontSize: "11px", color: ev.type === "tax" ? C.red : C.text }}>{ev.label}</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: isNeg ? C.red : C.green, textAlign: "right" as const }}>
                            {isNeg ? "" : "+"}{fmt(ev.amount)}
                          </div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: tl(ev.running, 20000, 10000), textAlign: "right" as const }}>
                            {fmt(ev.running)}
                          </div>
                          <div style={{ textAlign: "center" as const }}>
                            {ev.running < 10000 && <span style={{ color: C.red, fontSize: "10px" }}>⚠</span>}
                            {ev.running >= 10000 && ev.running < 20000 && <span style={{ color: C.amber, fontSize: "10px" }}>·</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ marginTop: "14px", background: C.bg, borderLeft: `3px solid ${C.gold}`, padding: "12px 16px" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.gold, marginBottom: "6px", letterSpacing: "0.1em" }}>JARVIS · CFO BRIEF</div>
                  <div style={{ fontSize: "12px", color: C.textMid, lineHeight: 1.7 }}>
                    {taxShortfall > 0
                      ? `BAS + super hits 28 April — ${fmt(totalDue60d)} owed. Tax account is ${fmt(taxShortfall)} short. The next two Profit First triggers will add ${fmt((5680 + 5680) * 0.25)} to Tax. Watch this.`
                      : `Tax account covers Q3 obligations with ${fmt(taxAcct - totalDue60d)} to spare. Next pressure point is BAS on 28 April.`
                    }
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        {/* HISTORY VIEW */}
        {view === "history" && (
          <div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px 80px 90px", padding: "8px 16px", borderBottom: `1px solid ${C.border}` }}>
                {["Date", "Job / Type", "Amount", "Profit First", ""].map(h => (
                  <div key={h} style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, letterSpacing: "0.1em", textAlign: h === "Amount" ? "right" as const : "left" as const }}>{h}</div>
                ))}
              </div>
              {history.map(item => (
                <PaymentRow key={item.id} item={item} onAllocate={(i) => setShowAlloc(i)} />
              ))}
            </div>
            <div style={{ marginTop: "16px", background: C.surface, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
              <Label>Profit First Totals — All Time</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                {([
                  ["Tax Allocated",     history.filter(h => h.pf).reduce((s, h) => s + (h.allocations?.tax || 0), 0),     C.red  ],
                  ["Profit Allocated",  history.filter(h => h.pf).reduce((s, h) => s + (h.allocations?.profit || 0), 0),  C.green],
                  ["Reserve Allocated", history.filter(h => h.pf).reduce((s, h) => s + (h.allocations?.reserve || 0), 0), C.amber],
                  ["Ops Allocated",     history.filter(h => h.pf).reduce((s, h) => s + (h.allocations?.ops || 0), 0),     C.gold ],
                ] as [string,number,string][]).map(([l, v, c]) => (
                  <div key={l}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginBottom: "4px" }}>{l}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "20px", color: c }}>{fmt(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* RULES VIEW */}
        {view === "rules" && (
          <div style={{ maxWidth: "680px" }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "20px 24px", marginBottom: "12px" }}>
              <Label color={C.gold}>The Model</Label>
              <div style={{ fontSize: "13px", color: C.textMid, lineHeight: 1.9 }}>
                Profit First fires on <strong style={{ color: C.text }}>subframe and final payments only</strong>. Deposit and materials installments are passthrough — they go straight to Transactions because they&apos;re either seed capital or liabilities about to be spent on materials within 14 days.
              </div>
            </div>
            {INSTALLMENT_TYPES.map(inst => (
              <div key={inst.key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${inst.color}`, padding: "14px 18px", marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: inst.color }}>{inst.label} ({pct(inst.pct)} of job value)</div>
                  <Tag color={inst.triggersPF ? C.green : C.textDim}>{inst.triggersPF ? "PROFIT FIRST" : "PASSTHROUGH"}</Tag>
                </div>
                <div style={{ fontSize: "12px", color: C.textMid }}>{inst.desc}</div>
                {inst.triggersPF && (
                  <div style={{ display: "flex", gap: "16px", marginTop: "10px" }}>
                    {([["Tax", PF.tax, C.red], ["Profit", PF.profit, C.green], ["Reserve", PF.reserve, C.amber], ["Transactions", PF.ops, C.gold]] as [string,number,string][]).map(([l, p, c]) => (
                      <div key={l} style={{ textAlign: "center" as const }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "7px", color: C.textDim, marginBottom: "2px" }}>{l}</div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "13px", color: c }}>{pct(p)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "16px 20px", marginTop: "4px" }}>
              <Label>Account Purposes</Label>
              {([
                ["Transactions",     C.gold,  "Everything flows through here. Payroll, expenses, card, receivables. Target $20-30k float."],
                ["Tax Holding",      C.red,   "BAS, super, income tax. Untouchable except for ATO lodgements. 15% of every Profit First trigger."],
                ["Operating Reserve",C.amber, "Payroll buffer + equipment fund. Minimum $12k — covers 3 weeks wages regardless of job timing."],
                ["Profit",           C.green, "Business profit. Never goes backwards. Grows until you choose to distribute or reinvest."],
              ] as [string,string,string][]).map(([l, c, d]) => (
                <div key={l} style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: "8px", height: "8px", background: c, marginTop: "4px", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: c, marginBottom: "3px" }}>{l}</div>
                    <div style={{ fontSize: "12px", color: C.textMid }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* RECORD PAYMENT MODAL */}
      {showPayment && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border2}`, padding: "28px", width: "440px" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.gold, letterSpacing: "0.2em", marginBottom: "4px" }}>RECORD PAYMENT</div>
            <div style={{ fontSize: "18px", marginBottom: "20px" }}>Incoming Installment</div>
            <div style={{ marginBottom: "14px" }}>
              <Label>Job</Label>
              <select value={payment.jobId} onChange={e => setPayment(p => ({ ...p, jobId: e.target.value }))}
                style={{ width: "100%", background: C.surface2, border: `1px solid ${C.border2}`, color: C.text, fontFamily: "Georgia,serif", fontSize: "13px", padding: "8px 10px", outline: "none" }}>
                <option value="">Select job...</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "14px" }}>
              <Label>Installment Type</Label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {INSTALLMENT_TYPES.map(inst => (
                  <button key={inst.key} onClick={() => setPayment(p => ({ ...p, type: inst.key }))}
                    style={{ background: payment.type === inst.key ? inst.color + "22" : C.surface2, border: `1px solid ${payment.type === inst.key ? inst.color : C.border2}`, color: payment.type === inst.key ? inst.color : C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "10px 8px", cursor: "pointer", textAlign: "left" as const }}>
                    <div style={{ marginBottom: "3px" }}>{inst.label}</div>
                    <div style={{ fontSize: "7px", opacity: 0.7 }}>{inst.triggersPF ? "→ Profit First" : "→ Passthrough"}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <Label>Amount Received</Label>
              <input type="number" placeholder="0" value={payment.amount}
                onChange={e => setPayment(p => ({ ...p, amount: e.target.value }))}
                style={{ width: "100%", background: C.surface2, border: `1px solid ${C.border2}`, color: C.text, fontFamily: "'DM Mono',monospace", fontSize: "18px", padding: "10px 12px", outline: "none" }} />
            </div>
            {payment.amount && INSTALLMENT_TYPES.find(t => t.key === payment.type)?.triggersPF && (() => {
              const alloc = calcAllocation(parseFloat(payment.amount) || 0);
              return (
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: "12px", marginBottom: "16px" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginBottom: "8px" }}>PROFIT FIRST SPLIT PREVIEW</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                    {([["Tax", alloc.tax, C.red], ["Profit", alloc.profit, C.green], ["Reserve", alloc.reserve, C.amber], ["Ops", alloc.ops, C.gold]] as [string,number,string][]).map(([l, v, c]) => (
                      <div key={l} style={{ textAlign: "center" as const }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "7px", color: C.textDim, marginBottom: "2px" }}>{l}</div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "14px", color: c }}>{fmt(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {payment.amount && !INSTALLMENT_TYPES.find(t => t.key === payment.type)?.triggersPF && (
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: "10px 12px", marginBottom: "16px" }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>
                  Passthrough — {fmt(parseFloat(payment.amount) || 0)} goes straight to Transactions. No split.
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={recordPayment} style={{ flex: 1, background: C.gold, color: C.bg, border: "none", fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "12px", cursor: "pointer", letterSpacing: "0.1em" }}>
                RECORD PAYMENT
              </button>
              <button onClick={() => setShowPayment(false)} style={{ background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "12px 16px", cursor: "pointer" }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PROFIT FIRST CONFIRMATION MODAL */}
      {pendingAlloc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.gold}44`, padding: "32px", width: "420px" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.gold, letterSpacing: "0.2em", marginBottom: "4px" }}>JARVIS · PROFIT FIRST</div>
            <div style={{ fontSize: "18px", marginBottom: "6px" }}>{fmt(pendingAlloc.amount)} received</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textDim, marginBottom: "24px" }}>{pendingAlloc.job} · {pendingAlloc.type}</div>
            <div style={{ marginBottom: "24px" }}>
              {([
                ["→ Tax Holding",       pendingAlloc.alloc.tax,     C.red,   "25%"],
                ["→ Profit",            pendingAlloc.alloc.profit,  C.green, "10%"],
                ["→ Operating Reserve", pendingAlloc.alloc.reserve, C.amber, "10%"],
                ["→ Transactions",      pendingAlloc.alloc.ops,     C.gold,  "55%"],
              ] as [string,number,string,string][]).map(([l, v, c, p]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", marginBottom: "4px", background: c + "12", border: `1px solid ${c}33` }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: c }}>{l}</div>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>{p}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "14px", color: c }}>{fmt(v)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={confirmAllocation} style={{ flex: 1, background: C.gold, color: C.bg, border: "none", fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "12px", cursor: "pointer", letterSpacing: "0.1em" }}>
                CONFIRM · APPLY ALLOCATION
              </button>
              <button onClick={() => setPendingAlloc(null)} style={{ background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "12px 16px", cursor: "pointer" }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ALLOCATION DETAIL MODAL */}
      {showAlloc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border2}`, padding: "28px", width: "380px" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.gold, letterSpacing: "0.2em", marginBottom: "4px" }}>ALLOCATION DETAIL</div>
            <div style={{ fontSize: "16px", marginBottom: "4px" }}>{showAlloc.job}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, marginBottom: "20px" }}>{showAlloc.date} · {fmt(showAlloc.amount)}</div>
            {showAlloc.allocations && ([
              ["Tax",     showAlloc.allocations.tax,     C.red  ],
              ["Profit",  showAlloc.allocations.profit,  C.green],
              ["Reserve", showAlloc.allocations.reserve, C.amber],
              ["Ops",     showAlloc.allocations.ops,     C.gold ],
            ] as [string,number,string][]).map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textDim }}>{l}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "13px", color: c }}>{fmt(v)}</div>
              </div>
            ))}
            <button onClick={() => setShowAlloc(null)} style={{ marginTop: "16px", width: "100%", background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "10px", cursor: "pointer" }}>
              CLOSE
            </button>
          </div>
        </div>
      )}
      {/* EDIT ACCOUNT BALANCE MODAL */}
      {editAccount && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border2}`, padding: "28px", width: "340px" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.gold, letterSpacing: "0.2em", marginBottom: "4px" }}>UPDATE BALANCE</div>
            <div style={{ fontSize: "16px", marginBottom: "20px", textTransform: "capitalize" as const }}>{editAccount.replace(/([A-Z])/g, ' $1')}</div>
            <input type="number" defaultValue={accounts[editAccount as keyof typeof accounts]}
              id="editBalanceInput"
              style={{ width: "100%", background: C.surface2, border: `1px solid ${C.border2}`, color: C.text, fontFamily: "'DM Mono',monospace", fontSize: "20px", padding: "10px 12px", outline: "none", marginBottom: "16px" }} />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => {
                const el = document.getElementById("editBalanceInput") as HTMLInputElement;
                const val = parseFloat(el?.value ?? "");
                if (!isNaN(val)) {
                  setAccounts(prev => ({ ...prev, [editAccount]: val }));
                  fetch('/api/pf-accounts', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: editAccount, balance: val }),
                  }).catch(() => {});
                }
                setEditAccount(null);
              }} style={{ flex: 1, background: C.gold, color: C.bg, border: "none", fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "10px", cursor: "pointer" }}>
                SAVE
              </button>
              <button onClick={() => setEditAccount(null)} style={{ background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "10px 14px", cursor: "pointer" }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
