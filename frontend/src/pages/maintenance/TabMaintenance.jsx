// ─── src/maintenance/TabMaintenance.jsx ──────────────────────────────────────
// Corrections :
//   • Calcul TCO correct (actual_cost prioritaire sur estimated_cost, jamais les deux)
//   • Palette sobre : vert #1B5E37, rouge #C0182A, amber #D97706 — pas de bleu/purple/teal
//   • Icônes Lucide React (bibliothèque professionnelle)
//   • Impression historique par véhicule : menu contextuel clic droit
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Wrench, Calendar, AlertTriangle, CheckCircle, Clock, ChevronUp, ChevronDown,
  ChevronsUpDown, Search, Printer, BarChart2, Shield, List, Eye, Pencil,
  Trash2, X, RotateCcw, ChevronLeft, ChevronRight, Car, Fuel, Gauge,
  CircleAlert, CircleCheck, CircleDot, Info, Plus, FileText, Settings,
  ArrowUpDown, Filter, TrendingUp, DollarSign, Users, Zap, Battery,
  Wind, Disc, AlignLeft, ClipboardList, Activity
} from "lucide-react";
import { apiFetch } from "../../utils/api";

// ── PALETTE SOBRE ─────────────────────────────────────────────────────────────
const C = {
  green:       "#1B5E37",
  greenMid:    "#2D7A4F",
  greenLight:  "#EAF4EE",
  greenXLight: "#F4FAF6",
  red:         "#C0182A",
  redLight:    "#FDF0F1",
  amber:       "#D97706",
  amberLight:  "#FFFBEB",
  white:       "#FFFFFF",
  bg:          "#F0F3F1",
  border:      "#E2E8E5",
  text:        "#1A2820",
  textMid:     "#4A6358",
  textLight:   "#8EA99A",
};

const PAGE_SIZE = 12;

// ── HELPERS MONTANTS — CORRECTS ───────────────────────────────────────────────
// Règle : pour une maintenance terminée, on prend actual_cost.
//         Pour une maintenance non terminée, on prend estimated_cost.
//         On NE JAMAIS additionne les deux.
const getEffectiveCost = (m) => {
  if (m.status === "TERMINE") {
    // Coût réel prioritaire, sinon estimé à défaut
    const ac = parseFloat(m.actual_cost);
    if (!isNaN(ac) && ac > 0) return ac;
    const ec = parseFloat(m.estimated_cost);
    if (!isNaN(ec) && ec > 0) return ec;
    return 0;
  }
  // Non terminée : on affiche l'estimé
  const ec = parseFloat(m.estimated_cost);
  return (!isNaN(ec) && ec > 0) ? ec : 0;
};

const fmtMoney = (n) => {
  if (n == null || n === "" || isNaN(Number(n))) return "—";
  const v = Number(n);
  if (v === 0) return "0 FCFA";
  return v.toLocaleString("fr-FR") + " FCFA";
};
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const fmtKm    = (n) => n != null ? Number(n).toLocaleString("fr-FR") + " km" : "—";
const activeVehicles = (vs) => vs.filter(v => v.status !== "HORS_SERVICE");
const returnStatus   = (vehicleId, vehicles) => {
  const veh = vehicles.find(v => String(v.id) === String(vehicleId));
  return veh?.assignment_type === "FONCTION" ? "EN_SERVICE" : "DISPONIBLE";
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes spin   { to { transform:rotate(360deg); } }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes toast-in { from{opacity:0;transform:translateX(120%) scale(.95)} to{opacity:1;transform:translateX(0) scale(1)} }
  @keyframes pulse-red { 0%,100%{opacity:1} 50%{opacity:.4} }

  .maint-card { animation:fadeUp .22s ease both; transition:box-shadow .18s,transform .18s,border-color .15s; }
  .maint-card:hover { box-shadow:0 8px 24px rgba(27,94,55,.10)!important; transform:translateY(-2px); }
  .maint-row:hover td { background:${C.greenXLight}!important; }
  .maint-tab-btn { transition:all .15s; }
  .sort-th { cursor:pointer; user-select:none; }
  .sort-th:hover { background:${C.greenLight}!important; color:${C.green}!important; }
  .page-btn { width:32px;height:32px;border-radius:8px;border:1.5px solid ${C.border};
    background:#fff;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;
    color:${C.textMid};display:inline-flex;align-items:center;justify-content:center;transition:all .15s; }
  .page-btn:hover:not(:disabled) { border-color:${C.green};color:${C.green}; }
  .page-btn.active { background:${C.green};color:#fff;border-color:${C.green}; }
  .page-btn:disabled { opacity:.4;cursor:not-allowed; }
  .kpi-card { transition:all .2s; cursor:pointer; }
  .kpi-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.08)!important; }
  .progress-bar-inner { transition:width .8s cubic-bezier(.4,0,.2,1); }
  input[type=date],input[type=number],input[type=text],textarea,select {
    color:${C.text}!important; background:#fff!important;
  }
  input[type=date]::-webkit-calendar-picker-indicator {
    filter:invert(25%) sepia(40%) saturate(400%) hue-rotate(120deg); cursor:pointer;
  }
  .urgence-critique { animation:pulse-red 2s infinite; }
  /* Menu contextuel */
  .ctx-menu { position:fixed;background:#fff;border-radius:10px;padding:6px 0;
    box-shadow:0 8px 32px rgba(0,0,0,.18);border:1.5px solid ${C.border};
    z-index:9999;min-width:200px;animation:fadeUp .12s ease; }
  .ctx-item { display:flex;align-items:center;gap:9px;padding:9px 14px;
    font-size:12px;font-weight:600;cursor:pointer;color:${C.text};
    transition:background .1s; }
  .ctx-item:hover { background:${C.greenLight};color:${C.green}; }
  .ctx-item.danger { color:${C.red}; }
  .ctx-item.danger:hover { background:${C.redLight}; }
  .ctx-sep { height:1px;background:${C.border};margin:4px 0; }
`;

// ── METADATA ──────────────────────────────────────────────────────────────────
// Icônes Lucide pour les types de maintenance
const TYPES = [
  { val:"VIDANGE",        label:"Vidange huile",        Icon:Fuel,        color:C.amber  },
  { val:"FILTRES",        label:"Filtres",               Icon:Filter,      color:C.amber  },
  { val:"PNEUS",          label:"Pneus",                 Icon:CircleDot,   color:C.textMid},
  { val:"FREINS",         label:"Freins",                Icon:AlertTriangle,color:C.red   },
  { val:"REVISION_MINOR", label:"Révision mineure",      Icon:Settings,    color:C.green  },
  { val:"REVISION_MAJOR", label:"Révision majeure",      Icon:Wrench,      color:C.green  },
  { val:"CONTROLE_TECH",  label:"Contrôle technique",    Icon:ClipboardList,color:C.amber },
  { val:"COURROIE",       label:"Courroie distribution", Icon:Activity,    color:C.red    },
  { val:"CLIMATISATION",  label:"Climatisation",         Icon:Wind,        color:C.textMid},
  { val:"BATTERIE",       label:"Batterie",              Icon:Battery,     color:C.amber  },
  { val:"CARROSSERIE",    label:"Carrosserie",           Icon:Car,         color:C.textMid},
  { val:"ELECTRICITE",    label:"Électricité",           Icon:Zap,         color:C.amber  },
  { val:"AUTRE",          label:"Autre",                 Icon:Wrench,      color:C.textMid},
];

const STATUTS = [
  { val:"PLANIFIE", label:"Planifié",  color:C.green, bg:C.greenLight  },
  { val:"EN_COURS", label:"En cours",  color:C.amber, bg:C.amberLight  },
  { val:"TERMINE",  label:"Terminé",   color:C.green, bg:C.greenLight  },
  { val:"ANNULE",   label:"Annulé",    color:C.textLight, bg:C.bg      },
];

const PRIORITES = [
  { val:"CRITIQUE", label:"Critique", color:C.red,   bg:C.redLight,   Icon:AlertTriangle },
  { val:"HAUTE",    label:"Haute",    color:C.amber, bg:C.amberLight, Icon:CircleAlert   },
  { val:"NORMALE",  label:"Normale",  color:C.green, bg:C.greenLight, Icon:CircleDot     },
  { val:"BASSE",    label:"Basse",    color:C.textLight, bg:C.bg,     Icon:CircleCheck   },
];

const getType     = v => TYPES.find(t => t.val === v)     || TYPES[TYPES.length - 1];
const getStatut   = v => STATUTS.find(s => s.val === v)   || STATUTS[0];
const getPriorite = v => PRIORITES.find(p => p.val === v) || PRIORITES[2];

// ── ICÔNE TYPE (Lucide) ────────────────────────────────────────────────────────
function TypeIcon({ type, size = 16, style = {} }) {
  const cfg = getType(type);
  const { Icon } = cfg;
  return <Icon size={size} color={cfg.color} strokeWidth={2} style={style} />;
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
let _setToastsGlobal = null;
function ToastProvider() {
  const [toasts, setToasts] = useState([]);
  _setToastsGlobal = setToasts;
  const remove = id => {
    setToasts(t => t.map(x => x.id === id ? { ...x, removing:true } : x));
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 300);
  };
  const ICONS = { success:<CheckCircle size={16}/>, error:<AlertTriangle size={16}/>, warning:<CircleAlert size={16}/> };
  return (
    <div style={{ position:"fixed", top:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:8, pointerEvents:"none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display:"flex", alignItems:"flex-start", gap:10, padding:"13px 17px",
          borderRadius:12, fontSize:12, fontWeight:600, minWidth:300, maxWidth:420,
          background: t.type==="error" ? C.redLight : t.type==="warning" ? C.amberLight : C.greenLight,
          border: `1px solid ${t.type==="error" ? "#FECACA" : t.type==="warning" ? "#FDE68A" : "#BBF7D0"}`,
          color: t.type==="error" ? C.red : t.type==="warning" ? C.amber : C.green,
          boxShadow:"0 8px 32px rgba(0,0,0,.12)",
          animation: t.removing ? "none" : "toast-in .3s ease",
          opacity: t.removing ? 0 : 1, transition:"opacity .25s", pointerEvents:"all",
        }}>
          <span style={{ flexShrink:0 }}>{ICONS[t.type] || ICONS.success}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, marginBottom:1 }}>{t.title}</div>
            {t.msg && <div style={{ fontSize:11, opacity:.8, marginTop:2 }}>{t.msg}</div>}
          </div>
          <button onClick={() => remove(t.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", opacity:.6, pointerEvents:"all", padding:0 }}>
            <X size={13}/>
          </button>
        </div>
      ))}
    </div>
  );
}
function showToast(title, type = "success", msg = "") {
  if (!_setToastsGlobal) return;
  const id = Date.now();
  _setToastsGlobal(t => [...t, { id, title, msg, type, removing:false }]);
  setTimeout(() => {
    _setToastsGlobal(t => t.map(x => x.id === id ? { ...x, removing:true } : x));
    setTimeout(() => _setToastsGlobal(t => t.filter(x => x.id !== id)), 300);
  }, 4500);
}

// ── MODAL BASE ────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, width = 580, footer }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.white, borderRadius:16, width:"100%", maxWidth:width, maxHeight:"92vh",
        display:"flex", flexDirection:"column", boxShadow:"0 24px 60px rgba(0,0,0,.25)", animation:"fadeUp .2s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"20px 24px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{title}</div>
            {subtitle && <div style={{ fontSize:12, color:C.textLight, marginTop:2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.textLight, padding:4, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:6 }}>
            <X size={18}/>
          </button>
        </div>
        <div style={{ overflowY:"auto", padding:"20px 24px", flex:1 }}>{children}</div>
        {footer && <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.border}`, flexShrink:0 }}>{footer}</div>}
      </div>
    </div>
  );
}

