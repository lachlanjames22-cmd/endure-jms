'use client'

import { useState, useMemo, useEffect } from "react";
// ─── TOKENS (matches Endure OS) ───────────────────────────────────────────────
const GOLD="#b8935a", BG="#080808", SURFACE="#0c0c0f", SURFACE2="#111114";
const SURFACE3="#0a0a0d", TEXT="#e8ddd0", TEXT_DIM="#4e4a45", TEXT_MID="#7a7570";
const GREEN="#4ade80", AMBER="#fbbf24", RED="#f87171";
const BORDER="#181820", BORDER2="#20202a";
// ─── BUSINESS CONSTANTS ───────────────────────────────────────────────────────
const FINANCE = {
  totalOpex: 8714.93,
  ownerMonthly: 1884.62 * 52 / 12,
  availableDaysPerMonth: 17.2,
  crew: [
    { id: "baylee", name: "Baylee", loadedRate: 55,    dailyHours: 8 },
    { id: "marius", name: "Marius", loadedRate: 43.77, dailyHours: 8 },
    { id: "ash",    name: "Ash",    loadedRate: 45.60, dailyHours: 8 },
    { id: "lachy",  name: "Lachy",  loadedRate: 72,    dailyHours: 8 },
  ],
};
const MONTHLY_FIXED = FINANCE.totalOpex + FINANCE.ownerMonthly;
const DAILY_FIXED_BURDEN = MONTHLY_FIXED / FINANCE.availableDaysPerMonth;
const BAYLEE_MARIUS_DAILY = (55 + 43.77) * 8;
const BREAK_EVEN_DAY = BAYLEE_MARIUS_DAILY + DAILY_FIXED_BURDEN;
// ─── JW LABEL SYSTEM ────────────────────────────────────────────────────────
const JW_LABELS: Record<string, { label: string; desc: string; color: string; bg: string; short: string }> = {
  red:   { label: "JW Red",   desc: "Standard volume",    color: "#f87171", bg: "#180a0a", short: "RED"   },
  black: { label: "JW Black", desc: "Premium complexity", color: "#e8ddd0", bg: "#111111", short: "BLK"   },
  blue:  { label: "JW Blue",  desc: "Brand signal",       color: "#60a5fa", bg: "#080e18", short: "BLU"   },
};
// ─── DNA DIMENSIONS ──────────────────────────────────────────────────────────
const DNA_DIMS = [
  { key: "margin",        label: "Margin",     desc: "NP% vs 20% target",         angle: -90  },
  { key: "efficiency",    label: "Efficiency", desc: "Actual hours vs quoted",     angle: -18  },
  { key: "complexity",    label: "Complexity", desc: "Did it run smooth",          angle: 54   },
  { key: "repeatability", label: "Repeat",     desc: "Would you do this again",    angle: 126  },
  { key: "client",        label: "Client",     desc: "Comms, access, decisions",   angle: 198  },
];
// ─── TYPES ───────────────────────────────────────────────────────────────────
interface DNAScore { margin: number; efficiency: number; complexity: number; repeatability: number; client: number }
interface Job {
  id: string; date: string; client: string; suburb: string; type: string; jwLabel: string;
  quotedDays: number; quotedHours: number; quotedValue: number;
  actualDays: number | string | null; actualHours: number | string | null;
  notes: string; crew: string[]; dna: DNAScore; breakEvenMet?: boolean;
}
// ─── SEED JOBS ────────────────────────────────────────────────────────────────
const SEED_JOBS: Job[] = [
  { id:"r1", date:"2025-11", client:"Henderson", suburb:"Applecross",    type:"New Deck",       jwLabel:"red",
    quotedDays:6, quotedHours:48, quotedValue:42000, actualDays:6,  actualHours:51,
    notes:"Merbau. Ran 3hrs over due to bearer realignment on day 4.", crew:["baylee","marius"],
    dna:{ margin:7, efficiency:5, complexity:7, repeatability:8, client:9 }, breakEvenMet:true },
  { id:"r2", date:"2025-11", client:"Nguyen",    suburb:"Cottesloe",    type:"Redeck",         jwLabel:"blue",
    quotedDays:4, quotedHours:32, quotedValue:28000, actualDays:5,  actualHours:38,
    notes:"Composite. Access through side gate — lost half a day. Beautiful end result, lots of photos.", crew:["baylee","marius"],
    dna:{ margin:5, efficiency:4, complexity:6, repeatability:6, client:8 }, breakEvenMet:false },
  { id:"r3", date:"2025-12", client:"Mitchell",  suburb:"Subiaco",      type:"Pergola",        jwLabel:"red",
    quotedDays:3, quotedHours:22, quotedValue:18500, actualDays:3,  actualHours:20,
    notes:"Freestanding powder coat. Clean, fast, Baylee knows these well.", crew:["baylee"],
    dna:{ margin:8, efficiency:9, complexity:8, repeatability:9, client:8 }, breakEvenMet:true },
  { id:"r4", date:"2025-12", client:"Williams",  suburb:"Nedlands",     type:"Deck + Pergola", jwLabel:"black",
    quotedDays:8, quotedHours:64, quotedValue:56000, actualDays:9,  actualHours:74,
    notes:"Large entertainer. Council setback issue added a day. Black tier complexity justified.", crew:["baylee","marius"],
    dna:{ margin:6, efficiency:4, complexity:3, repeatability:5, client:6 }, breakEvenMet:true },
  { id:"r5", date:"2026-01", client:"Pereira",   suburb:"Mosman Park",  type:"New Deck",       jwLabel:"black",
    quotedDays:5, quotedHours:40, quotedValue:38000, actualDays:5,  actualHours:39,
    notes:"Spotted gum. Client decisive, site clean, perfect access. This is the benchmark.", crew:["baylee","marius"],
    dna:{ margin:9, efficiency:9, complexity:8, repeatability:10, client:10 }, breakEvenMet:true },
  { id:"r6", date:"2026-01", client:"O'Brien",   suburb:"Fremantle",    type:"Redeck",         jwLabel:"red",
    quotedDays:4, quotedHours:32, quotedValue:22000, actualDays:5,  actualHours:41,
    notes:"Old jarrah redeck, hidden rot under boards. Lost a full day removing. Underquoted risk.", crew:["baylee","marius"],
    dna:{ margin:3, efficiency:2, complexity:2, repeatability:4, client:7 }, breakEvenMet:false },
  { id:"r7", date:"2026-02", client:"Tan",        suburb:"Claremont",    type:"New Deck",       jwLabel:"blue",
    quotedDays:6, quotedHours:48, quotedValue:45000, actualDays:6,  actualHours:46,
    notes:"Feature composite. Great photos, 2 referrals already. Instagram content gold.", crew:["baylee","marius"],
    dna:{ margin:7, efficiency:8, complexity:7, repeatability:8, client:9 }, breakEvenMet:true },
  { id:"r8", date:"2026-02", client:"Hawkins",    suburb:"Victoria Park", type:"Pergola",       jwLabel:"red",
    quotedDays:4, quotedHours:30, quotedValue:24000, actualDays:4,  actualHours:31,
    notes:"Standard freestanding. Minor footing adjustment. Solid.", crew:["baylee","marius"],
    dna:{ margin:7, efficiency:8, complexity:8, repeatability:8, client:7 }, breakEvenMet:true },
];
const EMPTY_JOB: Omit<Job, 'id'> = {
  date: "", client: "", suburb: "", type: "New Deck", jwLabel: "red",
  quotedDays: 0, quotedHours: 0, quotedValue: 0, actualDays: "", actualHours: "",
  notes: "", crew: ["baylee","marius"],
  dna: { margin: 5, efficiency: 5, complexity: 5, repeatability: 5, client: 5 },
};
function fmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "$0";
  return (n < 0 ? "-$" : "$") + Math.round(Math.abs(n)).toLocaleString();
}
function fmtPct(n: number) { return isNaN(n) || !isFinite(n) ? "0%" : n.toFixed(1) + "%"; }
function avg(arr: number[]) { return arr.length ? arr.reduce((s,x) => s+x, 0) / arr.length : 0; }
function tl(v: number, g: number, w: number) { return v >= g ? GREEN : v >= w ? AMBER : RED; }
function Mono({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <span style={{ fontFamily: "'DM Mono',monospace", ...style }}>{children}</span>;
}
function Label({ children, color = TEXT_DIM }: { children: React.ReactNode; color?: string }) {
  return <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "5px" }}>{children}</div>;
}
function SecTitle({ children, color = GOLD }: { children: React.ReactNode; color?: string }) {
  return <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px", paddingBottom: "8px", borderBottom: `1px solid ${BORDER}` }}>{children}</div>;
}
// ─── BREAK-EVEN CALC ────────────────────────────────────────────────────────
function calcBreakEven(job: Job) {
  const crewCost = job.crew.reduce((s, cid) => {
    const c = FINANCE.crew.find(x => x.id === cid);
    return s + (c ? c.loadedRate * c.dailyHours : 0);
  }, 0);
  const breakEvenPerDay = crewCost + DAILY_FIXED_BURDEN;
  const actualDays = parseFloat(String(job.actualDays)) || job.quotedDays;
  const breakEvenTotal = breakEvenPerDay * actualDays;
  const npDollars = job.quotedValue - (crewCost * actualDays) - (DAILY_FIXED_BURDEN * actualDays);
  const npPct = job.quotedValue > 0 ? (npDollars / job.quotedValue) * 100 : 0;
  const dailyRate = actualDays > 0 ? job.quotedValue / actualDays : 0;
  const breakEvenMet = job.quotedValue >= breakEvenTotal;
  const hoursVariance = job.actualHours != null ? parseFloat(String(job.actualHours)) - job.quotedHours : null;
  return { crewCost, breakEvenPerDay, breakEvenTotal, npDollars, npPct, dailyRate, breakEvenMet, hoursVariance, actualDays };
}
// ─── PENTAGON RADAR ──────────────────────────────────────────────────────────
function Pentagon({ dna, size = 140, color = GOLD }: { dna: DNAScore; size?: number; color?: string }) {
  const cx = size / 2, cy = size / 2, maxR = size * 0.38;
  function pt(angle: number, r: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  const gridLevels = [2, 4, 6, 8, 10];
  const gridPolygons = gridLevels.map(lvl => {
    const r = (lvl / 10) * maxR;
    return DNA_DIMS.map(d => pt(d.angle, r)).map(p => `${p.x},${p.y}`).join(" ");
  });
  const dataPoints = DNA_DIMS.map(d => pt(d.angle, (dna[d.key as keyof DNAScore] / 10) * maxR));
  const dataPath = dataPoints.map(p => `${p.x},${p.y}`).join(" ");
  const avgScore = avg(DNA_DIMS.map(d => dna[d.key as keyof DNAScore]));
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        {gridPolygons.map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke={BORDER2} strokeWidth="0.5" />
        ))}
        {DNA_DIMS.map(d => {
          const end = pt(d.angle, maxR);
          return <line key={d.key} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={BORDER2} strokeWidth="0.5" />;
        })}
        <polygon points={dataPath} fill={color + "20"} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
        ))}
        {DNA_DIMS.map(d => {
          const lpt = pt(d.angle, maxR + 14);
          return (
            <text key={d.key} x={lpt.x} y={lpt.y} textAnchor="middle" dominantBaseline="middle"
              style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", fill: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {d.label}
            </text>
          );
        })}
      </svg>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
        <Mono style={{ fontSize: "16px", color, display: "block", lineHeight: 1 }}>{avgScore.toFixed(1)}</Mono>
        <Mono style={{ fontSize: "7px", color: TEXT_DIM, display: "block", textTransform: "uppercase", letterSpacing: "0.1em" }}>avg</Mono>
      </div>
    </div>
  );
}
// ─── BREAK-EVEN FLOOR INDICATOR ──────────────────────────────────────────────
function BreakEvenBar({ job }: { job: Job }) {
  const { breakEvenPerDay, dailyRate, breakEvenMet, npPct, npDollars } = calcBreakEven(job);
  const fillPct = Math.min(120, (dailyRate / (BREAK_EVEN_DAY * 1.5)) * 100);
  const bePct   = (BREAK_EVEN_DAY / (BREAK_EVEN_DAY * 1.5)) * 100;
  const barColor = breakEvenMet ? tl(npPct, 20, 10) : RED;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <Mono style={{ fontSize: "9px", color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.1em" }}>Daily rate vs break-even floor</Mono>
        <Mono style={{ fontSize: "9px", color: barColor }}>{breakEvenMet ? "✓ ABOVE FLOOR" : "✗ BELOW FLOOR"}</Mono>
      </div>
      <div style={{ position: "relative", height: "6px", background: BORDER, borderRadius: "3px" }}>
        <div style={{ height: "100%", width: fillPct + "%", background: barColor + "60", borderRadius: "3px", transition: "width 0.4s" }} />
        <div style={{ position: "absolute", top: "-3px", bottom: "-3px", left: bePct + "%", width: "2px", background: AMBER, borderRadius: "1px" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
        <Mono style={{ fontSize: "9px", color: TEXT_DIM }}>{fmt(dailyRate)}/day actual</Mono>
        <Mono style={{ fontSize: "9px", color: AMBER }}>{fmt(breakEvenPerDay)}/day floor</Mono>
      </div>
      <div style={{ marginTop: "5px", display: "flex", justifyContent: "space-between" }}>
        <Mono style={{ fontSize: "10px", color: TEXT_MID }}>NP: <span style={{ color: barColor }}>{fmt(npDollars)}</span></Mono>
        <Mono style={{ fontSize: "10px", color: TEXT_MID }}>NP%: <span style={{ color: barColor }}>{fmtPct(npPct)}</span></Mono>
      </div>
    </div>
  );
}
// ─── DNA SLIDER ──────────────────────────────────────────────────────────────
function DNASlider({ dim, value, onChange }: { dim: typeof DNA_DIMS[0]; value: number; onChange: (v: number) => void }) {
  const color = value >= 7 ? GREEN : value >= 4 ? AMBER : RED;
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <div>
          <Mono style={{ fontSize: "10px", color: TEXT_MID }}>{dim.label}</Mono>
          <Mono style={{ fontSize: "9px", color: TEXT_DIM, display: "block" }}>{dim.desc}</Mono>
        </div>
        <Mono style={{ fontSize: "16px", color, minWidth: "24px", textAlign: "right" }}>{value}</Mono>
      </div>
      <input
        type="range" min="1" max="10" value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: "100%", accentColor: color, cursor: "pointer" }}
      />
    </div>
  );
}
// ─── PATTERN INSIGHT ────────────────────────────────────────────────────────
function PatternInsights({ jobs }: { jobs: Job[] }) {
  if (jobs.length < 3) return null;
  const byLabel: Record<string, Job[]> = { red: [], black: [], blue: [] };
  jobs.forEach(j => { if (byLabel[j.jwLabel]) byLabel[j.jwLabel].push(j); });
  const labelStats = Object.entries(byLabel).map(([lbl, jbs]) => {
    if (!jbs.length) return null;
    const calcs = jbs.map(calcBreakEven);
    const avgNP  = avg(calcs.map(c => c.npPct));
    const hitRate = calcs.filter(c => c.breakEvenMet).length / calcs.length * 100;
    const avgDNA  = avg(jbs.map(j => avg(DNA_DIMS.map(d => j.dna[d.key as keyof DNAScore]))));
    const worstDim = DNA_DIMS.map(d => ({ d, avgVal: avg(jbs.map(j => j.dna[d.key as keyof DNAScore])) })).sort((a,b) => a.avgVal - b.avgVal)[0];
    return { lbl, count: jbs.length, avgNP, hitRate, avgDNA, worstDim };
  }).filter(Boolean) as Array<{ lbl: string; count: number; avgNP: number; hitRate: number; avgDNA: number; worstDim: { d: typeof DNA_DIMS[0]; avgVal: number } }>;
  const hourBleeders = jobs.filter(j => j.actualHours && j.quotedHours && parseFloat(String(j.actualHours)) > j.quotedHours * 1.1);
  const suburbMap: Record<string, { jobs: number; totalNP: number }> = {};
  jobs.forEach(j => {
    const c = calcBreakEven(j);
    if (!suburbMap[j.suburb]) suburbMap[j.suburb] = { jobs: 0, totalNP: 0 };
    suburbMap[j.suburb].jobs++;
    suburbMap[j.suburb].totalNP += c.npDollars;
  });
  const bestSuburb = Object.entries(suburbMap).sort((a,b) => b[1].totalNP/b[1].jobs - a[1].totalNP/a[1].jobs)[0];
  const worstSuburb = Object.entries(suburbMap).filter(([,v])=>v.jobs>1).sort((a,b) => a[1].totalNP/a[1].jobs - b[1].totalNP/b[1].jobs)[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {(labelStats as Array<{ lbl: string; count: number; avgNP: number; hitRate: number; avgDNA: number; worstDim: { d: typeof DNA_DIMS[0]; avgVal: number } }>).map(s => {
        const jw = JW_LABELS[s.lbl];
        return (
          <div key={s.lbl} style={{ padding: "12px", background: jw.bg, border: `1px solid ${jw.color}22` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <div>
                <Mono style={{ fontSize: "10px", color: jw.color, textTransform: "uppercase", letterSpacing: "0.15em", display: "block" }}>{jw.label}</Mono>
                <Mono style={{ fontSize: "9px", color: TEXT_DIM }}>{s.count} job{s.count > 1 ? "s" : ""} · {jw.desc}</Mono>
              </div>
              <Mono style={{ fontSize: "18px", color: tl(s.avgNP, 20, 10) }}>{fmtPct(s.avgNP)}<span style={{ fontSize: "9px", color: TEXT_DIM }}> NP avg</span></Mono>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
              {[
                { l: "Hit rate",   v: fmtPct(s.hitRate), c: tl(s.hitRate, 85, 65) },
                { l: "DNA score",  v: s.avgDNA.toFixed(1) + "/10", c: tl(s.avgDNA, 7, 5) },
                { l: "Weak point", v: s.worstDim.d.label, c: AMBER },
              ].map(m => (
                <div key={m.l} style={{ background: SURFACE3, padding: "7px", textAlign: "center" }}>
                  <Mono style={{ fontSize: "8px", color: TEXT_DIM, display: "block", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>{m.l}</Mono>
                  <Mono style={{ fontSize: "11px", color: m.c }}>{m.v}</Mono>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {hourBleeders.length > 0 && (
        <div style={{ padding: "12px", background: "#180a0a", border: `1px solid ${RED}25` }}>
          <Mono style={{ fontSize: "9px", color: RED, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: "6px" }}>Hour Bleed — {hourBleeders.length} job{hourBleeders.length > 1 ? "s" : ""}</Mono>
          {hourBleeders.map(j => {
            const v = parseFloat(String(j.actualHours)) - j.quotedHours;
            return (
              <div key={j.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid ${BORDER}` }}>
                <Mono style={{ fontSize: "10px", color: TEXT_MID }}>{j.client} · {j.type}</Mono>
                <Mono style={{ fontSize: "10px", color: RED }}>+{v}h over</Mono>
              </div>
            );
          })}
        </div>
      )}
      {bestSuburb && (
        <div style={{ padding: "10px 12px", background: SURFACE2, border: `1px solid ${BORDER2}` }}>
          <Mono style={{ fontSize: "9px", color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>Suburb Pattern</Mono>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ flex: 1, padding: "7px", background: "#0e2218", border: `1px solid ${GREEN}22` }}>
              <Mono style={{ fontSize: "8px", color: GREEN, display: "block", marginBottom: "2px" }}>↑ Best</Mono>
              <Mono style={{ fontSize: "11px", color: TEXT }}>{bestSuburb[0]}</Mono>
              <Mono style={{ fontSize: "9px", color: GREEN, display: "block" }}>{fmt(bestSuburb[1].totalNP / bestSuburb[1].jobs)} NP avg</Mono>
            </div>
            {worstSuburb && (
              <div style={{ flex: 1, padding: "7px", background: "#180a0a", border: `1px solid ${RED}22` }}>
                <Mono style={{ fontSize: "8px", color: RED, display: "block", marginBottom: "2px" }}>↓ Watch</Mono>
                <Mono style={{ fontSize: "11px", color: TEXT }}>{worstSuburb[0]}</Mono>
                <Mono style={{ fontSize: "9px", color: RED, display: "block" }}>{fmt(worstSuburb[1].totalNP / worstSuburb[1].jobs)} NP avg</Mono>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
// ─── JARVIS BRIEF GENERATOR ──────────────────────────────────────────────────
function JarvisBrief(jobs: Job[]) {
  const calcs = jobs.map(j => ({ ...j, ...calcBreakEven(j) }));
  const hitCount = calcs.filter(c => c.breakEvenMet).length;
  const avgNP = avg(calcs.map(c => c.npPct));
  const avgDNA = avg(jobs.map(j => avg(DNA_DIMS.map(d => j.dna[d.key as keyof DNAScore]))));
  const worstJob = [...calcs].sort((a,b) => a.npPct - b.npPct)[0];
  const bestJob  = [...calcs].sort((a,b) => b.npPct - a.npPct)[0];
  const byType: Record<string, number[]> = {};
  calcs.forEach(c => {
    if (!byType[c.type]) byType[c.type] = [];
    byType[c.type].push(c.npPct);
  });
  const typeInsights = Object.entries(byType).map(([t, pcts]) => ({ type: t, avg: avg(pcts) })).sort((a,b) => b.avg - a.avg);
  const hourBleeders = jobs.filter(j => j.actualHours && parseFloat(String(j.actualHours)) > j.quotedHours * 1.1);
  return `Jarvis — Job Retrospective Brief
${jobs.length} jobs analysed · Break-even hit rate: ${hitCount}/${jobs.length}
FINANCIAL PATTERN
Avg NP: ${fmtPct(avgNP)} · Avg DNA: ${avgDNA.toFixed(1)}/10
Best job: ${bestJob.client} (${bestJob.type}) — ${fmtPct(bestJob.npPct)} NP, ${fmt(bestJob.npDollars)}
Worst job: ${worstJob.client} (${worstJob.type}) — ${fmtPct(worstJob.npPct)} NP, ${fmt(worstJob.npDollars)}
JOB TYPE RANKING (by avg NP%)
${typeInsights.map((t,i) => `${i+1}. ${t.type}: ${fmtPct(t.avg)}`).join("\n")}
HOUR BLEED
${hourBleeders.length > 0 ? hourBleeders.map(j => `${j.client} (${j.type}): +${parseFloat(String(j.actualHours))-j.quotedHours}h — ${j.notes}`).join("\n") : "None detected this period."}
WEAK DNA DIMENSIONS (across all jobs)
${DNA_DIMS.map(d => ({ d, avg: avg(jobs.map(j => j.dna[d.key as keyof DNAScore])) })).sort((a,b) => a.avg - b.avg).slice(0,2).map(x => `${x.d.label}: ${x.avg.toFixed(1)}/10`).join("\n")}
NOTES FROM JOBS
${jobs.map(j => `${j.client} (${j.suburb}): ${j.notes}`).join("\n")}
Analyse these patterns. What should I watch for next month? What job types should I prioritise or avoid? What's the one operational change that would move the needle most?`;
}
// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function JobDNA() {
  const [jobs, setJobs] = useState<Job[]>(SEED_JOBS);
  const [view, setView] = useState("library");

  // Load completed jobs with DNA scores from DB on mount
  useEffect(() => {
    fetch('/api/jobs?status=complete')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) return;
        const dbJobs: Job[] = data
          .filter(j => j.dna_reviewed_at !== null)
          .map(j => ({
            id:          j.id,
            date:        (j.completion_date || j.won_date || j.created_at || '').slice(0, 7),
            client:      j.client_name || '',
            suburb:      j.suburb || '',
            type:        j.install_type || 'New Deck',
            jwLabel:     j.jw_tier || 'red',
            quotedDays:  j.quoted_days || 0,
            quotedHours: (j.quoted_days || 0) * 8,
            quotedValue: j.gross_quote || j.quoted_total_value || 0,
            actualDays:  j.actual_days ?? null,
            actualHours: j.actual_labour_hours ?? null,
            notes:       '',
            crew:        ['baylee', 'marius'],
            dna: {
              margin:        j.dna_margin        ?? 5,
              efficiency:    j.dna_efficiency    ?? 5,
              complexity:    j.dna_complexity    ?? 5,
              repeatability: j.dna_repeatability ?? 5,
              client:        j.dna_client        ?? 5,
            },
            breakEvenMet: true,
          }));
        // DB jobs first, seed jobs appended for reference
        setJobs([...dbJobs, ...SEED_JOBS]);
      })
      .catch(() => {}); // Keep seed data on error
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formJob, setFormJob] = useState<Omit<Job,'id'>>(EMPTY_JOB);
  const [filterLabel, setFilterLabel] = useState("all");
  const [filterType,  setFilterType]  = useState("all");
  const [briefText,   setBriefText]   = useState("");
  const [copied,      setCopied]      = useState(false);
  const selectedJob = jobs.find(j => j.id === selectedId);
  const filtered = useMemo(() => {
    return jobs.filter(j => {
      if (filterLabel !== "all" && j.jwLabel !== filterLabel) return false;
      if (filterType  !== "all" && j.type  !== filterType)  return false;
      return true;
    });
  }, [jobs, filterLabel, filterType]);
  const jobTypes = [...new Set(jobs.map(j => j.type))];
  function saveJob() {
    if (!formJob.client) return;
    const saved: Job = {
      ...formJob,
      id: "r" + Date.now(),
      quotedDays:  parseFloat(String(formJob.quotedDays))  || 0,
      quotedHours: parseFloat(String(formJob.quotedHours)) || 0,
      quotedValue: parseFloat(String(formJob.quotedValue)) || 0,
      actualDays:  formJob.actualDays  !== "" ? parseFloat(String(formJob.actualDays))  : null,
      actualHours: formJob.actualHours !== "" ? parseFloat(String(formJob.actualHours)) : null,
    };
    setJobs(p => [...p, saved]);
    setView("library");
    setFormJob(EMPTY_JOB);
  }
  function generateBrief() {
    setBriefText(JarvisBrief(filtered.length > 0 ? filtered : jobs));
    setView("brief");
  }
  function copyBrief() {
    navigator.clipboard.writeText(briefText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  const inp: React.CSSProperties = { background: SURFACE2, border: `1px solid ${BORDER2}`, color: TEXT, padding: "7px 10px", fontFamily: "'DM Mono',monospace", fontSize: "13px", outline: "none", width: "100%" };
  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "'Georgia',serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number] { -moz-appearance: textfield; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
        input:focus, textarea:focus, select:focus { border-color: #b8935a !important; outline: none; }
        input[type=range] { height: 3px; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #222; }
        .jrow { cursor: pointer; transition: background 0.12s; }
        .jrow:hover { background: #111114 !important; }
        .btng { background: transparent; border: 1px solid #20202a; color: #4e4a45; cursor: pointer; font-family: 'DM Mono',monospace; font-size: 10px; letter-spacing: 0.1em; padding: 5px 12px; transition: all 0.15s; }
        .btng:hover { border-color: #b8935a; color: #b8935a; }
        .btngold { background: #b8935a; border: none; color: #000; cursor: pointer; font-family: 'DM Mono',monospace; font-size: 10px; letter-spacing: 0.12em; padding: 7px 16px; font-weight: 500; }
        .btngold:hover { opacity: 0.85; }
      `}</style>
      {/* HEADER */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "16px 26px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Mono style={{ fontSize: "10px", color: GOLD, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: "3px" }}>Endure Decking · CEO</Mono>
          <h1 style={{ fontSize: "20px", fontWeight: "400", letterSpacing: "-0.3px" }}>Job DNA</h1>
          <Mono style={{ fontSize: "10px", color: TEXT_DIM, display: "block", marginTop: "2px" }}>
            Break-even floor: {fmt(DAILY_FIXED_BURDEN)}/day fixed + crew · {fmt(BREAK_EVEN_DAY)}/day (Baylee+Marius)
          </Mono>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {[
            { id: "library",  label: "LIBRARY"  },
            { id: "patterns", label: "PATTERNS" },
          ].map(v => (
            <button key={v.id} className="btng" style={{ color: view === v.id ? GOLD : TEXT_DIM, borderColor: view === v.id ? GOLD : BORDER2 }} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
          <button className="btng" onClick={generateBrief}>JARVIS BRIEF ↗</button>
          <button className="btngold" onClick={() => { setFormJob(EMPTY_JOB); setView("add"); }}>+ LOG JOB</button>
        </div>
      </div>
      {/* ── BRIEF VIEW ── */}
      {view === "brief" && (
        <div style={{ padding: "24px 26px", maxWidth: "760px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <Mono style={{ fontSize: "10px", color: GOLD, textTransform: "uppercase", letterSpacing: "0.2em", display: "block", marginBottom: "3px" }}>Jarvis Brief</Mono>
              <div style={{ fontSize: "16px" }}>Copy this into Jarvis for your monthly retrospective</div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button className="btng" onClick={() => setView("library")}>← BACK</button>
              <button className="btngold" onClick={copyBrief}>{copied ? "✓ COPIED" : "COPY BRIEF"}</button>
            </div>
          </div>
          <textarea readOnly value={briefText}
            style={{ width: "100%", height: "460px", background: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT_MID, padding: "16px", fontFamily: "'DM Mono',monospace", fontSize: "11px", lineHeight: "1.8", outline: "none", resize: "none" }}
          />
          <div style={{ marginTop: "10px", padding: "10px 14px", background: `${GOLD}08`, border: `1px solid ${GOLD}25` }}>
            <Mono style={{ fontSize: "10px", color: GOLD, display: "block", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.1em" }}>How to use this</Mono>
            <Mono style={{ fontSize: "11px", color: TEXT_DIM, lineHeight: "1.7", display: "block" }}>
              Paste into Jarvis (via WhatsApp or the JMS chat). Ask: "Analyse these patterns. What should I watch for? What job types should I prioritise?" Jarvis will synthesise and give you one concrete decision to act on.
            </Mono>
          </div>
        </div>
      )}
      {/* ── ADD JOB VIEW ── */}
      {view === "add" && (
        <div style={{ padding: "24px 26px", maxWidth: "680px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <Mono style={{ fontSize: "10px", color: GOLD, textTransform: "uppercase", letterSpacing: "0.2em", display: "block", marginBottom: "3px" }}>Log Completed Job</Mono>
              <div style={{ fontSize: "16px" }}>Job Retrospective</div>
            </div>
            <button className="btng" onClick={() => setView("library")}>← CANCEL</button>
          </div>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER2}`, padding: "20px", marginBottom: "14px" }}>
            <SecTitle>Job Details</SecTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              {([
                { label: "Client",         key: "client",      type: "text"   },
                { label: "Suburb",         key: "suburb",      type: "text"   },
                { label: "Month (YYYY-MM)",key: "date",        type: "text"   },
                { label: "Quoted Value",   key: "quotedValue", type: "number" },
                { label: "Quoted Days",    key: "quotedDays",  type: "number" },
                { label: "Quoted Hours",   key: "quotedHours", type: "number" },
                { label: "Actual Days",    key: "actualDays",  type: "number" },
                { label: "Actual Hours",   key: "actualHours", type: "number" },
              ] as Array<{ label: string; key: keyof typeof formJob; type: string }>).map(f => (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  <input type={f.type} value={String(formJob[f.key] ?? "")} placeholder="—"
                    onChange={e => setFormJob(p => ({ ...p, [f.key]: e.target.value }))} style={inp} />
                </div>
              ))}
              <div>
                <Label>Job Type</Label>
                <select value={formJob.type} onChange={e => setFormJob(p => ({ ...p, type: e.target.value }))}
                  style={{ ...inp, background: SURFACE2 }}>
                  {["New Deck","Redeck","Pergola","Deck + Pergola","Other"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>JW Label</Label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {Object.entries(JW_LABELS).map(([k, v]) => (
                    <button key={k} onClick={() => setFormJob(p => ({ ...p, jwLabel: k }))}
                      style={{ flex: 1, padding: "7px", background: formJob.jwLabel === k ? v.bg : "transparent", border: `1px solid ${formJob.jwLabel === k ? v.color : BORDER2}`, color: formJob.jwLabel === k ? v.color : TEXT_DIM, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: "10px", letterSpacing: "0.1em" }}>
                      {v.short}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label>Notes — what happened on this job?</Label>
              <textarea value={formJob.notes} onChange={e => setFormJob(p => ({ ...p, notes: e.target.value }))}
                style={{ ...inp, height: "70px", resize: "vertical", fontFamily: "'Georgia',serif" } as React.CSSProperties} />
            </div>
          </div>
          {Number(formJob.quotedValue) > 0 && (
            <div style={{ background: SURFACE, border: `1px solid ${BORDER2}`, padding: "16px", marginBottom: "14px" }}>
              <SecTitle>Break-Even Check</SecTitle>
              <BreakEvenBar job={{ ...formJob, id: "preview", quotedDays: parseFloat(String(formJob.quotedDays))||1, quotedHours: parseFloat(String(formJob.quotedHours))||1, quotedValue: parseFloat(String(formJob.quotedValue))||0 }} />
            </div>
          )}
          <div style={{ background: SURFACE, border: `1px solid ${BORDER2}`, padding: "20px", marginBottom: "14px" }}>
            <SecTitle color={GOLD}>DNA Score — Rate This Job</SecTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: "20px", alignItems: "start" }}>
              <div>
                {DNA_DIMS.map(d => (
                  <DNASlider key={d.key} dim={d} value={formJob.dna[d.key as keyof DNAScore]}
                    onChange={v => setFormJob(p => ({ ...p, dna: { ...p.dna, [d.key]: v } }))} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Pentagon dna={formJob.dna} size={150} color={GOLD} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button className="btng" onClick={() => setView("library")}>CANCEL</button>
            <button className="btngold" onClick={saveJob}>SAVE TO DNA</button>
          </div>
        </div>
      )}
      {/* ── JOB DETAIL VIEW ── */}
      {view === "detail" && selectedJob && (() => {
        const calc = calcBreakEven(selectedJob);
        const jw = JW_LABELS[selectedJob.jwLabel];
        return (
          <div style={{ padding: "24px 26px", maxWidth: "700px" }}>
            <button className="btng" style={{ marginBottom: "16px" }} onClick={() => setView("library")}>← BACK</button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ padding: "2px 8px", background: jw.bg, border: `1px solid ${jw.color}44`, fontFamily: "'DM Mono',monospace", fontSize: "9px", color: jw.color, letterSpacing: "0.15em" }}>{jw.short}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: TEXT_DIM }}>{selectedJob.type}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: TEXT_DIM }}>{selectedJob.date}</span>
                </div>
                <h2 style={{ fontSize: "22px", fontWeight: "400" }}>{selectedJob.client}</h2>
                <div style={{ fontSize: "14px", color: TEXT_MID }}>{selectedJob.suburb}</div>
              </div>
              <Mono style={{ fontSize: "24px", color: tl(calc.npPct, 20, 10) }}>{fmt(selectedJob.quotedValue)}</Mono>
            </div>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER2}`, padding: "16px", marginBottom: "12px" }}>
              <SecTitle>Break-Even Analysis</SecTitle>
              <BreakEvenBar job={selectedJob} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: BORDER, marginTop: "14px" }}>
                {[
                  { l: "Quoted value", v: fmt(selectedJob.quotedValue) },
                  { l: "Labour cost",  v: fmt(calc.crewCost * calc.actualDays) },
                  { l: "Fixed alloc",  v: fmt(DAILY_FIXED_BURDEN * calc.actualDays) },
                  { l: "Net profit",   v: fmt(calc.npDollars), c: tl(calc.npPct, 20, 10) },
                ].map(m => (
                  <div key={m.l} style={{ background: SURFACE2, padding: "10px", textAlign: "center" }}>
                    <Mono style={{ fontSize: "8px", color: TEXT_DIM, display: "block", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.l}</Mono>
                    <Mono style={{ fontSize: "13px", color: (m as {c?: string}).c || TEXT }}>{m.v}</Mono>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER2}`, padding: "16px", marginBottom: "12px" }}>
              <SecTitle color={GOLD}>DNA Profile</SecTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "20px", alignItems: "center" }}>
                <div>
                  {DNA_DIMS.map(d => {
                    const v = selectedJob.dna[d.key as keyof DNAScore];
                    const c = v >= 7 ? GREEN : v >= 4 ? AMBER : RED;
                    return (
                      <div key={d.key} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <Mono style={{ fontSize: "10px", color: TEXT_MID, width: "80px" }}>{d.label}</Mono>
                        <div style={{ flex: 1, height: "3px", background: BORDER, borderRadius: "2px" }}>
                          <div style={{ height: "100%", width: (v / 10) * 100 + "%", background: c, borderRadius: "2px" }} />
                        </div>
                        <Mono style={{ fontSize: "12px", color: c, width: "20px", textAlign: "right" }}>{v}</Mono>
                      </div>
                    );
                  })}
                </div>
                <Pentagon dna={selectedJob.dna} size={150} color={GOLD} />
              </div>
            </div>
            {selectedJob.notes && (
              <div style={{ padding: "14px", background: SURFACE2, border: `1px solid ${BORDER}`, fontFamily: "'Georgia',serif", fontSize: "13px", color: TEXT_MID, lineHeight: "1.7" }}>
                {selectedJob.notes}
              </div>
            )}
          </div>
        );
      })()}
      {/* ── PATTERNS VIEW ── */}
      {view === "patterns" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", minHeight: "calc(100vh - 65px)" }}>
          <div style={{ borderRight: `1px solid ${BORDER}`, padding: "20px 24px", overflowY: "auto" }}>
            <SecTitle>Pattern Analysis — {jobs.length} Jobs</SecTitle>
            <PatternInsights jobs={jobs} />
          </div>
          <div style={{ padding: "20px 24px", overflowY: "auto" }}>
            <SecTitle>DNA Composite — All Jobs</SecTitle>
            {(() => {
              const avgDNA = {} as DNAScore;
              DNA_DIMS.forEach(d => { avgDNA[d.key as keyof DNAScore] = avg(jobs.map(j => j.dna[d.key as keyof DNAScore])); });
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                  <Pentagon dna={avgDNA} size={200} color={GOLD} />
                  <div style={{ width: "100%" }}>
                    {DNA_DIMS.map(d => {
                      const v = avgDNA[d.key as keyof DNAScore];
                      const c = v >= 7 ? GREEN : v >= 4 ? AMBER : RED;
                      return (
                        <div key={d.key} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                          <Mono style={{ fontSize: "10px", color: TEXT_MID, width: "90px" }}>{d.label}</Mono>
                          <div style={{ flex: 1, height: "3px", background: BORDER, borderRadius: "2px" }}>
                            <div style={{ height: "100%", width: (v / 10) * 100 + "%", background: c, borderRadius: "2px" }} />
                          </div>
                          <Mono style={{ fontSize: "12px", color: c, width: "30px", textAlign: "right" }}>{v.toFixed(1)}</Mono>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <div style={{ marginTop: "20px" }}>
              <SecTitle>By JW Label</SecTitle>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                {Object.entries(JW_LABELS).map(([lbl, jw]) => {
                  const lJobs = jobs.filter(j => j.jwLabel === lbl);
                  if (!lJobs.length) return null;
                  const avgD = {} as DNAScore;
                  DNA_DIMS.forEach(d => { avgD[d.key as keyof DNAScore] = avg(lJobs.map(j => j.dna[d.key as keyof DNAScore])); });
                  return (
                    <div key={lbl} style={{ textAlign: "center" }}>
                      <Mono style={{ fontSize: "9px", color: jw.color, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: "6px" }}>{jw.label} ({lJobs.length})</Mono>
                      <Pentagon dna={avgD} size={120} color={jw.color} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── LIBRARY VIEW ── */}
      {view === "library" && (
        <div style={{ padding: "16px 26px" }}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px", alignItems: "center" }}>
            <Mono style={{ fontSize: "9px", color: TEXT_DIM, marginRight: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Filter:</Mono>
            {["all", "red", "black", "blue"].map(f => (
              <button key={f} className="btng" style={{ color: filterLabel === f ? GOLD : TEXT_DIM, borderColor: filterLabel === f ? GOLD : BORDER2 }} onClick={() => setFilterLabel(f)}>
                {f === "all" ? "ALL LABELS" : JW_LABELS[f]?.short}
              </button>
            ))}
            <div style={{ width: "1px", height: "18px", background: BORDER }} />
            <button className="btng" style={{ color: filterType === "all" ? GOLD : TEXT_DIM, borderColor: filterType === "all" ? GOLD : BORDER2 }} onClick={() => setFilterType("all")}>
              ALL TYPES
            </button>
            {jobTypes.map(t => (
              <button key={t} className="btng" style={{ color: filterType === t ? GOLD : TEXT_DIM, borderColor: filterType === t ? GOLD : BORDER2, fontSize: "9px" }} onClick={() => setFilterType(t)}>
                {t.toUpperCase()}
              </button>
            ))}
            <Mono style={{ marginLeft: "auto", fontSize: "10px", color: TEXT_DIM }}>{filtered.length} job{filtered.length !== 1 ? "s" : ""}</Mono>
          </div>
          {filtered.length > 0 && (() => {
            const calcs = filtered.map(calcBreakEven);
            const avgNP  = avg(calcs.map(c => c.npPct));
            const hitRate = calcs.filter(c => c.breakEvenMet).length / calcs.length * 100;
            const avgDNA  = avg(filtered.map(j => avg(DNA_DIMS.map(d => j.dna[d.key as keyof DNAScore]))));
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: BORDER, marginBottom: "16px" }}>
                {[
                  { l: "Jobs",           v: filtered.length.toString(), c: TEXT  },
                  { l: "Avg NP%",        v: fmtPct(avgNP),              c: tl(avgNP, 20, 10) },
                  { l: "Break-even hit", v: fmtPct(hitRate),            c: tl(hitRate, 85, 65) },
                  { l: "Avg DNA",        v: avgDNA.toFixed(1) + "/10",  c: tl(avgDNA, 7, 5) },
                ].map(m => (
                  <div key={m.l} style={{ background: SURFACE2, padding: "12px 16px" }}>
                    <Mono style={{ fontSize: "9px", color: TEXT_DIM, display: "block", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>{m.l}</Mono>
                    <Mono style={{ fontSize: "18px", color: m.c }}>{m.v}</Mono>
                  </div>
                ))}
              </div>
            );
          })()}
          <div style={{ border: `1px solid ${BORDER2}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 70px 70px 140px 120px", background: SURFACE2, padding: "8px 14px", gap: "8px" }}>
              {["Label", "Client / Type", "Value", "NP%", "Days", "Hours", "Break-Even", "DNA"].map(h => (
                <Mono key={h} style={{ fontSize: "9px", color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</Mono>
              ))}
            </div>
            {filtered.map(j => {
              const jw = JW_LABELS[j.jwLabel];
              const calc = calcBreakEven(j);
              const avgDNA = avg(DNA_DIMS.map(d => j.dna[d.key as keyof DNAScore]));
              const hoursVar = j.actualHours != null ? parseFloat(String(j.actualHours)) - j.quotedHours : null;
              return (
                <div key={j.id} className="jrow" onClick={() => { setSelectedId(j.id); setView("detail"); }}
                  style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 70px 70px 140px 120px", padding: "11px 14px", alignItems: "center", borderTop: `1px solid ${BORDER}`, background: SURFACE, gap: "8px" }}>
                  <span style={{ padding: "2px 6px", background: jw.bg, border: `1px solid ${jw.color}44`, fontFamily: "'DM Mono',monospace", fontSize: "9px", color: jw.color, letterSpacing: "0.12em", display: "inline-block" }}>{jw.short}</span>
                  <div>
                    <div style={{ fontSize: "13px", color: TEXT }}>{j.client} <span style={{ color: TEXT_DIM, fontSize: "11px" }}>· {j.suburb}</span></div>
                    <Mono style={{ fontSize: "9px", color: TEXT_DIM }}>{j.type} · {j.date}</Mono>
                  </div>
                  <Mono style={{ fontSize: "12px", color: TEXT }}>{fmt(j.quotedValue)}</Mono>
                  <Mono style={{ fontSize: "13px", color: tl(calc.npPct, 20, 10) }}>{fmtPct(calc.npPct)}</Mono>
                  <div>
                    <Mono style={{ fontSize: "12px", color: TEXT_MID }}>{j.quotedDays}d</Mono>
                    {j.actualDays != null && <Mono style={{ fontSize: "9px", color: parseFloat(String(j.actualDays)) > j.quotedDays ? RED : GREEN, display: "block" }}>act: {j.actualDays}d</Mono>}
                  </div>
                  <div>
                    <Mono style={{ fontSize: "12px", color: TEXT_MID }}>{j.quotedHours}h</Mono>
                    {hoursVar !== null && <Mono style={{ fontSize: "9px", color: hoursVar > 0 ? RED : GREEN, display: "block" }}>{hoursVar > 0 ? "+" : ""}{hoursVar}h</Mono>}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ flex: 1, height: "3px", background: BORDER, borderRadius: "2px", position: "relative" }}>
                        <div style={{ height: "100%", width: Math.min(100, (calc.dailyRate / (BREAK_EVEN_DAY * 1.5)) * 100) + "%", background: calc.breakEvenMet ? GREEN + "80" : RED + "80", borderRadius: "2px" }} />
                        <div style={{ position: "absolute", top: "-2px", bottom: "-2px", left: (BREAK_EVEN_DAY / (BREAK_EVEN_DAY * 1.5)) * 100 + "%", width: "1.5px", background: AMBER }} />
                      </div>
                    </div>
                    <Mono style={{ fontSize: "9px", color: calc.breakEvenMet ? GREEN : RED, display: "block", marginTop: "2px" }}>
                      {calc.breakEvenMet ? "✓ above" : "✗ below"} floor
                    </Mono>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ flex: 1, height: "3px", background: BORDER, borderRadius: "2px" }}>
                      <div style={{ height: "100%", width: (avgDNA / 10) * 100 + "%", background: tl(avgDNA, 7, 5), borderRadius: "2px" }} />
                    </div>
                    <Mono style={{ fontSize: "11px", color: tl(avgDNA, 7, 5), minWidth: "28px" }}>{avgDNA.toFixed(1)}</Mono>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
