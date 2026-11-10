
// ─── src/rapports/TabRapports.jsx ────────────────────────────────────────────
// Module Rapports DRIVEPARC — Charte vert/rouge/orange · Lucide React
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { C, S } from "../../constants";
import {
  BarChart2, Car, DollarSign, Wrench, CalendarCheck,
  TrendingUp, TrendingDown, AlertCircle, AlertTriangle,
  CheckCircle2, Clock, XCircle, Printer, FileSpreadsheet,
  RefreshCw, ChevronRight, Activity, Target, Users,
  MapPin, Gauge, FileText, BarChart, PieChart,
  ArrowUpRight, ArrowDownRight, Inbox,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE — vert / rouge / orange uniquement
// ─────────────────────────────────────────────────────────────────────────────
const G = {
  green:       "#1B5E37",
  greenMid:    "#2D7A4F",
  greenLight:  "#EAF4EE",
  greenBorder: "#BBF7D0",
  red:         "#BE123C",
  redLight:    "#FFF1F2",
  redBorder:   "#FECDD3",
  amber:       "#D97706",
  amberLight:  "#FFFBEB",
  amberBorder: "#FDE68A",
  white:       "#FFFFFF",
  bg:          "#F8FAFB",
  border:      "#E5E7EB",
  text:        "#111827",
  textMid:     "#374151",
  textLight:   "#6B7280",
  textXLight:  "#9CA3AF",
};

// Palette graphiques — vert / orange / rouge déclinés
const PAL = [
  "#1B5E37","#D97706","#BE123C","#2D7A4F",
  "#F59E0B","#E11D48","#16A34A","#EA580C",
  "#15803D","#DC2626","#92400E","#166534",
];

const STATUS_COLORS = {
  DISPONIBLE:     { label:"Disponible",     color:G.green, bg:G.greenLight },
  EN_SERVICE:     { label:"En service",     color:G.amber, bg:G.amberLight },
  EN_MAINTENANCE: { label:"En maintenance", color:G.red,   bg:G.redLight   },
  HORS_SERVICE:   { label:"Hors service",   color:G.textLight, bg:G.bg     },
};

const EXPENSE_COLORS = {
  CARBURANT:"#D97706", MAINTENANCE:"#BE123C", ASSURANCE:"#1B5E37",
  VIGNETTE:"#D97706",  CONTROLE_TECH:"#2D7A4F", PIECES:"#EA580C",
  LAVAGE:"#16A34A",    PEAGE:"#F59E0B",          PARKING:"#6B7280",
  AMENDE:"#BE123C",    CARROSSERIE:"#DC2626",    AUTRE:"#9CA3AF",
};
const EXPENSE_LABELS = {
  CARBURANT:"Carburant", MAINTENANCE:"Maintenance", ASSURANCE:"Assurance",
  VIGNETTE:"Vignette",   CONTROLE_TECH:"Ctrl. Tech", PIECES:"Pièces",
  LAVAGE:"Lavage",       PEAGE:"Péage",              PARKING:"Parking",
  AMENDE:"Amende",       CARROSSERIE:"Carrosserie",  AUTRE:"Autre",
};

const fmt    = n => Number(n||0).toLocaleString("fr-FR");
const fmtM   = n => `${fmt(Math.round(n||0))} FCFA`;
const fmtPct = n => `${(+n||0).toFixed(1)}%`;
const fmtSh  = d => d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "—";

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes rpt-spin    { to { transform:rotate(360deg); } }
  @keyframes rpt-fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes rpt-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes rpt-bar     { from{width:0} to{width:var(--w)} }

  .rpt-card {
    background:#fff; border-radius:11px;
    border:1.5px solid ${G.border};
    animation:rpt-fadeUp .2s ease both;
  }
  .rpt-kpi {
    background:#fff; border-radius:10px; padding:14px 16px;
    border:1.5px solid ${G.border};
    transition:box-shadow .18s;
  }
  .rpt-kpi:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); }

  .rpt-tab {
    padding:8px 16px; border-radius:8px; border:none;
    cursor:pointer; font-family:inherit; font-size:12px;
    font-weight:700; transition:all .15s;
    display:flex; align-items:center; gap:6px;
  }
  .rpt-tab.on  { background:${G.green}; color:#fff; }
  .rpt-tab.off { background:#fff; color:${G.textLight}; border:1.5px solid ${G.border}; }
  .rpt-tab.off:hover { background:${G.greenLight}; color:${G.green}; border-color:${G.green}; }

  .rpt-skel {
    border-radius:8px;
    background:linear-gradient(90deg,${G.bg} 25%,#EAECEB 50%,${G.bg} 75%);
    background-size:200% 100%;
    animation:rpt-shimmer 1.4s ease infinite;
  }
  .rpt-tr:hover td { background:${G.bg}!important; }
  .rpt-export-btn {
    display:flex; align-items:center; gap:5px;
    padding:7px 13px; border-radius:7px;
    font-size:11px; font-weight:700;
    cursor:pointer; font-family:inherit;
    border:1.5px solid; transition:all .15s;
  }
  .rpt-export-btn:hover { transform:translateY(-1px); box-shadow:0 3px 10px rgba(0,0,0,.1); }

  input[type=date] {
    color:${G.text}!important; background:#fff!important;
    color-scheme:light;
  }
  input[type=date]::-webkit-calendar-picker-indicator {
    opacity:.6; cursor:pointer;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANTS GRAPHIQUES — SVG
// ─────────────────────────────────────────────────────────────────────────────
const Spin = ({ size=18 }) => (
  <div style={{ width:size, height:size, border:`2px solid ${G.green}25`, borderTopColor:G.green, borderRadius:"50%", animation:"rpt-spin .7s linear infinite", flexShrink:0 }}/>
);

function SkelBlock({ h=80 }) {
  return <div className="rpt-skel" style={{ height:h, borderRadius:10, marginBottom:10 }}/>;
}

function LoadingGrid() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[1,2,3,4].map(i => <SkelBlock key={i} h={88}/>)}
      </div>
      <SkelBlock h={150}/>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <SkelBlock h={180}/><SkelBlock h={180}/>
      </div>
    </div>
  );
}

function NoData() {
  return (
    <div style={{ textAlign:"center", padding:"60px 20px", color:G.textLight }}>
      <Inbox size={40} color={G.border} style={{ margin:"0 auto 12px" }}/>
      <div style={{ fontSize:14, fontWeight:700, color:G.text, marginBottom:5 }}>Données non disponibles</div>
      <div style={{ fontSize:12 }}>Vérifiez que l'API backend est bien connectée.</div>
    </div>
  );
}

// Barre de progression simple
function BarRow({ label, value, total, color, rawLabel, count, Icon }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
      {Icon && <Icon size={13} color={color||G.green} style={{ flexShrink:0 }}/>}
      <div style={{ width:120, fontSize:11, fontWeight:600, color:G.textMid, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flexShrink:0 }}>
        {label}
      </div>
      <div style={{ flex:1, height:5, background:G.bg, borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color||G.green, borderRadius:99, transition:"width .7s" }}/>
      </div>
      <div style={{ minWidth:90, textAlign:"right", fontSize:11, fontWeight:700, color:color||G.green }}>{rawLabel||fmt(value)}</div>
      {count !== undefined && (
        <div style={{ minWidth:36, textAlign:"right", fontSize:10, color:G.textXLight }}>{count} op.</div>
      )}
    </div>
  );
}

