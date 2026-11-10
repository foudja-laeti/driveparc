
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { C, S, CSS } from "../../constants";
import { Loader, BellIcon, LogoutIcon } from "../../components/ui";
import { TabDepenses }        from "../depenses/TabDepenses";
import { TabRapports }        from "../rapports/TabRapports";
import { TabUtilisateurs }    from "../../utilisateurs/Utilisateurs";

// ── Icônes SVG inline (copiées du Dashboard gestionnaire) ────────────────────
function NavIcon({ id }) {
  const icons = {
    grid: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    users: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    money: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    chart: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
        <line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
  };
  return icons[id] ?? <span style={{ width:16, height:16, display:"inline-block" }} />;
}

// ── Navigation — seulement 4 modules pour l'admin ────────────────────────────
const NAV_ADMIN = [
  { id:"dashboard",    icon:"grid",  label:"Tableau de bord" },
  { id:"utilisateurs", icon:"users", label:"Utilisateurs"    },
  { id:"depenses",     icon:"money", label:"Dépenses"        },
  { id:"rapports",     icon:"chart", label:"Rapports"        },
];

// ── CSS collapse sidebar (repris du Dashboard gestionnaire) ──────────────────
const COLLAPSE_CSS = `
  .nav-btn:hover { background: ${C.sideHover ?? "#14472A"}!important; color:#fff!important; }
  .logout-btn:hover { background:rgba(192,24,42,0.4)!important; }
  .collapse-btn:hover { background:rgba(255,255,255,0.15)!important; }
  .nav-wrap { position:relative; }
  .nav-tooltip {
    position:absolute; left:calc(100% + 12px); top:50%; transform:translateY(-50%);
    background:#1A2820; color:#fff; padding:5px 10px; border-radius:7px;
    font-size:12px; font-weight:600; white-space:nowrap; pointer-events:none;
    opacity:0; transition:opacity .15s; z-index:9999;
    box-shadow:0 4px 12px rgba(0,0,0,.25);
  }
  .nav-tooltip::before {
    content:''; position:absolute; right:100%; top:50%; transform:translateY(-50%);
    border:5px solid transparent; border-right-color:#1A2820;
  }
  .nav-wrap:hover .nav-tooltip { opacity:1; }
  .sidebar-col-anim { transition:width .22s cubic-bezier(.4,0,.2,1); }
  .sidebar-anim     { transition:margin .22s cubic-bezier(.4,0,.2,1); }
  .brand-anim       { transition:all .22s cubic-bezier(.4,0,.2,1); }
`;