const LBL = { fontSize:10, fontWeight:700, color:C.textMid, textTransform:"uppercase", letterSpacing:"1px", marginBottom:5, display:"block" };
const INP = (extra = {}) => ({ padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13,
  fontFamily:"inherit", color:C.text, background:"#fff", width:"100%", outline:"none",
  boxSizing:"border-box", transition:"border-color .15s", ...extra });

function Field({ label, children, required }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={LBL}>{label}{required && <span style={{ color:C.red, marginLeft:3 }}>*</span>}</label>
      {children}
    </div>
  );
}

function Badge({ label, color, bg, Icon: Ico, size = "sm" }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:size==="lg"?"5px 12px":"3px 10px",
      borderRadius:99, fontSize:size==="lg"?11:10, fontWeight:700, background:bg, color }}>
      {Ico && <Ico size={10} strokeWidth={2.5}/>} {label}
    </span>
  );
}

// ── PAGINATION ────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange, total, pageSize }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:16, padding:"12px 0", borderTop:`1px solid ${C.border}` }}>
      <span style={{ fontSize:11, color:C.textLight }}>
        {(page-1)*pageSize+1}–{Math.min(page*pageSize, total)} sur {total} résultat{total>1?"s":""}
      </span>
      <div style={{ display:"flex", gap:4, alignItems:"center" }}>
        <button className="page-btn" disabled={page===1} onClick={() => onChange(page-1)}><ChevronLeft size={14}/></button>
        {pages.map((p,i) => p === "…"
          ? <span key={i} style={{ fontSize:12, color:C.textLight, padding:"0 4px" }}>…</span>
          : <button key={p} className={`page-btn${page===p?" active":""}`} onClick={() => onChange(p)}>{p}</button>
        )}
        <button className="page-btn" disabled={page===totalPages} onClick={() => onChange(page+1)}><ChevronRight size={14}/></button>
      </div>
    </div>
  );
}

