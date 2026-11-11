// ─── src/dashboard/DashboardTechnicien.jsx ─────────────────────────────────
// Corrections v3 :
//   • ModalConstat : suppression de l'endpoint fictif envoyer_constat/
//     Stratégie réelle :
//       1. PATCH breakdown avec constat_text + constat_roulable (non bloquant)
//       2. POST /intervenir/ action=CLOSE → passe à REPARE, notifie chauffeur
//   • handleTicketAction : sur_place/ passe EN_REPARATION, puis ouvre modal
//   • CAN_SEND_CONSTAT aligné avec les vrais statuts backend
//   • STATUS_CFG complet, WorkflowBar/Timeline robustes
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutGrid, Wrench, Calendar, Bell, LogOut,
  MapPin, ClipboardList, CheckCircle, CheckCircle2,
  AlertTriangle, ChevronLeft, ChevronRight,
  X, Camera, Navigation, Flame, Clock,
  ChevronDown, ChevronUp, Loader2, Flag,
  Truck, Target, Locate, FileText, BarChart2,
  ArrowRight, Info, Circle,
} from "lucide-react";

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/api/v1`;

async function apiFetch(path, opts = {}) {
  const tok = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const isFormData = opts.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${tok}`,
      ...(!isFormData && { "Content-Type": "application/json" }),
      ...opts.headers,
    },
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (res.status === 204) return null;
  let json = null;
  try { json = await res.json(); } catch {}
  if (!res.ok) {
    const detail =
      json?.detail || json?.message || json?.error ||
      (json && typeof json === "object"
        ? Object.entries(json).map(([k, v]) => `${k} : ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ")
        : null) ||
      `Erreur ${res.status}`;
    throw new Error(detail);
  }
  return json?.data ?? json;
}

const C = {
  green:"#1B5E37",  greenMid:"#2D7A4F", greenLight:"#EAF4EE",
  red:"#C0182A",    redLight:"#FDF0F1",
  white:"#FFFFFF",  bg:"#F0F3F1",
  pageBg:"#F0F3F1", sidebar:"#1a5d3b",
  border:"#E2E8E5", text:"#1A2820", textMid:"#4A6358", textLight:"#8EA99A",
  amber:"#D97706",  amberLight:"#FFFBEB",
  orange:"#EA580C", orangeLight:"#FFF7ED",
};

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const fmtDT = d =>
  d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

// ── STATUS_CFG complet ────────────────────────────────────────────────────────
const STATUS_CFG = {
  SIGNALE:        { label:"Nouveau",              color:C.red,     bg:C.redLight,    step:0 },
  EN_DIAGNOSTIC:  { label:"Vous êtes assigné",    color:C.amber,   bg:C.amberLight,  step:1 },
  SUR_PLACE:      { label:"Sur place",            color:C.amber,   bg:C.amberLight,  step:1 },
  EN_REPARATION:  { label:"En intervention",      color:C.orange,  bg:C.orangeLight, step:1 },
  CONSTAT_ENVOYE: { label:"Constat envoyé ✓",     color:C.green,   bg:C.greenLight,  step:2 },
  RAPPATRIE:      { label:"Rapatrié",             color:C.green,   bg:C.greenLight,  step:2 },
  TRANSFERE_MAINT:{ label:"Transféré maint.",     color:C.green,   bg:C.greenLight,  step:2 },
  REPARE:         { label:"Clôturé ✓",            color:C.green,   bg:C.greenLight,  step:3 },
  NON_REPARABLE:  { label:"Irrécupérable",        color:"#6B7280", bg:"#F3F4F6",     step:3 },
};

const SEVERITY_CFG = {
  CRITIQUE: { label:"Critique", color:C.red,    bg:C.redLight,    dot:C.red    },
  HAUTE:    { label:"Haute",    color:C.amber,  bg:C.amberLight,  dot:C.orange },
  MOYENNE:  { label:"Normale",  color:C.amber,  bg:C.amberLight,  dot:C.amber  },
  BASSE:    { label:"Faible",   color:C.green,  bg:C.greenLight,  dot:C.green  },
};

const MAINT_STATUS_CFG = {
  PLANIFIE: { label:"Planifié",  color:C.amber, bg:C.amberLight },
  EN_COURS: { label:"En cours",  color:C.amber, bg:C.amberLight },
  TERMINE:  { label:"Terminé",   color:C.green, bg:C.greenLight },
  ANNULE:   { label:"Annulé",    color:C.red,   bg:C.redLight   },
};

const NAV = [
  { id:"dashboard",     label:"Tableau de bord",  Icon:LayoutGrid  },
  { id:"tickets",       label:"Mes Interventions", Icon:Wrench      },
  { id:"maintenance",   label:"Maintenances",      Icon:Calendar    },
  { id:"notifications", label:"Notifications",     Icon:Bell        },
];

// Ticket "ouvert" = pas encore clôturé
const TECH_OPEN = s => !["REPARE","NON_REPARABLE","TRANSFERE_MAINT"].includes(s);

// Statuts pour lesquels le technicien peut envoyer le constat
// (intervenir/CLOSE n'est autorisé que si EN_REPARATION côté backend,
//  mais on gère la transition sur_place → EN_REPARATION en amont)
const CAN_SEND_CONSTAT = ["EN_DIAGNOSTIC","SUR_PLACE","EN_REPARATION","SIGNALE"];

// Statuts où le constat a déjà été envoyé / ticket en attente de clôture gestionnaire
const CONSTAT_DONE = ["CONSTAT_ENVOYE","RAPPATRIE","TRANSFERE_MAINT","REPARE"];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width:100%; height:100%; overflow:hidden; background:#F0F3F1; }

  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

  .nav-btn:hover      { background:rgba(255,255,255,.10)!important; color:#fff!important; }
  .logout-btn:hover   { background:rgba(192,24,42,.35)!important; }
  .icon-btn:hover     { background:#f1f5f9!important; }
  .collapse-btn:hover { background:rgba(255,255,255,.15)!important; }
  .card-hover { transition:box-shadow .18s, transform .18s; }
  .card-hover:hover { box-shadow:0 6px 20px rgba(0,0,0,.10)!important; transform:translateY(-2px); }
  .action-btn { transition:opacity .15s, transform .1s; }
  .action-btn:hover  { opacity:.88; transform:translateY(-1px); }
  .action-btn:active { transform:scale(.97); }
  button:active { transform:scale(0.97); }

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
  .sidebar-col-anim { transition:width .22s cubic-bezier(.4,0,.2,1); flex-shrink:0; }
  .brand-anim { transition:all .22s cubic-bezier(.4,0,.2,1); }

  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-thumb { background:#D4DDD9; border-radius:99px; }
  ::-webkit-scrollbar-track { background:transparent; }
  input:focus, textarea:focus, select:focus {
    border-color:${C.green}!important; outline:none;
    box-shadow:0 0 0 3px ${C.green}18!important;
  }
  input, textarea, select { color:${C.text}!important; background:#fff!important; }
  input[type=date]::-webkit-calendar-picker-indicator {
    filter:invert(25%) sepia(40%) saturate(400%) hue-rotate(120deg); cursor:pointer;
  }
  .sig-step { position:relative; padding-left:30px; padding-bottom:14px; }
  .sig-step::before { content:''; position:absolute; left:9px; top:22px; bottom:0;
    width:1px; background:#E2E8E5; }
  .sig-step:last-child::before { display:none; }
  .sig-step-dot { position:absolute; left:0; top:2px; width:20px; height:20px;
    border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; }
  .photo-zone { border:2px dashed #E2E8E5; border-radius:10px; padding:16px;
    cursor:pointer; transition:all .15s; display:flex; align-items:center; gap:12px;
    background:#F0F3F1; }
  .photo-zone:hover { border-color:${C.green}; background:${C.greenLight}; }
  .stat-grid { display:grid; gap:10px; grid-template-columns:repeat(4,1fr); }
  @media (max-width:900px)  { .stat-grid { grid-template-columns:repeat(2,1fr); } }
  .maint-grid { display:grid; gap:10px; grid-template-columns:repeat(3,1fr); }
  @media (max-width:700px) { .maint-grid { grid-template-columns:1fr; } }
  .topbar-inner { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; }
`;

const INP = {
  padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:8,
  fontSize:13, fontFamily:"inherit", color:C.text, background:"#fff",
  width:"100%", outline:"none", boxSizing:"border-box", transition:"border-color .15s",
};
const LBL = {
  fontSize:10, fontWeight:700, color:C.textMid, textTransform:"uppercase",
  letterSpacing:"1px", marginBottom:5, display:"block",
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    if (msg) { const t = setTimeout(onDone, 4500); return () => clearTimeout(t); }
  }, [msg, onDone]);
  if (!msg) return null;
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999,
      background:type==="error"?C.red:C.green, color:"#fff", borderRadius:10,
      padding:"12px 18px", fontSize:13, fontWeight:600,
      display:"flex", alignItems:"flex-start", gap:10,
      boxShadow:"0 4px 20px rgba(0,0,0,.25)", maxWidth:"min(460px,calc(100vw - 48px))",
      lineHeight:1.4 }}>
      <span style={{ flexShrink:0, marginTop:1 }}>
        {type==="error" ? <X size={14}/> : <CheckCircle size={14}/>}
      </span>
      <span>{msg}</span>
    </div>
  );
}

