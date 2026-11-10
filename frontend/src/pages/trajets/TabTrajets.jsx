
// ─── pages/trajets/TabTrajets.jsx ────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Map, MapPin, Navigation, Users, Car, Bus, Route,
  Play, Square, Clock, Gauge, CheckCircle, CircleX,
  AlertTriangle, CalendarDays, ClipboardList, History,
  Zap, ChevronDown, Loader2, Info, Flag, Briefcase,
  ArrowRight, RotateCcw,
} from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const API_BASE = "http://localhost:8000/api/v1";

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
  if (!res.ok) throw new Error(json?.detail || json?.message || json?.data?.message || `Erreur ${res.status}`);
  return json?.data ?? json;
}

const C = {
  green:      "#1B5E37",
  greenLight: "#EAF4EE",
  greenXLight:"#F2FAF5",
  red:        "#C0182A",
  redLight:   "#FDF0F1",
  white:      "#FFFFFF",
  bg:         "#F4F6F5",
  border:     "#E2E8E5",
  text:       "#1A2820",
  textMid:    "#4A6358",
  textLight:  "#8EA99A",
  amber:      "#D97706",
  amberLight: "#FFFBEB",
  blue:       "#1D4ED8",
  blueLight:  "#EFF6FF",
};

const IUC_POS  = [4.0841, 9.7808];
const IUC_NOM  = "IUC Logbessou, Douala";
const BONA_POS = [4.0641, 9.7508];

const makeIcon = (color, letter) => new L.DivIcon({
  html: `<div style="background:${color};color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;border:2.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.3);font-family:Inter,sans-serif">${letter}</div>`,
  className:"", iconSize:[34,34], iconAnchor:[17,17],
});

const iconIUC  = makeIcon("#1B5E37", "A");
const iconBus  = makeIcon("#D97706", "B");
const iconDest = makeIcon("#1D4ED8", "B");
const iconMe   = makeIcon("#1B5E37", "●");

function MapFitter({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding:[50,50], animate:true });
  }, [bounds]);
  return null;
}
function MapPanner({ pos }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.panTo(pos, { animate:true, duration:0.8 });
  }, [pos]);
  return null;
}

function LiveTimer({ startIso }) {
  const startMs = new Date(startIso).getTime();
  const [el, setEl] = useState(Date.now() - startMs);
  useEffect(() => {
    const t = setInterval(() => setEl(Date.now() - startMs), 1000);
    return () => clearInterval(t);
  }, [startMs]);
  const h = String(Math.floor(el / 3600000)).padStart(2, "0");
  const m = String(Math.floor((el % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((el % 60000) / 1000)).padStart(2, "0");
  return (
    <span style={{ fontSize:22, fontWeight:900, fontVariantNumeric:"tabular-nums", color:C.green, letterSpacing:2 }}>
      {h}:{m}:{s}
    </span>
  );
}

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })
  : "—";

