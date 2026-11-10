
// ─── src/dashboard/Dashboard.jsx ─────────────────────────────────────────────
import { useState, useEffect, useCallback, Component } from "react";
import {
  LayoutGrid, Car, Calendar, Wrench, Fuel, FileText, AlertTriangle,
  Users, DollarSign, BarChart2, Settings, ChevronLeft, Bell, LogOut,
  ClipboardList, Siren, Gauge, TrendingUp, CheckCircle, Clock,
  MapPin, Flame, RefreshCw, Receipt,
} from "lucide-react";
import { apiFetch } from "../../utils/api";
import { fmtDate } from "../../utils/api";
import { C, S, M, CSS, NAV, VEHICLE_CATEGORIES } from "../../constants";
import { StatusBadge, Chip, Empty, Loader, Fld } from "../../components/ui";
import { VehiculesModule  } from "../vehicles/Vehicles";
import { TabReservations } from "../reservations/Reservations";
import { TabUtilisateurs } from "../../utilisateurs/Utilisateurs";
import { TabParametres } from "../parametres/Parametres";
import { TabDocumentsGestionnaire } from '../documents/TabDocumentsGestionnaire';
import { TabMaintenance } from "../maintenance/TabMaintenance";
import { TabPlanning } from '../planning/Tabplanning';
import { TabDepenses } from "../depenses/TabDepenses";
import { TabSignalementsGestionnaire } from "../signalements/TabSignalementsGestionnaire";
import { TabCarburant } from "../carburant/TabCarburant";
import { TabRapports } from "../rapports/TabRapports";

