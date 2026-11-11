
// ─── src/dashboard/DashboardPersonnel.jsx ────────────────────────────────────
// DRIVEPARC IUC — Dashboard Personnel (Directeur / Chef de département)
// v4.1 — Badges compteurs sur filtres + Notifications fonctionnelles
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import {
  LayoutGrid, Car, Calendar, History, Wrench, FileText,
  Bell, Settings, LogOut, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, Clock, MapPin, Users,
  TrendingUp, Fuel, Shield, Wallet, Activity, Star,
  Navigation, X, Locate, Ruler, RefreshCw, Plus,
  ArrowRight, Info, Zap, CheckCircle2, XCircle,
  BellOff, BellRing, Eye, EyeOff,
} from "lucide-react";

const TabTracking  = lazy(() => import('../tabtraking/TabTracking'));
import TabDocuments         from '../documents/TabDocuments';
import TabParametres        from '../parametre/TabParametre';
import TabSignalementsPerso from "../signalements/TabSignalementsPersonnel";

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
  return json?.data ?? json;
}

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  green:       "#1B5E37",
  greenMid:    "#2D7A4F",
  greenLight:  "#EAF4EE",
  greenXLight: "#F2FAF5",
  greenLine:   "#C8E6D5",
  red:         "#C0182A",
  redLight:    "#FDF0F1",
  redLine:     "#FECDD3",
  orange:      "#EA580C",
  orangeLight: "#FFF7ED",
  orangeLine:  "#FDBA74",
  amber:       "#D97706",
  amberLight:  "#FFFBEB",
  white:       "#FFFFFF",
  bg:          "#F4F6F5",
  pageBg:      "#F0F3F1",
  sidebar:     "#1a5d3b",
  border:      "#E2E8E4",
  text:        "#1A2820",
  textMid:     "#4A6358",
  textLight:   "#8EA99A",
  slate:       "#64748B",
  slateLight:  "#F1F5F4",
};

// ── Navigation ─────────────────────────────────────────────────────────────────
const NAV_DIRECTEUR = [
  { id:"dashboard",    label:"Tableau de bord",   Icon:LayoutGrid },
  { id:"mon-vehicule", label:"Mon véhicule",       Icon:Car        },
  { id:"reservations", label:"Mes réservations",   Icon:Calendar   },
  { id:"historique",   label:"Historique",         Icon:History    },
  { id:"pannes",       label:"Signaler une panne", Icon:Wrench     },
  { id:"documents",    label:"Mes documents",      Icon:FileText   },
  { id:"notifications",label:"Notifications",      Icon:Bell       },
  { id:"parametres",   label:"Paramètres",         Icon:Settings   },
];
const NAV_CHEF = [
  { id:"dashboard",    label:"Tableau de bord",    Icon:LayoutGrid },
  { id:"reservations", label:"Mes demandes",        Icon:Calendar   },
  { id:"historique",   label:"Historique",          Icon:History    },
  { id:"pannes",       label:"Signaler un incident",Icon:Wrench     },
  { id:"notifications",label:"Notifications",       Icon:Bell       },
  { id:"parametres",   label:"Paramètres",          Icon:Settings   },
];

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  @keyframes spin   { to { transform:rotate(360deg); } }
  @keyframes fadeup { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.45} }
  @keyframes slideIn{ from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }

  html, body { width:100%; height:100%; overflow:hidden; background:#F0F3F1; }
  #root,[data-reactroot],body>div:first-child { width:100%!important; height:100%!important; overflow:hidden!important; background:#F0F3F1!important; }

  .dp-nav-btn:hover    { background:rgba(255,255,255,.12)!important; color:#fff!important; }
  .dp-logout:hover     { background:rgba(192,24,42,.38)!important; }
  .dp-collapse:hover   { background:rgba(255,255,255,.18)!important; }
  .dp-quick-btn:hover  { border-color:${P.green}!important; background:${P.greenLight}!important; color:${P.green}!important; }
  .dp-action-card:hover{ transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.1)!important; }
  .dp-icon-btn:hover   { background:#f1f5f9!important; }

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

  .dp-sidebar-anim { transition:width .22s cubic-bezier(.4,0,.2,1); }
  .dp-brand-anim   { transition:all .22s cubic-bezier(.4,0,.2,1); }

  .dp-kpi-card {
    background:#fff; border-radius:12px; padding:18px 20px;
    border:1.5px solid ${P.border}; position:relative; overflow:hidden;
    transition:transform .18s,box-shadow .18s; animation:fadeup .22s ease both;
  }
  .dp-kpi-card:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(0,0,0,.07); }
  .dp-kpi-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:3px;
    background:var(--kc,${P.green}); border-radius:12px 12px 0 0;
  }

  .dp-section {
    background:#fff; border-radius:12px; border:1.5px solid ${P.border};
    padding:18px 20px; animation:fadeup .22s ease both;
  }
  .dp-section-title { font-size:13px; font-weight:800; color:${P.text}; margin-bottom:4px; }
  .dp-section-sub   { font-size:11px; color:${P.textLight}; margin-bottom:16px; }

  .dp-progress-bar  { height:5px; background:${P.border}; border-radius:99px; overflow:hidden; }
  .dp-progress-fill { height:100%; border-radius:99px; transition:width .6s ease; }

  .dp-activity-row {
    display:flex; align-items:center; gap:11px; padding:9px 0;
    border-bottom:1px solid ${P.border};
  }
  .dp-activity-row:last-child { border-bottom:none; }

  .dp-notif-row {
    display:flex; align-items:flex-start; gap:12px; padding:10px 13px;
    border-radius:9px; margin-bottom:6px; border:1px solid transparent;
  }
  .dp-notif-row.danger  { background:${P.redLight};    border-color:${P.redLine};    }
  .dp-notif-row.warning { background:${P.orangeLight}; border-color:${P.orangeLine}; }
  .dp-notif-row.success { background:${P.greenLight};  border-color:${P.greenLine};  }
  .dp-notif-row.info    { background:${P.slateLight};  border-color:${P.border};     }

  /* Notification item dans le tab */
  .dp-notif-item {
    display:flex; align-items:flex-start; gap:12px; padding:12px 14px;
    border-radius:10px; margin-bottom:6px; border:1.5px solid;
    transition:all .15s; cursor:default; animation:slideIn .2s ease;
  }
  .dp-notif-item.unread {
    background:${P.greenLight}; border-color:${P.greenLine};
  }
  .dp-notif-item.read {
    background:#fff; border-color:${P.border};
  }
  .dp-notif-item:hover { box-shadow:0 2px 8px rgba(0,0,0,.06); }

  /* Filter pill avec compteur */
  .dp-filter-pill {
    display:flex; align-items:center; gap:6px;
    padding:6px 14px; border-radius:99px;
    font-size:11px; font-weight:700; cursor:pointer;
    border:none; font-family:inherit; transition:all .14s;
  }
  .dp-filter-pill .count {
    padding:1px 6px; border-radius:99px; font-size:10px; font-weight:800;
  }

  .dp-pulse { animation:pulse 2s ease infinite; }

  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-thumb { background:#D4DDD9; border-radius:99px; }
  ::-webkit-scrollbar-track { background:transparent; }
  input:focus, select:focus, textarea:focus {
    border-color:${P.green}!important;
    box-shadow:0 0 0 3px ${P.green}18!important;
    outline:none;
  }
  input[type="date"], input[type="time"] { color-scheme:light; color:${P.text}; background:#fff; }
`;

// ── Styles shell ───────────────────────────────────────────────────────────────
const S = {
  shell: {
    position:"fixed", top:0, right:0, bottom:0, left:0,
    display:"flex", fontFamily:"'Inter',-apple-system,sans-serif",
    background:P.pageBg, overflow:"hidden",
    padding:"12px", gap:"12px", boxSizing:"border-box",
  },
  sidebarCol: { display:"flex", flexDirection:"column", width:220, flexShrink:0, gap:"10px" },
  sideHeader: {
    background:P.white, borderRadius:14, padding:"13px 16px",
    display:"flex", alignItems:"center", gap:10,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)", flexShrink:0,
  },
  brandName: { fontSize:13, fontWeight:800, color:"#1e293b", letterSpacing:".4px", lineHeight:1.1 },
  brandSub:  { fontSize:9,  color:"#94a3b8", marginTop:1 },
  sidebar: {
    background:P.sidebar, borderRadius:16, flex:1,
    display:"flex", flexDirection:"column", overflow:"hidden",
    boxShadow:"0 4px 20px rgba(26,93,59,.25)",
  },
  nav: { flex:1, padding:"8px 8px", overflowY:"auto", minHeight:0 },
  navItem: {
    display:"flex", alignItems:"center", gap:10, width:"100%",
    padding:"8px 10px", borderRadius:10, border:"none", cursor:"pointer",
    color:"rgba(255,255,255,.65)", marginBottom:2, textAlign:"left",
    background:"transparent", fontFamily:"inherit", position:"relative",
    transition:"all .15s",
  },
  navActive: {
    background:"rgba(255,255,255,.18)", color:"#fff", fontWeight:600,
    boxShadow:"inset 0 0 0 1px rgba(255,255,255,.12)",
  },
  navLabel:  { fontSize:12, flex:1 },
  navPip:    { position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", width:3, height:16, background:"#fff", borderRadius:99 },
  navBadge:  { background:P.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, minWidth:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" },
  sideBottom:{ padding:"8px 8px 12px", flexShrink:0 },
  logoutBtn: { display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 10px", borderRadius:10, border:"none", cursor:"pointer", background:"rgba(192,24,42,.18)", color:"rgba(255,180,180,.9)", fontSize:11, fontFamily:"inherit", transition:"all .15s" },
  main:   { flex:1, display:"flex", flexDirection:"column", gap:"10px", overflow:"hidden", minWidth:0 },
  topbar: {
    background:P.white, borderRadius:14, padding:"12px 20px",
    display:"flex", justifyContent:"space-between", alignItems:"center",
    flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,.06)",
  },
  pageTitle: { fontSize:20, fontWeight:800, color:P.text, letterSpacing:"-.4px", margin:0 },
  pageDate:  { fontSize:11, color:P.textLight, marginTop:2 },
  iconBtn:   { width:34, height:34, borderRadius:8, border:`1px solid ${P.border}`, background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:P.textMid },
  badge:     { position:"absolute", top:-5, right:-5, background:P.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" },
  userChip:  { display:"flex", alignItems:"center", gap:9 },
  topAvatar: { width:34, height:34, borderRadius:"50%", background:P.green, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12 },
  topName:   { fontSize:13, fontWeight:700, color:P.text },
  topRole:   { fontSize:10, color:P.textLight, textTransform:"uppercase", letterSpacing:"1px" },
  content:   { flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:0 },
  btn:       { padding:"8px 16px", background:P.green, color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 },
  ghostBtn:  { padding:"8px 14px", background:"transparent", color:P.textMid, border:`1.5px solid ${P.border}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 },
};