const fmtTime = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  const h = dt.getHours(), m = dt.getMinutes();
  if (h === 0 && m === 0) return null;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  @keyframes spin     { to { transform: rotate(360deg); } }
  @keyframes pulse-gps{ 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
  @keyframes fadeup   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

  .tj-kpi { animation:fadeup .2s ease both; }

  /* ── Dropdown portal ── */
  .tj-dropdown-portal {
    position: fixed;
    z-index: 9999;
    background: #fff;
    border: 1.5px solid ${C.border};
    border-radius: 12px;
    box-shadow: 0 16px 48px rgba(0,0,0,.14);
    overflow-y: auto;
    max-height: 380px;
  }

  .tj-opt:hover { background: ${C.bg} !important; }
  .tj-section { background:#fff; border-radius:13px; border:1.5px solid ${C.border}; padding:18px 20px; }
  .tj-section-title { font-size:13px; font-weight:800; color:${C.text}; display:flex; align-items:center; gap:7px; margin-bottom:3px; }
  .tj-section-sub   { font-size:11px; color:${C.textLight}; margin-bottom:14px; }

  .tj-kpi-card {
    background:#fff; border-radius:13px; padding:16px 18px;
    border:1.5px solid ${C.border}; position:relative; overflow:hidden;
    transition:transform .18s,box-shadow .18s;
  }
  .tj-kpi-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:3px;
    background:var(--kc,${C.green}); border-radius:13px 13px 0 0;
  }
  .tj-kpi-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.07); }

  .tj-hist-row {
    display:flex; gap:14px; padding:13px 0;
    border-bottom:1px solid ${C.border}; align-items:flex-start;
  }
  .tj-hist-row:last-child { border-bottom:none; }

  .tj-input {
    padding:10px 14px;
    border:1.5px solid ${C.border};
    border-radius:9px; font-size:13px; outline:none;
    font-family:inherit;
    color:var(--color-text-primary,${C.text});
    background:var(--color-background-primary,${C.white});
    width:100%; transition:border-color .15s;
  }
  .tj-input:focus { border-color:${C.green}; box-shadow:0 0 0 3px ${C.green}18; }

  .tj-label {
    font-size:10px; font-weight:700;
    color:var(--color-text-secondary,${C.textMid});
    text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; display:flex; align-items:center; gap:5px;
  }

  .gps-dot { animation:pulse-gps 1.5s ease-in-out infinite; }

  input:focus, textarea:focus, select:focus {
    border-color:${C.green}!important;
    box-shadow:0 0 0 3px ${C.green}18!important;
    outline:none;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
export function TabTrajets({ vehicule }) {
  const [missions,   setMissions]   = useState([]);
  const [historique, setHistorique] = useState([]);
  const [loading,    setLoading]    = useState(true);

  const [missionSel, setMissionSel] = useState(null);
  const [showDrop,   setShowDrop]   = useState(false);
  const dropBtnRef = useRef(null);
  const dropRef    = useRef(null);
  const [dropStyle, setDropStyle]   = useState({});

  const [kmDepart,  setKmDepart]  = useState("");
  const [kmArrivee, setKmArrivee] = useState("");
  const [passagers, setPassagers] = useState("");
  const [saving,    setSaving]    = useState(false);

  // GPS
  const [currentPos,  setCurrentPos]  = useState(null);
  const [trackPoints, setTrackPoints] = useState([]);
  const [speed,       setSpeed]       = useState(0);
  const [distDone,    setDistDone]    = useState(0);
  const [geoError,    setGeoError]    = useState("");
  const [destCoords,  setDestCoords]  = useState(null);

  const watchRef   = useRef(null);
  const lastPosRef = useRef(null);

  const [logs, setLogs] = useState(["En attente de démarrage…"]);
  const addLog = (msg) => {
    const t = new Date().toLocaleTimeString("fr-FR");
    setLogs(l => [...l.slice(-20), `[${t}] ${msg}`]);
  };

  const [toast, setToast] = useState({ msg:"", type:"success" });
  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:"", type:"success" }), 4500);
  };

  // ── Calcul position du dropdown (portal) ──────────────────────────────────
  const openDrop = () => {
    if (!dropBtnRef.current) return;
    const rect = dropBtnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const maxH = Math.min(380, Math.max(spaceBelow, spaceAbove) - 16);

    if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
      // Dérouler vers le bas
      setDropStyle({
        top:   rect.bottom + 6,
        left:  rect.left,
        width: rect.width,
        maxHeight: maxH,
      });
    } else {
      // Dérouler vers le haut
      setDropStyle({
        bottom: window.innerHeight - rect.top + 6,
        left:   rect.left,
        width:  rect.width,
        maxHeight: maxH,
      });
    }
    setShowDrop(true);
  };

  // Fermer si clic dehors
  useEffect(() => {
    if (!showDrop) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target) &&
          dropBtnRef.current && !dropBtnRef.current.contains(e.target)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDrop]);

  // ── Chargement missions ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mR, hR] = await Promise.all([
        apiFetch("/reservations/?driver=me").catch(() => null),
        apiFetch("/reservations/?driver=me&status=TERMINEE").catch(() => null),
      ]);
      const all      = Array.isArray(mR) ? mR : mR?.results ?? [];
      const actives  = all.filter(m => ["APPROUVEE","EN_COURS"].includes(m.status));
      const terminees = Array.isArray(hR) ? hR : hR?.results ?? [];
      setMissions(actives);
      setHistorique(terminees);

      const enCours = actives.find(m => m.status === "EN_COURS");
      if (enCours && !missionSel) {
        setMissionSel({ ...enCours, isFixed:false, type:"MISSION" });
        if (enCours.destination) geocodeDest(enCours.destination);
        addLog(`Mission EN COURS restaurée : → ${enCours.destination}`);
      }
    } catch {}
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  const phase = missionSel?.status === "EN_COURS" ? "RUNNING" : "IDLE";

  // Stats
  const local    = JSON.parse(localStorage.getItem("driveparc_trajets") || "[]");
  const tous     = [...historique, ...local];
  const totalKm  = tous.reduce((s,t) => s + Math.max(0, ((t.end_mileage||0)-(t.start_mileage||0)) || ((t.km_arrivee||0)-(t.km_depart||0)) || t.estimated_distance || 0), 0);
  const totalPass = tous.reduce((s,t) => s + (t.number_of_passengers || t.passagers || 0), 0);

  // GPS
  const updatePos = useCallback((lat, lng, spd=0) => {
    const pos = [lat, lng];
    const kmh = Math.round((spd||0)*3.6);
    setSpeed(kmh);
    if (lastPosRef.current) {
      const R    = 6371;
      const dLat = (lat - lastPosRef.current[0]) * Math.PI/180;
      const dLng = (lng - lastPosRef.current[1]) * Math.PI/180;
      const a    = Math.sin(dLat/2)**2 + Math.cos(lastPosRef.current[0]*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2;
      const d    = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      setDistDone(prev => Math.round((prev+d)*10)/10);
    }
    lastPosRef.current = pos;
    setCurrentPos(pos);
    setTrackPoints(prev => [...prev, pos]);
    addLog(`📍 ${lat.toFixed(4)}, ${lng.toFixed(4)} · ${kmh} km/h`);
  }, []);

  const geocodeDest = async (dest) => {
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(dest+", Douala, Cameroun")}&format=json&limit=1`);
      const json = await res.json();
      if (json[0]) {
        const coords = [parseFloat(json[0].lat), parseFloat(json[0].lon)];
        setDestCoords(coords);
        addLog(`Destination résolue : ${dest}`);
        return coords;
      }
    } catch { addLog("Impossible de géocoder la destination"); }
    return null;
  };

  const startGPS = () => {
    if (!navigator.geolocation) { setGeoError("Géolocalisation non supportée."); return; }
    setTrackPoints([]); lastPosRef.current = null;
    addLog("▶ Suivi GPS démarré");
    watchRef.current = navigator.geolocation.watchPosition(
      pos => updatePos(pos.coords.latitude, pos.coords.longitude, pos.coords.speed),
      err => { setGeoError(err.code===1 ? "Accès GPS refusé." : "Position introuvable."); addLog("Erreur GPS"); },
      { enableHighAccuracy:true, timeout:10000, maximumAge:2000 }
    );
  };

  const selMission = async (m) => {
    setMissionSel(m);
    setShowDrop(false);
    setTrackPoints([]); setCurrentPos(null); setDistDone(0); setSpeed(0);
    lastPosRef.current = null; setGeoError("");
    const dest = m.isFixed ? null : m.destination;
    if (m.isFixed) setDestCoords(BONA_POS);
    else if (dest) await geocodeDest(dest);
    if (m.status === "EN_COURS") { addLog(`Mission EN COURS restaurée → ${dest||"Bonamoussadi"}`); startGPS(); }
    else addLog(`Mission sélectionnée → ${dest||"Bonamoussadi"}`);
  };

  const demarrer = async () => {
    if (!missionSel) { showToast("Sélectionnez une mission", "error"); return; }
    if (!kmDepart)   { showToast("Entrez le kilométrage de départ", "error"); return; }
    if (missionSel.isFixed) {
      startGPS();
      setMissionSel(prev => ({ ...prev, status:"EN_COURS", actual_start_date:new Date().toISOString() }));
      showToast("Ramassage démarré ✓");
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch(`/reservations/${missionSel.id}/start/`, {
        method:"POST",
        body:JSON.stringify({ start_mileage:parseInt(kmDepart)||0 }),
      });
      setMissionSel(prev => ({ ...prev, status:"EN_COURS", actual_start_date:result?.actual_start_date||new Date().toISOString() }));
      startGPS();
      showToast("Trajet démarré ✓ — Véhicule passé en service");
      addLog("✅ Backend : réservation EN_COURS, véhicule EN_SERVICE");
      load();
    } catch (e) {
      showToast(e.message||"Erreur au démarrage", "error");
      addLog(`❌ Erreur démarrage : ${e.message}`);
    } finally { setSaving(false); }
  };

  const terminer = async () => {
    if (!kmArrivee) { showToast("Entrez le kilométrage d'arrivée", "error"); return; }
    if (watchRef.current) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    addLog(`⏹ Fin de trajet · ${distDone} km parcourus`);
    setSaving(true);
    try {
      const endPosArr = currentPos || IUC_POS;
      if (missionSel?.isFixed) {
        const l = JSON.parse(localStorage.getItem("driveparc_trajets")||"[]");
        l.unshift({ id:Date.now(), date:new Date().toISOString().split("T")[0], type:"RAMASSAGE", depart:IUC_NOM, arrivee:"Bonamoussadi", km_depart:parseInt(kmDepart)||0, km_arrivee:parseInt(kmArrivee)||0, passagers:parseInt(passagers)||0 });
        localStorage.setItem("driveparc_trajets", JSON.stringify(l.slice(0,50)));
        showToast("Ramassage enregistré ✓");
      } else {
        await apiFetch(`/reservations/${missionSel.id}/complete/`, {
          method:"POST",
          body:JSON.stringify({ end_mileage:parseInt(kmArrivee)||0, passengers:parseInt(passagers)||missionSel?.number_of_passengers||0, end_lat:endPosArr[0], end_lng:endPosArr[1], distance_km:distDone }),
        });
        showToast("Trajet terminé ✓ — Véhicule repassé disponible");
        addLog("✅ Backend : réservation TERMINEE, véhicule DISPONIBLE");
      }
      setMissionSel(null); setKmDepart(""); setKmArrivee(""); setPassagers("");
      setCurrentPos(null); setTrackPoints([]); setDestCoords(null); setDistDone(0); setSpeed(0);
      setLogs(["En attente de démarrage…"]); setGeoError("");
      load();
    } catch (e) {
      showToast(e.message||"Erreur à la fin du trajet", "error");
      addLog(`❌ Erreur terminaison : ${e.message}`);
    } finally { setSaving(false); }
  };

  const allOptions = [
    { id:null, isFixed:true, type:"RAMASSAGE", status:"APPROUVEE", nom:"Ramassage scolaire — Ligne A", destination:"Bonamoussadi", description:"IUC Logbessou → Bonamoussadi → 2 tours · Lun–Ven" },
    ...missions.map(m => ({ ...m, isFixed:false, type:"MISSION" })),
  ];

  const mapBounds = destCoords ? [IUC_POS, destCoords, ...(currentPos?[currentPos]:[])] : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{CSS}</style>

      {/* Toast */}
      {toast.msg && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, background:toast.type==="error"?C.red:C.green, color:"#fff", borderRadius:12, padding:"13px 20px", fontSize:13, fontWeight:700, boxShadow:"0 6px 24px rgba(0,0,0,.2)", maxWidth:420, display:"flex", alignItems:"center", gap:8 }}>
          {toast.type==="error" ? <CircleX size={16}/> : <CheckCircle size={16}/>} {toast.msg}
        </div>
      )}

      {/* ── KPIs ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { Icon:Route,         val:tous.length,                  label:"Trajets total",      color:C.green  },
          { Icon:Navigation,    val:`${Math.round(totalKm)} km`,  label:"Distance totale",    color:C.amber   },
          { Icon:Users,         val:totalPass,                     label:"Passagers",           color:C.green},
          { Icon:ClipboardList, val:missions.length,               label:"Missions assignées",  color:C.amber  },
        ].map((k,i) => (
          <div key={i} className="tj-kpi-card" style={{ "--kc":k.color }} >
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
              <k.Icon size={14} color={k.color} />
              <span style={{ fontSize:9, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px" }}>{k.label}</span>
            </div>
            <div style={{ fontSize:24, fontWeight:900, color:k.color, lineHeight:1 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Bannière mission EN_COURS */}
      {phase === "RUNNING" && missionSel && (
        <div style={{ background:`linear-gradient(135deg, ${C.green}, #16A34A)`, borderRadius:13, padding:"16px 20px", color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.5px", opacity:0.75, marginBottom:5, display:"flex", alignItems:"center", gap:6 }}>
              <span className="gps-dot" style={{ width:8, height:8, borderRadius:"50%", background:"#fff", display:"inline-block" }} />
              TRAJET EN COURS — {missionSel.isFixed ? "RAMASSAGE" : "MISSION"}
            </div>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:5, display:"flex", alignItems:"center", gap:7 }}>
              <MapPin size={16} /> IUC Logbessou → {missionSel.isFixed ? "Bonamoussadi" : missionSel.destination}
            </div>
            <div style={{ fontSize:11, opacity:0.8, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              {missionSel.requester_name && <span style={{ display:"flex", alignItems:"center", gap:4 }}><Users size={10}/> {missionSel.requester_name}</span>}
              {missionSel.number_of_passengers > 0 && <span style={{ display:"flex", alignItems:"center", gap:4 }}><Users size={10}/> {missionSel.number_of_passengers} passagers</span>}
              {missionSel.actual_start_date && (
                <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <Clock size={10}/> Démarré à {new Date(missionSel.actual_start_date).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                </span>
              )}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:9, opacity:0.7, textTransform:"uppercase", letterSpacing:"1px", marginBottom:3 }}>Durée</div>
              {missionSel.actual_start_date
                ? <LiveTimer startIso={missionSel.actual_start_date} />
                : <span style={{ fontSize:20, fontWeight:800 }}>--:--:--</span>
              }
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:9, opacity:0.7, textTransform:"uppercase", letterSpacing:"1px", marginBottom:3 }}>GPS</div>
              <div style={{ fontSize:18, fontWeight:800, display:"flex", alignItems:"center", gap:4 }}>
                <Gauge size={16}/> {speed} km/h
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Panneau de contrôle ── */}
      <div className="tj-section">
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:C.text, display:"flex", alignItems:"center", gap:7 }}>
              {phase === "RUNNING"
                ? <><span className="gps-dot" style={{ width:9, height:9, borderRadius:"50%", background:C.green, display:"inline-block" }}/> En route → {missionSel?.isFixed ? "Bonamoussadi" : missionSel?.destination}</>
                : <><Route size={16} color={C.green}/> Démarrer un trajet</>
              }
            </div>
            <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
              {phase === "RUNNING"
                ? "Suivi GPS actif — renseignez le km d'arrivée pour terminer"
                : "Sélectionnez une mission puis démarrez"
              }
            </div>
          </div>
          {phase === "RUNNING" && (
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:C.green, fontWeight:700, background:C.greenLight, padding:"6px 12px", borderRadius:8 }}>
              <Gauge size={13}/> {speed} km/h · {distDone} km
            </div>
          )}
        </div>

        {/* ── Sélecteur mission — avec portal dropdown ── */}
        <div style={{ marginBottom:16 }}>
          <div className="tj-label"><ClipboardList size={11}/> Mission / trajet *</div>

          {/* Bouton trigger */}
          <div
            ref={dropBtnRef}
            onClick={() => phase === "IDLE" && (showDrop ? setShowDrop(false) : openDrop())}
            style={{
              padding:"12px 14px",
              border:`1.5px solid ${missionSel ? C.green : C.border}`,
              borderRadius:10,
              cursor:phase === "IDLE" ? "pointer" : "default",
              display:"flex", justifyContent:"space-between", alignItems:"center",
              background:missionSel ? C.greenLight : "var(--color-background-secondary,#F4F6F5)",
              transition:"all .15s",
              minHeight:52,
            }}>
            {missionSel ? (
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                  {missionSel.isFixed
                    ? <Bus size={15} color={C.amber}/>
                    : <Route size={15} color={C.blue}/>
                  }
                  <span style={{ fontSize:13, fontWeight:700, color:missionSel.isFixed ? C.amber : C.green }}>
                    {missionSel.isFixed ? missionSel.nom : missionSel.destination}
                  </span>
                  <span style={{ padding:"1px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:missionSel.isFixed ? C.amberLight : C.blueLight, color:missionSel.isFixed ? C.amber : C.blue, flexShrink:0 }}>
                    {missionSel.isFixed ? "RAMASSAGE" : "MISSION"}
                  </span>
                  {!missionSel.isFixed && (
                    <span style={{ padding:"1px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:missionSel.status==="EN_COURS"?C.blueLight:C.greenLight, color:missionSel.status==="EN_COURS"?C.blue:C.green, flexShrink:0 }}>
                      {missionSel.status==="EN_COURS" ? "En cours" : "Approuvée"}
                    </span>
                  )}
                </div>
                <div style={{ fontSize:11, color:C.textMid, marginTop:4, display:"flex", alignItems:"center", gap:4 }}>
                  <MapPin size={10}/> IUC → {missionSel.isFixed ? "Bonamoussadi (2 tours)" : missionSel.destination}
                </div>
              </div>
            ) : (
              <span style={{ fontSize:13, color:C.textLight, display:"flex", alignItems:"center", gap:6 }}>
                <ClipboardList size={14} color={C.textLight}/> Choisir une mission…
              </span>
            )}
            {phase === "IDLE" && (
              <ChevronDown size={16} color={C.textLight} style={{ flexShrink:0, marginLeft:8, transform:showDrop?"rotate(180deg)":"none", transition:"transform .15s" }} />
            )}
          </div>
        </div>

        {/* Portal Dropdown — rendu dans le body, position fixed, jamais tronqué */}
        {showDrop && (
          <div ref={dropRef} className="tj-dropdown-portal" style={dropStyle}>
            {loading ? (
              <div style={{ padding:20, textAlign:"center", color:C.textLight, fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <Loader2 size={16} style={{ animation:"spin .8s linear infinite" }}/> Chargement…
              </div>
            ) : allOptions.map((opt, i) => (
              <div key={i} className="tj-opt"
                onClick={() => selMission(opt)}
                style={{
                  padding:"14px 16px", cursor:"pointer",
                  borderBottom:i < allOptions.length - 1 ? `1px solid ${C.border}` : "none",
                  display:"flex", gap:12, alignItems:"flex-start",
                  background:"#fff",
                }}>
                <div style={{ width:42, height:42, borderRadius:10, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:opt.isFixed ? C.amberLight : C.blueLight }}>
                  {opt.isFixed ? <Bus size={20} color={C.amber}/> : <Route size={20} color={C.blue}/>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:C.text }}>
                      {opt.isFixed ? opt.nom : (opt.destination || opt.purpose || "Mission")}
                    </span>
                    <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:opt.isFixed?C.amberLight:C.blueLight, color:opt.isFixed?C.amber:C.blue, flexShrink:0 }}>
                      {opt.isFixed ? "RAMASSAGE" : "MISSION"}
                    </span>
                    {!opt.isFixed && opt.status === "EN_COURS" && (
                      <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:C.blueLight, color:C.blue, flexShrink:0, display:"flex", alignItems:"center", gap:3 }}>
                        <span style={{ width:5, height:5, borderRadius:"50%", background:C.blue, display:"inline-block" }}/> En cours
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:C.textLight, display:"flex", alignItems:"center", gap:4, marginBottom:opt.isFixed?0:4 }}>
                    <MapPin size={10}/> {opt.isFixed ? "IUC Logbessou → Bonamoussadi · 2 tours · Lun–Ven" : `IUC Logbessou → ${opt.destination}`}
                  </div>
                  {!opt.isFixed && (
                    <div style={{ display:"flex", gap:10, fontSize:10, color:C.textMid, flexWrap:"wrap" }}>
                      {opt.requester_name && <span style={{ display:"flex", alignItems:"center", gap:3 }}><Users size={9}/> {opt.requester_name}</span>}
                      {opt.number_of_passengers > 0 && <span style={{ display:"flex", alignItems:"center", gap:3 }}><Users size={9}/> {opt.number_of_passengers} pers.</span>}
                      {opt.start_date && <span style={{ display:"flex", alignItems:"center", gap:3 }}><CalendarDays size={9}/> {fmtDate(opt.start_date)}{fmtTime(opt.start_date)?` · ${fmtTime(opt.start_date)}`:""}</span>}
                      {opt.purpose && <span style={{ display:"flex", alignItems:"center", gap:3 }}><Briefcase size={9}/> {opt.purpose}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Détails mission sélectionnée ── */}
        {missionSel && !missionSel.isFixed && (
          <div style={{ background:"var(--color-background-secondary,#F4F6F5)", borderRadius:10, padding:"14px 16px", marginBottom:16, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textMid, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
              <Info size={11}/> Détails de la mission
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {[
                { Icon:MapPin,       label:"Départ",       val:"IUC Logbessou"                                             },
                { Icon:Flag,         label:"Destination",  val:missionSel.destination || "—"                              },
                { Icon:Users,        label:"Demandeur",    val:missionSel.requester_name || "—"                           },
                { Icon:Users,        label:"Passagers",    val:missionSel.number_of_passengers ? `${missionSel.number_of_passengers} pers.` : "—" },
                { Icon:Briefcase,    label:"Objet",        val:missionSel.purpose || "—"                                   },
                { Icon:CalendarDays, label:"Date prévue",  val:fmtDate(missionSel.start_date)+(fmtTime(missionSel.start_date)?` · ${fmtTime(missionSel.start_date)}`:"")}
              ].map((f,i) => (
                <div key={i}>
                  <div style={{ fontSize:9, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:3, display:"flex", alignItems:"center", gap:4 }}>
                    <f.Icon size={9}/> {f.label}
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{f.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {missionSel?.isFixed && (
          <div style={{ background:C.amberLight, borderRadius:10, padding:"14px 16px", marginBottom:16, border:`1px solid ${C.amber}30` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.amber, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
              <Bus size={11}/> Infos ramassage scolaire
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {[
                { Icon:MapPin,       label:"Départ",  val:"IUC Logbessou"   },
                { Icon:Navigation,   label:"Vers",    val:"Bonamoussadi"    },
                { Icon:RotateCcw,    label:"Tours",   val:"2 tours / jour"  },
                { Icon:Clock,        label:"Créneau", val:"05h00 → 08h30"  },
                { Icon:CalendarDays, label:"Jours",   val:"Lun → Ven"       },
                { Icon:Flag,         label:"Retour",  val:"IUC Logbessou"  },
              ].map((f,i) => (
                <div key={i}>
                  <div style={{ fontSize:9, color:C.amber, textTransform:"uppercase", letterSpacing:"1px", marginBottom:3, display:"flex", alignItems:"center", gap:4 }}>
                    <f.Icon size={9}/> {f.label}
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{f.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPIs GPS live */}
        {phase === "RUNNING" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14, padding:"14px", background:C.greenLight, borderRadius:10, border:`1px solid ${C.green}30` }}>
            {[
              { Icon:Gauge,     label:"Vitesse",    val:`${speed} km/h`,        color:C.green },
              { Icon:Navigation,label:"Parcouru",   val:`${distDone} km`,       color:C.blue  },
              { Icon:MapPin,    label:"Points GPS", val:trackPoints.length,     color:C.green },
            ].map((k,i) => (
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginBottom:4 }}>
                  <k.Icon size={13} color={k.color}/>
                </div>
                <div style={{ fontSize:20, fontWeight:900, color:k.color, lineHeight:1 }}>{k.val}</div>
                <div style={{ fontSize:9, color:C.textMid, textTransform:"uppercase", letterSpacing:"1px", marginTop:3 }}>{k.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Kilométrage */}
        {missionSel && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            {phase === "IDLE" ? (
              <>
                <div>
                  <label className="tj-label"><Gauge size={11}/> Kilométrage départ *</label>
                  <input className="tj-input" type="number" value={kmDepart} onChange={e=>setKmDepart(e.target.value)}
                    placeholder={`Ex: ${Number(vehicule?.mileage||vehicule?.current_mileage||0).toLocaleString("fr-FR")}`}/>
                </div>
                <div>
                  <label className="tj-label"><Users size={11}/> Nombre de passagers</label>
                  <input className="tj-input" type="number" value={passagers} onChange={e=>setPassagers(e.target.value)}
                    placeholder={`Max: ${vehicule?.seating_capacity||30}`}/>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="tj-label"><Gauge size={11}/> Kilométrage arrivée *</label>
                  <input className="tj-input" type="number" value={kmArrivee} onChange={e=>setKmArrivee(e.target.value)} placeholder="Relevé compteur à l'arrivée"/>
                </div>
                <div>
                  <label className="tj-label"><Users size={11}/> Passagers réels</label>
                  <input className="tj-input" type="number" value={passagers} onChange={e=>setPassagers(e.target.value)}
                    placeholder={`Max: ${vehicule?.seating_capacity||30}`}/>
                </div>
              </>
            )}
          </div>
        )}

        {geoError && (
          <div style={{ fontSize:11, color:C.red, marginBottom:12, background:C.redLight, padding:"10px 14px", borderRadius:9, display:"flex", alignItems:"center", gap:6 }}>
            <AlertTriangle size={13}/> {geoError}
          </div>
        )}

        {/* Boutons */}
        {missionSel && phase === "IDLE" && (
          <button onClick={demarrer} disabled={saving} style={{
            width:"100%", padding:"14px 20px",
            background:saving ? C.border : `linear-gradient(135deg, ${C.green}, #16A34A)`,
            color:saving ? C.textLight : "#fff",
            border:"none", borderRadius:11, fontSize:14, fontWeight:800,
            cursor:saving?"not-allowed":"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            boxShadow:saving?"none":`0 4px 18px ${C.green}40`, transition:"all .2s",
          }}>
            {saving
              ? <><Loader2 size={16} style={{ animation:"spin .8s linear infinite" }}/> Démarrage en cours…</>
              : <><Play size={16}/> Démarrer le trajet</>
            }
          </button>
        )}

        {missionSel && phase === "RUNNING" && (
          <>
            <div style={{ background:C.amberLight, border:`1px solid ${C.amber}30`, borderRadius:9, padding:"10px 14px", fontSize:11, color:"#92400E", marginBottom:12, display:"flex", gap:8, alignItems:"flex-start" }}>
              <AlertTriangle size={13} color={C.amber} style={{ flexShrink:0, marginTop:1 }}/>
              <span>Le trajet reste <b>actif</b> même si vous fermez cette page. Cliquez "Terminer" uniquement à l'arrivée.</span>
            </div>
            <button onClick={terminer} disabled={saving || !kmArrivee} style={{
              width:"100%", padding:"14px 20px",
              background:saving||!kmArrivee ? C.border : `linear-gradient(135deg, ${C.red}, #E11D48)`,
              color:saving||!kmArrivee ? C.textLight : "#fff",
              border:"none", borderRadius:11, fontSize:14, fontWeight:800,
              cursor:saving||!kmArrivee?"not-allowed":"pointer", fontFamily:"inherit",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              boxShadow:!kmArrivee?"none":"0 4px 18px rgba(192,24,42,.35)", transition:"all .2s",
            }}>
              {saving
                ? <><Loader2 size={16} style={{ animation:"spin .8s linear infinite" }}/> Enregistrement…</>
                : <><Square size={16}/> Terminer le trajet</>
              }
            </button>
          </>
        )}

        {/* Carte */}
        {missionSel && (
          <div style={{ marginTop:16, borderRadius:10, overflow:"hidden", border:`1px solid ${C.border}` }}>
            <div style={{ height:380 }}>
              <MapContainer center={IUC_POS} zoom={13} style={{ height:"100%", width:"100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap"/>
                <Marker position={IUC_POS} icon={iconIUC}><Popup><b>IUC Logbessou</b><br/>Point de départ</Popup></Marker>
                {destCoords && (
                  <Marker position={destCoords} icon={missionSel.isFixed ? iconBus : iconDest}>
                    <Popup><b>{missionSel.isFixed ? "Bonamoussadi" : missionSel.destination}</b></Popup>
                  </Marker>
                )}
                {currentPos && (
                  <Marker position={currentPos} icon={iconMe}>
                    <Popup><b>Position actuelle</b><br/>{currentPos[0].toFixed(5)}, {currentPos[1].toFixed(5)}<br/><span style={{ color:C.green }}>Vitesse : {speed} km/h</span></Popup>
                  </Marker>
                )}
                {trackPoints.length > 1 && (
                  <Polyline positions={[IUC_POS,...trackPoints]} pathOptions={{ color:C.green, weight:4, opacity:0.9 }}/>
                )}
                {destCoords && (
                  <Polyline positions={[currentPos||IUC_POS, destCoords]} pathOptions={{ color:missionSel.isFixed?C.amber:C.blue, weight:2, opacity:0.4, dashArray:"8 6" }}/>
                )}
                {mapBounds && <MapFitter bounds={mapBounds}/>}
                {currentPos && phase === "RUNNING" && <MapPanner pos={currentPos}/>}
              </MapContainer>
            </div>
          </div>
        )}
      </div>

      {/* Journal GPS */}
      {phase === "RUNNING" && (
        <div className="tj-section">
          <div className="tj-section-title"><ClipboardList size={14} color={C.green}/> Journal de trajet</div>
          <div style={{ background:"var(--color-background-secondary,#F4F6F5)", borderRadius:9, padding:"10px 14px", maxHeight:140, overflowY:"auto", fontSize:11, color:C.textMid, fontFamily:"monospace", lineHeight:1.9 }}>
            {logs.map((l,i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}

      {/* Historique */}
      <div className="tj-section">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <div className="tj-section-title">
            <History size={14} color={C.green}/> Historique des trajets
          </div>
          <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700, background:C.greenLight, color:C.green }}>
            {tous.length} trajet{tous.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="tj-section-sub">Missions et ramassages effectués</div>

        {loading ? (
          <div style={{ textAlign:"center", padding:"30px 0", color:C.textLight, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <Loader2 size={18} style={{ animation:"spin .8s linear infinite", color:C.green }}/> Chargement…
          </div>
        ) : tous.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:C.textLight }}>
            <Route size={36} color={C.textLight} style={{ marginBottom:10 }}/>
            <div style={{ fontSize:13 }}>Aucun trajet enregistré</div>
          </div>
        ) : (
          tous.map((t, i) => {
            const isRes = !!t.destination;
            const km    = Math.max(0, isRes ? ((t.end_mileage||0)-(t.start_mileage||0)) || t.estimated_distance || 0 : (t.km_arrivee||0)-(t.km_depart||0));
            const type  = isRes ? "MISSION" : (t.type || "MISSION");
            const isRam = type === "RAMASSAGE";
            return (
              <div key={i} className="tj-hist-row">
                <div style={{ width:42, height:42, borderRadius:10, background:isRam?C.amberLight:C.blueLight, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {isRam ? <Bus size={20} color={C.amber}/> : <Route size={20} color={C.blue}/>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {isRes ? "IUC Logbessou" : (t.depart||"—")} → {isRes ? (t.destination||"—") : (t.arrivee||"—")}
                  </div>
                  <div style={{ fontSize:11, color:C.textLight, marginTop:3, display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
                    <span style={{ display:"flex", alignItems:"center", gap:3 }}>
                      <CalendarDays size={10}/> {fmtDate(isRes?(t.actual_end_date||t.start_date):t.date)}
                    </span>
                    {km > 0 && <span style={{ display:"flex", alignItems:"center", gap:3 }}><Navigation size={10}/> {Math.round(km)} km</span>}
                    {(t.number_of_passengers||t.passagers) > 0 && (
                      <span style={{ display:"flex", alignItems:"center", gap:3 }}>
                        <Users size={10}/> {t.number_of_passengers||t.passagers} passager{(t.number_of_passengers||t.passagers)>1?"s":""}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:isRam?C.amberLight:C.blueLight, color:isRam?C.amber:C.blue, flexShrink:0 }}>
                  {isRam ? <Bus size={10}/> : <Route size={10}/>} {type}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
