// ─── src/dashboard/DashboardChauffeur.jsx ────────────────────────────────────
import { useState, useEffect } from "react";
import {
  LayoutGrid, CalendarDays, Car, Route, Fuel, AlertTriangle,
  Bell, LogOut, ChevronLeft, ChevronRight, CheckCircle, CircleX,
  Clock, MapPin, Users, Wrench, FileText, Navigation, Info,
  ClipboardList, TrendingUp, Gauge, Play, Square, Plus,
  ArrowRight, ShieldAlert, History, Zap, Bus,
} from "lucide-react";

import { TabPlanning }           from "../planning/Tabplanning";
import { TabTrajets }            from "../trajets/TabTrajets";
import TabDocumentsChauffeur     from "../documents/TabDocumentsChauffeur";
import { TabCarburant }          from "../carburant/TabCarburant";
import { TabSignalements }       from "../signalements/TabSignalements";

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/api/v1`;

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || json?.message || `Erreur ${res.status}`);
  return json?.data ?? json;
}

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  green:      "#1B5E37",
  greenMid:   "#2D7A4F",
  greenLight: "#EAF4EE",
  greenXLight:"#F2FAF5",
  red:        "#C0182A",
  redLight:   "#FDF0F1",
  white:      "#FFFFFF",
  bg:         "#F0F3F1",
  pageBg:     "#F0F3F1",
  sidebar:    "#1a5d3b",
  border:     "#E2E8E5",
  text:       "#1A2820",
  textMid:    "#4A6358",
  textLight:  "#8EA99A",
  amber:      "#D97706",
  amberLight: "#FFFBEB",
  blue:       "#1D4ED8",
  blueLight:  "#EFF6FF",
};

// ── Navigation ────────────────────────────────────────────────────────────────
const NAV = [
  { id:"dashboard",     label:"Tableau de bord",  Icon: LayoutGrid   },
  { id:"planning",      label:"Mon Planning",      Icon: CalendarDays },
  { id:"trajets",       label:"Mes Trajets",       Icon: Route        },
  { id:"documents",     label:"Mon Véhicule",      Icon: Car          },
  { id:"carburant",     label:"Carburant",         Icon: Fuel         },
  { id:"signalements",  label:"Signalements",      Icon: AlertTriangle},
  { id:"notifications", label:"Notifications",     Icon: Bell         },
];

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })
  : "—";

const isRamassageTime = () => {
  const n = new Date();
  const m = n.getHours() * 60 + n.getMinutes();
  return m >= 300 && m <= 510;
};

// ── MOCK data ─────────────────────────────────────────────────────────────────
const MOCK = {
  user: { first_name:"Paul", last_name:"MBANG", full_name:"Paul MBANG",
          role_display:"Chauffeur", phone:"+237 699 000 003", driver_type:"BUS" },
  vehicule: {
    id:9, brand:"Yutong", model:"ZK6729D", license_plate:"LT 009 CM",
    year:2020, status:"EN_SERVICE", mileage:143000, category:"BUS",
    seating_capacity:29, insurance_expiry:"2026-12-31",
    last_maintenance:"2026-01-15", next_maintenance:"2026-07-15",
    color:"Blanc", transmission:"Automatique",
  },
  ligne: {
    id:1, code:"LIGNE-A", nom:"Ligne A — Bonanjo / IUC",
    arrêts:[
      { nom:"Rond-Point Deido",   heure:"05:15" },
      { nom:"Bonanjo Cathédrale", heure:"05:28" },
      { nom:"Akwa BCEAO",         heure:"05:40" },
      { nom:"Carrefour Ndokoti",  heure:"05:58" },
      { nom:"Bonabéri Marché",    heure:"06:18" },
      { nom:"Entrée IUC",         heure:"06:45" },
    ],
    tours_matinaux:2, capacite:29,
  },
  planning: [
    { id:"ram-1", heure:"05:00", fin:"08:30", periode:"MATIN", type:"RAMASSAGE",
      titre:"Ramassage scolaire — Ligne A (Tour 1)",
      trajet:"Rond-Point Deido → Bonanjo → Akwa → Ndokoti → Bonabéri → IUC",
      passagers_prevus:29, duree:"1h45", status:"EN_COURS", verrouille:true, recurrent:true, jours:"Lun–Ven" },
    { id:"ram-2", heure:"07:00", fin:"08:30", periode:"MATIN", type:"RAMASSAGE",
      titre:"Ramassage scolaire — Ligne A (Tour 2 retour)",
      trajet:"IUC → Bonabéri → Akwa → Bonanjo → Deido",
      passagers_prevus:25, duree:"1h15", status:"EN_ATTENTE", verrouille:true, recurrent:true, jours:"Lun–Ven" },
    { id:"res-1", heure:"10:00", fin:"17:00", periode:"JOURNEE", type:"MISSION",
      titre:"Mission Dr. KAMGA — Inspection Campus Edéa",
      trajet:"IUC Douala → Campus Edéa (aller-retour)",
      passagers_prevus:4, duree:"Journée complète", status:"EN_ATTENTE",
      verrouille:false, recurrent:false, requester:"Dr. KAMGA", destination:"Campus Edéa — 145 km" },
    { id:"res-2", heure:"17:30", fin:"19:00", periode:"SOIR", type:"RAMASSAGE",
      titre:"Retour scolaire — Ligne A (soir)",
      trajet:"IUC → Bonabéri → Akwa → Bonanjo → Deido",
      passagers_prevus:28, duree:"1h20", status:"EN_ATTENTE", verrouille:true, recurrent:true, jours:"Lun–Ven" },
  ],
  trajets: [
    { id:1, date:"2026-04-09", type:"RAMASSAGE", depart:"Deido", arrivee:"IUC",
      km_depart:142920, km_arrivee:143000, passagers:27, duree_ms:6300000 },
    { id:2, date:"2026-04-08", type:"MISSION", depart:"IUC", arrivee:"Yaoundé",
      km_depart:142750, km_arrivee:142920, passagers:2, duree_ms:12600000 },
    { id:3, date:"2026-04-07", type:"RAMASSAGE", depart:"Deido", arrivee:"IUC",
      km_depart:142600, km_arrivee:142750, passagers:29, duree_ms:6600000 },
  ],
  notifications: [
    { id:1, title:"Nouvelle mission assignée", message:"Mission Dr. Fouda le 12/04 — Yaoundé.", type:"INFO", status:"NON_LU", created_at:"2026-04-09T08:00:00" },
    { id:2, title:"Révision à prévoir", message:"Votre bus LT 009 CM doit passer en révision avant le 15/07.", type:"WARNING", status:"NON_LU", created_at:"2026-04-08T14:00:00" },
    { id:3, title:"Plein validé", message:"Votre saisie carburant du 07/04 a été validée.", type:"SUCCESS", status:"LU", created_at:"2026-04-07T16:00:00" },
  ],
};

// ── CSS global — FIX bandes noires ───────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes spin     { to { transform: rotate(360deg); } }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes fadeup   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes live-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:.6} }

  /* FIX bandes noires : fond vert clair sur tout le viewport */
  html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #F0F3F1;
  }
  #root, [data-reactroot], body > div:first-child {
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
    background: #F0F3F1 !important;
  }

  .nav-btn:hover      { background: rgba(255,255,255,0.10) !important; color:#fff !important; }
  .logout-btn:hover   { background: rgba(192,24,42,0.35) !important; }
  .icon-btn:hover     { background: #f1f5f9 !important; }
  .collapse-btn:hover { background: rgba(255,255,255,0.15) !important; }
  .action-card:hover  { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.10) !important; }
  .quick-btn:hover    { border-color:#1B5E37!important; background:#EAF4EE!important; color:#1B5E37!important; transform:translateY(-1px); }
  button:active       { transform: scale(0.97); }

  .nav-wrap { position: relative; }
  .nav-tooltip {
    position: absolute; left: calc(100% + 12px); top: 50%; transform: translateY(-50%);
    background: #1A2820; color: #fff; padding: 5px 10px; border-radius: 7px;
    font-size: 12px; font-weight: 600; white-space: nowrap; pointer-events: none;
    opacity: 0; transition: opacity .15s; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,.25);
  }
  .nav-tooltip::before {
    content: ''; position: absolute; right: 100%; top: 50%; transform: translateY(-50%);
    border: 5px solid transparent; border-right-color: #1A2820;
  }
  .nav-wrap:hover .nav-tooltip { opacity: 1; }

  .sidebar-col-anim { transition: width .22s cubic-bezier(.4,0,.2,1); }
  .brand-anim       { transition: all .22s cubic-bezier(.4,0,.2,1); }

  .dc-kpi-card {
    background:#fff; border-radius:13px; padding:18px 20px;
    border:1.5px solid #E2E8E5; position:relative; overflow:hidden;
    transition:transform .18s, box-shadow .18s; animation:fadeup .25s ease both;
  }
  .dc-kpi-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.07); }
  .dc-kpi-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:3px;
    background:var(--kc,#1B5E37); border-radius:13px 13px 0 0;
  }

  .dc-section {
    background:#fff; border-radius:13px; border:1.5px solid #E2E8E5; padding:18px 20px;
  }
  .dc-section-title { font-size:13px; font-weight:800; color:#1A2820; margin-bottom:3px; display:flex; align-items:center; gap:7px; }
  .dc-section-sub   { font-size:11px; color:#8EA99A; margin-bottom:14px; }

  .dc-progress-bar  { height:6px; background:#E8EDE9; border-radius:99px; overflow:hidden; }
  .dc-progress-fill { height:100%; border-radius:99px; transition:width .6s ease; }

  .dc-activity-row {
    display:flex; align-items:flex-start; gap:12px; padding:10px 0;
    border-bottom:1px solid #F0F0F0;
  }
  .dc-activity-row:last-child { border-bottom:none; }

  .dc-planning-row {
    display:flex; gap:14px; padding:12px 0;
    border-bottom:1px solid #E2E8E5; align-items:flex-start;
  }
  .dc-planning-row:last-child { border-bottom:none; }

  .dc-notif-row {
    display:flex; align-items:flex-start; gap:12px; padding:11px 14px;
    border-radius:9px; margin-bottom:6px;
    border:1px solid transparent; transition:all .14s; cursor:pointer;
  }
  .dc-notif-row:hover  { transform:translateX(2px); }
  .dc-notif-row.danger  { background:#FDF0F1; border-color:#FECDD3; }
  .dc-notif-row.warning { background:#FFFBEB; border-color:#FDE68A; }
  .dc-notif-row.info    { background:#EFF6FF; border-color:#BFDBFE; }
  .dc-notif-row.success { background:#EAF4EE; border-color:#BBF7D0; }

  .live-dot { animation:live-dot 1.5s ease-in-out infinite; }

  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-thumb { background:#D4DDD9; border-radius:99px; }
  ::-webkit-scrollbar-track { background:transparent; }
  input:focus, textarea:focus, select:focus {
    border-color:#1B5E37!important;
    box-shadow:0 0 0 3px #1B5E3718!important;
    outline:none;
  }
`;