// ─────────────────────────────────────────────────────────────────────────────
// ERROR BOUNDARY
// ─────────────────────────────────────────────────────────────────────────────
class DashboardErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError:false, error:null }; }
  static getDerivedStateFromError(error) { return { hasError:true, error }; }
  componentDidCatch(error, info) { console.error("[Dashboard] Erreur rendu :", error, info); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ padding:"32px 24px", fontFamily:"inherit" }}>
        <div style={{ background:"#FEF2F2", border:"1.5px solid #FECACA", borderRadius:13, padding:"20px 24px", display:"flex", gap:14 }}>
          <AlertTriangle size={24} color="#C0182A" style={{ flexShrink:0, marginTop:2 }}/>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:"#C0182A", marginBottom:6 }}>
              Une erreur s'est produite dans ce module
            </div>
            <div style={{ fontSize:12, color:"#9f1239", fontFamily:"monospace", background:"#fff", padding:"8px 12px", borderRadius:7, marginBottom:12, wordBreak:"break-word" }}>
              {this.state.error?.message || String(this.state.error)}
            </div>
            <button onClick={() => this.setState({ hasError:false, error:null })}
              style={{ padding:"7px 16px", background:"#C0182A", color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              ↺ Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ICÔNE NAV — mappe les id NAV vers des icônes lucide
// ─────────────────────────────────────────────────────────────────────────────
const NAV_ICONS = {
  grid:     LayoutGrid,
  car:      Car,
  calendar: Calendar,
  tool:     Wrench,
  fuel:     Fuel,
  doc:      FileText,
  alert:    AlertTriangle,
  users:    Users,
  money:    DollarSign,
  chart:    BarChart2,
  settings: Settings,
};

function NavIcon({ id, size=16 }) {
  const Icon = NAV_ICONS[id];
  if (!Icon) return <span style={{ width:size, height:size, display:"inline-block" }}/>;
  return <Icon size={size}/>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
const EXTRA_CSS = `
  @keyframes db-fadeup { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes db-pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }

  .nav-btn:hover { background:${C.sideHover}!important; color:#fff!important; }
  .logout-btn:hover { background:rgba(192,24,42,0.4)!important; }
  .collapse-btn:hover { background:rgba(255,255,255,.15)!important; }

  .nav-wrap { position:relative; }
  .nav-tooltip {
    position:absolute; left:calc(100% + 12px); top:50%; transform:translateY(-50%);
    background:#1A2820; color:#fff; padding:5px 10px; border-radius:7px;
    font-size:12px; font-weight:600; white-space:nowrap; pointer-events:none;
    opacity:0; transition:opacity .15s; z-index:9999; box-shadow:0 4px 12px rgba(0,0,0,.25);
  }
  .nav-tooltip::before {
    content:''; position:absolute; right:100%; top:50%; transform:translateY(-50%);
    border:5px solid transparent; border-right-color:#1A2820;
  }
  .nav-wrap:hover .nav-tooltip { opacity:1; }
  .sidebar-col-anim { transition:width .22s cubic-bezier(.4,0,.2,1); }
  .brand-anim { transition:all .22s cubic-bezier(.4,0,.2,1); }

  .db-kpi-card {
    background:#fff; border-radius:12px; padding:16px 18px;
    border:1px solid #E4E9E6; position:relative; overflow:hidden;
    transition:transform .18s,box-shadow .18s; animation:db-fadeup .25s ease both;
  }
  .db-kpi-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.07); }
  .db-kpi-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:3px;
    background:var(--kc,#1B5E37); border-radius:12px 12px 0 0;
  }
  .db-bar-track { height:4px; background:#F3F4F6; border-radius:99px; overflow:hidden; }
  .db-bar-fill  { height:100%; border-radius:99px; transition:width .6s ease; }

  .db-notif-row {
    display:flex; align-items:flex-start; gap:12px; padding:10px 13px;
    border-radius:9px; margin-bottom:6px; cursor:pointer;
    border:1px solid transparent; transition:all .14s;
  }
  .db-notif-row:hover { transform:translateX(2px); }
  .db-notif-row.danger  { background:#FEF2F2; border-color:#FECACA; }
  .db-notif-row.warning { background:#FFFBEB; border-color:#FDE68A; }
  .db-notif-row.info    { background:#EFF6FF; border-color:#BFDBFE; }
  .db-notif-row.success { background:#EAF4EE; border-color:#BBF7D0; }

  .db-activity-row { display:flex; align-items:center; gap:11px; padding:9px 0; border-bottom:1px solid #F3F4F6; }
  .db-activity-row:last-child { border-bottom:none; }
  .db-veh-stat { background:#F7F8F7; border-radius:10px; padding:10px 12px; }
  .db-progress-bar { height:5px; background:#F3F4F6; border-radius:99px; overflow:hidden; }
  .db-progress-fill { height:100%; border-radius:99px; transition:width .6s ease; }
  .db-pulse { animation:db-pulse 2s ease infinite; }
  .db-section { background:#fff; border-radius:12px; border:1px solid #E4E9E6; padding:16px 18px; }
  .db-section-title { font-size:13px; font-weight:800; color:#111827; margin-bottom:4px; }
  .db-section-sub   { font-size:11px; color:#9CA3AF; margin-bottom:14px; }
  .db-quick-btn {
    display:flex; align-items:center; gap:7px; padding:9px 14px;
    border-radius:9px; border:1px solid #E4E9E6; background:#fff;
    font-size:12px; font-weight:700; cursor:pointer; font-family:inherit;
    transition:all .14s; color:#111827;
  }
  .db-quick-btn:hover { border-color:#1B5E37; background:#EAF4EE; color:#1B5E37; transform:translateY(-1px); }
`;

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT INTERNE
// ─────────────────────────────────────────────────────────────────────────────
function DashboardInner({ onLogout }) {
  const [tab,          setTab]          = useState("dashboard");
  const [user,         setUser]         = useState(null);
  const [vehicles,     setVehicles]     = useState([]);
  const [reservations, setReservations] = useState([]);
  const [maintenance,  setMaintenance]  = useState([]);
  const [signalements, setSignalements] = useState([]);
  const [depenses,     setDepenses]     = useState(null);
  const [carburant,    setCarburant]    = useState([]);
  const [vehStats,     setVehStats]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [collapsed,    setCollapsed]    = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, v, r, m, st, sig, dep, carb] = await Promise.all([
        apiFetch("/auth/profile/").catch(() => null),
        apiFetch("/vehicles/?page_size=200").catch(() => ({ results:[] })),
        apiFetch("/reservations/?status=EN_ATTENTE&page_size=50").catch(() => ({ results:[] })),
        apiFetch("/maintenance/maintenance/?status=PLANIFIE&page_size=50").catch(() => ({ results:[] })),
        apiFetch("/vehicles/stats/").catch(() => null),
        apiFetch("/maintenance/breakdowns/?status=SIGNALE&page_size=20").catch(() => ({ results:[] })),
        apiFetch(`/expenses/?expense_date__gte=${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-01&page_size=200`).catch(() => null),
        apiFetch("/carburant/transactions/?status=EN_ATTENTE&page_size=20").catch(() => ({ results:[] })),
      ]);

      setUser(u);
      setVehicles(Array.isArray(v) ? v : v?.results ?? []);
      setReservations(Array.isArray(r) ? r : r?.results ?? []);
      setMaintenance(Array.isArray(m) ? m : m?.results ?? []);
      setVehStats(st);
      setSignalements(Array.isArray(sig) ? sig : sig?.results ?? []);
      setCarburant(Array.isArray(carb) ? carb : carb?.results ?? []);

      if (dep) {
        const list  = Array.isArray(dep) ? dep : dep?.results ?? [];
        const total = list.reduce((s, e) => s + Number(e.amount || 0), 0);
        const sum   = key => list.filter(e => e.expense_type === key).reduce((s, e) => s + Number(e.amount || 0), 0);
        setDepenses({
          total,
          count: list.length,
          byType: [
            { key:"CARBURANT",          label:"Carburant",      color:"#B45309", val:sum("CARBURANT")          },
            { key:"MAINTENANCE",        label:"Maintenance",    color:"#C2410C", val:sum("MAINTENANCE")        },
            { key:"REPARATION",         label:"Réparation",     color:"#C0182A", val:sum("REPARATION")         },
            { key:"ASSURANCE",          label:"Assurance",      color:"#1D4ED8", val:sum("ASSURANCE")          },
            { key:"VIGNETTE",           label:"Vignette",       color:"#0F766E", val:sum("VIGNETTE")           },
            { key:"CONTROLE_TECHNIQUE", label:"Contrôle tech.", color:"#7C3AED", val:sum("CONTROLE_TECHNIQUE") },
            { key:"CARTE_GRISE",        label:"Carte grise",    color:"#4338CA", val:sum("CARTE_GRISE")        },
            { key:"LAVAGE",             label:"Lavage",         color:"#0891B2", val:sum("LAVAGE")             },
            { key:"PEAGE",              label:"Péage",          color:"#4B5563", val:sum("PEAGE")              },
            { key:"PARKING",            label:"Parking",        color:"#4B5563", val:sum("PARKING")            },
            { key:"AMENDE",             label:"Amende",         color:"#C0182A", val:sum("AMENDE")             },
            { key:"AUTRE",              label:"Autre",          color:"#9CA3AF", val:sum("AUTRE")              },
          ].filter(t => t.val > 0),
        });
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleLogout = () => { localStorage.clear(); sessionStorage.clear(); onLogout?.(); };

  if (loading) return <Loader />;

  const total       = vehStats?.total        ?? vehicles.length;
  const disponibles = vehStats?.disponibles  ?? vehicles.filter(v => v.status === "DISPONIBLE").length;
  const enService   = vehStats?.en_service   ?? vehicles.filter(v => v.status === "EN_SERVICE").length;
  const enMaint     = vehStats?.maintenance  ?? vehicles.filter(v => v.status === "EN_MAINTENANCE").length;
  const horsService = vehStats?.hors_service ?? vehicles.filter(v => v.status === "HORS_SERVICE").length;

  return (
    <div style={S.shell}>
      <style>{CSS + EXTRA_CSS}</style>

      {/* ── SIDEBAR ── */}
      <div className="sidebar-col-anim"
        style={{ ...S.sidebarCol, width:collapsed ? 68 : (S.sidebarCol?.width ?? 224), overflow:"visible" }}>

        <div className="brand-anim"
          style={{ ...S.sideHeader, justifyContent:collapsed?"center":"flex-start",
            padding:collapsed?"16px 10px":S.sideHeader?.padding, overflow:"hidden" }}>
          <img src="/assets/logo (3).png" alt="DriveParc"
            style={{ height:43, width:"auto", objectFit:"contain", flexShrink:0 }}/>
          {!collapsed && (
            <div>
              <div style={S.brandName}>
                <span style={{ color:"#26282a" }}>DRIVE</span>
                <span style={{ color:"#1a8a4a" }}>PARC</span>
              </div>
              <div style={S.brandSub}>Institut Universitaire de la côte</div>
            </div>
          )}
        </div>

        <aside style={{ ...S.sidebar, overflow:"visible", position:"relative" }}>

          {/* Bouton collapse */}
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}
            style={{ position:"absolute", top:20, right:-11, width:22, height:22,
              borderRadius:"50%", background:"#fff", border:`1.5px solid ${C.border}`,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              zIndex:50, boxShadow:"0 2px 6px rgba(0,0,0,.12)", padding:0, color:C.textMid }}>
            <ChevronLeft size={12}
              style={{ transition:"transform .22s", transform:collapsed?"rotate(180deg)":"rotate(0deg)" }}/>
          </button>

          <nav style={{ ...S.nav, overflowX:"visible" }}>
            {NAV.map(n => {
              const active     = tab === n.id;
              const badgeCount =
                n.id === "reservations" ? reservations.length :
                n.id === "signalements" ? signalements.length :
                n.id === "carburant"    ? carburant.length    : 0;
              return (
                <div key={n.id} className="nav-wrap">
                  <button onClick={() => setTab(n.id)}
                    style={{ ...S.navItem, ...(active ? S.navActive : {}),
                      justifyContent:collapsed?"center":"flex-start",
                      padding:collapsed?"9px 0":S.navItem?.padding }}
                    className={active ? "" : "nav-btn"}>
                    <span style={{ display:"flex", opacity:active?1:0.65 }}>
                      <NavIcon id={n.icon}/>
                    </span>
                    {!collapsed && <span style={S.navLabel}>{n.label}</span>}
                    {badgeCount > 0 && (
                      <span style={{ ...S.navBadge,
                        position:collapsed?"absolute":"static",
                        top:collapsed?4:"auto", right:collapsed?4:"auto" }}>
                        {badgeCount}
                      </span>
                    )}
                    {active && !collapsed && <span style={S.navPip}/>}
                  </button>
                  {collapsed && <div className="nav-tooltip">{n.label}</div>}
                </div>
              );
            })}
          </nav>

          <div style={S.sideBottom}>
            <div style={S.divider}/>
            <button onClick={handleLogout}
              style={{ ...S.logoutBtn, justifyContent:collapsed?"center":"flex-start" }}
              className="logout-btn">
              <LogOut size={15}/>
              {!collapsed && <span>Déconnexion</span>}
            </button>
          </div>
        </aside>
      </div>

      {/* ── ZONE PRINCIPALE ── */}
      <div style={S.main}>
        <header style={S.topbar}>
          <div>
            <h1 style={S.pageTitle}>{NAV.find(n => n.id === tab)?.label ?? "Tableau de bord"}</h1>
            <p style={S.pageDate}>{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ position:"relative" }}>
              <button style={S.iconBtn} className="icon-btn" onClick={() => setTab("reservations")}>
                <Bell size={17}/>
              </button>
              {(reservations.length + signalements.length + carburant.length) > 0 && (
                <span style={S.badge}>{reservations.length + signalements.length + carburant.length}</span>
              )}
            </div>
            <div style={S.userChip}>
              <div style={S.topAvatar}>{user?.first_name?.[0]}{user?.last_name?.[0]}</div>
              <div>
                <div style={S.topName}>{user?.full_name || `${user?.first_name} ${user?.last_name}`}</div>
                <div style={S.topRole}>{user?.role_display || "Gestionnaire"}</div>
              </div>
            </div>
          </div>
        </header>

        <div style={S.content}>
          {tab==="dashboard"    && (
            <TabDash
              user={user} vehicles={vehicles} vehStats={vehStats}
              reservations={reservations} maintenance={maintenance}
              signalements={signalements} depenses={depenses}
              carburant={carburant}
              total={total} disponibles={disponibles}
              enService={enService} enMaint={enMaint} horsService={horsService}
              onNav={setTab}
            />
          )}
          {tab==="vehicles"     && <VehiculesModule vehicles={vehicles} onRefresh={loadAll}/>}
          {tab==="reservations" && <TabReservations reservations={reservations} vehicles={vehicles} onRefresh={loadAll}/>}
          {tab==="documents"    && <TabDocumentsGestionnaire vehicles={vehicles}/>}
          {tab==="maintenance"  && <TabMaintenance vehicles={vehicles} onRefresh={loadAll}/>}
          {tab==="signalements" && <TabSignalementsGestionnaire/>}
          {tab==="carburant"    && <TabCarburant role="GESTIONNAIRE"/>}
          {tab==="depenses"     && <TabDepenses vehicles={vehicles} onRefresh={loadAll}/>}
          {tab==="alertes"      && <TabAlertes maintenance={maintenance}/>}
          {tab==="utilisateurs" && <TabUtilisateurs/>}
          {tab==="rapports"     && <TabRapports/>}
          {tab==="parametres"   && <TabParametres/>}
          {!["dashboard","vehicles","reservations","maintenance","alertes","utilisateurs",
             "parametres","carburant","documents","rapports","signalements","depenses"].includes(tab) &&
            <Placeholder label={NAV.find(n => n.id === tab)?.label}/>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLEAU DE BORD PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function TabDash({
  vehicles, reservations, maintenance, signalements, depenses, carburant,
  total, disponibles, enService, enMaint, horsService, onNav,
}) {
  const fmtMoney = n => n !== undefined && n !== null
    ? Number(n).toLocaleString("fr-FR") + " FCFA" : "—";

  const maintenancesRetard   = maintenance.filter(m => m.scheduled_date && new Date(m.scheduled_date) < new Date());
  const maintenancesUrgentes = maintenance.filter(m => m.priorite === "CRITIQUE" || m.priorite === "HAUTE");

  // ── Notifications ──────────────────────────────────────────────────────────
  const notifications = [];
  signalements.filter(s => s.severity === "CRITIQUE").forEach(s => {
    notifications.push({ level:"danger", Icon:Siren,         title:`Incident critique — ${s.vehicle_name||"Véhicule"}`, desc:s.title||s.description||"Immobilisation signalée", time:s.reported_date, action:()=>onNav("signalements"), label:"Gérer" });
  });
  if (reservations.length > 0)
    notifications.push({ level:"warning", Icon:ClipboardList, title:`${reservations.length} réservation${reservations.length>1?"s":""} en attente`, desc:reservations.slice(0,2).map(r=>`${r.requester_name||"—"} → ${r.destination||"—"}`).join(" · "), time:reservations[0]?.created_at, action:()=>onNav("reservations"), label:"Traiter" });
  if (maintenancesRetard.length > 0)
    notifications.push({ level:"danger", Icon:Wrench,         title:`${maintenancesRetard.length} maintenance${maintenancesRetard.length>1?"s":""} en retard`, desc:maintenancesRetard.slice(0,2).map(m=>`${m.vehicle_name||"—"} · ${m.type||""}`).join(" · "), time:null, action:()=>onNav("maintenance"), label:"Planifier" });
  if (carburant.length > 0)
    notifications.push({ level:"warning", Icon:Fuel,           title:`${carburant.length} transaction${carburant.length>1?"s":""} carburant à valider`, desc:`Total estimé : ${fmtMoney(carburant.reduce((s,t)=>s+Number(t.total_amount||0),0))}`, time:carburant[0]?.transaction_date, action:()=>onNav("carburant"), label:"Valider" });
  const sigNormaux = signalements.filter(s => s.severity !== "CRITIQUE");
  if (sigNormaux.length > 0)
    notifications.push({ level:"info", Icon:MapPin,            title:`${sigNormaux.length} incident${sigNormaux.length>1?"s":""} terrain en attente`, desc:sigNormaux.slice(0,2).map(s=>s.vehicle_name||"Véhicule").join(", "), time:sigNormaux[0]?.reported_date, action:()=>onNav("signalements"), label:"Voir" });
  if (maintenancesUrgentes.length > 0 && maintenancesRetard.length === 0)
    notifications.push({ level:"warning", Icon:AlertTriangle,  title:`${maintenancesUrgentes.length} maintenance${maintenancesUrgentes.length>1?"s":""} haute priorité`, desc:maintenancesUrgentes.slice(0,2).map(m=>m.vehicle_name||"—").join(", "), time:null, action:()=>onNav("maintenance"), label:"Voir" });
  if (notifications.length === 0)
    notifications.push({ level:"success", Icon:CheckCircle,    title:"Tout est en ordre", desc:"Aucune action urgente requise. Le parc fonctionne normalement.", time:null, action:null, label:null });

  // ── Activité récente ──────────────────────────────────────────────────────
  const recentActivity = [
    ...reservations.slice(0,3).map(r => ({ Icon:ClipboardList, color:C.amber, bg:C.amberLight, text:`Réservation de ${r.requester_name||"—"} vers ${r.destination||"—"}`, sub:`${r.number_of_passengers||1} passager${(r.number_of_passengers||1)>1?"s":""}`, time:r.created_at||r.start_date })),
    ...signalements.slice(0,2).map(s => ({ Icon:Siren,         color:C.red,   bg:C.redLight,   text:`Incident signalé — ${s.vehicle_name||"Véhicule"}`, sub:s.title||s.description||"", time:s.reported_date })),
    ...maintenance.slice(0,2).map(m  => ({ Icon:Wrench,        color:"#EA580C",bg:"#FFF7ED",    text:`Maintenance planifiée — ${m.vehicle_name||"Véhicule"}`, sub:m.type||m.maintenance_type||"", time:m.scheduled_date })),
    ...carburant.slice(0,1).map(t   => ({ Icon:Fuel,           color:C.green, bg:C.greenLight,  text:`Transaction carburant en attente`, sub:fmtMoney(t.total_amount), time:t.transaction_date })),
  ].filter(a => a.time).sort((a,b) => new Date(b.time)-new Date(a.time)).slice(0,6);

  const txUtilisation = total > 0 ? Math.round(((disponibles+enService)/total)*100) : 0;
  const txDispo       = total > 0 ? Math.round((disponibles/total)*100) : 0;

  const byCat = (VEHICLE_CATEGORIES||[]).map(([cat,label,icon]) => ({
    cat, label, icon,
    count: vehicles.filter(v=>v.category===cat).length,
    dispo: vehicles.filter(v=>v.category===cat&&v.status==="DISPONIBLE").length,
  })).filter(c=>c.count>0);

  const fmtTimeAgo = d => {
    if (!d) return "";
    const diff = Math.floor((Date.now()-new Date(d))/60000);
    if (diff < 1)  return "À l'instant";
    if (diff < 60) return `Il y a ${diff} min`;
    const h = Math.floor(diff/60);
    if (h < 24)    return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h/24)}j`;
  };

  const NOTIF_STYLE = {
    danger:  { bg:"#FEF2F2", border:"#FECACA", text:C.red,             btnBg:C.red,             btnText:"#fff" },
    warning: { bg:"#FFFBEB", border:"#FDE68A", text:C.amber,           btnBg:C.amber,           btnText:"#fff" },
    info:    { bg:"#EFF6FF", border:"#BFDBFE", text:C.blue||"#3B82F6", btnBg:C.blue||"#3B82F6", btnText:"#fff" },
    success: { bg:"#EAF4EE", border:"#BBF7D0", text:C.green,           btnBg:C.green,           btnText:"#fff" },
  };

  const depByType = depenses?.byType ?? [];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Raccourcis */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div style={{ fontSize:13, color:C.textMid }}>Voici l'état de votre parc en temps réel</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {[
            { label:"Nouvelle réservation", Icon:ClipboardList, tab:"reservations" },
            { label:"Maintenance",          Icon:Wrench,        tab:"maintenance"  },
            { label:"Rapport",              Icon:BarChart2,     tab:"rapports"     },
          ].map(btn => (
            <button key={btn.tab} className="db-quick-btn" onClick={() => onNav(btn.tab)}>
              <btn.Icon size={13}/> {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>

        {/* Parc disponible */}
        <div className="db-kpi-card" style={{ "--kc":C.green }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>
            <Car size={11}/> Parc disponible
          </div>
          <div style={{ fontSize:26, fontWeight:900, color:C.green, lineHeight:1 }}>
            {disponibles}<span style={{ fontSize:13, color:C.textLight, fontWeight:500 }}>/{total}</span>
          </div>
          <div style={{ marginTop:8 }}>
            <div className="db-progress-bar"><div className="db-progress-fill" style={{ width:`${txDispo}%`, background:C.green }}/></div>
          </div>
          <div style={{ fontSize:10, color:C.green, fontWeight:600, marginTop:4 }}>{txDispo}% disponibles</div>
        </div>

        {/* Réservations */}
        <div className="db-kpi-card" style={{ "--kc":C.amber }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>
            <ClipboardList size={11}/> Réservations
          </div>
          <div style={{ fontSize:26, fontWeight:900, color:C.amber, lineHeight:1 }}>{reservations.length}</div>
          <div style={{ fontSize:11, color:C.textLight, marginTop:6 }}>en attente de traitement</div>
          {reservations.length > 0 && (
            <button onClick={()=>onNav("reservations")} style={{ marginTop:8, fontSize:10, padding:"3px 9px", background:C.amberLight, color:C.amber, border:"none", borderRadius:5, cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>
              Traiter →
            </button>
          )}
        </div>

        {/* Maintenance */}
        <div className="db-kpi-card" style={{ "--kc":maintenancesRetard.length>0?C.red:"#EA580C" }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>
            <Wrench size={11}/> Maintenance
          </div>
          <div style={{ fontSize:26, fontWeight:900, color:maintenancesRetard.length>0?C.red:"#EA580C", lineHeight:1 }}>{maintenance.length}</div>
          <div style={{ fontSize:11, color:C.textLight, marginTop:6 }}>planifiées</div>
          {maintenancesRetard.length > 0 && (
            <div style={{ marginTop:6, fontSize:10, fontWeight:800, color:C.red, background:C.redLight, padding:"2px 7px", borderRadius:5, display:"inline-flex", alignItems:"center", gap:4 }}>
              <AlertTriangle size={9}/> {maintenancesRetard.length} en retard
            </div>
          )}
        </div>

        {/* Incidents terrain */}
        <div className="db-kpi-card" style={{ "--kc":signalements.length>0?C.red:C.textLight }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>
            <Siren size={11}/> Incidents terrain
          </div>
          <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
            <div style={{ fontSize:26, fontWeight:900, color:signalements.length>0?C.red:C.textLight, lineHeight:1 }}>{signalements.length}</div>
            {signalements.filter(s=>s.severity==="CRITIQUE").length > 0 && (
              <span className="db-pulse" style={{ fontSize:10, fontWeight:800, color:"#fff", background:C.red, padding:"2px 6px", borderRadius:99 }}>
                {signalements.filter(s=>s.severity==="CRITIQUE").length} critique{signalements.filter(s=>s.severity==="CRITIQUE").length>1?"s":""}
              </span>
            )}
          </div>
          <div style={{ fontSize:11, color:C.textLight, marginTop:6 }}>signalements actifs</div>
        </div>

        {/* Dépenses du mois */}
        <div className="db-kpi-card" style={{ "--kc":C.green, cursor:"pointer" }} onClick={() => onNav("depenses")}>
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>
            <Receipt size={11}/> Dépenses du mois
          </div>
          {depenses ? (
            <>
              <div style={{ fontSize:18, fontWeight:900, color:C.text, lineHeight:1.1, marginBottom:2 }}>
                {Number(depenses.total).toLocaleString("fr-FR")}
                <span style={{ fontSize:10, color:C.textLight, fontWeight:500, marginLeft:4 }}>FCFA</span>
              </div>
              <div style={{ fontSize:10, color:C.textLight, marginBottom:7 }}>
                {depenses.count} opération{depenses.count>1?"s":""}
              </div>
              {depByType.length > 0 && (
                <div style={{ height:5, borderRadius:99, overflow:"hidden", display:"flex", marginBottom:7 }}>
                  {depByType.map((t,i) => (
                    <div key={i} style={{ width:`${Math.round((t.val/(depenses.total||1))*100)}%`, background:t.color, height:"100%" }}/>
                  ))}
                </div>
              )}
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {depByType.map(t => {
                  const pct = depenses.total > 0 ? Math.round((t.val/depenses.total)*100) : 0;
                  return (
                    <div key={t.key}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:9, marginBottom:2 }}>
                        <span style={{ color:C.textMid }}>{t.label}</span>
                        <span style={{ fontWeight:800, color:t.color }}>{pct}%</span>
                      </div>
                      <div className="db-bar-track">
                        <div className="db-bar-fill" style={{ width:`${pct}%`, background:t.color }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:7, fontSize:9, color:C.green, fontWeight:700, textAlign:"right" }}>
                Voir le détail →
              </div>
            </>
          ) : (
            <div style={{ fontSize:11, color:C.textLight, fontStyle:"italic", marginTop:8 }}>Connexion…</div>
          )}
        </div>
      </div>

      {/* ── LIGNE 2 : NOTIFICATIONS + ÉTAT DU PARC ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>

        <div className="db-section">
          <div className="db-section-title" style={{ display:"flex", alignItems:"center", gap:7 }}>
            <Bell size={13} color={C.green}/> Notifications prioritaires
          </div>
          <div className="db-section-sub">
            {notifications.filter(n=>n.level!=="success").length} action{notifications.filter(n=>n.level!=="success").length>1?"s":""} requise{notifications.filter(n=>n.level!=="success").length>1?"s":""}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {notifications.map((n,i) => {
              const st = NOTIF_STYLE[n.level];
              return (
                <div key={i} className={`db-notif-row ${n.level}`}>
                  <n.Icon size={15} color={st.text} style={{ flexShrink:0, marginTop:1 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:st.text, marginBottom:2 }}>{n.title}</div>
                    {n.desc && <div style={{ fontSize:11, color:C.textMid, lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{n.desc}</div>}
                    {n.time && <div style={{ fontSize:10, color:C.textLight, marginTop:2 }}>{fmtTimeAgo(n.time)}</div>}
                  </div>
                  {n.action && n.label && (
                    <button onClick={n.action} style={{ flexShrink:0, padding:"4px 10px", background:st.btnBg, color:st.btnText, border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                      {n.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="db-section">
          <div className="db-section-title" style={{ display:"flex", alignItems:"center", gap:7 }}>
            <Gauge size={13} color={C.green}/> État du parc
          </div>
          <div className="db-section-sub">{total} véhicules enregistrés</div>
          {[
            { label:"Disponibles",    count:disponibles, color:C.green   },
            { label:"En service",     count:enService,   color:C.amber   },
            { label:"En maintenance", count:enMaint,     color:"#EA580C" },
            { label:"Hors service",   count:horsService, color:"#6B7280" },
          ].map(row => {
            const pct = total > 0 ? Math.round((row.count/total)*100) : 0;
            return (
              <div key={row.label} style={{ marginBottom:9 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                  <span style={{ color:C.textMid, fontWeight:500 }}>{row.label}</span>
                  <span style={{ fontWeight:800, color:row.color }}>{row.count} <span style={{ fontWeight:400, color:C.textLight }}>({pct}%)</span></span>
                </div>
                <div className="db-progress-bar"><div className="db-progress-fill" style={{ width:`${pct}%`, background:row.color }}/></div>
              </div>
            );
          })}
          <div style={{ marginTop:12, padding:"9px 13px", background:C.greenXLight||"#F2FAF5", borderRadius:9, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.green, display:"flex", alignItems:"center", gap:5 }}>
              <TrendingUp size={12}/> Taux d'opérabilité
            </span>
            <span style={{ fontSize:18, fontWeight:900, color:C.green }}>{txUtilisation}%</span>
          </div>
          {byCat.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(byCat.length,3)},1fr)`, gap:8, marginTop:10 }}>
              {byCat.map(c => (
                <div key={c.cat} className="db-veh-stat" style={{ textAlign:"center" }}>
                  <div style={{ fontSize:18, marginBottom:3 }}>{c.icon}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:C.text }}>{c.dispo}/{c.count}</div>
                  <div style={{ fontSize:9, color:C.textLight, textTransform:"uppercase", letterSpacing:".8px" }}>{c.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── LIGNE 3 : RÉSERVATIONS + ACTIVITÉ ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>

        <div className="db-section">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <div className="db-section-title" style={{ display:"flex", alignItems:"center", gap:7 }}>
              <ClipboardList size={13} color={C.green}/> Réservations en attente
            </div>
            {reservations.length > 0 && (
              <button onClick={()=>onNav("reservations")} style={{ fontSize:11, fontWeight:700, color:C.green, background:C.greenLight, border:"none", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontFamily:"inherit" }}>
                Voir toutes →
              </button>
            )}
          </div>
          <div className="db-section-sub">{reservations.length} en attente de validation</div>
          {reservations.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", color:C.textLight, fontSize:12, fontStyle:"italic", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <CheckCircle size={13} color={C.green}/> Aucune réservation en attente
            </div>
          ) : (
            reservations.slice(0,5).map((r,i) => (
              <div key={i} className="db-activity-row">
                <div style={{ width:34, height:34, borderRadius:9, flexShrink:0, background:C.amberLight, color:C.amber, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13 }}>
                  {(r.requester_name||"?")[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.requester_name||"—"}</div>
                  <div style={{ fontSize:11, color:C.textMid, display:"flex", alignItems:"center", gap:4 }}>
                    <MapPin size={9}/>{r.destination||"—"} · {r.number_of_passengers||1} pers.
                  </div>
                  <div style={{ fontSize:10, color:C.textLight }}>{fmtDate(r.start_date)} → {fmtDate(r.end_date)}</div>
                </div>
                <button onClick={()=>onNav("reservations")} style={{ fontSize:10, padding:"3px 9px", background:C.amberLight, color:C.amber, border:`1px solid ${C.amber}30`, borderRadius:5, cursor:"pointer", fontWeight:700, fontFamily:"inherit", flexShrink:0 }}>
                  Traiter
                </button>
              </div>
            ))
          )}
        </div>

        <div className="db-section">
          <div className="db-section-title" style={{ display:"flex", alignItems:"center", gap:7 }}>
            <RefreshCw size={13} color={C.green}/> Activité récente
          </div>
          <div className="db-section-sub">Derniers événements du parc</div>
          {recentActivity.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", color:C.textLight, fontSize:12, fontStyle:"italic" }}>Aucune activité récente</div>
          ) : (
            recentActivity.map((a,i) => (
              <div key={i} className="db-activity-row">
                <div style={{ width:32, height:32, borderRadius:9, flexShrink:0, background:a.bg, color:a.color, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <a.Icon size={15}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.text}</div>
                  {a.sub && <div style={{ fontSize:10, color:C.textMid, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.sub}</div>}
                </div>
                <div style={{ fontSize:9, color:C.textLight, flexShrink:0, marginLeft:8 }}>{fmtTimeAgo(a.time)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── MAINTENANCES URGENTES ── */}
      {(maintenancesRetard.length > 0 || maintenancesUrgentes.length > 0) && (
        <div className="db-section">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <div className="db-section-title" style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Wrench size={13} color={C.green}/> Maintenances à traiter
            </div>
            <button onClick={()=>onNav("maintenance")} style={{ fontSize:11, fontWeight:700, color:C.green, background:C.greenLight, border:"none", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontFamily:"inherit" }}>
              Voir toutes →
            </button>
          </div>
          <div className="db-section-sub">
            {maintenancesRetard.length > 0 && <span style={{ color:C.red, fontWeight:700 }}>⚠ {maintenancesRetard.length} en retard · </span>}
            {maintenancesUrgentes.length} haute priorité
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:8 }}>
            {[...maintenancesRetard,...maintenancesUrgentes.filter(m=>!maintenancesRetard.includes(m))].slice(0,6).map((m,i) => {
              const isLate = maintenancesRetard.includes(m);
              return (
                <div key={i} style={{ padding:"10px 12px", borderRadius:9, background:isLate?C.redLight:C.amberLight, border:`1px solid ${isLate?"#FECACA":"#FDE68A"}`, display:"flex", alignItems:"flex-start", gap:10 }}>
                  <AlertTriangle size={16} color={isLate?C.red:C.amber} style={{ flexShrink:0, marginTop:2 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:isLate?C.red:C.amber, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.vehicle_name||`Veh #${m.vehicle}`}</div>
                    <div style={{ fontSize:11, color:C.textMid, marginTop:2 }}>{m.type||m.maintenance_type||"Maintenance"}</div>
                    <div style={{ fontSize:10, color:C.textLight, marginTop:2 }}>{isLate?"En retard depuis le":"Prévu le"} {fmtDate(m.scheduled_date)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CARBURANT EN ATTENTE ── */}
      {carburant.length > 0 && (
        <div className="db-section">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <div className="db-section-title" style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Fuel size={13} color={C.green}/> Transactions carburant à valider
            </div>
            <button onClick={()=>onNav("carburant")} style={{ fontSize:11, fontWeight:700, color:C.green, background:C.greenLight, border:"none", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontFamily:"inherit" }}>
              Gérer →
            </button>
          </div>
          <div className="db-section-sub">
            {carburant.length} transaction{carburant.length>1?"s":""} en attente · {fmtMoney(carburant.reduce((s,t)=>s+Number(t.total_amount||0),0))} à valider
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
            {carburant.slice(0,6).map((t,i) => (
              <div key={i} style={{ padding:"10px 12px", borderRadius:9, background:C.amberLight, border:"1px solid #FDE68A", display:"flex", alignItems:"center", gap:10 }}>
                <Fuel size={18} color={C.amber} style={{ flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.vehicle_registration||t.vehicle||"Véhicule"}</div>
                  <div style={{ fontSize:11, color:C.amber, fontWeight:700 }}>{fmtMoney(t.total_amount)}</div>
                  <div style={{ fontSize:10, color:C.textLight }}>{fmtDate(t.transaction_date)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB ALERTES
// ─────────────────────────────────────────────────────────────────────────────
function TabAlertes({ maintenance }) {
  return (
    <div style={S.section}>
      <div style={{ ...S.secHead, marginBottom:16 }}>
        <span style={S.secTitle}>Toutes les alertes</span>
        <Chip color={C.red}>{maintenance.length}</Chip>
      </div>
      {maintenance.length === 0 && <Empty text="Aucune alerte"/>}
      {maintenance.map((m,i) => (
        <div key={i} style={S.alertItem}>
          <div style={{ ...S.dot, background:C.red }}/>
          <div style={{ flex:1 }}>
            <div style={S.alertTitle}>{m.type||m.maintenance_type} — {m.vehicle_name||m.vehicle?.registration_number}</div>
            <div style={S.alertDesc}>{m.description}</div>
          </div>
          <span style={{ fontSize:11, color:C.textLight }}>{fmtDate(m.scheduled_date)}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER
// ─────────────────────────────────────────────────────────────────────────────
function Placeholder({ label }) {
  return <div style={S.section}><Empty text={`Module "${label}" — à connecter`} icon="🔌"/></div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard(props) {
  return (
    <DashboardErrorBoundary>
      <DashboardInner {...props}/>
    </DashboardErrorBoundary>
  );
}
