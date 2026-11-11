
// ─── pages/depenses/TabDepenses.jsx ──────────────────────────────────────────
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Fuel, Wrench, Shield, FileText, Car, TrendingUp, TrendingDown,
  Minus, AlertTriangle, CheckCircle, Info, BarChart2, Download,
  FileSpreadsheet, RefreshCw, ChevronRight, Gauge, Receipt,
  ParkingCircle, Siren, Droplets, MapPin, CreditCard, Search,
} from "lucide-react";

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/api/v1`;
async function api(path) {
  const tok = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${tok}` } });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : json?.results ?? json?.data ?? json ?? [];
}

// ─── Palette sobre ────────────────────────────────────────────────────────────
const P = {
  green:       "#1B5E37",
  greenMid:    "#2D7A4F",
  greenLight:  "#EAF4EE",
  greenBorder: "#C3E0CC",
  red:         "#B91C1C",
  redLight:    "#FEF2F2",
  redBorder:   "#FECACA",
  orange:      "#C2410C",
  orangeLight: "#FFF7ED",
  orangeBorder:"#FED7AA",
  amber:       "#B45309",
  amberLight:  "#FFFBEB",
  blue:        "#1D4ED8",
  blueLight:   "#EFF6FF",
  teal:        "#0F766E",
  purple:      "#7C3AED",
  bg:          "#F7F8F7",
  white:       "#FFFFFF",
  border:      "#E4E9E6",
  text:        "#111827",
  textMid:     "#4B5563",
  textLight:   "#9CA3AF",
};

const MOIS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

// ─── Config types ─────────────────────────────────────────────────────────────
const TYPES = {
  CARBURANT:          { label:"Carburant",        Icon:Fuel,          color:P.amber,  bg:P.amberLight  },
  MAINTENANCE:        { label:"Maintenance",      Icon:Wrench,        color:P.orange, bg:P.orangeLight },
  REPARATION:         { label:"Réparation",       Icon:Wrench,        color:P.red,    bg:P.redLight    },
  ASSURANCE:          { label:"Assurance",        Icon:Shield,        color:P.blue,   bg:P.blueLight   },
  VIGNETTE:           { label:"Vignette",         Icon:FileText,      color:P.teal,   bg:"#F0FDFA"     },
  CONTROLE_TECHNIQUE: { label:"Contrôle tech.",   Icon:Search,        color:P.purple, bg:"#F5F3FF"     },
  CARTE_GRISE:        { label:"Carte grise",      Icon:CreditCard,    color:"#4338CA",bg:"#EEF2FF"     },
  LAVAGE:             { label:"Lavage",           Icon:Droplets,      color:"#0891B2",bg:"#ECFEFF"     },
  PEAGE:              { label:"Péage",            Icon:MapPin,        color:P.textMid,bg:P.bg          },
  PARKING:            { label:"Parking",          Icon:ParkingCircle, color:P.textMid,bg:P.bg          },
  AMENDE:             { label:"Amende",           Icon:Siren,         color:P.red,    bg:P.redLight    },
  AUTRE:              { label:"Autre",            Icon:Receipt,       color:P.textLight,bg:P.bg        },
};

