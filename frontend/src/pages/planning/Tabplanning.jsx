// ─── pages/planning/TabPlanning.jsx ──────────────────────────────────────────
// DRIVEPARC IUC — Module Planning Chauffeur
// v4.0 — Corrections :
//   • Palette stricte : vert #1B5E37 / rouge #C0182A / orange #EA580C
//   • 0 bleu, 0 violet, 0 amber parasite
//   • Toutes les icônes via lucide-react (0 emoji dans le code UI)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import {
  Bus, Map, CalendarDays, CheckCircle, AlertTriangle, Clock,
  XCircle, Users, MessageSquare, ChevronDown, ChevronUp,
  MapPin, Fuel, Navigation, ClipboardCheck, Activity,
  RotateCcw, Calendar, ArrowRight, Info, Pencil, Flag,
  TrendingUp, List,
} from "lucide-react";

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
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || json?.message || `Erreur ${res.status}`);
  return json?.data ?? json;
}

// ── Palette stricte ───────────────────────────────────────────────────────────
const C = {
  green:       "#1B5E37",
  greenMid:    "#2D7A4F",
  greenLight:  "#EAF4EE",
  greenXLight: "#F2FAF5",
  greenLine:   "#C8E6D5",
  red:         "#C0182A",
  redLight:    "#FDF0F1",
  redLine:     "#FECDD3",
  orange:      "#EA580C",
  orangeMid:   "#C2410C",
  orangeLight: "#FFF7ED",
  orangeLine:  "#FDBA74",
  white:       "#FFFFFF",
  bg:          "#F4F6F5",
  border:      "#E2E8E4",
  text:        "#1A2820",
  textMid:     "#4A6358",
  textLight:   "#8EA99A",
  slate:       "#64748B",
  slateLight:  "#F1F5F4",
};

// Statuts de pointage — palette vert/orange/rouge uniquement
const STATUS_LOG = {
  EFFECTUE: { label: "Effectué",             color: C.green,  bg: C.greenLight  },
  RETARD:   { label: "Effectué avec retard", color: C.orange, bg: C.orangeLight },
  ANNULE:   { label: "Annulé",               color: C.red,    bg: C.redLight    },
  INCIDENT: { label: "Incident signalé",     color: C.red,    bg: C.redLight    },
};

const fmtDate  = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date) ? "—" : date.toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
};
const fmtHeure = (d) => {
  if (!d) return "—";
  if (/^\d{2}:\d{2}/.test(d)) return d.substring(0, 5);
  const date = new Date(d);
  return isNaN(date) ? "—" : date.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
};

function buildRouteFromProfile(driverProfile, vehicule) {
  if (!driverProfile || driverProfile.assignment_type !== "BUS_SCOLAIRE") return null;
  const veh = driverProfile.assigned_vehicle_info || vehicule;
  if (!veh) return null;
  return {
    id:            veh.id || "local",
    ligne:         veh.internal_code || veh.registration_number || "—",
    nom_trajet:    `Bus scolaire — ${veh.registration_number || veh.license_plate || "—"}`,
    point_depart:  "IUC Logbessou",
    point_arrivee: "IUC Logbessou",
    heure_depart:  driverProfile.bus_slot_start || "05:00",
    heure_arrivee: driverProfile.bus_slot_end   || "08:30",
    jours_service: ["LUN","MAR","MER","JEU","VEN"],
    arrets:        [],
    _from_profile: true,
  };
}

