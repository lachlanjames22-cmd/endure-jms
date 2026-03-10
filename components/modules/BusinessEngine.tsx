'use client'

import { useState, useEffect, useRef } from "react";
const GOLD = "#b8935a";
const GOLD_DIM = "#7a5e35";
const BG = "#080808";
const SURFACE = "#0c0c0f";
const SURFACE2 = "#111114";
const TEXT = "#e8ddd0";
const TEXT_DIM = "#5a5550";
const TEXT_MID = "#8a8075";
const GREEN = "#4ade80";
const AMBER = "#fbbf24";
const RED = "#f87171";
const BORDER = "#1a1a20";
const BORDER2 = "#222228";
const DEFAULT_CREW = [
  { id: 1, name: "Baylee Taylor", type: "full_time", baseRate: 45, loadedRate: 55, hoursPerWeek: 42, active: true },
  { id: 2, name: "Marius Hauser", type: "full_time", baseRate: 38, loadedRate: 43.77, hoursPerWeek: 42, active: true },
  { id: 3, name: "Ash", type: "casual", baseRate: 38, loadedRate: 45.60, hoursPerWeek: 0, active: false },
  { id: 4, name: "Lachy (Owner)", type: "owner", baseRate: 60, loadedRate: 72, hoursPerWeek: 0, active: true },
  { id: 5, name: "Subcontractor", type: "subby", baseRate: 35, loadedRate: 35, hoursPerWeek: 0, active: false },
];
const DEFAULT_EXPENSES = [
  { id: 1, name: "Vehicle — Ute repayments", amount: 1100, category: "fixed" },
  { id: 2, name: "Vehicle — running / fuel", amount: 420, category: "fixed" },
  { id: 3, name: "Insurance — public liability", amount: 310, category: "fixed" },
  { id: 4, name: "Insurance — tools & equipment", amount: 140, category: "fixed" },
  { id: 5, name: "Phone & comms", amount: 120, category: "fixed" },
  { id: 6, name: "Software / subscriptions", amount: 180, category: "fixed" },
  { id: 7, name: "Accounting / bookkeeping", amount: 250, category: "fixed" },
  { id: 8, name: "Marketing / ads", amount: 800, category: "fixed" },
  { id: 9, name: "Trailer repayment", amount: 220, category: "fixed" },
  { id: 12, name: "Small tools / consumables", amount: 280, category: "variable" },
  { id: 13, name: "PPE & safety", amount: 90, category: "variable" },
  { id: 14, name: "Waste disposal", amount: 120, category: "variable" },
  { id: 15, name: "Subcontractor labour", amount: 0, category: "variable" },
];
const DEFAULT_DAYS = { totalDays: 365, weekendDays: 104, publicHolidays: 13, annualLeave: 20, sickDays: 10, rainDays: 12 };
const TABS = ["P&L", "Expenses", "Crew", "Days", "Combos", "CEO"];
function fmt(n) {
  if (n === undefined || n === null || isNaN(n)) return "$0";
  const abs = Math.abs(n);
  return (n < 0 ? "-$" : "$") + Math.round(abs).toLocaleString();
}
function fmtPct(n, d = 1) { return isNaN(n) ? "0%" : n.toFixed(d) + "%"; }
function tl(v, good, warn) { return v >= good ? GREEN : v >= warn ? AMBER : RED; }
function Mono({ children, style = {} }) {
  return <span style={{ fontFamily: "'DM Mono', monospace", ...style }}>{children}</span>;
}
function SectionTitle({ children, color = GOLD }) {
  return <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "18px", paddingBottom: "10px", borderBottom: `1px solid ${BORDER}` }}>{children}</div>;
}
function Card({ children, style = {} }) {
  return <div style={{ background: SURFACE, border: `1px solid ${BORDER2}`, padding: "24px", ...style }}>{children}</div>;
}
function AnimNum({ value, color = TEXT, size = "26px" }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const diff = value - prev.current;
    if (Math.abs(diff) < 1) { setDisplay(value); return; }
    let start = null;
    const from = prev.current;
    function step(ts) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 380, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(from + diff * ease);
      if (p < 1) requestAnimationFrame(step);
      else { setDisplay(value); prev.current = value; }
    }
    requestAnimationFrame(step);
    prev.current = value;
  }, [value]);
  const str = display < 0 ? `-$${Math.round(Math.abs(display)).toLocaleString()}` : `$${Math.round(Math.abs(display)).toLocaleString()}`;
  return <span style={{ fontFamily: "'DM Mono', monospace", fontSize: size, color, fontWeight: "500", letterSpacing: "-0.5px", transition: "color 0.3s" }}>{str}</span>;
}
function WaterfallRow({ label, value, total, color, indent = false, bold = false, divider = false }) {
  const pct = Math.min(100, Math.abs(value / total) * 100);
  return (
    <div style={{ marginBottom: divider ? "14px" : "7px", paddingBottom: divider ? "14px" : "0", borderBottom: divider ? `1px solid ${BORDER}` : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
        <span style={{ fontSize: bold ? "14px" : "13px", color: bold ? TEXT : TEXT_MID, paddingLeft: indent ? "14px" : "0" }}>{label}</span>
        <Mono style={{ fontSize: bold ? "15px" : "13px", color }}>{fmt(value)}</Mono>
      </div>
      <div style={{ height: "2px", background: BORDER, marginLeft: indent ? "14px" : "0" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, opacity: bold ? 1 : 0.55, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}
export default function BusinessEngine() {
  const [tab, setTab] = useState("P&L");
  const [crew, setCrew] = useState(DEFAULT_CREW);
  const [expenses, setExpenses] = useState(DEFAULT_EXPENSES);
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [ownerSalary, setOwnerSalary] = useState(1884.62);
  const [chargeout, setChargeout] = useState(2400);
  const [avgJobValue, setAvgJobValue] = useState(38000);
  const [jobsPerMonth, setJobsPerMonth] = useState(2.2);
  const [targetJobs, setTargetJobs] = useState(6);
  const [npTarget, setNpTarget] = useState(20);
  const availableDays = days.totalDays - days.weekendDays - days.publicHolidays - days.annualLeave - days.sickDays - days.rainDays;
  const daysPerMonth = availableDays / 12;
  const directLabour = crew.reduce((s, c) => {
    if (!c.active || c.type === "owner") return s;
    return s + (c.loadedRate * c.hoursPerWeek * 52 / 12);
  }, 0);
  const ownerMonthly = ownerSalary * 52 / 12;
  const fixedOpex = expenses.filter(e => e.category === "fixed" && e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const variableOpex = expenses.filter(e => e.category === "variable" && e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const totalOpex = fixedOpex + variableOpex;
  const revenue = jobsPerMonth * avgJobValue;
  const grossProfit = revenue - directLabour;
  const gpPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netProfit = grossProfit - ownerMonthly - totalOpex;
  const npPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const totalCOPS = directLabour + ownerMonthly + totalOpex;
  const dailyCOPS = totalCOPS / daysPerMonth;
  const rateForNP = dailyCOPS / (1 - npTarget / 100);
  const inputStyle = { background: SURFACE2, border: `1px solid ${BORDER2}`, color: TEXT, padding: "7px 10px", fontFamily: "'DM Mono', monospace", fontSize: "14px", outline: "none", width: "100%" };
  const smallInput = { background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, padding: "5px 8px", fontFamily: "'DM Mono', monospace", fontSize: "13px", outline: "none", textAlign: "right" };
  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "'Georgia', serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number] { -moz-appearance: textfield; }
        input::-webkit-outer-spin-button,input::-webkit-inner-spin-button { -webkit-appearance: none; }
        input:focus,textarea:focus { border-color: #b8935a !important; outline: none; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #222; }
      `}</style>
      {/* HEADER */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "22px 36px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Mono style={{ fontSize: "10px", color: GOLD, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: "5px" }}>Endure Decking · Financial OS</Mono>
          <h1 style={{ fontSize: "24px", fontWeight: "400", letterSpacing: "-0.3px" }}>Business Engine</h1>
        </div>
        <div style={{ display: "flex", gap: "36px", alignItems: "flex-end" }}>
          {[
            { label: "Revenue", value: revenue, color: TEXT },
            { label: "Gross Profit", value: grossProfit, color: tl(gpPct, 45, 36) },
            { label: "Net Profit", value: netProfit, color: tl(npPct, npTarget, npTarget * 0.6) },
          ].map((m, i) => (
            <div key={i} style={{ textAlign: "right" }}>
              <Mono style={{ fontSize: "10px", color: TEXT_DIM, display: "block", marginBottom: "3px", letterSpacing: "0.1em", textTransform: "uppercase" }}>{m.label}</Mono>
              <AnimNum value={m.value} color={m.color} size={i === 2 ? "24px" : "20px"} />
            </div>
          ))}
        </div>
      </div>
      {/* TABS */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, display: "flex", padding: "0 36px" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 18px", background: "transparent", color: tab === t ? GOLD : TEXT_DIM, border: "none", borderBottom: tab === t ? `2px solid ${GOLD}` : "2px solid transparent", cursor: "pointer", fontSize: "11px", fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "-1px", transition: "all 0.15s" }}>{t}</button>
        ))}
      </div>
      <div style={{ padding: "30px 36px", maxWidth: "1160px" }}>
        {/* ── P&L ── */}
        {tab === "P&L" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px" }}>
            <Card>
              <SectionTitle>Monthly P&L</SectionTitle>
              <WaterfallRow label="Revenue" value={revenue} total={revenue} color={GREEN} bold divider />
              <WaterfallRow label="Direct Labour (loaded rates)" value={-directLabour} total={revenue} color={RED} indent />
              <WaterfallRow label="Gross Profit" value={grossProfit} total={revenue} color={tl(gpPct, 45, 36)} bold divider />
              <WaterfallRow label="Owner Salary" value={-ownerMonthly} total={revenue} color={AMBER} indent />
              <WaterfallRow label="Fixed Opex" value={-fixedOpex} total={revenue} color={RED} indent />
              <WaterfallRow label="Variable Opex" value={-variableOpex} total={revenue} color={RED} indent />
              <div style={{ height: "14px" }} />
              <WaterfallRow label="Net Profit" value={netProfit} total={revenue} color={tl(npPct, npTarget, npTarget * 0.6)} bold />
              <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: BORDER }}>
                {[
                  { l: "GP %", v: fmtPct(gpPct), c: tl(gpPct, 45, 36) },
                  { l: "NP %", v: fmtPct(npPct), c: tl(npPct, npTarget, npTarget * 0.6) },
                  { l: "NP Target", v: fmtPct(npTarget), c: GOLD },
                ].map(m => (
                  <div key={m.l} style={{ background: SURFACE2, padding: "12px", textAlign: "center" }}>
                    <Mono style={{ fontSize: "10px", color: TEXT_DIM, display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.l}</Mono>
                    <Mono style={{ fontSize: "20px", color: m.c }}>{m.v}</Mono>
                  </div>
                ))}
              </div>
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <Card>
                <SectionTitle>Live Inputs</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {[
                    { label: "Jobs / Month", value: jobsPerMonth, set: setJobsPerMonth, prefix: "" },
                    { label: "Avg Job Value", value: avgJobValue, set: setAvgJobValue },
                    { label: "Daily Chargeout", value: chargeout, set: setChargeout },
                    { label: "NP Target %", value: npTarget, set: setNpTarget, prefix: "" },
                    { label: "Target Jobs / Mo", value: targetJobs, set: setTargetJobs, prefix: "" },
                    { label: "Owner Weekly Draw", value: ownerSalary, set: setOwnerSalary },
                  ].map((f, i) => (
                    <div key={i}>
                      <Mono style={{ fontSize: "10px", color: TEXT_DIM, display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{f.label}</Mono>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {f.prefix !== "" && <Mono style={{ color: GOLD_DIM, fontSize: "13px" }}>$</Mono>}
                        <input type="number" value={f.value} onChange={e => f.set(parseFloat(e.target.value) || 0)} style={inputStyle} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <SectionTitle color={AMBER}>At Target ({targetJobs} jobs / month)</SectionTitle>
                {(() => {
                  const tRev = targetJobs * avgJobValue;
                  const tGP = tRev - directLabour;
                  const tNP = tGP - ownerMonthly - totalOpex;
                  const tNPPct = (tNP / tRev) * 100;
                  return [
                    { l: "Revenue", v: fmt(tRev), c: TEXT },
                    { l: "Gross Profit", v: fmt(tGP), c: tl((tGP / tRev) * 100, 45, 36) },
                    { l: "Net Profit", v: fmt(tNP), c: tl(tNPPct, npTarget, npTarget * 0.6) },
                    { l: "NP %", v: fmtPct(tNPPct), c: tl(tNPPct, npTarget, npTarget * 0.6) },
                    { l: "Annual NP", v: fmt(tNP * 12), c: GREEN },
                  ].map((row, i, arr) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                      <span style={{ fontSize: "13px", color: TEXT_MID }}>{row.l}</span>
                      <Mono style={{ fontSize: "16px", color: row.c }}>{row.v}</Mono>
                    </div>
                  ));
                })()}
              </Card>
              <Card style={{ background: `${GOLD}09`, borderColor: `${GOLD}35` }}>
                <SectionTitle color={GOLD}>Floor Rate for {npTarget}% NP</SectionTitle>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "13px", color: TEXT_MID }}>Daily chargeout needed<br /><Mono style={{ fontSize: "10px", color: TEXT_DIM }}>all costs + {npTarget}% NP</Mono></div>
                  <AnimNum value={rateForNP} color={GOLD} size="30px" />
                </div>
                <div style={{ marginTop: "12px", fontSize: "12px", color: TEXT_DIM, lineHeight: "1.7", fontFamily: "'DM Mono', monospace" }}>
                  Current: {fmt(chargeout)}/day · {chargeout >= rateForNP ? `${fmt(chargeout - rateForNP)} above floor` : `${fmt(rateForNP - chargeout)} below floor`}
                </div>
              </Card>
            </div>
          </div>
        )}
        {/* ── EXPENSES ── */}
        {tab === "Expenses" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "22px" }}>
            <div>
              {["fixed", "variable"].map(cat => (
                <Card key={cat} style={{ marginBottom: "20px" }}>
                  <SectionTitle>{cat === "fixed" ? "Fixed Monthly Expenses" : "Variable Monthly Expenses"}</SectionTitle>
                  {cat === "variable" && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: TEXT_DIM, marginBottom: "12px" }}>Costs that fluctuate with volume — use monthly average.</div>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 90px 28px", background: SURFACE2, padding: "8px 10px", marginBottom: "2px" }}>
                    {["Expense", "Monthly", "Annual", ""].map(h => <Mono key={h} style={{ fontSize: "10px", color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</Mono>)}
                  </div>
                  {expenses.filter(e => e.category === cat).map(exp => (
                    <div key={exp.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px 90px 28px", padding: "8px 10px", borderBottom: `1px solid ${BORDER}`, alignItems: "center", gap: "4px" }}>
                      <input value={exp.name} onChange={e => setExpenses(p => p.map(x => x.id === exp.id ? { ...x, name: e.target.value } : x))}
                        placeholder="Expense name..." style={{ background: "transparent", border: "none", color: exp.name ? TEXT : TEXT_DIM, fontSize: "13px", fontFamily: "'Georgia', serif", outline: "none", width: "100%" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        <Mono style={{ color: GOLD_DIM, fontSize: "11px" }}>$</Mono>
                        <input type="number" value={exp.amount || ""} placeholder="0"
                          onChange={e => setExpenses(p => p.map(x => x.id === exp.id ? { ...x, amount: parseFloat(e.target.value) || 0 } : x))}
                          style={{ background: "transparent", border: "none", color: TEXT, fontFamily: "'DM Mono', monospace", fontSize: "13px", outline: "none", width: "65px", textAlign: "right" }} />
                      </div>
                      <Mono style={{ fontSize: "12px", color: TEXT_DIM, textAlign: "right" }}>{exp.amount ? fmt(exp.amount * 12) : "—"}</Mono>
                      <button onClick={() => setExpenses(p => p.filter(x => x.id !== exp.id))}
                        style={{ background: "transparent", border: "none", color: TEXT_DIM, cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}
                        onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.5}>
                        ×
                      </button>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: SURFACE2 }}>
                    <button
                      onClick={() => setExpenses(p => [...p, { id: Date.now(), name: "", amount: 0, category: cat }])}
                      style={{ background: "transparent", border: `1px solid ${BORDER2}`, color: TEXT_DIM, padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "6px" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER2; e.currentTarget.style.color = TEXT_DIM; }}>
                      + ADD ROW
                    </button>
                    <Mono style={{ fontSize: "14px", color: GOLD }}>{fmt(cat === "fixed" ? fixedOpex : variableOpex)} / month</Mono>
                  </div>
                </Card>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Card>
                <SectionTitle>Opex Summary</SectionTitle>
                {[{ l: "Fixed", v: fixedOpex }, { l: "Variable", v: variableOpex }].map((row, i) => (
                  <div key={i} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontSize: "13px", color: TEXT_MID }}>{row.l}</span>
                      <Mono style={{ fontSize: "13px", color: TEXT }}>{fmt(row.v)}</Mono>
                    </div>
                    <div style={{ height: "2px", background: BORDER }}>
                      <div style={{ height: "100%", width: `${(row.v / (totalOpex || 1)) * 100}%`, background: GOLD, transition: "width 0.4s" }} />
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "12px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "14px" }}>Total Opex</span>
                  <Mono style={{ fontSize: "18px", color: GOLD }}>{fmt(totalOpex)}</Mono>
                </div>
                <Mono style={{ fontSize: "11px", color: TEXT_DIM, display: "block", marginTop: "6px", textAlign: "right" }}>Annual: {fmt(totalOpex * 12)}</Mono>
              </Card>
              <Card>
                <SectionTitle>Full Cost Stack</SectionTitle>
                {[{ l: "Direct Labour", v: directLabour }, { l: "Owner Salary", v: ownerMonthly }, { l: "Total Opex", v: totalOpex }].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ fontSize: "13px", color: TEXT_MID }}>{row.l}</span>
                    <Mono style={{ fontSize: "14px", color: TEXT }}>{fmt(row.v)}</Mono>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px" }}>
                  <span style={{ fontSize: "14px" }}>Total COPS</span>
                  <Mono style={{ fontSize: "18px", color: GOLD }}>{fmt(totalCOPS)}</Mono>
                </div>
              </Card>
              <Card style={{ background: `${GOLD}08`, borderColor: `${GOLD}25` }}>
                <Mono style={{ fontSize: "10px", color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.14em", display: "block", marginBottom: "8px" }}>Opex / Billable Day</Mono>
                <Mono style={{ fontSize: "28px", color: GOLD, display: "block", marginBottom: "6px" }}>{fmt(totalOpex / daysPerMonth)}</Mono>
                <span style={{ fontSize: "12px", color: TEXT_DIM }}>The cost of the business before anyone lifts a board.</span>
              </Card>
            </div>
          </div>
        )}
        {/* ── CREW ── */}
        {tab === "Crew" && (
          <div>
            <div style={{ border: `1px solid ${BORDER2}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "38px 1fr 90px 90px 90px 78px 130px", background: SURFACE2, padding: "9px 16px" }}>
                {["", "Name", "Type", "Base/hr", "Loaded/hr", "Hrs/wk", "Monthly"].map(h => <Mono key={h} style={{ fontSize: "10px", color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</Mono>)}
              </div>
              {crew.map((c) => {
                const monthly = c.type === "owner" ? ownerSalary * 52 / 12 : c.active ? c.loadedRate * c.hoursPerWeek * 52 / 12 : 0;
                return (
                  <div key={c.id} style={{ display: "grid", gridTemplateColumns: "38px 1fr 90px 90px 90px 78px 130px", padding: "13px 16px", alignItems: "center", borderTop: `1px solid ${BORDER}`, opacity: c.active ? 1 : 0.35, background: c.active ? SURFACE : SURFACE2, transition: "opacity 0.2s" }}>
                    <div onClick={() => setCrew(p => p.map(x => x.id === c.id ? { ...x, active: !x.active } : x))}
                      style={{ width: "16px", height: "16px", border: `2px solid ${c.active ? GOLD : BORDER2}`, background: c.active ? GOLD : "transparent", cursor: "pointer", transition: "all 0.15s" }} />
                    <span style={{ fontSize: "14px" }}>{c.name}</span>
                    <Mono style={{ fontSize: "10px", color: TEXT_DIM, textTransform: "uppercase" }}>{c.type}</Mono>
                    <input type="number" value={c.baseRate} onChange={e => setCrew(p => p.map(x => x.id === c.id ? { ...x, baseRate: parseFloat(e.target.value) || 0 } : x))} style={{ ...smallInput, width: "66px" }} />
                    <input type="number" value={c.loadedRate} onChange={e => setCrew(p => p.map(x => x.id === c.id ? { ...x, loadedRate: parseFloat(e.target.value) || 0 } : x))} style={{ ...smallInput, width: "66px", color: c.active ? GOLD : TEXT_DIM }} />
                    <input type="number" value={c.hoursPerWeek} onChange={e => setCrew(p => p.map(x => x.id === c.id ? { ...x, hoursPerWeek: parseFloat(e.target.value) || 0 } : x))} style={{ ...smallInput, width: "56px" }} />
                    <Mono style={{ fontSize: "15px", color: c.active ? GOLD : TEXT_DIM }}>{c.active ? fmt(monthly) : "—"}</Mono>
                  </div>
                );
              })}
              <div style={{ display: "grid", gridTemplateColumns: "38px 1fr 90px 90px 90px 78px 130px", padding: "12px 16px", background: SURFACE2, borderTop: `2px solid ${BORDER}` }}>
                <div /><Mono style={{ fontSize: "10px", color: TEXT_DIM, gridColumn: "2/7", textTransform: "uppercase", letterSpacing: "0.1em" }}>Direct labour total</Mono>
                <Mono style={{ fontSize: "16px", color: GOLD }}>{fmt(directLabour)}</Mono>
              </div>
            </div>
            <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
              <Card>
                <Mono style={{ fontSize: "10px", color: TEXT_DIM, display: "block", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Owner Weekly Draw</Mono>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <Mono style={{ color: GOLD_DIM }}>$</Mono>
                  <input type="number" value={ownerSalary} onChange={e => setOwnerSalary(parseFloat(e.target.value) || 0)} style={inputStyle} />
                </div>
                <Mono style={{ fontSize: "11px", color: TEXT_DIM, display: "block", marginTop: "8px" }}>= {fmt(ownerMonthly)}/month · fixed opex, not direct labour</Mono>
              </Card>
              <Card style={{ background: `${GOLD}08`, borderColor: `${GOLD}25` }}>
                <Mono style={{ fontSize: "10px", color: TEXT_DIM, display: "block", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Total Labour / Month</Mono>
                <Mono style={{ fontSize: "24px", color: GOLD, display: "block" }}>{fmt(directLabour + ownerMonthly)}</Mono>
                <Mono style={{ fontSize: "11px", color: TEXT_DIM, display: "block", marginTop: "6px" }}>{fmtPct((directLabour + ownerMonthly) / (revenue || 1) * 100)} of current revenue</Mono>
              </Card>
            </div>
          </div>
        )}
        {/* ── DAYS ── */}
        {tab === "Days" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px" }}>
            <Card>
              <SectionTitle>Available Days</SectionTitle>
              {[{ l: "Total Calendar Days", f: "totalDays", ro: true }, { l: "Weekend Days", f: "weekendDays" }, { l: "Public Holidays", f: "publicHolidays" }, { l: "Annual Leave", f: "annualLeave" }, { l: "Sick Days", f: "sickDays" }, { l: "Rain / Shutdown Days", f: "rainDays" }].map(row => (
                <div key={row.f} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: "13px", color: row.ro ? TEXT_DIM : TEXT }}>{row.l}</span>
                  {row.ro ? <Mono style={{ fontSize: "14px", color: TEXT_DIM }}>{days[row.f]}</Mono>
                    : <input type="number" value={days[row.f]} onChange={e => setDays(p => ({ ...p, [row.f]: parseInt(e.target.value) || 0 }))} style={{ ...smallInput, width: "78px" }} />}
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "14px" }}>
                <span style={{ fontSize: "15px" }}>Available Days / Year</span>
                <Mono style={{ fontSize: "24px", color: GOLD }}>{availableDays}</Mono>
              </div>
              <Mono style={{ fontSize: "11px", color: TEXT_DIM, display: "block", marginTop: "5px", textAlign: "right" }}>{daysPerMonth.toFixed(2)} days / month</Mono>
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Card>
                <SectionTitle>Rain Day Sensitivity</SectionTitle>
                {[6, 8, 12, 16, 20, 25].map(r => {
                  const avail = days.totalDays - days.weekendDays - days.publicHolidays - days.annualLeave - days.sickDays - r;
                  const daily = totalCOPS / (avail / 12);
                  const cur = r === days.rainDays;
                  return (
                    <div key={r} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", marginBottom: "2px", background: cur ? `${GOLD}12` : "transparent", borderLeft: `3px solid ${cur ? GOLD : "transparent"}` }}>
                      <Mono style={{ fontSize: "12px", color: cur ? GOLD : TEXT_DIM }}>{r} rain days{cur ? " ← current" : ""}</Mono>
                      <Mono style={{ fontSize: "14px", color: cur ? GOLD : TEXT }}>{fmt(daily)}/day</Mono>
                    </div>
                  );
                })}
              </Card>
              <Card style={{ borderColor: `${AMBER}33` }}>
                <SectionTitle color={AMBER}>TSA vs Reality</SectionTitle>
                <p style={{ fontSize: "13px", color: TEXT_DIM, lineHeight: "1.7" }}>TSA defaults to 8 rain days. Perth decking runs 12–16 through summer. Your COPS doesn't drop on rain days — your available days do.</p>
              </Card>
            </div>
          </div>
        )}
        {/* ── COMBOS ── */}
        {tab === "Combos" && (
          <div>
            <Mono style={{ fontSize: "11px", color: TEXT_DIM, display: "block", marginBottom: "18px" }}>Daily cost per crew mix. Floor = minimum chargeout to hit your NP target.</Mono>
            <div style={{ border: `1px solid ${BORDER}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "190px 120px 140px 150px 1fr", background: SURFACE2, padding: "9px 18px" }}>
                {["Crew", "Daily Cost", `NP @ $${chargeout}`, `Floor ${npTarget}% NP`, ""].map(h => <Mono key={h} style={{ fontSize: "10px", color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</Mono>)}
              </div>
              {[
                { label: "Baylee + Marius", members: ["Baylee Taylor", "Marius Hauser"] },
                { label: "Baylee + Subby", members: ["Baylee Taylor", "Subcontractor"] },
                { label: "Baylee solo", members: ["Baylee Taylor"] },
                { label: "Full crew (3)", members: ["Baylee Taylor", "Marius Hauser", "Ash"] },
              ].map((combo, i) => {
                const labour = combo.members.reduce((s, name) => { const c = crew.find(x => x.name === name); return s + (c ? c.loadedRate * 8 : 0); }, 0);
                const cost = labour + (totalOpex / daysPerMonth);
                const np = ((chargeout - cost) / chargeout) * 100;
                const floor = cost / (1 - npTarget / 100);
                const npColor = tl(np, npTarget, npTarget * 0.6);
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "190px 120px 140px 150px 1fr", padding: "17px 18px", borderTop: `1px solid ${BORDER}`, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "14px", marginBottom: "3px" }}>{combo.label}</div>
                      <Mono style={{ fontSize: "10px", color: TEXT_DIM }}>{combo.members.length}p</Mono>
                    </div>
                    <Mono style={{ fontSize: "17px" }}>{fmt(cost)}</Mono>
                    <Mono style={{ fontSize: "19px", color: npColor }}>{fmtPct(np)}</Mono>
                    <Mono style={{ fontSize: "17px", color: GOLD }}>{fmt(floor)}</Mono>
                    <div style={{ paddingRight: "14px" }}>
                      <div style={{ height: "3px", background: BORDER, borderRadius: "2px" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, (np / (npTarget * 1.4)) * 100))}%`, background: npColor, borderRadius: "2px", transition: "width 0.5s" }} />
                      </div>
                      <Mono style={{ fontSize: "10px", color: TEXT_DIM, display: "block", marginTop: "3px" }}>{np >= npTarget ? `✓ ${(np - npTarget).toFixed(1)}pts above` : `${(npTarget - np).toFixed(1)}pts below target`}</Mono>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* ── CEO ── */}
        {tab === "CEO" && <CEOModule revenue={revenue} netProfit={netProfit} npPct={npPct} npTarget={npTarget} jobsPerMonth={jobsPerMonth} targetJobs={targetJobs} avgJobValue={avgJobValue} directLabour={directLabour} ownerMonthly={ownerMonthly} totalOpex={totalOpex} />}
      </div>
    </div>
  );
}
function CEOModule({ revenue, netProfit, npPct, npTarget, jobsPerMonth, targetJobs, avgJobValue, directLabour, ownerMonthly, totalOpex }) {
  const [timeAudit, setTimeAudit] = useState({ tools: 70, ops: 20, strategy: 10 });
  const [wins, setWins] = useState([
    { id: 1, text: "Landed the Applecross job at full margin", date: "Feb 2026" },
    { id: 2, text: "Baylee ran first job solo start to finish", date: "Jan 2026" },
    { id: 3, text: "", date: "" },
  ]);
  const [decisions, setDecisions] = useState([
    { id: 1, decision: "Held price on composite quote — client pushed back", outcome: "Won at full rate", correct: true },
    { id: 2, decision: "Took on small $8k job to fill gap week", outcome: "Disrupted pipeline, margin was 28%", correct: false },
    { id: 3, decision: "", outcome: "", correct: null },
  ]);
  const [reflection, setReflection] = useState("");
  const annualNP = netProfit * 12;
  const tRev = targetJobs * avgJobValue;
  const tNP = (tRev - directLabour - ownerMonthly - totalOpex) * 12;
  const multiple = tNP / (annualNP || 1);
  const monthsToTarget = jobsPerMonth > 0 ? Math.ceil(Math.log(targetJobs / jobsPerMonth) / Math.log(1.15)) : "—";
  const timeTotal = timeAudit.tools + timeAudit.ops + timeAudit.strategy;
  return (
    <div>
      {/* Vision banner */}
      <div style={{ background: `linear-gradient(135deg, #0f0e0b 0%, ${SURFACE} 100%)`, border: `1px solid ${GOLD}28`, padding: "28px 30px", marginBottom: "22px" }}>
        <Mono style={{ fontSize: "10px", color: GOLD, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: "16px" }}>CEO Dashboard · Endure Decking</Mono>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px" }}>
          {[
            { l: "Annual NP Now", v: <AnimNum value={annualNP} color={tl(npPct, npTarget, npTarget * 0.6)} size="26px" />, sub: `${npPct.toFixed(1)}% margin` },
            { l: "Annual NP at Target", v: <AnimNum value={tNP} color={GREEN} size="26px" />, sub: `${targetJobs} jobs/month` },
            { l: "Growth Multiple", v: <Mono style={{ fontSize: "26px", color: GOLD, fontWeight: "500" }}>{multiple.toFixed(1)}×</Mono>, sub: "current → target" },
            { l: "Months to Target", v: <Mono style={{ fontSize: "26px", color: TEXT, fontWeight: "500" }}>{monthsToTarget}</Mono>, sub: "at 15%/mo growth" },
          ].map((m, i) => (
            <div key={i}>
              <Mono style={{ fontSize: "10px", color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: "8px" }}>{m.l}</Mono>
              {m.v}
              <Mono style={{ fontSize: "11px", color: TEXT_DIM, display: "block", marginTop: "4px" }}>{m.sub}</Mono>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px", marginBottom: "22px" }}>
        {/* Time audit */}
        <Card>
          <SectionTitle>Time Audit</SectionTitle>
          <Mono style={{ fontSize: "11px", color: TEXT_DIM, display: "block", marginBottom: "16px" }}>Target: tools ↓ 30%, ops 40%, strategy ↑ 30%. Off tools by month 18.</Mono>
          {[
            { key: "tools", label: "On the Tools", target: 30, desc: "Billable site hours", color: AMBER },
            { key: "ops", label: "Operations", target: 40, desc: "Quoting, admin, scheduling", color: GOLD },
            { key: "strategy", label: "Strategy / CEO", target: 30, desc: "Growth, systems, culture", color: GREEN },
          ].map(row => {
            const val = timeAudit[row.key];
            const onTrack = row.key === "tools" ? val <= row.target : val >= row.target;
            return (
              <div key={row.key} style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <div>
                    <span style={{ fontSize: "13px", color: TEXT }}>{row.label}</span>
                    <Mono style={{ fontSize: "10px", color: TEXT_DIM, display: "block", marginTop: "2px" }}>{row.desc}</Mono>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input type="range" min={0} max={100} value={val} onChange={e => setTimeAudit(p => ({ ...p, [row.key]: parseInt(e.target.value) }))} style={{ width: "80px", accentColor: row.color }} />
                    <Mono style={{ fontSize: "16px", color: row.color, minWidth: "34px", textAlign: "right" }}>{val}%</Mono>
                  </div>
                </div>
                <div style={{ height: "3px", background: BORDER }}>
                  <div style={{ height: "100%", width: `${val}%`, background: row.color, transition: "width 0.2s" }} />
                </div>
                <Mono style={{ fontSize: "10px", color: onTrack ? GREEN : AMBER, display: "block", marginTop: "3px" }}>
                  {onTrack ? `✓ on track (target ${row.target}%)` : `target ${row.target}% — ${Math.abs(val - row.target)}% ${row.key === "tools" ? "too high" : "too low"}`}
                </Mono>
              </div>
            );
          })}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "8px" }}>
            <Mono style={{ fontSize: "10px", color: timeTotal === 100 ? GREEN : RED }}>Total: {timeTotal}%{timeTotal !== 100 ? ` — ${Math.abs(100 - timeTotal)}% ${timeTotal > 100 ? "over" : "unallocated"}` : " ✓"}</Mono>
          </div>
        </Card>
        {/* Growth scenarios */}
        <Card>
          <SectionTitle>Growth Scenarios</SectionTitle>
          {[
            { label: "Stay Course", jobs: 2.2, color: AMBER, desc: "Current trajectory" },
            { label: "Moderate Push", jobs: 4, color: GOLD, desc: "+1 marketing channel" },
            { label: "Target State", jobs: targetJobs, color: GREEN, desc: "Full system firing" },
          ].map((s, i) => {
            const sRev = s.jobs * avgJobValue;
            const sNP = sRev - directLabour - ownerMonthly - totalOpex;
            const sNPPct = (sNP / sRev) * 100;
            return (
              <div key={i} style={{ padding: "14px", background: SURFACE2, marginBottom: "8px", borderLeft: `3px solid ${s.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "14px", color: s.color, marginBottom: "2px" }}>{s.label}</div>
                    <Mono style={{ fontSize: "10px", color: TEXT_DIM }}>{s.jobs} jobs/mo · {s.desc}</Mono>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Mono style={{ fontSize: "17px", color: sNP > 0 ? s.color : RED, display: "block" }}>{fmt(sNP)}/mo</Mono>
                    <Mono style={{ fontSize: "11px", color: TEXT_DIM }}>{fmtPct(sNPPct)} NP</Mono>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                  {[{ l: "Revenue", v: fmt(sRev) }, { l: "Annual NP", v: fmt(sNP * 12) }, { l: "NP %", v: fmtPct(sNPPct) }].map(m => (
                    <div key={m.l} style={{ textAlign: "center", background: SURFACE, padding: "6px" }}>
                      <Mono style={{ fontSize: "9px", color: TEXT_DIM, display: "block", marginBottom: "2px" }}>{m.l}</Mono>
                      <Mono style={{ fontSize: "12px", color: TEXT }}>{m.v}</Mono>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px", marginBottom: "22px" }}>
        {/* Wins */}
        <Card>
          <SectionTitle color={GREEN}>Wins Board</SectionTitle>
          <p style={{ fontSize: "13px", color: TEXT_DIM, marginBottom: "14px" }}>Record the wins. Pattern recognition starts here.</p>
          {wins.map(w => (
            <div key={w.id} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ width: "6px", height: "6px", background: GREEN, borderRadius: "50%", flexShrink: 0 }} />
              <input value={w.text} onChange={e => setWins(p => p.map(x => x.id === w.id ? { ...x, text: e.target.value } : x))}
                placeholder="Add a win..."
                style={{ flex: 1, background: "transparent", border: "none", borderBottom: `1px solid ${BORDER}`, color: w.text ? TEXT : TEXT_DIM, fontSize: "13px", fontFamily: "'Georgia', serif", outline: "none", padding: "3px 0" }} />
              <input value={w.date} onChange={e => setWins(p => p.map(x => x.id === w.id ? { ...x, date: e.target.value } : x))}
                placeholder="Month"
                style={{ width: "68px", background: "transparent", border: "none", color: TEXT_DIM, fontFamily: "'DM Mono', monospace", fontSize: "11px", outline: "none", textAlign: "right" }} />
            </div>
          ))}
          <button onClick={() => setWins(p => [...p, { id: Date.now(), text: "", date: "" }])}
            style={{ marginTop: "8px", background: "transparent", border: `1px solid ${BORDER}`, color: TEXT_DIM, padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.1em" }}>
            + ADD WIN
          </button>
        </Card>
        {/* Decisions */}
        <Card>
          <SectionTitle color={AMBER}>Decision Journal</SectionTitle>
          <p style={{ fontSize: "13px", color: TEXT_DIM, marginBottom: "14px" }}>Log the call. Log the outcome. See your own patterns.</p>
          {decisions.map(d => (
            <div key={d.id} style={{ marginBottom: "12px", padding: "10px 12px", background: SURFACE2, borderLeft: `3px solid ${d.correct === true ? GREEN : d.correct === false ? RED : BORDER}` }}>
              <input value={d.decision} onChange={e => setDecisions(p => p.map(x => x.id === d.id ? { ...x, decision: e.target.value } : x))}
                placeholder="The decision you made..."
                style={{ width: "100%", background: "transparent", border: "none", color: TEXT, fontSize: "12px", fontFamily: "'Georgia', serif", outline: "none", marginBottom: "5px" }} />
              <input value={d.outcome} onChange={e => setDecisions(p => p.map(x => x.id === d.id ? { ...x, outcome: e.target.value } : x))}
                placeholder="What happened..."
                style={{ width: "100%", background: "transparent", border: "none", color: TEXT_DIM, fontSize: "12px", fontFamily: "'Georgia', serif", outline: "none", marginBottom: "7px" }} />
              <div style={{ display: "flex", gap: "6px" }}>
                {[{ v: true, l: "✓ Right" }, { v: false, l: "✗ Wrong" }, { v: null, l: "? TBD" }].map(btn => (
                  <button key={String(btn.v)} onClick={() => setDecisions(p => p.map(x => x.id === d.id ? { ...x, correct: btn.v } : x))}
                    style={{ background: d.correct === btn.v ? (btn.v === true ? GREEN : btn.v === false ? RED : GOLD) + "25" : "transparent", border: `1px solid ${d.correct === btn.v ? (btn.v === true ? GREEN : btn.v === false ? RED : GOLD) : BORDER}`, color: d.correct === btn.v ? TEXT : TEXT_DIM, padding: "3px 10px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "10px" }}>
                    {btn.l}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => setDecisions(p => [...p, { id: Date.now(), decision: "", outcome: "", correct: null }])}
            style={{ background: "transparent", border: `1px solid ${BORDER}`, color: TEXT_DIM, padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.1em" }}>
            + ADD DECISION
          </button>
        </Card>
      </div>
      {/* Reflection */}
      <Card>
        <SectionTitle>Monthly Reflection</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "14px" }}>
          <Mono style={{ fontSize: "11px", color: TEXT_DIM, lineHeight: "1.7" }}>What did you avoid this month that you should have faced? What did the business tell you that you ignored?</Mono>
          <Mono style={{ fontSize: "11px", color: TEXT_DIM, lineHeight: "1.7" }}>What's one thing Endure does that no other decking business does? What should it be doing in 12 months?</Mono>
        </div>
        <textarea value={reflection} onChange={e => setReflection(e.target.value)} placeholder="Write here..."
          style={{ width: "100%", height: "96px", background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT, padding: "12px", fontFamily: "'Georgia', serif", fontSize: "14px", outline: "none", resize: "vertical", lineHeight: "1.7" }} />
      </Card>
    </div>
  );
}