const DOC_EXPENSE_TYPES = ["ASSURANCE","VIGNETTE","CONTROLE_TECHNIQUE","CARTE_GRISE","AUTRE"];
const DOC_TYPE_MAP = { insurance:"ASSURANCE", vignette:"VIGNETTE", inspection:"CONTROLE_TECHNIQUE", registration:"CARTE_GRISE", other:"AUTRE" };
const VEH_CAT = { BUS:{label:"Bus",Icon:Car,color:P.blue}, TOURISME:{label:"Tourisme",Icon:Car,color:P.green}, UTILITAIRE:{label:"Utilitaire",Icon:Car,color:P.amber} };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = n => Number(n||0).toLocaleString("fr-FR") + " FCFA";
const fmtK = n => { const v=Number(n||0); if(v>=1_000_000) return `${(v/1e6).toFixed(2)}M FCFA`; if(v>=1_000) return `${(v/1e3).toFixed(0)}k FCFA`; return fmt(v); };
const fmtP = p => `${(+p||0).toFixed(1)}%`;
const fmtD = d => d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const nowStr = () => new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});
const mKey = d => { const dt=new Date(d); if(isNaN(dt)) return ""; return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; };
const last12 = () => { const now=new Date(); return Array.from({length:12},(_,i)=>{ const d=new Date(now.getFullYear(),now.getMonth()-(11-i),1); return { key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`, label:`${MOIS[d.getMonth()]} ${d.getFullYear().toString().slice(2)}` }; }); };
const evo = (c,p) => p>0?((c-p)/p)*100:c>0?100:0;

// ─── CSS minimal ─────────────────────────────────────────────────────────────
const CSS = `
  @keyframes dp-in { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
  @keyframes dp-spin { to{transform:rotate(360deg)} }
  .dp-root * { box-sizing:border-box; }
  .dp-root { font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; color:${P.text}; }
  .dp-card { background:#fff; border-radius:10px; border:1px solid ${P.border}; animation:dp-in .2s ease both; }
  .dp-tab { padding:7px 14px; border-radius:7px; border:none; cursor:pointer; font-family:inherit; font-size:12px; font-weight:600; transition:all .13s; display:flex; align-items:center; gap:6px; white-space:nowrap; }
  .dp-tab.on  { background:#fff; color:${P.green}; box-shadow:0 1px 4px rgba(0,0,0,.1); }
  .dp-tab:not(.on) { background:transparent; color:${P.textMid}; }
  .dp-tab:not(.on):hover { background:${P.greenLight}; color:${P.green}; }
  .dp-kpi { background:#fff; border-radius:10px; border:1px solid ${P.border}; padding:16px 18px; position:relative; overflow:hidden; transition:box-shadow .15s; }
  .dp-kpi::after { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:var(--kc,${P.green}); border-radius:10px 10px 0 0; }
  .dp-kpi:hover { box-shadow:0 4px 16px rgba(0,0,0,.07); }
  .dp-btn { display:inline-flex; align-items:center; gap:5px; padding:6px 12px; border-radius:7px; border:1px solid; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .12s; }
  .dp-btn:hover { transform:translateY(-1px); box-shadow:0 2px 8px rgba(0,0,0,.1); }
  .dp-row { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid #F3F4F6; }
  .dp-row:last-child { border-bottom:none; }
  .dp-bar-track { height:4px; background:#F3F4F6; border-radius:99px; overflow:hidden; }
  .dp-bar-fill  { height:100%; border-radius:99px; transition:width .5s ease; }
  .dp-section-hd { font-size:10px; font-weight:700; color:${P.green}; text-transform:uppercase; letter-spacing:1.2px; display:flex; align-items:center; gap:8px; margin-bottom:16px; }
  .dp-section-hd::after { content:''; flex:1; height:1px; background:${P.border}; }
  .dp-alert { border-radius:9px; padding:12px 14px; border:1px solid; display:flex; gap:10px; align-items:flex-start; margin-bottom:6px; }
  select,input { font-family:inherit; }
`;

// ─── Mini composants ──────────────────────────────────────────────────────────
function Bar({ pct, color, h=4 }) {
  return (
    <div className="dp-bar-track" style={{height:h}}>
      <div className="dp-bar-fill" style={{width:`${Math.min(100,pct||0)}%`,background:color||P.green}}/>
    </div>
  );
}

function EvoChip({ curr, prev }) {
  if (!prev && !curr) return null;
  const p = evo(curr,prev);
  const col = p>5?P.red:p<-5?P.green:P.amber;
  const Icon = p>0?TrendingUp:p<0?TrendingDown:Minus;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:9,fontWeight:700,color:col,background:col+"18",padding:"2px 7px",borderRadius:99}}>
      <Icon size={9}/> {Math.abs(p).toFixed(0)}%
    </span>
  );
}

function Alert({ type="info", icon:Icon, title, body, action }) {
  const map = {
    danger:  {bg:P.redLight,   border:P.redBorder,    tc:P.red,    bc:"#991B1B"},
    warning: {bg:P.amberLight, border:P.orangeBorder, tc:P.amber,  bc:"#92400E"},
    success: {bg:P.greenLight, border:P.greenBorder,  tc:P.green,  bc:P.greenMid},
    info:    {bg:P.blueLight,  border:"#BFDBFE",      tc:P.blue,   bc:"#1E40AF"},
  };
  const s = map[type]||map.info;
  return (
    <div className="dp-alert" style={{background:s.bg,borderColor:s.border}}>
      <span style={{color:s.tc,flexShrink:0,marginTop:1}}><Icon size={15}/></span>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:700,color:s.tc,marginBottom:2}}>{title}</div>
        <div style={{fontSize:11,color:s.bc,lineHeight:1.6}}>{body}</div>
        {action && (
          <div style={{marginTop:6,fontSize:10,fontWeight:600,color:s.tc,display:"inline-flex",alignItems:"center",gap:3}}>
            <ChevronRight size={10}/>{action}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ msg="Aucune donnée" }) {
  return <div style={{textAlign:"center",color:P.textLight,padding:"28px 0",fontSize:12}}>{msg}</div>;
}

function Spinner() {
  return <div style={{width:22,height:22,border:`2px solid ${P.border}`,borderTopColor:P.green,borderRadius:"50%",animation:"dp-spin .7s linear infinite"}}/>;
}

function KPI({ label, val, sub, Icon, color, curr, prev }) {
  return (
    <div className="dp-kpi" style={{"--kc":color||P.green}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{fontSize:9,fontWeight:700,color:P.textLight,textTransform:"uppercase",letterSpacing:"1px",lineHeight:1.3}}>{label}</div>
        <span style={{color:color||P.green,opacity:.7}}><Icon size={15}/></span>
      </div>
      <div style={{fontSize:18,fontWeight:800,color:color||P.green,lineHeight:1.1}}>{val}</div>
      {sub && <div style={{fontSize:10,color:P.textLight,marginTop:3}}>{sub}</div>}
      {(curr!==undefined&&prev!==undefined) && (
        <div style={{marginTop:6}}><EvoChip curr={curr} prev={prev}/><span style={{fontSize:9,color:P.textLight,marginLeft:4}}>vs préc.</span></div>
      )}
    </div>
  );
}

// Graphique en barres SVG — épuré
function BarChart({ data=[], height=100, color }) {
  if (!data.length) return <Empty/>;
  const max = Math.max(...data.map(d=>d.value||0),1);
  const W=540, n=data.length, bW=Math.max(16,Math.min(38,Math.floor((W-n*6)/n)));
  const svgW=n*(bW+6);
  return (
    <div style={{overflowX:"auto"}}>
      <svg width={svgW} height={height+28} style={{display:"block",minWidth:"100%"}}>
        {[.25,.5,.75,1].map((f,i)=>(
          <line key={i} x1={0} y1={Math.round(height*(1-f))} x2={svgW} y2={Math.round(height*(1-f))}
            stroke={P.border} strokeWidth={1} strokeDasharray="3,3"/>
        ))}
        {data.map((d,i)=>{
          const v=d.value||0, bH=max>0?Math.max(v>0?2:0,Math.round((v/max)*height)):0;
          const x=i*(bW+6), col=color||P.green;
          const isLast = i===data.length-1;
          return (
            <g key={i}>
              <rect x={x} y={0} width={bW} height={height} rx={3} fill="#F9FAFB"/>
              {bH>0&&<rect x={x} y={height-bH} width={bW} height={bH} rx={3} fill={isLast?col:col+"88"}/>}
              <text x={x+bW/2} y={height+14} textAnchor="middle" fontSize={7} fill={P.textLight} fontWeight={600}>{(d.label||"").slice(0,5)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Donut minimaliste
function Donut({ segments=[], size=90 }) {
  const s = segments.filter(x=>x.value>0);
  if (!s.length) return <div style={{width:size,height:size,borderRadius:"50%",background:P.bg}}/>;
  const total = s.reduce((a,b)=>a+b.value,0);
  const r=size/2-8, cx=size/2, cy=size/2;
  let angle=-Math.PI/2;
  const arcs=s.map(sg=>{ const start=angle,sweep=(sg.value/total)*2*Math.PI; angle+=sweep; const x1=cx+r*Math.cos(start),y1=cy+r*Math.sin(start),x2=cx+r*Math.cos(angle),y2=cy+r*Math.sin(angle); return {...sg,d:`M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 ${sweep>Math.PI?1:0} 1 ${x2} ${y2}Z`}; });
  return (
    <svg width={size} height={size}>
      {arcs.map((a,i)=><path key={i} d={a.d} fill={a.color} opacity={.88}/>)}
      <circle cx={cx} cy={cy} r={r*.5} fill="#fff"/>
    </svg>
  );
}

// Ligne horizontale par véhicule
function VehLine({ rank, name, plate, total, maxTotal, color }) {
  const medals=["🥇","🥈","🥉"];
  const pct=maxTotal>0?(total/maxTotal)*100:0;
  return (
    <div className="dp-row">
      <span style={{fontSize:13,width:20,flexShrink:0}}>{medals[rank]||<span style={{fontSize:11,color:P.textLight}}>{rank+1}</span>}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:12,fontWeight:600,color:P.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}{plate&&<span style={{fontSize:10,color:P.textLight,marginLeft:5,fontFamily:"monospace"}}>{plate}</span>}</span>
          <span style={{fontSize:12,fontWeight:700,color:color||P.green,flexShrink:0,marginLeft:8}}>{fmtK(total)}</span>
        </div>
        <Bar pct={pct} color={rank===0?P.red:rank===1?P.amber:color} h={3}/>
      </div>
    </div>
  );
}

// ─── Export PDF ───────────────────────────────────────────────────────────────
function buildPDF(title, sub, kpis, headers, rows, totRow) {
  const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title}</title>
<style>@page{size:A4 landscape;margin:12mm 10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:9px;color:#111827}
.hd{display:flex;justify-content:space-between;border-bottom:2px solid #1B5E37;padding-bottom:8px;margin-bottom:12px}
.hd h1{font-size:13px;font-weight:800;color:#1B5E37}.hd p{font-size:8px;color:#6B7280;margin-top:2px}
.kpis{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.kpi{padding:7px 12px;border-radius:6px;background:#EAF4EE;min-width:110px}
.kn{font-size:12px;font-weight:800;color:#1B5E37}.kl{font-size:7px;color:#4B5563;font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-top:1px}
table{width:100%;border-collapse:collapse}
thead th{background:#1B5E37;color:#fff;padding:5px 7px;text-align:left;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}
tbody tr:nth-child(even){background:#F7F8F7}td{padding:4px 7px;border-bottom:1px solid #E4E9E6;font-size:8px}
tr.foot td{background:#EAF4EE;font-weight:700;color:#1B5E37;border-top:1.5px solid #C3E0CC}
</style></head><body>
<div class="hd"><div><h1>${title}</h1><p>${sub}</p></div><div style="text-align:right;font-size:8px;color:#6B7280"><b style="color:#1B5E37;font-size:11px">IUC Logbessou</b><br>DRIVEPARC · Service Transports</div></div>
<div class="kpis">${kpis.map(k=>`<div class="kpi"><div class="kn">${k.val}</div><div class="kl">${k.label}</div></div>`).join("")}</div>
<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>
${rows.map(r=>`<tr>${r.map((c,i)=>`<td style="text-align:${i>=headers.length-2?"right":"left"}">${c}</td>`).join("")}</tr>`).join("")}
${totRow?`<tr class="foot">${totRow.map((c,i)=>`<td style="text-align:${i>=headers.length-2?"right":"left"}">${c}</td>`).join("")}</tr>`:""}
</tbody></table>
<script>window.onload=()=>{window.print();}<\/script></body></html>`;
  const url=URL.createObjectURL(new Blob([html],{type:"text/html;charset=utf-8"}));
  let f=document.getElementById("__dp_pdf__");
  if(!f){f=document.createElement("iframe");f.id="__dp_pdf__";f.style.cssText="position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";document.body.appendChild(f);}
  f.src=url;f.onload=()=>{try{f.contentWindow.focus();f.contentWindow.print();}catch{window.open(url,"_blank");}setTimeout(()=>URL.revokeObjectURL(url),60000);};
}

async function buildExcel(sheet, headers, rows, file) {
  try {
    const XLSX=await import("https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs");
    const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
    ws["!cols"]=headers.map(()=>({wch:16}));
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,sheet.slice(0,31));
    XLSX.writeFile(wb,`${file}_${new Date().toISOString().slice(0,10)}.xlsx`);
  } catch(e){alert("Export Excel : "+e.message);}
}

function ExportBtns({ onPDF, onExcel }) {
  return (
    <div style={{display:"flex",gap:6}}>
      <button onClick={onPDF} className="dp-btn" style={{background:P.redLight,color:P.red,borderColor:P.redBorder}}>
        <Download size={11}/>PDF
      </button>
      <button onClick={onExcel} className="dp-btn" style={{background:P.greenLight,color:P.green,borderColor:P.greenBorder}}>
        <FileSpreadsheet size={11}/>Excel
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION TCO
// ══════════════════════════════════════════════════════════════════════════════
function SectionTCO({ expenses, vehicles }) {
  const months=last12();
  const now=new Date();
  const currKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const prevKey=`${now.getMonth()===0?now.getFullYear()-1:now.getFullYear()}-${String(now.getMonth()===0?12:now.getMonth()).padStart(2,"0")}`;

  const totalAll=expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const currAll=expenses.filter(e=>(e.expense_date||"").startsWith(currKey)).reduce((s,e)=>s+Number(e.amount||0),0);
  const prevAll=expenses.filter(e=>(e.expense_date||"").startsWith(prevKey)).reduce((s,e)=>s+Number(e.amount||0),0);
  const last3=months.slice(-3).map(m=>expenses.filter(e=>(e.expense_date||"").startsWith(m.key)).reduce((s,e)=>s+Number(e.amount||0),0));
  const avgMens=(last3.reduce((a,b)=>a+b,0)/3)||0;
  const byMonth=months.map(m=>({label:m.label,value:expenses.filter(e=>(e.expense_date||"").startsWith(m.key)).reduce((s,e)=>s+Number(e.amount||0),0)}));

  const tco=Object.entries(expenses.reduce((acc,e)=>{
    const id=e.vehicle,vi=e.vehicle_info;
    if(!acc[id])acc[id]={name:vi?`${vi.make||""} ${vi.model||""}`.trim():`V${id}`,plate:vi?.registration_number||"",carb:0,maint:0,rep:0,ass:0,vig:0,autres:0};
    const a=Number(e.amount||0),k=e.expense_type;
    if(k==="CARBURANT")acc[id].carb+=a; else if(k==="MAINTENANCE")acc[id].maint+=a; else if(k==="REPARATION")acc[id].rep+=a; else if(k==="ASSURANCE")acc[id].ass+=a; else if(k==="VIGNETTE"||k==="CARTE_GRISE"||k==="CONTROLE_TECHNIQUE")acc[id].vig+=a; else acc[id].autres+=a;
    return acc;
  },{})).map(([,v])=>({...v,total:v.carb+v.maint+v.rep+v.ass+v.vig+v.autres})).sort((a,b)=>b.total-a.total);
  const maxTco=tco[0]?.total||1;

  const typeBreakdown=Object.entries(TYPES).map(([k,cfg])=>({...cfg,key:k,val:expenses.filter(e=>e.expense_type===k).reduce((s,e)=>s+Number(e.amount||0),0)})).filter(t=>t.val>0).sort((a,b)=>b.val-a.val);

  const handlePDF=()=>buildPDF("TCO Global",`${nowStr()} · ${expenses.length} opérations`,
    [{val:fmtK(totalAll),label:"Total"},{val:fmtK(currAll),label:"Ce mois"},{val:fmtK(avgMens),label:"Moy. 3 mois"},{val:fmtK(vehicles.length?totalAll/vehicles.length:0),label:"TCO/veh."}],
    ["Véhicule","Immat.","Carburant","Maintenance","Réparation","Assurance","Autres","TOTAL"],
    tco.slice(0,30).map(v=>[v.name,v.plate,fmt(v.carb),fmt(v.maint),fmt(v.rep),fmt(v.ass),fmt(v.vig+v.autres),fmt(v.total)]),
    ["","","","","","","TOTAL PARC",fmt(totalAll)]);
  const handleXLS=()=>buildExcel("TCO",["Véhicule","Immat.","Carburant","Maintenance","Réparation","Assurance","Vignette/CT","Autres","TOTAL"],tco.map(v=>[v.name,v.plate,v.carb,v.maint,v.rep,v.ass,v.vig,v.autres,v.total]),"tco_global");

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div className="dp-section-hd" style={{margin:0,flex:1}}>TCO Global — toutes dépenses</div>
        <ExportBtns onPDF={handlePDF} onExcel={handleXLS}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <KPI label="Total période"  val={fmtK(totalAll)} sub={`${expenses.length} opérations`}  Icon={BarChart2}  color={P.green}  curr={currAll} prev={prevAll}/>
        <KPI label="Ce mois"        val={fmtK(currAll)}  sub={`vs ${fmtK(prevAll)} préc.`}       Icon={Receipt}   color={P.amber}/>
        <KPI label="Moy. mensuelle" val={fmtK(avgMens)}  sub="sur 3 mois"                        Icon={TrendingUp} color={P.blue}/>
        <KPI label="TCO / véhicule" val={fmtK(vehicles.length?totalAll/vehicles.length:0)} sub={`${vehicles.length} véhicules`} Icon={Car} color={P.textMid}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
        <div className="dp-card" style={{padding:"16px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:12,fontWeight:700,color:P.text}}>Évolution 12 mois</span>
            <EvoChip curr={currAll} prev={prevAll}/>
          </div>
          <BarChart data={byMonth} color={P.green}/>
        </div>
        <div className="dp-card" style={{padding:"16px 18px"}}>
          <div style={{fontSize:12,fontWeight:700,color:P.text,marginBottom:12}}>Par poste</div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
            <Donut segments={typeBreakdown.slice(0,6).map(t=>({value:t.val,color:t.color}))} size={80}/>
          </div>
          {typeBreakdown.slice(0,5).map((t,i)=>(
            <div key={i} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2}}>
                <span style={{color:P.textMid,display:"flex",alignItems:"center",gap:4}}><t.Icon size={10} color={t.color}/>{t.label}</span>
                <span style={{fontWeight:700,color:t.color}}>{totalAll>0?fmtP((t.val/totalAll)*100):"—"}</span>
              </div>
              <Bar pct={totalAll>0?(t.val/totalAll)*100:0} color={t.color}/>
            </div>
          ))}
        </div>
      </div>

      {tco.length>0&&(
        <div className="dp-card" style={{padding:"16px 20px"}}>
          <div style={{fontSize:12,fontWeight:700,color:P.text,marginBottom:14}}>Classement TCO par véhicule</div>
          {tco.slice(0,8).map((v,i)=><VehLine key={i} rank={i} name={v.name} plate={v.plate} total={v.total} maxTotal={maxTco} color={P.green}/>)}
        </div>
      )}

      {/* Conseils condensés */}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {avgMens>0&&currAll>avgMens*1.15&&<Alert type="warning" icon={TrendingUp} title={`Dépassement +${fmtP(((currAll-avgMens)/avgMens)*100)} vs moyenne`} body={`${fmtK(currAll)} ce mois · moyenne ${fmtK(avgMens)}`} action="Identifier les postes en hausse"/>}
        {avgMens>0&&currAll<avgMens*0.85&&<Alert type="success" icon={TrendingDown} title={`Économie de ${fmtP(((avgMens-currAll)/avgMens)*100)} ce mois`} body={`${fmtK(currAll)} · bien en dessous de la moyenne ${fmtK(avgMens)}`}/>}
        {vehicles.length>0&&totalAll>0&&<Alert type="info" icon={Info} title={`TCO moyen : ${fmtK(totalAll/vehicles.length)} / véhicule`} body={`Sur ${vehicles.length} véhicule${vehicles.length>1?"s":""}. Comparer les individus au-dessus de 2× la moyenne.`}/>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION ACQUISITIONS
// ══════════════════════════════════════════════════════════════════════════════
function SectionAcquisitions({ vehicles }) {
  const months=last12();
  const getD=v=>v.date_acquisition||v.purchase_date||v.created_at||null;
  const getP=v=>Number(v.purchase_price||v.acquisition_cost||v.valeur_achat||v.price||0);
  const now=new Date();
  const currKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const prevD=new Date(now.getFullYear(),now.getMonth()-1,1);
  const prevKey=`${prevD.getFullYear()}-${String(prevD.getMonth()+1).padStart(2,"0")}`;
  const totalV=vehicles.reduce((s,v)=>s+getP(v),0);
  const byMonth=months.map(m=>{const mv=vehicles.filter(v=>{const d=getD(v);return d&&mKey(new Date(d))===m.key;});return{label:m.label,value:mv.reduce((s,v)=>s+getP(v),0),count:mv.length};});
  const currM=byMonth.find(m=>m.key===currKey)||{value:0,count:0};
  const prevM=byMonth.find(m=>m.key===prevKey)||{value:0,count:0};
  const recent=vehicles.filter(v=>{const d=getD(v);if(!d)return false;const lim=new Date();lim.setMonth(lim.getMonth()-6);return new Date(d)>=lim;}).sort((a,b)=>new Date(getD(b)||0)-new Date(getD(a)||0)).slice(0,5);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="dp-section-hd">Acquisitions de véhicules</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <KPI label="Parc total"        val={vehicles.length}   sub="véhicules"        Icon={Car}        color={P.green}/>
        <KPI label="Valeur estimée"    val={fmtK(totalV)}      sub="parc complet"     Icon={BarChart2}  color={P.blue}/>
        
        <KPI label="Mois précédent"    val={prevM.count}       sub={fmtK(prevM.value)} Icon={Receipt}    color={P.textMid}/>
      </div>

      {Object.entries(VEH_CAT).length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {Object.entries(VEH_CAT).map(([k,cfg])=>{
            const vList=vehicles.filter(v=>v.category===k);
            const tot=vList.reduce((s,v)=>s+getP(v),0);
            return (
              <div key={k} className="dp-card" style={{padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <cfg.Icon size={16} color={cfg.color}/><span style={{fontSize:12,fontWeight:700,color:cfg.color}}>{cfg.label}</span>
                  <span style={{fontSize:10,color:P.textLight,marginLeft:"auto"}}>{vList.length} veh.</span>
                </div>
                <div style={{fontSize:16,fontWeight:800,color:cfg.color,marginBottom:6}}>{fmtK(tot)}</div>
                <Bar pct={totalV>0?(tot/totalV)*100:0} color={cfg.color}/>
              </div>
            );
          })}
        </div>
      )}

      <div className="dp-card" style={{padding:"16px 20px"}}>
        <div style={{fontSize:12,fontWeight:700,color:P.text,marginBottom:14}}>Acquisitions — 12 mois</div>
        <BarChart data={byMonth} color={P.green}/>
      </div>

      {recent.length>0&&(
        <div className="dp-card" style={{padding:"16px 20px"}}>
          <div style={{fontSize:12,fontWeight:700,color:P.text,marginBottom:12}}>Derniers véhicules acquis</div>
          {recent.map((v,i)=>(
            <div key={i} className="dp-row">
              <Car size={14} color={P.green}/>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:P.text}}>{v.make} {v.model} <span style={{fontSize:10,color:P.textLight,fontFamily:"monospace"}}>· {v.registration_number||"—"}</span></div>
                <div style={{fontSize:10,color:P.textLight}}>{fmtD(getD(v))} · {VEH_CAT[v.category]?.label||v.category||"—"}</div>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:P.green}}>{fmtK(getP(v))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION CARBURANT
// ══════════════════════════════════════════════════════════════════════════════
function SectionCarburant({ expenses, vehicles }) {
  const months=last12();
  const fuel=expenses.filter(e=>e.expense_type==="CARBURANT");
  const now=new Date();
  const currKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const prevKey=`${now.getMonth()===0?now.getFullYear()-1:now.getFullYear()}-${String(now.getMonth()===0?12:now.getMonth()).padStart(2,"0")}`;
  const currAmt=fuel.filter(e=>(e.expense_date||"").startsWith(currKey)).reduce((s,e)=>s+Number(e.amount||0),0);
  const prevAmt=fuel.filter(e=>(e.expense_date||"").startsWith(prevKey)).reduce((s,e)=>s+Number(e.amount||0),0);
  const totalAmt=fuel.reduce((s,e)=>s+Number(e.amount||0),0);
  const avgMens=(months.slice(-3).map(m=>fuel.filter(e=>(e.expense_date||"").startsWith(m.key)).reduce((s,e)=>s+Number(e.amount||0),0)).reduce((a,b)=>a+b,0)/3)||0;
  const byMonth=months.map(m=>({label:m.label,value:fuel.filter(e=>(e.expense_date||"").startsWith(m.key)).reduce((s,e)=>s+Number(e.amount||0),0)}));
  const byVeh=Object.entries(fuel.reduce((acc,e)=>{const id=e.vehicle,vi=e.vehicle_info;if(!acc[id])acc[id]={name:vi?`${vi.make||""} ${vi.model||""}`.trim():`V${id}`,plate:vi?.registration_number||"",total:0};acc[id].total+=Number(e.amount||0);return acc;},{})).map(([,v])=>v).sort((a,b)=>b.total-a.total);

  const handlePDF=()=>buildPDF("Carburant",`${nowStr()} · ${fuel.length} opérations`,
    [{val:fmtK(currAmt),label:"Ce mois"},{val:fmtK(prevAmt),label:"Mois préc."},{val:fmtK(avgMens),label:"Moy. 3m"},{val:fmtK(totalAmt),label:"Total"}],
    ["Date","Véhicule","Immat.","Montant"],
    fuel.slice(0,100).map(e=>[fmtD(e.expense_date),e.vehicle_info?`${e.vehicle_info.make} ${e.vehicle_info.model}`:"—",e.vehicle_info?.registration_number||"—",fmt(e.amount)]),
    ["","","TOTAL",fmt(totalAmt)]);
  const handleXLS=()=>buildExcel("Carburant",["Date","Véhicule","Immat.","Montant"],fuel.map(e=>[e.expense_date||"",e.vehicle_info?`${e.vehicle_info.make} ${e.vehicle_info.model}`:"—",e.vehicle_info?.registration_number||"—",Number(e.amount)]),"carburant");

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div className="dp-section-hd" style={{margin:0,flex:1}}>Carburant</div>
        <ExportBtns onPDF={handlePDF} onExcel={handleXLS}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <KPI label="Ce mois"       val={fmtK(currAmt)} sub={`${fuel.filter(e=>(e.expense_date||"").startsWith(currKey)).length} ops`} Icon={Fuel} color={P.amber} curr={currAmt} prev={prevAmt}/>
        <KPI label="Mois préc."    val={fmtK(prevAmt)} sub="référence"    Icon={Receipt}   color={P.textMid}/>
        <KPI label="Moy. 3 mois"   val={fmtK(avgMens)} sub="mensuelle"    Icon={BarChart2} color={P.blue}/>
        <KPI label="Total période" val={fmtK(totalAmt)} sub={`${fuel.length} ops`} Icon={TrendingUp} color={P.green}/>
      </div>
      <div className="dp-card" style={{padding:"16px 20px"}}>
        <div style={{fontSize:12,fontWeight:700,color:P.text,marginBottom:14}}>Évolution mensuelle</div>
        <BarChart data={byMonth} color={P.amber}/>
      </div>
      {byVeh.length>0&&(
        <div className="dp-card" style={{padding:"16px 20px"}}>
          <div style={{fontSize:12,fontWeight:700,color:P.text,marginBottom:14}}>Par véhicule</div>
          {byVeh.slice(0,8).map((v,i)=><VehLine key={i} rank={i} name={v.name} plate={v.plate} total={v.total} maxTotal={byVeh[0].total} color={P.amber}/>)}
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {avgMens>0&&currAmt>avgMens*1.2&&<Alert type="warning" icon={AlertTriangle} title={`+${fmtP(((currAmt-avgMens)/avgMens)*100)} vs moyenne`} body={`${fmtK(currAmt)} ce mois · moyenne ${fmtK(avgMens)}`} action="Analyser les trajets"/>}
        {avgMens>0&&currAmt<avgMens*0.8&&<Alert type="success" icon={CheckCircle} title="Consommation en baisse" body={`${fmtK(currAmt)} · économie de ${fmtP(((avgMens-currAmt)/avgMens)*100)} vs moyenne`}/>}
        {byVeh[0]&&<Alert type="info" icon={Fuel} title={`Véhicule le plus consommateur : ${byVeh[0].name}`} body={`${fmtK(byVeh[0].total)} sur la période`} action="Vérifier l'état mécanique"/>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION MAINTENANCE
// ══════════════════════════════════════════════════════════════════════════════
function SectionMaintenance({ expenses, maintenances }) {
  const months=last12();
  const maint=expenses.filter(e=>e.expense_type==="MAINTENANCE"||e.expense_type==="REPARATION");
  const now=new Date();
  const currKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const prevKey=`${now.getMonth()===0?now.getFullYear()-1:now.getFullYear()}-${String(now.getMonth()===0?12:now.getMonth()).padStart(2,"0")}`;
  const currAmt=maint.filter(e=>(e.expense_date||"").startsWith(currKey)).reduce((s,e)=>s+Number(e.amount||0),0);
  const prevAmt=maint.filter(e=>(e.expense_date||"").startsWith(prevKey)).reduce((s,e)=>s+Number(e.amount||0),0);
  const total=maint.reduce((s,e)=>s+Number(e.amount||0),0);
  const totalRep=maint.filter(e=>e.expense_type==="REPARATION").reduce((s,e)=>s+Number(e.amount||0),0);
  const totalMain=maint.filter(e=>e.expense_type==="MAINTENANCE").reduce((s,e)=>s+Number(e.amount||0),0);
  const byMonth=months.map(m=>({label:m.label,value:maint.filter(e=>(e.expense_date||"").startsWith(m.key)).reduce((s,e)=>s+Number(e.amount||0),0)}));
  const byVeh=Object.entries(maint.reduce((acc,e)=>{const id=e.vehicle,vi=e.vehicle_info;if(!acc[id])acc[id]={name:vi?`${vi.make||""} ${vi.model||""}`.trim():`V${id}`,plate:vi?.registration_number||"",m:0,r:0};if(e.expense_type==="REPARATION")acc[id].r+=Number(e.amount||0);else acc[id].m+=Number(e.amount||0);return acc;},{})).map(([,v])=>({...v,total:v.m+v.r})).sort((a,b)=>b.total-a.total);
  const repRatio=total>0?(totalRep/total)*100:0;
  const planif=(maintenances||[]).filter(m=>m.status==="PLANIFIE").length;
  const done=(maintenances||[]).filter(m=>m.status==="TERMINE").length;

  const handlePDF=()=>buildPDF("Maintenance & Réparations",`${nowStr()} · ${maint.length} opérations`,
    [{val:fmtK(currAmt),label:"Ce mois"},{val:fmtK(totalMain),label:"Maintenance"},{val:fmtK(totalRep),label:"Réparations"},{val:fmtK(total),label:"Total"}],
    ["Date","Type","Véhicule","Immat.","Montant"],
    maint.slice(0,100).map(e=>[fmtD(e.expense_date),e.expense_type==="REPARATION"?"Réparation":"Maintenance",e.vehicle_info?`${e.vehicle_info.make} ${e.vehicle_info.model}`:"—",e.vehicle_info?.registration_number||"—",fmt(e.amount)]),
    ["","","","TOTAL",fmt(total)]);
  const handleXLS=()=>buildExcel("Maintenance",["Date","Type","Véhicule","Immat.","Montant"],maint.map(e=>[e.expense_date||"",e.expense_type,e.vehicle_info?`${e.vehicle_info.make} ${e.vehicle_info.model}`:"—",e.vehicle_info?.registration_number||"—",Number(e.amount)]),"maintenance");

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div className="dp-section-hd" style={{margin:0,flex:1}}>Maintenance & Réparations</div>
        <ExportBtns onPDF={handlePDF} onExcel={handleXLS}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <KPI label="Ce mois"           val={fmtK(currAmt)}  sub={`vs ${fmtK(prevAmt)} préc.`} Icon={Wrench}    color={P.orange} curr={currAmt} prev={prevAmt}/>
        <KPI label="Maintenance préventive" val={fmtK(totalMain)} sub="planifiée"              Icon={CheckCircle} color={P.green}/>
        <KPI label="Réparations"       val={fmtK(totalRep)} sub={`${fmtP(repRatio)} du total`} Icon={AlertTriangle} color={P.red}/>
        <KPI label="Planif. / Terminées" val={`${planif}/${done}`} sub="maintenances"          Icon={Gauge}     color={P.blue}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
        <div className="dp-card" style={{padding:"16px 20px"}}>
          <div style={{fontSize:12,fontWeight:700,color:P.text,marginBottom:14}}>Évolution mensuelle</div>
          <BarChart data={byMonth} color={P.orange}/>
        </div>
        <div className="dp-card" style={{padding:"16px 18px"}}>
          <div style={{fontSize:12,fontWeight:700,color:P.text,marginBottom:12}}>Répartition</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[{label:"Maintenance",val:totalMain,color:P.orange},{label:"Réparation",val:totalRep,color:P.red}].map((r,i)=>(
              <div key={i}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                  <span style={{color:P.textMid,fontWeight:600}}>{r.label}</span>
                  <span style={{fontWeight:700,color:r.color}}>{total>0?fmtP((r.val/total)*100):"—"}</span>
                </div>
                <Bar pct={total>0?(r.val/total)*100:0} color={r.color} h={6}/>
                <div style={{fontSize:10,color:P.textLight,marginTop:2}}>{fmtK(r.val)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {byVeh.length>0&&(
        <div className="dp-card" style={{padding:"16px 20px"}}>
          <div style={{fontSize:12,fontWeight:700,color:P.text,marginBottom:14}}>Par véhicule</div>
          {byVeh.slice(0,8).map((v,i)=><VehLine key={i} rank={i} name={v.name} plate={v.plate} total={v.total} maxTotal={byVeh[0].total} color={P.orange}/>)}
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {repRatio>40&&<Alert type="danger" icon={AlertTriangle} title={`${fmtP(repRatio)} du budget = réparations urgentes`} body="Investir dans le préventif coûte 3× moins qu'une réparation d'urgence." action="Renforcer le plan préventif"/>}
        {planif>3&&<Alert type="warning" icon={AlertTriangle} title={`${planif} maintenances en attente`} body="Un backlog important augmente le risque de panne." action="Planifier les interventions"/>}
        {done>0&&<Alert type="success" icon={CheckCircle} title={`${done} maintenance${done>1?"s":""} terminée${done>1?"s":""}`} body="Bon taux d'exécution. Documenter les coûts réels."/>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION DOCUMENTS
// ══════════════════════════════════════════════════════════════════════════════
function SectionDocuments({ expenses, uploadedDocs }) {
  const months=last12();
  const now=new Date();
  const currKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const expDocs=expenses.filter(e=>DOC_EXPENSE_TYPES.includes(e.expense_type));
  const docsAsExp=(uploadedDocs||[]).filter(d=>d.montant&&Number(d.montant)>0).map(d=>({_doc:true,expense_type:DOC_TYPE_MAP[d.type]||"AUTRE",amount:Number(d.montant),expense_date:d.created_at?.split("T")[0]||null,vehicle:d.vehicle,vehicle_info:d.vehicle_info||null}));
  const all=[...expDocs,...docsAsExp];
  const total=all.reduce((s,e)=>s+Number(e.amount||0),0);
  const byType=DOC_EXPENSE_TYPES.map(k=>{const cfg=TYPES[k],arr=all.filter(e=>e.expense_type===k),val=arr.reduce((s,e)=>s+Number(e.amount||0),0),nDocs=(uploadedDocs||[]).filter(d=>(DOC_TYPE_MAP[d.type]||"AUTRE")===k).length;return{key:k,cfg,val,count:arr.length,nDocs};}).filter(t=>t.val>0||t.nDocs>0);

  const handlePDF=()=>buildPDF("Documents & Obligations",`${nowStr()} · ${all.length} entrées`,
    [{val:fmt(byType.find(t=>t.key==="ASSURANCE")?.val||0),label:"Assurance"},{val:fmt(byType.find(t=>t.key==="VIGNETTE")?.val||0),label:"Vignette"},{val:fmtK(total),label:"Total"}],
    ["Date","Type","Véhicule","Montant","Source"],
    all.slice(0,100).map(e=>[fmtD(e.expense_date),TYPES[e.expense_type]?.label||e.expense_type,e.vehicle_info?`${e.vehicle_info.make} ${e.vehicle_info.model}`:"—",fmt(e.amount),e._doc?"Document":"Saisie"]),
    ["","","TOTAL",fmt(total),""]);
  const handleXLS=()=>buildExcel("Documents",["Date","Type","Véhicule","Montant","Source"],all.map(e=>[e.expense_date||"",TYPES[e.expense_type]?.label||e.expense_type,e.vehicle_info?`${e.vehicle_info.make} ${e.vehicle_info.model}`:"—",Number(e.amount),e._doc?"Document":"Saisie"]),"documents");

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div className="dp-section-hd" style={{margin:0,flex:1}}>Documents & Obligations réglementaires</div>
        <ExportBtns onPDF={handlePDF} onExcel={handleXLS}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <KPI label="Total documents"  val={fmtK(total)}                  sub={`${all.length} entrées`}     Icon={FileText}    color={P.green}/>
        <KPI label="Ce mois"          val={fmtK(all.filter(e=>(e.expense_date||"").startsWith(currKey)).reduce((s,e)=>s+Number(e.amount||0),0))} sub={`${all.filter(e=>(e.expense_date||"").startsWith(currKey)).length} ops`} Icon={Receipt} color={P.blue}/>
        <KPI label="Docs téléversés"  val={(uploadedDocs||[]).length}    sub="tous types"                   Icon={FileSpreadsheet} color={P.purple}/>
        <KPI label="Types couverts"   val={`${byType.filter(t=>t.val>0||t.nDocs>0).length}/${DOC_EXPENSE_TYPES.length}`} sub="catégories" Icon={CheckCircle} color={P.teal}/>
      </div>

      <div className="dp-card" style={{padding:"16px 20px"}}>
        {byType.length===0?<Empty msg="Aucun document enregistré"/>:byType.map((t,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<byType.length-1?`1px solid ${P.border}`:"none"}}>
            <span style={{color:t.cfg.color,flexShrink:0}}><t.cfg.Icon size={15}/></span>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:600,color:P.text}}>{t.cfg.label}</span>
                <span style={{fontSize:12,fontWeight:700,color:t.cfg.color}}>{fmtK(t.val)}</span>
              </div>
              <Bar pct={total>0?(t.val/total)*100:0} color={t.cfg.color} h={4}/>
              <div style={{display:"flex",gap:8,marginTop:3}}>
                <span style={{fontSize:9,color:P.textLight}}>{t.count} entrée{t.count>1?"s":""}</span>
                {t.nDocs>0&&<span style={{fontSize:9,color:P.purple,fontWeight:600}}>{t.nDocs} doc{t.nDocs>1?"s":""} téléversé{t.nDocs>1?"s":""}</span>}
                {total>0&&<span style={{fontSize:9,color:P.textLight,marginLeft:"auto"}}>{fmtP((t.val/total)*100)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {byType.find(t=>t.key==="ASSURANCE")?.val===0&&byType.find(t=>t.key==="ASSURANCE")?.nDocs===0&&<Alert type="danger" icon={Shield} title="Aucune assurance enregistrée" body="Obligatoire. Saisissez les polices dans Dépenses ou téléversez-les dans Documents." action="Ajouter les assurances"/>}
        {byType.find(t=>t.key==="VIGNETTE")?.val===0&&<Alert type="warning" icon={FileText} title="Aucune vignette enregistrée" body="La vignette automobile est obligatoire au Cameroun." action="Enregistrer les vignettes"/>}
        {total>0&&<Alert type="info" icon={Info} title={`Budget documents : ${fmtK(total)} total`} body="Dépenses annuelles récurrentes — à budgétiser par avance." action="Créer un budget annuel"/>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION AUTRES
// ══════════════════════════════════════════════════════════════════════════════
function SectionAutres({ expenses }) {
  const AUTRES=["LAVAGE","PEAGE","PARKING","AMENDE","AUTRE"];
  const autres=expenses.filter(e=>AUTRES.includes(e.expense_type));
  const months=last12();
  const now=new Date();
  const currKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const prevKey=`${now.getMonth()===0?now.getFullYear()-1:now.getFullYear()}-${String(now.getMonth()===0?12:now.getMonth()).padStart(2,"0")}`;
  const currAmt=autres.filter(e=>(e.expense_date||"").startsWith(currKey)).reduce((s,e)=>s+Number(e.amount||0),0);
  const prevAmt=autres.filter(e=>(e.expense_date||"").startsWith(prevKey)).reduce((s,e)=>s+Number(e.amount||0),0);
  const total=autres.reduce((s,e)=>s+Number(e.amount||0),0);
  const amendes=expenses.filter(e=>e.expense_type==="AMENDE").reduce((s,e)=>s+Number(e.amount||0),0);
  const byType=AUTRES.map(k=>{const cfg=TYPES[k],val=autres.filter(e=>e.expense_type===k).reduce((s,e)=>s+Number(e.amount||0),0);return{key:k,cfg,val};}).filter(t=>t.val>0).sort((a,b)=>b.val-a.val);
  const byMonth=months.map(m=>({label:m.label,value:autres.filter(e=>(e.expense_date||"").startsWith(m.key)).reduce((s,e)=>s+Number(e.amount||0),0)}));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="dp-section-hd">Autres dépenses</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        <KPI label="Ce mois"       val={fmtK(currAmt)} sub={`${autres.filter(e=>(e.expense_date||"").startsWith(currKey)).length} ops`} Icon={Receipt}    color={P.textMid} curr={currAmt} prev={prevAmt}/>
        <KPI label="Mois préc."    val={fmtK(prevAmt)} sub="référence"                                                                    Icon={Receipt}    color={P.textLight}/>
        <KPI label="Total période" val={fmtK(total)}   sub={`${autres.length} ops`}                                                       Icon={BarChart2}  color={P.green}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
        <div className="dp-card" style={{padding:"16px 20px"}}>
          <div style={{fontSize:12,fontWeight:700,color:P.text,marginBottom:14}}>Évolution mensuelle</div>
          <BarChart data={byMonth} color={P.blue}/>
        </div>
        <div className="dp-card" style={{padding:"16px 18px"}}>
          <div style={{fontSize:12,fontWeight:700,color:P.text,marginBottom:12}}>Par type</div>
          {byType.length===0?<Empty/>:byType.map((t,i)=>(
            <div key={i} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                <span style={{color:P.textMid,display:"flex",alignItems:"center",gap:4}}><t.cfg.Icon size={10} color={t.cfg.color}/>{t.cfg.label}</span>
                <span style={{fontWeight:700,color:t.cfg.color}}>{fmtK(t.val)}</span>
              </div>
              <Bar pct={total>0?(t.val/total)*100:0} color={t.cfg.color}/>
            </div>
          ))}
        </div>
      </div>
      {amendes>0&&<Alert type="danger" icon={Siren} title={`${fmt(amendes)} d'amendes`} body="Ces dépenses sont évitables. Sensibiliser les conducteurs au code de la route." action="Mettre en place une charte conducteur"/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export function TabDepenses() {
  const [expenses,     setExpenses]     = useState([]);
  const [vehicles,     setVehicles]     = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [activeTab,    setActiveTab]    = useState("tco");
  const [periode,      setPeriode]      = useState("all");

  const loadAll = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [exp,veh,maint,docs] = await Promise.all([
        api("/expenses/?page_size=2000"),
        api("/vehicles/?page_size=500"),
        api("/maintenance/maintenance/?page_size=500"),
        api("/documents/?page_size=2000").catch(()=>[]),
      ]);
      setExpenses(Array.isArray(exp)?exp:[]);
      setVehicles(Array.isArray(veh)?veh:[]);
      setMaintenances(Array.isArray(maint)?maint:[]);
      setUploadedDocs(Array.isArray(docs)?docs:docs?.results??[]);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ loadAll(); },[loadAll]);

  const filtered = useMemo(()=>{
    if(periode==="all") return expenses;
    const lim=new Date();
    if(periode==="mois")      lim.setMonth(lim.getMonth()-1);
    else if(periode==="trim") lim.setMonth(lim.getMonth()-3);
    else if(periode==="an")   lim.setFullYear(lim.getFullYear()-1);
    return expenses.filter(e=>new Date(e.expense_date)>=lim);
  },[expenses,periode]);

  const TABS=[
    {id:"tco",          Icon:BarChart2, label:"TCO Global"},
    {id:"acquisitions", Icon:Car,       label:"Acquisitions"},
    {id:"carburant",    Icon:Fuel,      label:"Carburant"},
    {id:"maintenance",  Icon:Wrench,    label:"Maintenance"},
    {id:"documents",    Icon:FileText,  label:"Documents"},
    {id:"autres",       Icon:Receipt,   label:"Autres"},
  ];

  const totalF=filtered.reduce((s,e)=>s+Number(e.amount||0),0);
  const docsTotal=[
    ...filtered.filter(e=>DOC_EXPENSE_TYPES.includes(e.expense_type)),
    ...(uploadedDocs||[]).filter(d=>d.montant&&Number(d.montant)>0).map(d=>({amount:Number(d.montant)})),
  ].reduce((s,e)=>s+Number(e.amount||0),0);

  const handleGlobalPDF=()=>buildPDF("Rapport Global des Dépenses",`${nowStr()} · ${filtered.length} opérations · ${vehicles.length} véhicules`,
    [{val:fmtK(totalF),label:"Total"},{val:vehicles.length,label:"Véhicules"},{val:filtered.length,label:"Opérations"}],
    ["Date","Catégorie","Véhicule","Immat.","Montant"],
    filtered.slice(0,100).map(e=>[fmtD(e.expense_date),TYPES[e.expense_type]?.label||e.expense_type,e.vehicle_info?`${e.vehicle_info.make} ${e.vehicle_info.model}`:"—",e.vehicle_info?.registration_number||"—",fmt(e.amount)]),
    ["","","","TOTAL",fmt(totalF)]);
  const handleGlobalXLS=()=>buildExcel("Toutes dépenses",["Date","Catégorie","Véhicule","Immat.","Montant"],filtered.map(e=>[e.expense_date||"",TYPES[e.expense_type]?.label||e.expense_type,e.vehicle_info?`${e.vehicle_info.make} ${e.vehicle_info.model}`:"—",e.vehicle_info?.registration_number||"—",Number(e.amount)]),"depenses_global");

  if(loading) return (
    <div className="dp-root" style={{padding:16}}>
      <style>{CSS}</style>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,gap:12,color:P.textLight}}>
        <Spinner/><span style={{fontSize:13}}>Chargement…</span>
      </div>
    </div>
  );

  if(error) return (
    <div className="dp-root" style={{padding:16}}>
      <style>{CSS}</style>
      <Alert type="danger" icon={AlertTriangle} title="Erreur de chargement" body={error} action="Réessayer"/>
      <button onClick={loadAll} style={{marginTop:8,padding:"7px 16px",background:P.red,color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer"}}>Réessayer</button>
    </div>
  );

  return (
    <div className="dp-root" style={{display:"flex",flexDirection:"column",gap:16}}>
      <style>{CSS}</style>

      {/* EN-TÊTE */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontSize:18,fontWeight:800,color:P.text,margin:0}}>Dépenses</h2>
          <p style={{fontSize:11,color:P.textLight,margin:"3px 0 0"}}>{filtered.length} opérations · {vehicles.length} véhicules</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {/* Filtre période */}
          <div style={{display:"flex",gap:2,background:P.bg,padding:3,borderRadius:8,border:`1px solid ${P.border}`}}>
            {[["all","Tout"],["mois","Mois"],["trim","Trimestre"],["an","Année"]].map(([v,l])=>(
              <button key={v} onClick={()=>setPeriode(v)}
                style={{padding:"5px 10px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",border:"none",background:periode===v?"#fff":"transparent",color:periode===v?P.green:P.textMid,boxShadow:periode===v?"0 1px 3px rgba(0,0,0,.08)":"none",transition:"all .12s"}}>
                {l}
              </button>
            ))}
          </div>
          <ExportBtns onPDF={handleGlobalPDF} onExcel={handleGlobalXLS}/>
          <button onClick={loadAll} className="dp-btn" style={{background:P.greenLight,color:P.green,borderColor:P.greenBorder}}>
            <RefreshCw size={11}/>Actualiser
          </button>
        </div>
      </div>

      {/* ONGLETS */}
      <div style={{display:"flex",gap:3,background:P.bg,padding:4,borderRadius:9,border:`1px solid ${P.border}`,flexWrap:"wrap"}}>
        {TABS.map(t=>(
          <button key={t.id} className={`dp-tab${activeTab===t.id?" on":""}`} onClick={()=>setActiveTab(t.id)}>
            <t.Icon size={12}/>{t.label}
          </button>
        ))}
      </div>

      {/* KPIs GLOBAUX */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
        {[
          {label:"Total dépenses", val:fmtK(totalF),                                                                                                           Icon:BarChart2,  color:P.green  },
          {label:"Carburant",      val:fmtK(filtered.filter(e=>e.expense_type==="CARBURANT").reduce((s,e)=>s+Number(e.amount||0),0)),                           Icon:Fuel,       color:P.amber  },
          {label:"Maintenance",    val:fmtK(filtered.filter(e=>["MAINTENANCE","REPARATION"].includes(e.expense_type)).reduce((s,e)=>s+Number(e.amount||0),0)), Icon:Wrench,     color:P.orange },
          {label:"Documents",      val:fmtK(docsTotal),                                                                                                         Icon:FileText,   color:P.blue   },
          {label:"Véhicules parc", val:vehicles.length,                                                                                                          Icon:Car,        color:P.textMid},
        ].map((k,i)=>(
          <div key={i} className="dp-kpi" style={{"--kc":k.color}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <div style={{fontSize:9,fontWeight:700,color:P.textLight,textTransform:"uppercase",letterSpacing:"1px"}}>{k.label}</div>
              <k.Icon size={13} color={k.color} opacity={.6}/>
            </div>
            <div style={{fontSize:17,fontWeight:800,color:k.color}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* CONTENU */}
      {activeTab==="tco"          && <SectionTCO          expenses={filtered}  vehicles={vehicles}/>}
      {activeTab==="acquisitions" && <SectionAcquisitions vehicles={vehicles}/>}
      {activeTab==="carburant"    && <SectionCarburant    expenses={filtered}  vehicles={vehicles}/>}
      {activeTab==="maintenance"  && <SectionMaintenance  expenses={filtered}  maintenances={maintenances}/>}
      {activeTab==="documents"    && <SectionDocuments    expenses={filtered}  uploadedDocs={uploadedDocs}/>}
      {activeTab==="autres"       && <SectionAutres       expenses={filtered}/>}
    </div>
  );
}

export default TabDepenses;