// ── Utilitaires ────────────────────────────────────────────────────────────────
function Loader() {
  return (
    <div style={{position:"fixed",top:0,right:0,bottom:0,left:0,display:"flex",alignItems:"center",justifyContent:"center",background:P.bg,flexDirection:"column",gap:14}}>
      <div style={{width:32,height:32,border:`3px solid ${P.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      <div style={{fontSize:11,color:P.textLight,letterSpacing:"2px",textTransform:"uppercase"}}>Chargement</div>
    </div>
  );
}

function Empty({ text, icon }) {
  return (
    <div style={{textAlign:"center",padding:"40px 0",color:P.textLight}}>
      {icon && <div style={{marginBottom:10,display:"flex",justifyContent:"center"}}>{icon}</div>}
      <div style={{fontSize:13}}>{text}</div>
    </div>
  );
}

const fmtDate = d => d
  ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const fmtDateTime = d => d
  ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtMoney = n => n!==undefined&&n!==null ? Number(n).toLocaleString("fr-FR")+" FCFA" : "—";
const fmtTimeAgo = d => {
  if (!d) return "";
  const diff=Math.floor((Date.now()-new Date(d))/60000);
  if (diff<1) return "À l'instant";
  if (diff<60) return `Il y a ${diff} min`;
  const h=Math.floor(diff/60);
  if (h<24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h/24)}j`;
};

function StatusBadge({ status }) {
  const map = {
    DISPONIBLE:     {label:"Disponible",   bg:P.greenLight, color:P.green },
    EN_SERVICE:     {label:"En service",   bg:P.orangeLight,color:P.orange},
    EN_MAINTENANCE: {label:"Maintenance",  bg:P.redLight,   color:P.red   },
    HORS_SERVICE:   {label:"Hors service", bg:P.slateLight, color:P.slate },
    PENDING:        {label:"En attente",   bg:P.orangeLight,color:P.orange},
    EN_ATTENTE:     {label:"En attente",   bg:P.orangeLight,color:P.orange},
    APPROVED:       {label:"Approuvée",    bg:P.greenLight, color:P.green },
    APPROUVEE:      {label:"Approuvée",    bg:P.greenLight, color:P.green },
    EN_COURS:       {label:"En cours",     bg:P.greenLight, color:P.green },
    REJECTED:       {label:"Refusée",      bg:P.redLight,   color:P.red   },
    REJETEE:        {label:"Refusée",      bg:P.redLight,   color:P.red   },
    COMPLETED:      {label:"Terminée",     bg:P.greenLight, color:P.green },
    TERMINEE:       {label:"Terminée",     bg:P.greenLight, color:P.green },
    ANNULEE:        {label:"Annulée",      bg:P.slateLight, color:P.slate },
  };
  const m = map[status]||{label:status,bg:P.slateLight,color:P.slate};
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:99,fontSize:11,fontWeight:700,background:m.bg,color:m.color,whiteSpace:"nowrap"}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:m.color,display:"inline-block"}}/>
      {m.label}
    </span>
  );
}

