'use client'

import { useState, useMemo, useRef } from "react";

const GOLD = "#c9a06a", BG = "#080810", SURFACE = "#0d0d18", SURFACE2 = "#12121f";
const TEXT = "#f0ebe3", TEXT_MID = "#7a7590", TEXT_DIM = "#3a3a50";
const GREEN = "#34d399", AMBER = "#fbbf24", RED = "#f87171", BLUE = "#60a5fa";
const BORDER = "#1a1a2e", BORDER2 = "#22223a";

const METRO_SUBURBS = [
  { name:"Applecross",    lat:-32.0167, lng:115.8333 },
  { name:"Cottesloe",     lat:-31.9981, lng:115.7537 },
  { name:"Subiaco",       lat:-31.9500, lng:115.8333 },
  { name:"Nedlands",      lat:-31.9833, lng:115.8167 },
  { name:"Mosman Park",   lat:-31.9667, lng:115.7667 },
  { name:"Fremantle",     lat:-32.0569, lng:115.7439 },
  { name:"Claremont",     lat:-31.9833, lng:115.7833 },
  { name:"Victoria Park", lat:-31.9667, lng:115.8833 },
  { name:"South Perth",   lat:-31.9833, lng:115.8667 },
  { name:"Perth CBD",     lat:-31.9505, lng:115.8605 },
  { name:"Scarborough",   lat:-31.8939, lng:115.7622 },
  { name:"Mount Lawley",  lat:-31.9333, lng:115.8667 },
  { name:"Leederville",   lat:-31.9333, lng:115.8333 },
  { name:"Bayswater",     lat:-31.9167, lng:115.9000 },
  { name:"Karrinyup",     lat:-31.8667, lng:115.7833 },
  { name:"Cockburn",      lat:-32.1167, lng:115.8500 },
  { name:"Joondalup",     lat:-31.7456, lng:115.7672 },
  { name:"Canning Vale",  lat:-32.0833, lng:115.9167 },
  { name:"Midland",       lat:-31.8833, lng:116.0167 },
  { name:"Rockingham",    lat:-32.2781, lng:115.7294 },
  { name:"Innaloo",       lat:-31.8833, lng:115.8000 },
  { name:"Stirling",      lat:-31.8667, lng:115.8500 },
  { name:"Osborne Park",  lat:-31.9000, lng:115.8167 },
  { name:"Cannington",    lat:-32.0167, lng:115.9333 },
  { name:"Belmont",       lat:-31.9333, lng:115.9333 },
  { name:"Floreat",       lat:-31.9333, lng:115.7833 },
  { name:"Wembley",       lat:-31.9167, lng:115.8167 },
  { name:"North Perth",   lat:-31.9333, lng:115.8500 },
  { name:"West Perth",    lat:-31.9500, lng:115.8333 },
  { name:"Como",          lat:-32.0000, lng:115.8667 },
  { name:"Manning",       lat:-32.0167, lng:115.8833 },
  { name:"Booragoon",     lat:-32.0333, lng:115.8333 },
  { name:"Bull Creek",    lat:-32.0500, lng:115.8500 },
  { name:"Murdoch",       lat:-32.0667, lng:115.8333 },
  { name:"Melville",      lat:-32.0333, lng:115.8167 },
  { name:"Palmyra",       lat:-32.0500, lng:115.7833 },
  { name:"Bicton",        lat:-32.0333, lng:115.7833 },
  { name:"East Fremantle",lat:-32.0333, lng:115.7667 },
  { name:"North Fremantle",lat:-32.0167, lng:115.7500 },
  { name:"Swanbourne",    lat:-31.9833, lng:115.7667 },
  { name:"Dalkeith",      lat:-31.9833, lng:115.8000 },
  { name:"Peppermint Grove",lat:-31.9833, lng:115.7833 },
  { name:"Crawley",       lat:-31.9667, lng:115.8167 },
  { name:"Shenton Park",  lat:-31.9500, lng:115.8000 },
  { name:"Wembley Downs", lat:-31.9000, lng:115.7833 },
  { name:"City Beach",    lat:-31.9333, lng:115.7500 },
  { name:"Churchlands",   lat:-31.9167, lng:115.8167 },
  { name:"Joondanna",     lat:-31.9167, lng:115.8500 },
  { name:"Tuart Hill",    lat:-31.9000, lng:115.8500 },
];