// ── Styles communs ────────────────────────────────────────────────────────────
const inp = {
  padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8,
  fontSize: 13, outline: "none", fontFamily: "inherit", color: C.text,
  background: C.white, width: "100%", transition: "border-color .15s",
};
const lbl = {
  fontSize: 10, fontWeight: 700, color: C.textMid, textTransform: "uppercase",
  letterSpacing: "1px", marginBottom: 5, display: "block",
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export function TabPlanning({ vehicule, isBus }) {
  const [route,         setRoute]         = useState(null);
  const [missions,      setMissions]      = useState([]);
  const [logsSemaine,   setLogsSemaine]   = useState([]);
  const [todayPointage, setTodayPointage] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [jourSel,       setJourSel]       = useState("AUJ");
  const [pointing,      setPointing]      = useState(false);
  const [pointForm,     setPointForm]     = useState({
    status: "EFFECTUE", heure_depart_reelle: "",
    heure_arrivee_reelle: "", nb_passagers: "", commentaire: "",
  });
  const [missionActions, setMissionActions] = useState({});
  const [toast,          setToast]          = useState({ msg: "", type: "success" });

  const today = new Date().toISOString().split("T")[0];

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let driverProfile = null;
      try {
        const profile = await apiFetch("/auth/profile/");
        driverProfile  = profile?.driver_profile ?? null;
      } catch { /* ignore */ }

      setRoute(buildRouteFromProfile(driverProfile, vehicule));

      try {
        const tp = await apiFetch("/pointages/today/");
        setTodayPointage(tp);
        if (tp) {
          setPointForm({
            status:               tp.status               || "EFFECTUE",
            heure_depart_reelle:  tp.heure_depart_reelle  || "",
            heure_arrivee_reelle: tp.heure_arrivee_reelle || "",
            nb_passagers:         tp.nb_passagers?.toString() || "",
            commentaire:          tp.commentaire           || "",
          });
        }
      } catch { setTodayPointage(null); }

      try {
        const logs = await apiFetch("/pointages/semaine/");
        setLogsSemaine(Array.isArray(logs) ? logs : logs?.results ?? []);
      } catch { setLogsSemaine([]); }

      let missionsData = [];
      try {
        const [approuvees, terminees] = await Promise.all([
          apiFetch("/reservations/?driver=me&status=APPROUVEE"),
          apiFetch("/reservations/?driver=me&status=TERMINEE"),
        ]);
        const a = Array.isArray(approuvees) ? approuvees : approuvees?.results ?? [];
        const t = Array.isArray(terminees)  ? terminees  : terminees?.results  ?? [];
        missionsData = [...a, ...t];
      } catch { missionsData = []; }
      setMissions(missionsData);

      const initActions = {};
      missionsData.forEach(m => {
        initActions[m.id] = m.status === "TERMINEE" ? "TERMINEE" : null;
      });
      setMissionActions(initActions);

    } catch (e) {
      console.warn("Erreur chargement planning:", e.message);
    } finally {
      setLoading(false);
    }
  }, [isBus, vehicule]);

  useEffect(() => { loadData(); }, [loadData]);

  const alreadyDone = todayPointage !== null;

  const handlePointer = async () => {
    if (pointForm.status !== "EFFECTUE" && !pointForm.commentaire.trim()) {
      showToast("Un commentaire est obligatoire pour ce statut", "error"); return;
    }
    setPointing(true);
    try {
      const saved = await apiFetch("/pointages/", {
        method: "POST",
        body:   JSON.stringify({
          status:               pointForm.status,
          heure_depart_reelle:  pointForm.heure_depart_reelle  || null,
          heure_arrivee_reelle: pointForm.heure_arrivee_reelle || null,
          nb_passagers:         parseInt(pointForm.nb_passagers) || 0,
          commentaire:          pointForm.commentaire,
        }),
      });
      setTodayPointage(saved);
      try {
        const logs = await apiFetch("/pointages/semaine/");
        setLogsSemaine(Array.isArray(logs) ? logs : logs?.results ?? []);
      } catch { /* ignore */ }
      showToast(alreadyDone ? "Pointage mis à jour" : "Trajet pointé avec succès");
    } catch (e) {
      showToast("Erreur lors du pointage : " + e.message, "error");
    } finally {
      setPointing(false);
    }
  };

  const handlePointerMission = async (mission) => {
    try {
      await apiFetch(`/reservations/${mission.id}/complete/`, {
        method: "POST", body: JSON.stringify({}),
      });
      setMissionActions(prev => ({ ...prev, [mission.id]: "TERMINEE" }));
      showToast("Mission marquée comme effectuée");
    } catch (e) {
      showToast("Erreur : " + e.message, "error");
    }
  };

  const missionsAujourdHui = missions;

  // ── Stats semaine ──────────────────────────────────────────────────────────
  const statsData = [
    { Icon: CheckCircle, label: "Pointages",  val: logsSemaine.filter(l => ["EFFECTUE","RETARD"].includes(l.status)).length, color: C.green  },
    { Icon: Clock,       label: "Retards",    val: logsSemaine.filter(l => l.status === "RETARD").length,                    color: C.orange },
    { Icon: AlertTriangle, label: "Incidents",val: logsSemaine.filter(l => l.status === "INCIDENT").length,                  color: C.red    },
    { Icon: Map,         label: "Missions",   val: missions.length,                                                           color: C.greenMid },
  ];

  const TABS = [
    { key: "AUJ",      Icon: CalendarDays,    label: "Aujourd'hui"   },
    { key: "SEM",      Icon: List,            label: "Cette semaine" },
    { key: "POINTAGE", Icon: ClipboardCheck,  label: "Pointage",     alert: isBus && !alreadyDone },
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0", flexDirection:"column", gap:12 }}>
      <div style={{ width:28, height:28, border:`3px solid ${C.green}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
      <div style={{ fontSize:12, color:C.textLight }}>Chargement du planning…</div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{`
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .plan-card { animation:fadeIn .2s ease; }
        input:focus, select:focus, textarea:focus { border-color:${C.green}!important; box-shadow:0 0 0 3px ${C.green}18!important; outline:none; }
      `}</style>

      {/* Toast */}
      {toast.msg && (
        <div style={{
          position:"fixed", bottom:24, right:24, zIndex:9999,
          background: toast.type === "error" ? C.red : C.green,
          color:"#fff", borderRadius:10, padding:"12px 18px",
          fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:10,
          boxShadow:"0 4px 20px rgba(0,0,0,.2)", maxWidth:380,
        }}>
          {toast.type === "error"
            ? <XCircle size={15}/>
            : <CheckCircle size={15}/>
          }
          {toast.msg}
        </div>
      )}

      {/* Onglets */}
      <div style={{ display:"flex", gap:8, background:C.bg, padding:5, borderRadius:11, border:`1.5px solid ${C.border}` }}>
        {TABS.map(t => {
          const { Icon } = t;
          const active = jourSel === t.key;
          return (
            <button key={t.key} onClick={() => setJourSel(t.key)}
              style={{
                flex:1, padding:"9px 14px", borderRadius:8, fontSize:12, fontWeight:700,
                cursor:"pointer", fontFamily:"inherit", border:"none", transition:"all .12s",
                background: active ? C.white : "transparent",
                color:       active ? C.green : C.textMid,
                boxShadow:   active ? "0 1px 5px rgba(0,0,0,.1)" : "none",
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              }}>
              <Icon size={14}/>
              {t.label}
              {t.alert && (
                <span style={{ background:C.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800,
                  minWidth:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px" }}>
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════ AUJOURD'HUI ════════════ */}
      {jourSel === "AUJ" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1.5px" }}>
            {new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
          </div>

          {/* Avertissement profil estimé */}
          {isBus && route?._from_profile && (
            <div style={{ background:C.orangeLight, border:`1px solid ${C.orangeLine}`, borderRadius:9, padding:"10px 14px", fontSize:12, color:C.orange, display:"flex", alignItems:"flex-start", gap:8 }}>
              <Info size={14} style={{ flexShrink:0, marginTop:1 }}/> 
              <span><strong>Trajet estimé depuis votre profil.</strong> Le gestionnaire peut définir les arrêts et horaires précis depuis le module Véhicules.</span>
            </div>
          )}

          {/* Bus non assigné */}
          {isBus && !route && (
            <div style={{ background:C.white, borderRadius:12, padding:"32px 20px", textAlign:"center", border:`1px solid ${C.border}` }}>
              <Bus size={36} color={C.textLight} style={{ margin:"0 auto 12px" }}/>
              <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:4 }}>Aucun bus scolaire assigné</div>
              <div style={{ fontSize:12, color:C.textLight }}>Le gestionnaire doit vous assigner un trajet bus depuis le module Véhicules.</div>
            </div>
          )}

          {isBus && route && (
            <BusRouteCard
              route={route}
              vehicule={vehicule}
              alreadyDone={alreadyDone}
              onPointer={() => setJourSel("POINTAGE")}
            />
          )}

          {/* Titre missions */}
          <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:4 }}>
            <Map size={12} color={C.textLight}/>
            <span style={{ fontSize:11, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1.5px" }}>
              Missions assignées
            </span>
          </div>

          {missionsAujourdHui.length === 0 ? (
            <div style={{ background:C.white, borderRadius:12, padding:"28px 20px", textAlign:"center", border:`1px solid ${C.border}` }}>
              <Map size={32} color={C.textLight} style={{ margin:"0 auto 12px" }}/>
              <div style={{ fontSize:13, color:C.textLight }}>Aucune mission assignée aujourd'hui</div>
            </div>
          ) : missionsAujourdHui.map((m, i) => (
            <MissionCard
              key={m.id || i}
              mission={m}
              action={missionActions[m.id]}
              onPointer={() => handlePointerMission(m)}
            />
          ))}

          {missions.length === 0 && !isBus && (
            <div style={{ background:C.white, borderRadius:12, padding:"32px 20px", textAlign:"center", border:`1px solid ${C.border}` }}>
              <CheckCircle size={32} color={C.green} style={{ margin:"0 auto 12px" }}/>
              <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:4 }}>Aucune mission pour le moment</div>
              <div style={{ fontSize:11, color:C.textLight }}>Le gestionnaire vous notifiera lors de l'approbation d'une réservation.</div>
            </div>
          )}
        </div>
      )}

      {/* ════════════ CETTE SEMAINE ════════════ */}
      {jourSel === "SEM" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* KPIs */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {statsData.map((s, i) => {
              const { Icon } = s;
              return (
                <div key={i} style={{ background:C.white, borderRadius:10, padding:"14px 16px", textAlign:"center",
                  border:`1px solid ${C.border}`, borderTop:`3px solid ${s.color}` }}>
                  <Icon size={18} color={s.color} style={{ margin:"0 auto 6px" }}/>
                  <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.val}</div>
                  <div style={{ fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginTop:3 }}>{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Historique pointages bus */}
          {isBus && (
            <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
              <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
                <Bus size={15} color={C.green}/>
                <span style={{ fontSize:13, fontWeight:800, color:C.text }}>Pointages ramassage scolaire — 7 derniers jours</span>
              </div>
              <div style={{ padding:"12px 16px" }}>
                {logsSemaine.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"24px 0", color:C.textLight, fontSize:13 }}>
                    Aucun pointage cette semaine
                  </div>
                ) : logsSemaine.map((log, i) => {
                  const cfg     = STATUS_LOG[log.status] || STATUS_LOG.EFFECTUE;
                  const isToday = log.date === today;
                  return (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", gap:14, padding:"11px 14px",
                      borderRadius:9, marginBottom:6,
                      background: isToday ? C.greenLight : C.bg,
                      border: `1px solid ${isToday ? C.greenLine : C.border}`,
                    }}>
                      <div style={{ minWidth:96 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.text }}>
                          {log.date
                            ? new Date(log.date + "T12:00:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})
                            : "—"}
                        </div>
                        {isToday && (
                          <div style={{ fontSize:9, color:C.green, fontWeight:700, marginTop:2 }}>Aujourd'hui</div>
                        )}
                      </div>
                      <div style={{ flex:1, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                        <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:cfg.bg, color:cfg.color }}>
                          {cfg.label}
                        </span>
                        {log.heure_depart_reelle && (
                          <span style={{ fontSize:11, color:C.textMid, display:"flex", alignItems:"center", gap:4 }}>
                            <Clock size={10}/> {fmtHeure(log.heure_depart_reelle)} → {fmtHeure(log.heure_arrivee_reelle)||"?"}
                          </span>
                        )}
                        {log.nb_passagers > 0 && (
                          <span style={{ fontSize:11, color:C.textMid, display:"flex", alignItems:"center", gap:4 }}>
                            <Users size={10}/> {log.nb_passagers} pers.
                          </span>
                        )}
                        {log.commentaire && (
                          <span style={{ fontSize:11, color:C.textLight, fontStyle:"italic" }}>"{log.commentaire}"</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Toutes les missions */}
          <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
              <Map size={15} color={C.green}/>
              <span style={{ fontSize:13, fontWeight:800, color:C.text }}>Toutes mes missions assignées</span>
            </div>
            <div style={{ padding:"4px 16px 12px" }}>
              {missions.length === 0 ? (
                <div style={{ textAlign:"center", padding:"24px 0", color:C.textLight, fontSize:13 }}>
                  Aucune mission cette semaine
                </div>
              ) : missions.map((m, i) => {
                const action = missionActions[m.id];
                const isToday = (m.start_date || "").split("T")[0] === today;
                const cfgMap = {
                  TERMINEE:  { color:C.green,  bg:C.greenLight,  label:"Effectuée" },
                  APPROUVEE: { color:C.greenMid,bg:C.greenXLight, label:"En cours"  },
                  ANNULEE:   { color:C.red,     bg:C.redLight,    label:"Annulée"   },
                  REJETEE:   { color:C.red,     bg:C.redLight,    label:"Rejetée"   },
                };
                const cfg = cfgMap[action === "TERMINEE" ? "TERMINEE" : m.status]
                  || { color:C.orange, bg:C.orangeLight, label:"En attente" };

                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0",
                    borderBottom: i < missions.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background:cfg.color }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {m.requester_name || m.requester_full_name || "Demande"} → {m.destination || "—"}
                      </div>
                      <div style={{ fontSize:11, color:C.textLight, marginTop:1, display:"flex", alignItems:"center", gap:6 }}>
                        <Calendar size={9}/>
                        {isToday ? "Aujourd'hui" : fmtDate(m.start_date)}
                        {m.start_date && ` à ${fmtHeure(m.start_date)}`}
                        {m.number_of_passengers ? ` · ${m.number_of_passengers} pers.` : ""}
                      </div>
                    </div>
                    <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700,
                      background:cfg.bg, color:cfg.color, whiteSpace:"nowrap", flexShrink:0 }}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════ POINTAGE ════════════ */}
      {jourSel === "POINTAGE" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {isBus ? (
            /* ── Pointage bus scolaire ── */
            <div className="plan-card" style={{ background:C.white, borderRadius:12, border:`1.5px solid ${alreadyDone ? C.greenLine : C.border}`, overflow:"hidden" }}>

              {/* Header */}
              <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:alreadyDone ? C.greenXLight : C.bg }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ padding:"2px 10px", borderRadius:99, fontSize:10, fontWeight:800, background:C.orangeLight, color:C.orange, display:"flex", alignItems:"center", gap:4 }}>
                      <Bus size={9}/> Circuit Scolaire
                    </span>
                    {route && (
                      <span style={{ fontSize:12, fontWeight:700, color:C.text }}>
                        {route.ligne && route.ligne !== "—" ? `Ligne ${route.ligne}` : "Bus scolaire"}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:12, color:C.textLight }}>
                    {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
                    {route ? ` · ${route.heure_depart||"05:00"} → ${route.heure_arrivee||"08:30"}` : ""}
                  </div>
                </div>
                {alreadyDone && (
                  <span style={{ padding:"5px 14px", borderRadius:99, fontSize:12, fontWeight:700, background:C.greenLight, color:C.green, display:"flex", alignItems:"center", gap:5 }}>
                    <CheckCircle size={13}/> Pointé aujourd'hui
                  </span>
                )}
              </div>

              <div style={{ padding:"18px 20px" }}>
                {/* Résumé si déjà pointé */}
                {todayPointage && (
                  <div style={{ background:C.greenLight, borderRadius:10, padding:"14px 16px", marginBottom:18, border:`1px solid ${C.greenLine}` }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.green, marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
                      <CheckCircle size={12}/> Pointage enregistré
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                      {[
                        { Icon:Activity, label:"Statut",      val: STATUS_LOG[todayPointage.status]?.label || todayPointage.status },
                        { Icon:Clock,    label:"Départ réel", val: fmtHeure(todayPointage.heure_depart_reelle)  || "—" },
                        { Icon:Flag,     label:"Arrivée",     val: fmtHeure(todayPointage.heure_arrivee_reelle) || "—" },
                        { Icon:Users,    label:"Passagers",   val: todayPointage.nb_passagers || "—" },
                        ...(todayPointage.commentaire ? [{Icon:MessageSquare,label:"Commentaire",val:todayPointage.commentaire}] : []),
                      ].map((f, fi) => {
                        const { Icon } = f;
                        return (
                          <div key={fi} style={{ gridColumn: fi >= 4 ? "1/-1" : "auto" }}>
                            <div style={{ fontSize:9, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:3, display:"flex", alignItems:"center", gap:3 }}>
                              <Icon size={8}/> {f.label}
                            </div>
                            <div style={{ fontSize:12, fontWeight:600, color:C.green }}>{f.val}</div>
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={() => setTodayPointage(null)}
                      style={{ marginTop:12, fontSize:11, color:C.orange, background:"none", border:`1px solid ${C.orangeLine}`, borderRadius:6, padding:"4px 12px", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
                      <Pencil size={10}/> Modifier le pointage
                    </button>
                  </div>
                )}

                {/* Formulaire */}
                {!todayPointage && (
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    <div>
                      <label style={lbl}>Comment s'est passé le trajet ?</label>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:6 }}>
                        {Object.entries(STATUS_LOG).map(([val, cfg]) => (
                          <button key={val} type="button" onClick={() => setPointForm(f => ({...f, status:val}))}
                            style={{
                              padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:600,
                              cursor:"pointer", fontFamily:"inherit", transition:"all .12s",
                              border:     `1.5px solid ${pointForm.status === val ? cfg.color : C.border}`,
                              background: pointForm.status === val ? cfg.bg    : C.white,
                              color:      pointForm.status === val ? cfg.color : C.textMid,
                            }}>
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                      <div>
                        <label style={lbl}>Départ réel</label>
                        <input style={inp} type="time" value={pointForm.heure_depart_reelle}
                          onChange={e => setPointForm(f => ({...f, heure_depart_reelle:e.target.value}))}/>
                      </div>
                      <div>
                        <label style={lbl}>Arrivée réelle</label>
                        <input style={inp} type="time" value={pointForm.heure_arrivee_reelle}
                          onChange={e => setPointForm(f => ({...f, heure_arrivee_reelle:e.target.value}))}/>
                      </div>
                      <div>
                        <label style={lbl}>Passagers</label>
                        <input style={inp} type="number" min="0" max={vehicule?.seating_capacity || 99}
                          value={pointForm.nb_passagers}
                          onChange={e => setPointForm(f => ({...f, nb_passagers:e.target.value}))}
                          placeholder={`Max: ${vehicule?.seating_capacity || "?"}`}/>
                      </div>
                    </div>

                    <div>
                      <label style={{ ...lbl, color: pointForm.status !== "EFFECTUE" ? C.red : C.textMid }}>
                        Commentaire {pointForm.status !== "EFFECTUE" ? "— obligatoire" : "(optionnel)"}
                      </label>
                      {pointForm.status !== "EFFECTUE" ? (
                        <textarea value={pointForm.commentaire}
                          onChange={e => setPointForm(f => ({...f, commentaire:e.target.value}))}
                          rows={3} placeholder="Décrivez la situation…"
                          style={{...inp, resize:"vertical", height:80, borderColor:C.red + "50"}}/>
                      ) : (
                        <input style={inp} value={pointForm.commentaire}
                          onChange={e => setPointForm(f => ({...f, commentaire:e.target.value}))}
                          placeholder="Remarques éventuelles…"/>
                      )}
                    </div>

                    <button onClick={handlePointer}
                      disabled={pointing || (pointForm.status !== "EFFECTUE" && !pointForm.commentaire.trim())}
                      style={{
                        padding:"12px 24px", borderRadius:9, border:"none",
                        background: C.green, color:"#fff", fontSize:13, fontWeight:700,
                        cursor:"pointer", fontFamily:"inherit",
                        display:"flex", alignItems:"center", gap:8, alignSelf:"flex-start",
                        opacity: pointing || (pointForm.status !== "EFFECTUE" && !pointForm.commentaire.trim()) ? 0.6 : 1,
                      }}>
                      {pointing
                        ? <><span style={{width:14,height:14,border:"2px solid rgba(255,255,255,.5)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block"}}/> Pointage en cours…</>
                        : <><CheckCircle size={16}/> Confirmer le pointage</>
                      }
                    </button>
                  </div>
                )}
              </div>
            </div>

          ) : (
            /* ── Chauffeur polyvalent ── */
            <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
              <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
                <Map size={15} color={C.green}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text }}>Missions — Pointage</div>
                  <div style={{ fontSize:11, color:C.textLight, marginTop:1 }}>Pointez vos missions une fois effectuées</div>
                </div>
              </div>
              <div style={{ padding:"12px 16px" }}>
                {missions.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"40px 0", color:C.textLight }}>
                    <CheckCircle size={32} color={C.green} style={{ margin:"0 auto 12px" }}/>
                    <div style={{ fontSize:13 }}>Aucune mission à pointer pour le moment</div>
                  </div>
                ) : missions.map((m, i) => (
                  <MissionCard
                    key={m.id || i}
                    mission={m}
                    action={missionActions[m.id]}
                    onPointer={() => handlePointerMission(m)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTE CIRCUIT BUS SCOLAIRE
// ─────────────────────────────────────────────────────────────────────────────
function BusRouteCard({ route, vehicule, alreadyDone, onPointer }) {
  const [expanded, setExpanded] = useState(false);

  const nomTrajet = route.nom_trajet && !route.nom_trajet.includes("undefined")
    ? route.nom_trajet
    : route.ligne && route.ligne !== "—" ? `Ligne ${route.ligne}` : "Circuit scolaire";

  const depart  = route.point_depart  && route.point_depart  !== "undefined" ? route.point_depart  : "Départ";
  const arrivee = route.point_arrivee && route.point_arrivee !== "undefined" ? route.point_arrivee : "IUC Logbessou";

  return (
    <div className="plan-card" style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.orange}`, overflow:"hidden" }}>
      <div style={{ padding:"16px 18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
              <span style={{ padding:"2px 10px", borderRadius:99, fontSize:10, fontWeight:800, background:C.orangeLight, color:C.orange, display:"flex", alignItems:"center", gap:4 }}>
                <Bus size={9}/> Circuit Scolaire
              </span>
              <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700,
                background: alreadyDone ? C.greenLight : C.orangeLight,
                color:      alreadyDone ? C.green      : C.orange }}>
                {alreadyDone ? "Pointé" : "À pointer"}
              </span>
            </div>
            <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{nomTrajet}</div>
            <div style={{ fontSize:11, color:C.textLight, marginTop:3, display:"flex", alignItems:"center", gap:4 }}>
              <MapPin size={10}/> {depart} <ArrowRight size={9}/> {arrivee}
            </div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.orange, display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
              <Clock size={12}/> {route.heure_depart||"05:00"} → {route.heure_arrivee||"08:30"}
            </div>
            {vehicule && (
              <div style={{ fontSize:11, color:C.textMid, marginTop:4, display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
                <Bus size={10}/> {vehicule.registration_number || vehicule.license_plate || "—"}
              </div>
            )}
          </div>
        </div>

        <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:12 }}>
          {route.jours_service?.length > 0 && (
            <span style={{ fontSize:11, color:C.textMid, display:"flex", alignItems:"center", gap:4 }}>
              <CalendarDays size={10}/> {route.jours_service.join(", ")}
            </span>
          )}
          {route.arrets?.length > 0 && (
            <span style={{ fontSize:11, color:C.textMid, display:"flex", alignItems:"center", gap:4 }}>
              <MapPin size={10}/> {route.arrets.length} arrêt{route.arrets.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {route.arrets?.length > 0 && (
          <button onClick={() => setExpanded(e => !e)}
            style={{ fontSize:11, color:C.green, background:"none", border:"none", cursor:"pointer", fontWeight:600, padding:"0 0 10px",
              display:"flex", alignItems:"center", gap:5 }}>
            {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
            {expanded ? "Masquer les arrêts" : `Voir les ${route.arrets.length} arrêts`}
          </button>
        )}

        {expanded && route.arrets?.length > 0 && (
          <div style={{ background:C.bg, borderRadius:8, padding:"10px 14px", marginBottom:12 }}>
            {route.arrets.map((a, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0",
                borderBottom: i < route.arrets.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <MapPin size={10} color={C.orange}/>
                <span style={{ fontSize:12, color:C.text }}>{typeof a === "string" ? a : a.nom || a.name || JSON.stringify(a)}</span>
              </div>
            ))}
          </div>
        )}

        {!alreadyDone ? (
          <button onClick={onPointer}
            style={{ padding:"9px 20px", background:C.green, color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:7 }}>
            <ClipboardCheck size={14}/> Pointer mon trajet
          </button>
        ) : (
          <div style={{ fontSize:12, color:C.green, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
            <CheckCircle size={13}/> Trajet pointé ce matin
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTE MISSION
// ─────────────────────────────────────────────────────────────────────────────
function MissionCard({ mission: m, action, onPointer }) {
  const isTerminee = action === "TERMINEE";

  return (
    <div className="plan-card" style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.green}`, marginBottom:10, overflow:"hidden" }}>
      <div style={{ padding:"16px 18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
              <span style={{ padding:"2px 10px", borderRadius:99, fontSize:10, fontWeight:800, background:C.greenLight, color:C.green, display:"flex", alignItems:"center", gap:4 }}>
                <Map size={9}/> Mission
              </span>
              {isTerminee && (
                <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:C.greenLight, color:C.green, display:"flex", alignItems:"center", gap:4 }}>
                  <CheckCircle size={9}/> Effectuée
                </span>
              )}
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text }}>
              {m.requester_name || m.requester_full_name || "Demande de réservation"}
            </div>
            <div style={{ fontSize:11, color:C.textLight, marginTop:3, display:"flex", alignItems:"center", gap:4 }}>
              <MapPin size={10}/> {m.destination || "—"}
            </div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.green, display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
              <Clock size={11}/> {fmtHeure(m.start_date)}
            </div>
            <div style={{ fontSize:10, color:C.textLight, marginTop:2 }}>{fmtDate(m.start_date)}</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:14, fontSize:11, color:C.textMid, marginBottom:isTerminee ? 0 : 12, flexWrap:"wrap" }}>
          {m.number_of_passengers && (
            <span style={{ display:"flex", alignItems:"center", gap:4 }}>
              <Users size={10}/> {m.number_of_passengers} pers.
            </span>
          )}
          {m.purpose && (
            <span style={{ display:"flex", alignItems:"center", gap:4 }}>
              <Navigation size={10}/> {m.purpose}
            </span>
          )}
          {m.vehicle_name && m.vehicle_name !== "Non assigné" && (
            <span style={{ display:"flex", alignItems:"center", gap:4 }}>
              <Fuel size={10}/> {m.vehicle_name}
            </span>
          )}
          {m.end_date && (
            <span style={{ display:"flex", alignItems:"center", gap:4 }}>
              <Flag size={10}/> Retour : {fmtDate(m.end_date)}
            </span>
          )}
        </div>

        {!isTerminee ? (
          <button onClick={onPointer}
            style={{ padding:"8px 20px", background:C.green, color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:7 }}>
            <CheckCircle size={14}/> Marquer comme effectuée
          </button>
        ) : (
          <div style={{ fontSize:12, color:C.green, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
            <CheckCircle size={13}/> Mission effectuée avec succès
          </div>
        )}
      </div>
    </div>
  );
}