// ─────────────────────────────────────────────────────────────────────────────
// MINI DASHBOARD — vue résumé pour l'administrateur
// Affiche les mêmes stats que le gestionnaire en lecture seule
// ─────────────────────────────────────────────────────────────────────────────
function AdminDashboard({ vehicles, vehStats, reservations }) {
  const total       = vehStats?.total       ?? vehicles.length;
  const disponibles = vehStats?.disponibles ?? vehicles.filter(v => v.status === "DISPONIBLE").length;
  const enService   = vehStats?.en_service  ?? vehicles.filter(v => v.status === "EN_SERVICE").length;
  const enMaint     = vehStats?.maintenance ?? vehicles.filter(v => v.status === "EN_MAINTENANCE").length;
  const horsService = vehicles.filter(v => v.status === "HORS_SERVICE").length;

  const statCards = [
    { label:"Véhicules total",    val:total,       color:"#1B5E37", icon:"🚗", bg:"#EAF4EE" },
    { label:"Disponibles",        val:disponibles,  color:"#15803D", icon:"✅", bg:"#F0FDF4" },
    { label:"En service",         val:enService,    color:"#D97706", icon:"🔄", bg:"#FFFBEB" },
    { label:"En maintenance",     val:enMaint,      color:"#C0182A", icon:"🔧", bg:"#FDF0F1" },
    { label:"Hors service",       val:horsService,  color:"#6B7280", icon:"🚫", bg:"#F3F4F6" },
    { label:"Réservations actives",val:reservations.length, color:"#1D4ED8", icon:"📋", bg:"#EFF6FF" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

      {/* Bandeau supervision */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", background:"#F0FDF4", border:"1.5px solid #BBF7D0", borderRadius:12 }}>
        <span style={{ fontSize:22 }}>👁️</span>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:"#1B5E37" }}>Mode supervision — Administrateur</div>
          <div style={{ fontSize:12, color:"#4A6358", marginTop:2 }}>
            Vous consultez les données en lecture seule. Pour modifier des éléments, contactez un gestionnaire.
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        {statCards.map((s, i) => (
          <div key={i} style={{ background:"#fff", borderRadius:12, padding:"16px 20px", border:"1.5px solid #E8EDEB", borderTop:`3px solid ${s.color}`, boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div style={{ fontSize:9, fontWeight:700, color:"#8EA99A", textTransform:"uppercase", letterSpacing:"1px" }}>{s.label}</div>
              <span style={{ fontSize:18 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize:28, fontWeight:900, color:s.color, lineHeight:1 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Répartition parc */}
      <div style={{ background:"#fff", borderRadius:12, padding:"18px 20px", border:"1.5px solid #E8EDEB" }}>
        <div style={{ fontSize:14, fontWeight:800, color:"#1A2820", marginBottom:14 }}>📊 État du parc automobile</div>
        {[
          { label:"Disponibles",    count:disponibles, color:"#15803D" },
          { label:"En service",     count:enService,   color:"#D97706" },
          { label:"En maintenance", count:enMaint,     color:"#C0182A" },
          { label:"Hors service",   count:horsService, color:"#6B7280" },
        ].map(row => {
          const pct = total > 0 ? Math.round(row.count / total * 100) : 0;
          return (
            <div key={row.label} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
                <span style={{ color:"#4A6358", fontWeight:500 }}>{row.label}</span>
                <span style={{ fontWeight:700, color:row.color }}>{row.count} ({pct}%)</span>
              </div>
              <div style={{ height:6, background:"#E8EDEB", borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:row.color, borderRadius:99, transition:"width .5s" }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info navigation */}
      <div style={{ background:"#F5F7F6", borderRadius:12, padding:"14px 18px", border:"1.5px dashed #CBD5CE" }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#4A6358", marginBottom:8 }}>📌 Modules disponibles en supervision</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {["👁️ Ce tableau de bord", "👥 Utilisateurs", "💰 Dépenses", "📊 Rapports"].map((m,i) => (
            <span key={i} style={{ padding:"5px 12px", background:"#fff", border:"1.5px solid #E8EDEB", borderRadius:8, fontSize:12, fontWeight:600, color:"#1A2820" }}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL — DashboardAdmin
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
        apiFetch("/vehicles/").catch(() => ({ results: [] })),
        apiFetch("/reservations/?status=EN_ATTENTE").catch(() => ({ results: [] })),
        apiFetch("/vehicles/stats/").catch(() => null),
      ]);
      setUser(u);
      setVehicles(Array.isArray(v) ? v : v?.results ?? []);
      setReserv(Array.isArray(r) ? r : r?.results ?? []);
      setVehStats(st);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleLogout = () => { localStorage.clear(); sessionStorage.clear(); onLogout?.(); };

  if (loading) return <Loader />;

  const sidebarWidth = collapsed ? 68 : 224;

  return (
    <div style={S.shell}>
      <style>{CSS + COLLAPSE_CSS}</style>

      {/* ── SIDEBAR ── */}
      <div className="sidebar-col-anim" style={{ ...(S.sidebarCol || {}), width:sidebarWidth, overflow:"visible" }}>

        {/* Logo */}
        <div className="brand-anim" style={{ ...(S.sideHeader || {}), justifyContent:collapsed?"center":"flex-start", padding:collapsed?"16px 10px":(S.sideHeader?.padding), overflow:"hidden" }}>
          <img src="/assets/logo (3).png" alt="DriveParc" style={{ height:43.14, width:"auto", objectFit:"contain", flexShrink:0 }}/>
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
        <aside className="sidebar-anim" style={{ ...(S.sidebar || {}), overflow:"visible", position:"relative" }}>

          {/* Bouton collapse */}
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}
            style={{ position:"absolute", top:20, right:-11, width:22, height:22, borderRadius:"50%", background:"#fff", border:`1.5px solid ${C.border}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, boxShadow:"0 2px 6px rgba(0,0,0,.12)", padding:0, color:C.textMid, transition:"background .15s" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition:"transform .22s", transform:collapsed?"rotate(180deg)":"rotate(0deg)" }}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          {/* Badge admin */}
          {!collapsed && (
            <div style={{ margin:"0 12px 10px", padding:"6px 10px", background:"rgba(255,255,255,.12)", borderRadius:8, display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:14 }}>👁️</span>
              <div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.6)", textTransform:"uppercase", letterSpacing:"1px" }}>Mode</div>
                <div style={{ fontSize:11, fontWeight:700, color:"#fff" }}>Supervision</div>
              </div>
            </div>
          )}

          <nav style={{ ...(S.nav || {}), overflowX:"visible" }}>
            {NAV_ADMIN.map(n => {
              const active = tab === n.id;
              return (
                <div key={n.id} className="nav-wrap">
                  <button onClick={() => setTab(n.id)}
                    style={{ ...(S.navItem || {}), ...(active ? (S.navActive || {}) : {}), justifyContent:collapsed?"center":"flex-start", padding:collapsed?"9px 0":(S.navItem?.padding) }}
                    className={active ? "" : "nav-btn"}>
                    <span style={{ display:"flex", opacity:active?1:0.65 }}><NavIcon id={n.icon}/></span>
                    {!collapsed && <span style={S.navLabel}>{n.label}</span>}
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
              style={{ ...(S.logoutBtn || {}), justifyContent:collapsed?"center":"flex-start" }}
              className="logout-btn">
              <LogoutIcon/>
              {!collapsed && <span>Déconnexion</span>}
            </button>
          </div>
        </aside>
      </div>

      {/* ── ZONE PRINCIPALE ── */}
      <div style={S.main}>
        <header style={S.topbar}>
          <div>
            <h1 style={S.pageTitle}>{NAV_ADMIN.find(n => n.id === tab)?.label ?? "Tableau de bord"}</h1>
            <p style={S.pageDate}>{new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {/* Badge Admin */}
            <div style={{ padding:"5px 12px", background:"#EAF4EE", borderRadius:99, fontSize:11, fontWeight:700, color:"#1B5E37", border:"1px solid #BBF7D0" }}>
              👁️ Administrateur
            </div>
            <div style={S.userChip}>
              <div style={S.topAvatar}>{user?.first_name?.[0]}{user?.last_name?.[0]}</div>
              <div>
                <div style={S.topName}>{user?.full_name || `${user?.first_name} ${user?.last_name}`}</div>
                <div style={S.topRole}>Administrateur</div>
              </div>
            </div>
          </div>
        </header>

        <div style={S.content}>
          {tab === "dashboard"    && <AdminDashboard vehicles={vehicles} vehStats={vehStats} reservations={reservations}/>}
          {tab === "utilisateurs" && <TabUtilisateurs/>}
          {tab === "depenses"     && <TabDepenses/>}
          {tab === "rapports"     && <TabRapports/>}
        </div>
      </div>
    </div>
  );
}
ENDOFFILE
