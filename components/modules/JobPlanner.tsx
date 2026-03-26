// @ts-nocheck
'use client'

import { useState, useMemo, useEffect } from "react";
const GOLD = "#b8935a", BG = "#080808", SURFACE = "#0c0c0f", SURFACE2 = "#111114";
const SURFACE3 = "#0d0d10", TEXT = "#e8ddd0", TEXT_DIM = "#4e4a45", TEXT_MID = "#7a7570";
const GREEN = "#4ade80", AMBER = "#fbbf24", RED = "#f87171", BLUE = "#60a5fa";
const BORDER = "#181820", BORDER2 = "#20202a";
const FINANCE = {
  totalOpex: 8714.93,
  ownerMonthly: 1884.62 * 52 / 12,
  crew: [
    { id: "baylee", name: "Baylee", loadedRate: 55,    dailyHours: 8 },
    { id: "marius", name: "Marius", loadedRate: 43.77, dailyHours: 8 },
    { id: "ash",    name: "Ash",    loadedRate: 45.60, dailyHours: 8 },
    { id: "lachy",  name: "Lachy",  loadedRate: 72,    dailyHours: 8 },
    { id: "subby",  name: "Subby",  loadedRate: 35,    dailyHours: 8 },
  ],
};
const MONTHLY_FIXED = FINANCE.totalOpex + FINANCE.ownerMonthly;
const SAT_MULT = 1.5;
const JOB_PALETTE = [
  { id: "green",  bg: "#0e2218", border: "#4ade80", text: "#4ade80" },
  { id: "amber",  bg: "#221a08", border: "#fbbf24", text: "#fbbf24" },
  { id: "blue",   bg: "#0e1728", border: "#60a5fa", text: "#60a5fa" },
  { id: "purple", bg: "#1e1030", border: "#c084fc", text: "#c084fc" },
  { id: "red",    bg: "#1a0e0e", border: "#f87171", text: "#f87171" },
  { id: "gold",   bg: "#1a1510", border: "#b8935a", text: "#b8935a" },
  { id: "teal",   bg: "#0e1a1a", border: "#2dd4bf", text: "#2dd4bf" },
  { id: "violet", bg: "#141018", border: "#a78bfa", text: "#a78bfa" },
];
const BLOCK = {
  rain:   { label: "Rain",           color: BLUE,  bg: "#080e18", icon: "🌧" },
  buffer: { label: "Buffer",         color: AMBER, bg: "#18140a", icon: "↔"  },
  ph:     { label: "Public Holiday", color: RED,   bg: "#180a0a", icon: "★"  },
};
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function fmt(n) {
  if (n == null || isNaN(n)) return "$0";
  return (n < 0 ? "-$" : "$") + Math.round(Math.abs(n)).toLocaleString();
}
function fmtPct(n, d = 1) {
  return isNaN(n) || !isFinite(n) ? "0%" : n.toFixed(d) + "%";
}
function tl(v, g, w) { return v >= g ? GREEN : v >= w ? AMBER : RED; }
function dk(y, m, d) { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function daysInMonth(y, m) { return new Date(y, m+1, 0).getDate(); }
function firstDow(y, m) { return new Date(y, m, 1).getDay(); }
function getDow(y, m, d) { return new Date(y, m, d).getDay(); }
function isSat(y, m, d) { return getDow(y,m,d) === 6; }
function isSun(y, m, d) { return getDow(y,m,d) === 0; }
function getCol(colorId) { return JOB_PALETTE.find(p => p.id === colorId) || JOB_PALETTE[5]; }
function crewDailyCost(crewIds) {
  return crewIds.reduce((s, cid) => {
    const c = FINANCE.crew.find(x => x.id === cid);
    return s + (c ? c.loadedRate * c.dailyHours : 0);
  }, 0);
}
function Mono({ children, style = {} }) {
  return <span style={{ fontFamily: "'DM Mono',monospace", ...style }}>{children}</span>;
}
function Label({ children, color = TEXT_DIM }) {
  return (
    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "5px" }}>{children}</div>
  );
}
function Card({ children, style = {} }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER2}`, padding: "16px", ...style }}>{children}</div>
  );
}
function SecTitle({ children, color = GOLD }) {
  return (
    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px", paddingBottom: "8px", borderBottom: `1px solid ${BORDER}` }}>{children}</div>
  );
}
const SEED_JOBS = [
  { id: "j1", client: "Henderson", suburb: "Applecross", type: "New Deck",       quotedDays: 6, quotedHours: 48, quotedValue: 42000, actualDays: null, actualHours: null, notes: "Merbau, full perimeter",    crew: ["baylee","marius"], colorId: "green"  },
  { id: "j2", client: "Nguyen",    suburb: "Cottesloe",  type: "Redeck",         quotedDays: 4, quotedHours: 32, quotedValue: 28000, actualDays: null, actualHours: null, notes: "Composite, tight access",   crew: ["baylee","marius"], colorId: "amber"  },
  { id: "j3", client: "Mitchell",  suburb: "Subiaco",    type: "Pergola",        quotedDays: 3, quotedHours: 22, quotedValue: 18500, actualDays: null, actualHours: null, notes: "Freestanding, powder coat", crew: ["baylee"],           colorId: "blue"   },
  { id: "j4", client: "Williams",  suburb: "Nedlands",   type: "Deck + Pergola", quotedDays: 8, quotedHours: 64, quotedValue: 56000, actualDays: null, actualHours: null, notes: "Large entertainer deck",    crew: ["baylee","marius"], colorId: "purple" },
];
const EMPTY_JOB = {
  client: "", suburb: "", type: "New Deck", quotedDays: 5, quotedHours: 40,
  quotedValue: 0, actualDays: "", actualHours: "", notes: "",
  crew: ["baylee","marius"], colorId: "green",
};
function computeMonthStats(year, month, jobs, schedule) {
  const dim = daysInMonth(year, month);
  let availWeekdays = 0;
  for (let d = 1; d <= dim; d++) {
    const dw = getDow(year, month, d);
    if (dw >= 1 && dw <= 5) availWeekdays++;
  }
  const entries = Object.entries(schedule).filter(([k]) => {
    const [y, m] = k.split("-").map(Number);
    return y === year && m === month + 1;
  });
  const jobDays = {};
  let rainCount = 0, bufferCount = 0, phCount = 0, satCount = 0;
  entries.forEach(([k, cell]) => {
    const d = parseInt(k.split("-")[2]);
    if (cell.type === "job") {
      jobDays[cell.jobId] = (jobDays[cell.jobId] || 0) + 1;
      if (isSat(year, month, d)) satCount++;
    }
    if (cell.type === "rain")   rainCount++;
    if (cell.type === "buffer") bufferCount++;
    if (cell.type === "ph")     phCount++;
  });
  const scheduledJobIds = Object.keys(jobDays);
  const scheduledJobs = scheduledJobIds.map(id => jobs.find(j => j.id === id)).filter(Boolean);
  const billableDays = scheduledJobIds.reduce((s, id) => s + (jobDays[id] || 0), 0);
  const regularDays = billableDays - satCount;
  const utilisationPct = availWeekdays > 0 ? (regularDays / availWeekdays) * 100 : 0;
  const gapDays = Math.max(0, availWeekdays - regularDays - rainCount - bufferCount - phCount);
  let monthRevenue = 0, regularLabour = 0, satLabour = 0;
  const jobBreakdown = [];
  scheduledJobs.forEach(j => {
    const dSched = jobDays[j.id] || 0;
    const satDays = entries.filter(([k, c]) =>
      c.type === "job" && c.jobId === j.id && isSat(year, month, parseInt(k.split("-")[2]))
    ).length;
    const regDays = dSched - satDays;
    const dpc = crewDailyCost(j.crew);
    const jRevenue = j.quotedValue * (dSched / (j.quotedDays || 1));
    const jLabour = regDays * dpc + satDays * dpc * SAT_MULT;
    monthRevenue += jRevenue;
    regularLabour += regDays * dpc;
    satLabour += satDays * dpc * SAT_MULT;
    jobBreakdown.push({ job: j, dSched, satDays, jRevenue, jLabour, jGP: jRevenue - jLabour, dpc });
  });
  const totalLabour = regularLabour + satLabour;
  const monthGP = monthRevenue - totalLabour;
  const monthNP = monthGP - MONTHLY_FIXED;
  const monthNPPct = monthRevenue > 0 ? (monthNP / monthRevenue) * 100 : 0;
  const gapRevenueLost = gapDays * 2400;
  jobBreakdown.forEach(b => {
    const revShare = monthRevenue > 0 ? b.jRevenue / monthRevenue : 0;
    b.jFixedAlloc = MONTHLY_FIXED * revShare;
    b.jNP = b.jGP - b.jFixedAlloc;
    b.jNPPct = b.jRevenue > 0 ? (b.jNP / b.jRevenue) * 100 : 0;
    b.priorityScore = b.dSched > 0 ? b.jNP / b.dSched : 0;
  });
  return { availWeekdays, jobDays, rainCount, bufferCount, phCount, satCount, scheduledJobs, regularDays, utilisationPct, gapDays, monthRevenue, totalLabour, monthGP, monthNP, monthNPPct, gapRevenueLost, jobBreakdown };
}
function MiniMonth({ year, month, schedule, jobs, onClick, isCurrent }) {
  const dim = daysInMonth(year, month);
  const fd = firstDow(year, month);
  const cells = [];
  for (let i = 0; i < fd; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  return (
    <div onClick={onClick} style={{ cursor: "pointer", padding: "10px", background: isCurrent ? `${GOLD}12` : SURFACE2, border: `1px solid ${isCurrent ? GOLD : BORDER}`, flex: 1 }}>
      <Mono style={{ fontSize: "10px", color: isCurrent ? GOLD : TEXT_MID, display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {MONTHS[month].slice(0,3)} {year}
      </Mono>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "1px" }}>
        {cells.map((d, i) => {
          if (!d) return <div key={"e"+i} style={{ height: "8px" }} />;
          const cell = schedule[dk(year, month, d)];
          const sun = isSun(year, month, d);
          let bg = BORDER;
          if (cell && cell.type === "job") {
            const j = jobs.find(x => x.id === cell.jobId);
            bg = j ? getCol(j.colorId).border + "88" : BORDER;
          } else if (cell && cell.type === "rain")   bg = BLUE + "55";
          else if (cell && cell.type === "buffer") bg = AMBER + "55";
          else if (cell && cell.type === "ph")     bg = RED + "55";
          return <div key={d} style={{ height: "8px", background: sun ? "transparent" : bg, borderRadius: "1px" }} />;
        })}
      </div>
    </div>
  );
}
function MonthWrap({ year, month, stats, onClose }) {
  const { availWeekdays, regularDays, utilisationPct, gapDays, monthRevenue, totalLabour, monthGP, monthNP, monthNPPct, gapRevenueLost, rainCount, bufferCount, phCount, satCount, jobBreakdown } = stats;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER2}`, padding: "28px", width: "640px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <Mono style={{ fontSize: "10px", color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Month Wrap</Mono>
            <h2 style={{ fontSize: "22px", fontWeight: "400" }}>{MONTHS[month]} {year}</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: TEXT_DIM, cursor: "pointer", fontSize: "22px", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: BORDER, marginBottom: "20px" }}>
          {[
            { l: "Revenue",     v: fmt(monthRevenue),  c: TEXT },
            { l: "Labour",      v: fmt(totalLabour),   c: RED  },
            { l: "Gross Profit",v: fmt(monthGP),       c: tl(monthRevenue > 0 ? monthGP/monthRevenue*100 : 0, 40, 30) },
            { l: "Net Profit",  v: fmt(monthNP),       c: tl(monthNPPct, 20, 10) },
          ].map(m => (
            <div key={m.l} style={{ background: SURFACE2, padding: "14px", textAlign: "center" }}>
              <Mono style={{ fontSize: "9px", color: TEXT_DIM, display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.l}</Mono>
              <Mono style={{ fontSize: "18px", color: m.c }}>{m.v}</Mono>
            </div>
          ))}
        </div>
        <Card style={{ marginBottom: "14px" }}>
          <SecTitle>Utilisation</SecTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {[
              { l: "Available weekdays",   v: availWeekdays + "d" },
              { l: "Billable days",        v: regularDays + "d",       c: tl(utilisationPct, 85, 70) },
              { l: "Utilisation",          v: fmtPct(utilisationPct),  c: tl(utilisationPct, 85, 70) },
              { l: "Saturday OT",          v: satCount + "d",          c: satCount > 0 ? AMBER : TEXT_DIM },
              { l: "Rain days",            v: rainCount + "d",         c: BLUE },
              { l: "Buffer / travel",      v: bufferCount + "d",       c: AMBER },
              { l: "Public holidays",      v: phCount + "d",           c: RED },
              { l: "Gap days",             v: gapDays + "d",           c: gapDays > 2 ? RED : TEXT_DIM },
              { l: "Revenue lost to gaps", v: fmt(gapRevenueLost),     c: gapDays > 0 ? RED : TEXT_DIM },
            ].map(row => (
              <div key={row.l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: "12px", color: TEXT_MID }}>{row.l}</span>
                <Mono style={{ fontSize: "13px", color: row.c || TEXT }}>{row.v}</Mono>
              </div>
            ))}
          </div>
        </Card>
        {jobBreakdown.length > 0 && (
          <Card style={{ marginBottom: "14px" }}>
            <SecTitle>Per-Job Breakdown</SecTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px 70px 60px", background: SURFACE2, padding: "7px 10px", marginBottom: "2px", gap: "4px" }}>
              {["Job", "Revenue", "Labour", "GP", "NP%"].map(h => (
                <Mono key={h} style={{ fontSize: "9px", color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</Mono>
              ))}
            </div>
            {[...jobBreakdown].sort((a, b) => b.jNP - a.jNP).map(b => {
              const col = getCol(b.job.colorId);
              return (
                <div key={b.job.id} style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px 70px 60px", padding: "8px 10px", borderBottom: `1px solid ${BORDER}`, alignItems: "center", borderLeft: `3px solid ${col.border}`, gap: "4px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: TEXT }}>{b.job.client}</div>
                    <Mono style={{ fontSize: "9px", color: TEXT_DIM }}>{b.dSched}d scheduled</Mono>
                  </div>
                  <Mono style={{ fontSize: "11px", color: TEXT }}>{fmt(b.jRevenue)}</Mono>
                  <Mono style={{ fontSize: "11px", color: RED }}>{fmt(b.jLabour)}</Mono>
                  <Mono style={{ fontSize: "11px", color: tl(b.jRevenue > 0 ? b.jGP/b.jRevenue*100 : 0, 40, 30) }}>{fmt(b.jGP)}</Mono>
                  <Mono style={{ fontSize: "11px", color: tl(b.jNPPct, 20, 10) }}>{fmtPct(b.jNPPct)}</Mono>
                </div>
              );
            })}
          </Card>
        )}
        <Card style={{ background: `${GOLD}08`, borderColor: `${GOLD}25` }}>
          <SecTitle color={GOLD}>Wrap Notes</SecTitle>
          <textarea
            placeholder="What happened this month? Paste into Jarvis for next month's brief..."
            style={{ width: "100%", height: "80px", background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT, padding: "10px", fontFamily: "'Georgia',serif", fontSize: "13px", outline: "none", resize: "vertical", lineHeight: "1.7" }}
          />
        </Card>
        <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${BORDER2}`, color: TEXT_DIM, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: "10px", letterSpacing: "0.1em", padding: "7px 16px" }}>CLOSE</button>
          <button onClick={() => window.print()} style={{ background: GOLD, border: "none", color: "#000", cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: "10px", letterSpacing: "0.12em", padding: "7px 16px", fontWeight: "500" }}>PRINT / SAVE</button>
        </div>
      </div>
    </div>
  );
}
export default function JobPlanner() {
  const today = new Date();
  const [year,        setYear]        = useState(today.getFullYear());
  const [month,       setMonth]       = useState(today.getMonth());
  const [jobs,        setJobs]        = useState([]);
  const [schedule,    setSchedule]    = useState({});
  const [selectedTool,setSelectedTool]= useState(null);
  const [drag,        setDrag]        = useState(null);
  const [view,        setView]        = useState("planner");
  const [showForm,    setShowForm]    = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [newJob,      setNewJob]      = useState(EMPTY_JOB);
  const [showWrap,    setShowWrap]    = useState(false);
  useEffect(() => {
    Promise.all([
      fetch('/api/jobs?status=won').then(r => r.json()),
      fetch('/api/jobs?status=in_progress').then(r => r.json()),
    ]).then(([won, inProgress]) => {
      const all = [...(Array.isArray(won) ? won : []), ...(Array.isArray(inProgress) ? inProgress : [])];
      if (all.length === 0) {
        // Fall back to SEED_JOBS if DB is empty
        setJobs(SEED_JOBS);
        return;
      }
      const JOB_COLORS = ["green", "amber", "blue", "purple", "red", "gold", "teal", "violet"];
      setJobs(all.map((j, i) => ({
        id: j.id,
        client: j.client_name,
        suburb: j.suburb ?? '',
        type: j.install_type === 'fullSubframe' ? 'New Deck' : j.install_type === 'redeck' ? 'Redeck' : 'New Deck',
        quotedDays: Math.ceil((j.sqm ?? 30) / 10),
        quotedHours: Math.ceil((j.sqm ?? 30) / 10) * 8,
        quotedValue: j.gross_quote ?? 0,
        actualDays: null,
        actualHours: null,
        notes: j.suburb ?? '',
        crew: ['baylee', 'marius'],
        colorId: JOB_COLORS[i % JOB_COLORS.length],
      })));
    }).catch(() => setJobs(SEED_JOBS));
  }, []);
  function prevMonth() { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); }
  function nextMonth() { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); }
  const dim   = daysInMonth(year, month);
  const fd    = firstDow(year, month);
  const calCells = [];
  for (let i = 0; i < fd; i++) calCells.push(null);
  for (let d = 1; d <= dim; d++) calCells.push(d);
  function getCell(d) { return d ? schedule[dk(year, month, d)] || null : null; }
  function setCell(d, val) {
    if (!d) return;
    const k = dk(year, month, d);
    setSchedule(p => { const n = { ...p }; if (val === null) delete n[k]; else n[k] = val; return n; });
  }
  function handleDayClick(day) {
    if (!day || isSun(year, month, day) || !selectedTool) return;
    const cell = getCell(day);
    if (cell) {
      const same = (cell.type === "job" && selectedTool === cell.jobId) || (cell.type === selectedTool);
      if (same) { setCell(day, null); return; }
    }
    if (["rain","buffer","ph"].includes(selectedTool)) setCell(day, { type: selectedTool });
    else setCell(day, { type: "job", jobId: selectedTool });
  }
  function handleDrop(day) {
    if (!day || !drag || isSun(year, month, day)) return;
    if (drag.kind === "job") setCell(day, { type: "job", jobId: drag.id });
    else setCell(day, { type: drag.blockType });
    setDrag(null);
  }
  function monthOffset(n) {
    let m = month + n, y = year;
    while (m > 11) { m -= 12; y++; }
    while (m < 0)  { m += 12; y--; }
    return { y, m };
  }
  const stats = useMemo(() => computeMonthStats(year, month, jobs, schedule), [year, month, jobs, schedule]);
  const { availWeekdays, jobDays, rainCount, bufferCount, phCount, satCount, regularDays, utilisationPct, gapDays, monthRevenue, totalLabour, monthNP, monthNPPct, gapRevenueLost, jobBreakdown } = stats;
  function openNew()   { setNewJob(EMPTY_JOB); setEditId(null); setShowForm(true); }
  function openEdit(j) { setNewJob({ ...j, actualDays: j.actualDays ?? "", actualHours: j.actualHours ?? "" }); setEditId(j.id); setShowForm(true); }
  function saveJob() {
    if (!newJob.client) return;
    const saved = {
      ...newJob,
      id: editId || ("j" + Date.now()),
      quotedDays:  parseFloat(newJob.quotedDays)  || 0,
      quotedHours: parseFloat(newJob.quotedHours) || 0,
      quotedValue: parseFloat(newJob.quotedValue) || 0,
      actualDays:  newJob.actualDays  !== "" ? parseFloat(newJob.actualDays)  : null,
      actualHours: newJob.actualHours !== "" ? parseFloat(newJob.actualHours) : null,
    };
    setJobs(p => editId ? p.map(j => j.id === editId ? saved : j) : [...p, saved]);
    setShowForm(false);
  }
  function deleteJob(id) {
    setJobs(p => p.filter(j => j.id !== id));
    setSchedule(p => { const n = { ...p }; Object.keys(n).forEach(k => { if (n[k] && n[k].jobId === id) delete n[k]; }); return n; });
    if (selectedTool === id) setSelectedTool(null);
  }
  const inp = { background: SURFACE2, border: `1px solid ${BORDER2}`, color: TEXT, padding: "7px 10px", fontFamily: "'DM Mono',monospace", fontSize: "13px", outline: "none", width: "100%" };
  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "'Georgia',serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number] { -moz-appearance: textfield; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
        input:focus, textarea:focus, select:focus { border-color: #b8935a !important; outline: none; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #222; }
        .jp-dc:hover { filter: brightness(1.25); cursor: pointer; }
        .jp-chip:hover { opacity: 0.8; cursor: grab; } .jp-chip:active { cursor: grabbing; }
        .jp-btng { background: transparent; border: 1px solid #20202a; color: #4e4a45; cursor: pointer; font-family: 'DM Mono',monospace; font-size: 10px; letter-spacing: 0.1em; padding: 5px 12px; transition: all 0.15s; }
        .jp-btng:hover { border-color: #b8935a; color: #b8935a; }
        .jp-btngold { background: #b8935a; border: none; color: #000; cursor: pointer; font-family: 'DM Mono',monospace; font-size: 10px; letter-spacing: 0.12em; padding: 7px 16px; font-weight: 500; }
        .jp-btngold:hover { opacity: 0.85; }
        .jp-xbtn { position: absolute; top: 2px; right: 3px; background: transparent; border: none; color: #4e4a45; cursor: pointer; font-size: 10px; opacity: 0; line-height: 1; padding: 1px; }
        .jp-daywrap:hover .jp-xbtn { opacity: 1; }
      `}</style>
      {showWrap && <MonthWrap year={year} month={month} stats={stats} onClose={() => setShowWrap(false)} />}
      {/* HEADER */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "16px 26px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Mono style={{ fontSize: "10px", color: GOLD, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: "3px" }}>Endure Decking · Operations</Mono>
          <h1 style={{ fontSize: "20px", fontWeight: "400", letterSpacing: "-0.3px" }}>Job Planner</h1>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {["planner","jobs"].map(v => (
            <button key={v} className="jp-btng" style={{ color: view === v ? GOLD : TEXT_DIM, borderColor: view === v ? GOLD : BORDER2 }} onClick={() => setView(v)}>
              {v === "planner" ? "CALENDAR" : "JOB LIBRARY"}
            </button>
          ))}
          <button className="jp-btng" onClick={() => setShowWrap(true)}>MONTH WRAP ↗</button>
          <button className="jp-btngold" onClick={openNew}>+ NEW JOB</button>
        </div>
      </div>
      {/* JOB FORM MODAL */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER2}`, padding: "24px", width: "560px", maxHeight: "90vh", overflowY: "auto" }}>
            <SecTitle>{editId ? "Edit Job" : "New Job Profile"}</SecTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              {[
                { label: "Client Name",          key: "client",      type: "text"   },
                { label: "Suburb",               key: "suburb",      type: "text"   },
                { label: "Quoted Days",          key: "quotedDays",  type: "number" },
                { label: "Quoted Hours (total)", key: "quotedHours", type: "number" },
                { label: "Quoted Value ($)",     key: "quotedValue", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  <input type={f.type} value={newJob[f.key]} onChange={e => setNewJob(p => ({ ...p, [f.key]: e.target.value }))} style={inp} />
                </div>
              ))}
              <div>
                <Label>Job Type</Label>
                <select value={newJob.type} onChange={e => setNewJob(p => ({ ...p, type: e.target.value }))} style={{ ...inp, background: SURFACE2 }}>
                  {["New Deck","Redeck","Pergola","Deck + Pergola","Other"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: "14px" }}>
              <Label>Job Colour</Label>
              <div style={{ display: "flex", gap: "6px" }}>
                {JOB_PALETTE.map(p => (
                  <div key={p.id} onClick={() => setNewJob(prev => ({ ...prev, colorId: p.id }))}
                    style={{ width: "28px", height: "28px", background: p.bg, border: `2px solid ${newJob.colorId === p.id ? p.border : BORDER2}`, cursor: "pointer", position: "relative", transition: "border-color 0.15s" }}>
                    {newJob.colorId === p.id && <div style={{ position: "absolute", inset: "5px", background: p.border }} />}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: "14px" }}>
              <Label>Crew</Label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {FINANCE.crew.map(c => {
                  const on = newJob.crew.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => setNewJob(p => ({ ...p, crew: on ? p.crew.filter(x => x !== c.id) : [...p.crew, c.id] }))}
                      style={{ padding: "4px 10px", background: on ? `${GOLD}20` : "transparent", border: `1px solid ${on ? GOLD : BORDER2}`, color: on ? GOLD : TEXT_DIM, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: "11px" }}>
                      {c.name}
                    </button>
                  );
                })}
              </div>
              <Mono style={{ fontSize: "10px", color: TEXT_DIM, display: "block", marginTop: "5px" }}>
                Daily: {fmt(crewDailyCost(newJob.crew))} · Saturday: {fmt(crewDailyCost(newJob.crew) * SAT_MULT)}
              </Mono>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px", padding: "12px", background: SURFACE2, border: `1px solid ${BORDER}` }}>
              <div>
                <Label color={AMBER}>Actual Days (post-job)</Label>
                <input type="number" value={newJob.actualDays} placeholder="—" onChange={e => setNewJob(p => ({ ...p, actualDays: e.target.value }))} style={inp} />
              </div>
              <div>
                <Label color={AMBER}>Actual Hours (post-job)</Label>
                <input type="number" value={newJob.actualHours} placeholder="—" onChange={e => setNewJob(p => ({ ...p, actualHours: e.target.value }))} style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: "14px" }}>
              <Label>Notes</Label>
              <textarea value={newJob.notes} onChange={e => setNewJob(p => ({ ...p, notes: e.target.value }))} style={{ ...inp, height: "60px", resize: "vertical", fontFamily: "'Georgia',serif" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1px", background: BORDER, marginBottom: "16px" }}>
              {[
                { l: "Value/Day",  v: fmt(newJob.quotedValue / (newJob.quotedDays  || 1)) },
                { l: "Value/Hour", v: fmt(newJob.quotedValue / (newJob.quotedHours || 1)) },
                { l: "GP/Day",     v: fmt(newJob.quotedValue / (newJob.quotedDays  || 1) - crewDailyCost(newJob.crew)) },
              ].map(m => (
                <div key={m.l} style={{ background: SURFACE2, padding: "10px", textAlign: "center" }}>
                  <Mono style={{ fontSize: "9px", color: TEXT_DIM, display: "block", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.l}</Mono>
                  <Mono style={{ fontSize: "15px", color: GOLD }}>{m.v}</Mono>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="jp-btng" onClick={() => setShowForm(false)}>CANCEL</button>
              <button className="jp-btngold" onClick={saveJob}>{editId ? "UPDATE" : "SAVE JOB"}</button>
            </div>
          </div>
        </div>
      )}
      {/* JOB LIBRARY */}
      {view === "jobs" && (
        <div style={{ padding: "22px 26px" }}>
          <div style={{ border: `1px solid ${BORDER2}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "16px 1fr 90px 80px 80px 80px 80px 28px", background: SURFACE2, padding: "8px 12px", gap: "8px" }}>
              {["", "Client", "Type", "Value", "Days", "$/Day", "$/Hr", ""].map(h => (
                <Mono key={h} style={{ fontSize: "9px", color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</Mono>
              ))}
            </div>
            {jobs.map(j => {
              const col = getCol(j.colorId);
              const dayVar  = j.actualDays  ? j.actualDays  - j.quotedDays  : null;
              const hrVar   = j.actualHours ? j.actualHours - j.quotedHours : null;
              return (
                <div key={j.id} style={{ display: "grid", gridTemplateColumns: "16px 1fr 90px 80px 80px 80px 80px 28px", padding: "10px 12px", alignItems: "center", borderTop: `1px solid ${BORDER}`, gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", background: col.bg, border: `1px solid ${col.border}` }} />
                  <div>
                    <div style={{ fontSize: "13px", color: TEXT }}>{j.client} <span style={{ color: TEXT_DIM, fontSize: "11px" }}>· {j.suburb}</span></div>
                    {j.notes && <Mono style={{ fontSize: "9px", color: TEXT_DIM, display: "block" }}>{j.notes}</Mono>}
                  </div>
                  <Mono style={{ fontSize: "9px", color: TEXT_DIM }}>{j.type}</Mono>
                  <Mono style={{ fontSize: "12px", color: TEXT }}>{fmt(j.quotedValue)}</Mono>
                  <div>
                    <Mono style={{ fontSize: "12px", color: TEXT_MID }}>{j.quotedDays}d</Mono>
                    {dayVar !== null && <Mono style={{ fontSize: "9px", color: dayVar > 0 ? RED : GREEN, display: "block" }}>{dayVar > 0 ? "+" : ""}{dayVar}d actual</Mono>}
                  </div>
                  <Mono style={{ fontSize: "12px", color: GOLD }}>{fmt(j.quotedValue / j.quotedDays)}</Mono>
                  <Mono style={{ fontSize: "12px", color: GOLD }}>{fmt(j.quotedValue / (j.quotedHours || 1))}</Mono>
                  <div style={{ display: "flex", gap: "3px" }}>
                    <button onClick={() => openEdit(j)} style={{ background: "transparent", border: "none", color: TEXT_DIM, cursor: "pointer", fontSize: "11px", fontFamily: "'DM Mono',monospace", padding: "1px" }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = GOLD}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM}>✎</button>
                    <button onClick={() => deleteJob(j.id)} style={{ background: "transparent", border: "none", color: TEXT_DIM, cursor: "pointer", fontSize: "13px", padding: "1px" }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = RED}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* PLANNER */}
      {view === "planner" && (
        <div>
          {/* 3-month strip */}
          <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "10px 26px", display: "flex", gap: "8px" }}>
            {[-1, 0, 1, 2].map(offset => {
              const { y, m } = monthOffset(offset);
              return (
                <MiniMonth key={y + "-" + m} year={y} month={m} schedule={schedule} jobs={jobs}
                  isCurrent={offset === 0} onClick={() => { setYear(y); setMonth(m); }} />
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 288px", minHeight: "calc(100vh - 130px)" }}>
            {/* CALENDAR */}
            <div style={{ borderRight: `1px solid ${BORDER}`, padding: "18px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <button className="jp-btng" onClick={prevMonth}>← PREV</button>
                <div style={{ textAlign: "center" }}>
                  <h2 style={{ fontSize: "19px", fontWeight: "400" }}>{MONTHS[month]} {year}</h2>
                  <Mono style={{ fontSize: "10px", color: TEXT_DIM }}>{regularDays}d scheduled · {fmtPct(utilisationPct)} utilised</Mono>
                </div>
                <button className="jp-btng" onClick={nextMonth}>NEXT →</button>
              </div>
              {/* Tool palette */}
              <div style={{ display: "flex", gap: "5px", marginBottom: "12px", padding: "8px 10px", background: SURFACE2, border: `1px solid ${BORDER}`, alignItems: "center", flexWrap: "wrap" }}>
                <Mono style={{ fontSize: "9px", color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: "4px" }}>Place:</Mono>
                {Object.entries(BLOCK).map(([btype, bs]) => {
                  const active = selectedTool === btype;
                  return (
                    <div key={btype} className="jp-chip"
                      draggable onDragStart={() => setDrag({ kind: "block", blockType: btype })}
                      onClick={() => setSelectedTool(p => p === btype ? null : btype)}
                      style={{ padding: "3px 9px", background: active ? bs.bg : SURFACE3, border: `1px solid ${active ? bs.color : BORDER2}`, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", userSelect: "none" }}>
                      <span style={{ fontSize: "10px" }}>{bs.icon}</span>
                      <Mono style={{ fontSize: "9px", color: active ? bs.color : TEXT_DIM }}>{bs.label}</Mono>
                    </div>
                  );
                })}
                <div style={{ width: "1px", height: "18px", background: BORDER, margin: "0 3px" }} />
                {jobs.map(j => {
                  const col = getCol(j.colorId);
                  const dSched = Object.entries(schedule).filter(([k, c]) => {
                    const [sy, sm] = k.split("-").map(Number);
                    return sy === year && sm === month + 1 && c.type === "job" && c.jobId === j.id;
                  }).length;
                  const active = selectedTool === j.id;
                  const done = dSched >= j.quotedDays;
                  return (
                    <div key={j.id} className="jp-chip"
                      draggable onDragStart={() => setDrag({ kind: "job", id: j.id })}
                      onClick={() => setSelectedTool(p => p === j.id ? null : j.id)}
                      style={{ padding: "3px 9px 3px 11px", background: active ? col.bg : SURFACE3, border: `1px solid ${active ? col.border : done ? col.border + "44" : BORDER2}`, cursor: "pointer", userSelect: "none", position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: col.border }} />
                      <Mono style={{ fontSize: "9px", color: active ? col.text : TEXT_MID }}>{j.client}</Mono>
                      <Mono style={{ fontSize: "8px", color: done ? GREEN : TEXT_DIM, display: "block" }}>{dSched}/{j.quotedDays}d {done ? "✓" : ""}</Mono>
                    </div>
                  );
                })}
                {selectedTool && (
                  <button className="jp-btng" style={{ marginLeft: "auto", fontSize: "9px", padding: "3px 8px" }} onClick={() => setSelectedTool(null)}>✕ CLEAR</button>
                )}
              </div>
              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px", marginBottom: "2px" }}>
                {DAY_LABELS.map(d => (
                  <div key={d} style={{ textAlign: "center", padding: "4px 0" }}>
                    <Mono style={{ fontSize: "9px", color: d === "Sat" ? AMBER : d === "Sun" ? RED + "55" : TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em" }}>{d}</Mono>
                  </div>
                ))}
              </div>
              {/* Calendar cells */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px" }}>
                {calCells.map((day, idx) => {
                  if (!day) return <div key={"e" + idx} style={{ height: "70px" }} />;
                  const cell    = getCell(day);
                  const sun     = isSun(year, month, day);
                  const sat     = isSat(year, month, day);
                  const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                  let cellBg = SURFACE2, borderCol = BORDER, content = null;
                  if (sun) {
                    cellBg = "#060606";
                  } else if (cell) {
                    if (cell.type === "job") {
                      const j = jobs.find(x => x.id === cell.jobId);
                      if (j) {
                        const col = getCol(j.colorId);
                        cellBg = col.bg; borderCol = col.border + "55";
                        content = (
                          <div>
                            <Mono style={{ fontSize: "9px", color: col.text, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.client}</Mono>
                            <Mono style={{ fontSize: "8px", color: col.border + "99", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.suburb}</Mono>
                          </div>
                        );
                      }
                    } else {
                      const bs = BLOCK[cell.type];
                      if (bs) {
                        cellBg = bs.bg; borderCol = bs.color + "44";
                        content = <div style={{ textAlign: "center", marginTop: "6px", fontSize: "18px" }}>{bs.icon}</div>;
                      }
                    }
                  }
                  return (
                    <div key={dk(year, month, day)}
                      className={"jp-daywrap" + (!sun ? " jp-dc" : "")}
                      onClick={() => handleDayClick(day)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => handleDrop(day)}
                      style={{ height: "70px", background: cellBg, border: isToday ? `1px solid ${GOLD}` : cell && !sun ? `1px solid ${borderCol}` : `1px solid ${BORDER}`, padding: "4px", cursor: sun ? "default" : "pointer", opacity: sun ? 0.12 : 1, position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Mono style={{ fontSize: "10px", color: sat ? AMBER : isToday ? GOLD : TEXT_DIM, fontWeight: isToday ? "500" : "300" }}>{day}</Mono>
                        {sat && cell && cell.type === "job" && <Mono style={{ fontSize: "7px", color: AMBER, background: "#1a1000", padding: "1px 3px" }}>OT</Mono>}
                      </div>
                      <div style={{ marginTop: "2px" }}>{content}</div>
                      {cell && !sun && (
                        <button className="jp-xbtn" onClick={e => { e.stopPropagation(); setCell(day, null); }}>×</button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap", alignItems: "center" }}>
                {JOB_PALETTE.map(p => <div key={p.id} style={{ width: "8px", height: "8px", background: p.bg, border: `1px solid ${p.border}` }} />)}
                <Mono style={{ fontSize: "9px", color: AMBER, marginLeft: "4px" }}>SAT = 1.5× OT</Mono>
              </div>
            </div>
            {/* SIDEBAR */}
            <div style={{ padding: "16px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              <Card style={{ background: `${GOLD}08`, borderColor: `${GOLD}28` }}>
                <SecTitle color={GOLD}>{MONTHS[month]} Forecast</SecTitle>
                {[
                  { l: "Revenue",    v: fmt(monthRevenue),  c: TEXT },
                  { l: "Labour",     v: fmt(totalLabour),   c: RED  },
                  { l: "Net Profit", v: fmt(monthNP),       c: tl(monthNPPct, 20, 10) },
                  { l: "NP %",       v: fmtPct(monthNPPct), c: tl(monthNPPct, 20, 10) },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < 3 ? `1px solid ${BORDER}` : "none" }}>
                    <span style={{ fontSize: "11px", color: TEXT_MID }}>{row.l}</span>
                    <Mono style={{ fontSize: "15px", color: row.c }}>{row.v}</Mono>
                  </div>
                ))}
              </Card>
              <Card>
                <SecTitle>Utilisation</SecTitle>
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", color: TEXT_MID }}>Weekday billable</span>
                    <Mono style={{ fontSize: "14px", color: tl(utilisationPct, 85, 70) }}>{regularDays}/{availWeekdays}d</Mono>
                  </div>
                  <div style={{ height: "4px", background: BORDER, borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: utilisationPct + "%", background: tl(utilisationPct, 85, 70), borderRadius: "2px", transition: "width 0.4s" }} />
                  </div>
                  <Mono style={{ fontSize: "10px", color: tl(utilisationPct, 85, 70), display: "block", marginTop: "3px" }}>{fmtPct(utilisationPct)} utilised</Mono>
                </div>
                {[
                  { l: "Rain",     v: rainCount   + "d", c: rainCount   > 0 ? BLUE  : TEXT_DIM },
                  { l: "Buffer",   v: bufferCount + "d", c: bufferCount > 0 ? AMBER : TEXT_DIM },
                  { l: "Pub hols", v: phCount     + "d", c: phCount     > 0 ? RED   : TEXT_DIM },
                  { l: "OT (Sat)", v: satCount    + "d", c: satCount    > 0 ? AMBER : TEXT_DIM },
                  { l: "Gap days", v: gapDays     + "d", c: gapDays     > 2 ? RED   : TEXT_DIM },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ fontSize: "11px", color: TEXT_MID }}>{row.l}</span>
                    <Mono style={{ fontSize: "11px", color: row.c }}>{row.v}</Mono>
                  </div>
                ))}
              </Card>
              {jobBreakdown.length > 0 && (
                <Card>
                  <SecTitle>Jobs — Priority Order</SecTitle>
                  {[...jobBreakdown].sort((a, b) => b.priorityScore - a.priorityScore).map((b, i) => {
                    const col = getCol(b.job.colorId);
                    const complete = b.dSched >= b.job.quotedDays;
                    return (
                      <div key={b.job.id} style={{ marginBottom: "8px", padding: "9px 10px", background: SURFACE2, borderLeft: `3px solid ${col.border}`, position: "relative" }}>
                        <div style={{ position: "absolute", top: "6px", right: "8px" }}>
                          <Mono style={{ fontSize: "9px", color: TEXT_DIM }}>#{i+1}</Mono>
                        </div>
                        <div style={{ marginBottom: "5px" }}>
                          <div style={{ fontSize: "12px", color: TEXT }}>{b.job.client}</div>
                          <Mono style={{ fontSize: "9px", color: TEXT_DIM }}>{b.job.suburb} · {b.dSched}/{b.job.quotedDays}d</Mono>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "3px" }}>
                          {[
                            { l: "GP",  v: fmt(b.jGP),      c: tl(b.jRevenue > 0 ? b.jGP / b.jRevenue * 100 : 0, 40, 25) },
                            { l: "NP",  v: fmt(b.jNP),       c: tl(b.jNPPct, 20, 10) },
                            { l: "NP%", v: fmtPct(b.jNPPct), c: tl(b.jNPPct, 20, 10) },
                          ].map(m => (
                            <div key={m.l} style={{ textAlign: "center", background: SURFACE3, padding: "4px" }}>
                              <Mono style={{ fontSize: "8px", color: TEXT_DIM, display: "block" }}>{m.l}</Mono>
                              <Mono style={{ fontSize: "11px", color: m.c }}>{m.v}</Mono>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: "5px", height: "2px", background: BORDER }}>
                          <div style={{ height: "100%", width: Math.min(100, (b.dSched / b.job.quotedDays) * 100) + "%", background: complete ? GREEN : col.border, transition: "width 0.3s" }} />
                        </div>
                        {complete && <Mono style={{ fontSize: "8px", color: GREEN, display: "block", marginTop: "2px" }}>✓ fully scheduled</Mono>}
                      </div>
                    );
                  })}
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
