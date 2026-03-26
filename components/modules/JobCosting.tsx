// @ts-nocheck
'use client'

import { useState, useCallback, useEffect } from "react";
// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  bg:      "#13131a", surface: "#1c1c26", surface2: "#22222e",
  border:  "#2a2a38", border2: "#333344",
  gold:    "#c9a06a", goldDim: "#c9a06a33",
  text:    "#f0ebe3", textMid: "#a09890", textDim:  "#6a6460",
  green:   "#34d399", amber:   "#fbbf24", red:      "#f87171", blue: "#60a5fa",
};
// ─── CREW CONSTANTS ──────────────────────────────────────────────────────────
const CREW_ROSTER = [
  { name: "Baylee", type: "Full Time",  base: 45, loaded: 57.60 },
  { name: "Marius", type: "Full Time",  base: 38, loaded: 48.64 },
  { name: "Ash",    type: "Casual",     base: 38, loaded: 45.60 },
  { name: "Lachy",  type: "Casual",     base: 60, loaded: 72.00 },
  { name: "Petr",   type: "ABN",        base: 70, loaded: 70.00 },
];
// ─── COST MODEL ──────────────────────────────────────────────────────────────
const OWNER_MONTHLY   = 8167;
const OPEX_MONTHLY    = 8714.93;
const MONTHLY_FIXED   = OWNER_MONTHLY + OPEX_MONTHLY;
const WORKABLE_DAYS   = 17.2;
const HRS_PER_DAY     = 8;
const BILLABLE_HRS    = WORKABLE_DAYS * HRS_PER_DAY;
const DAILY_FIXED     = Math.round(MONTHLY_FIXED / WORKABLE_DAYS);
const BAYLEE_MONTHLY  = 57.60 * 8 * WORKABLE_DAYS;
const MARIUS_MONTHLY  = 48.64 * 8 * WORKABLE_DAYS;
const FULL_POOL       = BAYLEE_MONTHLY + MARIUS_MONTHLY + MONTHLY_FIXED;
const BENCHMARK_HOURLY = 100;
const LABOUR_CHARGEOUT = 2400;
const GP_TARGET = 45;
const GP_WARN   = 36;
const NP_TARGET = 20;
// ─── SEED JOB ────────────────────────────────────────────────────────────────
const SEED_JOB = {
  id: 1,
  name: "Michelle",
  suburb: "Wellard",
  type: "Decking",
  client: "Private / Lead",
  dateStarted: "2026-02-10",
  dateCompleted: "",
  daysOnJob: 5,
  totalM2: 30,
  quotedAmount: 20467,
  materials: [
    { id: 1, supplier: "DP",         forecasted: 8500, actual: 8330  },
    { id: 2, supplier: "Conc Taxi",  forecasted: 600,  actual: 560   },
    { id: 3, supplier: "Bunnings",   forecasted: 400,  actual: 0     },
    { id: 4, supplier: "Misc",       forecasted: 350,  actual: 300   },
    { id: 5, supplier: "112 Posts",  forecasted: 200,  actual: 0     },
  ],
  labour: [
    { id: 1, name: "Baylee", type: "Full Time", loaded: 57.60, forecastedHrs: 40, actualHrs: 40 },
    { id: 2, name: "Marius", type: "Full Time", loaded: 48.64, forecastedHrs: 40, actualHrs: 40 },
    { id: 3, name: "Ash",    type: "Casual",    loaded: 45.60, forecastedHrs: 0,  actualHrs: 0  },
    { id: 4, name: "Lachy",  type: "Casual",    loaded: 72.00, forecastedHrs: 0,  actualHrs: 0  },
    { id: 5, name: "Petr",   type: "ABN",       loaded: 70.00, forecastedHrs: 0,  actualHrs: 0  },
  ],
  hire: 0,
  fees: 0,
  daysToComplete: 5,
  billableResources: 2,
  notes: "Material tracking active. On track.",
};
// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(n)    { return "$" + Math.round(n || 0).toLocaleString(); }
function pct(n)    { return (n || 0).toFixed(1) + "%"; }
function tl(v, g, w) { return v >= g ? C.green : v >= w ? C.amber : C.red; }
function calcJob(job, mode = "actual") {
  const matTotal  = job.materials.reduce((s, m) => s + (mode === "actual" ? (m.actual || 0) : m.forecasted), 0);
  const labTotal  = job.labour.reduce((s, l)   => s + (mode === "actual" ? (l.actualHrs || 0) : l.forecastedHrs) * l.loaded, 0);
  const totalHrs  = job.labour.reduce((s, l)   => s + (mode === "actual" ? (l.actualHrs || 0) : l.forecastedHrs), 0);
  const cogs      = matTotal + labTotal + (job.hire || 0) + (job.fees || 0);
  const gp        = job.quotedAmount - cogs;
  const gpPct     = job.quotedAmount > 0 ? (gp / job.quotedAmount) * 100 : 0;
  const labValue  = job.quotedAmount - matTotal;
  const gpLabour  = labValue > 0 ? (gp / labValue) * 100 : 0;
  const hrlyRate  = totalHrs > 0 ? labValue / totalHrs : 0;
  const prodM2    = totalHrs > 0 && job.totalM2 > 0 ? job.totalM2 / (totalHrs / 8) : 0;
  const fixedAlloc   = DAILY_FIXED * job.daysOnJob;
  const np           = gp - fixedAlloc;
  const npPct        = job.quotedAmount > 0 ? (np / job.quotedAmount) * 100 : 0;
  const resources    = job.billableResources || 2;
  const breakEvenHr  = Math.round(FULL_POOL / BILLABLE_HRS / resources);
  const revenuePerHrPerRes = totalHrs > 0 ? (labValue / totalHrs) : 0;
  const profitPerHr  = revenuePerHrPerRes - BENCHMARK_HOURLY;
  const forecastNP   = profitPerHr * totalHrs;
  return { matTotal, labTotal, totalHrs, cogs, gp, gpPct, gpLabour, labValue, hrlyRate: revenuePerHrPerRes, prodM2, fixedAlloc, np, npPct, profitPerHr, forecastNP, breakEvenHr, resources };
}
// ─── COMPONENTS ──────────────────────────────────────────────────────────────
function Label({ children, color = C.textDim }) {
  return (
    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "4px" }}>
      {children}
    </div>
  );
}
function Metric({ label, value, color, sub, large }) {
  return (
    <div style={{ padding: "12px 14px", background: C.surface, border: `1px solid ${C.border}`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: color, opacity: 0.7 }} />
      <Label>{label}</Label>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: large ? "22px" : "18px", color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, marginTop: "3px" }}>{sub}</div>}
    </div>
  );
}
function VarianceBar({ label, forecasted, actual, isMoney }) {
  const max = Math.max(forecasted, actual, 1);
  const fPct = (forecasted / max) * 100;
  const aPct = (actual / max) * 100;
  const over = actual > forecasted;
  const diff = actual - forecasted;
  const diffColor = over ? C.red : C.green;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.text }}>{label}</div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>F: {isMoney ? fmt(forecasted) : forecasted + "h"}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.text }}>A: {isMoney ? fmt(actual) : actual + "h"}</div>
          {actual > 0 && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: diffColor }}>{over ? "+" : ""}{isMoney ? fmt(diff) : diff + "h"}</div>}
        </div>
      </div>
      <div style={{ position: "relative", height: "6px", background: C.border, borderRadius: "2px" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: fPct + "%", background: C.textDim, borderRadius: "2px", opacity: 0.4 }} />
        {actual > 0 && <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: aPct + "%", background: over ? C.red : C.green, borderRadius: "2px", opacity: 0.8 }} />}
      </div>
    </div>
  );
}
function NumInput({ value, onChange, prefix, small }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      {prefix && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textDim }}>{prefix}</span>}
      <input
        type="number"
        value={value || ""}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{
          background: C.surface2, border: `1px solid ${C.border2}`, color: C.text,
          fontFamily: "'DM Mono',monospace", fontSize: small ? "10px" : "12px",
          padding: "4px 6px", width: small ? "70px" : "90px", outline: "none",
          borderRadius: "0",
        }}
      />
    </div>
  );
}
// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function JobCosting() {
  const [jobs,    setJobs]    = useState([SEED_JOB]);
  const [active,  setActive]  = useState(SEED_JOB.id);
  const [view,    setView]    = useState("overview");
  const [showNew,    setShowNew]    = useState(false);
  const [showClose,  setShowClose]  = useState(false);
  const [closeScores, setCloseScores] = useState({ complexity: 7, repeatability: 7, client: 7 });
  const [newJob,  setNewJob]  = useState({ name: "", suburb: "", type: "Decking", quotedAmount: "", daysOnJob: "", totalM2: "" });
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Load active jobs from DB on mount
  useEffect(() => {
    fetch('/api/jobs')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        const active = data.filter(j => ['in_progress', 'won'].includes(j.status));
        if (active.length === 0) return;
        const mapped = active.map(j => ({
          id:        j.id,
          dbId:      j.id,
          name:      j.client_name || 'Unknown',
          suburb:    j.suburb || '',
          type:      j.install_type || 'Decking',
          client:    j.client_name || '',
          status:    j.status,
          dateStarted:   j.won_date || j.created_at?.split('T')[0] || '',
          dateCompleted: j.completion_date || '',
          daysOnJob:   j.quoted_days || 5,
          daysToComplete: j.quoted_days || 5,
          billableResources: 2,
          totalM2:     j.sqm || 0,
          quotedAmount: j.gross_quote || j.quoted_total_value || 0,
          materials: [{ id: 1, supplier: "Materials", forecasted: 0, actual: 0 }],
          labour: CREW_ROSTER.map((c, i) => ({ id: i + 1, ...c, forecastedHrs: 0, actualHrs: 0 })),
          hire: 0, fees: 0, notes: j.notes || '',
        }));
        setJobs(mapped);
        setActive(mapped[0].id);
      })
      .catch(() => {}); // Fall back to seed data on error
  }, []);
  const job = jobs.find(j => j.id === active);
  const forecast = job ? calcJob(job, "forecast") : null;
  const actual   = job ? calcJob(job, "actual")   : null;
  const urgency = actual && actual.gpPct < GP_WARN ? "URGENT" : actual && actual.gpPct < GP_TARGET ? "WATCH" : "ON TRACK";
  const urgencyColor = { URGENT: C.red, WATCH: C.amber, "ON TRACK": C.green }[urgency];
  const updateMaterial = useCallback((jobId, matId, field, val) => {
    setJobs(js => js.map(j => j.id !== jobId ? j : {
      ...j, materials: j.materials.map(m => m.id !== matId ? m : { ...m, [field]: val })
    }));
  }, []);
  const updateLabour = useCallback((jobId, labId, field, val) => {
    setJobs(js => js.map(j => j.id !== jobId ? j : {
      ...j, labour: j.labour.map(l => l.id !== labId ? l : { ...l, [field]: val })
    }));
  }, []);
  const addMaterial = useCallback((jobId) => {
    setJobs(js => js.map(j => j.id !== jobId ? j : {
      ...j, materials: [...j.materials, { id: Date.now(), supplier: "New supplier", forecasted: 0, actual: 0 }]
    }));
  }, []);
  const addLabour = useCallback((jobId) => {
    setJobs(js => js.map(j => j.id !== jobId ? j : {
      ...j, labour: [...j.labour, { id: Date.now(), name: "Subcontractor", type: "ABN", loaded: 0, forecastedHrs: 0, actualHrs: 0, isCustom: true }]
    }));
  }, []);
  const removeLabour = useCallback((jobId, labId) => {
    setJobs(js => js.map(j => j.id !== jobId ? j : {
      ...j, labour: j.labour.filter(l => l.id !== labId)
    }));
  }, []);
  const createJob = useCallback(async () => {
    if (!newJob.name) return;

    // Create in DB and get the UUID back
    let dbId = null;
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: newJob.name,
          suburb:      newJob.suburb,
          status:      'in_progress',
          gross_quote: parseFloat(newJob.quotedAmount) || 0,
          sqm:         parseFloat(newJob.totalM2) || 0,
          quoted_days: parseFloat(newJob.daysOnJob) || 5,
        }),
      });
      const data = await res.json();
      dbId = data.id ?? null;
    } catch { /* fall back to local-only */ }

    const id = dbId ?? Date.now();
    setJobs(js => [...js, {
      id, dbId, name: newJob.name, suburb: newJob.suburb, type: newJob.type,
      client: "", status: "in_progress",
      dateStarted: new Date().toISOString().slice(0, 10), dateCompleted: "",
      daysOnJob: parseFloat(newJob.daysOnJob) || 5,
      daysToComplete: parseFloat(newJob.daysOnJob) || 5,
      billableResources: 2,
      totalM2: parseFloat(newJob.totalM2) || 0,
      quotedAmount: parseFloat(newJob.quotedAmount) || 0,
      materials: [{ id: 1, supplier: "Materials", forecasted: 0, actual: 0 }],
      labour: CREW_ROSTER.map((c, i) => ({ id: i + 1, ...c, forecastedHrs: 0, actualHrs: 0 })),
      hire: 0, fees: 0, notes: "",
    }]);
    setActive(id);
    setShowNew(false);
    setNewJob({ name: "", suburb: "", type: "Decking", quotedAmount: "", daysOnJob: "", totalM2: "" });
  }, [newJob]);
  const closeJob = useCallback(async () => {
    if (!job) return;
    setSaving(true);
    setSaveMsg("");

    // Persist to DB if this job is linked to a real DB record
    const dbId = job.dbId;
    if (dbId) {
      try {
        // Mark job complete (triggers complete_job_snapshot RPC)
        await fetch(`/api/jobs/${dbId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'complete', _oldStatus: job.status || 'in_progress' }),
        });

        // Save actuals so recalcJobDNA has real data for margin + efficiency scoring
        const totalActualHrs = job.labour.reduce((s, l) => s + (l.actualHrs || 0), 0);
        const totalActualLabour = job.labour.reduce((s, l) => s + (l.actualHrs || 0) * (l.loaded || 0), 0);
        const totalActualMaterials = job.materials.reduce((s, m) => s + (m.actual || 0), 0);
        const actualGP = job.quotedAmount - totalActualMaterials - totalActualLabour;
        const actualGPPct = job.quotedAmount > 0 ? actualGP / job.quotedAmount : 0;

        await fetch(`/api/jobs/${dbId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actual_labour_hours: totalActualHrs,
            actual_labour_value: Math.round(totalActualLabour),
            actual_gp_amount: Math.round(actualGP),
            actual_gp_pct: Math.round(actualGPPct * 10000) / 10000,
            actual_days: job.daysOnJob || null,
          }),
        });

        // Save subjective DNA scores
        const dnaRes = await fetch(`/api/jobs/${dbId}/dna`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            complexity:    closeScores.complexity,
            repeatability: closeScores.repeatability,
            client:        closeScores.client,
          }),
        });

        if (dnaRes.ok) {
          setSaveMsg("✓ Saved to DNA");
        } else {
          setSaveMsg("Job closed — DNA save failed, retry in Job DNA");
        }
      } catch {
        setSaveMsg("DB unavailable — scores saved locally only");
      }
    }

    // Update local state regardless
    setJobs(js => js.map(j => j.id !== active ? j : {
      ...j,
      status: "complete",
      dateCompleted: new Date().toISOString().slice(0, 10),
      dnaScores: {
        complexity:    closeScores.complexity,
        repeatability: closeScores.repeatability,
        client:        closeScores.client,
      },
      crewScores: j.labour
        .filter(l => (l.forecastedHrs > 0 || l.actualHrs > 0) && l.type !== "ABN")
        .map(l => ({
          name:      l.name,
          effort:    closeScores[l.name + "_effort"]    || 7,
          attitude:  closeScores[l.name + "_attitude"]  || 7,
          highlight: closeScores[l.name + "_highlight"] || "",
          lowlight:  closeScores[l.name + "_lowlight"]  || "",
          hours:     l.actualHrs,
          jobName:   j.name,
          jobSuburb: j.suburb,
          date:      new Date().toISOString().slice(0, 10),
        }))
    }));

    setSaving(false);
    setTimeout(() => setShowClose(false), 800);
  }, [active, closeScores, job]);
  const tabs = ["overview", "materials", "labour", "report"];
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input:focus { border-color: ${C.gold} !important; outline: none; }
        textarea:focus { border-color: ${C.gold} !important; outline: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .jc-fade { animation: fadeIn 0.3s ease forwards; }
        @keyframes urgentPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .jc-urgent { animation: urgentPulse 1.5s ease-in-out infinite; }
      `}</style>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface }}>
        <div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.gold, letterSpacing: "0.3em", marginBottom: "2px" }}>ENDURE OS · OPS</div>
          <div style={{ fontSize: "18px", letterSpacing: "-0.3px" }}>Job Costing Tracker</div>
        </div>
        <button onClick={() => setShowNew(true)}
          style={{ background: C.gold, color: C.bg, border: "none", fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "8px 16px", cursor: "pointer", letterSpacing: "0.1em" }}>
          + NEW JOB
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", minHeight: "calc(100vh - 57px)" }}>
        {/* ── JOB SIDEBAR ── */}
        <div style={{ borderRight: `1px solid ${C.border}`, padding: "12px 0", background: C.surface }}>
          <div style={{ padding: "0 14px 10px", fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, letterSpacing: "0.15em", textTransform: "uppercase" }}>Jobs</div>
          {jobs.map(j => {
            const c = calcJob(j, "actual");
            const isActive = j.id === active;
            const urg = c.gpLabour < GP_WARN ? C.red : c.gpLabour < GP_TARGET ? C.amber : C.green;
            return (
              <div key={j.id} onClick={() => setActive(j.id)}
                style={{ padding: "10px 14px", cursor: "pointer", background: isActive ? C.surface2 : "transparent", borderLeft: isActive ? `2px solid ${C.gold}` : "2px solid transparent", transition: "all 0.15s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "13px", color: isActive ? C.text : C.textMid, marginBottom: "2px" }}>{j.name}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>{j.suburb}</div>
                  </div>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: urg, marginTop: "4px", flexShrink: 0 }} />
                </div>
                {isActive && (
                  <div style={{ marginTop: "6px", fontFamily: "'DM Mono',monospace", fontSize: "9px", color: urg }}>
                    LV GP {pct(c.gpLabour)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* ── MAIN CONTENT ── */}
        {job && actual && forecast ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Job header */}
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                  <div style={{ fontSize: "20px" }}>{job.name} <span style={{ color: C.textMid, fontSize: "16px" }}>/ {job.suburb}</span></div>
                  <div className={urgency === "URGENT" ? "jc-urgent" : ""} style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", padding: "3px 8px", background: urgencyColor + "22", color: urgencyColor, letterSpacing: "0.15em" }}>
                    {urgency}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>{job.type} · {job.daysOnJob} days · {job.totalM2}m²</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>{job.dateStarted}</div>
                </div>
              </div>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                <div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, marginBottom: "2px" }}>Quoted</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "20px", color: C.gold }}>{fmt(job.quotedAmount)}</div>
                </div>
                {job.status === "complete" ? (
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "4px 10px", background: C.green + "22", color: C.green, letterSpacing: "0.15em" }}>
                    ✓ CLOSED · DNA SENT
                  </div>
                ) : actual && actual.totalHrs > 0 ? (
                  <button onClick={() => setShowClose(true)}
                    style={{ background: C.gold, color: C.bg, border: "none", fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "6px 14px", cursor: "pointer", letterSpacing: "0.1em" }}>
                    CLOSE JOB →
                  </button>
                ) : null}
              </div>
            </div>
            {/* KPI strip */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1px 1fr 1fr", gap: "0", background: C.border, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ padding: "14px 16px", background: C.surface, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: tl(actual.gpLabour, GP_TARGET, GP_WARN) }} />
                <Label>Labour Value</Label>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "26px", color: tl(actual.gpLabour, GP_TARGET, GP_WARN), lineHeight: 1 }}>{fmt(actual.labValue)}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, marginTop: "3px" }}>GP {pct(actual.gpLabour)} · F: {fmt(forecast.labValue)}</div>
              </div>
              <div style={{ padding: "14px 16px", background: C.surface, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: tl(actual.hrlyRate, actual.breakEvenHr, BENCHMARK_HOURLY) }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Label>Labour Rev / Hour</Label>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim }}>RESOURCES</div>
                    <input type="number" min="1" max="5"
                      value={job.billableResources || 2}
                      onChange={e => setJobs(js => js.map(j => j.id !== job.id ? j : { ...j, billableResources: parseInt(e.target.value) || 1 }))}
                      style={{ background: C.border, border: `1px solid ${C.border2}`, color: C.text, fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "2px 5px", width: "38px", outline: "none", textAlign: "center" }}
                    />
                  </div>
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "26px", color: tl(actual.hrlyRate, actual.breakEvenHr, BENCHMARK_HOURLY), lineHeight: 1 }}>{fmt(actual.hrlyRate)}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, marginTop: "3px" }}>
                  break-even {fmt(actual.breakEvenHr)}/hr at {actual.resources} resources · {actual.totalHrs}h worked
                </div>
              </div>
              <div style={{ padding: "14px 16px", background: C.surface, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: tl(actual.profitPerHr, 30, 0) }} />
                <Label>GP / Hour</Label>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "26px", color: tl(actual.profitPerHr, 30, 0), lineHeight: 1 }}>
                  {actual.profitPerHr >= 0 ? "+" : ""}{fmt(actual.profitPerHr)}
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, marginTop: "3px" }}>
                  {fmt(actual.hrlyRate)} rev/hr − ${BENCHMARK_HOURLY} floor = {actual.profitPerHr >= 0 ? "+" : ""}{fmt(actual.profitPerHr)}/hr
                </div>
              </div>
              <div style={{ background: C.border }} />
              <div style={{ padding: "14px 16px", background: C.surface2, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: tl(actual.npPct, NP_TARGET, 10), opacity: 0.5 }} />
                <Label>Forecast NP</Label>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "20px", color: tl(actual.npPct, NP_TARGET, 10), lineHeight: 1 }}>{fmt(actual.np)}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, marginTop: "3px" }}>{pct(actual.npPct)} · after ${DAILY_FIXED}/day fixed</div>
              </div>
              <div style={{ padding: "14px 16px", background: C.surface2, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: tl((actual.labValue / (job.daysToComplete||1)), LABOUR_CHARGEOUT * 0.9, LABOUR_CHARGEOUT * 0.7), opacity: 0.5 }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Label>Billable Day Rate</Label>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim }}>DAYS</div>
                    <input
                      type="number"
                      value={job.daysToComplete || ""}
                      onChange={e => setJobs(js => js.map(j => j.id !== job.id ? j : { ...j, daysToComplete: parseFloat(e.target.value) || 1 }))}
                      style={{ background: C.border, border: `1px solid ${C.border2}`, color: C.text, fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "2px 5px", width: "38px", outline: "none", textAlign: "center" }}
                    />
                  </div>
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "20px", color: tl((actual.labValue / (job.daysToComplete||1)), LABOUR_CHARGEOUT * 0.9, LABOUR_CHARGEOUT * 0.7), lineHeight: 1 }}>
                  {fmt(actual.labValue / (job.daysToComplete || 1))}<span style={{ fontSize: "11px", color: C.textDim }}>/day</span>
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, marginTop: "3px" }}>
                  {fmt(actual.labValue)} ÷ {job.daysToComplete || 1} days · target {fmt(LABOUR_CHARGEOUT)}
                </div>
              </div>
            </div>
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
              {tabs.map(t => (
                <button key={t} onClick={() => setView(t)}
                  style={{ background: "transparent", border: "none", borderBottom: view === t ? `2px solid ${C.gold}` : "2px solid transparent", color: view === t ? C.gold : C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "10px 20px", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em", transition: "color 0.15s" }}>
                  {t}
                </button>
              ))}
            </div>
            {/* Tab content */}
            <div className="jc-fade" key={view} style={{ padding: "20px 24px", flex: 1, overflowY: "auto" }}>
              {view === "overview" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <Label color={C.textMid}>Materials Variance</Label>
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "14px", marginBottom: "12px" }}>
                      {job.materials.map(m => (
                        <VarianceBar key={m.id} label={m.supplier} forecasted={m.forecasted} actual={m.actual} isMoney />
                      ))}
                      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: "8px", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textMid }}>Total Materials</div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: tl(forecast.matTotal - actual.matTotal, 0, -500) }}>{fmt(actual.matTotal)}</div>
                      </div>
                    </div>
                    <Label color={C.textMid}>Labour Variance</Label>
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "14px" }}>
                      {job.labour.filter(l => l.forecastedHrs > 0 || l.actualHrs > 0).map(l => (
                        <VarianceBar key={l.id} label={l.name} forecasted={l.forecastedHrs} actual={l.actualHrs} isMoney={false} />
                      ))}
                      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: "8px", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textMid }}>Total Hours</div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.text }}>{actual.totalHrs}h actual / {forecast.totalHrs}h forecast</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label color={C.textMid}>Cost Breakdown</Label>
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "14px", marginBottom: "12px" }}>
                      {[
                        { l: "Quoted Amount",  v: fmt(job.quotedAmount),     c: C.gold  },
                        { l: "Materials",      v: fmt(actual.matTotal),      c: C.text  },
                        { l: "Direct Labour",  v: fmt(actual.labTotal),      c: C.text  },
                        { l: "Hire / Fees",    v: fmt((job.hire||0)+(job.fees||0)), c: C.text },
                        { l: "Total COGS",     v: fmt(actual.cogs),          c: C.textMid, border: true },
                        { l: "Gross Profit",   v: fmt(actual.gp),            c: tl(actual.gpPct, GP_TARGET, GP_WARN) },
                        { l: "Fixed Allocation", v: fmt(actual.fixedAlloc),  c: C.textMid },
                        { l: "Net Profit",     v: fmt(actual.np),            c: tl(actual.npPct, NP_TARGET, 10), bold: true },
                      ].map(row => (
                        <div key={row.l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: row.border ? `1px solid ${C.border}` : "none", marginTop: row.border ? "4px" : "0" }}>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textDim }}>{row.l}</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: row.c, fontWeight: row.bold ? "500" : "400" }}>{row.v}</div>
                        </div>
                      ))}
                    </div>
                    <Label color={C.textMid}>GP% Progress</Label>
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "20px", color: tl(actual.gpPct, GP_TARGET, GP_WARN) }}>{pct(actual.gpPct)}</div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: C.textDim, alignSelf: "flex-end" }}>target {GP_TARGET}%</div>
                      </div>
                      <div style={{ height: "8px", background: C.border2, borderRadius: "1px", position: "relative" }}>
                        <div style={{ position: "absolute", left: GP_WARN + "%", top: "-4px", bottom: "-4px", width: "1px", background: C.amber, opacity: 0.5 }} />
                        <div style={{ position: "absolute", left: GP_TARGET + "%", top: "-4px", bottom: "-4px", width: "1px", background: C.green, opacity: 0.5 }} />
                        <div style={{ height: "100%", width: Math.min(actual.gpPct, 100) + "%", background: tl(actual.gpPct, GP_TARGET, GP_WARN), borderRadius: "1px", transition: "width 0.6s ease" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.amber }}>warn {GP_WARN}%</div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.green }}>target {GP_TARGET}%</div>
                      </div>
                      <div style={{ marginTop: "12px", padding: "8px 10px", background: urgencyColor + "11", border: `1px solid ${urgencyColor}33` }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: urgencyColor, lineHeight: "1.6" }}>
                          {urgency === "URGENT" && `GP is ${pct(actual.gpPct)} — below warning floor. Review materials and hours immediately. ${pct(GP_WARN - actual.gpPct)} to recover before close.`}
                          {urgency === "WATCH" && `GP is ${pct(actual.gpPct)} — below target. Monitor remaining costs closely. ${pct(GP_TARGET - actual.gpPct)} to reach 45%.`}
                          {urgency === "ON TRACK" && `GP tracking ${pct(actual.gpPct)} — above target. Stay disciplined on remaining material runs.`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {view === "materials" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <Label color={C.textMid}>Material Purchase Runs</Label>
                    <button onClick={() => addMaterial(job.id)}
                      style={{ background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "4px 10px", cursor: "pointer", letterSpacing: "0.1em" }}>
                      + ADD RUN
                    </button>
                  </div>
                  <div style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 90px 28px", gap: "0", padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
                      {["Supplier", "Forecasted", "Actual", "Variance", ""].map(h => (
                        <div key={h} style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</div>
                      ))}
                    </div>
                    {job.materials.map((m, i) => {
                      const variance = m.actual - m.forecasted;
                      const vColor = variance > 0 ? C.red : variance < 0 ? C.green : C.textDim;
                      return (
                        <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 90px 28px", gap: "0", padding: "10px 14px", borderBottom: i < job.materials.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
                          <input
                            value={m.supplier}
                            onChange={e => updateMaterial(job.id, m.id, "supplier", e.target.value)}
                            style={{ background: "transparent", border: "none", color: C.text, fontFamily: "Georgia,serif", fontSize: "13px", outline: "none", width: "100%" }}
                          />
                          <NumInput value={m.forecasted} onChange={v => updateMaterial(job.id, m.id, "forecasted", v)} prefix="$" small />
                          <NumInput value={m.actual}     onChange={v => updateMaterial(job.id, m.id, "actual", v)}     prefix="$" small />
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: vColor }}>
                            {m.actual > 0 ? (variance > 0 ? "+" : "") + fmt(variance) : "—"}
                          </div>
                          <button onClick={() => setJobs(js => js.map(j => j.id !== job.id ? j : { ...j, materials: j.materials.filter(x => x.id !== m.id) }))}
                            style={{ background: "transparent", border: "none", color: C.textDim, cursor: "pointer", fontSize: "14px", padding: "0", lineHeight: 1, transition: "color 0.15s" }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = C.red}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = C.textDim}>
                            ×
                          </button>
                        </div>
                      );
                    })}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 90px 28px", padding: "10px 14px", borderTop: `1px solid ${C.border2}`, background: C.surface2 }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textMid }}>TOTAL</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textDim }}>{fmt(forecast.matTotal)}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.text }}>{fmt(actual.matTotal)}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: actual.matTotal > forecast.matTotal ? C.red : C.green }}>
                        {actual.matTotal > 0 ? (actual.matTotal > forecast.matTotal ? "+" : "") + fmt(actual.matTotal - forecast.matTotal) : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {view === "labour" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <Label color={C.textMid}>Crew Hours — Forecasted vs Actual</Label>
                    <button onClick={() => addLabour(job.id)}
                      style={{ background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "4px 10px", cursor: "pointer", letterSpacing: "0.1em" }}>
                      + ADD PERSON
                    </button>
                  </div>
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, marginTop: "8px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "140px 80px 90px 90px 90px 100px 60px 28px", padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
                      {["Name","Type","Rate/hr","F.Hours","A.Hours","Cost","Var",""].map(h => (
                        <div key={h} style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
                      ))}
                    </div>
                    {job.labour.map((l, i) => {
                      const aCost = l.actualHrs * l.loaded;
                      const variance = l.actualHrs - l.forecastedHrs;
                      const vColor = variance > 0 ? C.red : variance < 0 ? C.green : C.textDim;
                      const isActive = l.forecastedHrs > 0 || l.actualHrs > 0;
                      return (
                        <div key={l.id} style={{ display: "grid", gridTemplateColumns: "140px 80px 90px 90px 90px 100px 60px 28px", padding: "10px 14px", borderBottom: i < job.labour.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center", opacity: isActive || l.isCustom ? 1 : 0.4 }}>
                          {l.isCustom ? (
                            <input value={l.name} onChange={e => updateLabour(job.id, l.id, "name", e.target.value)}
                              style={{ background: "transparent", border: `1px solid ${C.border2}`, color: C.text, fontFamily: "Georgia,serif", fontSize: "12px", padding: "2px 6px", outline: "none", width: "100%" }} />
                          ) : (
                            <div style={{ fontSize: "13px", color: C.text }}>{l.name}</div>
                          )}
                          {l.isCustom ? (
                            <input value={l.type} onChange={e => updateLabour(job.id, l.id, "type", e.target.value)}
                              style={{ background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "9px", padding: "2px 4px", outline: "none", width: "100%" }} />
                          ) : (
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim }}>{l.type}</div>
                          )}
                          {l.isCustom ? (
                            <NumInput value={l.loaded} onChange={v => updateLabour(job.id, l.id, "loaded", v)} prefix="$" small />
                          ) : (
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textMid }}>${l.loaded}/hr</div>
                          )}
                          <NumInput value={l.forecastedHrs} onChange={v => updateLabour(job.id, l.id, "forecastedHrs", v)} small />
                          <NumInput value={l.actualHrs}     onChange={v => updateLabour(job.id, l.id, "actualHrs", v)}     small />
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: l.actualHrs > 0 ? C.text : C.textDim }}>
                            {l.actualHrs > 0 ? fmt(aCost) : "—"}
                          </div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: vColor }}>
                            {l.actualHrs > 0 && l.forecastedHrs > 0 ? (variance > 0 ? "+" : "") + variance + "h" : "—"}
                          </div>
                          {l.isCustom ? (
                            <button onClick={() => removeLabour(job.id, l.id)}
                              style={{ background: "transparent", border: "none", color: C.textDim, cursor: "pointer", fontSize: "14px", padding: "0", lineHeight: 1, transition: "color 0.15s" }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = C.red}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = C.textDim}>×</button>
                          ) : <div />}
                        </div>
                      );
                    })}
                    <div style={{ display: "grid", gridTemplateColumns: "140px 80px 90px 90px 90px 100px 80px", padding: "10px 14px", borderTop: `1px solid ${C.border2}`, background: C.surface2 }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textMid, gridColumn: "1/4" }}>TOTAL LABOUR</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textDim }}>{forecast.totalHrs}h</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.text }}>{actual.totalHrs}h</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.text }}>{fmt(actual.labTotal)}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: actual.totalHrs > forecast.totalHrs ? C.red : C.green }}>
                        {actual.totalHrs > 0 && forecast.totalHrs > 0 ? (actual.totalHrs > forecast.totalHrs ? "+" : "") + (actual.totalHrs - forecast.totalHrs) + "h" : "—"}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    <Metric label="COP Hourly Rate" value={fmt(actual.hrlyRate)} color={tl(actual.hrlyRate, 100, 80)} sub="target $100/hr" />
                    <Metric label="Labour Value Rev" value={fmt(actual.labValue)} color={C.gold} sub="quoted − materials" />
                    <Metric label="Labour Cost" value={fmt(actual.labTotal)} color={C.text} sub={actual.totalHrs + " hours"} />
                  </div>
                </div>
              )}
              {view === "report" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <Label color={C.textMid}>Topline — Against Total Revenue</Label>
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "16px", marginBottom: "12px" }}>
                      {[
                        { l: "Quoted Amount",   v: fmt(job.quotedAmount),     c: C.gold  },
                        { l: "Total COGS",      v: fmt(actual.cogs),          c: C.text  },
                        { l: "Gross Profit",    v: fmt(actual.gp),            c: tl(actual.gpPct, GP_TARGET, GP_WARN) },
                        { l: "GP Margin",       v: pct(actual.gpPct),         c: tl(actual.gpPct, GP_TARGET, GP_WARN) },
                      ].map(r => (
                        <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textDim }}>{r.l}</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: r.c }}>{r.v}</div>
                        </div>
                      ))}
                    </div>
                    <Label color={C.textMid}>Labour Value — True GP</Label>
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "16px" }}>
                      {[
                        { l: "Labour Value Revenue", v: fmt(actual.labValue),    c: C.gold  },
                        { l: "Gross Profit",         v: fmt(actual.gp),          c: tl(actual.gpLabour, GP_TARGET, GP_WARN) },
                        { l: "GP Margin",            v: pct(actual.gpLabour),    c: tl(actual.gpLabour, GP_TARGET, GP_WARN) },
                        { l: "GP / hr",              v: fmt(actual.hrlyRate),    c: tl(actual.hrlyRate, 100, 80) },
                      ].map(r => (
                        <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textDim }}>{r.l}</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: r.c }}>{r.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label color={C.textMid}>Efficiency</Label>
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "16px", marginBottom: "12px" }}>
                      {[
                        { l: "Production Rate / m²",    v: (actual.prodM2 || 0).toFixed(1) + " m²/day", c: tl(actual.prodM2, 6, 4) },
                        { l: "Hourly Production Rate",  v: fmt(actual.hrlyRate) + "/hr",                 c: tl(actual.hrlyRate, 100, 80) },
                        { l: "Total Hours",             v: actual.totalHrs + " hrs",                     c: C.text },
                        { l: "Days on Job",             v: job.daysOnJob + " days",                      c: C.text },
                      ].map(r => (
                        <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textDim }}>{r.l}</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: r.c }}>{r.v}</div>
                        </div>
                      ))}
                    </div>
                    <Label color={C.textMid}>GP Contribution</Label>
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "16px" }}>
                      {[
                        { l: "Gross Profit",          v: fmt(actual.gp),       c: tl(actual.gpLabour, GP_TARGET, GP_WARN) },
                        { l: "GP on Labour Value",    v: pct(actual.gpLabour), c: tl(actual.gpLabour, GP_TARGET, GP_WARN) },
                        { l: "Monthly Fixed Pool",    v: fmt(MONTHLY_FIXED),   c: C.textMid },
                        { l: "Remaining to cover",    v: fmt(Math.max(0, MONTHLY_FIXED - actual.gp)), c: C.amber },
                      ].map(r => (
                        <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.textDim }}>{r.l}</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: r.c }}>{r.v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: "12px" }}>
                      <Label color={C.textMid}>Job Notes</Label>
                      <textarea
                        value={job.notes}
                        onChange={e => setJobs(js => js.map(j => j.id !== job.id ? j : { ...j, notes: e.target.value }))}
                        rows={3}
                        style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontFamily: "Georgia,serif", fontSize: "12px", padding: "10px 12px", resize: "vertical", lineHeight: "1.6", outline: "none" }}
                        placeholder="Notes on this job..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "12px" }}>
            Select a job
          </div>
        )}
      </div>
      {/* ── CLOSE JOB MODAL ── */}
      {showClose && job && actual && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border2}`, padding: "28px", width: "480px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.gold, letterSpacing: "0.2em", marginBottom: "4px" }}>CLOSE JOB · SEND TO DNA</div>
            <div style={{ fontSize: "18px", marginBottom: "20px" }}>{job.name} / {job.suburb}</div>
            <div style={{ background: C.surface2, border: `1px solid ${C.border}`, padding: "14px", marginBottom: "20px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.textDim, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Final Figures — Locked</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { l: "Labour Value",   v: fmt(actual.labValue),      c: C.gold  },
                  { l: "GP / Hour",      v: `${actual.profitPerHr >= 0 ? "+" : ""}${fmt(actual.profitPerHr)}/hr`, c: tl(actual.profitPerHr, 30, 0) },
                  { l: "GP on Labour",   v: pct(actual.gpLabour),       c: tl(actual.gpLabour, GP_TARGET, GP_WARN) },
                  { l: "NP%",            v: pct(actual.npPct),          c: tl(actual.npPct, NP_TARGET, 10) },
                  { l: "Total Hours",    v: `${actual.totalHrs}h`,      c: C.text  },
                  { l: "Hours Variance", v: `${actual.totalHrs - (job.labour.reduce((s,l) => s + l.forecastedHrs, 0))}h vs forecast`, c: actual.totalHrs > job.labour.reduce((s,l) => s + l.forecastedHrs, 0) ? C.red : C.green },
                ].map(r => (
                  <div key={r.l}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim, marginBottom: "2px" }}>{r.l}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "13px", color: r.c }}>{r.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: "20px" }}>
              {[
                { key: "complexity",    label: "Complexity",    hint: "Did it run smooth?" },
                { key: "repeatability", label: "Repeatability", hint: "Would you quote this job type again?" },
                { key: "client",        label: "Client",        hint: "Comms, decisions, payment." },
              ].map(dim => (
                <div key={dim.key} style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: C.text }}>{dim.label}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: C.textDim }}>{dim.hint}</div>
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "16px", color: tl(closeScores[dim.key], 7, 5) }}>{closeScores[dim.key]}</div>
                  </div>
                  <input type="range" min="1" max="10" value={closeScores[dim.key]}
                    onChange={e => setCloseScores(s => ({ ...s, [dim.key]: parseInt(e.target.value) }))}
                    style={{ width: "100%", accentColor: C.gold, cursor: "pointer" }}
                  />
                </div>
              ))}
            </div>
            {saveMsg && (
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: saveMsg.startsWith("✓") ? C.green : C.amber, marginBottom: "10px", textAlign: "center" }}>
                {saveMsg}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={closeJob} disabled={saving}
                style={{ flex: 1, background: saving ? C.border2 : C.gold, color: C.bg, border: "none", fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "12px", cursor: saving ? "default" : "pointer", letterSpacing: "0.1em", opacity: saving ? 0.7 : 1 }}>
                {saving ? "SAVING..." : "CONFIRM CLOSE · SEND TO DNA"}
              </button>
              <button onClick={() => setShowClose(false)} disabled={saving}
                style={{ background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "12px 16px", cursor: "pointer" }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── NEW JOB MODAL ── */}
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border2}`, padding: "28px", width: "400px" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: C.gold, letterSpacing: "0.2em", marginBottom: "16px" }}>NEW JOB</div>
            {[
              { label: "Client Name",     key: "name",          type: "text"   },
              { label: "Suburb",          key: "suburb",        type: "text"   },
              { label: "Quoted Amount",   key: "quotedAmount",  type: "number" },
              { label: "Days on Job",     key: "daysOnJob",     type: "number" },
              { label: "Total m²",        key: "totalM2",       type: "number" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "12px" }}>
                <Label>{f.label}</Label>
                <input
                  type={f.type}
                  value={newJob[f.key]}
                  onChange={e => setNewJob(n => ({ ...n, [f.key]: e.target.value }))}
                  style={{ width: "100%", background: C.surface2, border: `1px solid ${C.border2}`, color: C.text, fontFamily: "Georgia,serif", fontSize: "13px", padding: "8px 10px", outline: "none" }}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button onClick={createJob}
                style={{ flex: 1, background: C.gold, color: C.bg, border: "none", fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "10px", cursor: "pointer", letterSpacing: "0.1em" }}>
                CREATE JOB
              </button>
              <button onClick={() => setShowNew(false)}
                style={{ background: "transparent", border: `1px solid ${C.border2}`, color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: "10px", padding: "10px 16px", cursor: "pointer" }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