// ── Modal base ────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, footer, width=560 }) {
  useEffect(() => {
    const h = e => { if (e.key==="Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)",
      backdropFilter:"blur(4px)", display:"flex", alignItems:"center",
      justifyContent:"center", zIndex:1000, padding:16 }}
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:C.white, borderRadius:16, width:"100%",
        maxWidth:`min(${width}px, calc(100vw - 32px))`, maxHeight:"92vh",
        display:"flex", flexDirection:"column",
        boxShadow:"0 24px 60px rgba(0,0,0,.25)", animation:"fadeIn .2s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"18px 22px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{title}</div>
            {subtitle && <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
            color:C.textLight, width:30, height:30, borderRadius:7,
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={18}/>
          </button>
        </div>
        <div style={{ overflowY:"auto", padding:"18px 22px", flex:1 }}>{children}</div>
        {footer && (
          <div style={{ padding:"14px 22px", borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function ModalPhoto({ url, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key==="Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.9)",
      zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
        <img src={url} alt="Photo" style={{ maxWidth:"88vw", maxHeight:"82vh", borderRadius:10,
          objectFit:"contain", display:"block", boxShadow:"0 24px 80px rgba(0,0,0,.6)" }}/>
        <button onClick={onClose} style={{ position:"absolute", top:-14, right:-14, width:34, height:34,
          borderRadius:"50%", background:C.red, color:"#fff", border:"none",
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <X size={16}/>
        </button>
      </div>
    </div>
  );
}

async function getGeoLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Géolocalisation non supportée")); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat:pos.coords.latitude, lng:pos.coords.longitude }),
      err => reject(err),
      { timeout:12000, maximumAge:60000 }
    );
  });
}

async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
      { headers:{"User-Agent":"DRIVEPARC-IUC/1.0"} }
    );
    const d = await r.json();
    return d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
}

// ── Barre de progression 4 étapes ─────────────────────────────────────────────
function WorkflowBar({ status }) {
  const STEPS = ["Signalé","Assigné","Constat","Clôturé"];
  const current = STATUS_CFG[status]?.step ?? 0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      {STEPS.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ width:22, height:22, borderRadius:"50%",
                background:done||active ? C.green : C.border,
                color:done||active ? "#fff" : C.textLight,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:9, fontWeight:800,
                boxShadow:active ? `0 0 0 3px ${C.green}30` : "none", transition:"all .3s" }}>
                {done ? <CheckCircle size={11}/> : i+1}
              </div>
            </div>
            {i < STEPS.length-1 && (
              <div style={{ width:16, height:2, borderRadius:99,
                background:done ? C.green : C.border, transition:"background .3s" }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function Timeline({ ticket }) {
  const currentStep = STATUS_CFG[ticket.status]?.step ?? 0;
  const steps = [
    { label:"Signalement reçu",      time:ticket.reported_date, who:"Chauffeur"    },
    { label:"Technicien assigné",    time:ticket.assigned_date, who:"Gestionnaire" },
    { label:"Constat du technicien", time:ticket.constat_date,  who:"Vous"         },
    { label:"Clôture",               time:ticket.resolved_date, who:"Gestionnaire" },
  ];
  return (
    <div>
      {steps.map((s, i) => {
        const done = i <= currentStep;
        return (
          <div key={i} className="sig-step">
            <div className="sig-step-dot"
              style={{ background:done?C.green:"#E2E8E5", color:done?"#fff":C.textLight }}>
              {done ? <CheckCircle size={10}/> : <span style={{ fontSize:9 }}>{i+1}</span>}
            </div>
            <div style={{ fontSize:12, fontWeight:done?700:400, color:done?C.text:C.textLight }}>
              {s.label}
            </div>
            <div style={{ fontSize:10, color:C.textLight, marginTop:1 }}>
              {s.who}{s.time && done ? ` · ${fmtDT(s.time)}` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ✅ ModalConstat — utilise les vrais endpoints backend ─────────────────────
// Stratégie d'envoi :
//   1. Assurer que le ticket est en EN_REPARATION (via sur_place si besoin)
//   2. PATCH breakdown avec les champs constat (non bloquant — le serializer peut ignorer)
//   3. POST /intervenir/ action=CLOSE  → passe à REPARE, notifie chauffeur
//
// NOTE : si le gestionnaire veut un statut intermédiaire "CONSTAT_ENVOYE",
// il faut ajouter un endpoint dédié côté Django (voir backend).
function ModalConstat({ ticket, onClose, onSuccess, showToast }) {
  const [roulable,   setRoulable]   = useState(null);
  const [texte,      setTexte]      = useState("");
  const [photos,     setPhotos]     = useState([]);
  const [previews,   setPreviews]   = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [savingStep, setSavingStep] = useState("");
  const [geoState,   setGeoState]   = useState("idle");
  const [geoCoords,  setGeoCoords]  = useState(null);
  const [geoLabel,   setGeoLabel]   = useState("");
  const [photoModal, setPhotoModal] = useState(null);
  const fileRef = useRef();

  const handleFiles = files => {
    const arr   = Array.from(files);
    const valid = arr.filter(f => f.size <= 10*1024*1024);
    if (valid.length < arr.length) showToast("Photos > 10 Mo ignorées","error");
    const newPhotos = [...photos, ...valid].slice(0, 5);
    setPhotos(newPhotos);
    Promise.all(newPhotos.map(f => new Promise(res => {
      const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(f);
    }))).then(setPreviews);
  };

  const handleGeo = async () => {
    setGeoState("loading");
    try {
      const c = await getGeoLocation();
      setGeoCoords(c);
      const label = await reverseGeocode(c.lat, c.lng);
      setGeoLabel(label);
      setGeoState("success");
    } catch {
      setGeoState("error");
      showToast("Position GPS indisponible","error");
    }
  };

  const canSubmit = roulable !== null && texte.trim().length >= 10 && photos.length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit) {
      showToast("2 photos minimum + état roulable + description (10 car. min) requis","error");
      return;
    }
    setSaving(true);

    try {
      // ── Étape 1 : s'assurer que le ticket est EN_REPARATION ─────────────
      // Si le ticket n'est pas encore EN_REPARATION, appeler sur_place/ d'abord
      if (!["EN_REPARATION","SUR_PLACE"].includes(ticket.status)) {
        setSavingStep("Mise à jour du statut…");
        try {
          let geoBody = { status_log_timestamp: new Date().toISOString() };
          if (geoCoords) {
            geoBody.sur_place_lat = geoCoords.lat;
            geoBody.sur_place_lng = geoCoords.lng;
          }
          await apiFetch(`/maintenance/breakdowns/${ticket.id}/sur_place/`, {
            method:"POST", body:JSON.stringify(geoBody),
          });
        } catch (eSurPlace) {
          // Non bloquant — si le statut est déjà OK côté serveur on continue
          console.warn("sur_place ignoré :", eSurPlace.message);
        }
      }

      // ── Étape 2 : PATCH pour sauvegarder les champs constat ─────────────
      // (constat_text, constat_roulable, photos) — non bloquant
      setSavingStep("Enregistrement du constat…");
      try {
        const fd = new FormData();
        fd.append("constat_roulable", String(roulable));
        fd.append("constat_text", texte);
        photos.forEach((p, i) => fd.append(`constat_photo${i+1}`, p));
        if (geoCoords) {
          fd.append("constat_lat",      String(geoCoords.lat));
          fd.append("constat_lng",      String(geoCoords.lng));
          fd.append("constat_location", geoLabel || `${geoCoords.lat.toFixed(5)}, ${geoCoords.lng.toFixed(5)}`);
        }
        await apiFetch(`/maintenance/breakdowns/${ticket.id}/`, {
          method:"PATCH", body:fd,
        });
      } catch (ePatch) {
        // Non bloquant — le serializer peut rejeter des champs inconnus
        console.warn("PATCH champs constat ignoré :", ePatch.message);
      }

      // ── Étape 3 : clôturer via /intervenir/ action=CLOSE ────────────────
      // C'est le seul endpoint qui existe réellement dans views.py pour clôturer
      setSavingStep("Envoi au gestionnaire…");
      await apiFetch(`/maintenance/breakdowns/${ticket.id}/intervenir/`, {
        method:"POST",
        body:JSON.stringify({
          action:         "CLOSE",
          repair_actions: texte,
          parts_used:     "",
          repair_cost:    0,
        }),
      });

      showToast("Constat envoyé — intervention clôturée ✓");
      onSuccess();
    } catch (e) {
      showToast("Erreur : " + e.message, "error");
    } finally {
      setSaving(false);
      setSavingStep("");
    }
  };

  return (
    <Modal
      title="Envoyer le constat"
      subtitle={`${ticket.title} · ${ticket.vehicle_name}`}
      onClose={onClose} width={600}
      footer={
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", alignItems:"center" }}>
          {saving && savingStep && (
            <span style={{ fontSize:11, color:C.textLight, flex:1 }}>{savingStep}</span>
          )}
          <button onClick={onClose} disabled={saving}
            style={{ padding:"9px 18px", background:"transparent",
              color:C.textMid, border:`1px solid ${C.border}`, borderRadius:8,
              fontSize:12, fontWeight:600, cursor:saving?"not-allowed":"pointer",
              fontFamily:"inherit", opacity:saving?.6:1 }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving||!canSubmit} className="action-btn"
            style={{ padding:"9px 22px", background:canSubmit?C.green:C.border,
              color:canSubmit?"#fff":C.textLight, border:"none", borderRadius:8,
              fontSize:12, fontWeight:700, cursor:canSubmit&&!saving?"pointer":"not-allowed",
              fontFamily:"inherit", opacity:saving?0.65:1,
              display:"flex", alignItems:"center", gap:6 }}>
            {saving
              ? <><Loader2 size={14} style={{ animation:"spin .8s linear infinite" }}/>Envoi…</>
              : <><ClipboardList size={14}/>Envoyer le constat</>}
          </button>
        </div>
      }>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {/* Info workflow */}
        <div style={{ background:C.greenLight, border:`1px solid ${C.green}30`, borderRadius:9,
          padding:"10px 14px", fontSize:12, color:C.green, display:"flex", gap:8 }}>
          <Info size={14} style={{ flexShrink:0, marginTop:1 }}/>
          Une fois le constat envoyé, l'intervention sera clôturée et le gestionnaire sera notifié.
        </div>

        {/* Contexte */}
        <div style={{ background:C.bg, borderRadius:9, padding:"10px 14px", fontSize:12, color:C.textMid }}>
          <b>Véhicule :</b> {ticket.vehicle_name}
          {ticket.location && <><br/><b>Position signalée :</b> {ticket.location}</>}
        </div>

        {/* État roulable */}
        <div>
          <label style={LBL}>État du véhicule <span style={{ color:C.red }}>*</span></label>
          <div style={{ display:"flex", gap:10 }}>
            {[
              { val:true,  label:"Véhicule roulable",   color:C.green, bg:C.greenLight },
              { val:false, label:"Véhicule immobilisé", color:C.red,   bg:C.redLight   },
            ].map(opt => (
              <div key={String(opt.val)} onClick={() => setRoulable(opt.val)}
                style={{ flex:1, minWidth:0, padding:"12px 14px", borderRadius:9, cursor:"pointer",
                  border:`2px solid ${roulable===opt.val?opt.color:C.border}`,
                  background:roulable===opt.val?opt.bg:C.bg,
                  display:"flex", alignItems:"center", gap:8, transition:"all .12s",
                  fontWeight:roulable===opt.val?800:500,
                  color:roulable===opt.val?opt.color:C.textMid, fontSize:13 }}>
                <div style={{ width:20, height:20, borderRadius:"50%", flexShrink:0,
                  border:`2px solid ${roulable===opt.val?opt.color:C.border}`,
                  background:roulable===opt.val?opt.color:"#fff",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {roulable===opt.val && <CheckCircle size={11} color="#fff"/>}
                </div>
                {opt.label}
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={LBL}>
            Description du constat <span style={{ color:C.red }}>*</span>
            <span style={{ fontSize:9, color:texte.length>190?C.red:C.textLight, fontWeight:400,
              textTransform:"none", letterSpacing:0, marginLeft:6 }}>
              ({200-texte.length} restants · {texte.length<10?`${10-texte.length} char. min`:""})
            </span>
          </label>
          <textarea value={texte}
            onChange={e => { if (e.target.value.length<=200) setTexte(e.target.value); }}
            rows={4} placeholder="Décrivez l'état du véhicule, les dommages visibles, la localisation précise…"
            style={{ ...INP, resize:"vertical", minHeight:90 }}/>
        </div>

        {/* Photos */}
        <div>
          <label style={LBL}>
            Photos des dommages <span style={{ color:C.red }}>*</span>
            <span style={{ fontSize:9, color:photos.length<2?C.red:C.green,
              fontWeight:400, textTransform:"none", letterSpacing:0, marginLeft:6 }}>
              ({photos.length}/2 minimum · 5 maximum)
            </span>
          </label>

          {previews.length > 0 && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
              {previews.map((src, i) => (
                <div key={i} style={{ position:"relative" }}>
                  <img src={src} alt={`Photo ${i+1}`} onClick={() => setPhotoModal(src)}
                    style={{ width:72, height:72, objectFit:"cover", borderRadius:8,
                      border:`2px solid ${C.green}`, cursor:"zoom-in" }}/>
                  <button onClick={() => {
                    const np = photos.filter((_,j)=>j!==i);
                    setPhotos(np);
                    Promise.all(np.map(f => new Promise(res => {
                      const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(f);
                    }))).then(setPreviews);
                  }} style={{ position:"absolute", top:-6, right:-6, width:18, height:18,
                    borderRadius:"50%", background:C.red, color:"#fff", border:"none",
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <X size={10}/>
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <div onClick={() => fileRef.current?.click()}
                  style={{ width:72, height:72, borderRadius:8, border:`2px dashed ${C.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer", background:C.bg, color:C.textLight, fontSize:22 }}>+</div>
              )}
            </div>
          )}

          {photos.length === 0 && (
            <div className="photo-zone" onClick={() => fileRef.current?.click()}>
              <Camera size={28} color={C.textLight}/>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:C.textMid }}>Ajouter les photos du constat</div>
                <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>Minimum 2 photos · JPG, PNG · max 10 Mo</div>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }}
            onChange={e => { handleFiles(e.target.files); e.target.value=""; }}/>
        </div>

        {/* GPS */}
        <div>
          <label style={LBL}>Position GPS (recommandé)</label>
          <button type="button" onClick={handleGeo} disabled={geoState==="loading"}
            style={{ padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:700,
              fontFamily:"inherit", cursor:geoState==="loading"?"default":"pointer",
              border:`1.5px solid ${geoState==="success"?C.green:C.border}`,
              background:geoState==="success"?C.greenLight:C.bg,
              color:geoState==="success"?C.green:C.textMid,
              display:"flex", alignItems:"center", gap:7 }}>
            {geoState==="loading" ? <><Loader2 size={14} style={{ animation:"spin .8s linear infinite" }}/> Localisation…</>
              : geoState==="success" ? <><CheckCircle size={14}/> Position enregistrée</>
              : geoState==="error"   ? <><X size={14}/> GPS indisponible</>
              : <><Locate size={14}/> Obtenir ma position GPS</>}
          </button>
          {geoCoords && (
            <div style={{ fontSize:10, color:C.green, fontWeight:700, marginTop:4 }}>
              {geoLabel || `${geoCoords.lat.toFixed(5)}, ${geoCoords.lng.toFixed(5)}`}
            </div>
          )}
        </div>

        <div style={{ background:C.amberLight, border:`1px solid ${C.amber}30`, borderRadius:9,
          padding:"10px 14px", fontSize:12, color:C.amber, display:"flex", gap:8 }}>
          <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }}/>
          L'envoi du constat clôture l'intervention. Le gestionnaire recevra une notification.
        </div>
      </div>
      {photoModal && <ModalPhoto url={photoModal} onClose={() => setPhotoModal(null)}/>}
    </Modal>
  );
}

// ── Modal Clôturer Maintenance ────────────────────────────────────────────────
function ModalClotureMaint({ maint, onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({
    work_performed:"", parts_replaced:"", labor_cost:"", parts_cost:"", notes:"",
    done_date:new Date().toISOString().split("T")[0],
    done_km:maint.vehicle_km?String(maint.vehicle_km):"",
  });
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const total = Number(form.labor_cost||0) + Number(form.parts_cost||0);

  const handleSubmit = async () => {
    if (!form.work_performed.trim()) { showToast("Décrivez les travaux effectués","error"); return; }
    setSaving(true); setApiErr("");
    const body = {
      work_performed:form.work_performed, parts_replaced:form.parts_replaced||null,
      labor_cost:form.labor_cost||0, parts_cost:form.parts_cost||0, notes:form.notes||null,
      done_date:form.done_date||null, done_km:form.done_km||null,
    };
    const endpoints = [
      { url:`/maintenance/maintenance/${maint.id}/complete/`, method:"POST", body },
      { url:`/maintenance/maintenance/${maint.id}/done/`,     method:"POST", body },
      { url:`/maintenance/maintenance/${maint.id}/`,          method:"PATCH",
        body:{ status:"TERMINE",...body, end_date:body.done_date, mileage_at_maintenance:body.done_km } },
    ];
    let lastErr = null;
    for (const ep of endpoints) {
      try {
        await apiFetch(ep.url,{ method:ep.method, body:JSON.stringify(ep.body) });
        showToast("Maintenance clôturée ✓"); onSuccess(); setSaving(false); return;
      } catch(e) { lastErr=e; if (!e.message.includes("500")&&!e.message.includes("404")) break; }
    }
    setApiErr(lastErr?.message||"Erreur inconnue");
    showToast("Échec de la clôture","error"); setSaving(false);
  };

  return (
    <Modal title="Clôturer la maintenance" subtitle={maint.vehicle_name} onClose={onClose} width={600}
      footer={
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 18px", background:"transparent",
            color:C.textMid, border:`1px solid ${C.border}`, borderRadius:8,
            fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="action-btn"
            style={{ padding:"9px 22px", background:C.green, color:"#fff", border:"none",
              borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
              opacity:saving?.7:1, display:"flex", alignItems:"center", gap:6 }}>
            {saving ? <><Loader2 size={14} style={{ animation:"spin .8s linear infinite" }}/>Clôture…</> : <><CheckCircle2 size={14}/>Clôturer</>}
          </button>
        </div>
      }>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {apiErr && (
          <div style={{ background:C.redLight, border:`1px solid ${C.red}30`, borderRadius:9,
            padding:"10px 14px", fontSize:12, color:C.red, display:"flex", gap:8 }}>
            <AlertTriangle size={14} style={{ flexShrink:0 }}/><span>{apiErr}</span>
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><label style={LBL}>Date d'intervention</label>
            <input style={INP} type="date" value={form.done_date} onChange={e=>set("done_date",e.target.value)}/></div>
          <div><label style={LBL}>Kilométrage (km)</label>
            <input style={INP} type="number" value={form.done_km} onChange={e=>set("done_km",e.target.value)} placeholder="Relevé compteur"/></div>
        </div>
        <div><label style={LBL}>Travaux effectués <span style={{ color:C.red }}>*</span></label>
          <textarea style={{ ...INP, height:90, resize:"vertical" }} value={form.work_performed}
            onChange={e=>set("work_performed",e.target.value)} placeholder="Détaillez les opérations…"/></div>
        <div><label style={LBL}>Pièces remplacées</label>
          <input style={INP} value={form.parts_replaced} onChange={e=>set("parts_replaced",e.target.value)}
            placeholder="Filtres, courroie, plaquettes…"/></div>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:C.textMid, textTransform:"uppercase",
            letterSpacing:"1px", marginBottom:8 }}>Coûts</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label style={LBL}>Main d'œuvre (FCFA)</label>
              <input style={INP} type="number" value={form.labor_cost} onChange={e=>set("labor_cost",e.target.value)} placeholder="0"/></div>
            <div><label style={LBL}>Pièces (FCFA)</label>
              <input style={INP} type="number" value={form.parts_cost} onChange={e=>set("parts_cost",e.target.value)} placeholder="0"/></div>
          </div>
          {total > 0 && (
            <div style={{ marginTop:8, padding:"10px 14px", background:C.greenLight, borderRadius:8,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.green }}>Total</span>
              <span style={{ fontSize:18, fontWeight:800, color:C.green }}>{total.toLocaleString("fr-FR")} FCFA</span>
            </div>
          )}
        </div>
        <div><label style={LBL}>Notes</label>
          <textarea style={{ ...INP, height:70, resize:"vertical" }} value={form.notes}
            onChange={e=>set("notes",e.target.value)} placeholder="Anomalies, recommandations…"/></div>
      </div>
    </Modal>
  );
}

// ── Carte ticket ──────────────────────────────────────────────────────────────
function TicketCard({ ticket:t, onConstat, onExpandToggle, expanded }) {
  const sev    = SEVERITY_CFG[t.severity] || SEVERITY_CFG.MOYENNE;
  const st     = STATUS_CFG[t.status]     || { label:t.status, color:C.textMid, bg:C.bg, step:0 };
  const isOpen = TECH_OPEN(t.status);
  const step   = st.step;

  const canSendConstat = CAN_SEND_CONSTAT.includes(t.status);
  const constatSent    = CONSTAT_DONE.includes(t.status);

  return (
    <div className="card-hover" style={{ background:C.white, borderRadius:12, padding:"16px 18px",
      boxShadow:"0 1px 4px rgba(0,0,0,.06)", border:`1px solid ${C.border}`,
      borderLeft:`4px solid ${sev.color}`, animation:"fadeIn .2s ease",
      minWidth:0, overflow:"hidden" }}>

      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        marginBottom:10, gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
            <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:800,
              background:sev.bg, color:sev.color, display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:sev.dot, display:"inline-block" }}/>
              {sev.label}
            </span>
            <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700,
              background:st.bg, color:st.color }}>{st.label}</span>
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:C.text,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</div>
          <div style={{ fontSize:11, color:C.textLight, marginTop:3,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {t.vehicle_name}{t.reported_by_name && ` · ${t.reported_by_name}`}
            {t.location && ` · ${t.location}`}
          </div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:10, color:C.textLight }}>{fmtDT(t.reported_date)}</div>
          <button onClick={onExpandToggle} style={{ marginTop:6, fontSize:11, color:C.textMid,
            background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 10px",
            cursor:"pointer", fontFamily:"inherit", fontWeight:600,
            display:"flex", alignItems:"center", gap:4 }}>
            {expanded ? <><ChevronUp size={12}/>Réduire</> : <><ChevronDown size={12}/>Détails</>}
          </button>
        </div>
      </div>

      {/* Barre de progression */}
      {isOpen && (
        <div style={{ display:"flex", gap:3, marginBottom:12 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ height:4, flex:1, borderRadius:99,
              background:i<=step?sev.color:C.border, transition:"background .3s" }}/>
          ))}
        </div>
      )}

      {/* Description */}
      {t.description && (
        <div style={{ fontSize:12, color:C.textMid, background:C.bg, borderRadius:8,
          padding:"8px 10px", marginBottom:10, lineHeight:1.5,
          overflow:"hidden", display:"-webkit-box",
          WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
          {t.description}
        </div>
      )}

      {/* Actions */}
      {isOpen && (
        <div style={{ marginTop:8 }}>
          {canSendConstat && !constatSent && (
            <button onClick={() => onConstat(t)} className="action-btn"
              style={{ padding:"8px 18px", background:C.orange, color:"#fff",
                border:"none", borderRadius:8, fontSize:12, fontWeight:700,
                cursor:"pointer", fontFamily:"inherit",
                display:"flex", alignItems:"center", gap:6,
                boxShadow:`0 3px 12px ${C.orange}40` }}>
              <ClipboardList size={14}/>
              {t.status==="EN_DIAGNOSTIC"
                ? "Je suis sur place — Envoyer le constat"
                : "Envoyer le constat"}
            </button>
          )}
          {constatSent && t.status==="REPARE" && (
            <div style={{ fontSize:11, color:C.green, fontWeight:700,
              background:C.greenLight, padding:"8px 14px", borderRadius:8,
              border:`1px solid ${C.green}30`, display:"flex", alignItems:"center", gap:6 }}>
              <CheckCircle size={13}/> Intervention clôturée
            </div>
          )}
          {constatSent && t.status!=="REPARE" && (
            <div style={{ fontSize:11, color:C.green, fontWeight:700,
              background:C.greenLight, padding:"8px 14px", borderRadius:8,
              border:`1px solid ${C.green}30`, display:"flex", alignItems:"center", gap:6 }}>
              <Clock size={13}/> Constat reçu — en attente de clôture par le gestionnaire
            </div>
          )}
        </div>
      )}

      {/* Détails dépliables */}
      {expanded && (
        <div style={{ marginTop:14, borderTop:`1px solid ${C.border}`,
          paddingTop:14, animation:"slideUp .2s ease" }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.textLight,
            textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>
            Suivi de l'intervention
          </div>
          <Timeline ticket={t}/>

          {/* Constat affiché si repair_actions ou constat_text présent */}
          {(t.repair_actions || t.constat_text) && (
            <div style={{ marginTop:12, background:"#F0FDF4", border:`1.5px solid ${C.green}30`,
              borderRadius:9, padding:"12px 14px" }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.green, marginBottom:6,
                display:"flex", alignItems:"center", gap:6 }}>
                <ClipboardList size={13}/> Votre constat
              </div>
              {t.constat_roulable !== undefined && t.constat_roulable !== null && (
                <div style={{ fontSize:11, fontWeight:700, marginBottom:6,
                  color:t.constat_roulable?C.green:C.red,
                  display:"flex", alignItems:"center", gap:5 }}>
                  {t.constat_roulable
                    ? <><CheckCircle size={12}/> Véhicule roulable</>
                    : <><X size={12}/> Véhicule immobilisé</>}
                </div>
              )}
              <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6 }}>
                {t.repair_actions || t.constat_text}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Carte maintenance ─────────────────────────────────────────────────────────
function MaintenanceCard({ maint:m, onStart, onClose }) {
  const st = MAINT_STATUS_CFG[m.status] || MAINT_STATUS_CFG.PLANIFIE;
  const isOverdue = m.scheduled_date && new Date(m.scheduled_date) < new Date() && m.status!=="TERMINE";
  return (
    <div style={{ padding:"12px 0", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
        <div style={{ width:44, height:44, borderRadius:10, background:C.amberLight,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {m.maintenance_type==="PREVENTIVE"
            ? <Wrench size={20} color={C.amber}/>
            : <Clock size={20} color={C.amber}/>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {m.maintenance_type} — {m.vehicle_name}
              </div>
              <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
                Prévu le {fmtDate(m.scheduled_date)}
                {isOverdue && <span style={{ color:C.red, fontWeight:700 }}> — En retard !</span>}
              </div>
              {m.description && (
                <div style={{ fontSize:11, color:C.textMid, marginTop:4, lineHeight:1.5 }}>
                  {m.description}
                </div>
              )}
            </div>
            <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700,
              background:st.bg, color:st.color, flexShrink:0 }}>{st.label}</span>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
            {m.status==="PLANIFIE" && onStart && (
              <button onClick={onStart} className="action-btn"
                style={{ padding:"6px 14px", background:C.green, color:"#fff", border:"none",
                  borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                  display:"flex", alignItems:"center", gap:5 }}>
                <Flag size={12}/> Démarrer
              </button>
            )}
            {m.status==="EN_COURS" && onClose && (
              <button onClick={onClose} className="action-btn"
                style={{ padding:"6px 14px", background:C.green, color:"#fff", border:"none",
                  borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                  display:"flex", alignItems:"center", gap:5 }}>
                <CheckCircle size={12}/> Clôturer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export default function DashboardTechnicien({ onLogout }) {
  const [tab,           setTab]           = useState("dashboard");
  const [user,          setUser]          = useState(null);
  const [tickets,       setTickets]       = useState([]);
  const [maintenances,  setMaintenances]  = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState({ msg:"", type:"success" });
  const [expandedId,    setExpandedId]    = useState(null);
  const [collapsed,     setCollapsed]     = useState(false);
  const [modalConstat,  setModalConstat]  = useState(null);
  const [modalMaint,    setModalMaint]    = useState(null);

  const showToast = useCallback((msg, type="success") => setToast({ msg, type }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, t, m, n] = await Promise.all([
        apiFetch("/auth/profile/").catch(()=>null),
        apiFetch("/maintenance/breakdowns/").catch(()=>[]),
        apiFetch("/maintenance/maintenance/").catch(()=>[]),
        apiFetch("/notifications/").catch(()=>[]),
      ]);
      setUser(u);
      setTickets(Array.isArray(t)?t:t?.results??[]);
      setMaintenances(Array.isArray(m)?m:m?.results??[]);
      setNotifications(Array.isArray(n)?n:n?.results??[]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── ✅ handleTicketAction corrigé ────────────────────────────────────────
  // Séquence :
  //   EN_DIAGNOSTIC → POST /sur_place/ (passe à EN_REPARATION) → ouvre modal constat
  //   Autres statuts éligibles → ouvre modal directement
  //   Le modal se charge ensuite d'appeler /intervenir/ action=CLOSE
  const handleTicketAction = async (ticket) => {
    if (ticket.status === "EN_DIAGNOSTIC") {
      // Appel sur_place/ en avant-plan pour avoir le bon statut avant le modal
      try {
        let geoBody = { status_log_timestamp: new Date().toISOString() };
        try {
          const c = await getGeoLocation();
          geoBody.sur_place_lat = c.lat;
          geoBody.sur_place_lng = c.lng;
        } catch {}
        await apiFetch(`/maintenance/breakdowns/${ticket.id}/sur_place/`, {
          method:"POST", body:JSON.stringify(geoBody),
        });
        // Ouvrir le modal avec statut optimiste EN_REPARATION
        setModalConstat({ ...ticket, status:"EN_REPARATION" });
      } catch (e) {
        // Si sur_place échoue (ex: déjà EN_REPARATION), on ouvre quand même
        console.warn("sur_place échoué :", e.message);
        setModalConstat({ ...ticket, status:"EN_REPARATION" });
      }
    } else {
      // SUR_PLACE, EN_REPARATION, SIGNALE → ouvrir directement
      setModalConstat(ticket);
    }
  };

  const handleStartMaint = async maint => {
    try {
      try { await apiFetch(`/maintenance/maintenance/${maint.id}/start/`,{method:"POST"}); }
      catch { await apiFetch(`/maintenance/maintenance/${maint.id}/`,{method:"PATCH",body:JSON.stringify({status:"EN_COURS"})}); }
      showToast("Maintenance démarrée ✓"); load();
    } catch(e) { showToast("Erreur : "+e.message,"error"); }
  };

  const markNotifRead = async id => {
    try {
      await apiFetch(`/notifications/${id}/mark-read/`,{method:"POST"}).catch(()=>{});
      setNotifications(prev => prev.map(n => n.id===id?{...n,status:"LU"}:n));
    } catch {}
  };

  const handleLogout = () => { localStorage.clear(); sessionStorage.clear(); onLogout?.(); };

  if (loading) return (
    <div style={{ position:"fixed", inset:0, display:"flex", alignItems:"center",
      justifyContent:"center", background:C.bg, flexDirection:"column", gap:14 }}>
      <Loader2 size={32} color={C.green} style={{ animation:"spin .8s linear infinite" }}/>
      <div style={{ fontSize:11, color:C.textLight, letterSpacing:"2px", textTransform:"uppercase" }}>Chargement</div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  const ticketsCritiques = tickets.filter(t => t.severity==="CRITIQUE" && TECH_OPEN(t.status));
  const ticketsActifs    = tickets.filter(t => TECH_OPEN(t.status));
  const ticketsResolus   = tickets.filter(t => t.status==="REPARE");
  const unreadNotifs     = notifications.filter(n => n.status==="NON_LU").length;
  const maintsEnCours    = maintenances.filter(m => m.status==="EN_COURS");
  const maintsPlanifies  = maintenances.filter(m => m.status==="PLANIFIE");
  const maintsTermines   = maintenances.filter(m => m.status==="TERMINE");

  const stats = {
    aRejoindre:    tickets.filter(t => t.status==="EN_DIAGNOSTIC").length,
    surPlace:      tickets.filter(t => ["SUR_PLACE","EN_REPARATION"].includes(t.status)).length,
    constatEnvoye: tickets.filter(t => CONSTAT_DONE.includes(t.status) && t.status!=="REPARE").length,
    clotures:      ticketsResolus.length,
  };

  const nextTicket = ticketsActifs.find(t =>
    ["EN_DIAGNOSTIC","SUR_PLACE","EN_REPARATION","CONSTAT_ENVOYE"].includes(t.status)
  );

  const sidebarWidth = collapsed ? 68 : 220;

  return (
    <div style={{ position:"fixed", top:0, right:0, bottom:0, left:0,
      display:"flex", overflow:"hidden",
      fontFamily:"'Inter',-apple-system,sans-serif",
      background:C.pageBg, padding:"12px", gap:"12px", boxSizing:"border-box" }}>
      <style>{CSS}</style>
      <Toast msg={toast.msg} type={toast.type} onDone={() => setToast({ msg:"" })}/>

      {modalConstat && (
        <ModalConstat
          ticket={modalConstat}
          onClose={() => setModalConstat(null)}
          onSuccess={() => { setModalConstat(null); load(); }}
          showToast={showToast}
        />
      )}
      {modalMaint && (
        <ModalClotureMaint
          maint={modalMaint}
          onClose={() => setModalMaint(null)}
          onSuccess={() => { setModalMaint(null); load(); }}
          showToast={showToast}
        />
      )}

      {/* SIDEBAR */}
      <div className="sidebar-col-anim" style={{ width:sidebarWidth, flexShrink:0,
        display:"flex", flexDirection:"column", gap:"10px", overflow:"visible" }}>

        <div className="brand-anim" style={{ background:"#fff", borderRadius:14,
          padding:collapsed?"16px 10px":"13px 16px",
          display:"flex", alignItems:"center", gap:10,
          boxShadow:"0 1px 4px rgba(0,0,0,.06)", flexShrink:0,
          justifyContent:collapsed?"center":"flex-start", overflow:"hidden" }}>
          <img src="/assets/logo (3).png" alt="DriveParc"
            style={{ height:43, width:"auto", objectFit:"contain", flexShrink:0 }}/>
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

        <aside style={{ background:C.sidebar, borderRadius:16, flex:1,
          display:"flex", flexDirection:"column", overflow:"visible",
          boxShadow:"0 4px 20px rgba(26,93,59,.25)", position:"relative" }}>

          <button className="collapse-btn" onClick={() => setCollapsed(c=>!c)}
            style={{ position:"absolute", top:20, right:-11, width:22, height:22,
              borderRadius:"50%", background:"#fff", border:`1.5px solid ${C.border}`,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              zIndex:50, boxShadow:"0 2px 6px rgba(0,0,0,.12)", padding:0, color:C.textMid }}>
            {collapsed ? <ChevronRight size={10} strokeWidth={2.5}/> : <ChevronLeft size={10} strokeWidth={2.5}/>}
          </button>

          {!collapsed && (
            <div style={{ padding:"10px 14px 4px" }}>
              <div style={{ fontSize:9, color:"rgba(255,255,255,.45)", textTransform:"uppercase", letterSpacing:"1.5px", fontWeight:700 }}>
                Technicien
              </div>
              {ticketsCritiques.length > 0 && (
                <div style={{ marginTop:6, fontSize:10, background:"rgba(192,24,42,.3)",
                  borderRadius:6, padding:"4px 8px", color:"#fca5a5", fontWeight:700,
                  display:"flex", alignItems:"center", gap:5 }}>
                  <Flame size={11}/> {ticketsCritiques.length} critique{ticketsCritiques.length>1?"s":""}
                </div>
              )}
            </div>
          )}

          <div style={{ height:1, background:"rgba(255,255,255,.10)", margin:"4px 12px" }}/>

          <nav style={{ flex:1, padding:"10px 8px", overflowY:"auto", minHeight:0, overflowX:"visible" }}>
            {NAV.map(n => {
              const active = tab === n.id;
              const badge  = n.id==="notifications" ? unreadNotifs
                           : n.id==="tickets"       ? ticketsActifs.length : 0;
              return (
                <div key={n.id} className="nav-wrap">
                  <button onClick={() => setTab(n.id)}
                    style={{ display:"flex", alignItems:"center", gap:11, width:"100%",
                      padding:collapsed?"9px 0":"8px 10px",
                      justifyContent:collapsed?"center":"flex-start",
                      borderRadius:10, border:"none", cursor:"pointer",
                      color:active?"#fff":"rgba(255,255,255,.65)",
                      marginBottom:2, textAlign:"left",
                      background:active?"rgba(255,255,255,.18)":"transparent",
                      fontFamily:"inherit", position:"relative", transition:"all .15s",
                      fontWeight:active?600:400 }}
                    className={active?"":"nav-btn"}>
                    <span style={{ display:"flex", opacity:active?1:.65, flexShrink:0 }}><n.Icon size={16}/></span>
                    {!collapsed && <span style={{ fontSize:12, flex:1 }}>{n.label}</span>}
                    {badge > 0 && (
                      <span style={{ background:C.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800,
                        minWidth:16, height:16, display:"flex", alignItems:"center", justifyContent:"center",
                        padding:"0 4px", position:collapsed?"absolute":"static",
                        top:collapsed?4:"auto", right:collapsed?4:"auto" }}>{badge}</span>
                    )}
                    {active && !collapsed && (
                      <span style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)",
                        width:3, height:16, background:"#fff", borderRadius:99 }}/>
                    )}
                  </button>
                  {collapsed && <div className="nav-tooltip">{n.label}</div>}
                </div>
              );
            })}
          </nav>

          <div style={{ padding:"8px 8px 12px", flexShrink:0 }}>
            <div style={{ height:1, background:"rgba(255,255,255,.10)", margin:"4px 12px 8px" }}/>
            {!collapsed && (
              <div style={{ display:"flex", alignItems:"center", gap:9, padding:"6px 6px 8px" }}>
                <div style={{ width:30, height:30, borderRadius:"50%", background:"rgba(255,255,255,.20)",
                  color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:800, fontSize:11, flexShrink:0 }}>
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#fff",
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {user?.full_name||`${user?.first_name||""} ${user?.last_name||""}`}
                  </div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,.50)" }}>Technicien</div>
                </div>
              </div>
            )}
            <button onClick={handleLogout}
              style={{ display:"flex", alignItems:"center", gap:8, width:"100%",
                padding:"8px 10px", borderRadius:10, border:"none", cursor:"pointer",
                background:"rgba(192,24,42,.18)", color:"rgba(255,180,180,.9)",
                fontSize:11, fontFamily:"inherit", transition:"all .15s",
                justifyContent:collapsed?"center":"flex-start" }}
              className="logout-btn">
              <LogOut size={15}/>{!collapsed && <span>Déconnexion</span>}
            </button>
          </div>
        </aside>
      </div>

      {/* ZONE PRINCIPALE */}
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:"10px", overflow:"hidden" }}>

        <header style={{ background:"#fff", borderRadius:14, padding:"12px 20px",
          flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,.06)", overflow:"hidden" }}>
          <div className="topbar-inner">
            <div>
              <h1 style={{ fontSize:22, fontWeight:760, color:C.text, letterSpacing:"-.4px", margin:0 }}>
                {NAV.find(n=>n.id===tab)?.label??"Tableau de bord"}
              </h1>
              <p style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
                {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
              </p>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              {ticketsCritiques.length > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:8,
                  background:C.redLight, border:`1px solid ${C.red}30`, borderRadius:8, padding:"8px 14px" }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:C.red,
                    animation:"pulse 1.5s ease infinite", display:"inline-block" }}/>
                  <span style={{ fontSize:12, fontWeight:700, color:C.red }}>
                    {ticketsCritiques.length} critique{ticketsCritiques.length>1?"s":""}
                  </span>
                </div>
              )}
              <div style={{ position:"relative" }}>
                <button style={{ width:34, height:34, borderRadius:8, border:`1px solid ${C.border}`,
                  background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", color:C.textMid }} className="icon-btn"
                  onClick={() => setTab("notifications")}>
                  <Bell size={17}/>
                </button>
                {unreadNotifs > 0 && (
                  <span style={{ position:"absolute", top:-5, right:-5, background:C.red, color:"#fff",
                    borderRadius:99, fontSize:9, fontWeight:800, width:16, height:16,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>{unreadNotifs}</span>
                )}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background:C.green, color:"#fff",
                  display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12 }}>
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>
                    {user?.full_name||`${user?.first_name||""} ${user?.last_name||""}`}
                  </div>
                  <div style={{ fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px" }}>
                    Technicien
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", minHeight:0 }}>
          <div style={{ padding:"0 0 20px 0", display:"flex", flexDirection:"column", gap:16 }}>

            {/* DASHBOARD */}
            {tab === "dashboard" && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                <div style={{ background:C.greenLight, border:`1px solid ${C.green}30`,
                  borderRadius:10, padding:"12px 16px", fontSize:12, color:C.green,
                  display:"flex", alignItems:"center", gap:8 }}>
                  <Info size={13} style={{ flexShrink:0 }}/>
                  <span>
                    <b>Votre rôle :</b> Signalement → <b>Vous allez sur place + envoyez le constat</b> → Gestionnaire clôture
                  </span>
                </div>

                <div className="stat-grid">
                  {[
                    { Icon:MapPin,        label:"À rejoindre",       val:stats.aRejoindre,    color:C.orange },
                    { Icon:ClipboardList, label:"Constat à envoyer", val:stats.surPlace,      color:C.orange },
                    { Icon:Clock,         label:"En attente clôture",val:stats.constatEnvoye, color:C.green  },
                    { Icon:CheckCircle,   label:"Clôturés",          val:stats.clotures,      color:C.green  },
                  ].map((k,i) => (
                    <div key={i} onClick={() => setTab("tickets")}
                      style={{ background:C.white, borderRadius:10, padding:"14px 12px",
                        borderTop:`3px solid ${k.color}`, boxShadow:"0 1px 3px rgba(0,0,0,.05)",
                        cursor:"pointer", textAlign:"center", transition:"transform .15s" }}>
                      <k.Icon size={20} color={k.color} style={{ marginBottom:6 }}/>
                      <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.val}</div>
                      <div style={{ fontSize:9, color:C.textLight, textTransform:"uppercase",
                        letterSpacing:".8px", marginTop:3, lineHeight:1.3 }}>{k.label}</div>
                    </div>
                  ))}
                </div>

                {/* Prochaine action */}
                {nextTicket && (() => {
                  const isWaiting = CONSTAT_DONE.includes(nextTicket.status);
                  const color     = isWaiting ? C.green : C.orange;
                  return (
                    <div style={{ background:C.white, border:`1.5px solid ${color}30`,
                      borderLeft:`4px solid ${color}`, borderRadius:12, padding:"16px 20px" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:C.textLight,
                        textTransform:"uppercase", letterSpacing:"1px", marginBottom:8,
                        display:"flex", alignItems:"center", gap:6 }}>
                        <Target size={13}/> Action attendue maintenant
                      </div>
                      <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:4,
                        display:"flex", alignItems:"center", gap:8 }}>
                        {isWaiting
                          ? <><Clock size={16} color={C.green}/> En attente de clôture par le gestionnaire</>
                          : <><ClipboardList size={16} color={C.orange}/> Envoyer le constat d'intervention</>}
                      </div>
                      <div style={{ fontSize:12, color:C.textMid, marginBottom:12,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {nextTicket.vehicle_name} · {nextTicket.title}
                        {nextTicket.location && ` · ${nextTicket.location}`}
                      </div>
                      {!isWaiting && (
                        <button onClick={() => handleTicketAction(nextTicket)} className="action-btn"
                          style={{ padding:"9px 18px", background:color, color:"#fff",
                            border:"none", borderRadius:8, fontSize:12, fontWeight:700,
                            cursor:"pointer", fontFamily:"inherit",
                            display:"flex", alignItems:"center", gap:6,
                            boxShadow:`0 3px 12px ${color}40` }}>
                          <ClipboardList size={14}/> Ouvrir le constat
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Critiques */}
                {ticketsCritiques.length > 0 && (
                  <div style={{ background:C.redLight, border:`1.5px solid ${C.red}30`,
                    borderRadius:12, padding:"16px 20px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.red, marginBottom:12,
                      display:"flex", alignItems:"center", gap:8 }}>
                      <Flame size={16}/> Interventions critiques
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {ticketsCritiques.slice(0,3).map((t,i) => (
                        <TicketCard key={i} ticket={t}
                          onConstat={handleTicketAction}
                          expanded={expandedId===t.id}
                          onExpandToggle={() => setExpandedId(expandedId===t.id?null:t.id)}/>
                      ))}
                    </div>
                  </div>
                )}

                {maintsEnCours.length > 0 && (
                  <div style={{ background:C.white, borderRadius:12, padding:"16px 20px",
                    boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:12,
                      display:"flex", alignItems:"center", gap:8 }}>
                      <Wrench size={15} color={C.green}/> Maintenances en cours
                    </div>
                    {maintsEnCours.map((m,i) => (
                      <MaintenanceCard key={i} maint={m} onClose={() => setModalMaint(m)}/>
                    ))}
                  </div>
                )}

                {maintsPlanifies.length > 0 && (
                  <div style={{ background:C.white, borderRadius:12, padding:"16px 20px",
                    boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:12,
                      display:"flex", alignItems:"center", gap:8 }}>
                      <Calendar size={15} color={C.green}/> Prochaines maintenances
                    </div>
                    {maintsPlanifies.slice(0,5).map((m,i) => (
                      <MaintenanceCard key={i} maint={m} onStart={() => handleStartMaint(m)}/>
                    ))}
                  </div>
                )}

                {ticketsActifs.length===0 && maintenances.filter(m=>m.status!=="TERMINE").length===0 && (
                  <div style={{ background:C.white, borderRadius:12, padding:"60px 20px",
                    textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
                    <CheckCircle size={48} color={C.green} style={{ marginBottom:12 }}/>
                    <div style={{ fontSize:16, fontWeight:700, color:C.text }}>Aucune intervention en cours</div>
                    <div style={{ fontSize:13, color:C.textLight, marginTop:6 }}>Tout est traité. Bon travail !</div>
                  </div>
                )}
              </div>
            )}

            {/* TICKETS */}
            {tab === "tickets" && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ background:C.greenLight, border:`1px solid ${C.green}30`,
                  borderRadius:10, padding:"10px 14px", fontSize:12, color:C.green,
                  display:"flex", alignItems:"center", gap:8 }}>
                  <Info size={13} style={{ flexShrink:0 }}/>
                  <span><b>Workflow :</b> 1 Signalement → <b>2 Vous allez sur place + envoyez un constat</b> → 3 Gestionnaire clôture</span>
                </div>

                <div style={{ fontSize:12, color:C.textLight }}>
                  {ticketsActifs.length} ticket{ticketsActifs.length>1?"s":""} actif{ticketsActifs.length>1?"s":""}
                </div>

                {["CRITIQUE","HAUTE","MOYENNE","BASSE"].map(sev => {
                  const group = tickets.filter(t => t.severity===sev && TECH_OPEN(t.status));
                  if (group.length===0) return null;
                  const cfg = SEVERITY_CFG[sev];
                  return (
                    <div key={sev}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                        <span style={{ width:10, height:10, borderRadius:"50%", background:cfg.dot, display:"inline-block" }}/>
                        <span style={{ fontSize:11, fontWeight:700, color:cfg.color,
                          textTransform:"uppercase", letterSpacing:"1px" }}>
                          {cfg.label} — {group.length} ticket{group.length>1?"s":""}
                        </span>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                        {group.map((t,i) => (
                          <TicketCard key={i} ticket={t}
                            onConstat={handleTicketAction}
                            expanded={expandedId===t.id}
                            onExpandToggle={() => setExpandedId(expandedId===t.id?null:t.id)}/>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {ticketsResolus.length > 0 && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:C.textLight,
                      textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>
                      Clôturés récemment — {ticketsResolus.length}
                    </div>
                    {ticketsResolus.slice(0,5).map((t,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
                        padding:"10px 14px", background:C.white, borderRadius:10,
                        marginBottom:8, opacity:.7, boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
                        <CheckCircle size={18} color={C.green}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:C.text,
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {t.title}
                          </div>
                          <div style={{ fontSize:11, color:C.textLight }}>
                            {t.vehicle_name} · {fmtDate(t.resolved_date)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {tickets.length===0 && (
                  <div style={{ background:C.white, borderRadius:12, padding:"60px 20px",
                    textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
                    <CheckCircle size={48} color={C.green} style={{ marginBottom:12 }}/>
                    <div style={{ fontSize:15, fontWeight:700, color:C.text }}>Aucun ticket assigné</div>
                  </div>
                )}
              </div>
            )}

            {/* MAINTENANCES */}
            {tab === "maintenance" && (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div className="maint-grid">
                  {[
                    { label:"En cours",   val:maintsEnCours.length,  color:C.amber, Icon:Wrench      },
                    { label:"Planifiées", val:maintsPlanifies.length, color:C.green, Icon:Calendar    },
                    { label:"Terminées",  val:maintsTermines.length,  color:C.green, Icon:CheckCircle },
                  ].map((k,i) => (
                    <div key={i} style={{ background:C.white, borderRadius:10, padding:"14px 16px",
                      textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)", borderTop:`3px solid ${k.color}` }}>
                      <k.Icon size={20} color={k.color} style={{ marginBottom:6 }}/>
                      <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.val}</div>
                      <div style={{ fontSize:10, color:C.textLight, textTransform:"uppercase",
                        letterSpacing:"1px", marginTop:4 }}>{k.label}</div>
                    </div>
                  ))}
                </div>
                {maintenances.length===0 ? (
                  <div style={{ background:C.white, borderRadius:12, padding:"60px 20px",
                    textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
                    <Calendar size={48} color={C.textLight} style={{ marginBottom:12 }}/>
                    <div style={{ fontSize:15, fontWeight:700, color:C.text }}>Aucune maintenance planifiée</div>
                  </div>
                ) : (
                  <div style={{ background:C.white, borderRadius:12, padding:"16px 20px",
                    boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14 }}>
                      Toutes mes interventions
                    </div>
                    {maintenances.map((m,i) => (
                      <MaintenanceCard key={i} maint={m}
                        onStart={() => handleStartMaint(m)}
                        onClose={() => setModalMaint(m)}/>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NOTIFICATIONS */}
            {tab === "notifications" && (
              <div style={{ background:C.white, borderRadius:12, padding:"16px 20px",
                boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text }}>Notifications</div>
                    <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
                      {unreadNotifs} non lue{unreadNotifs>1?"s":""}
                    </div>
                  </div>
                  {unreadNotifs > 0 && (
                    <button onClick={() => setNotifications(prev=>prev.map(n=>({...n,status:"LU"})))}
                      style={{ fontSize:11, color:C.green, fontWeight:600, background:"none",
                        border:"none", cursor:"pointer", textDecoration:"underline", fontFamily:"inherit" }}>
                      Tout marquer lu
                    </button>
                  )}
                </div>
                {notifications.length===0 ? (
                  <div style={{ textAlign:"center", padding:"40px 0", color:C.textLight }}>
                    <Bell size={32} style={{ marginBottom:8 }}/>
                    <div style={{ fontSize:13 }}>Aucune notification</div>
                  </div>
                ) : (
                  notifications.map((n,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10,
                      padding:"10px 12px", marginBottom:4, borderRadius:8,
                      background:n.status==="NON_LU"?C.greenLight:"transparent" }}>
                      <span style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, marginTop:5,
                        background:n.type==="SUCCESS"?C.green:n.type==="WARNING"?C.amber:n.type==="ERROR"?C.red:C.orange }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:n.status==="NON_LU"?700:500, color:C.text }}>{n.title}</div>
                        <div style={{ fontSize:11, color:C.textMid, marginTop:2 }}>{n.message}</div>
                        <div style={{ fontSize:10, color:C.textLight, marginTop:4 }}>{fmtDT(n.created_at)}</div>
                      </div>
                      {n.status==="NON_LU" && (
                        <button onClick={() => markNotifRead(n.id)}
                          style={{ fontSize:11, color:C.green, fontWeight:600, background:"none",
                            border:"none", cursor:"pointer", textDecoration:"underline",
                            fontFamily:"inherit", whiteSpace:"nowrap" }}>
                          Marquer lu
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}