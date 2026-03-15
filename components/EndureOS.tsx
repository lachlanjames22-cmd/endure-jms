'use client'

import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";

const C = {
  bg: "#060608",
  surface: "#0c0c0f",
  surface2: "#111116",
  surface3: "#16161d",
  border: "#1a1a24",
  border2: "#222232",
  gold: "#b8935a",
  goldDim: "#b8935a55",
  goldFaint: "#b8935a14",
  goldGlow: "#b8935a08",
  text: "#e8ddd0",
  textMid: "#6b6860",
  textDim: "#2a2a38",
  green: "#4ade80",
  greenDim: "#4ade8022",
  amber: "#fbbf24",
  amberDim: "#fbbf2422",
  red: "#f87171",
  redDim: "#f8717122",
  blue: "#60a5fa",
  blueDim: "#60a5fa22",
  purple: "#a78bfa",
  purpleDim: "#a78bfa22",
};

const cashflow = Array.from({length:30},(_,i)=>{
  let bal = 34200;
  const payroll=[5,12,19,26], income=[2,7,15,22,28], opex=[0,7,14,21,28];
  for(let d=0;d<=i;d++){
    if(payroll.includes(d)) bal-=5771;
    if(income.includes(d)) bal+=d===2?9625:d===7?19250:d===15?22000:d===22?14500:8000;
    if(opex.includes(d)) bal-=2178;
  }
  return {day:i+1,balance:Math.max(bal,0),projected:i>14};
});

const monthly=[
  {m:"Aug",rev:38642,gp:18181,pct:47,cops:33724},
  {m:"Sep",rev:51200,gp:24064,pct:47,cops:33724},
  {m:"Oct",rev:58181,gp:27345,pct:47,cops:33724},
  {m:"Nov",rev:67283,gp:31303,pct:46.5,cops:33724},
  {m:"Dec",rev:28000,gp:11760,pct:42,cops:33724},
  {m:"Jan",rev:43835,gp:19726,pct:45,cops:33724},
];

const jobs=[
  {id:"021",name:"Henderson",suburb:"Claremont",sqm:38,product:"EvaLast Apex",tier:"blue",status:"in_progress",qGP:48.5,aGP:46.2,lv:22000,tv:38500,day:3,days:5,crew:["B","M","A"]},
  {id:"022",name:"Smith",suburb:"Nedlands",sqm:28,product:"Spotted Gum",tier:"red",status:"scheduled",qGP:45.0,lv:16800,tv:24200,crew:["B","M"]},
  {id:"023",name:"Williams",suburb:"Swanbourne",sqm:55,product:"Trex Transcend",tier:"black",status:"won",qGP:47.2,lv:28000,tv:52000,crew:[]},
  {id:"024",name:"Davies",suburb:"Subiaco",sqm:22,product:"Merbau",tier:"red",status:"quoted",qGP:44.8,lv:13200,tv:18900,daysSent:11},
  {id:"025",name:"Chen",suburb:"Mosman Park",sqm:67,product:"Millboard",tier:"blue",status:"quoted",qGP:49.1,lv:38000,tv:78000,daysSent:13},
  {id:"026",name:"Patterson",suburb:"Cottesloe",sqm:31,product:"Jarrah",tier:"red",status:"complete",qGP:46.1,aGP:47.8,lv:14800,tv:21200},
] as const;

const crew=[
  {name:"Baylee Taylor",initials:"BT",type:"Full Time",rate:45,loaded:55,sentiment:7.8,checkin:"2d ago",util:92,eff:98,hrs:40,trend:[7.2,7.5,7.8,7.6,7.8]},
  {name:"Marius Hauser",initials:"MH",type:"Full Time",rate:38,loaded:43.77,sentiment:6.1,checkin:"2d ago",util:88,eff:94,hrs:38,trend:[7.4,7.1,6.8,6.5,6.1]},
  {name:"Ash",initials:"AS",type:"Casual",rate:38,loaded:45.6,sentiment:8.2,checkin:"5d ago",util:60,eff:101,hrs:24,trend:[8.0,8.1,8.2,8.0,8.2]},
];

const igPosts=[
  {type:"Reel",topic:"Cottesloe subframe timelapse",reach:8920,saves:43,eng:4.2,days:3,best:true},
  {type:"Post",topic:"Before & after — Claremont composite",reach:3240,saves:21,eng:2.8,days:6,best:false},
  {type:"Story",topic:"Merbau delivery — DP Timber",reach:1820,saves:0,eng:1.1,days:8,best:false},
  {type:"Reel",topic:"Full build timelapse — Nedlands",reach:5670,saves:67,eng:3.9,days:12,best:false},
];

const adData=[
  {w:"W1 Nov",g:380,m:220,leads:8},{w:"W2 Nov",g:420,m:180,leads:11},
  {w:"W3 Nov",g:500,m:240,leads:14},{w:"W4 Nov",g:480,m:210,leads:12},
  {w:"W1 Dec",g:0,m:0,leads:2},{w:"W2 Dec",g:0,m:0,leads:1},
];

const scenarios=[
  {name:"Status Quo",jobs:2.2,avgLV:18400,monthly:40480,np:6756,crew:2,color:C.textMid,desc:"Current trajectory"},
  {name:"Ads On",jobs:4,avgLV:20232,monthly:80928,np:47203,crew:3,color:C.gold,desc:"$1k/month ads + 1 hire"},
  {name:"Premium",jobs:3,avgLV:28000,monthly:84000,np:50275,crew:2,color:C.green,desc:"Blue tier focus, less volume"},
];

const contentCalendar=[
  {date:"Mon 9",format:"Story",concept:"Henderson day 4 — boarding going down",status:"suggested",job:"021"},
  {date:"Tue 10",format:"Reel",concept:"Full subframe timelapse — Claremont composite",status:"approved",job:"021"},
  {date:"Wed 11",format:"Post",concept:"EvaLast Apex close-up texture + durability story",status:"suggested",job:""},
  {date:"Thu 12",format:"Story",concept:"Job completion — client reaction",status:"suggested",job:"021"},
  {date:"Fri 13",format:"Reel",concept:"Week wrap — before/during/after transformation",status:"suggested",job:"021"},
  {date:"Mon 16",format:"Post",concept:"Smith Nedlands — Spotted Gum grain close-up",status:"suggested",job:"022"},
];