const JOBS = [
  { client:"Henderson",  suburb:"Applecross",    type:"New Deck",       jwLabel:"red",   quotedValue:42000, npPct:14.2, source:"Referral"     },
  { client:"Nguyen",     suburb:"Cottesloe",     type:"Redeck",         jwLabel:"blue",  quotedValue:28000, npPct: 8.1, source:"Instagram"     },
  { client:"Mitchell",   suburb:"Subiaco",       type:"Pergola",        jwLabel:"red",   quotedValue:18500, npPct:22.4, source:"Google"        },
  { client:"Williams",   suburb:"Nedlands",      type:"Deck + Pergola", jwLabel:"black", quotedValue:56000, npPct:11.3, source:"Referral"      },
  { client:"Pereira",    suburb:"Mosman Park",   type:"New Deck",       jwLabel:"black", quotedValue:38000, npPct:24.6, source:"Referral"      },
  { client:"O'Brien",    suburb:"Fremantle",     type:"Redeck",         jwLabel:"red",   quotedValue:22000, npPct: 4.2, source:"Google"        },
  { client:"Tan",        suburb:"Claremont",     type:"New Deck",       jwLabel:"blue",  quotedValue:45000, npPct:16.8, source:"Instagram"     },
  { client:"Hawkins",    suburb:"Victoria Park", type:"Pergola",        jwLabel:"red",   quotedValue:24000, npPct:18.3, source:"Signage"       },
  { client:"Sharma",     suburb:"Applecross",    type:"New Deck",       jwLabel:"black", quotedValue:52000, npPct:21.7, source:"Referral"      },
  { client:"Lee",        suburb:"South Perth",   type:"Redeck",         jwLabel:"red",   quotedValue:19500, npPct: 2.1, source:"Google"        },
  { client:"Park",       suburb:"Nedlands",      type:"Deck + Pergola", jwLabel:"black", quotedValue:68000, npPct:23.4, source:"Repeat client" },
  { client:"Davis",      suburb:"Mosman Park",   type:"New Deck",       jwLabel:"red",   quotedValue:34000, npPct:20.8, source:"Referral"      },
];

const JOB_TYPES = ["New Deck","Redeck","Pergola","Deck + Pergola"];

const TARGET_ZONES = [
  { name:"Premium Belt", desc:"Highest avg NP% cluster — priority ad target", suburbs:["Applecross","Nedlands","Mosman Park","Dalkeith","Peppermint Grove","Crawley"] },
  { name:"Growth Zone",  desc:"Volume + rising demand — secondary target",     suburbs:["Claremont","Cottesloe","Subiaco","Floreat","Shenton Park"] },
];

function fmt(n: number) { return "$" + Math.round(n).toLocaleString(); }
function fmtPct(n: number) { return n.toFixed(1) + "%"; }
function avg(arr: number[]) { return arr.length ? arr.reduce((s,x)=>s+x,0)/arr.length : 0; }

const MAP_BOUNDS = { minLat: -32.40, maxLat: -31.65, minLng: 115.68, maxLng: 116.10 };
const MAP_W = 620, MAP_H = 700;

function project(lat: number, lng: number) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * MAP_W;
  const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * MAP_H;
  return { x, y };
}

function metricColor(value: number, min: number, max: number) {
  if (max === min) return { fill: AMBER, glow: AMBER };
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  if (t >= 0.75) return { fill: "#00e676", glow: "#00e676" };
  if (t >= 0.55) return { fill: GREEN,    glow: GREEN    };
  if (t >= 0.35) return { fill: "#a3e635",glow: "#a3e635"};
  if (t >= 0.2)  return { fill: AMBER,    glow: AMBER    };
  return { fill: RED, glow: RED };
}

function SwanRiver() {
  const pts = [
    [-31.870, 115.945],[-31.887, 115.930],[-31.895, 115.915],
    [-31.910, 115.900],[-31.920, 115.890],[-31.930, 115.880],
    [-31.940, 115.875],[-31.952, 115.870],[-31.960, 115.862],
    [-31.968, 115.855],[-31.975, 115.848],[-31.980, 115.840],
    [-31.985, 115.830],[-31.990, 115.820],[-31.998, 115.810],
    [-32.005, 115.800],[-32.012, 115.790],[-32.020, 115.782],
    [-32.028, 115.778],[-32.035, 115.772],[-32.042, 115.768],
    [-32.050, 115.762],[-32.058, 115.752],[-32.065, 115.745],
  ].map(([lat, lng]) => project(lat!, lng!));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return <path d={d} fill="none" stroke="#1a2a4a" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />;
}

