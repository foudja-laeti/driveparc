
// Dashboard Administrateur — Charte cohérente avec tous les autres dashboards
// Shell identique : sidebar verte flottante + header blanc logo + topbar blanche arrondie
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { C, S, CSS } from "../../constants";
import { Loader, BellIcon, LogoutIcon } from "../../components/ui";
import { TabDepenses }     from "../depenses/TabDepenses";
import { TabRapports }     from "../rapports/TabRapports";
import { TabUtilisateurs } from "../../utilisateurs/Utilisateurs";
import {
  LayoutGrid, Users, DollarSign, BarChart2,
  Car, CheckCircle2, Activity, Wrench, XCircle,
  CalendarCheck, TrendingUp, AlertCircle, AlertTriangle,
  ChevronLeft, ChevronRight, LogOut, Eye,
  ShieldCheck, FileText, BarChart, PieChart,
  ArrowRight, RefreshCw,
} from "lucide-react";

const fmtDate = d => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }) : "—";

// ─────────────────────────────────────────────────────────────────────────────
// CSS ADMIN — s\'appuie sur le CSS global C/S/CSS importé depuis constants
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_CSS = `
  @keyframes adm-fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes adm-pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }

  /* Réutilise les classes globales du gestionnaire */
  .adm-nav-btn:hover   { background:rgba(255,255,255,0.10)!important; color:#fff!important; }
  .adm-logout:hover    { background:rgba(192,24,42,0.35)!important; }
  .adm-collapse:hover  { background:rgba(255,255,255,.15)!important; }
  .adm-icon-btn:hover  { background:#f1f5f9!important; }

  .adm-nav-wrap { position:relative; }
  .adm-tooltip {
    position:absolute; left:calc(100% + 12px); top:50%; transform:translateY(-50%);
    background:#1A2820; color:#fff; padding:5px 10px; border-radius:7px;
    font-size:12px; font-weight:600; white-space:nowrap; pointer-events:none;
    opacity:0; transition:opacity .15s; z-index:9999; box-shadow:0 4px 12px rgba(0,0,0,.25);
  }
  .adm-tooltip::before {
    content:\\'\\'; position:absolute; right:100%; top:50%; transform:translateY(-50%);
    border:5px solid transparent; border-right-color:#1A2820;
  }
  .adm-nav-wrap:hover .adm-tooltip { opacity:1; }

  .adm-sidebar-anim { transition:width .22s cubic-bezier(.4,0,.2,1); }
  .adm-brand-anim   { transition:all .22s cubic-bezier(.4,0,.2,1); }

  .adm-kpi {
    background:#fff; border-radius:13px; padding:18px 20px;
    border:1.5px solid #E2E8E5; position:relative; overflow:hidden;
    transition:transform .18s, box-shadow .18s; animation:adm-fadeUp .25s ease both;
  }
  .adm-kpi::before {
    content:\\'\\'; position:absolute; top:0; left:0; right:0; height:3px;
    background:var(--kc,#1B5E37); border-radius:13px 13px 0 0;
  }
  .adm-kpi:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.07); }

  .adm-section {
    background:#fff; border-radius:13px; border:1.5px solid #E2E8E5;
    padding:18px 20px; animation:adm-fadeUp .25s ease both;
  }
  .adm-section-title { font-size:13px; font-weight:800; color:#1A2820; margin-bottom:3px; display:flex; align-items:center; gap:7px; }
  .adm-section-sub   { font-size:11px; color:#8EA99A; margin-bottom:14px; }

  .adm-bar-track { height:5px; background:#F0F3F1; border-radius:99px; overflow:hidden; }
  .adm-bar-fill  { height:100%; border-radius:99px; transition:width .6s ease; }

  .adm-row {
    display:flex; align-items:center; gap:11px; padding:9px 0;
    border-bottom:1px solid #F0F0F0;
  }
  .adm-row:last-child { border-bottom:none; }

  .adm-quick-btn {
    display:flex; align-items:center; gap:7px; padding:9px 14px;
    border-radius:9px; border:1.5px solid #E2E8E5; background:#fff;
    font-size:12px; font-weight:700; cursor:pointer; font-family:inherit;
    transition:all .13s; color:#4A6358;
  }
  .adm-quick-btn:hover { border-color:#1B5E37; background:#EAF4EE; color:#1B5E37; transform:translateY(-1px); }

  .adm-pulse { animation:adm-pulse 2s ease infinite; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────
const NAV_ADMIN = [
  { id:"dashboard",    Icon:LayoutGrid, label:"Tableau de bord" },
  { id:"utilisateurs", Icon:Users,      label:"Utilisateurs"    },
  { id:"depenses",     Icon:DollarSign, label:"Dépenses"        },
  { id:"rapports",     Icon:BarChart2,  label:"Rapports"        },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONTENU DASHBOARD ADMIN
// ─────────────────────────────────────────────────────────────────────────────
function AdminDashboard({ vehicles, vehStats, reservations, onNav }) {
  const total       = vehStats?.total        ?? vehicles.length;
  const disponibles = vehStats?.disponibles  ?? vehicles.filter(v=>v.status==="DISPONIBLE").length;
  const enService   = vehStats?.en_service   ?? vehicles.filter(v=>v.status==="EN_SERVICE").length;
  const enMaint     = vehStats?.maintenance  ?? vehicles.filter(v=>v.status==="EN_MAINTENANCE").length;
  const horsService = vehStats?.hors_service ?? vehicles.filter(v=>v.status==="HORS_SERVICE").length;
  const txUtilisation = total > 0 ? Math.round(((disponibles + enService) / total) * 100) : 0;
  const txDispo       = total > 0 ? Math.round((disponibles / total) * 100) : 0;

  const kpis = [
    { Icon:Car,          label:"Flotte totale",   val:total,               sub:`${disponibles} disponibles`,       color:C.green,  bg:C.greenLight  },
    { Icon:CheckCircle2, label:"Disponibles",      val:disponibles,         sub:`${txDispo}% du parc`,              color:C.green,  bg:C.greenLight  },
    { Icon:Activity,     label:"En service",       val:enService,           sub:"missions en cours",                color:C.amber,  bg:C.amberLight  },
    { Icon:Wrench,       label:"En maintenance",   val:enMaint,             sub:"immobilisés temp.",                color:enMaint>0?C.red:C.textLight,  bg:enMaint>0?C.redLight:"#F3F4F6"  },
    { Icon:XCircle,      label:"Hors service",     val:horsService,         sub:"hors d\\'usage",                   color:horsService>0?C.red:C.textLight, bg:"#F3F4F6" },
    { Icon:CalendarCheck,label:"Réservations",     val:reservations.length, sub:"en attente de validation",         color:reservations.length>0?C.amber:C.textLight, bg:reservations.length>0?C.amberLight:"#F3F4F6" },
  ];

  const parc_rows = [
    { label:"Disponibles",    count:disponibles, color:C.green   },
    { label:"En service",     count:enService,   color:C.amber   },
    { label:"En maintenance", count:enMaint,     color:C.red     },
    { label:"Hors service",   count:horsService, color:"#6B7280" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Raccourcis */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div style={{ fontSize:12, color:C.textLight }}>Vue de supervision — accès lecture seule aux modules opérationnels</div>
        <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
          {[
            { label:"Utilisateurs", Icon:Users,      tab:"utilisateurs" },
            { label:"Dépenses",     Icon:DollarSign, tab:"depenses"     },
            { label:"Rapports",     Icon:BarChart2,  tab:"rapports"     },
          ].map(btn => (
            <button key={btn.tab} className="adm-quick-btn" onClick={() => onNav(btn.tab)}>
              <btn.Icon size={13}/> {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        {kpis.map((k, i) => (
          <div key={i} className="adm-kpi" style={{ "--kc":k.color }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <span style={{ fontSize:9, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px" }}>{k.label}</span>
              <div style={{ width:30, height:30, borderRadius:7, background:k.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <k.Icon size={15} color={k.color}/>
              </div>
            </div>
            <div style={{ fontSize:28, fontWeight:900, color:k.color, lineHeight:1, marginBottom:3 }}>{k.val}</div>
            <div style={{ fontSize:10, color:C.textLight }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Ligne 2 : Parc + Réservations */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

        <div className="adm-section">
          <div className="adm-section-title"><Car size={14} color={C.green}/> État du parc automobile</div>
          <div className="adm-section-sub">{total} véhicules enregistrés</div>
          {parc_rows.map(row => {
            const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
            return (
              <div key={row.label} style={{ marginBottom:11 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4 }}>
                  <span style={{ color:C.textMid, fontWeight:500 }}>{row.label}</span>
                  <span style={{ fontWeight:800, color:row.color }}>{row.count} <span style={{ fontWeight:400, color:C.textLight }}>({pct}%)</span></span>
                </div>
                <div className="adm-bar-track">
                  <div className="adm-bar-fill" style={{ width:`${pct}%`, background:row.color }}/>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop:12, padding:"10px 13px", background:C.greenLight, borderRadius:9, display:"flex", justifyContent:"space-between", alignItems:"center", border:`1px solid #BBF7D0` }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.green, display:"flex", alignItems:"center", gap:5 }}>
              <TrendingUp size={13}/> Taux d\\'opérabilité
            </span>
            <span style={{ fontSize:20, fontWeight:900, color:C.green }}>{txUtilisation}%</span>
          </div>
        </div>

        <div className="adm-section">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:3 }}>
            <div className="adm-section-title"><CalendarCheck size={14} color={C.amber}/> Réservations en attente</div>
            {reservations.length > 0 && (
              <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:800, background:C.amberLight, color:C.amber, border:`1px solid #FDE68A` }}>
                {reservations.length}
              </span>
            )}
          </div>
          <div className="adm-section-sub">{reservations.length} en attente de validation</div>
          {reservations.length === 0 ? (
            <div style={{ textAlign:"center", padding:"28px 0", color:C.textLight, fontSize:12 }}>
              <CheckCircle2 size={28} color="#BBF7D0" style={{ margin:"0 auto 8px" }}/>
              <div>Aucune réservation en attente</div>
            </div>
          ) : (
            reservations.slice(0, 5).map((r, i) => (
              <div key={i} className="adm-row">
                <div style={{ width:34, height:34, borderRadius:8, flexShrink:0, background:C.amberLight, color:C.amber, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13 }}>
                  {(r.requester_name || "?")[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.requester_name || "—"}</div>
                  <div style={{ fontSize:11, color:C.textMid, display:"flex", alignItems:"center", gap:4 }}>
                    <Car size={10}/> {r.destination || "—"} · {r.number_of_passengers || 1} pers.
                  </div>
                  <div style={{ fontSize:10, color:C.textLight }}>{fmtDate(r.start_date)} → {fmtDate(r.end_date)}</div>
                </div>
                <span style={{ fontSize:10, fontWeight:700, color:C.amber, background:C.amberLight, padding:"2px 8px", borderRadius:5, border:`1px solid #FDE68A`, flexShrink:0 }}>En attente</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ligne 3 : Modules + Droits */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>

        <div className="adm-section">
          <div className="adm-section-title"><ShieldCheck size={14} color={C.green}/> Modules de supervision</div>
          <div className="adm-section-sub">Accès administrateur en lecture / gestion</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              { Icon:LayoutGrid, label:"Tableau de bord",  sub:"Vue d\\'ensemble du parc",      tab:"dashboard",    color:C.green },
              { Icon:Users,      label:"Utilisateurs",      sub:"Gestion des comptes",            tab:"utilisateurs", color:C.green },
              { Icon:DollarSign, label:"Dépenses",          sub:"Suivi financier complet",         tab:"depenses",     color:C.amber },
              { Icon:BarChart2,  label:"Rapports",          sub:"Analytique & exports",           tab:"rapports",     color:C.amber },
            ].map((m, i) => (
              <div key={i} onClick={() => onNav(m.tab)}
                style={{ padding:"12px 14px", borderRadius:9, border:`1.5px solid ${C.border}`, background:C.bg, cursor:"pointer", transition:"all .13s", display:"flex", alignItems:"center", gap:11 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.background = m.color === C.green ? C.greenLight : C.amberLight; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; }}>
                <div style={{ width:36, height:36, borderRadius:8, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:`1.5px solid ${C.border}` }}>
                  <m.Icon size={16} color={m.color}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{m.label}</div>
                  <div style={{ fontSize:10, color:C.textLight }}>{m.sub}</div>
                </div>
                <ArrowRight size={13} color={C.textLight}/>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-section">
          <div className="adm-section-title"><Eye size={14} color={C.amber}/> Rôle Administrateur</div>
          <div className="adm-section-sub">Droits et accès</div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {[
              { label:"Supervision du parc",      ok:true  },
              { label:"Gestion utilisateurs",     ok:true  },
              { label:"Suivi des dépenses",       ok:true  },
              { label:"Rapports & exports",       ok:true  },
              { label:"Approbation réservations", ok:false },
              { label:"Gestion maintenance",      ok:false },
              { label:"Signalements terrain",     ok:false },
            ].map((item, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 9px", borderRadius:7, background:item.ok ? C.greenLight : C.bg }}>
                {item.ok
                  ? <CheckCircle2 size={13} color={C.green}/>
                  : <XCircle size={13} color={C.textLight}/>}
                <span style={{ fontSize:11, fontWeight:item.ok?600:400, color:item.ok?C.text:C.textLight }}>{item.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, padding:"9px 12px", background:C.amberLight, borderRadius:8, border:`1px solid #FDE68A`, fontSize:11, color:C.amber, fontWeight:600, display:"flex", alignItems:"flex-start", gap:7 }}>
            <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>
            Pour les opérations courantes, contactez le gestionnaire de parc.
          </div>
        </div>
      </div>

      {/* Ligne 4 : Alertes */}
      {(enMaint > 0 || horsService > 0 || reservations.length > 0) && (
        <div className="adm-section">
          <div className="adm-section-title"><AlertCircle size={14} color={C.red}/> Points d\\'attention</div>
          <div className="adm-section-sub">Véhicules et opérations nécessitant une attention</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:9 }}>
            {enMaint > 0 && (
              <div style={{ padding:"11px 13px", borderRadius:9, background:C.amberLight, border:`1px solid #FDE68A`, display:"flex", alignItems:"center", gap:10 }}>
                <Wrench size={18} color={C.amber}/>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.amber }}>{enMaint} véhicule{enMaint>1?"s":""} en maintenance</div>
                  <div style={{ fontSize:10, color:C.textLight }}>Immobilisés temporairement</div>
                </div>
              </div>
            )}
            {horsService > 0 && (
              <div style={{ padding:"11px 13px", borderRadius:9, background:C.redLight, border:`1px solid #FECDD3`, display:"flex", alignItems:"center", gap:10 }}>
                <XCircle size={18} color={C.red}/>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.red }}>{horsService} véhicule{horsService>1?"s":""} hors service</div>
                  <div style={{ fontSize:10, color:C.textLight }}>Nécessite intervention</div>
                </div>
              </div>
            )}
            {reservations.length > 0 && (
              <div style={{ padding:"11px 13px", borderRadius:9, background:C.amberLight, border:`1px solid #FDE68A`, display:"flex", alignItems:"center", gap:10 }}>
                <CalendarCheck size={18} color={C.amber}/>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.amber }}>{reservations.length} réservation{reservations.length>1?"s":""} en attente</div>
                  <div style={{ fontSize:10, color:C.textLight }}>À valider par le gestionnaire</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL — shell identique aux autres dashboards
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardAdmin({ onLogout }) {
  const [tab,          setTab]       = useState("dashboard");
  const [user,         setUser]      = useState(null);
  const [vehicles,     setVehicles]  = useState([]);
  const [reservations, setReserv]    = useState([]);
  const [vehStats,     setVehStats]  = useState(null);
  const [loading,      setLoading]   = useState(true);
  const [collapsed,    setCollapsed] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, v, r, st] = await Promise.all([
        apiFetch("/auth/profile/").catch(() => null),
        apiFetch("/vehicles/?page_size=200").catch(() => ({ results:[] })),
        apiFetch("/reservations/?status=EN_ATTENTE&page_size=50").catch(() => ({ results:[] })),
        apiFetch("/vehicles/stats/").catch(() => null),
      ]);
      setUser(u);
      setVehicles(Array.isArray(v) ? v : v?.results ?? []);
      setReserv(Array.isArray(r)   ? r : r?.results ?? []);
      setVehStats(st);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleLogout = () => { localStorage.clear(); sessionStorage.clear(); onLogout?.(); };

  if (loading) return <Loader/>;

  const sidebarWidth = collapsed ? 68 : 220;

  // ── Shell identique au gestionnaire (position:fixed + padding 12px) ──────
  return (
    <div style={{
      position:"fixed", top:0, right:0, bottom:0, left:0,
      display:"flex", overflow:"hidden",
      fontFamily:"\'Inter\',-apple-system,sans-serif",
      background:C.pageBg,
      padding:"12px", gap:"12px",
      boxSizing:"border-box",
    }}>
      <style>{CSS + ADMIN_CSS}</style>

      {/* ── COLONNE SIDEBAR ── */}
      <div className="adm-sidebar-anim"
        style={{ width:sidebarWidth, flexShrink:0, display:"flex", flexDirection:"column", gap:"10px", overflow:"visible" }}>

        {/* Header blanc logo — identique gestionnaire */}
        <div className="adm-brand-anim" style={{
          background:"#fff", borderRadius:14,
          padding:collapsed ? "16px 10px" : "13px 16px",
          display:"flex", alignItems:"center", gap:10,
          justifyContent:collapsed ? "center" : "flex-start",
          boxShadow:"0 1px 4px rgba(0,0,0,0.06)", flexShrink:0, overflow:"hidden",
        }}>
          <img src="/assets/logo (3).png" alt="DriveParc"
            style={{ height:43.14, width:"auto", objectFit:"contain", flexShrink:0 }}/>
          {!collapsed && (
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:"#1e293b", letterSpacing:".4px", lineHeight:1.1 }}>
                <span style={{ color:"#26282a" }}>DRIVE</span>
                <span style={{ color:"#1a8a4a" }}>PARC</span>
              </div>
              <div style={{ fontSize:9, color:"#94a3b8", marginTop:1 }}>Institut Universitaire de la côte</div>
            </div>
          )}
        </div>

        {/* Sidebar verte flottante — identique gestionnaire */}
        <aside style={{
          background:C.sidebar, borderRadius:16, flex:1,
          display:"flex", flexDirection:"column", overflow:"visible",
          boxShadow:"0 4px 20px rgba(26,93,59,0.25)", position:"relative",
        }}>

          {/* Bouton collapse */}
          <button className="adm-collapse" onClick={() => setCollapsed(c => !c)}
            style={{
              position:"absolute", top:20, right:-11, width:22, height:22,
              borderRadius:"50%", background:"#fff", border:`1.5px solid ${C.border}`,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              zIndex:50, boxShadow:"0 2px 6px rgba(0,0,0,.12)", padding:0, color:C.textMid,
              transition:"background .15s",
            }}>
            {collapsed
              ? <ChevronRight size={10} strokeWidth={2.5}/>
              : <ChevronLeft  size={10} strokeWidth={2.5}/>}
          </button>

          {/* Badge rôle */}
          {!collapsed && (
            <div style={{ padding:"10px 14px 4px" }}>
              <div style={{ fontSize:9, color:"rgba(255,255,255,.45)", textTransform:"uppercase", letterSpacing:"1.5px", fontWeight:700 }}>
                Administrateur
              </div>
              <div style={{ marginTop:5, display:"flex", alignItems:"center", gap:5, fontSize:10, background:"rgba(255,255,255,0.10)", borderRadius:6, padding:"4px 8px", color:"rgba(255,255,255,.7)" }}>
                <ShieldCheck size={11} color="#4ADE80"/> Supervision
              </div>
            </div>
          )}

          <div style={{ height:1, background:"rgba(255,255,255,0.10)", margin:"4px 12px" }}/>

          {/* Navigation */}
          <nav style={{ flex:1, padding:"8px 8px", overflowY:"auto", minHeight:0, overflowX:"visible" }}>
            {NAV_ADMIN.map(n => {
              const active = tab === n.id;
              return (
                <div key={n.id} className="adm-nav-wrap">
                  <button onClick={() => setTab(n.id)}
                    style={{
                      display:"flex", alignItems:"center", gap:11, width:"100%",
                      padding:collapsed ? "9px 0" : "8px 10px",
                      justifyContent:collapsed ? "center" : "flex-start",
                      borderRadius:10, border:"none", cursor:"pointer",
                      color: active ? "#fff" : "rgba(255,255,255,0.65)",
                      marginBottom:2, textAlign:"left",
                      background: active ? "rgba(255,255,255,0.18)" : "transparent",
                      fontFamily:"inherit", position:"relative", transition:"all .15s",
                      fontWeight: active ? 600 : 400,
                      boxShadow: active ? "inset 0 0 0 1px rgba(255,255,255,0.12)" : "none",
                    }}
                    className={active ? "" : "adm-nav-btn"}>
                    <span style={{ display:"flex", opacity:active ? 1 : 0.65, flexShrink:0 }}>
                      <n.Icon size={16}/>
                    </span>
                    {!collapsed && <span style={{ fontSize:12, flex:1 }}>{n.label}</span>}
                    {active && !collapsed && (
                      <span style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", width:3, height:16, background:"#fff", borderRadius:99 }}/>
                    )}
                  </button>
                  {collapsed && <div className="adm-tooltip">{n.label}</div>}
                </div>
              );
            })}
          </nav>

          {/* Bas sidebar */}
          <div style={{ padding:"8px 8px 12px", flexShrink:0 }}>
            <div style={{ height:1, background:"rgba(255,255,255,0.10)", margin:"0 12px 8px" }}/>
            {!collapsed && (
              <div style={{ display:"flex", alignItems:"center", gap:9, padding:"6px 6px 8px" }}>
                
                
              </div>
            )}
            <button onClick={handleLogout}
              style={{
                display:"flex", alignItems:"center", gap:8, width:"100%",
                padding:"8px 10px", borderRadius:10, border:"none", cursor:"pointer",
                background:"rgba(192,24,42,0.18)", color:"rgba(255,180,180,0.9)",
                fontSize:11, fontFamily:"inherit", transition:"all .15s",
                justifyContent:collapsed ? "center" : "flex-start",
              }}
              className="adm-logout">
              <LogOut size={14}/>{!collapsed && <span>Déconnexion</span>}
            </button>
          </div>
        </aside>
      </div>

      {/* ── ZONE PRINCIPALE ── */}
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:"10px", overflow:"hidden" }}>

        {/* Topbar blanche arrondie — identique gestionnaire */}
        <header style={{
          background:"#fff", borderRadius:14, padding:"12px 20px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
          overflow:"hidden",
        }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:760, color:C.text, letterSpacing:"-.4px", margin:0 }}>
              {NAV_ADMIN.find(n => n.id === tab)?.label ?? "Tableau de bord"}
            </h1>
            <p style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
              {new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
            </p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {/* Badge Admin */}
            <div style={{ padding:"5px 12px", background:C.amberLight, borderRadius:8, fontSize:11, fontWeight:700, color:C.amber, border:`1px solid #FDE68A`, display:"flex", alignItems:"center", gap:5 }}>
              <ShieldCheck size={13}/> Administrateur
            </div>
            {/* Refresh */}
            <button onClick={loadAll}
              style={{ width:34, height:34, borderRadius:8, border:`1px solid ${C.border}`, background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.textMid }}
              className="adm-icon-btn">
              <RefreshCw size={14}/>
            </button>
            {/* Avatar */}
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <div style={{ width:34, height:34, borderRadius:"50%", background:C.green, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12 }}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>
                  {user?.full_name || `${user?.first_name||""} ${user?.last_name||""}`.trim() || "Admin"}
                </div>
                <div style={{ fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px" }}>Administrateur</div>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", minHeight:0 }}>
          <div style={{ padding:"0 0 20px 0", display:"flex", flexDirection:"column", gap:16 }}>
            {tab === "dashboard"    && (
              <AdminDashboard
                vehicles={vehicles}
                vehStats={vehStats}
                reservations={reservations}
                onNav={setTab}
              />
            )}
            {tab === "utilisateurs" && <TabUtilisateurs/>}
            {tab === "depenses"     && <TabDepenses/>}
            {tab === "rapports"     && <TabRapports/>}
          </div>
        </div>
      </div>
    </div>
  );
}