const wins=[
  {title:"47% GP three weeks running",cat:"financial",date:"This month"},
  {title:"Chen signed — longest quote cycle yet",cat:"sales",date:"Last week"},
  {title:"Marius efficiency up 8%",cat:"team",date:"This month"},
  {title:"First Blue tier referral — Patterson → Williams",cat:"growth",date:"2 weeks ago"},
  {title:"$67k revenue month — November record",cat:"financial",date:"Nov 2025"},
];

const jarvisHistory=[
  {role:"assistant",text:"Morning Lachlan — Wednesday 4 March.\n\nCash $34,200 — healthy. One critical item today.\n\nHenderson is day 3 of 5, on track. Smith materials need ordering before Thursday for Monday start.\n\nYour move: Quote 025 Chen is 13 days cold. $78k job. Call today — not text."},
  {role:"user",text:"yeah order the smith materials and give me a call script for chen"},
  {role:"assistant",text:"⚙ Creating materials order summary for Smith (Job 022)...\n⚙ Logging to cashflow as COD outflow Thursday...\n\nDone — materials order summary sent to DP Timber. $8,400 COD Thursday. Cashflow updated.\n\nCall script for Chen:\n\n\"Hey [name], Lachlan from Endure. Just following up on the Mosman Park deck — I know it's a big decision. A couple of things have moved on Millboard pricing since we quoted, your price is locked until end of week. Did you have any questions I can answer before then?\"\n\nLead with the lock, not the chase. Want me to log the call outcome after?"},
  {role:"user",text:"yes. also update marius rate hes on 42 now"},
  {role:"assistant",text:"⚙ Updating Marius base rate to $42/hr...\n⚙ Recalculating loaded rate: $48.51/hr...\n⚙ Updating weekly cost: $1,857/wk...\n⚙ Adjusting monthly COPS: +$348 → $34,072...\n⚙ Updating cashflow projections forward 30 days...\n\nDone. Marius is $42 base / $48.51 loaded. Monthly COPS moves to $34,072. Refresh Finance to see updated projections.\n\nGood call by the way — his efficiency is up 8% this month. Worth it."},
];

const fmt=(v: number)=>"$"+Math.round(Math.abs(v)).toLocaleString("en-AU");
const fmtK=(v: number)=>(Math.abs(v)>=1000?(Math.abs(v)/1000).toFixed(0)+"k":Math.round(Math.abs(v)).toString());
const pct=(v: number)=>v?.toFixed(1)+"%";
const tl=(v: number,g: number,w: number)=>v>=g?C.green:v>=w?C.amber:C.red;
const tlBg=(v: number,g: number,w: number)=>v>=g?C.greenDim:v>=w?C.amberDim:C.redDim;