// Bar chart SVG
function BarChartSvg({ data, height=110 }) {
  if (!data?.length) return <div style={{ textAlign:"center", padding:"20px", color:G.textLight, fontSize:12 }}>Aucune donnée</div>;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const bw = Math.max(22, Math.floor(480 / data.length) - 6);
  const W  = data.length * (bw + 8) + 8;
  return (
    <div style={{ overflowX:"auto" }}>
      <svg width={W} height={height+32} style={{ display:"block", minWidth:"100%" }}>
        {[.25,.5,.75,1].map((f,i) => {
          const y = Math.round(height - f * height);
          return <line key={i} x1={0} y1={y} x2={W} y2={y} stroke={G.border} strokeWidth={1} strokeDasharray="3,3"/>;
        })}
        {data.map((d, i) => {
          const barH = Math.max(3, Math.round((d.value/maxVal)*height));
          const x    = i*(bw+8)+4;
          const col  = d.color||PAL[i%PAL.length];
          const valStr = d.value>999999?`${(d.value/1000000).toFixed(1)}M`:d.value>999?`${Math.round(d.value/1000)}k`:Math.round(d.value).toString();
          return (
            <g key={i}>
              <rect x={x} y={0} width={bw} height={height} rx={3} fill={G.bg}/>
              <rect x={x} y={height-barH} width={bw} height={barH} rx={3} fill={col} opacity={.85}>
                <title>{d.label} : {d.rawLabel||fmt(d.value)}</title>
              </rect>
              {barH>14&&<text x={x+bw/2} y={height-barH+12} textAnchor="middle" fontSize={8} fontWeight={700} fill="#fff">{valStr}</text>}
              {barH<=14&&<text x={x+bw/2} y={height-barH-4} textAnchor="middle" fontSize={8} fontWeight={700} fill={col}>{valStr}</text>}
              <text x={x+bw/2} y={height+18} textAnchor="middle" fontSize={8} fill={G.textLight} fontWeight={500}>{(d.label||"").slice(0,8)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Line chart SVG
function LineChartSvg({ data, height=110, color=G.green }) {
  if (!data?.length) return <div style={{ textAlign:"center", padding:"20px", color:G.textLight, fontSize:12 }}>Aucune donnée</div>;
  const maxVal = Math.max(...data.map(d=>d.value),1);
  const W = Math.max(340, data.length*48);
  const pts = data.map((d,i) => ({
    x:(i/Math.max(data.length-1,1))*(W-40)+20,
    y:height-10-(d.value/maxVal)*(height-20), d
  }));
  const path = pts.map((p,i)=>`${i===0?"M":"L"}${p.x} ${p.y}`).join(" ");
  const area = `${path} L${pts[pts.length-1].x} ${height} L${pts[0].x} ${height} Z`;
  return (
    <div style={{ overflowX:"auto" }}>
      <svg width={W} height={height+26} style={{ display:"block" }}>
        {[.25,.5,.75,1].map((f,i)=>{
          const y=height-10-f*(height-20);
          return <line key={i} x1={20} y1={y} x2={W-20} y2={y} stroke={G.border} strokeWidth={1} strokeDasharray="3,3"/>;
        })}
        <defs>
          <linearGradient id={`lg${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".18"/>
            <stop offset="100%" stopColor={color} stopOpacity=".01"/>
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#lg${color.slice(1)})`}/>
        <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p,i)=>(
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill={color} stroke="#fff" strokeWidth={1.5}>
              <title>{p.d.label} : {p.d.rawLabel||fmt(p.d.value)}</title>
            </circle>
            <text x={p.x} y={height+20} textAnchor="middle" fontSize={8} fill={G.textXLight}>{(p.d.label||"").slice(0,5)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Donut chart SVG
function DonutSvg({ segments, size=100, label, sub }) {
  const nonEmpty = segments.filter(s=>s.value>0);
  if (!nonEmpty.length) return <div style={{ width:size, height:size, borderRadius:"50%", background:G.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:G.textLight }}>—</div>;
  const total = nonEmpty.reduce((s,x)=>s+x.value,0);
  const r=size/2-12, cx=size/2, cy=size/2;
  let angle=-Math.PI/2;
  const arcs=nonEmpty.map(seg=>{
    const start=angle; const sweep=(seg.value/total)*2*Math.PI; angle+=sweep;
    const x1=cx+r*Math.cos(start),y1=cy+r*Math.sin(start);
    const x2=cx+r*Math.cos(angle),y2=cy+r*Math.sin(angle);
    return {...seg,d:`M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 ${sweep>Math.PI?1:0} 1 ${x2} ${y2}Z`};
  });
  return (
    <svg width={size} height={size}>
      {arcs.map((a,i)=>(
        <path key={i} d={a.d} fill={a.color} opacity={.9}>
          <title>{a.label} : {a.rawLabel||fmt(a.value)}</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={r*.54} fill="#fff"/>
      {label&&<text x={cx} y={cy+4} textAnchor="middle" fontSize={10} fontWeight={800} fill={G.text}>{label}</text>}
      {sub&&<text x={cx} y={cy+15} textAnchor="middle" fontSize={8} fill={G.textLight}>{sub}</text>}
    </svg>
  );
}

// Score ring SVG
function ScoreRing({ score, size=128 }) {
  const R=size/2-10, circ=2*Math.PI*R;
  const offset=circ-(score/100)*circ;
  const color=score>=80?G.green:score>=60?G.amber:G.red;
  const label=score>=80?"Excellent":score>=60?"Correct":"Critique";
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke={G.bg} strokeWidth={11}/>
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke={color} strokeWidth={11}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:"stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)"}}/>
      <text x={size/2} y={size/2-2} textAnchor="middle" fontSize={20} fontWeight={900} fill={color}>{score}</text>
      <text x={size/2} y={size/2+14} textAnchor="middle" fontSize={9} fontWeight={700} fill={G.textLight}>{label}</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANTS UI
// ─────────────────────────────────────────────────────────────────────────────
function Section({ title, sub, children, action, Icon }) {
  return (
    <div className="rpt-card" style={{ padding:"16px 18px", marginBottom:0 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:sub?4:14 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:G.text, display:"flex", alignItems:"center", gap:7, marginBottom:sub?2:0 }}>
            {Icon && <Icon size={14} color={G.green}/>}
            {title}
          </div>
          {sub && <div style={{ fontSize:11, color:G.textLight, marginBottom:14 }}>{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ Icon, iconColor, label, value, sub, color, borderColor }) {
  const bc = borderColor || color || G.green;
  return (
    <div className="rpt-kpi" style={{ borderTop:`3px solid ${bc}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:9, fontWeight:700, color:G.textLight, textTransform:"uppercase", letterSpacing:"1px" }}>{label}</span>
        {Icon && <Icon size={16} color={iconColor||bc}/>}
      </div>
      <div style={{ fontSize:20, fontWeight:900, color:color||G.green, lineHeight:1, marginBottom:3 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:G.textXLight }}>{sub}</div>}
    </div>
  );
}

function ExportButtons({ onPdf, onExcel }) {
  return (
    <div style={{ display:"flex", gap:6 }}>
      <button onClick={onPdf} className="rpt-export-btn"
        style={{ background:G.redLight, color:G.red, borderColor:G.redBorder }}>
        <Printer size={13}/> PDF
      </button>
      <button onClick={onExcel} className="rpt-export-btn"
        style={{ background:G.greenLight, color:G.green, borderColor:G.greenBorder }}>
        <FileSpreadsheet size={13}/> Excel
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────────────────────────────────────
function buildPdfHtml(title, sections) {
  const now = new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title}</title>
  <style>
    @page{size:A4 portrait;margin:14mm 12mm}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:9.5px;color:#111827}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:10px;border-bottom:2px solid #1B5E37;margin-bottom:16px}
    .header h1{font-size:14px;font-weight:800;color:#1B5E37}
    .header .meta{font-size:9px;color:#6B7280;margin-top:3px}
    .header .brand{text-align:right;font-size:9px;color:#6B7280}
    .header .brand b{font-size:11px;color:#1B5E37;display:block}
    .section{margin-bottom:16px;break-inside:avoid}
    h2{font-size:11px;font-weight:800;color:#1B5E37;margin-bottom:7px;padding-bottom:4px;border-bottom:1px solid #E5E7EB}
    table{width:100%;border-collapse:collapse}
    th{background:#1B5E37;color:#fff;padding:5px 7px;text-align:left;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.8px}
    td{padding:5px 7px;border-bottom:1px solid #E5E7EB;font-size:9px}
    tr:nth-child(even) td{background:#F8FAFB}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
    .kpi{background:#F8FAFB;border-radius:6px;padding:8px 10px;border-left:3px solid #1B5E37}
    .kpi .n{font-size:14px;font-weight:800;color:#1B5E37}
    .kpi .l{font-size:7.5px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:.8px;margin-top:2px}
    .alert-d{background:#FFF1F2;color:#BE123C;border-left:3px solid #BE123C;padding:5px 8px;border-radius:4px;font-size:9px;font-weight:600;margin-bottom:5px}
    .footer{margin-top:14px;font-size:8px;color:#9CA3AF;text-align:center;border-top:1px solid #E5E7EB;padding-top:8px}
  </style></head><body>
  <div class="header">
    <div><h1>${title}</h1><div class="meta">Généré le ${now}</div></div>
    <div class="brand"><b>DRIVEPARC · IUC</b>Service des Transports — Logbessou</div>
  </div>
  ${sections.map(s=>`<div class="section"><h2>${s.title}</h2>${s.html}</div>`).join("")}
  <div class="footer">Système de Gestion du Parc Automobile DRIVEPARC · Institut Universitaire de la Côte · Confidentiel</div>
  <script>window.onload=function(){window.print()}<\/script>
  </body></html>`;
}

function printPdf(title, sections) {
  const html = buildPdfHtml(title, sections);
  const blob = new Blob([html], { type:"text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  let f = document.getElementById("__rpt_pdf__");
  if (!f) { f=document.createElement("iframe"); f.id="__rpt_pdf__"; f.style.cssText="position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;"; document.body.appendChild(f); }
  f.src=url;
  f.onload=()=>{ try{f.contentWindow.focus();f.contentWindow.print();}catch{window.open(url,"_blank");} setTimeout(()=>URL.revokeObjectURL(url),60000); };
}

async function exportExcel(sheets) {
  try {
    const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs");
    const wb = XLSX.utils.book_new();
    sheets.forEach(({name,rows})=>{ const ws=XLSX.utils.json_to_sheet(rows); XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31)); });
    XLSX.writeFile(wb,`rapport_driveparc_${new Date().toISOString().slice(0,10)}.xlsx`);
  } catch { alert("Utilisez l'export PDF (SheetJS indisponible)"); }
}

// ─────────────────────────────────────────────────────────────────────────────
// ONGLET : SYNTHÈSE EXÉCUTIVE
// ─────────────────────────────────────────────────────────────────────────────
function TabExecutive({ data, loading }) {
  if (loading) return <LoadingGrid/>;
  if (!data)   return <NoData/>;
  const { health_score=0, alerts=[], fleet={}, expenses={}, maintenance={}, reservations={} } = data;
  const scoreColor = health_score>=80?G.green:health_score>=60?G.amber:G.red;

  const handlePdf = () => printPdf("Rapport Exécutif — DRIVEPARC", [
    { title:"Score & KPIs", html:`<div class="kpis">
        <div class="kpi"><div class="n">${health_score}/100</div><div class="l">Score global</div></div>
        <div class="kpi"><div class="n">${fleet.total||0}</div><div class="l">Véhicules</div></div>
        <div class="kpi"><div class="n">${fmtM(expenses.total)}</div><div class="l">Dépenses totales</div></div>
        <div class="kpi"><div class="n">${reservations.total||0}</div><div class="l">Réservations</div></div>
      </div>
      ${alerts.map(a=>`<div class="alert-d">${a.msg}</div>`).join("")}`
    },
    { title:"Détails", html:`<table><thead><tr><th>Indicateur</th><th>Valeur</th></tr></thead><tbody>
        <tr><td>Véhicules disponibles</td><td>${fleet.disponibles||0}</td></tr>
        <tr><td>Hors service</td><td>${fleet.hors_service||0}</td></tr>
        <tr><td>Dépenses en attente</td><td>${fmtM(expenses.pending)}</td></tr>
        <tr><td>Maintenances en retard</td><td>${maintenance.overdue||0}</td></tr>
        <tr><td>Taux résolution pannes</td><td>${maintenance.breakdown_resolution_rate||0}%</td></tr>
        <tr><td>Taux approbation réservations</td><td>${reservations.approval_rate||0}%</td></tr>
      </tbody></table>` }
  ]);

  const handleExcel = () => exportExcel([{ name:"Synthèse", rows:[
    {Indicateur:"Score santé",Valeur:health_score},
    {Indicateur:"Véhicules total",Valeur:fleet.total||0},
    {Indicateur:"Disponibles",Valeur:fleet.disponibles||0},
    {Indicateur:"Hors service",Valeur:fleet.hors_service||0},
    {Indicateur:"Dépenses (FCFA)",Valeur:expenses.total||0},
    {Indicateur:"En attente (FCFA)",Valeur:expenses.pending||0},
    {Indicateur:"Maintenances en retard",Valeur:maintenance.overdue||0},
    {Indicateur:"Taux résolution",Valeur:maintenance.breakdown_resolution_rate||0},
    {Indicateur:"Réservations",Valeur:reservations.total||0},
    {Indicateur:"Taux approbation",Valeur:reservations.approval_rate||0},
  ]}]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* Score + alertes */}
      <div className="rpt-card" style={{ padding:"18px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:G.text, display:"flex", alignItems:"center", gap:7 }}>
              <Activity size={14} color={G.green}/> Score de santé du parc
            </div>
            <div style={{ fontSize:11, color:G.textLight, marginTop:2 }}>Évaluation globale multi-modules</div>
          </div>
          <ExportButtons onPdf={handlePdf} onExcel={handleExcel}/>
        </div>
        <div style={{ display:"flex", gap:24, alignItems:"center", flexWrap:"wrap" }}>
          <ScoreRing score={health_score} size={128}/>
          <div style={{ flex:1, minWidth:220 }}>
            {alerts.length===0 ? (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:G.greenLight, borderRadius:9, border:`1px solid ${G.greenBorder}` }}>
                <CheckCircle2 size={18} color={G.green}/>
                <div style={{ fontSize:13, fontWeight:700, color:G.green }}>Aucune alerte — parc en bonne santé</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {alerts.map((a,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 13px", borderRadius:8, background:a.level==="danger"?G.redLight:G.amberLight, border:`1px solid ${a.level==="danger"?G.redBorder:G.amberBorder}` }}>
                    {a.level==="danger"?<AlertCircle size={15} color={G.red}/>:<AlertTriangle size={15} color={G.amber}/>}
                    <div style={{ fontSize:12, fontWeight:600, color:a.level==="danger"?G.red:G.amber }}>{a.msg}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:10 }}>
        <KpiCard Icon={Car}         iconColor={G.green} label="Flotte totale"      value={fleet.total||0}          sub={`${fleet.disponibles||0} disponibles`}          color={G.green}/>
        <KpiCard Icon={DollarSign}  iconColor={G.amber} label="Dépenses totales"   value={fmtM(expenses.total)}    sub={`${expenses.count||0} opérations`}              color={G.amber}/>
        
        <KpiCard Icon={Wrench}      iconColor={maintenance.overdue>0?G.red:G.green} label="Maintenances" value={maintenance.total||0} sub={`${maintenance.overdue||0} en retard`} color={maintenance.overdue>0?G.red:G.green}/>
        <KpiCard Icon={CalendarCheck} iconColor={G.green} label="Réservations"    value={reservations.total||0}   sub={`${reservations.approval_rate||0}% approuvées`} color={G.green}/>
        <KpiCard Icon={Target}      iconColor={G.green} label="Résolution pannes"  value={`${maintenance.breakdown_resolution_rate||0}%`} sub="signalements résolus" color={G.green}/>
      </div>

      {/* Mini-résumés */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Section title="État de la flotte" Icon={Car}>
          {[
            {label:"Disponibles",    val:fleet.disponibles||0,    color:G.green, Icon:CheckCircle2 },
            {label:"En service",     val:fleet.en_service||0,     color:G.amber, Icon:Activity      },
            {label:"En maintenance", val:fleet.en_maintenance||0, color:G.red,   Icon:Wrench        },
            {label:"Hors service",   val:fleet.hors_service||0,   color:G.textLight, Icon:XCircle  },
          ].map((r,i)=>{
            const pct = fleet.total>0?(r.val/fleet.total)*100:0;
            return (
              <div key={i} style={{ marginBottom:9 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4, alignItems:"center" }}>
                  <span style={{ color:G.textMid, fontWeight:500, display:"flex", alignItems:"center", gap:5 }}>
                    <r.Icon size={12} color={r.color}/>{r.label}
                  </span>
                  <span style={{ fontWeight:800, color:r.color }}>{r.val}</span>
                </div>
                <div style={{ height:4, background:G.bg, borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:r.color, borderRadius:99 }}/>
                </div>
              </div>
            );
          })}
        </Section>

        <Section title="Synthèse financière" Icon={DollarSign}>
          {[
            {label:"Payées",          val:fmtM((expenses.total||0)-(expenses.pending||0)), color:G.green,  bg:G.greenLight },
            {label:"En attente",      val:fmtM(expenses.pending||0),                        color:G.amber,  bg:G.amberLight },
            {label:"Coût moyen / op.",val:fmtM(expenses.count>0?(expenses.total/expenses.count):0), color:G.text, bg:G.bg },
          ].map((r,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 12px", borderRadius:8, marginBottom:7, background:r.bg }}>
              <span style={{ fontSize:11, fontWeight:600, color:G.textMid }}>{r.label}</span>
              <span style={{ fontSize:12, fontWeight:800, color:r.color }}>{r.val}</span>
            </div>
          ))}
          {expenses.top_type && (
            <div style={{ padding:"8px 12px", borderRadius:7, background:G.bg, fontSize:11, color:G.textMid }}>
              Poste dominant : <b style={{ color:G.text }}>{EXPENSE_LABELS[expenses.top_type.expense_type]||expenses.top_type.expense_type}</b> · {fmtM(expenses.top_type.total)}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONGLET : PARC AUTOMOBILE
// ─────────────────────────────────────────────────────────────────────────────
function TabFleet({ data, loading }) {
  if (loading) return <LoadingGrid/>;
  if (!data)   return <NoData/>;
  const { total=0, disponibles=0, en_service=0, en_maintenance=0, hors_service=0,
    by_status=[], by_category=[], by_assignment=[], by_make=[],
    avg_age_years, avg_mileage=0, total_mileage=0, taux_utilisation_mois=0,
    age_distribution={} } = data;

  const handlePdf = () => printPdf("Rapport Parc Automobile — DRIVEPARC", [
    { title:"Indicateurs clés", html:`<div class="kpis">
        <div class="kpi"><div class="n">${total}</div><div class="l">Total</div></div>
        <div class="kpi"><div class="n">${disponibles}</div><div class="l">Disponibles</div></div>
        <div class="kpi"><div class="n">${avg_age_years||"—"} ans</div><div class="l">Âge moyen</div></div>
        <div class="kpi"><div class="n">${fmt(avg_mileage)} km</div><div class="l">Km moyen</div></div>
      </div>` },
    { title:"Par catégorie", html:`<table><thead><tr><th>Catégorie</th><th>Nombre</th><th>%</th></tr></thead><tbody>
        ${by_category.map(r=>`<tr><td>${r.category}</td><td>${r.count}</td><td>${total>0?((r.count/total)*100).toFixed(1):0}%</td></tr>`).join("")}
      </tbody></table>` },
    { title:"Top marques", html:`<table><thead><tr><th>Marque</th><th>Véhicules</th></tr></thead><tbody>
        ${by_make.map(r=>`<tr><td>${r.make}</td><td>${r.count}</td></tr>`).join("")}
      </tbody></table>` },
  ]);

  const handleExcel = () => exportExcel([
    { name:"Statuts",     rows:by_status.map(r=>({Statut:r.status,Nombre:r.count})) },
    { name:"Catégories",  rows:by_category.map(r=>({Catégorie:r.category,Nombre:r.count})) },
    { name:"Marques",     rows:by_make.map(r=>({Marque:r.make,Nombre:r.count})) },
    { name:"Affectations",rows:by_assignment.map(r=>({Affectation:r.assignment_type,Nombre:r.count})) },
  ]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div className="rpt-card" style={{ padding:"18px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:G.text, display:"flex", alignItems:"center", gap:7 }}>
              <Car size={14} color={G.green}/> Indicateurs clés du parc
            </div>
            <div style={{ fontSize:11, color:G.textLight, marginTop:2 }}>{total} véhicules enregistrés</div>
          </div>
          <ExportButtons onPdf={handlePdf} onExcel={handleExcel}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
          <KpiCard Icon={Car}          iconColor={G.green} label="Total flotte"         value={total}                     color={G.green}/>
          <KpiCard Icon={CheckCircle2} iconColor={G.green} label="Disponibles"          value={disponibles}               color={G.green}/>
          <KpiCard Icon={Activity}     iconColor={G.amber} label="En service"           value={en_service}                color={G.amber}/>
          <KpiCard Icon={Wrench}       iconColor={G.red}   label="En maintenance"       value={en_maintenance}            color={en_maintenance>0?G.red:G.green}/>
          <KpiCard Icon={XCircle}      iconColor={G.textLight} label="Hors service"     value={hors_service}              color={G.textLight}/>
          <KpiCard Icon={Calendar}     iconColor={G.amber} label="Âge moyen"            value={avg_age_years?`${avg_age_years} ans`:"—"} color={G.amber}/>
          <KpiCard Icon={Gauge}        iconColor={G.green} label="Km moyen"             value={`${fmt(avg_mileage)} km`} color={G.green}/>
          <KpiCard Icon={TrendingUp}   iconColor={G.green} label="Utilisation / mois"   value={`${taux_utilisation_mois}%`} color={taux_utilisation_mois>=70?G.green:G.amber}/>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Section title="Répartition par statut" Icon={BarChart}>
          {by_status.map((r,i)=>{
            const meta=STATUS_COLORS[r.status]||{label:r.status,color:G.textMid};
            return <BarRow key={i} label={meta.label} value={r.count} total={total} color={meta.color} rawLabel={`${r.count} (${total>0?((r.count/total)*100).toFixed(0):0}%)`}/>;
          })}
          <div style={{ marginTop:10, display:"flex", justifyContent:"center" }}>
            <DonutSvg segments={by_status.map(r=>{ const m=STATUS_COLORS[r.status]||{color:G.textMid}; return{label:r.status,value:r.count,color:m.color}; })} size={96} label={`${total}`} sub="total"/>
          </div>
        </Section>
        <Section title="Répartition par catégorie" Icon={PieChart}>
          {by_category.map((r,i)=>(
            <BarRow key={i} label={r.category} value={r.count} total={total} color={PAL[i%PAL.length]} rawLabel={`${r.count} (${total>0?((r.count/total)*100).toFixed(0):0}%)`}/>
          ))}
        </Section>
        <Section title="Affectation du parc" Icon={Target}>
          {by_assignment.map((r,i)=>{
            const labels={POOL:"Parc commun",FONCTION:"Voiture de fonction",BUS_SCOLAIRE:"Bus scolaire"};
            return <BarRow key={i} label={labels[r.assignment_type]||r.assignment_type} value={r.count} total={total} color={PAL[i*2%PAL.length]} rawLabel={`${r.count} (${total>0?((r.count/total)*100).toFixed(0):0}%)`}/>;
          })}
        </Section>
        <Section title="Top marques" Icon={BarChart2}>
          {by_make.map((r,i)=>(
            <BarRow key={i} label={r.make} value={r.count} total={total} color={PAL[i%PAL.length]} rawLabel={`${r.count} véhicule${r.count>1?"s":""}`}/>
          ))}
        </Section>
      </div>

      {Object.keys(age_distribution).length>0 && (
        <Section title="Distribution par âge" sub="Ancienneté de la flotte" Icon={Calendar}>
          <BarChartSvg data={Object.entries(age_distribution).map(([label,value],i)=>({label,value,color:PAL[i%PAL.length]}))} height={100}/>
        </Section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONGLET : FINANCIER
// ─────────────────────────────────────────────────────────────────────────────
function TabFinancier({ data, loading }) {
  if (loading) return <LoadingGrid/>;
  if (!data)   return <NoData/>;
  const { total=0, paid=0, pending=0, count=0, avg_per_expense=0,
    by_type=[], by_vehicle=[], monthly_trend=[], tco_by_vehicle=[] } = data;

  const handlePdf = () => printPdf("Rapport Financier — DRIVEPARC", [
    { title:"Synthèse financière", html:`<div class="kpis">
        <div class="kpi"><div class="n">${fmtM(total)}</div><div class="l">Total</div></div>
        <div class="kpi"><div class="n">${fmtM(paid)}</div><div class="l">Payées</div></div>
        <div class="kpi"><div class="n">${fmtM(pending)}</div><div class="l">En attente</div></div>
        <div class="kpi"><div class="n">${count}</div><div class="l">Opérations</div></div>
      </div>` },
    { title:"Par type de dépense", html:`<table><thead><tr><th>Type</th><th>Montant (FCFA)</th><th>Opérations</th><th>%</th></tr></thead><tbody>
        ${by_type.map(r=>`<tr><td>${EXPENSE_LABELS[r.expense_type]||r.expense_type}</td><td>${fmt(Math.round(r.total))}</td><td>${r.count}</td><td>${total>0?((r.total/total)*100).toFixed(1):0}%</td></tr>`).join("")}
      </tbody></table>` },
    { title:"Véhicules les plus coûteux", html:`<table><thead><tr><th>Véhicule</th><th>Montant (FCFA)</th><th>Opérations</th></tr></thead><tbody>
        ${by_vehicle.map(r=>`<tr><td>${r.vehicle__make||""} ${r.vehicle__model||""}</td><td>${fmt(Math.round(r.total))}</td><td>${r.count}</td></tr>`).join("")}
      </tbody></table>` },
  ]);

  const handleExcel = () => exportExcel([
    { name:"Par type", rows:by_type.map(r=>({Type:EXPENSE_LABELS[r.expense_type]||r.expense_type,"Montant (FCFA)":Math.round(r.total),Opérations:r.count})) },
    { name:"Par véhicule", rows:by_vehicle.map(r=>({Véhicule:`${r.vehicle__make||""} ${r.vehicle__model||""}`.trim(),Immatriculation:r.vehicle__registration_number||"","Montant (FCFA)":Math.round(r.total),Opérations:r.count})) },
    { name:"Tendance mensuelle", rows:monthly_trend.map(r=>({Mois:r.month?new Date(r.month).toLocaleDateString("fr-FR",{month:"short",year:"numeric"}):"","Montant (FCFA)":Math.round(r.total||0),Opérations:r.count||0})) },
    { name:"TCO", rows:tco_by_vehicle.map(r=>({Véhicule:`${r.vehicle__make||""} ${r.vehicle__model||""}`.trim(),Immatriculation:r.vehicle__registration_number||"","TCO (FCFA)":Math.round(r.total||0),Opérations:r.count||0,"Moy./op.":Math.round(r.avg||0)})) },
  ]);

  const monthlyData = monthly_trend.map(r=>({label:r.month?new Date(r.month).toLocaleDateString("fr-FR",{month:"short"}):"",value:r.total||0,rawLabel:fmtM(r.total||0)}));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div className="rpt-card" style={{ padding:"18px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:G.text, display:"flex", alignItems:"center", gap:7 }}>
              <DollarSign size={14} color={G.green}/> Synthèse financière
            </div>
            <div style={{ fontSize:11, color:G.textLight, marginTop:2 }}>{count} opérations</div>
          </div>
          <ExportButtons onPdf={handlePdf} onExcel={handleExcel}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
          <KpiCard Icon={DollarSign}   iconColor={G.green} label="Total dépenses"  value={fmtM(total)}          color={G.green}/>
          <KpiCard Icon={CheckCircle2} iconColor={G.green} label="Payées"          value={fmtM(paid)}           color={G.green}/>
          <KpiCard Icon={Clock}        iconColor={pending>0?G.amber:G.green} label="En attente" value={fmtM(pending)} color={pending>0?G.amber:G.green}/>
          <KpiCard Icon={BarChart2}    iconColor={G.green} label="Opérations"      value={count}                color={G.green}/>
          <KpiCard Icon={TrendingUp}   iconColor={G.amber} label="Coût moyen/op."  value={fmtM(avg_per_expense)} color={G.amber}/>
          <KpiCard Icon={Activity}     iconColor={G.green} label="Taux règlement"  value={total>0?`${((paid/total)*100).toFixed(0)}%`:"—"} color={paid/total>=.8?G.green:G.amber}/>
        </div>
      </div>

      {monthlyData.length>0 && (
        <Section title="Évolution mensuelle des dépenses" sub="12 derniers mois" Icon={TrendingUp}>
          <LineChartSvg data={monthlyData} height={120} color={G.green}/>
        </Section>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Section title="Ventilation par type" Icon={PieChart}>
          <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
            <DonutSvg segments={by_type.map(r=>({label:EXPENSE_LABELS[r.expense_type]||r.expense_type,value:r.total||0,color:EXPENSE_COLORS[r.expense_type]||G.green,rawLabel:fmtM(r.total||0)}))} size={96} label={fmtM(total).split(" ")[0]} sub="FCFA"/>
            <div style={{ flex:1 }}>
              {by_type.map((r,i)=>(
                <BarRow key={i} label={EXPENSE_LABELS[r.expense_type]||r.expense_type} value={r.total||0} total={total} color={EXPENSE_COLORS[r.expense_type]||PAL[i%PAL.length]} rawLabel={fmtM(r.total||0)} count={r.count}/>
              ))}
            </div>
          </div>
        </Section>
        <Section title="Véhicules les plus coûteux" Icon={Car}>
          {by_vehicle.slice(0,8).map((r,i)=>{
            const label=`${r.vehicle__make||""} ${r.vehicle__model||""}`.trim()||"—";
            return <BarRow key={i} label={label} value={r.total||0} total={total} color={PAL[i%PAL.length]} rawLabel={fmtM(r.total||0)} count={r.count}/>;
          })}
        </Section>
      </div>

      {tco_by_vehicle.length>0 && (
        <Section title="Coût Total de Possession (TCO)" sub="Historique complet par véhicule" Icon={BarChart2}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:G.bg }}>
                  {["#","Véhicule","Immatriculation","Année","TCO total","Opérations","Moy./op."].map(h=>(
                    <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:G.textLight, textTransform:"uppercase", letterSpacing:"1px", borderBottom:`1.5px solid ${G.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tco_by_vehicle.slice(0,15).map((r,i)=>(
                  <tr key={i} className="rpt-tr" style={{ borderBottom:`1px solid ${G.border}`, background:i%2===0?"#fff":G.bg }}>
                    <td style={{ padding:"8px 10px", fontSize:12 }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}</td>
                    <td style={{ padding:"8px 10px" }}><div style={{ fontWeight:700, fontSize:12, color:G.text }}>{r.vehicle__make||""} {r.vehicle__model||""}</div></td>
                    <td style={{ padding:"8px 10px", fontFamily:"monospace", fontWeight:700, color:G.green, fontSize:11 }}>{r.vehicle__registration_number||"—"}</td>
                    <td style={{ padding:"8px 10px", color:G.textLight, fontSize:11 }}>{r.vehicle__year||"—"}</td>
                    <td style={{ padding:"8px 10px", fontWeight:800, color:G.text, fontSize:12 }}>{fmtM(r.total||0)}</td>
                    <td style={{ padding:"8px 10px", color:G.textMid, fontSize:11 }}>{r.count}</td>
                    <td style={{ padding:"8px 10px", color:G.textMid, fontSize:11 }}>{fmtM(r.avg||0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONGLET : MAINTENANCE
// ─────────────────────────────────────────────────────────────────────────────
function TabMaintRapport({ data, loading }) {
  if (loading) return <LoadingGrid/>;
  if (!data)   return <NoData/>;
  const { total=0, completed=0, planned=0, in_progress=0, overdue=0,
    by_type=[], by_vehicle=[], avg_duration_days,
    monthly_trend=[], breakdowns={} } = data;

  const handlePdf = () => printPdf("Rapport Maintenance — DRIVEPARC", [
    { title:"Indicateurs", html:`<div class="kpis">
        <div class="kpi"><div class="n">${total}</div><div class="l">Total opérations</div></div>
        <div class="kpi"><div class="n">${completed}</div><div class="l">Terminées</div></div>
        <div class="kpi"><div class="n">${overdue}</div><div class="l">En retard</div></div>
        <div class="kpi"><div class="n">${avg_duration_days??"—"} j</div><div class="l">Durée moyenne</div></div>
      </div>
      ${overdue>0?`<div class="alert-d">${overdue} maintenance(s) en retard — intervention requise</div>`:""}` },
    { title:"Par type", html:`<table><thead><tr><th>Type</th><th>Nombre</th><th>%</th></tr></thead><tbody>
        ${by_type.map(r=>`<tr><td>${r.maintenance_type||r.type||"—"}</td><td>${r.count}</td><td>${total>0?((r.count/total)*100).toFixed(1):0}%</td></tr>`).join("")}
      </tbody></table>` },
  ]);

  const handleExcel = () => exportExcel([
    { name:"Maintenance", rows:by_type.map(r=>({Type:r.maintenance_type||r.type||"—",Nombre:r.count})) },
    { name:"Par véhicule", rows:by_vehicle.map(r=>({Véhicule:`${r.vehicle__make||""} ${r.vehicle__model||""}`.trim(),Immatriculation:r.vehicle__registration_number||"","Nb maintenances":r.count})) },
    { name:"Pannes sévérité", rows:(breakdowns.by_severity||[]).map(r=>({Sévérité:r.severity,Nombre:r.count})) },
  ]);

  const monthlyData = monthly_trend.map(r=>({label:r.month?new Date(r.month).toLocaleDateString("fr-FR",{month:"short"}):"",value:r.count||0}));
  const typeLabels  = {PREVENTIVE:"Préventive",CORRECTIVE:"Corrective",REGLEMENTAIRE:"Réglementaire",VIDANGE:"Vidange",FREINS:"Freins",PNEUS:"Pneus",ELECTRICITE:"Électricité"};

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div className="rpt-card" style={{ padding:"18px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:G.text, display:"flex", alignItems:"center", gap:7 }}>
              <Wrench size={14} color={G.green}/> Indicateurs maintenance
            </div>
            <div style={{ fontSize:11, color:G.textLight, marginTop:2 }}>{total} opérations enregistrées</div>
          </div>
          <ExportButtons onPdf={handlePdf} onExcel={handleExcel}/>
        </div>
        {overdue>0 && (
          <div style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 13px", background:G.redLight, borderRadius:8, border:`1px solid ${G.redBorder}`, marginBottom:14 }}>
            <AlertCircle size={14} color={G.red}/>
            <div style={{ fontSize:12, fontWeight:700, color:G.red }}>{overdue} maintenance{overdue>1?"s":""} en retard — intervention urgente</div>
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))", gap:10 }}>
          <KpiCard Icon={FileText}    iconColor={G.green} label="Total opérations" value={total}      color={G.green}/>
          <KpiCard Icon={CheckCircle2}iconColor={G.green} label="Terminées"        value={completed}  color={G.green}/>
          <KpiCard Icon={Activity}    iconColor={G.amber} label="En cours"         value={in_progress}color={G.amber}/>
          <KpiCard Icon={CalendarCheck}iconColor={G.green}label="Planifiées"       value={planned}    color={G.green}/>
          <KpiCard Icon={AlertCircle} iconColor={overdue>0?G.red:G.textLight} label="En retard" value={overdue} color={overdue>0?G.red:G.textLight}/>
          <KpiCard Icon={Clock}       iconColor={G.amber} label="Durée moyenne"    value={avg_duration_days?`${avg_duration_days} j`:"—"} color={G.amber}/>
        </div>
      </div>

      {monthlyData.length>0 && (
        <Section title="Évolution mensuelle des maintenances" Icon={TrendingUp}>
          <BarChartSvg data={monthlyData.map((d,i)=>({...d,color:PAL[i%PAL.length]}))} height={100}/>
        </Section>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Section title="Répartition par type" Icon={BarChart}>
          {by_type.map((r,i)=>{
            const label=r.maintenance_type||r.type||"—";
            return <BarRow key={i} label={typeLabels[label]||label} value={r.count} total={total} color={PAL[i%PAL.length]} rawLabel={`${r.count} (${total>0?((r.count/total)*100).toFixed(0):0}%)`}/>;
          })}
        </Section>
        <Section title="Véhicules les plus en maintenance" Icon={Car}>
          {by_vehicle.slice(0,8).map((r,i)=>{
            const label=`${r.vehicle__make||""} ${r.vehicle__model||""}`.trim()||"—";
            return <BarRow key={i} label={label} value={r.count} total={total} color={PAL[i%PAL.length]} rawLabel={`${r.count} op.`}/>;
          })}
        </Section>
      </div>

      {/* Pannes terrain */}
      <div className="rpt-card" style={{ padding:"18px 20px" }}>
        <div style={{ fontSize:13, fontWeight:800, color:G.text, marginBottom:4, display:"flex", alignItems:"center", gap:7 }}>
          <AlertTriangle size={14} color={G.amber}/> Signalements & Pannes terrain
        </div>
        <div style={{ fontSize:11, color:G.textLight, marginBottom:14 }}>{breakdowns.total||0} signalements · taux résolution : {breakdowns.resolution_rate||0}%</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))", gap:10, marginBottom:16 }}>
          <KpiCard Icon={AlertCircle} iconColor={G.red}   label="Total signalements" value={breakdowns.total||0}       color={G.red}/>
          <KpiCard Icon={CheckCircle2}iconColor={G.green} label="Résolus"            value={breakdowns.resolved||0}    color={G.green}/>
          <KpiCard Icon={Activity}    iconColor={breakdowns.resolution_rate>=80?G.green:G.amber} label="Taux résolution" value={`${breakdowns.resolution_rate||0}%`} color={breakdowns.resolution_rate>=80?G.green:G.amber}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:G.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:9 }}>Par sévérité</div>
            {(breakdowns.by_severity||[]).map((r,i)=>{
              const col=r.severity==="CRITIQUE"?G.red:r.severity==="HAUTE"?G.red:r.severity==="MOYENNE"?G.amber:G.green;
              return <BarRow key={i} label={r.severity} value={r.count} total={breakdowns.total||1} color={col} rawLabel={`${r.count}`}/>;
            })}
          </div>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:G.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:9 }}>Par statut</div>
            {(breakdowns.by_status||[]).map((r,i)=>(
              <BarRow key={i} label={r.status} value={r.count} total={breakdowns.total||1} color={PAL[i%PAL.length]} rawLabel={`${r.count}`}/>
            ))}
          </div>
        </div>
        <div style={{ padding:"10px 14px", background:G.bg, borderRadius:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:5 }}>
            <span style={{ fontWeight:700, color:G.text }}>Progression résolution globale</span>
            <span style={{ fontWeight:800, color:breakdowns.resolution_rate>=80?G.green:G.amber }}>{breakdowns.resolution_rate||0}%</span>
          </div>
          <div style={{ height:6, background:G.border, borderRadius:99, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${breakdowns.resolution_rate||0}%`, background:breakdowns.resolution_rate>=80?G.green:G.amber, borderRadius:99, transition:"width .8s" }}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONGLET : RÉSERVATIONS
// ─────────────────────────────────────────────────────────────────────────────
function TabReservRapport({ data, loading }) {
  if (loading) return <LoadingGrid/>;
  if (!data)   return <NoData/>;
  const { total=0, approved=0, rejected=0, approval_rate=0,
    avg_passengers=0, by_status=[], top_destinations=[],
    by_vehicle=[], monthly_trend=[], vehicle_utilization=[] } = data;

  const handlePdf = () => printPdf("Rapport Réservations — DRIVEPARC", [
    { title:"Indicateurs", html:`<div class="kpis">
        <div class="kpi"><div class="n">${total}</div><div class="l">Total</div></div>
        <div class="kpi"><div class="n">${approved}</div><div class="l">Approuvées</div></div>
        <div class="kpi"><div class="n">${approval_rate}%</div><div class="l">Taux approbation</div></div>
        <div class="kpi"><div class="n">${avg_passengers}</div><div class="l">Passagers moyens</div></div>
      </div>` },
    { title:"Top destinations", html:`<table><thead><tr><th>Destination</th><th>Réservations</th></tr></thead><tbody>
        ${top_destinations.map(r=>`<tr><td>${r.destination}</td><td>${r.count}</td></tr>`).join("")}
      </tbody></table>` },
    { title:"Utilisation véhicules", html:`<table><thead><tr><th>Véhicule</th><th>Immatriculation</th><th>Jours</th><th>Taux</th></tr></thead><tbody>
        ${vehicle_utilization.slice(0,15).map(r=>`<tr><td>${r.make||""} ${r.model||""}</td><td>${r.registration_number||"—"}</td><td>${r.days_used}</td><td>${r.utilization_rate}%</td></tr>`).join("")}
      </tbody></table>` },
  ]);

  const handleExcel = () => exportExcel([
    { name:"Statuts",   rows:by_status.map(r=>({Statut:r.status,Nombre:r.count})) },
    { name:"Destinations",rows:top_destinations.map(r=>({Destination:r.destination,Réservations:r.count})) },
    { name:"Utilisation",rows:vehicle_utilization.map(r=>({Véhicule:`${r.make||""} ${r.model||""}`.trim(),Immatriculation:r.registration_number||"","Jours utilisés":r.days_used,"Taux (%)":r.utilization_rate})) },
  ]);

  const monthlyData = monthly_trend.map(r=>({label:r.month?new Date(r.month).toLocaleDateString("fr-FR",{month:"short"}):"",value:r.count||0}));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div className="rpt-card" style={{ padding:"18px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:G.text, display:"flex", alignItems:"center", gap:7 }}>
              <CalendarCheck size={14} color={G.green}/> Indicateurs réservations
            </div>
            <div style={{ fontSize:11, color:G.textLight, marginTop:2 }}>{total} réservations enregistrées</div>
          </div>
          <ExportButtons onPdf={handlePdf} onExcel={handleExcel}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))", gap:10 }}>
          <KpiCard Icon={FileText}    iconColor={G.green} label="Total réservations" value={total}           color={G.green}/>
          <KpiCard Icon={CheckCircle2}iconColor={G.green} label="Approuvées"         value={approved}        color={G.green}/>
          <KpiCard Icon={XCircle}     iconColor={G.red}   label="Refusées"           value={rejected}        color={G.red}/>
          <KpiCard Icon={TrendingUp}  iconColor={approval_rate>=80?G.green:G.amber} label="Taux approbation" value={`${approval_rate}%`} color={approval_rate>=80?G.green:G.amber}/>
          <KpiCard Icon={Users}       iconColor={G.green} label="Passagers moyens"   value={avg_passengers}  color={G.green}/>
        </div>
      </div>

      {monthlyData.length>0 && (
        <Section title="Évolution mensuelle des réservations" Icon={TrendingUp}>
          <LineChartSvg data={monthlyData.map((d,i)=>({...d,color:G.green}))} height={110} color={G.green}/>
        </Section>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Section title="Top destinations" Icon={MapPin}>
          {top_destinations.slice(0,10).map((r,i)=>(
            <BarRow key={i} label={r.destination} value={r.count} total={total} color={PAL[i%PAL.length]} rawLabel={`${r.count} réserv.`}/>
          ))}
          {top_destinations.length===0&&<div style={{ textAlign:"center",color:G.textLight,padding:"20px 0",fontSize:12 }}>Aucune donnée</div>}
        </Section>
        <Section title="Véhicules les plus demandés" Icon={Car}>
          {by_vehicle.slice(0,8).map((r,i)=>{
            const label=`${r.vehicle__make||""} ${r.vehicle__model||""}`.trim()||"—";
            return <BarRow key={i} label={label} value={r.count} total={total} color={PAL[i%PAL.length]} rawLabel={`${r.count} réserv.`}/>;
          })}
        </Section>
      </div>

      {vehicle_utilization.length>0 && (
        <Section title="Taux d'utilisation par véhicule (mois en cours)" sub="Jours utilisés vs jours ouvrés" Icon={Gauge}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:9 }}>
            {vehicle_utilization.slice(0,12).map((v,i)=>{
              const pct=v.utilization_rate||0;
              const color=pct>=70?G.green:pct>=40?G.amber:G.red;
              return (
                <div key={i} style={{ background:G.bg, borderRadius:9, padding:"11px 13px" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:G.text, marginBottom:1 }}>{v.make} {v.model}</div>
                  <div style={{ fontSize:9, color:G.textXLight, fontFamily:"monospace", marginBottom:7 }}>{v.registration_number}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4 }}>
                    <span style={{ color:G.textMid }}>{v.days_used} j</span>
                    <span style={{ fontWeight:800, color }}>{pct}%</span>
                  </div>
                  <div style={{ height:4, background:G.border, borderRadius:99, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99 }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

// Fix: Calendar missing from lucide-react import at top — alias it
const Calendar = CalendarCheck;

export function TabRapports() {
  const [tab,      setTab]      = useState("executive");
  const today      = new Date().toISOString().split("T")[0];
  const firstOfYear = `${new Date().getFullYear()}-01-01`;
  const [dateFrom, setDateFrom] = useState(firstOfYear);
  const [dateTo,   setDateTo]   = useState(today);

  const [dataExec,  setDataExec]  = useState(null);
  const [dataFleet, setDataFleet] = useState(null);
  const [dataFin,   setDataFin]   = useState(null);
  const [dataMaint, setDataMaint] = useState(null);
  const [dataResa,  setDataResa]  = useState(null);

  const [loadingExec,  setLoadingExec]  = useState(false);
  const [loadingFleet, setLoadingFleet] = useState(false);
  const [loadingFin,   setLoadingFin]   = useState(false);
  const [loadingMaint, setLoadingMaint] = useState(false);
  const [loadingResa,  setLoadingResa]  = useState(false);

  const dateParams = `?date_from=${dateFrom}&date_to=${dateTo}`;

  const load = useCallback(async (which) => {
    const loaders = {
      executive:   async () => { setLoadingExec(true);  try{setDataExec (await apiFetch(`/reports/executive-summary/${dateParams}`))}catch{} finally{setLoadingExec(false)};  },
      fleet:       async () => { setLoadingFleet(true); try{setDataFleet(await apiFetch("/reports/fleet-summary/"))}              catch{} finally{setLoadingFleet(false)}; },
      financier:   async () => { setLoadingFin(true);   try{setDataFin  (await apiFetch(`/reports/expense-report/${dateParams}`))}catch{} finally{setLoadingFin(false)};   },
      maintenance: async () => { setLoadingMaint(true); try{setDataMaint(await apiFetch(`/reports/maintenance-report/${dateParams}`))}catch{} finally{setLoadingMaint(false)}; },
      reservations:async () => { setLoadingResa(true);  try{setDataResa (await apiFetch(`/reports/reservation-report/${dateParams}`))}catch{} finally{setLoadingResa(false)};  },
    };
    await loaders[which]?.();
  }, [dateParams]);

  useEffect(() => { load(tab); }, [tab, dateFrom, dateTo]);

  const TABS = [
    { id:"executive",    Icon:Activity,      label:"Synthèse exécutive" },
    { id:"fleet",        Icon:Car,           label:"Parc automobile"    },
    { id:"financier",    Icon:DollarSign,    label:"Financier"          },
    { id:"maintenance",  Icon:Wrench,        label:"Maintenance"        },
    { id:"reservations", Icon:CalendarCheck, label:"Réservations"       },
  ];

  const inpStyle = {
    padding:"7px 10px", border:`1.5px solid ${G.border}`, borderRadius:7,
    fontSize:11, fontFamily:"inherit", color:G.text, background:"#fff", outline:"none",
    colorScheme:"light",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{CSS}</style>

      {/* En-tête */}
      <div style={{ background:"#fff", borderRadius:11, border:`1.5px solid ${G.border}`, padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:G.text, display:"flex", alignItems:"center", gap:8 }}>
            <BarChart2 size={17} color={G.green}/> Rapports & Analytique
          </div>
          <div style={{ fontSize:11, color:G.textLight, marginTop:2 }}>Audit de flotte · Analyse financière · Tendances · Export PDF & Excel</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, fontWeight:600, color:G.textMid }}>Période :</span>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={inpStyle}/>
          <span style={{ fontSize:11, color:G.textXLight }}>→</span>
          <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   style={inpStyle}/>
          <button onClick={()=>load(tab)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 13px", background:G.greenLight, color:G.green, border:`1.5px solid ${G.greenBorder}`, borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            <RefreshCw size={13}/> Actualiser
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`rpt-tab ${tab===t.id?"on":"off"}`}>
            <t.Icon size={13}/> {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div>
        {tab==="executive"    && <TabExecutive     data={dataExec}  loading={loadingExec} />}
        {tab==="fleet"        && <TabFleet         data={dataFleet} loading={loadingFleet}/>}
        {tab==="financier"    && <TabFinancier     data={dataFin}   loading={loadingFin}  />}
        {tab==="maintenance"  && <TabMaintRapport  data={dataMaint} loading={loadingMaint}/>}
        {tab==="reservations" && <TabReservRapport data={dataResa}  loading={loadingResa} />}
      </div>
    </div>
  );
}