// ── Styles shell — FIX bandes noires ─────────────────────────────────────────
const S = {
  // FIX : position:fixed + inset:0 colle le dashboard aux 4 bords du viewport
  // indépendamment du conteneur parent (#root, body, etc.)
  shell: {
    position:"fixed", top:0, right:0, bottom:0, left:0,
    display:"flex",
    fontFamily:"'Inter',-apple-system,sans-serif",
    background:"#F0F3F1", overflow:"hidden",
    padding:"12px", gap:"12px",
    boxSizing:"border-box",
  },
  sidebarCol: { display:"flex", flexDirection:"column", width:220, flexShrink:0, gap:"10px" },
  sideHeader: {
    background:"#fff", borderRadius:14, padding:"13px 16px",
    display:"flex", alignItems:"center", gap:10,
    boxShadow:"0 1px 4px rgba(0,0,0,0.06)", flexShrink:0,
  },
  brandName: { fontSize:13, fontWeight:800, color:"#1e293b", letterSpacing:".4px", lineHeight:1.1 },
  brandSub:  { fontSize:9, color:"#94a3b8", marginTop:1 },
  sidebar: {
    background:"#1a5d3b", borderRadius:16, flex:1,
    display:"flex", flexDirection:"column", overflow:"hidden",
    boxShadow:"0 4px 20px rgba(26,93,59,0.25)",
  },
  nav:      { flex:1, padding:"10px 8px", overflowY:"auto", minHeight:0 },
  navItem:  {
    display:"flex", alignItems:"center", gap:11, width:"100%",
    padding:"8px 10px", borderRadius:10, border:"none", cursor:"pointer",
    color:"rgba(255,255,255,0.65)", marginBottom:2, textAlign:"left",
    background:"transparent", fontFamily:"inherit", position:"relative", transition:"all .15s",
  },
  navActive: { background:"rgba(255,255,255,0.18)", color:"#fff", fontWeight:600, boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.12)" },
  navLabel:  { fontSize:12, flex:1 },
  navPip:    { position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", width:3, height:16, background:"#fff", borderRadius:99 },
  navBadge:  { background:"#C0182A", color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" },
  sideBottom:{ padding:"8px 8px 12px", flexShrink:0 },
  logoutBtn: { display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 10px", borderRadius:10, border:"none", cursor:"pointer", background:"rgba(192,24,42,0.18)", color:"rgba(255,180,180,0.9)", fontSize:11, fontFamily:"inherit", transition:"all .15s" },
  main:      { flex:1, display:"flex", flexDirection:"column", gap:"10px", overflow:"hidden", minWidth:0 },
  topbar:    { background:"#fff", borderRadius:14, padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" },
  pageTitle: { fontSize:22, fontWeight:760, color:"#1A2820", letterSpacing:"-.4px", margin:0 },
  pageDate:  { fontSize:11, color:"#8EA99A", marginTop:2 },
  iconBtn:   { width:34, height:34, borderRadius:8, border:"1px solid #E2E8E5", background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#4A6358" },
  badge:     { position:"absolute", top:-5, right:-5, background:"#C0182A", color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" },
  userChip:  { display:"flex", alignItems:"center", gap:9 },
  topAvatar: { width:34, height:34, borderRadius:"50%", background:"#1B5E37", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12 },
  topName:   { fontSize:13, fontWeight:700, color:"#1A2820" },
  topRole:   { fontSize:10, color:"#8EA99A", textTransform:"uppercase", letterSpacing:"1px" },
  content:   { flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:0 },
  btn:       { padding:"7px 14px", background:"#1B5E37", color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 },
  ghostBtn:  { padding:"7px 14px", background:"transparent", color:"#4A6358", border:"1px solid #E2E8E5", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 },
  input:     { padding:"8px 12px", border:"1.5px solid #E2E8E5", borderRadius:7, fontSize:13, outline:"none", fontFamily:"inherit", color:"#1A2820", background:"#FFFFFF", width:"100%" },
  label:     { fontSize:10, fontWeight:700, color:"#4A6358", textTransform:"uppercase", letterSpacing:"1px" },
  overlay:   { position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modal:     { background:"#FFFFFF", borderRadius:14, padding:24, maxWidth:"95vw", boxShadow:"0 20px 60px rgba(0,0,0,.2)", maxHeight:"90vh", overflowY:"auto" },
};

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export default function DashboardChauffeur({ onLogout }) {
  const [tab,        setTab]        = useState("dashboard");
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [myStatus,   setMyStatus]   = useState("DISPONIBLE");
  const [trajetLive, setTrajetLive] = useState(null);
  const [showPanne,  setShowPanne]  = useState(false);
  const [showCarb,   setShowCarb]   = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [u, v, planning, trajets, notifs, driverProfile] = await Promise.all([
          apiFetch("/auth/profile/").catch(() => null),
          apiFetch("/vehicles/my-vehicle/").catch(() => null),
          apiFetch("/reservations/?driver=me").catch(() => null),
          apiFetch("/trips/?driver=me").catch(() => null),
          apiFetch("/notifications/").catch(() => null),
          apiFetch("/auth/users/my-status/").catch(() => null),
        ]);

        const vNorm = v ? {
          ...v,
          brand:            v.brand            ?? v.make,
          license_plate:    v.license_plate    ?? v.registration_number,
          mileage:          v.mileage          ?? v.current_mileage,
          seating_capacity: v.seating_capacity ?? v.capacity,
        } : null;

        setData({
          user:          u     ?? MOCK.user,
          vehicule:      vNorm ?? MOCK.vehicule,
          planning:      Array.isArray(planning) ? planning : planning?.results ?? MOCK.planning,
          trajets:       Array.isArray(trajets)  ? trajets  : trajets?.results  ?? MOCK.trajets,
          notifications: Array.isArray(notifs)   ? notifs   : notifs?.results   ?? MOCK.notifications,
          ligne:         MOCK.ligne,
        });
        if (driverProfile?.manual_status) setMyStatus(driverProfile.manual_status);
      } catch {
        setData({ ...MOCK });
      } finally { setLoading(false); }
    })();
  }, []);

  const handleLogout = () => { localStorage.clear(); sessionStorage.clear(); onLogout?.(); };

  if (loading || !data) return <Loader />;

  const { user, vehicule, planning, trajets, notifications, ligne } = data;
  const unread      = notifications.filter(n => n.status === "NON_LU").length;
  const isBus       = user?.driver_type === "BUS" || vehicule?.category === "BUS";
  const enRamassage = isBus && isRamassageTime();

  return (
    <div style={S.shell}>
      <style>{CSS}</style>

      {/* ── COLONNE SIDEBAR ── */}
      <div className="sidebar-col-anim" style={{ ...S.sidebarCol, width:collapsed ? 68 : 220, overflow:"visible" }}>

        {/* Header blanc logo */}
        <div className="brand-anim" style={{
          ...S.sideHeader,
          justifyContent:collapsed ? "center" : "flex-start",
          padding:collapsed ? "16px 10px" : S.sideHeader.padding,
          overflow:"hidden",
        }}>
          <img src="/assets/logo (3).png" alt="DriveParc"
            style={{ height:43.14, width:"auto", objectFit:"contain", flexShrink:0 }} />
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

        {/* Sidebar verte */}
        <aside style={{ ...S.sidebar, overflow:"visible", position:"relative" }}>

          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)} style={{
            position:"absolute", top:20, right:-11, width:22, height:22, borderRadius:"50%",
            background:"#fff", border:"1.5px solid #E2E8E5", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            zIndex:50, boxShadow:"0 2px 6px rgba(0,0,0,.12)", padding:0, color:"#4A6358",
          }}>
            {collapsed ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
          </button>

          {!collapsed && (
            <div style={{ padding:"10px 14px 4px" }}>
              <div style={{ fontSize:9, color:"rgba(255,255,255,.45)", textTransform:"uppercase", letterSpacing:"1.5px", fontWeight:700 }}>
                {isBus ? "Chauffeur Bus" : "Chauffeur"}
              </div>
              {isBus && (
                <div style={{ marginTop:4, fontSize:10, background:"rgba(255,255,255,0.08)", borderRadius:6, padding:"4px 8px", color:"rgba(255,255,255,.6)", display:"flex", alignItems:"center", gap:4 }}>
                  <Bus size={10} /> {ligne?.code || "LIGNE-A"} · {ligne?.nom?.split("—")[0] || "Ramassage"}
                </div>
              )}
              {enRamassage && (
                <div style={{ marginTop:6, fontSize:10, background:"rgba(217,119,6,0.3)", borderRadius:6, padding:"4px 8px", color:"#D97706", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>
                  <Clock size={10} /> 05h–08h30 · Ramassage
                </div>
              )}
            </div>
          )}

          <div style={{ height:1, background:"rgba(255,255,255,0.10)", margin:"4px 12px" }} />

          <nav style={{ ...S.nav, overflowX:"visible" }}>
            {NAV.map(n => {
              const active = tab === n.id;
              return (
                <div key={n.id} className="nav-wrap">
                  <button onClick={() => setTab(n.id)}
                    style={{
                      ...S.navItem, ...(active ? S.navActive : {}),
                      justifyContent:collapsed ? "center" : "flex-start",
                      padding:collapsed ? "9px 0" : S.navItem.padding,
                    }}
                    className={active ? "" : "nav-btn"}>
                    <span style={{ display:"flex", opacity:active ? 1 : 0.65 }}>
                      <n.Icon size={16} />
                    </span>
                    {!collapsed && <span style={S.navLabel}>{n.label}</span>}
                    {n.id === "notifications" && unread > 0 && (
                      <span style={{ ...S.navBadge, position:collapsed?"absolute":"static", top:collapsed?4:"auto", right:collapsed?4:"auto" }}>
                        {unread}
                      </span>
                    )}
                    {active && !collapsed && <span style={S.navPip} />}
                  </button>
                  {collapsed && <div className="nav-tooltip">{n.label}</div>}
                </div>
              );
            })}
          </nav>

          <div style={S.sideBottom}>
            <div style={{ height:1, background:"rgba(255,255,255,0.10)", margin:"4px 12px 8px" }} />
            <button onClick={handleLogout}
              style={{ ...S.logoutBtn, justifyContent:collapsed ? "center" : "flex-start" }}
              className="logout-btn">
              <LogOut size={15} />
              {!collapsed && <span>Déconnexion</span>}
            </button>
          </div>
        </aside>
      </div>

      {/* ── ZONE PRINCIPALE ── */}
      <div style={S.main}>

        {/* Topbar */}
        <header style={S.topbar}>
          <div>
            <h1 style={S.pageTitle}>{NAV.find(n => n.id === tab)?.label ?? "Tableau de bord"}</h1>
            <p style={S.pageDate}>
              {new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
            </p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {trajetLive && (
              <div style={{ display:"flex", alignItems:"center", gap:8, background:"#EAF4EE", border:"1px solid #1B5E3730", borderRadius:8, padding:"6px 12px" }}>
                <span className="live-dot" style={{ width:8, height:8, borderRadius:"50%", background:"#1B5E37", display:"inline-block" }} />
                <span style={{ fontSize:11, fontWeight:700, color:"#1B5E37" }}>Trajet en cours</span>
              </div>
            )}
            <div style={{ position:"relative" }}>
              <button style={S.iconBtn} className="icon-btn" onClick={() => setTab("notifications")}>
                <Bell size={17} />
              </button>
              {unread > 0 && <span style={S.badge}>{unread}</span>}
            </div>
            <div style={S.userChip}>
              <div style={S.topAvatar}>{user.first_name?.[0]}{user.last_name?.[0]}</div>
              <div>
                <div style={S.topName}>{user.full_name || `${user.first_name} ${user.last_name}`}</div>
                <div style={S.topRole}>{user.role_display}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <div style={S.content}>
          {tab === "dashboard" && (
            <TabDashboard
              user={user} vehicule={vehicule} planning={planning} trajets={trajets}
              trajetLive={trajetLive} setTrajetLive={setTrajetLive}
              onPanne={() => setShowPanne(true)} onCarburant={() => setShowCarb(true)}
              setTab={setTab} myStatus={myStatus} setMyStatus={setMyStatus}
              isBus={isBus} enRamassage={enRamassage} ligne={ligne}
            />
          )}
          {tab === "planning"      && <TabPlanning vehicule={vehicule} isBus={isBus} />}
          {tab === "trajets"       && <TabTrajets vehicule={vehicule} />}
          {tab === "documents"     && <TabDocumentsChauffeur vehicule={vehicule} />}
          {tab === "carburant"     && <TabCarburant role="CHAUFFEUR" reservations={data?.planning ?? []} />}
          {tab === "signalements"  && <TabSignalements vehicule={vehicule} />}
          {tab === "notifications" && <TabNotifications notifications={notifications} />}
        </div>
      </div>

      {showPanne && <ModalPanne     vehicule={vehicule} onClose={() => setShowPanne(false)} />}
      {showCarb  && <ModalCarburant vehicule={vehicule} onClose={() => setShowCarb(false)}  />}
    </div>
  );
}

// ── TAB DASHBOARD ─────────────────────────────────────────────────────────────
function TabDashboard({ user, vehicule, planning, trajets, trajetLive, setTrajetLive,
  onPanne, onCarburant, setTab, myStatus, setMyStatus, isBus, enRamassage, ligne }) {

  const missionsAuj  = planning.filter(p => p.status !== "TERMINE").length;
  const kmTotal      = trajets.reduce((s, t) => s + ((t.km_arrivee || 0) - (t.km_depart || 0)), 0);
  const trajetsCount = trajets.length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      <ToggleDisponibilite status={myStatus} onChange={setMyStatus} isBus={isBus} enRamassage={enRamassage} />

      {enRamassage && isBus && (
        <div style={{
          background:`linear-gradient(130deg, #D97706 0%, #b45309 100%)`,
          borderRadius:13, padding:"16px 20px", color:"#fff",
        }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.5px", opacity:0.75, marginBottom:5, display:"flex", alignItems:"center", gap:6 }}>
            <Clock size={12} /> RAMASSAGE SCOLAIRE EN COURS · 05h00 → 08h30
          </div>
          <div style={{ fontSize:16, fontWeight:800, marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
            <Bus size={18} /> {ligne?.nom || "Ligne A"}
          </div>
          <div style={{ display:"flex", gap:20, fontSize:12, opacity:0.9 }}>
            <span style={{ display:"flex", alignItems:"center", gap:5 }}>
              <Route size={12} /> {ligne?.tours_matinaux || 2} tours matinaux
            </span>
            <span style={{ display:"flex", alignItems:"center", gap:5 }}>
              <Users size={12} /> Capacité : {vehicule?.seating_capacity} places
            </span>
          </div>
          <div style={{ marginTop:10, fontSize:11, background:"rgba(0,0,0,.18)", borderRadius:8, padding:"6px 12px", display:"flex", alignItems:"center", gap:6 }}>
            <ShieldAlert size={12} /> Vous êtes automatiquement indisponible pour les réservations pendant cette période.
          </div>
        </div>
      )}

      {trajetLive && (
        <div style={{ background:"#1B5E37", borderRadius:13, padding:"18px 22px", color:"#fff" }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.5px", opacity:0.7, marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
            <span className="live-dot" style={{ width:8, height:8, borderRadius:"50%", background:"#fff", display:"inline-block" }} />
            TRAJET EN COURS
          </div>
          <div style={{ fontSize:16, fontWeight:800, marginBottom:6 }}>{trajetLive.titre}</div>
          <LiveTimer startTime={trajetLive.startTime} />
          <button onClick={() => setTrajetLive(null)} style={{
            marginTop:14, padding:"9px 22px", background:"rgba(255,255,255,.18)",
            color:"#fff", border:"1px solid rgba(255,255,255,.35)", borderRadius:9,
            fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", gap:7,
          }}>
            <Square size={13} /> Terminer et enregistrer le trajet
          </button>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"flex-end", flexWrap:"wrap", gap:8 }}>
        {[
          { label:"Démarrer un trajet",  Icon:Play,          action:() => setTab("trajets")    },
          { label:"Signaler une panne",  Icon:AlertTriangle, action:onPanne                    },
          { label:"Enregistrer un plein",Icon:Fuel,          action:onCarburant                },
        ].map(btn => (
          <button key={btn.label} className="quick-btn" onClick={btn.action} style={{
            display:"flex", alignItems:"center", gap:7, padding:"9px 14px",
            borderRadius:9, border:"1.5px solid #E2E8E5", background:"#fff",
            fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            transition:"all .14s", color:"#1A2820",
          }}>
            <btn.Icon size={13} /> {btn.label}
          </button>
        ))}
      </div>

      {/* ── KPIs ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>

        <div className="dc-kpi-card" style={{ "--kc":vehicule?.status === "EN_SERVICE" ? "#1B5E37" : "#D97706" }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#8EA99A", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
            <Car size={11} color="#8EA99A" /> Mon véhicule
          </div>
          {vehicule ? (
            <>
              <div style={{ fontSize:18, fontWeight:900, color:"#1B5E37", lineHeight:1.1 }}>
                {vehicule.license_plate}
              </div>
              <div style={{ fontSize:11, color:"#4A6358", marginTop:4 }}>
                {vehicule.brand} {vehicule.model}
              </div>
              <StatusBadge status={vehicule.status} />
            </>
          ) : (
            <div style={{ fontSize:12, color:"#8EA99A", fontStyle:"italic" }}>Non assigné</div>
          )}
        </div>

        <div className="dc-kpi-card" style={{ "--kc":"#D97706" }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#8EA99A", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
            <CalendarDays size={11} color="#8EA99A" /> Aujourd'hui
          </div>
          <div style={{ fontSize:32, fontWeight:900, color:"#D97706", lineHeight:1 }}>{missionsAuj}</div>
          <div style={{ fontSize:11, color:"#8EA99A", marginTop:6 }}>Mission{missionsAuj !== 1 ? "s" : ""} prévue{missionsAuj !== 1 ? "s" : ""}</div>
          {missionsAuj > 0 && (
            <button onClick={() => {}} style={{ marginTop:10, fontSize:10, padding:"4px 10px", background:"#FFFBEB", color:"#D97706", border:"1px solid #D9770630", borderRadius:6, cursor:"pointer", fontWeight:700, fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
              <ArrowRight size={10} /> Planning
            </button>
          )}
        </div>

        <div className="dc-kpi-card" style={{ "--kc":"#1B5E37" }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#8EA99A", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
            <Route size={11} color="#8EA99A" /> Trajets effectués
          </div>
          <div style={{ fontSize:32, fontWeight:900, color:"#1B5E37", lineHeight:1 }}>{trajetsCount}</div>
          <div style={{ fontSize:11, color:"#8EA99A", marginTop:6 }}>Total enregistrés</div>
        </div>

        <div className="dc-kpi-card" style={{ "--kc":"#1D4ED8" }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#8EA99A", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
            <Gauge size={11} color="#8EA99A" /> Kilométrage
          </div>
          <div style={{ fontSize:vehicule?.mileage > 99999 ? 20 : 28, fontWeight:900, color:"#1D4ED8", lineHeight:1 }}>
            {Number(vehicule?.mileage || 0).toLocaleString("fr-FR")}
          </div>
          <div style={{ fontSize:11, color:"#8EA99A", marginTop:6 }}>km parcourus</div>
        </div>
      </div>

      {/* ── Ligne 2 : Véhicule + Planning ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

        <div className="dc-section">
          <div className="dc-section-title">
            <Car size={14} color="#1B5E37" /> Mon véhicule assigné
          </div>
          <div className="dc-section-sub">Informations et état du véhicule</div>

          {vehicule ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[
                { Icon:Car,        label:"Marque / Modèle",  value:`${vehicule.brand} ${vehicule.model}`                   },
                { Icon:FileText,   label:"Immatriculation",  value:vehicule.license_plate, big:true                        },
                { Icon:Gauge,      label:"Kilométrage",      value:`${Number(vehicule.mileage||0).toLocaleString("fr-FR")} km` },
                { Icon:Users,      label:"Places",           value:`${vehicule.seating_capacity || "—"} pl.`                },
                { Icon:Wrench,     label:"Prochaine révision",value:fmtDate(vehicule.next_maintenance), color:"#D97706"     },
                { Icon:Navigation, label:"Couleur",          value:vehicule.color || "—"                                   },
              ].map(f => (
                <div key={f.label} style={{ padding:"10px 12px", background:"#F0F3F1", borderRadius:8 }}>
                  <div style={{ fontSize:9, color:"#8EA99A", textTransform:"uppercase", letterSpacing:"1px", marginBottom:4, display:"flex", alignItems:"center", gap:4 }}>
                    <f.Icon size={9} /> {f.label}
                  </div>
                  <div style={{ fontSize:f.big ? 15 : 12, fontWeight:f.big ? 800 : 600, color:f.color || "#1A2820" }}>{f.value || "—"}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"28px 0", color:"#8EA99A" }}>
              <Car size={32} color="#8EA99A" style={{ marginBottom:8 }} />
              <div style={{ fontSize:12 }}>Aucun véhicule assigné</div>
            </div>
          )}
        </div>

        <div className="dc-section">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
            <div className="dc-section-title">
              <CalendarDays size={14} color="#1B5E37" /> Planning d'aujourd'hui
            </div>
            <span style={{ padding:"2px 10px", borderRadius:99, fontSize:11, fontWeight:700, background:"#1B5E371A", color:"#1B5E37" }}>
              {planning.length} mission{planning.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="dc-section-sub">Missions assignées pour aujourd'hui</div>

          {planning.length === 0 ? (
            <div style={{ textAlign:"center", padding:"28px 0", color:"#8EA99A" }}>
              <CalendarDays size={32} color="#8EA99A" style={{ marginBottom:8 }} />
              <div style={{ fontSize:12 }}>Aucune mission prévue aujourd'hui</div>
            </div>
          ) : (
            planning.slice(0, 4).map((p, i) => (
              <DashPlanningRow key={i} p={p} trajetLive={trajetLive} setTrajetLive={setTrajetLive} />
            ))
          )}
        </div>
      </div>

      {/* ── Arrêts ligne bus ── */}
      {isBus && ligne?.arrêts && (
        <div className="dc-section">
          <div className="dc-section-title">
            <Bus size={14} color="#1B5E37" /> Itinéraire — {ligne.nom}
          </div>
          <div className="dc-section-sub">{ligne.arrêts.length} arrêts · {ligne.tours_matinaux} tours matinaux</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {ligne.arrêts.map((a, i) => (
              <div key={i} style={{
                padding:"10px 12px",
                background:i === 0 ? "#EAF4EE" : i === ligne.arrêts.length - 1 ? "#FFFBEB" : "#F0F3F1",
                borderRadius:9, display:"flex", alignItems:"center", gap:8,
                border:`1px solid ${i === 0 ? "#1B5E3730" : i === ligne.arrêts.length - 1 ? "#D9770630" : "#E2E8E5"}`,
              }}>
                <div style={{
                  width:24, height:24, borderRadius:"50%", flexShrink:0,
                  background:i === 0 ? "#1B5E37" : i === ligne.arrêts.length - 1 ? "#D97706" : "#E2E8E5",
                  color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:10, fontWeight:800,
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#1A2820" }}>{a.nom}</div>
                  <div style={{ fontSize:10, color:i === 0 ? "#1B5E37" : i === ligne.arrêts.length - 1 ? "#D97706" : "#8EA99A", fontWeight:600 }}>
                    <Clock size={9} style={{ display:"inline", marginRight:3 }} />{a.heure}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Trajets récents ── */}
      {trajets.length > 0 && (
        <div className="dc-section">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
            <div className="dc-section-title">
              <History size={14} color="#1B5E37" /> Derniers trajets
            </div>
            <button onClick={() => setTab("trajets")} style={{
              fontSize:11, fontWeight:700, color:"#1B5E37", background:"#EAF4EE",
              border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit",
              display:"flex", alignItems:"center", gap:4,
            }}>
              Voir tous <ArrowRight size={11} />
            </button>
          </div>
          <div className="dc-section-sub">Historique récent</div>
          {trajets.slice(0, 3).map((t, i) => {
            const km = (t.km_arrivee || 0) - (t.km_depart || 0);
            const isMission = t.type === "MISSION";
            return (
              <div key={i} className="dc-activity-row">
                <div style={{
                  width:38, height:38, borderRadius:9, flexShrink:0,
                  background:isMission ? "#EFF6FF" : "#FFFBEB",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  {isMission ? <Route size={18} color="#1D4ED8" /> : <Bus size={18} color="#D97706" />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:"#1A2820" }}>
                    {t.depart} → {t.arrivee}
                  </div>
                  <div style={{ fontSize:11, color:"#8EA99A", marginTop:2, display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ display:"flex", alignItems:"center", gap:3 }}>
                      <CalendarDays size={10} /> {fmtDate(t.date)}
                    </span>
                    <span style={{ display:"flex", alignItems:"center", gap:3 }}>
                      <Users size={10} /> {t.passagers} passagers
                    </span>
                    <span style={{ display:"flex", alignItems:"center", gap:3 }}>
                      <Gauge size={10} /> {km} km
                    </span>
                  </div>
                </div>
                <span style={{
                  padding:"3px 9px", borderRadius:99, fontSize:10, fontWeight:700,
                  background:isMission ? "#EFF6FF" : "#FFFBEB",
                  color:isMission ? "#1D4ED8" : "#D97706",
                }}>
                  {isMission ? "Mission" : "Ramassage"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── DashPlanningRow ───────────────────────────────────────────────────────────
function DashPlanningRow({ p, trajetLive, setTrajetLive }) {
  const isLive = trajetLive?.id === p.id;
  const typeCfg = {
    RAMASSAGE: { bg:"#FFFBEB", color:"#D97706", label:"Ramassage", Icon:Bus    },
    MISSION:   { bg:"#EFF6FF", color:"#1D4ED8", label:"Mission",   Icon:Route  },
  }[p.type] || { bg:"#F0F3F1", color:"#4A6358", label:p.type, Icon:CalendarDays };

  return (
    <div className="dc-planning-row" style={{ opacity:p.status === "TERMINE" ? 0.55 : 1 }}>
      <div style={{ textAlign:"center", minWidth:44, flexShrink:0 }}>
        <div style={{ fontSize:15, fontWeight:800, color:"#1B5E37" }}>{p.heure}</div>
        {p.fin && <div style={{ fontSize:9, color:"#8EA99A" }}>→ {p.fin}</div>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, fontWeight:700, color:"#1A2820" }}>{p.titre}</span>
          <span style={{ fontSize:9, fontWeight:800, background:typeCfg.bg, color:typeCfg.color, padding:"2px 8px", borderRadius:99, display:"flex", alignItems:"center", gap:3 }}>
            <typeCfg.Icon size={9} /> {typeCfg.label}
          </span>
          {p.verrouille && (
            <span style={{ fontSize:9, fontWeight:800, background:"#FFFBEB", color:"#D97706", padding:"2px 8px", borderRadius:99, display:"flex", alignItems:"center", gap:3 }}>
              <ShieldAlert size={9} /> Verrouillé
            </span>
          )}
        </div>
        <div style={{ fontSize:11, color:"#4A6358", display:"flex", alignItems:"center", gap:4 }}>
          <MapPin size={10} /> {p.trajet}
        </div>
        {!p.verrouille && p.status === "EN_ATTENTE" && (
          <button onClick={() => setTrajetLive(isLive ? null : { ...p, startTime:Date.now() })}
            style={{
              marginTop:8, padding:"6px 14px", borderRadius:7, border:"none",
              background:isLive ? "#C0182A" : "#1B5E37", color:"#fff",
              fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
              display:"flex", alignItems:"center", gap:5,
            }}>
            {isLive ? <><Square size={11} /> Terminer</> : <><Play size={11} /> Démarrer</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── LiveTimer ─────────────────────────────────────────────────────────────────
function LiveTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(t);
  }, [startTime]);
  return (
    <div style={{ fontSize:32, fontWeight:900, letterSpacing:"3px", color:"#fff", fontVariantNumeric:"tabular-nums", display:"flex", alignItems:"center", gap:4 }}>
      <Clock size={22} />
      {String(Math.floor(elapsed/3600000)).padStart(2,"0")}:
      {String(Math.floor((elapsed%3600000)/60000)).padStart(2,"0")}:
      {String(Math.floor((elapsed%60000)/1000)).padStart(2,"0")}
    </div>
  );
}

// ── ToggleDisponibilite ───────────────────────────────────────────────────────
function ToggleDisponibilite({ status, onChange, isBus, enRamassage }) {
  const [loading, setLoading] = useState(false);

  const options = [
    { val:"DISPONIBLE",   label:"Disponible",  Icon:CheckCircle, color:"#1B5E37", bg:"#EAF4EE" },
    { val:"INDISPONIBLE", label:"Indisponible", Icon:CircleX,     color:"#C0182A", bg:"#FDF0F1" },
    { val:"CONGE",        label:"En congé",     Icon:Clock,       color:"#6B7280", bg:"#F5F5F5" },
  ];
  const current = options.find(o => o.val === status) || options[0];

  const handleChange = async (val) => {
    if (val === status || enRamassage) return;
    setLoading(true);
    try {
      const tkn = localStorage.getItem("access_token");
      await fetch(`${API_BASE}/auth/users/my-status/`, {
        method:"PATCH",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${tkn}` },
        body:JSON.stringify({ manual_status:val }),
      });
      onChange(val);
    } catch { onChange(val); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      background:current.bg,
      border:`1.5px solid ${current.color}30`,
      borderRadius:12, padding:"12px 16px",
      display:"flex", alignItems:"center", justifyContent:"space-between",
      flexWrap:"wrap", gap:10,
    }}>
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:current.color, textTransform:"uppercase", letterSpacing:"1px", marginBottom:3 }}>Mon statut</div>
        <div style={{ fontSize:16, fontWeight:800, color:"#1A2820", display:"flex", alignItems:"center", gap:7 }}>
          <current.Icon size={16} color={current.color} /> {current.label}
          {enRamassage && isBus && (
            <span style={{ fontSize:10, color:"#D97706", display:"flex", alignItems:"center", gap:4, background:"#FFFBEB", padding:"2px 8px", borderRadius:6 }}>
              <ShieldAlert size={10} /> Ramassage verrouillé
            </span>
          )}
        </div>
      </div>
      <div style={{ display:"flex", gap:6 }}>
        {options.filter(o => o.val !== status).map(o => (
          <button key={o.val} onClick={() => handleChange(o.val)}
            disabled={loading || enRamassage}
            style={{
              padding:"6px 12px", borderRadius:7, fontSize:11, fontWeight:700,
              cursor:enRamassage ? "not-allowed" : "pointer", fontFamily:"inherit",
              border:`1.5px solid ${o.color}30`, background:o.bg, color:o.color,
              opacity:enRamassage ? 0.4 : loading ? 0.6 : 1,
              display:"flex", alignItems:"center", gap:5, transition:"all .15s",
            }}>
            <o.Icon size={11} /> {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── TabNotifications ──────────────────────────────────────────────────────────
function TabNotifications({ notifications }) {
  const [list, setList] = useState(notifications);
  const markRead = id => setList(l => l.map(n => n.id === id ? { ...n, status:"LU" } : n));
  const unread = list.filter(n => n.status === "NON_LU").length;

  const NOTIF_STYLE = {
    SUCCESS: { bg:"#EAF4EE", border:"#BBF7D0", text:"#1B5E37", Icon:CheckCircle  },
    WARNING: { bg:"#FFFBEB", border:"#FDE68A", text:"#D97706", Icon:AlertTriangle },
    ERROR:   { bg:"#FDF0F1", border:"#FECDD3", text:"#C0182A", Icon:CircleX      },
    INFO:    { bg:"#EFF6FF", border:"#BFDBFE", text:"#1D4ED8", Icon:Info         },
  };

  const levelClass = (type) => {
    if (type === "SUCCESS") return "success";
    if (type === "WARNING") return "warning";
    if (type === "ERROR")   return "danger";
    return "info";
  };

  return (
    <div className="dc-section">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
        <div className="dc-section-title">
          <Bell size={14} color="#1B5E37" /> Notifications
        </div>
        {unread > 0 && (
          <button style={{ background:"none", border:"none", color:"#1B5E37", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}
            onClick={() => setList(l => l.map(n => ({ ...n, status:"LU" })))}>
            <CheckCircle size={12} /> Tout marquer comme lu
          </button>
        )}
      </div>
      <div className="dc-section-sub">{unread} non lue{unread > 1 ? "s" : ""}</div>

      {list.length === 0 ? (
        <Empty text="Aucune notification" />
      ) : (
        list.map((n, i) => {
          const cfg = NOTIF_STYLE[n.type] || NOTIF_STYLE.INFO;
          return (
            <div key={i} className={`dc-notif-row ${levelClass(n.type)}`}
              style={{ opacity:n.status === "LU" ? 0.7 : 1 }}>
              <cfg.Icon size={16} color={cfg.text} style={{ flexShrink:0, marginTop:1 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:n.status === "NON_LU" ? 700 : 500, color:"#1A2820" }}>{n.title}</div>
                <div style={{ fontSize:11, color:"#4A6358", marginTop:2, lineHeight:1.4 }}>{n.message}</div>
                <div style={{ fontSize:10, color:"#8EA99A", marginTop:4, display:"flex", alignItems:"center", gap:3 }}>
                  <Clock size={9} /> {fmtDate(n.created_at)}
                </div>
              </div>
              {n.status === "NON_LU" && (
                <button style={{ background:"none", border:"none", color:"#1B5E37", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:3, whiteSpace:"nowrap" }}
                  onClick={() => markRead(n.id)}>
                  <CheckCircle size={12} /> Lu
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────
function ModalPanne({ vehicule, onClose }) {
  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, width:520 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontSize:15, fontWeight:700, color:"#1A2820", display:"flex", alignItems:"center", gap:7 }}>
            <Wrench size={16} color="#C0182A" /> Signaler une panne
          </span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#8EA99A" }}>
            <CircleX size={18} />
          </button>
        </div>
        <TabSignalements vehicule={vehicule} />
      </div>
    </div>
  );
}

function ModalCarburant({ vehicule, onClose }) {
  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, width:520 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontSize:15, fontWeight:700, color:"#1A2820", display:"flex", alignItems:"center", gap:7 }}>
            <Fuel size={16} color="#D97706" /> Enregistrer un plein
          </span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#8EA99A" }}>
            <CircleX size={18} />
          </button>
        </div>
        <TabCarburant vehicule={vehicule} />
      </div>
    </div>
  );
}

// ── Micro-composants ──────────────────────────────────────────────────────────
function ActionCard({ Icon, color, title, desc, onClick }) {
  return (
    <button onClick={onClick} className="action-card" style={{
      background:"#FFFFFF", borderRadius:12, padding:"18px 16px",
      border:`1.5px solid #E2E8E5`, borderTop:`3px solid ${color}`,
      cursor:"pointer", textAlign:"left", fontFamily:"inherit",
      boxShadow:"0 1px 4px rgba(0,0,0,.05)", transition:"all .15s",
    }}>
      <div style={{ width:38, height:38, borderRadius:10, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ fontSize:13, fontWeight:700, color:"#1A2820", marginBottom:4 }}>{title}</div>
      <div style={{ fontSize:11, color:"#8EA99A", lineHeight:1.4 }}>{desc}</div>
    </button>
  );
}

function StatusBadge({ status }) {
  const map = {
    DISPONIBLE:    { label:"Disponible",    bg:"#EAF4EE", color:"#1B5E37" },
    EN_SERVICE:    { label:"En service",    bg:"#FFFBEB", color:"#D97706" },
    EN_MAINTENANCE:{ label:"Maintenance",   bg:"#FDF0F1", color:"#C0182A" },
    HORS_SERVICE:  { label:"Hors service",  bg:"#F5F5F5", color:"#888"   },
  };
  const m = map[status] || { label:status, bg:"#F5F5F5", color:"#888" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:99, fontSize:11, fontWeight:700, background:m.bg, color:m.color, marginTop:8 }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:m.color, display:"inline-block" }} />
      {m.label}
    </span>
  );
}

function Empty({ text }) {
  return (
    <div style={{ textAlign:"center", padding:"40px 0", color:"#8EA99A" }}>
      <ClipboardList size={34} color="#8EA99A" style={{ marginBottom:10 }} />
      <div style={{ fontSize:13 }}>{text}</div>
    </div>
  );
}

// FIX bandes noires : position:fixed sur le loader aussi
function Loader() {
  return (
    <div style={{ position:"fixed", top:0, right:0, bottom:0, left:0, display:"flex", alignItems:"center", justifyContent:"center", background:"#F0F3F1", flexDirection:"column", gap:14 }}>
      <div style={{ width:32, height:32, border:"3px solid #1B5E37", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }} />
      <div style={{ fontSize:11, color:"#8EA99A", letterSpacing:"2px", textTransform:"uppercase" }}>Chargement</div>
    </div>
  );
}