// Compteur de réservations par statut
function getReservationCounts(reservations) {
  return {
    tous:      reservations.length,
    attente:   reservations.filter(r=>["PENDING","EN_ATTENTE"].includes(r.status)).length,
    approuvee: reservations.filter(r=>["APPROVED","APPROUVEE","EN_COURS"].includes(r.status)).length,
    rejetee:   reservations.filter(r=>["REJECTED","REJETEE"].includes(r.status)).length,
    terminee:  reservations.filter(r=>["COMPLETED","TERMINEE"].includes(r.status)).length,
    annulee:   reservations.filter(r=>r.status==="ANNULEE").length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPersonnel({ onLogout }) {
  const [data,      setData]      = useState(null);
  const [refresh,   setRefresh]   = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode,  setDarkMode]  = useState(()=>localStorage.getItem("driveparc_theme")==="dark");
  const [lang,      setLang]      = useState(localStorage.getItem("driveparc_lang")||"fr");

  const handleThemeChange = (isDark) => {
    setDarkMode(isDark);
    document.documentElement.setAttribute("data-theme",isDark?"dark":"light");
    localStorage.setItem("driveparc_theme",isDark?"dark":"light");
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const u = await apiFetch("/auth/profile/");
      const isDirecteur = u?.personnel_type === "DIRECTEUR";

      let vehiculeFonction = null;
      if (isDirecteur && u?.assigned_vehicle) {
        const vid = typeof u.assigned_vehicle === "object" ? u.assigned_vehicle.id : u.assigned_vehicle;
        if (vid) vehiculeFonction = await apiFetch(`/vehicles/${vid}/`).catch(()=>null);
        if (!vehiculeFonction && typeof u.assigned_vehicle === "object") vehiculeFonction = u.assigned_vehicle;
      }

      const [res, notifs] = await Promise.all([
        apiFetch("/reservations/?requester=me").catch(()=>({results:[]})),
        apiFetch("/notifications/").catch(()=>({results:[]})),
      ]);

      setData({
        user: u,
        isDirecteur,
        vehiculeFonction,
        reservations:  Array.isArray(res)    ? res    : res?.results    ?? [],
        notifications: Array.isArray(notifs) ? notifs : notifs?.results ?? [],
      });
    } catch(err) {
      console.error("Erreur chargement:", err);
      setData({
        user:{ first_name:"Antoine",last_name:"Mbarga",full_name:"Dr. Antoine Mbarga",role:"PERSONNEL",personnel_type:"DIRECTEUR",role_display:"Directeur",school:"IUC" },
        isDirecteur:true,
        vehiculeFonction:{ id:1,registration_number:"LT 234 AB",make:"Toyota",model:"Camry",year:2022,color:"Blanc",status:"DISPONIBLE",current_mileage:45320,fuel_type:"DIESEL",seating_capacity:5 },
        reservations:[],
        notifications:[],
      });
    } finally { setLoading(false); }
  },[]);

  // Fonction pour marquer une notification comme lue (API)
  const markNotifRead = useCallback(async (notifId) => {
    try {
      await apiFetch(`/notifications/${notifId}/mark-read/`, { method:"POST" });
    } catch {
      // silencieux — on met à jour localement quand même
    }
    setData(prev => prev ? {
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === notifId ? { ...n, status:"LU", is_read:true } : n
      )
    } : prev);
  },[]);

  // Marquer toutes comme lues
  const markAllRead = useCallback(async () => {
    try {
      await apiFetch("/notifications/mark-all-read/", { method:"POST" });
    } catch {}
    setData(prev => prev ? {
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, status:"LU", is_read:true }))
    } : prev);
  },[]);

  useEffect(()=>{ loadAll(); },[loadAll,refresh]);

  const handleLogout  = ()=>{ localStorage.clear(); sessionStorage.clear(); onLogout?.(); };
  const handleRefresh = ()=>setRefresh(r=>r+1);

  if (loading||!data) return <Loader/>;

  const { user, isDirecteur, vehiculeFonction, reservations, notifications } = data;
  const unread = notifications.filter(n=>n.status==="NON_LU"||n.is_read===false).length;
  const NAV = isDirecteur ? NAV_DIRECTEUR : NAV_CHEF;

  return (
    <div style={S.shell}>
      <style>{CSS}</style>

      {/* ── SIDEBAR ── */}
      <div className="dp-sidebar-anim"
        style={{...S.sidebarCol, width:collapsed?68:220, overflow:"visible"}}>

        {/* Logo */}
        <div className="dp-brand-anim"
          style={{...S.sideHeader, justifyContent:collapsed?"center":"flex-start",
            padding:collapsed?"16px 10px":S.sideHeader.padding, overflow:"hidden"}}>
          <img src="/assets/logo (3).png" alt="DriveParc"
            style={{height:43,width:"auto",objectFit:"contain",flexShrink:0}}/>
          {!collapsed && (
            <div>
              <div style={S.brandName}>
                <span style={{color:"#26282a"}}>DRIVE</span>
                <span style={{color:"#1a8a4a"}}>PARC</span>
              </div>
              <div style={S.brandSub}>Institut Universitaire de la côte</div>
            </div>
          )}
        </div>

        {/* Sidebar verte */}
        <aside style={{...S.sidebar, overflow:"visible", position:"relative"}}>
          <button className="dp-collapse" onClick={()=>setCollapsed(c=>!c)}
            style={{position:"absolute",top:20,right:-11,width:22,height:22,borderRadius:"50%",
              background:P.white,border:`1.5px solid ${P.border}`,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,
              boxShadow:"0 2px 6px rgba(0,0,0,.12)",padding:0,color:P.textMid}}>
            <ChevronLeft size={11} style={{transition:"transform .22s",transform:collapsed?"rotate(180deg)":"rotate(0deg)"}}/>
          </button>

          {!collapsed && (
            <div style={{padding:"10px 14px 4px"}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,.45)",textTransform:"uppercase",letterSpacing:"1.5px",fontWeight:700}}>
                {isDirecteur ? `Directeur · ${user.school||""}` : "Chef de département"}
              </div>
            </div>
          )}
          <div style={{height:1,background:"rgba(255,255,255,.10)",margin:"4px 12px"}}/>

          <nav style={{...S.nav, overflowX:"visible"}}>
            {NAV.map(n => {
              const active = tab === n.id;
              const { Icon } = n;
              // Badge sur notifications
              const badgeCount = n.id==="notifications" ? unread : 0;
              return (
                <div key={n.id} className="nav-wrap">
                  <button onClick={()=>setTab(n.id)}
                    style={{...S.navItem,...(active?S.navActive:{}),
                      justifyContent:collapsed?"center":"flex-start",
                      padding:collapsed?"9px 0":S.navItem.padding}}
                    className={active?"":"dp-nav-btn"}>
                    <span style={{display:"flex",opacity:active?1:.65, position:"relative"}}>
                      <Icon size={16}/>
                      {/* Point rouge si badge sur icône en mode collapsed */}
                      {collapsed && badgeCount > 0 && (
                        <span style={{position:"absolute",top:-4,right:-4,width:8,height:8,borderRadius:"50%",background:P.red,border:"2px solid #1a5d3b"}}/>
                      )}
                    </span>
                    {!collapsed && <span style={S.navLabel}>{n.label}</span>}
                    {!collapsed && badgeCount > 0 && (
                      <span style={S.navBadge}>{badgeCount}</span>
                    )}
                    {active && !collapsed && <span style={S.navPip}/>}
                  </button>
                  {collapsed && <div className="nav-tooltip">{n.label}{badgeCount>0?` (${badgeCount})`:""}</div>}
                </div>
              );
            })}
          </nav>

          <div style={S.sideBottom}>
            <div style={{height:1,background:"rgba(255,255,255,.10)",margin:"0 12px 8px"}}/>
            <button onClick={handleLogout}
              style={{...S.logoutBtn,justifyContent:collapsed?"center":"flex-start"}}
              className="dp-logout">
              <LogOut size={14}/>
              {!collapsed && <span>Déconnexion</span>}
            </button>
          </div>
        </aside>
      </div>

      {/* ── ZONE PRINCIPALE ── */}
      <div style={S.main}>
        <header style={S.topbar}>
          <div>
            <h1 style={S.pageTitle}>{NAV.find(n=>n.id===tab)?.label ?? "Tableau de bord"}</h1>
            <p style={S.pageDate}>{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{position:"relative"}}>
              <button style={S.iconBtn} className="dp-icon-btn" onClick={()=>setTab("notifications")}>
                <Bell size={16}/>
              </button>
              {unread>0 && <span style={S.badge}>{unread}</span>}
            </div>
            <div style={S.userChip}>
              <div style={S.topAvatar}>{user.first_name?.[0]}{user.last_name?.[0]}</div>
              <div>
                <div style={S.topName}>{user.full_name||`${user.first_name} ${user.last_name}`}</div>
                <div style={S.topRole}>{user.role_display||(isDirecteur?"Directeur":"Chef de département")}</div>
              </div>
            </div>
          </div>
        </header>

        <div style={S.content}>
          {tab==="dashboard"    && <TabDashboard data={data} isDirecteur={isDirecteur} onReserver={()=>setShowModal(true)} setTab={setTab}/>}
          {tab==="mon-vehicule" && isDirecteur && <TabMonVehicule vehicule={vehiculeFonction}/>}
          {tab==="reservations" && (
            <TabReservations
              reservations={reservations}
              isDirecteur={isDirecteur}
              onNew={()=>setShowModal(true)}
            />
          )}
          {tab==="tracking" && (
            <Suspense fallback={<div style={{padding:40,textAlign:"center",color:P.textMid}}>Chargement de la carte…</div>}>
              <TabTracking reservations={reservations} isDirecteur={isDirecteur} vehiculeFonction={vehiculeFonction}/>
            </Suspense>
          )}
          {tab==="historique"    && <TabHistorique reservations={reservations}/>}
          {tab==="pannes"        && <TabSignalementsPerso isDirecteur={isDirecteur} vehicule={vehiculeFonction}/>}
          {tab==="documents"     && isDirecteur && <TabDocuments vehicule={vehiculeFonction} documentsFromAPI={[]}/>}
          {tab==="notifications" && (
            <TabNotifications
              notifications={notifications}
              onMarkRead={markNotifRead}
              onMarkAllRead={markAllRead}
              onRefresh={handleRefresh}
            />
          )}
          {tab==="parametres"    && <TabParametres user={user} darkMode={darkMode} onThemeChange={handleThemeChange} onLangChange={setLang} lang={lang}/>}
        </div>
      </div>

      {showModal && (
        <ModalReservation
          isDirecteur={isDirecteur}
          onClose={()=>setShowModal(false)}
          onSuccess={()=>{ setShowModal(false); handleRefresh(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function TabDashboard({ data, isDirecteur, onReserver, setTab }) {
  const { vehiculeFonction, reservations, notifications } = data;
  const counts  = getReservationCounts(reservations);
  const unread  = notifications.filter(n=>n.status==="NON_LU"||n.is_read===false).length;

  const notifList = [];
  if (unread > 0) notifList.push({level:"info",Icon:Bell,title:`${unread} notification${unread>1?"s":""} non lue${unread>1?"s":""}`,desc:"Consultez vos messages et alertes récentes.",action:()=>setTab("notifications"),label:"Voir"});
  if (counts.attente > 0) notifList.push({level:"warning",Icon:Clock,title:`${counts.attente} demande${counts.attente>1?"s":""} en attente de validation`,desc:"Le gestionnaire est en train de traiter votre/vos demande(s).",action:()=>setTab("reservations"),label:"Suivre"});
  if (vehiculeFonction?.status==="EN_MAINTENANCE") notifList.push({level:"danger",Icon:Wrench,title:"Votre véhicule est en maintenance",desc:"Contactez le gestionnaire pour plus d'informations.",action:()=>setTab("mon-vehicule"),label:"Voir"});
  if (notifList.length===0) notifList.push({level:"success",Icon:CheckCircle2,title:"Tout est en ordre",desc:"Aucune action urgente requise.",action:null,label:null});

  const NOTIF_COLORS = {
    danger:  {bg:P.redLight,   border:P.redLine,   text:P.red,   btnBg:P.red,   btnText:"#fff"},
    warning: {bg:P.orangeLight,border:P.orangeLine,text:P.orange,btnBg:P.orange,btnText:"#fff"},
    info:    {bg:P.slateLight, border:P.border,    text:P.slate, btnBg:P.slate, btnText:"#fff"},
    success: {bg:P.greenLight, border:P.greenLine, text:P.green, btnBg:P.green, btnText:"#fff"},
  };

  const quickActions = [
    {Icon:Plus,      color:P.green,  bg:P.greenLight,  title:"Nouvelle réservation",      desc:isDirecteur?"Réserver un véhicule":"Demande avec chauffeur", onClick:onReserver},
    {Icon:Calendar,  color:P.orange, bg:P.orangeLight, title:"Mes réservations",           desc:`${counts.tous} au total`,                                    onClick:()=>setTab("reservations")},
    {Icon:Wrench,    color:P.red,    bg:P.redLight,    title:"Signaler une panne",         desc:isDirecteur?"Problème sur mon véhicule":"Signaler un incident", onClick:()=>setTab("pannes")},
    {Icon:History,   color:P.slate,  bg:P.slateLight,  title:"Historique",                 desc:"Mes courses passées",                                         onClick:()=>setTab("historique")},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>

      {/* Raccourcis haut */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div style={{fontSize:13,color:P.textMid}}>Bienvenue · voici vos informations en temps réel</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[{Icon:Plus,label:"Nouvelle réservation",onClick:onReserver},{Icon:Wrench,label:"Signaler",onClick:()=>setTab("pannes")},{Icon:History,label:"Historique",onClick:()=>setTab("historique")}].map((b,i)=>(
            <button key={i} className="dp-quick-btn" onClick={b.onClick}
              style={{display:"flex",alignItems:"center",gap:7,padding:"9px 14px",borderRadius:8,border:`1.5px solid ${P.border}`,background:P.white,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",color:P.textMid,transition:"all .14s"}}>
              <b.Icon size={13}/> {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions rapides */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {quickActions.map((a,i)=>{
          const { Icon } = a;
          return (
            <button key={i} onClick={a.onClick} className="dp-action-card"
              style={{background:P.white,borderRadius:12,padding:"16px",border:`1.5px solid ${P.border}`,
                borderTop:`3px solid ${a.color}`,cursor:"pointer",textAlign:"left",fontFamily:"inherit",
                boxShadow:"0 1px 4px rgba(0,0,0,.05)",transition:"all .15s"}}>
              <div style={{width:38,height:38,borderRadius:10,background:a.bg,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10}}>
                <Icon size={18} color={a.color}/>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:P.text,marginBottom:3}}>{a.title}</div>
              <div style={{fontSize:11,color:P.textLight,lineHeight:1.4}}>{a.desc}</div>
            </button>
          );
        })}
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:isDirecteur?"repeat(4,1fr)":"repeat(3,1fr)",gap:12}}>
        {isDirecteur && (
          <div className="dp-kpi-card" style={{"--kc":P.green}}>
            <div style={{fontSize:9,fontWeight:700,color:P.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10,display:"flex",alignItems:"center",gap:5}}>
              <Car size={10}/> Véhicule de fonction
            </div>
            {vehiculeFonction ? (
              <>
                <div style={{fontSize:14,fontWeight:800,color:P.green}}>{vehiculeFonction.registration_number}</div>
                <div style={{fontSize:11,color:P.textMid,marginTop:4,marginBottom:6}}>{vehiculeFonction.make} {vehiculeFonction.model} · {vehiculeFonction.year}</div>
                <StatusBadge status={vehiculeFonction.status}/>
              </>
            ) : (
              <div style={{fontSize:12,color:P.textLight,marginTop:8}}>Non assigné</div>
            )}
          </div>
        )}
        <div className="dp-kpi-card" style={{"--kc":counts.attente>0?P.orange:P.textLight}}>
          <div style={{fontSize:9,fontWeight:700,color:P.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10,display:"flex",alignItems:"center",gap:5}}>
            <Clock size={10}/> En attente
          </div>
          <div style={{fontSize:28,fontWeight:900,color:counts.attente>0?P.orange:P.textLight,lineHeight:1}}>{counts.attente}</div>
          <div style={{fontSize:11,color:P.textLight,marginTop:6}}>en cours de validation</div>
        </div>
        <div className="dp-kpi-card" style={{"--kc":P.green}}>
          <div style={{fontSize:9,fontWeight:700,color:P.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10,display:"flex",alignItems:"center",gap:5}}>
            <CheckCircle2 size={10}/> Approuvées
          </div>
          <div style={{fontSize:28,fontWeight:900,color:P.green,lineHeight:1}}>{counts.approuvee}</div>
          <div style={{fontSize:11,color:P.textLight,marginTop:6}}>au total</div>
        </div>
        <div className="dp-kpi-card" onClick={()=>setTab("notifications")}
          style={{"--kc":unread>0?P.red:P.textLight,cursor:"pointer"}}>
          <div style={{fontSize:9,fontWeight:700,color:P.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10,display:"flex",alignItems:"center",gap:5}}>
            <Bell size={10}/> Notifications
          </div>
          <div style={{fontSize:28,fontWeight:900,color:unread>0?P.red:P.textLight,lineHeight:1}}>{unread}</div>
          <div style={{fontSize:11,color:unread>0?P.red:P.textLight,fontWeight:600,marginTop:6}}>non lues</div>
        </div>
      </div>

      {/* Véhicule de fonction */}
      {isDirecteur && vehiculeFonction && (
        <div className="dp-section">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div className="dp-section-title" style={{display:"flex",alignItems:"center",gap:7}}>
                <Car size={15} color={P.green}/> Mon véhicule de fonction
              </div>
              <div className="dp-section-sub" style={{marginBottom:0}}>{vehiculeFonction.make} {vehiculeFonction.model} · {vehiculeFonction.registration_number}</div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <StatusBadge status={vehiculeFonction.status}/>
              <button onClick={()=>setTab("mon-vehicule")} style={{...S.ghostBtn,fontSize:11,padding:"5px 12px"}}>
                Détails <ArrowRight size={12}/>
              </button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {[
              {Icon:Car,       label:"Marque / Modèle",  value:`${vehiculeFonction.make} ${vehiculeFonction.model}`},
              {Icon:Shield,    label:"Immatriculation",  value:vehiculeFonction.registration_number, big:true},
              {Icon:Star,      label:"Année",            value:vehiculeFonction.year},
              {Icon:TrendingUp,label:"Kilométrage",      value:`${Number(vehiculeFonction.current_mileage||0).toLocaleString("fr-FR")} km`},
              {Icon:Fuel,      label:"Carburant",        value:vehiculeFonction.fuel_type||"—"},
              {Icon:Activity,  label:"Couleur",          value:vehiculeFonction.color||"—"},
            ].map((f,i)=>{
              const { Icon } = f;
              return (
                <div key={i} style={{padding:"12px 14px",background:P.bg,borderRadius:9,border:`1px solid ${P.border}`}}>
                  <div style={{fontSize:9,color:P.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:5,display:"flex",alignItems:"center",gap:4}}>
                    <Icon size={9} color={P.green}/> {f.label}
                  </div>
                  <div style={{fontSize:f.big?18:13,fontWeight:f.big?800:600,color:P.text}}>{f.value||"—"}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isDirecteur && !vehiculeFonction && (
        <div style={{background:P.orangeLight,borderRadius:10,padding:"14px 18px",fontSize:13,color:P.orange,fontWeight:600,display:"flex",alignItems:"center",gap:10,border:`1px solid ${P.orangeLine}`}}>
          <AlertTriangle size={16}/> Aucun véhicule de fonction assigné. Le gestionnaire vous en assignera un.
        </div>
      )}

      {/* Alertes + réservations récentes */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div className="dp-section">
          <div className="dp-section-title" style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
            <Bell size={14} color={P.green}/> Mes alertes
          </div>
          <div className="dp-section-sub">Informations importantes</div>
          {notifList.map((n,i)=>{
            const st=NOTIF_COLORS[n.level];
            const { Icon } = n;
            return (
              <div key={i} className={`dp-notif-row ${n.level}`}>
                <Icon size={16} color={st.text} style={{flexShrink:0,marginTop:1}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:st.text,marginBottom:2}}>{n.title}</div>
                  <div style={{fontSize:11,color:P.textMid,lineHeight:1.4}}>{n.desc}</div>
                </div>
                {n.action&&n.label&&(
                  <button onClick={n.action} style={{flexShrink:0,padding:"4px 10px",background:st.btnBg,color:st.btnText,border:"none",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                    {n.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="dp-section">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <div className="dp-section-title" style={{display:"flex",alignItems:"center",gap:7}}>
              <Calendar size={14} color={P.green}/> {isDirecteur?"Réservations récentes":"Demandes récentes"}
            </div>
            <button onClick={()=>setTab("reservations")} style={{...S.ghostBtn,fontSize:11,padding:"5px 12px"}}>
              Voir tout <ArrowRight size={12}/>
            </button>
          </div>
          <div className="dp-section-sub">{counts.tous} réservation{counts.tous>1?"s":""} · {counts.attente} en attente</div>
          {reservations.length===0 ? (
            <Empty text="Aucune réservation pour le moment" icon={<Calendar size={32} color={P.textLight}/>}/>
          ) : (
            reservations.slice(0,4).map((r,i)=>(
              <div key={i} className="dp-activity-row">
                <div style={{width:36,height:36,borderRadius:9,flexShrink:0,background:P.greenLight,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Car size={16} color={P.green}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:12,color:P.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.destination||"—"}</div>
                  <div style={{fontSize:11,color:P.textLight,marginTop:1}}>{fmtDate(r.start_date)}{r.purpose?` · ${r.purpose}`:""}</div>
                </div>
                <StatusBadge status={r.status}/>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB MON VÉHICULE
// ─────────────────────────────────────────────────────────────────────────────
function TabMonVehicule({ vehicule }) {
  if (!vehicule) return (
    <div className="dp-section">
      <Empty text="Aucun véhicule de fonction assigné" icon={<Car size={40} color={P.textLight}/>}/>
    </div>
  );
  const fields = [
    {Icon:Car,       label:"Marque / Modèle",  value:`${vehicule.make} ${vehicule.model}`},
    {Icon:Shield,    label:"Immatriculation",  value:vehicule.registration_number, big:true},
    {Icon:Star,      label:"Année",            value:vehicule.year},
    {Icon:TrendingUp,label:"Kilométrage",      value:`${Number(vehicule.current_mileage||0).toLocaleString("fr-FR")} km`},
    {Icon:Fuel,      label:"Type carburant",   value:vehicule.fuel_type||"—"},
    {Icon:Activity,  label:"Couleur",          value:vehicule.color||"—"},
    {Icon:Users,     label:"Nb places",        value:vehicule.seating_capacity},
    {Icon:Settings,  label:"Transmission",     value:vehicule.transmission||"—"},
    {Icon:FileText,  label:"Code interne",     value:vehicule.internal_code||"—"},
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="dp-section">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div className="dp-section-title" style={{display:"flex",alignItems:"center",gap:7}}>
              <Car size={15} color={P.green}/> {vehicule.make} {vehicule.model} — {vehicule.registration_number}
            </div>
            <div className="dp-section-sub" style={{marginBottom:0}}>Véhicule de fonction assigné</div>
          </div>
          <StatusBadge status={vehicule.status}/>
        </div>
        {vehicule.current_mileage > 0 && (
          <div style={{background:P.bg,borderRadius:9,padding:"12px 14px",marginBottom:14,border:`1px solid ${P.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:6}}>
              <span style={{color:P.textMid,fontWeight:600,display:"flex",alignItems:"center",gap:4}}><TrendingUp size={11}/> Kilométrage actuel</span>
              <span style={{fontWeight:800,color:P.green}}>{Number(vehicule.current_mileage).toLocaleString("fr-FR")} km</span>
            </div>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {fields.map((f,i)=>{
            const { Icon } = f;
            return (
              <div key={i} style={{padding:"12px 14px",background:P.bg,borderRadius:9,border:`1px solid ${P.border}`}}>
                <div style={{fontSize:9,color:P.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:5,display:"flex",alignItems:"center",gap:4}}>
                  <Icon size={9} color={P.green}/> {f.label}
                </div>
                <div style={{fontSize:f.big?18:13,fontWeight:f.big?800:600,color:P.text}}>{f.value||"—"}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB RÉSERVATIONS — avec filtres + compteurs
// ─────────────────────────────────────────────────────────────────────────────
function TabReservations({ reservations, isDirecteur, onNew }) {
  const [filter, setFilter] = useState("TOUS");
  const counts = getReservationCounts(reservations);

  // Mapping filtre → statuts API
  const filterToStatuts = {
    TOUS:     null,
    ATTENTE:  ["PENDING","EN_ATTENTE"],
    APPROUVEE:["APPROVED","APPROUVEE","EN_COURS"],
    REJETEE:  ["REJECTED","REJETEE"],
    TERMINEE: ["COMPLETED","TERMINEE"],
    ANNULEE:  ["ANNULEE"],
  };

  const filtered = filter==="TOUS"
    ? reservations
    : reservations.filter(r => filterToStatuts[filter]?.includes(r.status));

  // Config des filtres avec compteurs et couleurs
  const FILTERS = [
    { val:"TOUS",      label:"Toutes",        count:counts.tous,      color:P.green,  bg:P.greenLight  },
    { val:"ATTENTE",   label:"En attente",    count:counts.attente,   color:P.orange, bg:P.orangeLight },
    { val:"APPROUVEE", label:"Approuvées",    count:counts.approuvee, color:P.green,  bg:P.greenLight  },
    { val:"REJETEE",   label:"Refusées",      count:counts.rejetee,   color:P.red,    bg:P.redLight    },
    { val:"TERMINEE",  label:"Terminées",     count:counts.terminee,  color:P.slate,  bg:P.slateLight  },
  ].filter(f => f.val==="TOUS" || f.count > 0); // Masquer les filtres vides sauf "Toutes"

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="dp-section">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div className="dp-section-title" style={{display:"flex",alignItems:"center",gap:7}}>
              <Calendar size={15} color={P.green}/> {isDirecteur?"Mes réservations":"Mes demandes de véhicule"}
            </div>
            <div className="dp-section-sub" style={{marginBottom:0}}>
              {counts.tous} au total · {counts.attente} en attente · {counts.approuvee} approuvée{counts.approuvee>1?"s":""}
            </div>
          </div>
          <button onClick={onNew} style={S.btn}>
            <Plus size={14}/> {isDirecteur?"Nouvelle réservation":"Nouvelle demande"}
          </button>
        </div>

        {/* Filtres avec compteurs */}
        <div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap"}}>
          {FILTERS.map(f=>{
            const active = filter===f.val;
            return (
              <button key={f.val} className="dp-filter-pill" onClick={()=>setFilter(f.val)}
                style={{
                  background: active ? f.color : P.bg,
                  color:      active ? "#fff" : P.textMid,
                  border:     `1.5px solid ${active ? f.color : P.border}`,
                }}>
                {f.label}
                <span className="count" style={{
                  background: active ? "rgba(255,255,255,.25)" : `${f.color}20`,
                  color:      active ? "#fff" : f.color,
                  fontWeight:800,
                }}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Résultat */}
        {filtered.length===0 ? (
          <div style={{textAlign:"center",padding:"36px 0",color:P.textLight}}>
            <Calendar size={36} color={P.border} style={{margin:"0 auto 10px"}}/>
            <div style={{fontSize:13}}>
              {filter==="TOUS"
                ? "Aucune réservation pour le moment"
                : `Aucune réservation dans la catégorie "${FILTERS.find(f=>f.val===filter)?.label}"`}
            </div>
            <button onClick={onNew} style={{...S.btn,margin:"14px auto 0",justifyContent:"center"}}>
              <Plus size={13}/> Faire une demande
            </button>
          </div>
        ) : (
          filtered.map((r,i)=>(
            <div key={i} style={{background:P.bg,border:`1px solid ${P.border}`,borderRadius:10,padding:"14px 16px",marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:P.text,display:"flex",alignItems:"center",gap:6}}>
                    <MapPin size={13} color={P.green}/> {r.destination||"—"}
                  </div>
                  <div style={{fontSize:12,color:P.textLight,marginTop:3}}>{r.vehicle_name||"Véhicule non assigné"}</div>
                </div>
                <StatusBadge status={r.status}/>
              </div>
              <div style={{display:"flex",gap:16,fontSize:12,color:P.textMid,flexWrap:"wrap"}}>
                <span style={{display:"flex",alignItems:"center",gap:4}}><Calendar size={11}/> {fmtDate(r.start_date)}</span>
                {r.end_date && r.end_date!==r.start_date && (
                  <span style={{display:"flex",alignItems:"center",gap:4}}><ArrowRight size={11}/> {fmtDate(r.end_date)}</span>
                )}
                {r.number_of_passengers && <span style={{display:"flex",alignItems:"center",gap:4}}><Users size={11}/> {r.number_of_passengers} pers.</span>}
                {r.purpose && <span style={{color:P.textMid}}>Motif : {r.purpose}</span>}
              </div>
              {r.rejection_reason && (
                <div style={{marginTop:8,fontSize:11,color:P.red,background:P.redLight,borderRadius:7,padding:"6px 10px",display:"flex",alignItems:"center",gap:5,border:`1px solid ${P.redLine}`}}>
                  <AlertTriangle size={11}/> Motif de refus : {r.rejection_reason}
                </div>
              )}
              {r.driver_name && (
                <div style={{marginTop:6,fontSize:11,color:P.green,display:"flex",alignItems:"center",gap:5}}>
                  <CheckCircle2 size={11}/> Chauffeur : {r.driver_name}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB HISTORIQUE — avec compteurs sur filtres
// ─────────────────────────────────────────────────────────────────────────────
function TabHistorique({ reservations }) {
  const [filter, setFilter] = useState("TOUS");
  const done = reservations.filter(r=>["APPROUVEE","APPROVED","TERMINEE","COMPLETED","REJETEE","REJECTED","ANNULEE"].includes(r.status));

  const historiqueCounts = {
    tous:       done.length,
    approuvee:  done.filter(r=>["APPROUVEE","APPROVED","TERMINEE","COMPLETED"].includes(r.status)).length,
    rejetee:    done.filter(r=>["REJETEE","REJECTED"].includes(r.status)).length,
    annulee:    done.filter(r=>r.status==="ANNULEE").length,
  };

  const HIST_FILTERS = [
    {val:"TOUS",      label:"Toutes",     count:historiqueCounts.tous,     color:P.green,  bg:P.greenLight  },
    {val:"APPROUVEE", label:"Approuvées", count:historiqueCounts.approuvee,color:P.green,  bg:P.greenLight  },
    {val:"REJETEE",   label:"Refusées",   count:historiqueCounts.rejetee,  color:P.red,    bg:P.redLight    },
  ].filter(f=>f.val==="TOUS"||f.count>0);

  const filtered = filter==="TOUS" ? done
    : filter==="APPROUVEE" ? done.filter(r=>["APPROUVEE","APPROVED","TERMINEE","COMPLETED"].includes(r.status))
    : done.filter(r=>["REJETEE","REJECTED"].includes(r.status));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {[
          {label:"Total trajets",  val:historiqueCounts.tous,      color:P.green,  Icon:Activity},
          {label:"Approuvées",     val:historiqueCounts.approuvee, color:P.green,  Icon:CheckCircle2},
          {label:"Refusées",       val:historiqueCounts.rejetee,   color:P.red,    Icon:XCircle},
        ].map((k,i)=>{
          const { Icon } = k;
          return (
            <div key={i} className="dp-kpi-card" style={{"--kc":k.color}}>
              <div style={{fontSize:9,fontWeight:700,color:P.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10,display:"flex",alignItems:"center",gap:5}}>
                <Icon size={10}/> {k.label}
              </div>
              <div style={{fontSize:28,fontWeight:900,color:k.color,lineHeight:1}}>{k.val}</div>
            </div>
          );
        })}
      </div>

      <div className="dp-section">
        <div className="dp-section-title" style={{display:"flex",alignItems:"center",gap:7,marginBottom:12}}>
          <History size={14} color={P.green}/> Historique de mes courses
        </div>

        {/* Filtres avec compteurs */}
        <div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap"}}>
          {HIST_FILTERS.map(f=>{
            const active=filter===f.val;
            return (
              <button key={f.val} className="dp-filter-pill" onClick={()=>setFilter(f.val)}
                style={{background:active?f.color:P.bg,color:active?"#fff":P.textMid,border:`1.5px solid ${active?f.color:P.border}`}}>
                {f.label}
                <span className="count" style={{background:active?"rgba(255,255,255,.25)":`${f.color}20`,color:active?"#fff":f.color,fontWeight:800}}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {filtered.length===0 ? (
          <Empty text="Aucun trajet dans cette catégorie" icon={<History size={32} color={P.textLight}/>}/>
        ) : (
          filtered.map((r,i)=>{
            const approved=["APPROUVEE","APPROVED","TERMINEE","COMPLETED"].includes(r.status);
            return (
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:`1px solid ${P.border}`}}>
                <div style={{width:36,height:36,borderRadius:9,background:approved?P.greenLight:P.redLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {approved ? <CheckCircle2 size={16} color={P.green}/> : <XCircle size={16} color={P.red}/>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:P.text}}>{r.destination||"—"}</div>
                  <div style={{fontSize:11,color:P.textLight,marginTop:2}}>
                    {fmtDate(r.start_date)}{r.number_of_passengers?` · ${r.number_of_passengers} pers.`:""}
                  </div>
                  {r.purpose && <div style={{fontSize:11,color:P.textMid,marginTop:2}}>Motif : {r.purpose}</div>}
                  {r.rejection_reason && (
                    <div style={{fontSize:11,color:P.red,marginTop:4,background:P.redLight,borderRadius:6,padding:"4px 8px",display:"flex",alignItems:"center",gap:4,border:`1px solid ${P.redLine}`}}>
                      <AlertTriangle size={10}/> {r.rejection_reason}
                    </div>
                  )}
                </div>
                <StatusBadge status={r.status}/>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB NOTIFICATIONS — fonctionnel avec marquer comme lu
// ─────────────────────────────────────────────────────────────────────────────
function TabNotifications({ notifications, onMarkRead, onMarkAllRead, onRefresh }) {
  const [filter, setFilter] = useState("TOUTES");

  const isUnread = n => n.status==="NON_LU" || n.is_read===false;
  const unread = notifications.filter(isUnread).length;

  const NOTIF_TYPE = {
    SUCCESS: { color:P.green,  bg:P.greenLight,  border:P.greenLine,  Icon:CheckCircle2 },
    WARNING: { color:P.orange, bg:P.orangeLight, border:P.orangeLine, Icon:AlertTriangle },
    ERROR:   { color:P.red,    bg:P.redLight,    border:P.redLine,    Icon:AlertTriangle },
    DANGER:  { color:P.red,    bg:P.redLight,    border:P.redLine,    Icon:AlertTriangle },
    INFO:    { color:P.slate,  bg:P.slateLight,  border:P.border,     Icon:Info         },
  };

  const NOTIF_FILTERS = [
    {val:"TOUTES",  label:"Toutes",     count:notifications.length},
    {val:"NONLUES", label:"Non lues",   count:unread},
    {val:"LUES",    label:"Lues",       count:notifications.length-unread},
  ];

  const filtered = filter==="TOUTES"  ? notifications
    : filter==="NONLUES" ? notifications.filter(isUnread)
    : notifications.filter(n=>!isUnread(n));

  // Grouper par date
  const groupByDate = (list) => {
    const groups = {};
    list.forEach(n => {
      const d = n.created_at ? new Date(n.created_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"}) : "Sans date";
      if (!groups[d]) groups[d] = [];
      groups[d].push(n);
    });
    return Object.entries(groups);
  };
  const grouped = groupByDate(filtered);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="dp-section">
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div className="dp-section-title" style={{display:"flex",alignItems:"center",gap:7}}>
              <Bell size={15} color={P.green}/> Notifications
            </div>
            <div className="dp-section-sub" style={{marginBottom:0}}>
              {notifications.length} au total · <span style={{color:unread>0?P.red:P.textLight,fontWeight:unread>0?700:400}}>{unread} non lue{unread>1?"s":""}</span>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={onRefresh}
              style={{...S.ghostBtn,fontSize:11,padding:"6px 12px"}}>
              <RefreshCw size={12}/> Actualiser
            </button>
            {unread>0 && (
              <button onClick={onMarkAllRead}
                style={{...S.btn,fontSize:11,padding:"6px 12px"}}>
                <Eye size={12}/> Tout marquer comme lu
              </button>
            )}
          </div>
        </div>

        {/* Filtres avec compteurs */}
        <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>
          {NOTIF_FILTERS.map(f=>{
            const active=filter===f.val;
            const activeColor = f.val==="NONLUES"?P.red:f.val==="LUES"?P.slate:P.green;
            return (
              <button key={f.val} className="dp-filter-pill" onClick={()=>setFilter(f.val)}
                style={{background:active?activeColor:P.bg,color:active?"#fff":P.textMid,border:`1.5px solid ${active?activeColor:P.border}`}}>
                {f.label}
                <span className="count" style={{background:active?"rgba(255,255,255,.25)":`${activeColor}20`,color:active?"#fff":activeColor,fontWeight:800}}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Liste */}
        {filtered.length===0 ? (
          <Empty text={filter==="NONLUES"?"Aucune notification non lue — tout est à jour !":"Aucune notification"} icon={<BellOff size={36} color={P.textLight}/>}/>
        ) : (
          grouped.map(([date, list]) => (
            <div key={date} style={{marginBottom:16}}>
              {/* Groupe date */}
              <div style={{fontSize:10,fontWeight:700,color:P.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8,padding:"4px 0",borderBottom:`1px solid ${P.border}`}}>
                {date}
              </div>
              {list.map((n, i) => {
                const unreadItem = isUnread(n);
                const typeCfg = NOTIF_TYPE[n.type||"INFO"] || NOTIF_TYPE.INFO;
                const { Icon: NotifIcon } = typeCfg;
                return (
                  <div key={n.id||i}
                    className={`dp-notif-item ${unreadItem?"unread":"read"}`}
                    style={{marginBottom:6}}>
                    {/* Icône type */}
                    <div style={{width:36,height:36,borderRadius:9,background:typeCfg.bg,border:`1px solid ${typeCfg.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <NotifIcon size={16} color={typeCfg.color}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:3}}>
                        <div style={{fontSize:13,fontWeight:unreadItem?700:500,color:P.text,lineHeight:1.4}}>
                          {n.title || n.message || "Notification"}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                          {unreadItem && (
                            <span style={{width:8,height:8,borderRadius:"50%",background:P.green,display:"inline-block",flexShrink:0}} className="dp-pulse"/>
                          )}
                          <span style={{fontSize:10,color:P.textLight,whiteSpace:"nowrap"}}>{fmtTimeAgo(n.created_at)}</span>
                        </div>
                      </div>
                      {n.message && n.title && n.message !== n.title && (
                        <div style={{fontSize:12,color:P.textMid,lineHeight:1.5,marginBottom:4}}>{n.message}</div>
                      )}
                      {n.created_at && (
                        <div style={{fontSize:10,color:P.textXLight||P.textLight}}>{fmtDateTime(n.created_at)}</div>
                      )}
                    </div>
                    {/* Action marquer comme lu */}
                    {unreadItem && (
                      <button
                        onClick={()=>onMarkRead(n.id)}
                        style={{flexShrink:0,padding:"4px 10px",background:"transparent",color:P.green,border:`1px solid ${P.greenLine}`,borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
                        <Eye size={11}/> Lu
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL RÉSERVATION
// ─────────────────────────────────────────────────────────────────────────────
function ModalReservation({ isDirecteur, onClose, onSuccess }) {
  const [form, setForm] = useState({
    destination:"", start_date:"", end_date:"",
    heure_depart:"", heure_retour:"", purpose:"", nb_places:"", notes:"",
    lieu_depart:"", lieu_depart_coords:null,
  });
  const [locLoading,  setLocLoading]  = useState(false);
  const [distLoading, setDistLoading] = useState(false);
  const [locError,    setLocError]    = useState("");
  const [distance,    setDistance]    = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const getGeolocation = () => {
    if (!navigator.geolocation) { setLocError("Géolocalisation non supportée."); return; }
    setLocLoading(true); setLocError("");
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const json = await res.json();
          set("lieu_depart", json.display_name||`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          set("lieu_depart_coords", {lat:latitude,lng:longitude});
        } catch {
          set("lieu_depart", `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          set("lieu_depart_coords", {lat:latitude,lng:longitude});
        } finally { setLocLoading(false); }
      },
      err => { setLocLoading(false); setLocError(err.code===1?"Accès refusé. Activez la localisation.":"Position introuvable."); },
      {timeout:10000,enableHighAccuracy:true}
    );
  };

  const calcDistance = async () => {
    if (!form.lieu_depart_coords||!form.destination.trim()) { setLocError("Localisez-vous d'abord."); return; }
    setDistLoading(true); setLocError("");
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.destination)}&format=json&limit=1`);
      const json = await res.json();
      if (!json.length) { setLocError("Destination introuvable."); return; }
      const dLat=(parseFloat(json[0].lat)-form.lieu_depart_coords.lat)*Math.PI/180;
      const dLng=(parseFloat(json[0].lon)-form.lieu_depart_coords.lng)*Math.PI/180;
      const a=Math.sin(dLat/2)**2+Math.cos(form.lieu_depart_coords.lat*Math.PI/180)*Math.cos(parseFloat(json[0].lat)*Math.PI/180)*Math.sin(dLng/2)**2;
      setDistance(Math.round(6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))));
    } catch { setLocError("Erreur calcul distance."); }
    finally  { setDistLoading(false); }
  };

  const nb = parseInt(form.nb_places);
  const reco = !nb||isNaN(nb) ? null
    : nb<=5  ? {label:"Tourisme / Utilitaire",   Icon:Car,   color:P.green,  bg:P.greenLight,  detail:"jusqu'à 5 places"}
    : nb<=30 ? {label:"1 Bus",                   Icon:Users, color:P.green,  bg:P.greenLight,  detail:"6 à 30 places"}
    : nb<=60 ? {label:"2 Bus",                   Icon:Users, color:P.orange, bg:P.orangeLight, detail:"31 à 60 places"}
    : nb<=90 ? {label:"3 Bus",                   Icon:Users, color:P.orange, bg:P.orangeLight, detail:"61 à 90 places"}
    :          {label:`${Math.ceil(nb/30)} Bus`,  Icon:Users, color:P.red,    bg:P.redLight,    detail:`${nb} personnes`};

  const handleSubmit = async () => {
    if (!form.destination||!form.start_date||!form.heure_depart||!form.purpose||!form.nb_places) {
      alert("Remplissez tous les champs obligatoires (*)"); return;
    }
    setSubmitting(true);
    const payload = {
      destination:          form.destination.trim(),
      purpose:              form.purpose.trim(),
      start_date:           `${form.start_date}T${form.heure_depart}:00`,
      end_date:             `${form.end_date||form.start_date}T${form.heure_retour||"18:00"}:00`,
      number_of_passengers: parseInt(form.nb_places)||1,
      ...(distance!=null && {estimated_distance:distance}),
      ...(form.lieu_depart && {notes:`Lieu de départ : ${form.lieu_depart}${form.notes?" | "+form.notes:""}`}),
    };
    try {
      const token = localStorage.getItem("access_token")||sessionStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/reservations/`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});
      if (!res.ok) { const json=await res.json(); alert("Erreur : "+(json?.message||JSON.stringify(json))); return; }
      onSuccess();
    } catch { alert("Impossible de joindre le serveur."); }
    finally  { setSubmitting(false); }
  };

  const inpStyle = {
    padding:"9px 12px", border:`1.5px solid ${P.border}`, borderRadius:8,
    fontSize:13, fontFamily:"inherit", color:P.text, background:P.white,
    width:"100%", outline:"none", transition:"border-color .15s",
    colorScheme:"light",
  };
  const lblStyle = {
    fontSize:10, fontWeight:700, color:P.textMid, textTransform:"uppercase",
    letterSpacing:"1px", marginBottom:5, display:"flex", alignItems:"center", gap:5,
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
      <div style={{background:P.white,borderRadius:16,padding:26,width:620,maxWidth:"96vw",maxHeight:"93vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:P.text,display:"flex",alignItems:"center",gap:8}}>
              <Plus size={16} color={P.green}/> {isDirecteur?"Nouvelle réservation":"Demande de véhicule avec chauffeur"}
            </div>
            <div style={{fontSize:11,color:P.textLight,marginTop:2}}>
              {isDirecteur ? "Réservez un véhicule du parc" : "Votre demande sera traitée par le gestionnaire"}
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:P.textLight,display:"flex"}}>
            <X size={20}/>
          </button>
        </div>

        {!isDirecteur && (
          <div style={{background:P.orangeLight,border:`1px solid ${P.orangeLine}`,borderRadius:9,padding:"10px 14px",fontSize:12,color:P.orange,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
            <Info size={13}/> Votre demande sera traitée avec un chauffeur assigné par le gestionnaire.
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div>
              <label style={lblStyle}><MapPin size={11} color={P.green}/> Destination *</label>
              <input style={inpStyle} value={form.destination} onChange={e=>set("destination",e.target.value)} placeholder="Ex: Yaoundé, Akwa…"/>
            </div>
            <div>
              <label style={lblStyle}><FileText size={11} color={P.green}/> Motif *</label>
              <input style={inpStyle} value={form.purpose} onChange={e=>set("purpose",e.target.value)} placeholder="Ex: Réunion, Conférence…"/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div>
              <label style={lblStyle}><Calendar size={11} color={P.green}/> Date de départ *</label>
              <input type="date" style={inpStyle} value={form.start_date} onChange={e=>set("start_date",e.target.value)}/>
            </div>
            <div>
              <label style={lblStyle}><Calendar size={11} color={P.green}/> Date de retour</label>
              <input type="date" style={inpStyle} value={form.end_date} onChange={e=>set("end_date",e.target.value)}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div>
              <label style={lblStyle}><Clock size={11} color={P.green}/> Heure de départ *</label>
              <input type="time" style={inpStyle} value={form.heure_depart} onChange={e=>set("heure_depart",e.target.value)}/>
            </div>
            <div>
              <label style={lblStyle}><Clock size={11} color={P.green}/> Heure de retour estimée</label>
              <input type="time" style={inpStyle} value={form.heure_retour} onChange={e=>set("heure_retour",e.target.value)}/>
            </div>
          </div>

          <div>
            <label style={lblStyle}><Locate size={11} color={P.green}/> Lieu de prise en charge</label>
            <div style={{display:"flex",gap:8}}>
              <input style={{...inpStyle,flex:1}} placeholder="Votre adresse ou cliquez Me localiser"
                value={form.lieu_depart} onChange={e=>{set("lieu_depart",e.target.value);setDistance(null);}}/>
              <button onClick={getGeolocation} disabled={locLoading}
                style={{...S.btn,whiteSpace:"nowrap",opacity:locLoading?.7:1,flexShrink:0}}>
                <Locate size={13}/> {locLoading?"Localisation…":"Me localiser"}
              </button>
            </div>
            {form.lieu_depart_coords&&form.destination&&(
              <button onClick={calcDistance} disabled={distLoading}
                style={{marginTop:8,padding:"6px 12px",background:P.greenLight,color:P.green,border:`1px solid ${P.greenLine}`,borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                <Ruler size={12}/> {distLoading?`Calcul…`:`Calculer distance vers ${form.destination}`}
              </button>
            )}
            {distance!==null && (
              <div style={{marginTop:8,background:P.greenLight,borderRadius:9,padding:"10px 14px",fontSize:12,color:P.green,fontWeight:600,display:"flex",alignItems:"center",gap:6,border:`1px solid ${P.greenLine}`}}>
                <Navigation size={13}/> Distance estimée : <strong>{distance} km</strong>
              </div>
            )}
            {locError && (
              <div style={{fontSize:11,color:P.red,marginTop:6,display:"flex",alignItems:"center",gap:4}}>
                <AlertTriangle size={11}/> {locError}
              </div>
            )}
          </div>

          <div>
            <label style={lblStyle}><Users size={11} color={P.green}/> Nombre de personnes *</label>
            <input style={{...inpStyle,width:120,textAlign:"center",fontSize:16,fontWeight:700,marginTop:4}}
              type="number" min="1" max="200" placeholder="Ex: 12"
              value={form.nb_places} onChange={e=>set("nb_places",e.target.value)}/>
            {reco && (
              <div style={{marginTop:10,background:reco.bg,borderRadius:9,padding:"12px 14px",border:`1px solid ${reco.color}25`,display:"flex",alignItems:"center",gap:10}}>
                <reco.Icon size={18} color={reco.color}/>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:reco.color}}>Recommandé : {reco.label}</div>
                  <div style={{fontSize:11,color:P.textMid}}>{reco.detail}</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={lblStyle}><FileText size={11} color={P.green}/> Notes complémentaires</label>
            <textarea style={{...inpStyle,height:65,resize:"vertical",marginTop:4}}
              placeholder="Informations supplémentaires…"
              value={form.notes} onChange={e=>set("notes",e.target.value)}/>
          </div>
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20}}>
          <button onClick={onClose} style={S.ghostBtn}><X size={13}/> Annuler</button>
          <button onClick={handleSubmit} disabled={submitting}
            style={{...S.btn,opacity:submitting?.7:1,minWidth:160}}>
            {submitting ? "Envoi en cours…" : <><CheckCircle2 size={14}/> Envoyer la demande</>}
          </button>
        </div>
      </div>
    </div>
  );
}