function Coastline() {
  const pts = [
    [-31.65, 115.73],[-31.70, 115.73],[-31.75, 115.73],
    [-31.80, 115.73],[-31.85, 115.74],[-31.89, 115.75],
    [-31.93, 115.75],[-31.97, 115.75],[-32.00, 115.74],
    [-32.03, 115.74],[-32.06, 115.74],[-32.10, 115.74],
    [-32.15, 115.75],[-32.20, 115.76],[-32.25, 115.77],
    [-32.30, 115.73],[-32.35, 115.73],[-32.40, 115.72],
  ].map(([lat, lng]) => project(lat!, lng!));
  const d = pts.map((p, i) => `${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <>
      <path d={d + ` L${pts[pts.length-1].x},${MAP_H+20} L${pts[0].x},${MAP_H+20} Z`} fill="#0a1525" opacity="0.5" />
      <path d={d} fill="none" stroke="#1e3a5f" strokeWidth="1.5" opacity="0.6" />
    </>
  );
}

export default function PerthJobMap() {
  const [metric,       setMetric]       = useState("np");
  const [filterType,   setFilterType]   = useState("all");
  const [filterLabel,  setFilterLabel]  = useState("all");
  const [showTarget,   setShowTarget]   = useState(false);
  const [hoveredSuburb,setHoveredSuburb]= useState<string|null>(null);
  const [selectedSuburb,setSelectedSuburb] = useState<string|null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const filteredJobs = useMemo(() => JOBS.filter(j => {
    if (filterType !== "all" && j.type !== filterType) return false;
    if (filterLabel !== "all" && j.jwLabel !== filterLabel) return false;
    return true;
  }), [filterType, filterLabel]);

  const suburbData = useMemo(() => {
    const map: Record<string, {jobs: typeof JOBS; npPcts: number[]; revenues: number[]}> = {};
    filteredJobs.forEach(j => {
      if (!map[j.suburb]) map[j.suburb] = { jobs:[], npPcts:[], revenues:[] };
      map[j.suburb].jobs.push(j);
      map[j.suburb].npPcts.push(j.npPct);
      map[j.suburb].revenues.push(j.quotedValue);
    });
    return Object.entries(map).map(([name, d]) => {
      const metro = METRO_SUBURBS.find(s => s.name === name);
      if (!metro) return null;
      const pos = project(metro.lat, metro.lng);
      return { name, pos, count: d.jobs.length, avgNP: avg(d.npPcts), totalRevenue: d.revenues.reduce((s,v)=>s+v,0), jobs: d.jobs };
    }).filter(Boolean) as {name:string;pos:{x:number;y:number};count:number;avgNP:number;totalRevenue:number;jobs:typeof JOBS}[];
  }, [filteredJobs]);

  const metricValues = suburbData.map(s => metric === "np" ? s.avgNP : metric === "revenue" ? s.totalRevenue : s.count);
  const metricMin = Math.min(...metricValues, 0);
  const metricMax = Math.max(...metricValues, 1);

  function getMetricLabel(s: typeof suburbData[0]) {
    if (metric === "np") return fmtPct(s.avgNP);
    if (metric === "revenue") return fmt(s.totalRevenue);
    return s.count.toString();
  }
  function getMetricValue(s: typeof suburbData[0]) {
    if (metric === "np") return s.avgNP;
    if (metric === "revenue") return s.totalRevenue;
    return s.count;
  }
  function bubbleR(s: typeof suburbData[0]) {
    return 22 + Math.min(s.count - 1, 3) * 10;
  }

  const selectedData = selectedSuburb ? suburbData.find(s => s.name === selectedSuburb) : null;

  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "'Georgia', serif", display: "grid", gridTemplateColumns: "1fr 300px", gridTemplateRows: "auto 1fr" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        .map-bubble { cursor: pointer; transition: all 0.2s; }
        .map-bubble:hover { filter: brightness(1.3); }
        .map-tog { background: transparent; border: 1px solid #22223a; color: #7a7590; cursor: pointer; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.12em; padding: 5px 12px; transition: all 0.15s; }
        .map-tog:hover { border-color: #c9a06a44; color: #c9a06a; }
        .map-tog.t-active { border-color: #c9a06a; color: #c9a06a; background: #c9a06a10; }
        .map-tog.t-blue { border-color: #60a5fa; color: #60a5fa; background: #60a5fa10; }
        .map-tog.t-green { border-color: #34d399; color: #34d399; background: #34d39910; }
      `}</style>
      {/* TOP BAR */}
      <div style={{ gridColumn:"1/-1", borderBottom:`1px solid ${BORDER}`, padding:"14px 24px", display:"flex", gap:"12px", alignItems:"center", background:SURFACE }}>
        <div style={{ marginRight:"8px" }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px", color:GOLD, letterSpacing:"0.25em", textTransform:"uppercase" as const, marginBottom:"2px" }}>Endure Decking</div>
          <div style={{ fontSize:"16px", letterSpacing:"-0.3px" }}>Perth Job Intelligence Map</div>
        </div>
        <div style={{ display:"flex", gap:"1px", background:BORDER, padding:"1px", marginLeft:"16px" }}>
          {[{id:"np",label:"NP%",cls:"t-active"},{id:"revenue",label:"Revenue",cls:"t-blue"},{id:"count",label:"Volume",cls:"t-green"}].map(m => (
            <button key={m.id} className={`map-tog ${metric===m.id ? m.cls : ""}`} onClick={() => setMetric(m.id)}>{m.label}</button>
          ))}
        </div>
        <div style={{ width:"1px", height:"20px", background:BORDER2 }} />
        <div style={{ display:"flex", gap:"4px" }}>
          <button className={`map-tog ${filterType==="all"?"t-active":""}`} onClick={()=>setFilterType("all")}>ALL TYPES</button>
          {JOB_TYPES.map(t => (
            <button key={t} className={`map-tog ${filterType===t?"t-active":""}`} style={{fontSize:"8px"}} onClick={()=>setFilterType(t)}>{t.toUpperCase()}</button>
          ))}
        </div>
        <div style={{ width:"1px", height:"20px", background:BORDER2 }} />
        <div style={{ display:"flex", gap:"4px" }}>
          <button className={`map-tog ${filterLabel==="all"?"t-active":""}`} onClick={()=>setFilterLabel("all")}>ALL</button>
          {["red","black","blue"].map(l => (
            <button key={l} className={`map-tog ${filterLabel===l?"t-active":""}`} style={{fontSize:"8px"}} onClick={()=>setFilterLabel(l)}>{l.toUpperCase()}</button>
          ))}
        </div>
        <div style={{ width:"1px", height:"20px", background:BORDER2 }} />
        <button className={`map-tog ${showTarget?"t-blue":""}`} onClick={()=>setShowTarget(v=>!v)}>
          {showTarget ? "✓ " : ""}TARGET ZONES
        </button>
        <div style={{ marginLeft:"auto", fontFamily:"'DM Mono',monospace", fontSize:"10px", color:TEXT_MID }}>
          {filteredJobs.length} job{filteredJobs.length!==1?"s":""} · {suburbData.length} suburb{suburbData.length!==1?"s":""}
        </div>
      </div>
      {/* MAP */}
      <div style={{ position:"relative", overflow:"hidden", background:"radial-gradient(ellipse at 30% 50%, #0a1020 0%, #050508 100%)" }}>
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ display:"block" }}>
          <defs>
            <filter id="map-glow-soft"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <pattern id="map-hatch-gold" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#c9a06a" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
            <pattern id="map-hatch-blue" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#60a5fa" strokeWidth="0.5" opacity="0.2"/>
            </pattern>
          </defs>
          <rect width={MAP_W} height={MAP_H} fill="#050810" />
          <Coastline />
          <SwanRiver />
          {[-32.3,-32.2,-32.1,-32.0,-31.9,-31.8,-31.7].map(lat => {
            const { y } = project(lat, 115.68);
            return <line key={lat} x1="0" y1={y} x2={MAP_W} y2={y} stroke="#ffffff" strokeWidth="0.3" opacity="0.04" />;
          })}
          {[115.70,115.75,115.80,115.85,115.90,115.95,116.00,116.05].map(lng => {
            const { x } = project(-31.65, lng);
            return <line key={lng} x1={x} y1="0" x2={x} y2={MAP_H} stroke="#ffffff" strokeWidth="0.3" opacity="0.04" />;
          })}
          {showTarget && TARGET_ZONES.map((zone, zi) => {
            const zoneSubs = METRO_SUBURBS.filter(s => zone.suburbs.includes(s.name)).map(s => project(s.lat, s.lng));
            if (zoneSubs.length < 2) return null;
            const xs = zoneSubs.map(p=>p.x), ys = zoneSubs.map(p=>p.y);
            const cx = avg(xs), cy = avg(ys);
            const rx = (Math.max(...xs)-Math.min(...xs))/2 + 28;
            const ry = (Math.max(...ys)-Math.min(...ys))/2 + 28;
            const pat = zi===0 ? "url(#map-hatch-gold)" : "url(#map-hatch-blue)";
            const col = zi===0 ? GOLD : BLUE;
            return (
              <g key={zone.name}>
                <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={pat} stroke={col} strokeWidth="1" strokeDasharray="4 4" opacity="0.8" />
                <text x={cx} y={cy - ry - 6} textAnchor="middle" fontFamily="'DM Mono',monospace" fontSize="8" fill={col} letterSpacing="0.1em" opacity="0.9">{zone.name.toUpperCase()}</text>
              </g>
            );
          })}
          {METRO_SUBURBS.filter(s => !suburbData.find(d => d.name === s.name)).map(s => {
            const pos = project(s.lat, s.lng);
            return <g key={s.name}><circle cx={pos.x} cy={pos.y} r="3" fill="#1a1a30" stroke="#252540" strokeWidth="0.5" /></g>;
          })}
          {suburbData.map(s => {
            const { fill } = metricColor(getMetricValue(s), metricMin, metricMax);
            const r = bubbleR(s);
            const isHovered  = hoveredSuburb === s.name;
            const isSelected = selectedSuburb === s.name;
            const label = getMetricLabel(s);
            const fontSize = label.length > 6 ? 8 : label.length > 4 ? 9 : 10;
            return (
              <g key={s.name} className="map-bubble"
                onMouseEnter={() => setHoveredSuburb(s.name)}
                onMouseLeave={() => setHoveredSuburb(null)}
                onClick={() => setSelectedSuburb(s.name === selectedSuburb ? null : s.name)}>
                <circle cx={s.pos.x} cy={s.pos.y} r={r + 8} fill={fill} opacity={isHovered||isSelected ? 0.12 : 0.06} filter="url(#map-glow-soft)" />
                <circle cx={s.pos.x} cy={s.pos.y} r={r + 2} fill="none" stroke={fill} strokeWidth={isSelected ? 2 : 1} opacity={isHovered||isSelected ? 0.8 : 0.3} />
                <circle cx={s.pos.x} cy={s.pos.y} r={r} fill={fill} opacity={isHovered||isSelected ? 0.22 : 0.14} stroke={fill} strokeWidth="1" />
                <text x={s.pos.x} y={s.pos.y - 1} textAnchor="middle" dominantBaseline="middle" fontFamily="'DM Mono',monospace" fontSize={fontSize} fontWeight="500" fill={fill} opacity="0.95">{label}</text>
                <text x={s.pos.x} y={s.pos.y + r + 11} textAnchor="middle" fontFamily="'DM Mono',monospace" fontSize="7.5" fill={TEXT_MID} opacity={isHovered||isSelected ? 1 : 0.7} letterSpacing="0.05em">{s.name.toUpperCase()}</text>
                {s.count > 1 && (
                  <g>
                    <circle cx={s.pos.x + r - 4} cy={s.pos.y - r + 4} r="7" fill={SURFACE} stroke={fill} strokeWidth="0.8" />
                    <text x={s.pos.x + r - 4} y={s.pos.y - r + 4} textAnchor="middle" dominantBaseline="middle" fontFamily="'DM Mono',monospace" fontSize="7" fill={fill}>{s.count}</text>
                  </g>
                )}
              </g>
            );
          })}
          {(() => {
            const pos = project(-31.9505, 115.8605);
            return (
              <g opacity="0.5">
                <circle cx={pos.x} cy={pos.y} r="4" fill="none" stroke="#ffffff" strokeWidth="0.8" />
                <line x1={pos.x-6} y1={pos.y} x2={pos.x+6} y2={pos.y} stroke="#ffffff" strokeWidth="0.5" opacity="0.5"/>
                <line x1={pos.x} y1={pos.y-6} x2={pos.x} y2={pos.y+6} stroke="#ffffff" strokeWidth="0.5" opacity="0.5"/>
                <text x={pos.x+7} y={pos.y-5} fontFamily="'DM Mono',monospace" fontSize="7" fill="#ffffff" opacity="0.5">CBD</text>
              </g>
            );
          })()}
          <g transform={`translate(${MAP_W - 36}, 36)`} opacity="0.35">
            <line x1="0" y1="-14" x2="0" y2="14" stroke={TEXT_MID} strokeWidth="0.8"/>
            <line x1="-14" y1="0" x2="14" y2="0" stroke={TEXT_MID} strokeWidth="0.8"/>
            <polygon points="0,-14 -3,-6 3,-6" fill={TEXT_MID}/>
            <text x="0" y="-17" textAnchor="middle" fontFamily="'DM Mono',monospace" fontSize="7" fill={TEXT_MID}>N</text>
          </g>
          <g transform={`translate(16, ${MAP_H - 20})`} opacity="0.4">
            <line x1="0" y1="0" x2="60" y2="0" stroke={TEXT_DIM} strokeWidth="1"/>
            <line x1="0" y1="-4" x2="0" y2="4" stroke={TEXT_DIM} strokeWidth="1"/>
            <line x1="60" y1="-4" x2="60" y2="4" stroke={TEXT_DIM} strokeWidth="1"/>
            <text x="30" y="-6" textAnchor="middle" fontFamily="'DM Mono',monospace" fontSize="7" fill={TEXT_DIM}>~10 km</text>
          </g>
        </svg>
      </div>
      {/* RIGHT PANEL */}
      <div style={{ borderLeft:`1px solid ${BORDER}`, background:SURFACE, overflowY:"auto" as const, display:"flex", flexDirection:"column" as const }}>
        <div style={{ padding:"16px 16px 12px", borderBottom:`1px solid ${BORDER}` }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px", color:GOLD, letterSpacing:"0.2em", textTransform:"uppercase" as const, marginBottom:"10px" }}>
            {metric === "np" ? "NP% gradient" : metric === "revenue" ? "Revenue gradient" : "Volume gradient"}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"6px" }}>
            <div style={{ flex:1, height:"6px", borderRadius:"3px", background:"linear-gradient(to right, #f87171, #fbbf24, #a3e635, #34d399, #00e676)" }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", color:RED }}>Low</span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", color:"#00e676" }}>High</span>
          </div>
          <div style={{ marginTop:"10px", display:"flex", gap:"12px" }}>
            {[{sz:18,label:"1 job"},{sz:26,label:"2–3 jobs"},{sz:34,label:"4+ jobs"}].map(({sz,label}) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:"5px" }}>
                <div style={{ width:`${sz}px`, height:`${sz}px`, borderRadius:"50%", border:`1px solid ${TEXT_DIM}`, background:`${TEXT_DIM}22` }}/>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", color:TEXT_DIM }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        {selectedData ? (
          <div style={{ padding:"16px", flex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
              <div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px", color:GOLD, letterSpacing:"0.15em", textTransform:"uppercase" as const, marginBottom:"3px" }}>Selected</div>
                <div style={{ fontSize:"17px" }}>{selectedData.name}</div>
              </div>
              <button className="map-tog" onClick={()=>setSelectedSuburb(null)} style={{ padding:"3px 8px" }}>✕</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1px", background:BORDER, marginBottom:"14px" }}>
              {[
                { l:"Jobs",    v:selectedData.count.toString(),                                c:TEXT  },
                { l:"Avg NP%", v:fmtPct(selectedData.avgNP),                                  c:selectedData.avgNP>=20?GREEN:selectedData.avgNP>=10?AMBER:RED },
                { l:"Revenue", v:fmt(selectedData.totalRevenue),                               c:BLUE  },
                { l:"Avg job", v:fmt(selectedData.totalRevenue/selectedData.count),            c:TEXT_MID },
              ].map(m=>(
                <div key={m.l} style={{ background:SURFACE2, padding:"10px 12px" }}>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", color:TEXT_DIM, marginBottom:"3px", textTransform:"uppercase" as const, letterSpacing:"0.1em" }}>{m.l}</div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"16px", color:m.c }}>{m.v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px", color:GOLD, letterSpacing:"0.15em", textTransform:"uppercase" as const, marginBottom:"8px" }}>Jobs</div>
            <div style={{ display:"flex", flexDirection:"column" as const, gap:"6px" }}>
              {selectedData.jobs.map((j,i) => {
                const npColor = j.npPct>=20?GREEN:j.npPct>=10?AMBER:RED;
                const labelColor = j.jwLabel==="black"?TEXT:j.jwLabel==="blue"?BLUE:RED;
                return (
                  <div key={i} style={{ background:SURFACE2, border:`1px solid ${BORDER2}`, padding:"10px 12px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"4px" }}>
                      <div style={{ fontSize:"13px", color:TEXT }}>{j.client}</div>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"12px", color:npColor }}>{fmtPct(j.npPct)}</div>
                    </div>
                    <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", color:labelColor, border:`1px solid ${labelColor}44`, padding:"1px 5px" }}>{j.jwLabel.toUpperCase()}</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", color:TEXT_DIM }}>{j.type}</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", color:TEXT_DIM, marginLeft:"auto" }}>{fmt(j.quotedValue)}</span>
                    </div>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", color:TEXT_DIM, marginTop:"4px" }}>{j.source}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ flex:1, padding:"16px" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px", color:GOLD, letterSpacing:"0.2em", textTransform:"uppercase" as const, marginBottom:"10px" }}>
              Suburb Ranking — {metric==="np"?"NP%":metric==="revenue"?"Revenue":"Volume"}
            </div>
            <div style={{ display:"flex", flexDirection:"column" as const, gap:"4px", marginBottom:"20px" }}>
              {[...suburbData].sort((a,b) => getMetricValue(b)-getMetricValue(a)).map((s,i) => {
                const { fill } = metricColor(getMetricValue(s), metricMin, metricMax);
                const barW = metricMax > metricMin ? (getMetricValue(s)-metricMin)/(metricMax-metricMin)*100 : 50;
                return (
                  <div key={s.name} style={{ cursor:"pointer", padding:"8px 10px", background:selectedSuburb===s.name?`${fill}12`:SURFACE2, border:`1px solid ${selectedSuburb===s.name?fill:BORDER}`, transition:"all 0.15s" }}
                    onClick={()=>setSelectedSuburb(s.name===selectedSuburb?null:s.name)}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"4px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", color:TEXT_DIM, width:"12px" }}>#{i+1}</span>
                        <span style={{ fontSize:"12px", color:TEXT }}>{s.name}</span>
                      </div>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:fill }}>{getMetricLabel(s)}</span>
                    </div>
                    <div style={{ height:"2px", background:BORDER, borderRadius:"1px" }}>
                      <div style={{ height:"100%", width:`${barW}%`, background:fill, borderRadius:"1px", transition:"width 0.4s" }}/>
                    </div>
                  </div>
                );
              })}
            </div>
            {suburbData.length > 0 && (() => {
              const topNP  = [...suburbData].sort((a,b)=>b.avgNP-a.avgNP)[0];
              const topRev = [...suburbData].sort((a,b)=>b.totalRevenue-a.totalRevenue)[0];
              return (
                <div style={{ background:`${GOLD}08`, border:`1px solid ${GOLD}22`, padding:"12px 14px" }}>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", color:GOLD, letterSpacing:"0.15em", textTransform:"uppercase" as const, marginBottom:"6px" }}>Jarvis · Location Signal</div>
                  <div style={{ fontSize:"11px", color:TEXT_MID, lineHeight:"1.75" }}>
                    {topNP.name} leads on NP% at {fmtPct(topNP.avgNP)} — {topNP.count} job{topNP.count!==1?"s":""} averaging {fmt(topNP.totalRevenue/topNP.count)} each. {topRev.name !== topNP.name ? `${topRev.name} drives the most revenue at ${fmt(topRev.totalRevenue)} total. ` : ""}The western suburbs belt is your sweet spot — target Instagram ads to homeowners aged 35–55 within 5km of {topNP.name}.
                  </div>
                </div>
              );
            })()}
            {showTarget && (
              <div style={{ marginTop:"12px" }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px", color:BLUE, letterSpacing:"0.2em", textTransform:"uppercase" as const, marginBottom:"8px" }}>Target Zones</div>
                {TARGET_ZONES.map((z,i) => (
                  <div key={z.name} style={{ padding:"10px 12px", background:SURFACE2, border:`1px solid ${i===0?GOLD:BLUE}33`, marginBottom:"6px" }}>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:i===0?GOLD:BLUE, marginBottom:"3px" }}>{z.name}</div>
                    <div style={{ fontSize:"11px", color:TEXT_DIM }}>{z.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