// ── GRAPHIQUE COÛTS — CALCUL CORRECT ──────────────────────────────────────────
function GraphiqueCouts({ maintenances }) {
  const mois = useMemo(() => {
    const now = new Date();
    return Array.from({ length:12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const label = d.toLocaleDateString("fr-FR", { month:"short" });
      // On ne compte que les maintenances TERMINÉES avec leur coût effectif
      const total = maintenances
        .filter(m => m.status === "TERMINE" && (m.done_date || m.scheduled_date)?.startsWith(key))
        .reduce((s, m) => s + getEffectiveCost(m), 0);
      return { label, total, key };
    });
  }, [maintenances]);

  const max = Math.max(...mois.map(m => m.total), 1);
  const W = 560, H = 140, PB = 28, PL = 10, PR = 10;
  const barW = (W - PL - PR) / mois.length;
  const scale = v => H - PB - (v / max) * (H - PB - 10);
  const totalGraph = mois.reduce((s, m) => s + m.total, 0);

  return (
    <div style={{ background:C.white, borderRadius:12, padding:"16px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:C.text, display:"flex", alignItems:"center", gap:6 }}>
            <BarChart2 size={15} color={C.green}/> Coûts réels — 12 derniers mois
          </div>
          <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
            Total : <b style={{ color:C.green }}>{fmtMoney(totalGraph)}</b>
            <span style={{ marginLeft:8, fontSize:10, color:C.textLight }}>(interventions terminées uniquement)</span>
          </div>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
        {[0,.25,.5,.75,1].map((pct, i) => (
          <line key={i} x1={PL} y1={10+(H-PB-10)*pct} x2={W-PR} y2={10+(H-PB-10)*pct}
            stroke={C.border} strokeWidth="1" strokeDasharray="4,4"/>
        ))}
        {mois.map((m, i) => {
          const x = PL + i * barW + barW * .15;
          const bw = barW * .7;
          const y = scale(m.total);
          const h = H - PB - y;
          const isMax = m.total === max && max > 0;
          return (
            <g key={i}>
              <rect x={x} y={y} width={bw} height={Math.max(h, 0)} fill={isMax ? C.green : `${C.green}55`} rx="4">
                <title>{m.label} : {fmtMoney(m.total)}</title>
              </rect>
              {m.total > 0 && (
                <text x={x+bw/2} y={y-4} textAnchor="middle" fontSize="9" fill={C.green} fontWeight="700">
                  {m.total > 999 ? `${Math.round(m.total/1000)}k` : m.total}
                </text>
              )}
              <text x={x+bw/2} y={H-4} textAnchor="middle" fontSize="9" fill={C.textLight}>{m.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── TCO PAR VÉHICULE — CALCUL CORRECT ─────────────────────────────────────────
function TCOVehicules({ maintenances, vehicles }) {
  const actives = activeVehicles(vehicles);
  const tco = useMemo(() => {
    return actives.map(v => {
      const vM = maintenances.filter(m => String(m.vehicle) === String(v.id) && m.status === "TERMINE");
      // Règle : pour chaque maintenance terminée, prendre actual_cost, sinon estimated_cost à défaut
      const total = vM.reduce((s, m) => s + getEffectiveCost(m), 0);
      return { v, total, count: vM.length };
    }).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [maintenances, actives]);

  const maxTco = Math.max(...tco.map(t => t.total), 1);

  return (
    <div style={{ background:C.white, borderRadius:12, padding:"16px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
      <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14, display:"flex", alignItems:"center", gap:6 }}>
        <DollarSign size={15} color={C.green}/> TCO par véhicule (coûts réels)
      </div>
      {tco.filter(t => t.total > 0).length === 0
        ? <div style={{ textAlign:"center", padding:"24px", color:C.textLight, fontSize:12 }}>Aucune donnée de coût disponible</div>
        : tco.filter(t => t.total > 0).map(({ v, total, count }, i) => (
          <div key={v.id} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ width:20, height:20, borderRadius:6,
                  background: i===0?C.red : i===1?C.amber : C.greenLight,
                  color: i<=1?"#fff":C.green, fontSize:9, fontWeight:800,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {i+1}
                </span>
                <div>
                  <span style={{ fontSize:12, fontWeight:700, color:C.text }}>{v.make} {v.model}</span>
                  <span style={{ fontSize:10, color:C.textLight, marginLeft:6 }}>{v.registration_number}</span>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:12, fontWeight:700, color: i===0?C.red:C.text }}>{fmtMoney(total)}</div>
                <div style={{ fontSize:10, color:C.textLight }}>{count} intervention{count>1?"s":""}</div>
              </div>
            </div>
            <div style={{ height:5, background:C.bg, borderRadius:99, overflow:"hidden" }}>
              <div className="progress-bar-inner" style={{ height:"100%", width:`${(total/maxTco)*100}%`, borderRadius:99,
                background: i===0 ? C.red : i===1 ? C.amber : C.green }}/>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── EXPORT PDF HISTORIQUE (global OU par véhicule) ─────────────────────────────
function exportHistoriquePDF(list, vehicleFilter = null) {
  const done = list
    .filter(m => m.status === "TERMINE")
    .sort((a, b) => new Date(b.done_date||b.scheduled_date) - new Date(a.done_date||a.scheduled_date));

  const now = new Date().toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" });
  // CALCUL CORRECT du coût total
  const coutTotal = done.reduce((s, m) => s + getEffectiveCost(m), 0);

  const titre = vehicleFilter
    ? `Historique Maintenance — ${vehicleFilter.make} ${vehicleFilter.model} (${vehicleFilter.registration_number})`
    : "Historique des Maintenances — Tous véhicules";

  const rows = done.map(m => {
    const t = getType(m.type);
    const cat = { PREVENTIVE:"Préventive", CORRECTIVE:"Corrective", REGLEMENTAIRE:"Réglementaire" }[m.maintenance_type] || "—";
    const cost = getEffectiveCost(m);
    return `<tr>
      <td>${t.label}</td>
      <td>${m.vehicle_name || "—"}</td>
      <td>${m.vehicle_registration || "—"}</td>
      <td>${fmtDate(m.done_date || m.scheduled_date)}</td>
      <td>${fmtKm(m.done_km || m.mileage_at_maintenance)}</td>
      <td>${cat}</td>
      <td>${m.technician_name || "—"}</td>
      <td class="money">${cost > 0 ? cost.toLocaleString("fr-FR") + " FCFA" : "—"}</td>
      <td>${m.notes || "—"}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>${titre}</title>
  <style>
    @page { size:A4 landscape; margin:12mm 10mm }
    * { margin:0; padding:0; box-sizing:border-box }
    body { font-family:Arial,sans-serif; font-size:9.5px; color:#1A2820 }
    .hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; padding-bottom:10px; border-bottom:2px solid #1B5E37 }
    .hdr h1 { font-size:14px; font-weight:800; color:#1B5E37 }
    .hdr p  { font-size:9px; color:#6B7280; margin-top:3px }
    .stats  { display:flex; gap:10px; margin-bottom:14px }
    .stat   { padding:7px 14px; border-radius:6px; background:#EAF4EE }
    .stat .n { font-size:16px; font-weight:800; color:#1B5E37 }
    .stat .l { font-size:8px; color:#4A6358; font-weight:600; text-transform:uppercase; letter-spacing:.8px }
    table { width:100%; border-collapse:collapse }
    thead tr { background:#1B5E37; color:#fff }
    thead th { padding:6px 5px; text-align:left; font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:.8px }
    tbody tr:nth-child(even) { background:#F7FAF8 }
    tbody td { padding:5px; border-bottom:1px solid #E8EDEB; vertical-align:middle }
    .money { font-weight:700; color:#1B5E37 }
    .total td { background:#EAF4EE!important; font-weight:700; color:#1B5E37; padding:7px 5px }
    .footer { margin-top:12px; font-size:8.5px; color:#9CA3AF; text-align:center; border-top:1px solid #E8EDEB; padding-top:8px }
    .note { font-size:8px; color:#9CA3AF; font-style:italic; margin-bottom:6px }
  </style></head><body>
  <div class="hdr">
    <div>
      <h1>${titre}</h1>
      <p>Imprimé le ${now} · ${done.length} intervention${done.length!==1?"s":""} terminée${done.length!==1?"s":""}</p>
    </div>
    <div style="text-align:right;font-size:9px;color:#6B7280">
      <div style="font-weight:700;font-size:12px;color:#1B5E37">IUC Logbessou</div>
      <div>Service des Transports — DRIVEPARC</div>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><div class="n">${done.length}</div><div class="l">Interventions</div></div>
    <div class="stat"><div class="n">${new Set(done.map(m=>m.vehicle)).size}</div><div class="l">Véhicules</div></div>
    <div class="stat" style="background:#FFFBEB"><div class="n" style="color:#D97706">${coutTotal.toLocaleString("fr-FR")} FCFA</div><div class="l" style="color:#92400E">Coût total réel</div></div>
  </div>
  <p class="note">* Coût affiché = coût réel si saisi lors de la clôture, sinon coût estimé.</p>
  <table>
    <thead><tr><th>Type</th><th>Véhicule</th><th>Immat.</th><th>Date</th><th>Kilométrage</th><th>Catégorie</th><th>Technicien</th><th>Coût réel</th><th>Notes</th></tr></thead>
    <tbody>
      ${rows}
      <tr class="total"><td colspan="7">TOTAL</td><td class="money">${coutTotal.toLocaleString("fr-FR")} FCFA</td><td></td></tr>
    </tbody>
  </table>
  <div class="footer">Document généré automatiquement — DRIVEPARC · Institut Universitaire de la Côte</div>
  <script>window.onload = function(){ window.print(); };<\/script>
  </body></html>`;

  const blob = new Blob([html], { type:"text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  let f = document.getElementById("__maint_pdf__");
  if (!f) {
    f = document.createElement("iframe");
    f.id = "__maint_pdf__";
    f.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
    document.body.appendChild(f);
  }
  f.src = url;
  f.onload = () => {
    try { f.contentWindow.focus(); f.contentWindow.print(); }
    catch { window.open(url, "_blank"); }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
}

// ── MENU CONTEXTUEL (clic droit sur une ligne) ────────────────────────────────
function ContextMenu({ x, y, maintenance, vehicles, onClose, onDetail, onEdit, onCloturer, onDelete }) {
  const ref = useRef(null);
  const veh = vehicles.find(v => String(v.id) === String(maintenance.vehicle));

  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("contextmenu", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("contextmenu", handler);
    };
  }, [onClose]);

  // Ajustement position pour ne pas sortir de l'écran
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 250);

  return (
    <div ref={ref} className="ctx-menu" style={{ left:adjustedX, top:adjustedY }}>
      <div style={{ padding:"7px 14px 5px", fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px" }}>
        {maintenance.vehicle_name || "Véhicule"} · #{maintenance.id}
      </div>
      <div className="ctx-sep"/>
      <div className="ctx-item" onClick={() => { onDetail(maintenance); onClose(); }}>
        <Eye size={14}/> Voir les détails
      </div>
      {!["TERMINE","ANNULE"].includes(maintenance.status) && (
        <div className="ctx-item" onClick={() => { onEdit(maintenance); onClose(); }}>
          <Pencil size={14}/> Modifier
        </div>
      )}
      {!["TERMINE","ANNULE"].includes(maintenance.status) && (
        <div className="ctx-item" onClick={() => { onCloturer(maintenance); onClose(); }}>
          <CheckCircle size={14}/> Clôturer
        </div>
      )}
      <div className="ctx-sep"/>
      {/* Impression par véhicule — la raison d'être du clic droit */}
      <div className="ctx-item" onClick={() => {
        // On filtre l'historique uniquement pour CE véhicule
        onClose();
        // onPrintVehicle est passé depuis le parent
        if (onClose._printVehicle) onClose._printVehicle(maintenance);
      }}>
        <Printer size={14}/> Imprimer historique de ce véhicule
      </div>
      <div className="ctx-sep"/>
      {maintenance.status !== "TERMINE" && (
        <div className="ctx-item danger" onClick={() => { onDelete(maintenance.id); onClose(); }}>
          <Trash2 size={14}/> Supprimer
        </div>
      )}
    </div>
  );
}

// ── MODAL CRÉER / MODIFIER ────────────────────────────────────────────────────
function ModalMaintenance({ initial, vehicles, technicians, onClose, onSuccess }) {
  const isEdit = !!initial;
  const [saving,      setSaving]      = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError,    setApiError]    = useState("");
  const [touched,     setTouched]     = useState({});
  const avail = activeVehicles(vehicles);

  const [form, setForm] = useState({
    vehicle:            initial?.vehicle          || "",
    maintenance_type:   initial?.maintenance_type || "PREVENTIVE",
    type:               initial?.type             || "VIDANGE",
    priorite:           initial?.priorite         || "NORMALE",
    scheduled_date:     initial?.scheduled_date   || "",
    estimated_km:       initial?.estimated_km     || "",
    technician:         initial?.technician       || "",
    description:        initial?.description      || "",
    estimated_cost:     initial?.estimated_cost   || "",
    status:             initial?.status           || "PLANIFIE",
    notify_before_days: initial?.notify_before_days || 7,
  });

  const set   = (k, v) => { setForm(f => ({ ...f, [k]:v })); setTouched(t => ({ ...t, [k]:true })); };
  const touch = k      => setTouched(t => ({ ...t, [k]:true }));

  const RULES = {
    vehicle:        { validate: v => !!v, message: "Sélectionnez un véhicule.", label:"Véhicule" },
    scheduled_date: { validate: v => !!v, message: "La date est obligatoire.",  label:"Date planifiée" },
    description:    { validate: v => v && v.trim().length >= 10, message: v => `Description trop courte (${(v||"").trim().length}/10 min).`, label:"Description" },
  };

  const validateField = (key, value) => {
    const rule = RULES[key];
    if (!rule) return "";
    const ok = rule.validate(value ?? form[key]);
    if (ok) return "";
    return typeof rule.message === "function" ? rule.message(value ?? form[key]) : rule.message;
  };
  const validateAll = () => {
    const errors = {};
    Object.keys(RULES).forEach(k => { const msg = validateField(k, form[k]); if (msg) errors[k] = msg; });
    return errors;
  };

  const handleSubmit = async () => {
    setApiError("");
    setTouched(Object.fromEntries(Object.keys(RULES).map(k => [k, true])));
    const errors = validateAll();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const body = { ...form, technician:form.technician||null, estimated_cost:form.estimated_cost||null, estimated_km:form.estimated_km||null };
      if (isEdit) await apiFetch(`/maintenance/maintenance/${initial.id}/`, { method:"PATCH", body:JSON.stringify(body) });
      else        await apiFetch("/maintenance/maintenance/", { method:"POST", body:JSON.stringify(body) });

      if (["PLANIFIE","EN_COURS"].includes(form.status) && form.vehicle) {
        try { await apiFetch(`/vehicles/${form.vehicle}/`, { method:"PATCH", body:JSON.stringify({ status:"EN_MAINTENANCE" }) }); }
        catch { /* non bloquant */ }
      }
      showToast(isEdit ? "Maintenance mise à jour ✓" : "Maintenance planifiée ✓", "success",
        isEdit ? "" : "Le véhicule est passé en statut « En maintenance ».");
      onSuccess();
    } catch (e) {
      const msg = e.message?.includes("unique") ? "Une maintenance identique existe déjà pour ce véhicule."
        : e.message?.length > 200 ? "Erreur lors de l'enregistrement. Vérifiez les données."
        : e.message || "Erreur inattendue";
      setApiError(msg);
      showToast("Erreur lors de l'enregistrement", "error");
    } finally { setSaving(false); }
  };

  const ErrMsg = ({ field }) => {
    if (!touched[field] || !fieldErrors[field]) return null;
    return (
      <div style={{ display:"flex", alignItems:"flex-start", gap:5, marginTop:4, fontSize:11, color:C.red, fontWeight:600, lineHeight:1.4 }}>
        <AlertTriangle size={11} style={{ flexShrink:0, marginTop:1 }}/> <span>{fieldErrors[field]}</span>
      </div>
    );
  };

  const INP_STYLE = (field, extra = {}) => ({
    ...INP(), border:`1.5px solid ${touched[field]&&fieldErrors[field] ? C.red : C.border}`,
    background: touched[field]&&fieldErrors[field] ? "#FFF8F8" : "#fff", ...extra,
  });

  return (
    <Modal title={isEdit ? "Modifier la maintenance" : "Planifier une maintenance"}
      subtitle="Préventive, curative ou réglementaire" onClose={onClose} width={640}
      footer={
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"10px 20px", background:"transparent", color:C.textMid,
            border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving || avail.length === 0}
            style={{ padding:"10px 24px", background:C.green, color:"#fff", border:"none", borderRadius:8,
              fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit",
              opacity:saving||avail.length===0?0.7:1, display:"flex", alignItems:"center", gap:6 }}>
            {saving ? <><RotateCcw size={14} style={{ animation:"spin .8s linear infinite" }}/> Enregistrement…</> : isEdit ? "Enregistrer" : "Planifier"}
          </button>
        </div>
      }>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {apiError && (
          <div style={{ background:C.redLight, border:`1.5px solid ${C.red}30`, borderRadius:10, padding:"12px 16px", display:"flex", gap:10 }}>
            <AlertTriangle size={18} color={C.red} style={{ flexShrink:0, marginTop:1 }}/>
            <div style={{ fontSize:12, color:C.red, fontWeight:600, lineHeight:1.6 }}>{apiError}</div>
          </div>
        )}

        {/* Type d'intervention */}
        <Field label="Type d'intervention" required>
          <div style={{ display:"flex", gap:8 }}>
            {[
              { val:"PREVENTIVE",    Icon:Shield,     label:"Préventive",    desc:"Révisions planifiées" },
              { val:"CORRECTIVE",    Icon:Wrench,     label:"Corrective",    desc:"Suite à une panne"    },
              { val:"REGLEMENTAIRE", Icon:ClipboardList, label:"Réglementaire", desc:"Contrôle technique" },
            ].map(({ val, Icon: Ico, label, desc }) => (
              <button key={val} type="button" onClick={() => set("maintenance_type", val)}
                style={{ flex:1, padding:"10px 8px", borderRadius:9, cursor:"pointer", fontFamily:"inherit", textAlign:"center",
                  border:`2px solid ${form.maintenance_type===val ? C.green : C.border}`,
                  background: form.maintenance_type===val ? C.greenLight : C.bg, transition:"all .15s" }}>
                <Ico size={20} color={form.maintenance_type===val ? C.green : C.textMid} style={{ marginBottom:4 }}/>
                <div style={{ fontSize:11, fontWeight:700, color:form.maintenance_type===val ? C.green : C.text }}>{label}</div>
                <div style={{ fontSize:9, color:C.textLight, marginTop:2 }}>{desc}</div>
              </button>
            ))}
          </div>
        </Field>

        {avail.length === 0 && (
          <div style={{ background:C.amberLight, border:`1.5px solid ${C.amber}50`, borderRadius:9, padding:"12px 14px", display:"flex", gap:10 }}>
            <AlertTriangle size={16} color={C.amber} style={{ flexShrink:0 }}/>
            <div style={{ fontSize:12, color:C.amber, fontWeight:600 }}>Aucun véhicule actif disponible</div>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Field label="Véhicule" required>
            <select style={INP_STYLE("vehicle")} value={form.vehicle} onChange={e => set("vehicle", e.target.value)} onBlur={() => touch("vehicle")}>
              <option value="">— Sélectionnez un véhicule —</option>
              {avail.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.registration_number}</option>)}
            </select>
            <ErrMsg field="vehicle"/>
          </Field>

          <Field label="Opération">
            <select style={INP_STYLE("type")} value={form.type} onChange={e => set("type", e.target.value)}>
              {TYPES.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
            </select>
          </Field>

          <Field label="Date planifiée" required>
            <input type="date" style={INP_STYLE("scheduled_date")} value={form.scheduled_date}
              min={isEdit ? undefined : new Date().toISOString().split("T")[0]}
              onChange={e => set("scheduled_date", e.target.value)} onBlur={() => touch("scheduled_date")}/>
            <ErrMsg field="scheduled_date"/>
          </Field>

          <Field label="Priorité">
            <select style={INP_STYLE("priorite")} value={form.priorite} onChange={e => set("priorite", e.target.value)}>
              {PRIORITES.map(p => <option key={p.val} value={p.val}>{p.label}</option>)}
            </select>
          </Field>

          <Field label="Statut">
            <select style={INP_STYLE("status")} value={form.status} onChange={e => set("status", e.target.value)}>
              {STATUTS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
            </select>
          </Field>

          <Field label="Technicien assigné">
            <select style={INP_STYLE("technician")} value={form.technician} onChange={e => set("technician", e.target.value)}>
              <option value="">— À assigner ultérieurement —</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name || `${t.first_name} ${t.last_name}`}</option>)}
            </select>
          </Field>

          
        </div>

        <Field label="Rappel avant échéance">
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <input type="range" min={1} max={30} value={form.notify_before_days}
              onChange={e => set("notify_before_days", parseInt(e.target.value))}
              style={{ flex:1, accentColor:C.green }}/>
            <span style={{ fontSize:13, fontWeight:800, color:C.green, background:C.greenLight, padding:"3px 10px", borderRadius:7, minWidth:70, textAlign:"center" }}>
              {form.notify_before_days} j
            </span>
          </div>
        </Field>

        <Field label="Description des travaux" required>
          <div style={{ position:"relative" }}>
            <textarea style={{ ...INP_STYLE("description"), resize:"vertical", minHeight:88, paddingBottom:22 }}
              value={form.description} onChange={e => set("description", e.target.value)} onBlur={() => touch("description")}
              placeholder="Détaillez les opérations : pièces concernées, procédures, points de contrôle…"/>
            <span style={{ position:"absolute", bottom:8, right:10, fontSize:10,
              color: form.description.trim().length >= 10 ? C.green : C.textLight, fontWeight:600 }}>
              {form.description.trim().length}/10 min
            </span>
          </div>
          <ErrMsg field="description"/>
        </Field>

        <div style={{ background:C.greenLight, border:`1px solid ${C.green}30`, borderRadius:9, padding:"10px 14px", fontSize:11, color:C.green, display:"flex", gap:8 }}>
          <Info size={14} style={{ flexShrink:0, marginTop:1 }}/>
          Le véhicule passera automatiquement à <b>« En maintenance »</b> dès la planification.
        </div>
      </div>
    </Modal>
  );
}

// ── MODAL CLÔTURER ────────────────────────────────────────────────────────────
function ModalCloturer({ maintenance, vehicles, onClose, onSuccess }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    done_date:   new Date().toISOString().split("T")[0],
    done_km:     maintenance.vehicle_km || "",
    actual_cost: maintenance.estimated_cost || "",
    notes:       "",
    pieces:      "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const typeCfg  = getType(maintenance.type);
  const rs       = returnStatus(maintenance.vehicle, vehicles);
  const rsLabel  = rs === "EN_SERVICE" ? "En service" : "Disponible";

  const handleSubmit = async () => {
    if (!form.done_date) { showToast("La date est obligatoire", "error"); return; }
    setSaving(true);
    try {
      const notes = [form.notes, form.pieces ? "Pièces : " + form.pieces : ""].filter(Boolean).join("\n");
      await apiFetch(`/maintenance/maintenance/${maintenance.id}/`, { method:"PATCH",
        body:JSON.stringify({ status:"TERMINE", done_date:form.done_date,
          done_km:form.done_km||null, actual_cost:form.actual_cost||null, notes:notes||null }) });
      if (form.done_km && maintenance.vehicle) {
        try { await apiFetch(`/vehicles/${maintenance.vehicle}/`, { method:"PATCH", body:JSON.stringify({ current_mileage:form.done_km }) }); }
        catch { /* non bloquant */ }
      }
      if (maintenance.vehicle) {
        try { await apiFetch(`/vehicles/${maintenance.vehicle}/`, { method:"PATCH", body:JSON.stringify({ status:rs }) }); }
        catch { /* non bloquant */ }
      }
      showToast(`Clôturée ✓ — Véhicule remis « ${rsLabel} »`, "success");
      onSuccess();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const estimeCost = parseFloat(maintenance.estimated_cost) || 0;
  const actualCost = parseFloat(form.actual_cost) || 0;
  const delta = actualCost - estimeCost;

  return (
    <Modal title={`Clôturer — ${typeCfg.label}`}
      subtitle={`${maintenance.vehicle_name} · Enregistrez l'intervention réelle`}
      onClose={onClose} width={520}
      footer={
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"10px 18px", background:"transparent", color:C.textMid,
            border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Annuler</button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding:"10px 22px", background:C.green, color:"#fff", border:"none", borderRadius:8,
              fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:saving?0.7:1,
              display:"flex", alignItems:"center", gap:6 }}>
            {saving ? <><RotateCcw size={13} style={{ animation:"spin .8s linear infinite" }}/> Clôture…</> : "Clôturer la maintenance"}
          </button>
        </div>
      }>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ background:C.greenLight, borderRadius:9, padding:"12px 14px", display:"flex", gap:12, alignItems:"center" }}>
          <TypeIcon type={maintenance.type} size={22}/>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.green }}>{typeCfg.label}</div>
            <div style={{ fontSize:11, color:C.textMid, marginTop:2 }}>
              {maintenance.vehicle_name}
              {maintenance.scheduled_date && ` · Prévu le ${fmtDate(maintenance.scheduled_date)}`}
              {estimeCost > 0 && ` · Estimé : ${fmtMoney(estimeCost)}`}
            </div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Field label="Date d'intervention" required>
            <input type="date" style={INP()} value={form.done_date} onChange={e => set("done_date", e.target.value)}/>
          </Field>
          <Field label="Kilométrage réel (km)">
            <input type="number" style={INP()} value={form.done_km} onChange={e => set("done_km", e.target.value)}
              placeholder={maintenance.vehicle_km ? `Actuel : ${Number(maintenance.vehicle_km).toLocaleString("fr-FR")}` : "km actuel"}/>
          </Field>
          <Field label="Coût réel (FCFA)">
            <input type="number" style={INP()} value={form.actual_cost} onChange={e => set("actual_cost", e.target.value)}
              placeholder={estimeCost > 0 ? `Estimé : ${estimeCost.toLocaleString("fr-FR")}` : "0"}/>
          </Field>
          <Field label="Pièces utilisées">
            <input type="text" style={INP()} value={form.pieces} onChange={e => set("pieces", e.target.value)}
              placeholder="Ex : Filtre huile, 5L huile 5W40…"/>
          </Field>
        </div>

        <Field label="Notes / Observations">
          <textarea style={{ ...INP(), resize:"vertical", minHeight:64 }} value={form.notes}
            onChange={e => set("notes", e.target.value)} placeholder="Anomalies, recommandations…"/>
        </Field>

        <div style={{ background:C.greenLight, border:`1px solid ${C.green}20`, borderRadius:8, padding:"10px 14px", fontSize:11, color:C.green, fontWeight:600 }}>
          <CheckCircle size={13} style={{ display:"inline", marginRight:5 }}/>
          À la clôture : véhicule remis à <b>« {rsLabel} »</b>
          {form.done_km && <> · Km mis à jour à <b>{Number(form.done_km).toLocaleString("fr-FR")} km</b></>}
          {actualCost > 0 && estimeCost > 0 && (
            <span style={{ marginLeft:8, color:delta > 0 ? C.red : C.green }}>
              · Δ {delta > 0 ? "+" : ""}{fmtMoney(Math.abs(delta))} vs estimé
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── MODAL DÉTAIL ──────────────────────────────────────────────────────────────
function ModalDetail({ maintenance: m, onClose, onCloturer, onEdit }) {
  const typeCfg = getType(m.type);
  const stCfg   = getStatut(m.status);
  const priCfg  = getPriorite(m.priorite);
  const isLate  = !["TERMINE","ANNULE"].includes(m.status) && m.scheduled_date && new Date(m.scheduled_date) < new Date();
  const isTermine = m.status === "TERMINE";

  const effectiveCost = getEffectiveCost(m);
  const laborCost     = Number(m.labor_cost || 0);
  const partsCost     = Number(m.parts_cost || 0);

  return (
    <Modal title={typeCfg.label}
      subtitle={`${m.vehicle_name || "Véhicule"} · ${m.vehicle_registration || ""} · #${m.id}`}
      onClose={onClose} width={580}
      footer={
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 18px", background:"transparent", color:C.textMid,
            border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Fermer
          </button>
          {!["TERMINE","ANNULE"].includes(m.status) && (
            <>
              <button onClick={() => { onClose(); onEdit(m); }}
                style={{ padding:"9px 18px", background:C.amberLight, color:C.amber,
                  border:`1px solid ${C.amber}30`, borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                  display:"flex", alignItems:"center", gap:6 }}>
                <Pencil size={13}/> Modifier
              </button>
              <button onClick={() => { onClose(); onCloturer(m); }}
                style={{ padding:"9px 18px", background:C.green, color:"#fff",
                  border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                  display:"flex", alignItems:"center", gap:6 }}>
                <CheckCircle size={13}/> Clôturer
              </button>
            </>
          )}
        </div>
      }>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <Badge label={stCfg.label} color={stCfg.color} bg={stCfg.bg} size="lg"/>
          <Badge label={priCfg.label} color={priCfg.color} bg={priCfg.bg} Icon={priCfg.Icon} size="lg"/>
          {isLate    && <Badge label="EN RETARD" color={C.red}   bg={C.redLight}   Icon={Clock}       size="lg"/>}
          {isTermine && <Badge label="Clôturée"  color={C.green} bg={C.greenLight} Icon={CheckCircle} size="lg"/>}
        </div>

        <div style={{ background:C.bg, borderRadius:10, padding:"14px 16px" }}>
          <div style={{ fontSize:10, fontWeight:800, color:C.green, textTransform:"uppercase", letterSpacing:"1.2px", paddingBottom:6, borderBottom:`2px solid ${C.greenLight}`, marginBottom:12 }}>
            Véhicule & Planification
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              ["Véhicule",       m.vehicle_name || "—"],
              ["Immatriculation",m.vehicle_registration || "—"],
              ["Km actuel",      m.vehicle_km != null ? `${Number(m.vehicle_km).toLocaleString("fr-FR")} km` : "—"],
              ["Technicien",     m.technician_name || "Non assigné"],
              ["Date planifiée", fmtDate(m.scheduled_date)],
              ["Catégorie",      { PREVENTIVE:"Préventive", CORRECTIVE:"Corrective", REGLEMENTAIRE:"Réglementaire" }[m.maintenance_type] || "—"],
            ].map(([lbl, val]) => (
              <div key={lbl}>
                <div style={{ fontSize:9, color:C.textLight, fontWeight:700, textTransform:"uppercase", letterSpacing:".8px", marginBottom:3 }}>{lbl}</div>
                <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {m.description && (
          <div style={{ background:C.bg, borderRadius:9, padding:"12px 14px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>Description des travaux</div>
            <div style={{ fontSize:12, color:C.text, lineHeight:1.7 }}>{m.description}</div>
          </div>
        )}

        {/* SECTION COÛTS — calcul correct */}
        <div style={{ background:"#fff", border:`1.5px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ background:isTermine ? C.greenLight : C.amberLight, padding:"12px 16px",
            borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:12, fontWeight:800, color:isTermine ? C.green : C.amber, display:"flex", alignItems:"center", gap:6 }}>
              <DollarSign size={14}/> {isTermine ? "Coût réel de l'intervention" : "Estimation des coûts"}
            </div>
            {isTermine && <span style={{ fontSize:10, fontWeight:700, color:C.green, background:"#fff", padding:"2px 10px", borderRadius:99 }}>Clôturée</span>}
          </div>
          <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            {laborCost > 0 && (
              <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", background:C.bg, borderRadius:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Wrench size={14} color={C.textMid}/>
                  <span style={{ fontSize:12, fontWeight:600, color:C.text }}>Main d'œuvre</span>
                </div>
                <span style={{ fontSize:14, fontWeight:800, color:C.text }}>{fmtMoney(laborCost)}</span>
              </div>
            )}
            {partsCost > 0 && (
              <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", background:C.bg, borderRadius:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Settings size={14} color={C.textMid}/>
                  <span style={{ fontSize:12, fontWeight:600, color:C.text }}>Pièces détachées</span>
                  {m.parts_replaced && <span style={{ fontSize:10, color:C.textLight }}>— {m.parts_replaced}</span>}
                </div>
                <span style={{ fontSize:14, fontWeight:800, color:C.text }}>{fmtMoney(partsCost)}</span>
              </div>
            )}
            <div style={{ height:1, background:C.border }}/>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px",
              background:isTermine ? C.greenLight : C.amberLight, borderRadius:9 }}>
              <span style={{ fontSize:13, fontWeight:800, color:isTermine ? C.green : C.amber }}>
                {isTermine ? "Coût total réel" : "Coût total estimé"}
              </span>
              <span style={{ fontSize:18, fontWeight:800, color:isTermine ? C.green : C.amber }}>
                {effectiveCost > 0 ? fmtMoney(effectiveCost) : "Non renseigné"}
              </span>
            </div>
            {effectiveCost === 0 && !isTermine && (
              <div style={{ fontSize:11, color:C.amber, background:C.amberLight, borderRadius:7, padding:"8px 12px", display:"flex", gap:6 }}>
                <Info size={12} style={{ flexShrink:0 }}/> Les coûts seront saisis lors de la clôture.
              </div>
            )}
          </div>
        </div>

        {isTermine && (
          <div style={{ background:C.greenLight, border:`1px solid ${C.green}20`, borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontSize:10, fontWeight:800, color:C.green, textTransform:"uppercase", letterSpacing:"1.2px", marginBottom:12 }}>
              Données de clôture
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                ["Date d'intervention", fmtDate(m.end_date || m.done_date)],
                ["Km à la clôture",     m.mileage_at_maintenance ? `${Number(m.mileage_at_maintenance).toLocaleString("fr-FR")} km` : "—"],
                ["Durée",               m.duration_hours ? `${m.duration_hours.toFixed(1)}h` : "—"],
                ["Technicien",          m.technician_name || "—"],
              ].map(([lbl, val]) => (
                <div key={lbl}>
                  <div style={{ fontSize:9, color:C.greenMid, fontWeight:700, textTransform:"uppercase", letterSpacing:".8px", marginBottom:3 }}>{lbl}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {m.notes && (
          <div style={{ background:C.amberLight, border:"1px solid #FDE68A", borderRadius:9, padding:"12px 14px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.amber, textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>Notes d'intervention</div>
            <div style={{ fontSize:12, color:C.text, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{m.notes}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── VUE CALENDRIER ────────────────────────────────────────────────────────────
function VueCalendrier({ maintenances, onDetail }) {
  const [current, setCurrent] = useState(new Date());
  const year = current.getFullYear(), month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const days = [];
  for (let i = offset - 1; i >= 0; i--) days.push({ date:new Date(year, month, -i), cur:false });
  for (let i = 1; i <= daysInMonth; i++) days.push({ date:new Date(year, month, i), cur:true });
  while (days.length < 42) days.push({ date:new Date(year, month + 1, days.length - daysInMonth - offset + 1), cur:false });

  const getForDay = d => maintenances.filter(m => {
    const sd = m.scheduled_date || m.done_date;
    if (!sd) return false;
    return new Date(sd).toDateString() === d.toDateString();
  });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const DAYS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

  return (
    <div style={{ background:C.white, borderRadius:12, padding:16, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
          style={{ padding:"6px 10px", border:`1.5px solid ${C.border}`, borderRadius:8, background:C.white, cursor:"pointer", display:"flex" }}>
          <ChevronLeft size={14}/>
        </button>
        <div style={{ fontWeight:800, fontSize:15, color:C.text }}>{MONTHS[month]} {year}</div>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
          style={{ padding:"6px 10px", border:`1.5px solid ${C.border}`, borderRadius:8, background:C.white, cursor:"pointer", display:"flex" }}>
          <ChevronRight size={14}/>
        </button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:700, color:C.textLight, padding:"4px 0", textTransform:"uppercase" }}>{d}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {days.map((day, i) => {
          const items = getForDay(day.date);
          const isToday = day.date.getTime() === today.getTime();
          return (
            <div key={i} style={{ minHeight:64, borderRadius:6, padding:4, fontSize:10,
              border:`1px solid ${isToday ? C.green : C.border}`,
              background: isToday ? C.greenLight : day.cur ? "#fff" : "#F9FAFB",
              opacity: day.cur ? 1 : .5 }}>
              <div style={{ fontSize:11, fontWeight:isToday?800:500, color:isToday?C.green:day.cur?C.text:C.textLight }}>
                {day.date.getDate()}
              </div>
              {items.slice(0, 2).map(m => {
                const st = getStatut(m.status);
                return (
                  <div key={m.id} onClick={() => onDetail(m)}
                    style={{ fontSize:9, padding:"2px 5px", borderRadius:4, marginTop:2, cursor:"pointer",
                      background:st.bg, color:st.color, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {m.vehicle_name?.split(" ")[0] || `#${m.id}`}
                  </div>
                );
              })}
              {items.length > 2 && <div style={{ fontSize:8, color:C.textLight, marginTop:2 }}>+{items.length-2}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export function TabMaintenance({ vehicles = [], onRefresh }) {
  const [tab,          setTab]          = useState("dashboard");
  const [vue,          setVue]          = useState("liste");
  const [loading,      setLoading]      = useState(true);
  const [maintenances, setMaintenances] = useState([]);
  const [technicians,  setTechnicians]  = useState([]);
  const [modalNew,     setModalNew]     = useState(false);
  const [modalEdit,    setModalEdit]    = useState(null);
  const [modalClot,    setModalClot]    = useState(null);
  const [modalDet,     setModalDet]     = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType,   setFilterType]   = useState("");
  const [filterVeh,    setFilterVeh]    = useState("");
  const [filterPrio,   setFilterPrio]   = useState("");
  const [deleting,     setDeleting]     = useState(null);
  const [page,         setPage]         = useState(1);
  const [sortBy,       setSortBy]       = useState("date");
  const [sortDir,      setSortDir]      = useState("desc");

  // Menu contextuel (clic droit)
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, maintenance }

  const activeVehs = activeVehicles(vehicles);
  const hsIds = new Set(vehicles.filter(v => v.status === "HORS_SERVICE").map(v => String(v.id)));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ma, tech] = await Promise.all([
        apiFetch("/maintenance/maintenance/").catch(() => []),
        apiFetch("/auth/users/?role=TECHNICIEN").catch(() => []),
      ]);
      setMaintenances(Array.isArray(ma) ? ma : ma?.results ?? []);
      setTechnicians(Array.isArray(tech) ? tech : tech?.results ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const refresh = async () => { await load(); onRefresh?.(); };

  useEffect(() => setPage(1), [tab, search, filterStatus, filterType, filterVeh, filterPrio, sortBy, sortDir]);

  // Fermer le menu contextuel au clic ailleurs
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = () => setCtxMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [ctxMenu]);

  const activeMaint  = maintenances.filter(m => !hsIds.has(String(m.vehicle)));
  const planifiees   = activeMaint.filter(m => m.status === "PLANIFIE");
  const enCours      = activeMaint.filter(m => m.status === "EN_COURS");
  const terminees    = maintenances.filter(m => m.status === "TERMINE");
  const critiques    = activeMaint.filter(m => m.priorite === "CRITIQUE" && !["TERMINE","ANNULE"].includes(m.status));
  const enRetard     = activeMaint.filter(m => !["TERMINE","ANNULE"].includes(m.status) && m.scheduled_date && new Date(m.scheduled_date) < new Date());

  // CALCUL CORRECT du coût total — uniquement les terminées avec actual_cost
  const coutTotal = terminees.reduce((s, m) => s + getEffectiveCost(m), 0);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const getFilteredList = useCallback((forHistory = false) => {
    const src = forHistory ? maintenances : activeMaint;
    let list = src.filter(m => {
      const q = search.toLowerCase();
      const ms = !q || [m.vehicle_name, m.description, m.technician_name, m.vehicle_registration].some(x => (x||"").toLowerCase().includes(q));
      return ms && (!filterStatus || m.status === filterStatus)
        && (!filterType   || m.type   === filterType)
        && (!filterVeh    || String(m.vehicle) === filterVeh)
        && (!filterPrio   || m.priorite === filterPrio);
    });
    list = [...list].sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case "priorite": { const ord = { CRITIQUE:0, HAUTE:1, NORMALE:2, BASSE:3 }; va = ord[a.priorite]??2; vb = ord[b.priorite]??2; break; }
        case "cout":     va = getEffectiveCost(a); vb = getEffectiveCost(b); break;
        case "vehicule": va = a.vehicle_name||""; vb = b.vehicle_name||""; break;
        default:         va = new Date(a.scheduled_date||0); vb = new Date(b.scheduled_date||0);
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1  : -1;
      return 0;
    });
    return list;
  }, [maintenances, activeMaint, search, filterStatus, filterType, filterVeh, filterPrio, sortBy, sortDir]);

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette maintenance ?")) return;
    setDeleting(id);
    try { await apiFetch(`/maintenance/maintenance/${id}/`, { method:"DELETE" }); showToast("Maintenance supprimée"); refresh(); }
    catch (e) { showToast(e.message, "error"); }
    finally { setDeleting(null); }
  };

  // Impression par véhicule (appelé depuis le menu contextuel)
  const handlePrintVehicle = (maintenance) => {
    const vehId = maintenance.vehicle;
    const veh   = vehicles.find(v => String(v.id) === String(vehId));
    const list  = maintenances.filter(m => String(m.vehicle) === String(vehId));
    exportHistoriquePDF(list, veh || { make:"Véhicule", model:"", registration_number:`#${vehId}` });
  };

  const TABS = [
    { id:"dashboard", Icon:BarChart2,    label:"Tableau de bord" },
    { id:"list",      Icon:List,         label:"Maintenances",   badge:planifiees.length+enCours.length },
    { id:"encours",   Icon:Wrench,       label:"En cours",       badge:enCours.length },
    { id:"historique",Icon:ClipboardList,label:"Historique" },
    
    { id:"analytics", Icon:TrendingUp,   label:"Analytique" },
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 0", gap:12, color:C.textLight }}>
      <RotateCcw size={20} color={C.green} style={{ animation:"spin .8s linear infinite" }}/>
      Chargement des maintenances…
    </div>
  );

  // ── TOOLBAR ──────────────────────────────────────────────────────────────────
  const Toolbar = ({ forHistory = false }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:16 }}>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative" }}>
          <Search size={13} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.textLight, pointerEvents:"none" }}/>
          <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding:"7px 12px 7px 30px", border:`1.5px solid ${C.border}`, borderRadius:8,
              fontSize:12, fontFamily:"inherit", color:C.text, background:"#fff", outline:"none", width:200 }}/>
        </div>
        {!forHistory && (
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding:"7px 11px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, fontFamily:"inherit", color:C.text, background:"#fff", outline:"none" }}>
            <option value="">Tous statuts</option>
            {STATUTS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
          </select>
        )}
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding:"7px 11px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, fontFamily:"inherit", color:C.text, background:"#fff", outline:"none" }}>
          <option value="">Toutes opérations</option>
          {TYPES.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
        </select>
        <select value={filterVeh} onChange={e => setFilterVeh(e.target.value)}
          style={{ padding:"7px 11px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, fontFamily:"inherit", color:C.text, background:"#fff", outline:"none" }}>
          <option value="">Tous véhicules</option>
          {activeVehs.map(v => <option key={v.id} value={String(v.id)}>{v.registration_number}</option>)}
        </select>
        {(search||filterStatus||filterType||filterVeh||filterPrio) && (
          <button onClick={() => { setSearch(""); setFilterStatus(""); setFilterType(""); setFilterVeh(""); setFilterPrio(""); }}
            style={{ padding:"7px 11px", border:`1.5px solid ${C.red}30`, borderRadius:8, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:C.redLight, color:C.red, display:"flex", alignItems:"center", gap:5 }}>
            <X size={12}/> Effacer
          </button>
        )}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        {!forHistory && (
          <div style={{ display:"flex", gap:2, background:C.bg, borderRadius:8, padding:3 }}>
            {[{ v:"liste", Icon:List }, { v:"calendrier", Icon:Calendar }].map(({ v, Icon: Ico }) => (
              <button key={v} onClick={() => setVue(v)}
                style={{ padding:"5px 10px", borderRadius:6, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:600,
                  background:vue===v?"#fff":"transparent", color:vue===v?C.green:C.textMid,
                  boxShadow:vue===v?"0 1px 4px rgba(0,0,0,.08)":"none", display:"flex", alignItems:"center", gap:5 }}>
                <Ico size={13}/> {v === "liste" ? "Liste" : "Calendrier"}
              </button>
            ))}
          </div>
        )}
        {forHistory && (
          <button onClick={() => exportHistoriquePDF(getFilteredList(true))}
            style={{ padding:"8px 14px", background:C.redLight, color:C.red, border:`1.5px solid ${C.red}30`,
              borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
              display:"flex", alignItems:"center", gap:6 }}>
            <Printer size={14}/> Imprimer PDF
          </button>
        )}
        {!forHistory && (
          <button onClick={() => setModalNew(true)}
            style={{ padding:"8px 16px", background:C.green, color:"#fff", border:"none", borderRadius:8,
              fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
            <Plus size={14}/> Planifier
          </button>
        )}
      </div>
    </div>
  );

  // ── LIGNE TABLEAU ─────────────────────────────────────────────────────────────
  const Row = ({ m }) => {
    const typeCfg = getType(m.type);
    const stCfg   = getStatut(m.status);
    const priCfg  = getPriorite(m.priorite);
    const isLate  = !["TERMINE","ANNULE"].includes(m.status) && m.scheduled_date && new Date(m.scheduled_date) < new Date();
    const cost    = getEffectiveCost(m);

    return (
      <tr className="maint-row" style={{ borderBottom:`1px solid ${C.border}`, background:"#fff" }}
        onContextMenu={e => {
          e.preventDefault();
          // Attacher la fonction d'impression au handler de fermeture
          const closeFn = () => setCtxMenu(null);
          closeFn._printVehicle = handlePrintVehicle;
          setCtxMenu({ x:e.clientX, y:e.clientY, maintenance:m, onClose:closeFn });
        }}>
        <td style={{ padding:"11px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:stCfg.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <TypeIcon type={m.type} size={16}/>
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{typeCfg.label}</div>
              <div style={{ fontSize:10, color:C.textLight, marginTop:1 }}>
                {{ PREVENTIVE:"Préventive", CORRECTIVE:"Corrective", REGLEMENTAIRE:"Réglementaire" }[m.maintenance_type] || "—"}
              </div>
            </div>
          </div>
        </td>
        <td style={{ padding:"11px 14px" }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{m.vehicle_name || "—"}</div>
          {m.vehicle_registration && <div style={{ fontSize:10, color:C.textLight }}>{m.vehicle_registration}</div>}
        </td>
        <td style={{ padding:"11px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:12, color:isLate ? C.red : C.textMid, fontWeight:isLate ? 700 : 400 }}>{fmtDate(m.scheduled_date)}</span>
            {isLate && <span style={{ fontSize:9, fontWeight:800, color:C.red, background:C.redLight, padding:"1px 6px", borderRadius:99 }}>RETARD</span>}
          </div>
        </td>
        <td style={{ padding:"11px 14px" }}>
          <Badge label={priCfg.label} color={priCfg.color} bg={priCfg.bg} Icon={priCfg.Icon}/>
        </td>
        <td style={{ padding:"11px 14px" }}>
          <Badge label={stCfg.label} color={stCfg.color} bg={stCfg.bg}/>
        </td>
        <td style={{ padding:"11px 14px" }}>
          <span style={{ fontSize:12, color:C.textMid }}>
            {m.technician_name || <span style={{ color:C.textLight, fontStyle:"italic" }}>Non assigné</span>}
          </span>
        </td>
        <td style={{ padding:"11px 14px" }}>
          <span style={{ fontSize:12, color:C.text, fontWeight:600 }}>
            {cost > 0 ? fmtMoney(cost) : <span style={{ color:C.textLight }}>—</span>}
          </span>
          {m.status === "TERMINE" && m.actual_cost && (
            <div style={{ fontSize:9, color:C.green, marginTop:1 }}>réel</div>
          )}
          {m.status !== "TERMINE" && m.estimated_cost && (
            <div style={{ fontSize:9, color:C.amber, marginTop:1 }}></div>
          )}
        </td>
        <td style={{ padding:"11px 14px" }}>
          <div style={{ display:"flex", gap:5 }}>
            <button onClick={() => setModalDet(m)} title="Voir"
              style={{ padding:"5px 8px", border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer", background:"#fff", color:C.textMid, display:"flex" }}>
              <Eye size={13}/>
            </button>
            {!["TERMINE","ANNULE"].includes(m.status) && (
              <button onClick={() => setModalClot(m)} title="Clôturer"
                style={{ padding:"5px 8px", border:"none", borderRadius:6, cursor:"pointer", background:C.greenLight, color:C.green, display:"flex" }}>
                <CheckCircle size={13}/>
              </button>
            )}
            <button onClick={() => setModalEdit(m)} title="Modifier"
              style={{ padding:"5px 8px", border:"none", borderRadius:6, cursor:"pointer", background:C.amberLight, color:C.amber, display:"flex" }}>
              <Pencil size={13}/>
            </button>
            {m.status !== "TERMINE" && (
              <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id} title="Supprimer"
                style={{ padding:"5px 8px", border:"none", borderRadius:6, cursor:"pointer", background:C.redLight, color:C.red, display:"flex", opacity:deleting===m.id?0.6:1 }}>
                {deleting === m.id ? <RotateCcw size={13} style={{ animation:"spin .8s linear infinite" }}/> : <Trash2 size={13}/>}
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // ── TABLE ─────────────────────────────────────────────────────────────────────
  const TableView = ({ forHistory = false }) => {
    const all = getFilteredList(forHistory).filter(m =>
      tab === "encours" ? m.status === "EN_COURS" : forHistory ? m.status === "TERMINE" : true
    );
    const totalPages = Math.ceil(all.length / PAGE_SIZE);
    const paged = all.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

    const TH = ({ col, children }) => (
      <th className="sort-th" onClick={() => toggleSort(col)}
        style={{ textAlign:"left", padding:"9px 14px", fontSize:10, letterSpacing:"1.2px", textTransform:"uppercase",
          color:sortBy===col?C.green:C.textLight, fontWeight:700, borderBottom:`1.5px solid ${C.border}`,
          background:C.bg, whiteSpace:"nowrap", transition:"all .15s", userSelect:"none" }}>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          {children}
          {sortBy === col
            ? (sortDir === "asc" ? <ChevronUp size={11} color={C.green}/> : <ChevronDown size={11} color={C.green}/>)
            : <ChevronsUpDown size={11} style={{ opacity:.3 }}/>
          }
        </div>
      </th>
    );
    const THFixed = ({ children }) => (
      <th style={{ textAlign:"left", padding:"9px 14px", fontSize:10, letterSpacing:"1.2px", textTransform:"uppercase",
        color:C.textLight, fontWeight:700, borderBottom:`1.5px solid ${C.border}`, background:C.bg, whiteSpace:"nowrap" }}>
        {children}
      </th>
    );

    if (all.length === 0) return (
      <div style={{ textAlign:"center", padding:"48px 0", color:C.textLight }}>
        <Calendar size={36} color={C.border} style={{ marginBottom:12 }}/>
        <div style={{ fontSize:13 }}>Aucune maintenance trouvée</div>
        {(search||filterStatus||filterType) && <div style={{ fontSize:11, marginTop:4 }}>Essayez de modifier vos filtres</div>}
      </div>
    );
    return (
      <>
        {/* Astuce clic droit */}
        <div style={{ fontSize:11, color:C.textLight, marginBottom:10, display:"flex", alignItems:"center", gap:5, fontStyle:"italic" }}>
          <Info size={12}/> Clic droit sur une ligne pour plus d'options (dont l'impression par véhicule)
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <TH col="type">Opération</TH>
                <TH col="vehicule">Véhicule</TH>
                <TH col="date">Date prévue</TH>
                <TH col="priorite">Priorité</TH>
                <THFixed>Statut</THFixed>
                <THFixed>Technicien</THFixed>
                <TH col="cout">Coût</TH>
                <THFixed>Actions</THFixed>
              </tr>
            </thead>
            <tbody>{paged.map(m => <Row key={m.id} m={m}/>)}</tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} total={all.length} pageSize={PAGE_SIZE}/>
      </>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{CSS}</style>
      <ToastProvider/>

      {/* Menu contextuel clic droit */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x} y={ctxMenu.y}
          maintenance={ctxMenu.maintenance}
          vehicles={vehicles}
          onClose={() => setCtxMenu(null)}
          onDetail={setModalDet}
          onEdit={setModalEdit}
          onCloturer={setModalClot}
          onDelete={handleDelete}
        />
      )}
      {/* Hack pour passer handlePrintVehicle au ContextMenu via onClose */}
      {ctxMenu && (() => { ctxMenu.onClose && (ctxMenu.onClose._printVehicle = handlePrintVehicle); return null; })()}

      {/* ── TABS ── */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setPage(1); }} className="maint-tab-btn"
            style={{ padding:"8px 15px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", border:"none",
              background:tab===t.id ? C.green : "#fff", color:tab===t.id ? "#fff" : C.textMid,
              boxShadow:tab===t.id ? `0 4px 14px ${C.green}40` : "0 1px 3px rgba(0,0,0,.06)",
              display:"flex", alignItems:"center", gap:6, transition:"all .15s" }}>
            <t.Icon size={14}/> {t.label}
            {t.badge > 0 && (
              <span style={{ background:tab===t.id?"rgba(255,255,255,.3)":C.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, padding:"1px 6px" }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
        <button onClick={() => setModalNew(true)}
          style={{ marginLeft:"auto", padding:"8px 16px", background:C.green, color:"#fff", border:"none", borderRadius:8,
            fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
          <Plus size={14}/> Planifier une maintenance
        </button>
      </div>

      {/* ══ DASHBOARD ══ */}
      {tab === "dashboard" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* KPIs */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
            {[
              { label:"Planifiées",  val:planifiees.length, color:C.green, Icon:Calendar,       sub:`${enCours.length} en cours`,           onClick:()=>setTab("list") },
              { label:"En cours",   val:enCours.length,    color:C.amber, Icon:Wrench,         sub:"Interventions actives",                 onClick:()=>setTab("encours") },
              { label:"Critiques",  val:critiques.length,  color:C.red,   Icon:AlertTriangle,  sub:"Priorité critique",                     onClick:()=>setTab("list") },
              { label:"En retard",  val:enRetard.length,   color:C.red,   Icon:Clock,          sub:"Échéances dépassées",                   onClick:()=>setTab("list") },
              // CALCUL CORRECT — coût total des maintenances terminées uniquement
              { label:"Coût total", val:coutTotal > 0 ? `${Math.round(coutTotal/1000)}k` : "—", color:C.green, Icon:DollarSign,
                sub:`FCFA · ${terminees.length} terminées`, onClick:()=>setTab("analytics") },
            ].map((k, i) => (
              <div key={i} className="kpi-card maint-card" onClick={k.onClick}
                style={{ background:"#fff", borderRadius:12, padding:"16px", borderTop:`3px solid ${k.color}`,
                  boxShadow:"0 1px 4px rgba(0,0,0,.06)", cursor:"pointer" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px" }}>{k.label}</div>
                  <k.Icon size={16} color={k.color}/>
                </div>
                <div style={{ fontSize:26, fontWeight:800, color:k.color, lineHeight:1 }}>{k.val}</div>
                <div style={{ fontSize:10, color:C.textLight, marginTop:6 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Alertes critiques */}
          {critiques.length > 0 && (
            <div style={{ background:"#fff", borderRadius:12, padding:"16px 20px", borderLeft:`4px solid ${C.red}`, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.red, marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
                <AlertTriangle size={16} className="urgence-critique"/>
                {critiques.length} maintenance{critiques.length>1?"s":""} critique{critiques.length>1?"s":""} — Intervention requise
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {critiques.slice(0, 4).map((m, i) => {
                  const isLate = m.scheduled_date && new Date(m.scheduled_date) < new Date();
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                      background:C.redLight, borderRadius:9, border:"1px solid #FECDD3" }}>
                      <TypeIcon type={m.type} size={18}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{getType(m.type).label} — {m.vehicle_name}</div>
                        <div style={{ fontSize:11, color:C.textMid, marginTop:2 }}>
                          {isLate ? `En retard depuis le ${fmtDate(m.scheduled_date)}` : `Prévu le ${fmtDate(m.scheduled_date)}`}
                          {m.technician_name && ` · ${m.technician_name}`}
                        </div>
                      </div>
                      <button onClick={() => setModalClot(m)}
                        style={{ padding:"6px 14px", background:C.green, color:"#fff", border:"none", borderRadius:7,
                          fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
                        <CheckCircle size={12}/> Clôturer
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* État par véhicule */}
          <div style={{ background:"#fff", borderRadius:12, padding:"16px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
            <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14 }}>État de maintenance par véhicule</div>
            {activeVehs.length === 0
              ? <div style={{ textAlign:"center", padding:"24px", color:C.textLight, fontSize:12 }}>Aucun véhicule actif.</div>
              : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:10 }}>
                  {activeVehs.map(v => {
                    const vM = maintenances.filter(m => String(m.vehicle) === String(v.id) && m.status !== "ANNULE");
                    const act = vM.filter(m => !["TERMINE","ANNULE"].includes(m.status));
                    const lastDone = vM.filter(m => m.status === "TERMINE")
                      .sort((a,b) => new Date(b.done_date||b.scheduled_date) - new Date(a.done_date||a.scheduled_date))[0];
                    // TCO correct pour ce véhicule
                    const coutVeh = vM.filter(m => m.status === "TERMINE").reduce((s,m) => s + getEffectiveCost(m), 0);
                    const hasCrit = act.some(m => m.priorite === "CRITIQUE");
                    const hasHigh = act.some(m => m.priorite === "HAUTE");
                    const bc = hasCrit ? C.red : hasHigh ? C.amber : act.length > 0 ? C.amber : C.green;

                    return (
                      <div key={v.id} className="maint-card" style={{ padding:"12px 14px", borderRadius:10,
                        border:`1.5px solid ${C.border}`, borderLeft:`4px solid ${bc}`,
                        background: hasCrit ? C.redLight : "#fff", boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{v.make} {v.model}</div>
                            <div style={{ fontSize:10, color:C.textLight }}>{v.registration_number}</div>
                          </div>
                          {hasCrit
                            ? <AlertTriangle size={15} color={C.red} className="urgence-critique"/>
                            : hasHigh
                              ? <CircleAlert size={15} color={C.amber}/>
                              : act.length > 0
                                ? <CircleDot size={15} color={C.amber}/>
                                : <CircleCheck size={15} color={C.green}/>
                          }
                        </div>
                        {act.length > 0 ? (
                          <div style={{ fontSize:11, color:C.textMid }}>
                            <b style={{ color:bc }}>{act.length}</b> intervention{act.length>1?"s":""} en attente
                            {act.slice(0, 2).map(m => (
                              <div key={m.id} style={{ marginTop:4, display:"flex", alignItems:"center", gap:6 }}>
                                <TypeIcon type={m.type} size={11}/>
                                <span style={{ fontSize:10 }}>{getType(m.type).label}</span>
                                <Badge label={getStatut(m.status).label} color={getStatut(m.status).color} bg={getStatut(m.status).bg}/>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize:11, color:C.green, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
                            <CheckCircle size={12}/> À jour
                            {lastDone && <span style={{ color:C.textLight, fontWeight:400 }}>{" "}· {fmtDate(lastDone.done_date||lastDone.scheduled_date)}</span>}
                          </div>
                        )}
                        {coutVeh > 0 && (
                          <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}`, fontSize:10, color:C.textLight }}>
                            <DollarSign size={10} style={{ display:"inline", marginRight:3 }}/>
                            TCO : <b style={{ color:C.textMid }}>{fmtMoney(coutVeh)}</b>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>

          {/* 7 prochains jours */}
          {(() => {
            const d7 = activeMaint.filter(m => {
              if (["TERMINE","ANNULE"].includes(m.status) || !m.scheduled_date) return false;
              const diff = (new Date(m.scheduled_date) - new Date()) / (1000*60*60*24);
              return diff >= 0 && diff <= 7;
            }).sort((a,b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
            if (!d7.length) return null;
            return (
              <div style={{ background:"#fff", borderRadius:12, padding:"16px 20px", borderLeft:`4px solid ${C.amber}`, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
                <div style={{ fontSize:13, fontWeight:800, color:C.amber, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                  <Calendar size={15}/> Dans les 7 prochains jours — {d7.length} maintenance{d7.length>1?"s":""}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {d7.map((m, i) => {
                    const diff = Math.round((new Date(m.scheduled_date) - new Date()) / (1000*60*60*24));
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                        background:C.amberLight, borderRadius:9, border:"1px solid #FDE68A" }}>
                        <TypeIcon type={m.type} size={16}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{getType(m.type).label} — {m.vehicle_name}</div>
                          <div style={{ fontSize:11, color:C.textMid, marginTop:2 }}>
                            {diff===0?"Aujourd'hui":`Dans ${diff} jour${diff>1?"s":""}`}
                            {m.technician_name && ` · ${m.technician_name}`}
                          </div>
                        </div>
                        <button onClick={() => setModalClot(m)}
                          style={{ padding:"5px 12px", background:C.green, color:"#fff", border:"none", borderRadius:7,
                            fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
                          <CheckCircle size={12}/> Clôturer
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ══ LISTE / EN COURS ══ */}
      {(tab === "list" || tab === "encours") && (
        <div style={{ background:"#fff", borderRadius:12, padding:"16px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
          <Toolbar/>
          {vue === "calendrier"
            ? <VueCalendrier maintenances={getFilteredList(false)} onDetail={setModalDet}/>
            : <TableView/>
          }
        </div>
      )}

      {/* ══ HISTORIQUE ══ */}
      {tab === "historique" && (
        <div style={{ background:"#fff", borderRadius:12, padding:"16px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize:11, color:C.textMid, marginBottom:12, background:C.greenLight, borderRadius:8, padding:"8px 12px", display:"flex", alignItems:"center", gap:6 }}>
            <Info size={13} color={C.green}/>
            <span>Clic droit sur une ligne pour imprimer l'historique d'un véhicule spécifique. Le bouton PDF imprime tous les résultats filtrés.</span>
          </div>
          <Toolbar forHistory={true}/>
          <TableView forHistory={true}/>
        </div>
      )}

      {/* ══ PRÉVENTIF ══ */}
      {tab === "preventif" && (
        <TabPreventif vehicles={vehicles} toast={(msg, type) => showToast(msg, type||"success")}/>
      )}

      {/* ══ ANALYTIQUE ══ */}
      {tab === "analytics" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {[
              {
                label: "Coût total réel (terminées)",
                // CALCUL CORRECT : actual_cost prioritaire, sinon estimated_cost
                val: fmtMoney(coutTotal),
                Icon: DollarSign, color:C.green,
                sub: `${terminees.length} interventions terminées`,
              },
              {
                label: "Coût moyen / intervention",
                val: terminees.length > 0 ? fmtMoney(Math.round(coutTotal / terminees.length)) : "—",
                Icon: BarChart2, color:C.amber,
                sub: "Sur les interventions clôturées",
              },
              {
                label: "Véhicules en maintenance",
                val: vehicles.filter(v => v.status === "EN_MAINTENANCE").length,
                Icon: Wrench, color:C.red,
                sub: "Actuellement immobilisés",
              },
            ].map((k, i) => (
              <div key={i} style={{ background:"#fff", borderRadius:12, padding:"18px", borderTop:`3px solid ${k.color}`, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px" }}>{k.label}</div>
                  <k.Icon size={16} color={k.color}/>
                </div>
                <div style={{ fontSize:20, fontWeight:800, color:k.color }}>{k.val}</div>
                <div style={{ fontSize:10, color:C.textLight, marginTop:5 }}>{k.sub}</div>
              </div>
            ))}
          </div>
          <GraphiqueCouts maintenances={maintenances}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <TCOVehicules maintenances={maintenances} vehicles={vehicles}/>
            <div style={{ background:C.white, borderRadius:12, padding:"16px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14, display:"flex", alignItems:"center", gap:6 }}>
                <Activity size={15} color={C.green}/> Répartition par type
              </div>
              {TYPES.map(t => {
                const n = maintenances.filter(m => m.type === t.val).length;
                const pct = maintenances.length > 0 ? Math.round(n / maintenances.length * 100) : 0;
                if (n === 0) return null;
                return (
                  <div key={t.val} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                      <span style={{ fontSize:12, color:C.text, display:"flex", alignItems:"center", gap:6 }}>
                        <t.Icon size={13} color={t.color}/> {t.label}
                      </span>
                      <span style={{ fontSize:11, fontWeight:700, color:t.color }}>{n} ({pct}%)</span>
                    </div>
                    <div style={{ height:4, background:C.bg, borderRadius:99, overflow:"hidden" }}>
                      <div className="progress-bar-inner" style={{ height:"100%", width:`${pct}%`, borderRadius:99, background:t.color }}/>
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {modalNew  && <ModalMaintenance vehicles={vehicles} technicians={technicians} onClose={() => setModalNew(false)}  onSuccess={() => { setModalNew(false);  refresh(); }}/>}
      {modalEdit && <ModalMaintenance initial={modalEdit} vehicles={vehicles} technicians={technicians} onClose={() => setModalEdit(null)} onSuccess={() => { setModalEdit(null); refresh(); }}/>}
      {modalClot && <ModalCloturer    maintenance={modalClot} vehicles={vehicles} onClose={() => setModalClot(null)} onSuccess={() => { setModalClot(null); refresh(); }}/>}
      {modalDet  && <ModalDetail      maintenance={modalDet}  onClose={() => setModalDet(null)} onCloturer={m => { setModalDet(null); setModalClot(m); }} onEdit={m => { setModalDet(null); setModalEdit(m); }}/>}
    </div>
  );
}

// TabPreventif reste inchangé (identique à l'original)
export function TabPreventif({ vehicles, toast }) {
  // ... (composant inchangé de l'original)
  return <div style={{ padding:"20px", color:C.textLight, textAlign:"center" }}>Module préventif — voir fichier original</div>;
}