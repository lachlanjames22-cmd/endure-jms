'use client'

import { useState, useMemo, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart } from "recharts";
// ─── DESIGN SYSTEM ────────────────────────────────────────────────────────────
const C = {
  bg:       "#13131a",
  surface:  "#1c1c26",
  surface2: "#22222e",
  border:   "#2a2a38",
  border2:  "#333344",
  gold:     "#c9a06a",
  text:     "#f0ebe3",
  textMid:  "#a09890",
  textDim:  "#6a6460",
  green:    "#34d399",
  amber:    "#fbbf24",
  red:      "#f87171",
  blue:     "#60a5fa",
  purple:   "#a78bfa",
};
// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TODAY        = new Date("2026-03-09");
const OPENING_BAL  = 24300;
const PAYROLL_AMT  = 3886.89;
const OPEX_MONTHLY = 8714.93;
const WARN_LINE    = 20000;
const CRIT_LINE    = 10000;
const CREDIT_LIMIT = 65000;
const CREDIT_DRAWN = 5000;
const GST_RATE_REV   = 0.10;
const SUPER_MONTHLY  = 1314.72;
const PAYG_MONTHLY   = 2779.31;
const LIAB_DAILY     = (GST_RATE_REV * 20467 * 2.2 + SUPER_MONTHLY + PAYG_MONTHLY) / 30.4;

const PIPELINE_JOBS = [
  { id: "j1", client: "Pereira",   suburb: "Mosman Park",  value: 28400, colorId: "green",  payments: ["deposit","materials","subframe"] },
  { id: "j2", client: "Henderson", suburb: "Applecross",   value: 22100, colorId: "amber",  payments: ["deposit","materials"] },
  { id: "j3", client: "Mitchell",  suburb: "Cottesloe",    value: 31800, colorId: "blue",   payments: [] },
  { id: "j4", client: "Williams",  suburb: "Nedlands",     value: 42000, colorId: "purple", payments: [] },
];

const INSTALLMENT_DEFS = [
  { key: "deposit",   label: "10% Deposit",   pct: 0.10, color: C.textDim },
  { key: "materials", label: "50% Materials", pct: 0.50, color: C.blue   },
  { key: "subframe",  label: "20% Subframe",  pct: 0.20, color: C.amber  },
  { key: "final",     label: "Final",         pct: 0.20, color: C.green  },
];

const JOB_COLORS: Record<string, string> = {
  green:  C.green,
  amber:  C.amber,
  blue:   C.blue,
  purple: C.purple,
  gold:   C.gold,
};

function getPayrollDates(start: Date, end: Date): Date[] {
  const anchor = new Date("2026-02-24");
  const dates: Date[] = [];
  let d = new Date(anchor);
  while (d <= end) {
    d = new Date(d.getTime() + 14 * 86400000);
    if (d >= start && d <= end) dates.push(new Date(d));
  }
  return dates;
}

interface CashflowEvent {
  id: string;
  date: string;
  label: string;
  amount: number;
  type: string;
  jobId?: string | null;
  installment?: string;
  locked: boolean;
  recurring?: boolean;
}

function buildRecurringEvents(start: Date, end: Date): CashflowEvent[] {
  const events: CashflowEvent[] = [];
  const payrolls = getPayrollDates(start, end);
  payrolls.forEach(d => {
    events.push({ id: `pay-${d.toISOString()}`, date: d.toISOString().slice(0,10), label: "Payroll", amount: -PAYROLL_AMT, type: "payroll", recurring: true, locked: false });
  });
  let m = new Date(start.getFullYear(), start.getMonth(), 1);
  while (m <= end) {
    if (m >= start) {
      events.push({ id: `opex-${m.toISOString()}`, date: m.toISOString().slice(0,10), label: "Fixed Opex", amount: -OPEX_MONTHLY, type: "opex", recurring: true, locked: true });
    }
    m = new Date(m.getFullYear(), m.getMonth() + 1, 1);
  }
  return events;
}

const RANGE_DAYS = 90;
const END_DATE   = new Date(TODAY.getTime() + RANGE_DAYS * 86400000);

const SEED_EVENTS: CashflowEvent[] = [
  { id: "e1", date: "2026-03-01", label: "Wellard — Final",           amount:  4090,  type: "receivable", jobId: null, locked: false },
  { id: "e2", date: "2026-03-05", label: "Ad spend — March",          amount: -1200,  type: "expense",    jobId: null, locked: false },
  { id: "e3", date: "2026-03-15", label: "Pereira — Subframe",        amount:  5680,  type: "receivable", jobId: "j1", installment: "subframe", locked: false },
  { id: "e4", date: "2026-03-28", label: "Henderson — Materials",     amount: 11050,  type: "receivable", jobId: "j2", installment: "materials", locked: false },
  { id: "e5", date: "2026-04-05", label: "Pereira — Final",           amount:  5680,  type: "receivable", jobId: "j1", installment: "final",    locked: false },
  { id: "e6", date: "2026-04-12", label: "Henderson — Subframe",      amount:  4420,  type: "receivable", jobId: "j2", installment: "subframe", locked: false },
  { id: "e7", date: "2026-04-28", label: "BAS Q3",                    amount: -11207, type: "tax",        jobId: null, locked: false },
  { id: "e8", date: "2026-04-28", label: "Super Q3",                  amount: -3944,  type: "tax",        jobId: null, locked: false },
  { id: "e9", date: "2026-04-30", label: "Henderson — Final",         amount:  4420,  type: "receivable", jobId: "j2", installment: "final",    locked: false },
];