const Pill=({children,color}:{children:React.ReactNode;color:string})=>(
  <span style={{fontSize:9,padding:"2px 8px",borderRadius:20,letterSpacing:"0.08em",
    textTransform:"uppercase" as const,background:color+"18",color,border:`1px solid ${color}33`,
    fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap" as const}}>
    {children}
  </span>
);

const Card=({children,style,accent,glow}:{children:React.ReactNode;style?:React.CSSProperties;accent?:string;glow?:string})=>(
  <div style={{background:C.surface,border:`1px solid ${accent?accent+"44":glow?glow+"33":C.border}`,
    borderRadius:14,padding:"18px 20px",
    borderLeft:accent?`3px solid ${accent}`:undefined,
    boxShadow:glow?`0 0 24px ${glow}0a,inset 0 1px 0 ${glow}18`:undefined,...style}}>
    {children}
  </div>
);

const Label=({children,color}:{children:React.ReactNode;color?:string})=>(
  <div style={{fontSize:8,letterSpacing:"0.35em",textTransform:"uppercase" as const,
    color:color||C.gold,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
    <div style={{width:24,height:1,background:color||C.gold,opacity:0.4}}/>
    {children}
    <div style={{flex:1,height:1,background:color||C.gold,opacity:0.08}}/>
  </div>
);

const Metric=({label,value,sub,color,size=20,mono=true}:{label:string;value:string|number;sub?:string;color?:string;size?:number;mono?:boolean})=>(
  <div>
    <div style={{fontSize:8,color:C.textDim,letterSpacing:"0.25em",textTransform:"uppercase" as const,marginBottom:5}}>{label}</div>
    <div style={{fontSize:size,color:color||C.text,fontFamily:mono?"'DM Mono',monospace":"'Playfair Display',Georgia,serif",fontWeight:300,lineHeight:1,letterSpacing:mono?"-0.02em":undefined}}>{value}</div>
    {sub&&<div style={{fontSize:9,color:C.textMid,marginTop:4,lineHeight:1.4}}>{sub}</div>}
  </div>
);

const TrafficLight=({value,good,warn,size=7}:{value:number;good:number;warn:number;size?:number})=>(
  <div style={{width:size,height:size,borderRadius:"50%",background:tl(value,good,warn),
    flexShrink:0,boxShadow:`0 0 ${size}px ${tl(value,good,warn)}99`}}/>
);

const StatusPill=({status}:{status:string})=>{
  const m:{[k:string]:{l:string;c:string}}={complete:{l:"Complete",c:C.green},in_progress:{l:"In Progress",c:C.blue},
    scheduled:{l:"Scheduled",c:C.amber},won:{l:"Won",c:C.gold},
    quoted:{l:"Quoted",c:C.textMid},lost:{l:"Lost",c:C.red}};
  const s=m[status]||{l:status,c:C.textMid};
  return <Pill color={s.c}>{s.l}</Pill>;
};

const TierDot=({tier}:{tier:string})=>{
  const m:{[k:string]:string}={red:"#ef4444",black:"#94a3b8",blue:C.blue};
  return <div style={{width:6,height:6,borderRadius:"50%",background:m[tier]||C.textMid,flexShrink:0}}/>;
};

const ToolCall=({text}:{text:string})=>(
  <div style={{fontSize:10,color:C.gold,padding:"4px 10px",background:C.goldFaint,
    border:`1px solid ${C.goldDim}`,borderRadius:6,fontFamily:"'DM Mono',monospace",
    marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
    <span style={{opacity:0.6}}>⚙</span>{text}
  </div>
);

const NAV=[
  {id:"dashboard",icon:"⬡",label:"Overview"},
  {id:"jarvis",icon:"✦",label:"Jarvis"},
  {id:"finance",icon:"◈",label:"Finance"},
  {id:"ops",icon:"⬢",label:"Ops"},
  {id:"sales",icon:"◇",label:"Sales"},
  {id:"hr",icon:"◉",label:"Team"},
  {id:"marketing",icon:"◎",label:"Marketing"},
  {id:"ceo",icon:"❋",label:"CEO"},
  {id:"content",icon:"▣",label:"Content"},
  {id:"portal",icon:"△",label:"Portal"},
];

function TopBar({page,setPage}:{page:string;setPage:(p:string)=>void}){
  const[time,setTime]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(t);},[]);
  const pageLabel:{[k:string]:string}={dashboard:"Overview",jarvis:"Jarvis — AI Operating Layer",finance:"Finance",
    ops:"Operations",sales:"Sales",hr:"Team & Culture",marketing:"Marketing",
    ceo:"CEO Growth",content:"Content Studio",portal:"Client Portal"};
  return(
    <div style={{height:54,background:C.surface,borderBottom:`1px solid ${C.border}`,
      display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"0 24px",position:"sticky",top:0,zIndex:50,gap:20}}>
      <div>
        <div style={{fontSize:8,color:C.textDim,letterSpacing:"0.3em",textTransform:"uppercase" as const}}>ENDURE OS</div>
        <div style={{fontSize:14,color:C.text,fontFamily:"'Playfair Display',Georgia,serif"}}>{pageLabel[page]}</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:0,flex:1,justifyContent:"center",maxWidth:600}}>
        {[
          {l:"Cash",v:"$34,200",c:C.green},{l:"GP MTD",v:"47.2%",c:C.green},
          {l:"Pipeline",v:"$96,900",c:C.gold},{l:"Next Pay",v:"Thu $5,662",c:C.amber},
        ].map((k,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center"}}>
            <div style={{padding:"0 16px",textAlign:"center" as const}}>
              <div style={{fontSize:8,color:C.textDim,letterSpacing:"0.2em",textTransform:"uppercase" as const,marginBottom:2}}>{k.l}</div>
              <div style={{fontSize:12,color:k.c,fontFamily:"'DM Mono',monospace"}}>{k.v}</div>
            </div>
            {i<3&&<div style={{width:1,height:24,background:C.border}}/>}
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <div style={{fontSize:11,color:C.textMid,fontFamily:"'DM Mono',monospace"}}>
          {time.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"})} AWST
        </div>
        <div style={{width:8,height:8,borderRadius:"50%",background:C.green,
          boxShadow:`0 0 8px ${C.green}`,cursor:"pointer"}} title="Jarvis online"
          onClick={()=>setPage("jarvis")}/>
        <div style={{width:32,height:32,borderRadius:"50%",
          background:`radial-gradient(circle,${C.goldDim},${C.goldFaint})`,
          border:`1px solid ${C.goldDim}`,display:"flex",alignItems:"center",
          justifyContent:"center",fontSize:11,color:C.gold,cursor:"pointer",
          fontFamily:"'DM Mono',monospace"}}>L</div>
      </div>
    </div>
  );
}

function Dashboard({setPage}:{setPage:(p:string)=>void}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:`linear-gradient(135deg,${C.red}14,transparent)`,
        border:`1px solid ${C.red}33`,borderRadius:10,padding:"12px 18px",
        display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:C.red,boxShadow:`0 0 8px ${C.red}`,flexShrink:0}}/>
          <div>
            <span style={{fontSize:11,color:C.red,fontWeight:500}}>Quote 025 Chen — 13 days, $78k job. </span>
            <span style={{fontSize:11,color:C.textMid}}>Call today. Millboard pricing locked until Friday.</span>
          </div>
        </div>
        <button onClick={()=>setPage("jarvis")} style={{fontSize:9,padding:"5px 14px",
          border:`1px solid ${C.red}44`,borderRadius:6,background:"transparent",
          color:C.red,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.15em",
          textTransform:"uppercase" as const,whiteSpace:"nowrap" as const}}>Ask Jarvis</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
        {[
          {l:"Cash Today",v:"$34,200",sub:"↑ $6k above warn threshold",c:C.green,g:C.green},
          {l:"GP This Month",v:"47.2%",sub:"vs 45% target ↑",c:C.green,g:C.green},
          {l:"Revenue MTD",v:"$38,642",sub:"$6,446 to target",c:C.amber},
          {l:"Jobs Active",v:"3",sub:"021 · 022 · 023",c:C.blue},
          {l:"Alerts",v:"2",sub:"1 critical · 1 warning",c:C.red,g:C.red},
        ].map((k,i)=>(
          <Card key={i} glow={k.g} style={{padding:"16px 18px"}}>
            <Metric label={k.l} value={k.v} sub={k.sub} color={k.c} size={18}/>
          </Card>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:14}}>
        <Card>
          <Label>30-Day Cash Projection</Label>
          <div style={{height:160}}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflow} margin={{top:4,right:4,bottom:0,left:0}}>
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.gold} stopOpacity={0.3}/>
                    <stop offset="100%" stopColor={C.gold} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false}/>
                <XAxis dataKey="day" tick={{fill:C.textDim,fontSize:8}} axisLine={false} tickLine={false} interval={4}/>
                <YAxis hide/>
                <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,fontSize:10}} formatter={(v)=>fmt(v as number)}/>
                <ReferenceLine y={20000} stroke={C.amber} strokeDasharray="3 3" strokeOpacity={0.6}/>
                <ReferenceLine y={10000} stroke={C.red} strokeDasharray="3 3" strokeOpacity={0.6}/>
                <Area type="monotone" dataKey="balance" stroke={C.gold} strokeWidth={2} fill="url(#cg)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{display:"flex",gap:16,marginTop:6}}>
            <div style={{fontSize:9,color:C.amber}}>— $20k warn</div>
            <div style={{fontSize:9,color:C.red}}>— $10k critical</div>
            <div style={{fontSize:9,color:C.textDim,marginLeft:"auto"}}>Lowest: $19,800 · Day 14</div>
          </div>
        </Card>
        <Card style={{display:"flex",flexDirection:"column",gap:0,padding:0,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,
            display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:28,height:28,borderRadius:"50%",
                background:`radial-gradient(circle,${C.goldDim},${C.goldFaint})`,
                border:`1px solid ${C.goldDim}`,display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:12}}>✦</div>
              <div>
                <div style={{fontSize:11,color:C.text}}>Jarvis</div>
                <div style={{fontSize:8,color:C.green,display:"flex",alignItems:"center",gap:4}}>
                  <div style={{width:4,height:4,borderRadius:"50%",background:C.green,boxShadow:`0 0 4px ${C.green}`}}/>
                  Online · Full context loaded
                </div>
              </div>
            </div>
            <button onClick={()=>setPage("jarvis")} style={{fontSize:9,padding:"4px 12px",
              border:`1px solid ${C.goldDim}`,borderRadius:6,background:C.goldFaint,
              color:C.gold,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.1em",textTransform:"uppercase" as const}}>
              Open
            </button>
          </div>
          <div style={{padding:"14px 18px",flex:1,display:"flex",flexDirection:"column",gap:8}}>
            {[
              {l:"critical",t:"Quote 025 Chen — 13 days, $78k. Call script ready.",c:C.red},
              {l:"warning",t:"Job 023 Williams won — dates not set, cashflow not updated.",c:C.amber},
              {l:"warning",t:"Marius sentiment -1.4pts over 3 check-ins. Recommend check-in.",c:C.amber},
              {l:"info",t:"Ads off since Dec 1. Pipeline 40% below target.",c:C.gold},
              {l:"info",t:"BAS due in 27 days. Est. liability ~$14,200.",c:C.textMid},
            ].map((a,i)=>(
              <div key={i} style={{fontSize:10,color:a.c,display:"flex",gap:6,alignItems:"flex-start",
                padding:"6px 10px",borderRadius:6,background:a.c+"10",border:`1px solid ${a.c}22`}}>
                <span style={{flexShrink:0,marginTop:1}}>{a.l==="critical"?"⚠":a.l==="warning"?"●":"◆"}</span>
                <span style={{lineHeight:1.5,color:a.l==="critical"?a.c:C.text}}>{a.t}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:14}}>
        <Card>
          <Label>Active Jobs</Label>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 60px 80px 70px 80px 80px",padding:"4px 10px",gap:8}}>
              {["Job","Size","Labour Val","GP%","Status",""].map((h,i)=>(
                <div key={i} style={{fontSize:8,color:C.textDim,letterSpacing:"0.15em",textTransform:"uppercase" as const,textAlign:i>1?"right" as const:"left" as const}}>{h}</div>
              ))}
            </div>
            {jobs.map((j,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 60px 80px 70px 80px 80px",
                padding:"9px 12px",gap:8,background:C.surface2,borderRadius:9,alignItems:"center",
                border:`1px solid ${j.status==="won"?C.gold+"33":(j as any).daysSent>10?C.red+"22":C.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <TierDot tier={j.tier}/>
                  <div>
                    <div style={{fontSize:11,color:C.text}}>{j.name}</div>
                    <div style={{fontSize:9,color:C.textMid}}>{j.suburb}</div>
                  </div>
                </div>
                <div style={{fontSize:10,color:C.textMid,textAlign:"right" as const,fontFamily:"'DM Mono',monospace"}}>{j.sqm}m²</div>
                <div style={{fontSize:12,color:C.gold,textAlign:"right" as const,fontFamily:"'DM Mono',monospace"}}>${fmtK(j.lv)}</div>
                <div style={{textAlign:"right" as const}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4}}>
                    <TrafficLight value={j.qGP} good={45} warn={36} size={5}/>
                    <span style={{fontSize:11,color:tl(j.qGP,45,36),fontFamily:"'DM Mono',monospace"}}>{pct(j.qGP)}</span>
                  </div>
                </div>
                <div style={{textAlign:"right" as const}}><StatusPill status={j.status}/></div>
                <div style={{textAlign:"right" as const,fontSize:9,color:(j as any).daysSent>10?C.red:C.textMid,fontFamily:"'DM Mono',monospace"}}>
                  {(j as any).daysSent?`${(j as any).daysSent}d out`:j.status==="in_progress"?`Day ${(j as any).day}/${(j as any).days}`:""}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <Label>Growth Scenarios</Label>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {scenarios.map((s,i)=>(
              <div key={i} style={{padding:"12px 14px",borderRadius:10,
                background:i===2?C.greenDim:i===1?C.goldFaint:C.surface2,
                border:`1px solid ${s.color}33`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:12,color:s.color,marginBottom:2}}>{s.name}</div>
                    <div style={{fontSize:9,color:C.textMid}}>{s.desc}</div>
                  </div>
                  {i===2&&<Pill color={C.green}>Recommended</Pill>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div>
                    <div style={{fontSize:8,color:C.textDim,letterSpacing:"0.1em",textTransform:"uppercase" as const,marginBottom:2}}>Monthly Rev</div>
                    <div style={{fontSize:14,color:s.color,fontFamily:"'DM Mono',monospace"}}>${fmtK(s.monthly)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:8,color:C.textDim,letterSpacing:"0.1em",textTransform:"uppercase" as const,marginBottom:2}}>Net Profit</div>
                    <div style={{fontSize:14,color:s.color,fontFamily:"'DM Mono',monospace"}}>${fmtK(s.np)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function JarvisPage(){
  const responses:{[k:string]:string}={
    "cash":"Cash sits at $34,200 today — healthy. Projected low point is $19,800 around day 14, just under your $20k warning. That's the Smith materials COD and payroll timing overlapping. Worth chasing the Henderson completion claim this week to pad the buffer. Want me to send the reminder to Henderson now?",
    "margin":"Not a pricing problem — an efficiency problem. Your last 3 jobs over 35m² full subframe ran 1.2-1.8 days over estimate. That's $2,880-4,320 per job in lost margin. Baylee and Marius are consistent in the data — it's the western suburbs builds with access constraints. I'd add a half-day buffer to full subframe quotes in Claremont, Cottesloe, Swanbourne before touching your rates.",
    "hire":"The numbers support it but the pipeline doesn't yet. You're turning away roughly 1.8 jobs/month on capacity. Adding Baylee's equivalent costs $2,107/wk loaded — you need 9 extra billable days/month to break even on the hire. Ads back on for 6 weeks would tell you if the demand is real. I'd run the ads first, measure for a month, then decide.",
    "marius":"Marius has been giving shorter responses over the last 3 check-ins. Sentiment at 6.1 and trending down. He's mentioned scheduling visibility twice unprompted — wants to know the week plan earlier. Nothing alarming yet but worth a direct conversation from you, not through me. Want me to prep some talking points?",
  };
  const[msgs,setMsgs]=useState(jarvisHistory);
  const[input,setInput]=useState("");
  const[typing,setTyping]=useState(false);
  const bottomRef=useRef<HTMLDivElement>(null);
  const send=()=>{
    if(!input.trim())return;
    const m=input.trim();setInput("");
    setMsgs(p=>[...p,{role:"user",text:m}]);
    setTyping(true);
    setTimeout(()=>{
      const k=Object.keys(responses).find(k=>m.toLowerCase().includes(k));
      setMsgs(p=>[...p,{role:"assistant",text:responses[k!]||"On it. Pulling business context and checking the data..."}]);
      setTyping(false);
    },1400);
  };
  useEffect(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),[msgs,typing]);
  const formatMsg=(text:string)=>{
    return text.split("\n").map((line,i)=>{
      if(line.startsWith("⚙")) return <ToolCall key={i} text={line.replace("⚙ ","")}/>;
      return <div key={i} style={{marginBottom:line===""?6:2,lineHeight:1.6}}>{line}</div>;
    });
  };
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:14,height:"calc(100vh - 120px)"}}>
      <Card style={{display:"flex",flexDirection:"column",padding:0,overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,
          display:"flex",alignItems:"center",gap:12,
          background:`linear-gradient(135deg,${C.goldFaint},transparent)`}}>
          <div style={{width:40,height:40,borderRadius:"50%",
            background:`radial-gradient(circle,${C.gold}33,${C.goldFaint})`,
            border:`1px solid ${C.goldDim}`,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:18}}>✦</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,color:C.text,fontFamily:"'Playfair Display',Georgia,serif"}}>Jarvis</div>
            <div style={{fontSize:9,color:C.textMid}}>AI Operating Layer · Business mentor, ops manager, HR, sales, finance</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:C.green,boxShadow:`0 0 6px ${C.green}`}}/>
            <span style={{fontSize:9,color:C.green}}>Online</span>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{textAlign:"center" as const,padding:"8px 0"}}>
            <div style={{fontSize:9,color:C.textDim,letterSpacing:"0.2em",textTransform:"uppercase" as const}}>Wednesday 4 March 2026 · Morning Brief</div>
          </div>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:10}}>
              {m.role==="assistant"&&(
                <div style={{width:28,height:28,borderRadius:"50%",
                  background:`radial-gradient(circle,${C.goldDim},${C.goldFaint})`,
                  border:`1px solid ${C.goldDim}`,display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:11,flexShrink:0,marginTop:4}}>✦</div>
              )}
              <div style={{maxWidth:"78%",padding:"12px 16px",borderRadius:12,
                background:m.role==="user"?C.goldFaint:C.surface2,
                border:`1px solid ${m.role==="user"?C.goldDim:C.border}`,
                fontSize:12,color:m.role==="user"?C.gold:C.text,lineHeight:1.6,
                borderTopLeftRadius:m.role==="assistant"?4:12,
                borderTopRightRadius:m.role==="user"?4:12}}>
                {m.role==="assistant"?formatMsg(m.text):m.text}
              </div>
            </div>
          ))}
          {typing&&(
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{width:28,height:28,borderRadius:"50%",
                background:`radial-gradient(circle,${C.goldDim},${C.goldFaint})`,
                border:`1px solid ${C.goldDim}`,display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:11}}>✦</div>
              <div style={{display:"flex",gap:4,padding:"12px 16px",background:C.surface2,
                border:`1px solid ${C.border}`,borderRadius:12,borderTopLeftRadius:4}}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.gold,
                    animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:10,background:C.surface}}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&send()}
            placeholder="Tell Jarvis anything — he'll update the system..."
            style={{flex:1,background:C.surface2,border:`1px solid ${C.border2}`,
              borderRadius:10,padding:"11px 16px",color:C.text,fontSize:12,fontFamily:"inherit",outline:"none"}}/>
          <button onClick={send} style={{padding:"11px 20px",
            background:`linear-gradient(135deg,${C.gold}22,${C.goldFaint})`,
            border:`1px solid ${C.goldDim}`,borderRadius:10,color:C.gold,
            fontSize:10,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.15em",textTransform:"uppercase" as const}}>
            Send
          </button>
        </div>
      </Card>
      <div style={{display:"flex",flexDirection:"column",gap:12,overflowY:"auto"}}>
        <Card style={{padding:"14px 16px"}}>
          <Label>Business Snapshot</Label>
          {[{l:"Cash",v:"$34,200",c:C.green},{l:"GP MTD",v:"47.2%",c:C.green},
            {l:"Jobs Active",v:"3",c:C.blue},{l:"Pipeline",v:"$96,900",c:C.gold},
            {l:"Next Payroll",v:"Thu · $5,662",c:C.amber},{l:"Ads Active",v:"No",c:C.red},
          ].map((k,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:10,color:C.textMid}}>{k.l}</span>
              <span style={{fontSize:11,color:k.c,fontFamily:"'DM Mono',monospace"}}>{k.v}</span>
            </div>
          ))}
        </Card>
        <Card style={{padding:"14px 16px"}}>
          <Label>Quick Actions</Label>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {["What's my cash position?","Why are margins soft?","Should I hire?","How's Marius doing?","Run crew check-ins","Weekly summary"].map((q,i)=>(
              <button key={i} onClick={()=>setInput(q)}
                style={{textAlign:"left" as const,padding:"8px 10px",background:"transparent",
                  border:`1px solid ${C.border}`,borderRadius:7,color:C.textMid,
                  fontSize:10,cursor:"pointer",fontFamily:"inherit",lineHeight:1.4}}>
                {q}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Finance(){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
        {[
          {l:"Cash Today",v:"$34,200",c:C.green},{l:"GP Margin",v:"47.2%",c:C.green},
          {l:"GP / Labour Hr",v:"$48.20",c:C.green},{l:"Rev / Labour Hr",v:"$107.40",c:C.green},
          {l:"Proj NP / Hr",v:"$22.40",c:C.amber},
        ].map((k,i)=>(
          <Card key={i} glow={k.c} style={{padding:"15px 18px"}}>
            <Metric label={k.l} value={k.v} color={k.c} size={17}/>
          </Card>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:14}}>
        <Card>
          <Label>Daily Cashflow — 30 Days</Label>
          <div style={{height:200}}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflow} margin={{top:4,right:4,bottom:0,left:0}}>
                <defs>
                  <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.gold} stopOpacity={0.2}/>
                    <stop offset="100%" stopColor={C.gold} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false}/>
                <XAxis dataKey="day" tick={{fill:C.textDim,fontSize:8}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.textDim,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={(v:number)=>"$"+fmtK(v)} width={48}/>
                <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,fontSize:10}} formatter={(v)=>fmt(v as number)}/>
                <ReferenceLine y={20000} stroke={C.amber} strokeDasharray="3 3"/>
                <ReferenceLine y={10000} stroke={C.red} strokeDasharray="3 3"/>
                <Area type="monotone" dataKey="balance" stroke={C.gold} strokeWidth={2} fill="url(#fg)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <Label>6-Month GP</Label>
          <div style={{height:200}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} barSize={22} margin={{top:4,right:4,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false}/>
                <XAxis dataKey="m" tick={{fill:C.textDim,fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.textDim,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={(v:number)=>"$"+fmtK(v)} width={44}/>
                <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,fontSize:10}} formatter={(v)=>fmt(v as number)}/>
                <ReferenceLine y={33724} stroke={C.red} strokeDasharray="3 3"/>
                <Bar dataKey="gp" fill={C.goldFaint} stroke={C.gold} strokeWidth={1} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{fontSize:9,color:C.red,marginTop:6}}>— COPS breakeven $33,724</div>
        </Card>
      </div>
    </div>
  );
}

function HR(){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {crew.map((c,i)=>(
          <Card key={i} glow={tl(c.sentiment,7,5)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:40,height:40,borderRadius:"50%",
                  background:`radial-gradient(circle,${tl(c.sentiment,7,5)}33,${tl(c.sentiment,7,5)}11)`,
                  border:`1px solid ${tl(c.sentiment,7,5)}44`,display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:12,color:tl(c.sentiment,7,5),
                  fontFamily:"'DM Mono',monospace"}}>{c.initials}</div>
                <div>
                  <div style={{fontSize:12,color:C.text,marginBottom:3}}>{c.name}</div>
                  <Pill color={C.blue}>{c.type}</Pill>
                </div>
              </div>
              <div style={{textAlign:"right" as const}}>
                <div style={{fontSize:28,color:tl(c.sentiment,7,5),fontFamily:"'DM Mono',monospace",fontWeight:300,lineHeight:1}}>{c.sentiment}</div>
                <div style={{fontSize:8,color:C.textDim,letterSpacing:"0.1em",textTransform:"uppercase" as const}}>sentiment</div>
              </div>
            </div>
            <div style={{height:40,marginBottom:12}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={c.trend.map((v,i)=>({i,v}))}>
                  <Line type="monotone" dataKey="v" stroke={tl(c.sentiment,7,5)} strokeWidth={2} dot={false}/>
                  <ReferenceLine y={7} stroke={C.amber} strokeDasharray="2 2" strokeOpacity={0.4}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
              {[{l:"Util",v:`${c.util}%`,g:85,w:70,rv:c.util},
                {l:"Eff",v:`${c.eff}%`,g:95,w:85,rv:c.eff},
                {l:"Hrs/wk",v:`${c.hrs}h`,g:38,w:30,rv:c.hrs}].map((m,j)=>(
                <div key={j} style={{background:C.surface2,borderRadius:7,padding:"8px 10px",
                  border:`1px solid ${tlBg(m.rv,m.g,m.w)}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:3}}>
                    <TrafficLight value={m.rv} good={m.g} warn={m.w} size={5}/>
                    <span style={{fontSize:7,color:C.textDim,letterSpacing:"0.1em",textTransform:"uppercase" as const}}>{m.l}</span>
                  </div>
                  <div style={{fontSize:13,color:tl(m.rv,m.g,m.w),fontFamily:"'DM Mono',monospace"}}>{m.v}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:9,color:C.textMid,marginBottom:10}}>Last check-in: {c.checkin}</div>
            {i===1&&(
              <div style={{background:C.amberDim,border:`1px solid ${C.amber}33`,borderRadius:7,padding:"8px 10px",marginBottom:10,fontSize:9,color:C.amber,lineHeight:1.5}}>
                ● Trending down 3 weeks. Raised scheduling twice. Direct check-in recommended.
              </div>
            )}
            <button style={{width:"100%",padding:"8px",background:"transparent",
              border:`1px solid ${C.border2}`,borderRadius:7,color:C.textMid,
              fontSize:9,letterSpacing:"0.15em",textTransform:"uppercase" as const,cursor:"pointer",fontFamily:"inherit"}}>
              Trigger Check-in via WhatsApp
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Marketing(){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:`linear-gradient(135deg,${C.red}14,transparent)`,border:`1px solid ${C.red}33`,borderRadius:10,padding:"14px 20px"}}>
        <div style={{fontSize:10,color:C.red,marginBottom:4}}>⚠ Jarvis Correlation Alert</div>
        <div style={{fontSize:12,color:C.text,lineHeight:1.6}}>
          Ads off since Dec 1 — pipeline dropped 73% in 3 weeks. Restart now to recover February pipeline. Nov proved $1k/month = 12-14 leads at $71-83 CPL.
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {[{l:"Ad Spend MTD",v:"$0",c:C.red},{l:"Leads MTD",v:"3",c:C.red},
          {l:"Cost / Lead",v:"—",c:C.textMid},{l:"Cost / Job Won",v:"—",c:C.textMid}]
          .map((k,i)=><Card key={i} style={{padding:"14px 16px"}}><Metric label={k.l} value={k.v} color={k.c} size={18}/></Card>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card>
          <Label>Ad Spend vs Leads — 6 Weeks</Label>
          <div style={{height:180}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={adData} margin={{top:4,right:4,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false}/>
                <XAxis dataKey="w" tick={{fill:C.textDim,fontSize:8}} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="s" tick={{fill:C.textDim,fontSize:9}} axisLine={false} tickLine={false} width={36}/>
                <YAxis yAxisId="l" orientation="right" tick={{fill:C.textDim,fontSize:9}} axisLine={false} tickLine={false} width={24}/>
                <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,fontSize:10}}/>
                <Bar yAxisId="s" dataKey="g" fill={C.blueDim} stroke={C.blue} strokeWidth={1} radius={[3,3,0,0]} name="Google $"/>
                <Bar yAxisId="s" dataKey="m" fill={C.goldFaint} stroke={C.gold} strokeWidth={1} radius={[3,3,0,0]} name="Meta $"/>
                <Line yAxisId="l" type="monotone" dataKey="leads" stroke={C.green} strokeWidth={2} dot={false} name="Leads"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <Label>Instagram Performance</Label>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {igPosts.map((p,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"55px 1fr 65px 50px",
                padding:"9px 10px",background:C.surface2,borderRadius:8,gap:8,alignItems:"center",
                border:`1px solid ${p.best?C.gold+"44":C.border}`}}>
                <Pill color={p.type==="Reel"?C.blue:p.type==="Story"?C.amber:C.textMid}>{p.type}</Pill>
                <div style={{fontSize:10,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{p.topic}</div>
                <div style={{fontSize:11,color:p.best?C.gold:C.text,fontFamily:"'DM Mono',monospace",textAlign:"right" as const}}>{p.reach.toLocaleString()}</div>
                <div style={{fontSize:10,color:p.eng>3?C.green:C.textMid,fontFamily:"'DM Mono',monospace",textAlign:"right" as const}}>{p.eng}%</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function CEO(){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card accent={C.gold} style={{padding:"24px 28px"}}>
        <Label>Mission</Label>
        <div style={{fontSize:22,color:C.text,fontFamily:"'Playfair Display',Georgia,serif",lineHeight:1.5,fontStyle:"italic" as const,marginBottom:12}}>
          &ldquo;Build outdoor spaces that last 25 years and businesses that last longer.&rdquo;
        </div>
      </Card>
      <Card>
        <Label>Growth Scenarios — 12 Month Projection</Label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {scenarios.map((s,i)=>(
            <div key={i} style={{padding:"18px 20px",borderRadius:12,
              background:i===2?`linear-gradient(135deg,${C.green}14,${C.greenDim})`:i===1?C.goldFaint:C.surface2,
              border:`1px solid ${s.color}${i===2?"55":"33"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div>
                  <div style={{fontSize:14,color:s.color,fontFamily:"'Playfair Display',Georgia,serif",marginBottom:4}}>{s.name}</div>
                  <div style={{fontSize:9,color:C.textMid}}>{s.desc}</div>
                </div>
                {i===2&&<Pill color={C.green}>Best Path</Pill>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[{l:"Jobs/mo",v:s.jobs},{l:"Monthly Rev",v:`$${fmtK(s.monthly)}`},{l:"Annual NP",v:`$${fmtK(s.np*12)}`}].map((m,j)=>(
                  <div key={j}>
                    <div style={{fontSize:8,color:C.textDim,letterSpacing:"0.1em",textTransform:"uppercase" as const,marginBottom:3}}>{m.l}</div>
                    <div style={{fontSize:15,color:s.color,fontFamily:"'DM Mono',monospace"}}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <Label>Wins Board</Label>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {wins.map((w,i)=>(
            <div key={i} style={{padding:"9px 12px",background:C.surface2,borderRadius:8,border:`1px solid ${C.border}`,display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,marginTop:3,
                background:w.cat==="financial"?C.gold:w.cat==="sales"?C.blue:w.cat==="team"?C.green:C.purple,
                boxShadow:`0 0 5px ${w.cat==="financial"?C.gold:w.cat==="sales"?C.blue:w.cat==="team"?C.green:C.purple}`}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:C.text,lineHeight:1.4,marginBottom:2}}>{w.title}</div>
                <div style={{fontSize:9,color:C.textMid}}>{w.date}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Content(){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card>
        <Label>2-Week Content Calendar</Label>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {contentCalendar.map((c,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"65px 55px 1fr 80px",
              padding:"9px 12px",background:C.surface2,borderRadius:8,gap:10,alignItems:"center",
              border:`1px solid ${c.status==="approved"?C.green+"33":C.border}`}}>
              <div style={{fontSize:10,color:C.textMid,fontFamily:"'DM Mono',monospace"}}>{c.date}</div>
              <Pill color={c.format==="Reel"?C.blue:c.format==="Story"?C.amber:C.textMid}>{c.format}</Pill>
              <div style={{fontSize:10,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{c.concept}</div>
              <div style={{textAlign:"right" as const}}><Pill color={c.status==="approved"?C.green:C.textMid}>{c.status}</Pill></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Sales(){
  const[sqm,setSqm]=useState(38);
  const[install,setInstall]=useState("fullSubframe");
  const[tier,setTier]=useState("blue");
  const[product,setProduct]=useState("EvaLast Apex");
  const mats:{[k:string]:number}={"Merbau 140mm":88.2,"Spotted Gum":203.7,"Jarrah 135mm":155.3,"EvaLast Apex":245.5,"Trex Transcend":267.5,"Millboard":405};
  const eff=sqm<=5?sqm:sqm<=15?5.5:sqm<=20?6:sqm<=40?7.5:9;
  const days=Math.ceil(sqm/eff);
  const labour=days*2400,bc=days*1800;
  const mats_cost=(mats[product]||88.2)*sqm;
  const subframe=install==="fullSubframe"?110*sqm:0;
  const materialsTotal=(mats_cost+subframe)*1.1;
  const sub=labour+materialsTotal+1000;
  const tadj=tier==="black"?sub*0.2:0;
  const total=(sub+tadj)*1.1;
  const lv=labour+(tier==="black"?labour*0.2:0);
  const gp=lv-bc,gpPct=gp/lv*100,gpHr=gp/(days*8),rvHr=lv/(days*8),npHr=rvHr-85;
  return(
    <div style={{display:"grid",gridTemplateColumns:"360px 1fr",gap:16}}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Card>
          <Label>Quote Calculator</Label>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:8,color:C.textDim,letterSpacing:"0.2em",textTransform:"uppercase" as const,marginBottom:6}}>Area m²</div>
            <input type="number" value={sqm} onChange={e=>setSqm(Number(e.target.value))}
              style={{width:"100%",background:C.surface2,border:`1px solid ${C.goldDim}`,borderRadius:10,padding:"16px",color:C.gold,fontSize:36,fontFamily:"'DM Mono',monospace",fontWeight:300,outline:"none",boxSizing:"border-box",textAlign:"center"}}/>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:8,color:C.textDim,letterSpacing:"0.2em",textTransform:"uppercase" as const,marginBottom:6}}>Product</div>
            <select value={product} onChange={e=>setProduct(e.target.value)}
              style={{width:"100%",background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}>
              {Object.keys(mats).map(p=><option key={p} style={{background:C.surface2}}>{p}</option>)}
            </select>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:8,color:C.textDim,letterSpacing:"0.2em",textTransform:"uppercase" as const,marginBottom:6}}>Install Type</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
              {[["fullSubframe","Full Sub"],["overConcrete","Over Conc"],["redeck","Re-deck"]].map(([v,l])=>(
                <button key={v} onClick={()=>setInstall(v)} style={{padding:"9px 4px",fontSize:9,border:`1px solid ${install===v?C.gold:C.border}`,borderRadius:7,background:install===v?C.goldFaint:"transparent",color:install===v?C.gold:C.textMid,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:8,color:C.textDim,letterSpacing:"0.2em",textTransform:"uppercase" as const,marginBottom:6}}>JW Tier</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
              {[["red","Red","#ef4444"],["black","Black","#94a3b8"],["blue","Blue",C.blue]].map(([v,l,c])=>(
                <button key={v} onClick={()=>setTier(v)} style={{padding:"9px 4px",fontSize:9,border:`1px solid ${tier===v?c:C.border}`,borderRadius:7,background:tier===v?c+"22":"transparent",color:tier===v?c:C.textMid,cursor:"pointer",fontFamily:"inherit"}}>JW {l}</button>
              ))}
            </div>
          </div>
        </Card>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Card>
            <Label color={C.blue}>Client Quote</Label>
            {[
              {l:`Labour (${days} days)`,v:labour,t:"labour"},
              {l:`${product} materials`,v:mats_cost*1.1,t:"materials"},
              install==="fullSubframe"?{l:"Subframe",v:subframe*1.1,t:"materials"}:null,
              {l:"Design & admin",v:1000,t:"labour"},
              tier==="black"?{l:"JW Black (+20%)",v:tadj,t:"adj"}:null,
            ].filter(Boolean).map((item,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:10,color:C.textMid}}>{item!.l}</span>
                  <Pill color={(item!.t==="labour")?C.green:(item!.t==="materials")?C.gold:C.amber}>{item!.t}</Pill>
                </div>
                <span style={{fontSize:11,color:C.text,fontFamily:"'DM Mono',monospace"}}>{fmt(item!.v)}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:12}}>
              <span style={{fontSize:12,color:C.text}}>Total inc GST</span>
              <span style={{fontSize:26,color:C.gold,fontFamily:"'DM Mono',monospace",fontWeight:300}}>{fmt(total)}</span>
            </div>
          </Card>
          <Card glow={tl(gpPct,45,36)}>
            <Label color={tl(gpPct,45,36)}>Backcost</Label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[{l:"GP Margin",v:pct(gpPct),rv:gpPct,g:45,w:36},
                {l:"GP / Hr",v:`$${gpHr.toFixed(0)}`,rv:gpHr,g:40,w:30},
                {l:"Rev / Hr",v:`$${rvHr.toFixed(0)}`,rv:rvHr,g:100,w:80},
                {l:"NP / Hr",v:`$${npHr.toFixed(0)}`,rv:npHr,g:30,w:10},
              ].map((m,i)=>(
                <div key={i} style={{background:C.surface2,borderRadius:9,padding:"12px 14px",border:`1px solid ${tlBg(m.rv,m.g,m.w)}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                    <TrafficLight value={m.rv} good={m.g} warn={m.w} size={5}/>
                    <span style={{fontSize:8,color:C.textDim,letterSpacing:"0.12em",textTransform:"uppercase" as const}}>{m.l}</span>
                  </div>
                  <div style={{fontSize:20,color:tl(m.rv,m.g,m.w),fontFamily:"'DM Mono',monospace",fontWeight:300}}>{m.v}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function EndureOS(){
  const[page,setPage]=useState("dashboard");
  const pages:{[k:string]:React.ReactNode}={
    dashboard:<Dashboard setPage={setPage}/>,
    jarvis:<JarvisPage/>,
    finance:<Finance/>,
    ops:<div style={{padding:20,color:C.textMid,fontSize:12}}>Ops / Kanban — coming soon</div>,
    sales:<Sales/>,
    hr:<HR/>,
    marketing:<Marketing/>,
    ceo:<CEO/>,
    content:<Content/>,
    portal:<div style={{padding:20,color:C.textMid,fontSize:12}}>Client Portal — coming soon</div>,
  };
  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"Georgia,'Times New Roman',serif",display:"flex"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Mono:wght@300;400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#1a1a24;border-radius:2px}
        ::-webkit-scrollbar-track{background:transparent}
        input,select,button,textarea{font-family:inherit}
        input::placeholder{color:#2a2a38}
        select option{background:#0c0c0f;color:#e8ddd0}
        @keyframes pulse{0%,100%{opacity:0.2;transform:scale(0.7)}50%{opacity:1;transform:scale(1)}}
      `}</style>
      {/* Sidebar */}
      <div style={{width:60,background:C.surface,borderRight:`1px solid ${C.border}`,
        display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0",
        position:"fixed",top:0,left:0,height:"100vh",zIndex:100,gap:2}}>
        <div onClick={()=>setPage("dashboard")} style={{width:36,height:36,borderRadius:10,
          background:`radial-gradient(circle,${C.gold}44,${C.goldFaint})`,
          border:`1px solid ${C.goldDim}`,display:"flex",alignItems:"center",
          justifyContent:"center",fontSize:16,marginBottom:16,cursor:"pointer",
          boxShadow:`0 0 20px ${C.goldFaint}`}}>⬡</div>
        {NAV.map(item=>(
          <button key={item.id} onClick={()=>setPage(item.id)} title={item.label}
            style={{width:44,height:44,borderRadius:10,border:"none",
              background:page===item.id?C.goldFaint:"transparent",
              color:page===item.id?C.gold:C.textDim,fontSize:14,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
              transition:"all 0.15s",position:"relative",flexShrink:0}}>
            {item.icon}
            {page===item.id&&(
              <div style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",
                width:2,height:18,background:C.gold,borderRadius:"2px 0 0 2px",
                boxShadow:`0 0 6px ${C.gold}`}}/>
            )}
          </button>
        ))}
      </div>
      {/* Main */}
      <div style={{marginLeft:60,flex:1,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <TopBar page={page} setPage={setPage}/>
        <div style={{flex:1,padding:"20px 24px",overflowY:"auto"}}>
          {pages[page]}
        </div>
      </div>
    </div>
  );
}