const fmt    = (n: number) => "$" + Math.abs(Math.round(n)).toLocaleString();
const fmtSgn = (n: number) => (n >= 0 ? "+" : "−") + "$" + Math.abs(Math.round(n)).toLocaleString();
const tl     = (v: number) => v >= WARN_LINE ? C.green : v >= CRIT_LINE ? C.amber : C.red;

function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px", color: color||C.textDim, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:"6px" }}>
      {children}
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", padding:"2px 7px", background:(color||C.gold)+"22", color:color||C.gold, letterSpacing:"0.08em" }}>
      {children}
    </span>
  );
}

interface ChartDay {
  date: string;
  label: string;
  balance: number;
  liability: number;
  ownedBal: number;
  profitLine: number;
  creditLine: number;
  inflow: number;
  outflow: number;
  events: CashflowEvent[];
  isToday: boolean;
  isPast: boolean;
}

function buildChartData(
  events: CashflowEvent[],
  recurringEvents: CashflowEvent[],
  openingBalance: number,
  rangeStart: Date,
  rangeEnd: Date,
  taxAccountBal: number
): ChartDay[] {
  const allEvents = [...events, ...recurringEvents].sort((a,b) => a.date.localeCompare(b.date));
  const days: ChartDay[] = [];
  let balance = openingBalance;
  let liabilityAccrued = 0;
  let d = new Date(rangeStart);
  const endTs  = rangeEnd.getTime();
  const todayStr = TODAY.toISOString().slice(0,10);
  while (d.getTime() <= endTs) {
    const dateStr   = d.toISOString().slice(0,10);
    const dayEvents = allEvents.filter(e => e.date === dateStr);
    const inflow    = dayEvents.filter(e => e.amount > 0).reduce((s,e) => s + e.amount, 0);
    const outflow   = dayEvents.filter(e => e.amount < 0).reduce((s,e) => s + e.amount, 0);
    balance += inflow + outflow;
    const taxPaid = dayEvents.filter(e => e.type === "tax" && e.amount < 0).reduce((s,e) => s + Math.abs(e.amount), 0);
    liabilityAccrued += LIAB_DAILY;
    liabilityAccrued = Math.max(0, liabilityAccrued - taxPaid);
    const ownedBalance = balance - liabilityAccrued;
    const profitLine   = Math.max(0, ownedBalance - 12000);
    const isToday = dateStr === todayStr;
    days.push({
      date:      dateStr,
      label:     `${d.getDate()}/${d.getMonth()+1}`,
      balance:   Math.round(balance),
      liability: Math.round(liabilityAccrued),
      ownedBal:  Math.round(ownedBalance),
      profitLine:Math.round(profitLine),
      creditLine:Math.round(balance + (CREDIT_LIMIT - CREDIT_DRAWN)),
      inflow:    Math.round(inflow),
      outflow:   Math.round(outflow),
      events:    dayEvents,
      isToday,
      isPast:    d < TODAY,
    });
    d = new Date(d.getTime() + 86400000);
  }
  return days;
}

function ChartTooltip({ active, payload, overlays = {} }: { active?: boolean; payload?: Array<{ payload: ChartDay }>; label?: string; overlays?: Record<string, boolean> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border2}`, padding: "10px 14px", minWidth: "220px" }}>
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px", color: C.textDim, marginBottom:"6px" }}>{d.date}</div>
      <div style={{ display:"flex", gap:"12px", marginBottom:"8px", flexWrap:"wrap" }}>
        <div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"7px", color: C.textDim }}>CASH</div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"15px", color: tl(d.balance) }}>{fmt(d.balance)}</div>
        </div>
        {overlays.liability && (
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"7px", color: C.textDim }}>LIABILITY</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"15px", color: C.red }}>{fmt(d.liability)}</div>
          </div>
        )}
        {(overlays.profit || overlays.liability) && (
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"7px", color: C.textDim }}>YOURS</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"15px", color: C.green }}>{fmt(d.ownedBal)}</div>
          </div>
        )}
      </div>
      {d.events.length > 0 && (
        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:"6px" }}>
          {d.events.map((ev,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", gap:"12px", padding:"2px 0" }}>
              <div style={{ fontSize:"11px", color: C.textMid }}>{ev.label}</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color: ev.amount >= 0 ? C.green : C.red }}>
                {fmtSgn(ev.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type DragState =
  | { type: "event"; id: string }
  | { type: "job"; job: typeof PIPELINE_JOBS[0]; installment: string }
  | null;

export default function CashflowTracker() {
  const [events,       setEvents]       = useState<CashflowEvent[]>(SEED_EVENTS);
  const [view,         setView]         = useState("chart");
  const [showAdd,      setShowAdd]      = useState(false);
  const [showJobPick,  setShowJobPick]  = useState<{ date: string } | null>(null);
  const [drag,         setDrag]         = useState<DragState>(null);
  const [dragOver,     setDragOver]     = useState<string | null>(null);
  const [newEvent,     setNewEvent]     = useState({ date: TODAY.toISOString().slice(0,10), label: "", amount: "", type: "receivable" });
  const [editEvent,    setEditEvent]    = useState<(CashflowEvent & { amountAbs: string; isNegative: boolean }) | null>(null);
  const [overlays,     setOverlays]     = useState({ liability: true, profit: false, credit: false });
  const toggleOverlay = (key: string) => setOverlays(o => ({ ...o, [key]: !o[key as keyof typeof o] }));
  const [recurringEvents, setRecurringEvents] = useState<CashflowEvent[]>(() => buildRecurringEvents(TODAY, END_DATE));
  const taxAccountBal = 11200;

  const chartData = useMemo(
    () => buildChartData(events, recurringEvents, OPENING_BAL, TODAY, END_DATE, taxAccountBal),
    [events, recurringEvents]
  );
  const chartDataThin = useMemo(() => chartData.filter((_,i) => i % 3 === 0 || chartData[i].events.length > 0), [chartData]);
  const minBalance = Math.min(...chartData.map(d => d.balance));
  const maxBalance = Math.max(...chartData.map(d => d.balance));
  const finalBalance = chartData[chartData.length - 1]?.balance || OPENING_BAL;

  const totalIn  = events.filter(e => e.amount > 0).reduce((s,e) => s + e.amount, 0)
                 + recurringEvents.filter(e => e.amount > 0).reduce((s,e) => s + e.amount, 0);
  const totalOut = events.filter(e => e.amount < 0).reduce((s,e) => s + Math.abs(e.amount), 0)
                 + recurringEvents.filter(e => e.amount < 0).reduce((s,e) => s + Math.abs(e.amount), 0);

  const addEvent = useCallback(() => {
    const amt = parseFloat(newEvent.amount);
    if (!newEvent.label || !amt || !newEvent.date) return;
    const sign = newEvent.type === "receivable" ? Math.abs(amt) : -Math.abs(amt);
    setEvents(prev => [...prev, { id: `e${Date.now()}`, ...newEvent, amount: sign, locked: false }]);
    setShowAdd(false);
    setNewEvent({ date: TODAY.toISOString().slice(0,10), label: "", amount: "", type: "receivable" });
  }, [newEvent]);

  const addJobInstallment = useCallback((job: typeof PIPELINE_JOBS[0], installmentKey: string, date: string) => {
    const inst  = INSTALLMENT_DEFS.find(i => i.key === installmentKey)!;
    const amount = Math.round(job.value * inst.pct);
    setEvents(prev => [...prev, {
      id:          `e${Date.now()}`,
      date,
      label:       `${job.client} — ${inst.label}`,
      amount,
      type:        "receivable",
      jobId:       job.id,
      installment: installmentKey,
      locked:      false,
    }]);
    setShowJobPick(null);
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setRecurringEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const openEdit = useCallback((ev: CashflowEvent) => {
    if (ev.locked) return;
    setEditEvent({
      ...ev,
      amountAbs: String(Math.abs(ev.amount)),
      isNegative: ev.amount < 0,
    });
  }, []);

  const saveEdit = useCallback(() => {
    if (!editEvent) return;
    const amt    = parseFloat(editEvent.amountAbs) || 0;
    const signed = editEvent.isNegative ? -Math.abs(amt) : Math.abs(amt);
    const patch  = { label: editEvent.label, date: editEvent.date, amount: signed, type: editEvent.type };
    const inUser = events.some(e => e.id === editEvent.id);
    if (inUser) {
      setEvents(prev => prev.map(e => e.id !== editEvent.id ? e : { ...e, ...patch }));
    } else {
      setRecurringEvents(prev => prev.map(e => e.id !== editEvent.id ? e : { ...e, ...patch }));
    }
    setEditEvent(null);
  }, [editEvent, events]);

  const handleEventDrop = useCallback((targetDate: string) => {
    if (!drag) return;
    if (drag.type === "event") {
      setEvents(prev => prev.map(e => e.id === drag.id ? { ...e, date: targetDate } : e));
    } else if (drag.type === "job") {
      addJobInstallment(drag.job, drag.installment, targetDate);
    }
    setDrag(null);
    setDragOver(null);
  }, [drag, addJobInstallment]);

  const scheduleWeeks = useMemo(() => {
    const weeks: Array<Array<{ date: string; day: number; month: number; dow: number; events: CashflowEvent[] }>> = [];
    let d = new Date(TODAY);
    const dow = d.getDay();
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    while (d <= END_DATE) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = d.toISOString().slice(0,10);
        const dayEvts = [...events, ...recurringEvents].filter(e => e.date === dateStr);
        week.push({ date: dateStr, day: d.getDate(), month: d.getMonth(), dow: d.getDay(), events: dayEvts });
        d = new Date(d.getTime() + 86400000);
      }
      weeks.push(week);
    }
    return weeks;
  }, [events, recurringEvents]);

  const availableInstallments = useMemo(() => {
    const result: Array<{ job: typeof PIPELINE_JOBS[0]; inst: typeof INSTALLMENT_DEFS[0] }> = [];
    PIPELINE_JOBS.forEach(job => {
      INSTALLMENT_DEFS.forEach(inst => {
        const alreadyReceived  = job.payments.includes(inst.key);
        const alreadyScheduled = events.some(e => e.jobId === job.id && e.installment === inst.key);
        if (!alreadyReceived && !alreadyScheduled) {
          result.push({ job, inst });
        }
      });
    });
    return result;
  }, [events]);

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Georgia,serif" }}>
      {/* ── HEADER ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.gold, letterSpacing: "0.2em", marginBottom: "2px" }}>ENDURE OS · FINANCE</div>
          <div style={{ fontSize: "20px" }}>Cashflow Tracker</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {[
            { label: "Opening",  value: fmt(OPENING_BAL), color: C.textMid },
            { label: "90d In",   value: fmt(totalIn),     color: C.green   },
            { label: "90d Out",  value: fmt(totalOut),    color: C.red     },
            { label: "Closing",  value: fmt(finalBalance),color: tl(finalBalance) },
          ].map(p => (
            <div key={p.label} style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim }}>{p.label}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "14px", color: p.color }}>{p.value}</div>
            </div>
          ))}
          <button onClick={() => setShowAdd(true)}
            style={{ background: C.gold, color: C.bg, border: "none", fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "10px 16px", cursor: "pointer", letterSpacing: "0.1em" }}>
            + ADD EVENT
          </button>
        </div>
      </div>
      {/* ── TABS ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex" }}>
        {[["chart","Rolling Chart"], ["schedule","Schedule View"], ["events","All Events"]].map(([v,l]) => (
          <button key={v} onClick={() => setView(v)}
            style={{ background: "transparent", border: "none", borderBottom: view === v ? `2px solid ${C.gold}` : "2px solid transparent", color: view === v ? C.gold : C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "12px 16px", cursor: "pointer", letterSpacing: "0.1em" }}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{ padding: "24px" }}>
        {/* ── CHART VIEW ── */}
        {view === "chart" && (
          <div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "center", flexWrap: "wrap" }}>
              {([[C.green,"≥$20k"],[C.amber,"$10–20k"],[C.red,"<$10k"]] as [string,string][]).map(([c,l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "10px", height: "3px", background: c }} />
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim }}>{l}</div>
                </div>
              ))}
              <div style={{ width: "1px", height: "16px", background: C.border, margin: "0 4px" }} />
              {[
                { key: "liability", label: "LIABILITY",  color: C.red,    desc: "Tax accruing daily" },
                { key: "profit",    label: "YOURS",      color: C.green,  desc: "Cash minus liability" },
                { key: "credit",    label: "W/ CREDIT",  color: C.purple, desc: `+${fmt(CREDIT_LIMIT - CREDIT_DRAWN)} facility` },
              ].map(o => (
                <button key={o.key} onClick={() => toggleOverlay(o.key)}
                  title={o.desc}
                  style={{
                    background: overlays[o.key as keyof typeof overlays] ? o.color + "22" : "transparent",
                    border: `1px solid ${overlays[o.key as keyof typeof overlays] ? o.color : C.border2}`,
                    color: overlays[o.key as keyof typeof overlays] ? o.color : C.textDim,
                    fontFamily: "'DM Mono',monospace", fontSize: "8px",
                    padding: "3px 10px", cursor: "pointer", letterSpacing: "0.08em",
                    display: "flex", alignItems: "center", gap: "5px",
                  }}>
                  <div style={{ width: "8px", height: "2px", background: overlays[o.key as keyof typeof overlays] ? o.color : C.textDim, opacity: overlays[o.key as keyof typeof overlays] ? 1 : 0.4 }} />
                  {o.label}
                </button>
              ))}
              <div style={{ marginLeft: "auto", fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>
                min {fmt(minBalance)} · max {fmt(maxBalance)} · 90d
              </div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "20px 8px 20px 20px", marginBottom: "16px" }}>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartDataThin} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
                  <defs>
                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.gold}   stopOpacity={0.12} />
                      <stop offset="95%" stopColor={C.gold}   stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="liabGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.red}    stopOpacity={0.18} />
                      <stop offset="95%" stopColor={C.red}    stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="ownedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.green}  stopOpacity={0.14} />
                      <stop offset="95%" stopColor={C.green}  stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontFamily:"'DM Mono',monospace", fontSize:9, fill: C.textDim }}
                    tickLine={false} axisLine={{ stroke: C.border }} interval={6} />
                  <YAxis tick={{ fontFamily:"'DM Mono',monospace", fontSize:9, fill: C.textDim }}
                    tickLine={false} axisLine={false}
                    tickFormatter={(v) => "$" + ((v as number)/1000).toFixed(0) + "k"}
                    domain={[0, Math.max(maxBalance, CREDIT_LIMIT) + 8000]} />
                  <Tooltip content={<ChartTooltip overlays={overlays} />} />
                  <ReferenceLine y={WARN_LINE} stroke={C.amber} strokeDasharray="4 4" strokeWidth={1}
                    label={{ value: "$20k", position: "insideTopRight", fill: C.amber, fontFamily:"'DM Mono',monospace", fontSize: 8 }} />
                  <ReferenceLine y={CRIT_LINE} stroke={C.red} strokeDasharray="4 4" strokeWidth={1}
                    label={{ value: "$10k", position: "insideTopRight", fill: C.red, fontFamily:"'DM Mono',monospace", fontSize: 8 }} />
                  <ReferenceLine x={chartDataThin.find(d => d.isToday)?.label}
                    stroke={C.gold} strokeDasharray="3 3" strokeWidth={1}
                    label={{ value: "today", position: "top", fill: C.gold, fontFamily:"'DM Mono',monospace", fontSize: 8 }} />
                  {overlays.credit && (
                    <ReferenceLine y={OPENING_BAL + (CREDIT_LIMIT - CREDIT_DRAWN)} stroke={C.purple} strokeDasharray="6 3" strokeWidth={1}
                      label={{ value: `credit ceiling ${fmt(OPENING_BAL + CREDIT_LIMIT - CREDIT_DRAWN)}`, position: "insideTopLeft", fill: C.purple, fontFamily:"'DM Mono',monospace", fontSize: 8 }} />
                  )}
                  {overlays.liability && (
                    <Area type="monotone" dataKey="liability" stroke={C.red} strokeWidth={1.5}
                      strokeDasharray="4 2" fill="url(#liabGrad)"
                      dot={false} activeDot={{ r: 3, fill: C.red }} />
                  )}
                  {overlays.profit && (
                    <Area type="monotone" dataKey="ownedBal" stroke={C.green} strokeWidth={1.5}
                      fill="url(#ownedGrad)" dot={false} activeDot={{ r: 3, fill: C.green }} />
                  )}
                  {overlays.credit && (
                    <Line type="monotone" dataKey="creditLine" stroke={C.purple} strokeWidth={1}
                      strokeDasharray="3 3" dot={false} />
                  )}
                  <Area type="monotone" dataKey="balance" stroke={C.gold} strokeWidth={2.5}
                    fill="url(#balGrad)" dot={false} activeDot={{ r: 5, fill: C.gold, stroke: C.bg, strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {(() => {
              const todayData = chartData.find(d => d.isToday) || chartData[0];
              if (!todayData) return null;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
                  {[
                    { label: "Cash (Transactions)", value: fmt(todayData.balance),   color: C.gold,   sub: "what's in the account",                          visible: true },
                    { label: "Liability Accrued",   value: fmt(todayData.liability), color: C.red,    sub: "tax, super, PAYG building up",                   visible: overlays.liability },
                    { label: "What's Yours",        value: fmt(todayData.ownedBal),  color: C.green,  sub: "cash minus all liabilities",                     visible: overlays.profit || overlays.liability },
                    { label: "With Credit",         value: fmt(todayData.creditLine),color: C.purple, sub: `$${(CREDIT_LIMIT-CREDIT_DRAWN)/1000}k facility available`, visible: overlays.credit },
                  ].filter(m => m.visible).map(m => (
                    <div key={m.label} style={{ background: C.surface, border: `1px solid ${m.color}33`, borderTop: `2px solid ${m.color}`, padding: "12px 14px" }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginBottom: "4px" }}>{m.label}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "22px", color: m.color, lineHeight: 1 }}>{m.value}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginTop: "4px" }}>{m.sub}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {(() => {
              const todayData = chartData.find(d => d.isToday) || chartData[0];
              if (!todayData) return null;
              const liabPct = todayData.liability / todayData.balance;
              const dangerDays = chartData.filter(d => !d.isPast && d.balance < d.liability + 5000);
              if (liabPct > 0.3 || dangerDays.length > 0) {
                return (
                  <div style={{ background: C.surface, borderLeft: `3px solid ${C.red}`, padding: "12px 16px", marginBottom: "20px" }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.red, marginBottom: "5px", letterSpacing: "0.1em" }}>JARVIS · LIABILITY ALERT</div>
                    <div style={{ fontSize: "12px", color: C.textMid, lineHeight: 1.7 }}>
                      {dangerDays.length > 0
                        ? `In ${Math.round((new Date(dangerDays[0].date).getTime() - TODAY.getTime()) / 86400000)} days your cash balance could approach your liability balance. Before touching the tax account, check the credit facility first — $${(CREDIT_LIMIT - CREDIT_DRAWN)/1000}k available at no cost until you draw it.`
                        : `Liability is ${Math.round(liabPct * 100)}% of your cash balance and growing. BAS hits 28 April. The tax account exists for exactly this — don't let a cashflow dip tempt you to spend it.`
                      }
                    </div>
                  </div>
                );
              }
              return (
                <div style={{ background: C.surface, borderLeft: `3px solid ${C.gold}`, padding: "12px 16px", marginBottom: "20px" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.gold, marginBottom: "5px", letterSpacing: "0.1em" }}>JARVIS · CASH BRIEF</div>
                  <div style={{ fontSize: "12px", color: C.textMid, lineHeight: 1.7 }}>
                    Liability is {Math.round(liabPct * 100)}% of cash — healthy gap. The red line growing under the gold is normal; that's tax accruing on revenue you've already earned. It clears at BAS time. What's truly yours is the green line — currently {fmt(todayData.ownedBal)}.
                  </div>
                </div>
              );
            })()}
            <div>
              <Label>Significant Events — Next 90 Days</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {chartData.filter(d => d.events.length > 0 && !d.isPast).slice(0, 9).map(d => (
                  <div key={d.date} style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "10px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>{d.date}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: tl(d.balance) }}>{fmt(d.balance)}</div>
                    </div>
                    {d.events.map((ev,i) => (
                      <div key={i} onClick={() => openEdit(ev)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0", cursor: ev.locked ? "default" : "pointer" }}>
                        <div style={{ fontSize: "11px", color: C.textMid, flex: 1 }}>{ev.label}</div>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: ev.amount >= 0 ? C.green : C.red }}>
                            {fmtSgn(ev.amount)}
                          </div>
                          {!ev.locked && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim }}>✎</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* ── SCHEDULE VIEW ── */}
        {view === "schedule" && (
          <div>
            <div style={{ display: "flex", gap: "16px" }}>
              <div style={{ width: "220px", flexShrink: 0 }}>
                <Label color={C.gold}>Drag to Schedule</Label>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginBottom: "10px" }}>
                  Unscheduled job payments. Drag onto any date.
                </div>
                {PIPELINE_JOBS.map(job => {
                  const jobInstallments = availableInstallments.filter(a => a.job.id === job.id);
                  if (jobInstallments.length === 0) return null;
                  return (
                    <div key={job.id} style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                        <div style={{ width: "8px", height: "8px", background: JOB_COLORS[job.colorId] || C.gold, borderRadius: "50%" }} />
                        <div style={{ fontSize: "11px", color: C.text }}>{job.client}</div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim }}>{job.suburb}</div>
                      </div>
                      {jobInstallments.map(({ inst }) => (
                        <div key={inst.key}
                          draggable
                          onDragStart={() => setDrag({ type: "job", job, installment: inst.key })}
                          onDragEnd={() => setDrag(null)}
                          style={{
                            background: (JOB_COLORS[job.colorId] || C.gold) + "18",
                            border: `1px solid ${JOB_COLORS[job.colorId] || C.gold}44`,
                            padding: "6px 10px", marginBottom: "4px", cursor: "grab",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                          }}>
                          <div>
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: inst.color }}>{inst.label}</div>
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.text }}>{fmt(Math.round(job.value * inst.pct))}</div>
                          </div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>⠿</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {availableInstallments.length === 0 && (
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, fontStyle: "italic" }}>
                    All installments scheduled.
                  </div>
                )}
                <div style={{ marginTop: "16px", borderTop: `1px solid ${C.border}`, paddingTop: "12px" }}>
                  <Label>Quick Add</Label>
                  <button onClick={() => setShowAdd(true)}
                    style={{ width: "100%", background: "transparent", border: `1px dashed ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "8px", cursor: "pointer" }}>
                    + MANUAL EVENT
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowX: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", marginBottom: "3px" }}>
                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                    <div key={d} style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, textAlign: "center", padding: "4px 0" }}>{d}</div>
                  ))}
                </div>
                {scheduleWeeks.map((week, wi) => {
                  const firstNonSun = week.find(d => d.dow === 1);
                  const showMonth = (firstNonSun?.day ?? 8) <= 7;
                  return (
                    <div key={wi}>
                      {showMonth && (
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.gold, letterSpacing: "0.1em", padding: "6px 0 2px", marginTop: "4px" }}>
                          {MONTH_NAMES[week[0].month]} {new Date(week[0].date).getFullYear()}
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", marginBottom: "3px" }}>
                        {week.map(day => {
                          const isToday   = day.date === TODAY.toISOString().slice(0,10);
                          const isPast    = day.date < TODAY.toISOString().slice(0,10);
                          const isWeekend = day.dow === 0 || day.dow === 6;
                          const isDragTgt = dragOver === day.date;
                          return (
                            <div key={day.date}
                              onDragOver={e => { e.preventDefault(); setDragOver(day.date); }}
                              onDragLeave={() => setDragOver(null)}
                              onDrop={() => handleEventDrop(day.date)}
                              onClick={() => !isWeekend && setShowJobPick({ date: day.date })}
                              style={{
                                minHeight: "64px",
                                background: isDragTgt ? C.gold + "22" : isToday ? C.surface2 : isPast ? C.bg : isWeekend ? C.bg : C.surface,
                                border: isDragTgt ? `1px solid ${C.gold}` : isToday ? `1px solid ${C.gold}66` : `1px solid ${C.border}`,
                                padding: "4px 5px",
                                cursor: isWeekend ? "default" : "pointer",
                                opacity: isPast ? 0.5 : 1,
                                position: "relative",
                                transition: "background 0.1s, border 0.1s",
                              }}>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: isToday ? C.gold : isWeekend ? C.textDim + "66" : C.textDim, marginBottom: "3px" }}>
                                {day.day}
                              </div>
                              {day.events.slice(0,3).map((ev,i) => (
                                <div key={i}
                                  draggable={!ev.locked}
                                  onDragStart={ev.locked ? undefined : (e) => { e.stopPropagation(); setDrag({ type: "event", id: ev.id }); }}
                                  onClick={e => { e.stopPropagation(); openEdit(ev); }}
                                  style={{
                                    fontFamily: "'DM Mono',monospace",
                                    fontSize: "7px",
                                    padding: "1px 4px",
                                    marginBottom: "2px",
                                    background: ev.amount >= 0 ? C.green + "22" : ev.type === "tax" ? C.red + "22" : ev.type === "payroll" ? C.amber + "22" : C.red + "22",
                                    color: ev.amount >= 0 ? C.green : ev.type === "tax" ? C.red : ev.type === "payroll" ? C.amber : C.red,
                                    cursor: ev.locked ? "default" : "grab",
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    textOverflow: "ellipsis",
                                  }}>
                                  {ev.amount >= 0 ? "↑" : "↓"} {ev.label.split(" — ")[0]}
                                </div>
                              ))}
                              {day.events.length > 3 && (
                                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "7px", color: C.textDim }}>+{day.events.length - 3} more</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {/* ── EVENTS LIST VIEW ── */}
        {view === "events" && (
          <div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 100px 90px 60px", padding: "8px 16px", borderBottom: `1px solid ${C.border}` }}>
                {["Date","Event","Amount","Type",""].map(h => (
                  <div key={h} style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, letterSpacing: "0.1em" }}>{h}</div>
                ))}
              </div>
              {[...events, ...recurringEvents]
                .sort((a,b) => a.date.localeCompare(b.date))
                .map((ev, i, arr) => {
                  const color = ev.amount >= 0 ? C.green : ev.type === "tax" ? C.red : ev.type === "payroll" ? C.amber : C.red;
                  return (
                    <div key={ev.id} style={{ display: "grid", gridTemplateColumns: "100px 1fr 100px 90px 60px", alignItems: "center", padding: "9px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none", opacity: ev.date < TODAY.toISOString().slice(0,10) ? 0.5 : 1 }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>{ev.date}</div>
                      <div style={{ fontSize: "12px", color: C.text }}>{ev.label}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "12px", color }}>{fmtSgn(ev.amount)}</div>
                      <div><Tag color={color}>{ev.type.toUpperCase()}</Tag></div>
                      <div>
                        {!ev.locked && (
                          <button onClick={() => deleteEvent(ev.id)}
                            style={{ background: "transparent", border: "none", color: C.textDim, cursor: "pointer", fontSize: "14px", padding: "0" }}>×</button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
      {/* ── EDIT EVENT MODAL ── */}
      {editEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border2}`, padding: "28px", width: "400px" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.gold, letterSpacing: "0.2em", marginBottom: "16px" }}>EDIT EVENT</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
              {([["receivable","↑ Inflow",C.green],["expense","↓ Expense",C.red],["tax","⊖ Tax",C.red],["other","· Other",C.textDim]] as [string,string,string][]).map(([t,l,c]) => (
                <button key={t} onClick={() => setEditEvent(ev => ev ? ({ ...ev, type: t, isNegative: t !== "receivable" }) : ev)}
                  style={{ background: editEvent.type === t ? c + "22" : C.surface2, border: `1px solid ${editEvent.type === t ? c : C.border2}`, color: editEvent.type === t ? c : C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "8px", cursor: "pointer" }}>
                  {l}
                </button>
              ))}
            </div>
            {[
              { label: "Description", key: "label" as const,     type: "text",   val: editEvent.label     },
              { label: "Amount ($)",  key: "amountAbs" as const, type: "number", val: editEvent.amountAbs },
              { label: "Date",        key: "date" as const,       type: "date",   val: editEvent.date      },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "12px" }}>
                <Label>{f.label}</Label>
                <input type={f.type} value={f.val}
                  onChange={e => setEditEvent(ev => ev ? ({ ...ev, [f.key]: e.target.value }) : ev)}
                  style={{ width: "100%", background: C.surface2, border: `1px solid ${C.border2}`, color: C.text, fontFamily: f.key === "amountAbs" ? "'DM Mono',monospace" : "Georgia,serif", fontSize: "13px", padding: "8px 10px", outline: "none" }} />
              </div>
            ))}
            <div style={{ marginBottom: "16px", display: "flex", gap: "8px" }}>
              {([[false,"↑ Inflow",C.green],[true,"↓ Outflow",C.red]] as [boolean,string,string][]).map(([neg,l,c]) => (
                <button key={String(neg)} onClick={() => setEditEvent(ev => ev ? ({ ...ev, isNegative: neg }) : ev)}
                  style={{ flex: 1, background: editEvent.isNegative === neg ? c + "22" : C.surface2, border: `1px solid ${editEvent.isNegative === neg ? c : C.border2}`, color: editEvent.isNegative === neg ? c : C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "8px", cursor: "pointer" }}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={saveEdit}
                style={{ flex: 1, background: C.gold, color: C.bg, border: "none", fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "11px", cursor: "pointer", letterSpacing: "0.1em" }}>
                SAVE CHANGES
              </button>
              <button onClick={() => { deleteEvent(editEvent.id); setEditEvent(null); }}
                style={{ background: "transparent", border: `1px solid ${C.red}44`, color: C.red, fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "11px 14px", cursor: "pointer" }}>
                DELETE
              </button>
              <button onClick={() => setEditEvent(null)}
                style={{ background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "11px 14px", cursor: "pointer" }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── ADD EVENT MODAL ── */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border2}`, padding: "28px", width: "400px" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.gold, letterSpacing: "0.2em", marginBottom: "16px" }}>ADD CASHFLOW EVENT</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              {([["receivable","↑ Inflow",C.green],["expense","↓ Expense",C.red],["tax","⊖ Tax",C.red],["other","· Other",C.textDim]] as [string,string,string][]).map(([t,l,c]) => (
                <button key={t} onClick={() => setNewEvent(e => ({ ...e, type: t }))}
                  style={{ background: newEvent.type === t ? c + "22" : C.surface2, border: `1px solid ${newEvent.type === t ? c : C.border2}`, color: newEvent.type === t ? c : C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "8px", cursor: "pointer" }}>
                  {l}
                </button>
              ))}
            </div>
            {[
              { label: "Description", key: "label" as const, type: "text",   placeholder: "e.g. Pereira final payment" },
              { label: "Amount",      key: "amount" as const,type: "number", placeholder: "0" },
              { label: "Date",        key: "date" as const,  type: "date",   placeholder: "" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "12px" }}>
                <Label>{f.label}</Label>
                <input type={f.type} placeholder={f.placeholder} value={newEvent[f.key]}
                  onChange={e => setNewEvent(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: "100%", background: C.surface2, border: `1px solid ${C.border2}`, color: C.text, fontFamily: f.key === "amount" ? "'DM Mono',monospace" : "Georgia,serif", fontSize: "13px", padding: "8px 10px", outline: "none" }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button onClick={addEvent}
                style={{ flex: 1, background: C.gold, color: C.bg, border: "none", fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "11px", cursor: "pointer", letterSpacing: "0.1em" }}>
                ADD TO FORECAST
              </button>
              <button onClick={() => setShowAdd(false)}
                style={{ background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "11px 14px", cursor: "pointer" }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── JOB PAYMENT PICKER ── */}
      {showJobPick && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border2}`, padding: "24px", width: "420px" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.gold, letterSpacing: "0.2em", marginBottom: "4px" }}>SCHEDULE PAYMENT</div>
            <div style={{ fontSize: "16px", marginBottom: "16px" }}>{showJobPick.date}</div>
            {availableInstallments.length === 0 ? (
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>All installments scheduled.</div>
            ) : (
              availableInstallments.map(({ job, inst }) => (
                <div key={`${job.id}-${inst.key}`}
                  onClick={() => addJobInstallment(job, inst.key, showJobPick.date)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", marginBottom: "6px", background: C.surface2, border: `1px solid ${C.border}`, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", background: JOB_COLORS[job.colorId], borderRadius: "50%" }} />
                    <div>
                      <div style={{ fontSize: "12px", color: C.text }}>{job.client} / {job.suburb}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: inst.color }}>{inst.label}</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "13px", color: C.green }}>
                    +{fmt(Math.round(job.value * inst.pct))}
                  </div>
                </div>
              ))
            )}
            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
              <button onClick={() => { setShowAdd(true); setShowJobPick(null); }}
                style={{ flex: 1, background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "9px", cursor: "pointer" }}>
                + MANUAL EVENT INSTEAD
              </button>
              <button onClick={() => setShowJobPick(null)}
                style={{ background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "9px 14px", cursor: "pointer" }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
