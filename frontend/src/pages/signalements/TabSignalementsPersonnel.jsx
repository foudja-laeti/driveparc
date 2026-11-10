
// ─── pages/signalements/TabSignalementsPersonnel.jsx ─────────────────────────
// Signalements personnel — Charte vert/rouge/orange · Lucide React
// Police : Inter (Google Fonts)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import {
  AlertCircle, AlertTriangle, CheckCircle2, Clock, Wrench,
  Car, Camera, MapPin, Info, ChevronRight,
  FileText, Folder, Plus, Send, RotateCcw,
  Zap, Shield, Eye, Lightbulb, User,
  BarChart2, XCircle, ArrowRight, Inbox,
  RefreshCw, Loader2,
} from "lucide-react";

const API_BASE = "http://localhost:8000/api/v1";

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
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || json?.message || `Erreur ${res.status}`);
  return json?.data ?? json;
}

// ── Palette vert / rouge / orange ─────────────────────────────────────────────
const C = {
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

// ── Formatage dates ────────────────────────────────────────────────────────────
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
  : "—";
const fmtDateShort = (d) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })
  : "—";

// ── Types de pannes ────────────────────────────────────────────────────────────
const TYPES_PANNE = [
  { val:"PANNE_MOTEUR",       label:"Panne moteur",                     Icon:Wrench,       grave:true  },
  { val:"ACCIDENT_COLLISION", label:"Accident / Collision",             Icon:AlertCircle,  grave:true  },
  { val:"PERTE_FREINS",       label:"Problème de freinage",             Icon:AlertTriangle,grave:true  },
  { val:"CREVAISON",          label:"Crevaison",                        Icon:Car,          grave:false },
  { val:"RETRO_CASSE",        label:"Rétroviseur cassé",                Icon:Eye,          grave:false },
  { val:"VITRE_CASSEE",       label:"Vitre brisée",                     Icon:Shield,       grave:false },
  { val:"ECLAIRAGE_DEFAUT",   label:"Problème d'éclairage",             Icon:Lightbulb,    grave:false },
  { val:"CARROSSERIE",        label:"Dommage carrosserie",              Icon:Car,          grave:false },
  { val:"CLIMATISATION",      label:"Climatisation défaillante",        Icon:Zap,          grave:false },
  { val:"BATTERIE",           label:"Problème de batterie / démarrage", Icon:Zap,          grave:false },
  { val:"AUTRE",              label:"Autre problème",                   Icon:Wrench,       grave:false },
];

// ── Niveaux d'urgence ──────────────────────────────────────────────────────────
const NIVEAUX_URGENCE = [
  { val:"CRITIQUE", label:"Critique",  desc:"Véhicule immobilisé — assistance immédiate", color:C.red,   bg:C.redLight,   border:C.redBorder,   Icon:AlertCircle  },
  { val:"HAUTE",    label:"Urgente",   desc:"À traiter dans les 24h",                      color:C.red,   bg:C.redLight,   border:C.redBorder,   Icon:AlertTriangle },
  { val:"MOYENNE",  label:"Normale",   desc:"Peut attendre la fin de la semaine",           color:C.amber, bg:C.amberLight, border:C.amberBorder, Icon:Clock         },
  { val:"BASSE",    label:"Faible",    desc:"Signalement informatif",                       color:C.green, bg:C.greenLight, border:C.greenBorder, Icon:Info          },
];

// ── Statuts ────────────────────────────────────────────────────────────────────
const STATUT_CFG = {
  SIGNALE:       { label:"En attente",     color:C.amber, bg:C.amberLight, Icon:Clock        },
  EN_ATTENTE:    { label:"En attente",     color:C.amber, bg:C.amberLight, Icon:Clock        },
  EN_DIAGNOSTIC: { label:"Pris en charge", color:C.green, bg:C.greenLight, Icon:Eye          },
  EN_REPARATION: { label:"En réparation",  color:C.amber, bg:C.amberLight, Icon:Wrench       },
  REPARE:        { label:"Résolu",         color:C.green, bg:C.greenLight, Icon:CheckCircle2 },
  NON_REPARABLE: { label:"Non réparable",  color:C.red,   bg:C.redLight,   Icon:XCircle      },
};

// ── CSS global ─────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  @keyframes sig-spin   { to { transform:rotate(360deg); } }
  @keyframes sig-fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sig-toast  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .sig-fade { animation:sig-fadeIn .22s ease; }
  .sig-card { background:#fff; border-radius:11px; border:1.5px solid ${C.border}; }
`;

// ── Styles de base ─────────────────────────────────────────────────────────────
const inp = {
  padding: "9px 12px",
  border: `1.5px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "'Inter', system-ui, sans-serif",
  color: C.text,
  background: C.white,
  width: "100%",
  outline: "none",
  transition: "border-color .15s",
  colorScheme: "light",
};
const lbl = {
  fontSize: 10, fontWeight: 700, color: C.textLight,
  textTransform: "uppercase", letterSpacing: "1px",
  marginBottom: 6, display: "flex", alignItems: "center", gap: 5,
};
const font = { fontFamily: "'Inter', system-ui, sans-serif" };

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    if (msg) { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }
  }, [msg]);
  if (!msg) return null;
  const isErr = type === "error";
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:9999,
      background: isErr ? C.red : C.green,
      color:"#fff", borderRadius:11, padding:"12px 18px",
      fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:10,
      boxShadow:"0 8px 28px rgba(0,0,0,.2)", maxWidth:400,
      animation:"sig-toast .25s ease", ...font,
    }}>
      {isErr ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>}
      <span style={{ flex:1 }}>{msg}</span>
      <button onClick={onDone} style={{ background:"none", border:"none", color:"rgba(255,255,255,.7)", cursor:"pointer", display:"flex" }}>
        <XCircle size={16}/>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function TabSignalementsPersonnel({ isDirecteur, vehicule }) {
  const [signalements, setSignalements] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeView,   setActiveView]   = useState("nouveau");
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [toast,        setToast]        = useState({ msg:"", type:"success" });
  const fileRef = useRef();

  const [form, setForm] = useState({
    type_incident: "", urgence: "", description: "", localisation: "", immobilise: false,
  });
  const [photo, setPhoto] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const showToast = (msg, type="success") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sig = await apiFetch("/maintenance/breakdowns/?reported_by=me").catch(() => []);
      setSignalements(Array.isArray(sig) ? sig : sig?.results ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const typeSelectionne = TYPES_PANNE.find(t => t.val === form.type_incident);

  const handleSubmit = async () => {
    if (!form.type_incident)      { showToast("Sélectionnez le type de panne", "error"); return; }
    if (!form.urgence)             { showToast("Indiquez le niveau d'urgence", "error"); return; }
    if (!form.description.trim()) { showToast("Décrivez le problème", "error"); return; }
    if (!vehicule?.id)             { showToast("Aucun véhicule assigné", "error"); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title",       typeSelectionne?.label || form.type_incident);
      fd.append("vehicle",     vehicule.id);
      fd.append("description", form.description);
      fd.append("location",    form.localisation || "Non précisé");
      fd.append("severity",    form.urgence);
      fd.append("notes",       `Véhicule immobilisé: ${form.immobilise?"Oui":"Non"}. Signalé par directeur.`);
      if (photo) fd.append("photo", photo);
      await apiFetch("/maintenance/breakdowns/", { method:"POST", body:fd });
      setSubmitted(true);
      showToast(form.urgence==="CRITIQUE"
        ? "Signalement d'urgence envoyé — le gestionnaire est alerté !"
        : "Panne signalée avec succès — le gestionnaire va traiter votre demande");
      load();
    } catch (e) {
      showToast("Erreur : " + e.message, "error");
    } finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setForm({ type_incident:"", urgence:"", description:"", localisation:"", immobilise:false });
    setPhoto(null);
    setSubmitted(false);
  };

  // ── Chef de département — pas de véhicule ────────────────────────────────────
  if (!isDirecteur) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14, ...font }}>
        <style>{GLOBAL_CSS}</style>
        <div className="sig-card" style={{ padding:"44px 32px", textAlign:"center" }}>
          <div style={{ width:64, height:64, borderRadius:16, background:C.amberLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <Car size={30} color={C.amber}/>
          </div>
          <div style={{ fontSize:17, fontWeight:800, color:C.text, marginBottom:7 }}>Aucun véhicule assigné</div>
          <div style={{ fontSize:13, color:C.textLight, maxWidth:400, margin:"0 auto 22px", lineHeight:1.7 }}>
            En tant que chef de département, vous n'avez pas de véhicule de fonction assigné.
            Les signalements concernent uniquement les véhicules personnellement assignés.
          </div>
          <div style={{ background:C.amberLight, border:`1px solid ${C.amberBorder}`, borderRadius:9, padding:"12px 18px", display:"inline-flex", alignItems:"center", gap:9, fontSize:12, color:C.amber, fontWeight:600 }}>
            <Info size={15}/>
            Pour signaler un problème sur un véhicule du parc, contactez directement le gestionnaire.
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[
            { Icon:User,     title:"Contacter le gestionnaire",    text:"Pour tout incident lors d'une mission, contactez directement le gestionnaire du parc automobile." },
            { Icon:FileText, title:"Faire une demande de véhicule",text:"Réservez un véhicule avec chauffeur depuis l'onglet \"Mes demandes\" pour vos déplacements professionnels." },
          ].map((card, i) => (
            <div key={i} className="sig-card" style={{ padding:"20px" }}>
              <div style={{ width:38, height:38, borderRadius:9, background:C.greenLight, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                <card.Icon size={18} color={C.green}/>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:6 }}>{card.title}</div>
              <div style={{ fontSize:12, color:C.textLight, lineHeight:1.6 }}>{card.text}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Directeur sans véhicule ──────────────────────────────────────────────────
  if (!vehicule) {
    return (
      <div style={{ ...font }}>
        <style>{GLOBAL_CSS}</style>
        <div className="sig-card" style={{ padding:"44px 32px", textAlign:"center" }}>
          <div style={{ width:64, height:64, borderRadius:16, background:C.amberLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <Clock size={30} color={C.amber}/>
          </div>
          <div style={{ fontSize:17, fontWeight:800, color:C.text, marginBottom:7 }}>Aucun véhicule de fonction assigné</div>
          <div style={{ fontSize:13, color:C.textLight, maxWidth:360, margin:"0 auto", lineHeight:1.7 }}>
            Le gestionnaire du parc vous assignera prochainement votre véhicule de fonction.
            Vous pourrez ensuite signaler des pannes depuis cet espace.
          </div>
        </div>
      </div>
    );
  }

  // ── Directeur avec véhicule ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 0", gap:10, ...font }}>
      <style>{GLOBAL_CSS}</style>
      <Loader2 size={22} color={C.green} style={{ animation:"sig-spin .8s linear infinite" }}/>
      <span style={{ fontSize:13, color:C.textLight }}>Chargement…</span>
    </div>
  );

  const pending = signalements.filter(s => ["SIGNALE","EN_ATTENTE","EN_DIAGNOSTIC","EN_REPARATION"].includes(s.status)).length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, ...font }}>
      <style>{GLOBAL_CSS}</style>
      <Toast msg={toast.msg} type={toast.type} onDone={() => setToast({ msg:"" })}/>

      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, color:C.text, margin:0, display:"flex", alignItems:"center", gap:8 }}>
            <Wrench size={18} color={C.green}/> Signalement de Panne
          </h2>
          <p style={{ fontSize:12, color:C.textLight, margin:"4px 0 0" }}>Signalez un problème sur votre véhicule de fonction</p>
        </div>
        {/* Badge véhicule */}
        <div style={{ background:C.greenLight, border:`1px solid ${C.greenBorder}`, borderRadius:9, padding:"8px 14px", display:"flex", alignItems:"center", gap:10 }}>
          <Car size={16} color={C.green}/>
          <div>
            <div style={{ fontSize:10, color:C.textLight, fontWeight:600, textTransform:"uppercase", letterSpacing:"1px" }}>Votre véhicule</div>
            <div style={{ fontSize:13, fontWeight:800, color:C.green }}>
              {vehicule.registration_number || vehicule.license_plate} · {vehicule.make} {vehicule.model}
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:7, background:C.bg, padding:4, borderRadius:10, border:`1px solid ${C.border}`, width:"fit-content" }}>
        {[
          { id:"nouveau",    label:"Signaler une panne", Icon:Plus   },
          { id:"historique", label:"Mes signalements",   Icon:Folder, badge:pending },
        ].map(t => (
          <button key={t.id} onClick={() => { setActiveView(t.id); setSubmitted(false); }}
            style={{
              padding:"7px 16px", borderRadius:7, fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit", border:"none", transition:"all .13s",
              background: activeView===t.id ? C.green : "transparent",
              color:       activeView===t.id ? "#fff" : C.textLight,
              boxShadow:   activeView===t.id ? "0 2px 8px rgba(27,94,55,.2)" : "none",
              display:"flex", alignItems:"center", gap:6,
            }}>
            <t.Icon size={13}/> {t.label}
            {t.badge > 0 && (
              <span style={{ background:C.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, minWidth:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════ NOUVEAU SIGNALEMENT ════ */}
      {activeView === "nouveau" && (
        <>
          {submitted ? (
            /* ── Confirmation ── */
            <div className="sig-card sig-fade" style={{
              padding:"44px 28px", textAlign:"center",
              background: form.urgence==="CRITIQUE" ? C.redLight : C.greenLight,
              borderColor: form.urgence==="CRITIQUE" ? C.redBorder : C.greenBorder,
            }}>
              <div style={{ width:60, height:60, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", boxShadow:"0 4px 16px rgba(0,0,0,.1)" }}>
                {form.urgence==="CRITIQUE"
                  ? <AlertCircle size={28} color={C.red}/>
                  : <CheckCircle2 size={28} color={C.green}/>}
              </div>
              <div style={{ fontSize:17, fontWeight:800, color:form.urgence==="CRITIQUE"?C.red:C.green, marginBottom:8 }}>
                {form.urgence==="CRITIQUE" ? "Signalement d'urgence envoyé !" : "Panne signalée avec succès"}
              </div>
              <div style={{ fontSize:13, color:C.textMid, maxWidth:420, margin:"0 auto 26px", lineHeight:1.7 }}>
                {form.urgence==="CRITIQUE"
                  ? "Le gestionnaire du parc a été alerté immédiatement. Une assistance vous sera envoyée dans les plus brefs délais."
                  : "Votre signalement a été transmis au gestionnaire. Il sera planifié et traité par l'équipe technique."}
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
                <button onClick={resetForm}
                  style={{ padding:"10px 22px", background:form.urgence==="CRITIQUE"?C.red:C.green, color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
                  <Plus size={14}/> Nouveau signalement
                </button>
                <button onClick={() => setActiveView("historique")}
                  style={{ padding:"10px 18px", background:"transparent", color:C.textMid, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
                  <Folder size={14}/> Voir mes signalements
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:14, alignItems:"start" }}>

              {/* ── Formulaire ── */}
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

                {/* Alerte urgence */}
                <div style={{ background:C.redLight, border:`1px solid ${C.redBorder}`, borderRadius:9, padding:"11px 14px", display:"flex", gap:10, alignItems:"flex-start" }}>
                  <AlertCircle size={15} color={C.red} style={{ flexShrink:0, marginTop:1 }}/>
                  <div style={{ fontSize:12, color:C.red, lineHeight:1.6 }}>
                    <b>En cas d'urgence critique</b> (accident, perte de freinage) : garez le véhicule en sécurité et contactez immédiatement le gestionnaire par téléphone.
                  </div>
                </div>

                {/* ÉTAPE 1 — Type de panne */}
                <div className="sig-card" style={{ padding:"18px 20px" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:3 }}>1. Nature du problème</div>
                  <div style={{ fontSize:11, color:C.textLight, marginBottom:14 }}>Sélectionnez ce qui correspond le mieux à votre situation</div>

                  {/* Pannes graves */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.red, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:C.red, display:"inline-block" }}/>
                      Pannes graves — immobilisation possible
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                      {TYPES_PANNE.filter(t => t.grave).map(t => {
                        const sel = form.type_incident === t.val;
                        return (
                          <button key={t.val} type="button" onClick={() => { set("type_incident", t.val); set("urgence","CRITIQUE"); }}
                            style={{ padding:"10px 13px", borderRadius:9, cursor:"pointer", fontFamily:"inherit",
                              textAlign:"left", display:"flex", alignItems:"center", gap:10, transition:"all .1s",
                              border:`1.5px solid ${sel?C.red:C.border}`,
                              background: sel ? C.redLight : C.bg,
                            }}>
                            <t.Icon size={17} color={sel?C.red:C.textLight} style={{ flexShrink:0 }}/>
                            <span style={{ fontSize:12, fontWeight:600, color:sel?C.red:C.text, lineHeight:1.4 }}>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pannes simples */}
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.amber, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:C.amber, display:"inline-block" }}/>
                      Problèmes mineurs — peut continuer à rouler
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                      {TYPES_PANNE.filter(t => !t.grave).map(t => {
                        const sel = form.type_incident === t.val;
                        return (
                          <button key={t.val} type="button" onClick={() => set("type_incident", t.val)}
                            style={{ padding:"10px 13px", borderRadius:9, cursor:"pointer", fontFamily:"inherit",
                              textAlign:"left", display:"flex", alignItems:"center", gap:10, transition:"all .1s",
                              border:`1.5px solid ${sel?C.amber:C.border}`,
                              background: sel ? C.amberLight : C.bg,
                            }}>
                            <t.Icon size={16} color={sel?C.amber:C.textXLight} style={{ flexShrink:0 }}/>
                            <span style={{ fontSize:12, fontWeight:600, color:sel?C.amber:C.text, lineHeight:1.4 }}>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ÉTAPE 2 — Niveau d'urgence */}
                {form.type_incident && (
                  <div className="sig-card sig-fade" style={{ padding:"18px 20px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:3 }}>2. Niveau d'urgence</div>
                    <div style={{ fontSize:11, color:C.textLight, marginBottom:14 }}>
                      {typeSelectionne?.grave ? "Pour une panne grave, l'urgence critique est recommandée" : "Évaluez la criticité du problème"}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                      {NIVEAUX_URGENCE.map(n => {
                        const sel = form.urgence === n.val;
                        return (
                          <button key={n.val} type="button" onClick={() => set("urgence", n.val)}
                            style={{ padding:"11px 14px", borderRadius:9, cursor:"pointer", fontFamily:"inherit",
                              textAlign:"left", display:"flex", alignItems:"center", gap:12, transition:"all .1s",
                              border:`1.5px solid ${sel?n.border:C.border}`,
                              background: sel ? n.bg : C.bg,
                            }}>
                            <n.Icon size={16} color={sel?n.color:C.textXLight} style={{ flexShrink:0 }}/>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:13, fontWeight:700, color:sel?n.color:C.text }}>{n.label}</div>
                              <div style={{ fontSize:11, color:C.textLight, marginTop:1 }}>{n.desc}</div>
                            </div>
                            {sel && <CheckCircle2 size={15} color={n.color}/>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ÉTAPE 3 — Détails */}
                {form.type_incident && form.urgence && (
                  <div className="sig-card sig-fade" style={{ padding:"18px 20px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14 }}>3. Détails du problème</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:13 }}>

                      {/* Description */}
                      <div>
                        <label style={lbl}><FileText size={11} color={C.green}/> Description *</label>
                        <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={4}
                          placeholder="Décrivez précisément ce que vous observez : bruits, voyants allumés, comportement anormal…"
                          style={{ ...inp, resize:"vertical", height:100 }}/>
                      </div>

                      {/* Localisation */}
                      <div>
                        <label style={lbl}><MapPin size={11} color={C.green}/> Localisation</label>
                        <input style={inp} value={form.localisation} onChange={e => set("localisation", e.target.value)}
                          placeholder="Ex : Campus IUC, Parking Bonanjo, Autoroute A3…"/>
                      </div>

                      {/* Immobilisé */}
                      <div onClick={() => set("immobilise", !form.immobilise)}
                        style={{ background:form.immobilise?C.redLight:C.bg, border:`1.5px solid ${form.immobilise?C.redBorder:C.border}`, borderRadius:9, padding:"11px 14px", display:"flex", alignItems:"center", gap:12, cursor:"pointer", transition:"all .1s" }}>
                        <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${form.immobilise?C.red:C.border}`, background:form.immobilise?C.red:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .1s" }}>
                          {form.immobilise && <CheckCircle2 size={12} color="#fff"/>}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:form.immobilise?C.red:C.text }}>Le véhicule est immobilisé</div>
                          <div style={{ fontSize:11, color:C.textLight, marginTop:1 }}>Cochez si vous ne pouvez pas conduire — une assistance sera dépêchée</div>
                        </div>
                      </div>

                      {/* Photo */}
                      <div>
                        <label style={lbl}><Camera size={11} color={C.green}/> Photo du problème (recommandé)</label>
                        <div onClick={() => fileRef.current?.click()}
                          style={{ border:`2px dashed ${photo?C.green:C.border}`, borderRadius:9, padding:"15px", textAlign:"center", cursor:"pointer", background:photo?C.greenLight:C.bg, transition:"all .13s" }}>
                          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
                            onChange={e => setPhoto(e.target.files?.[0])}/>
                          {photo ? (
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                              <Camera size={16} color={C.green}/>
                              <span style={{ fontSize:13, fontWeight:700, color:C.green }}>{photo.name}</span>
                              <span style={{ fontSize:11, color:C.textXLight }}>({(photo.size/1024).toFixed(0)} Ko)</span>
                              <button onClick={e => { e.stopPropagation(); setPhoto(null); }}
                                style={{ fontSize:11, color:C.red, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:3 }}>
                                <XCircle size={13}/> Supprimer
                              </button>
                            </div>
                          ) : (
                            <>
                              <Camera size={24} color={C.textXLight} style={{ margin:"0 auto 7px" }}/>
                              <div style={{ fontSize:12, color:C.textMid }}>Prenez une photo du problème</div>
                              <div style={{ fontSize:11, color:C.textXLight, marginTop:2 }}>JPG, PNG — max 10 Mo</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bouton soumettre */}
                {form.type_incident && form.urgence && (
                  <button onClick={handleSubmit} disabled={submitting}
                    style={{ padding:"13px 22px", borderRadius:10, border:"none",
                      background: form.urgence==="CRITIQUE" ? C.red : C.green,
                      color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", gap:9, justifyContent:"center",
                      opacity:submitting?0.7:1, transition:"all .13s",
                    }}>
                    {submitting
                      ? <><Loader2 size={15} style={{ animation:"sig-spin .8s linear infinite" }}/> Envoi en cours…</>
                      : form.urgence==="CRITIQUE"
                        ? <><AlertCircle size={15}/> Envoyer le signalement d'urgence</>
                        : <><Send size={15}/> Soumettre le signalement</>
                    }
                  </button>
                )}
              </div>

              {/* ── Colonne droite ── */}
              <div style={{ display:"flex", flexDirection:"column", gap:11 }}>

                {/* Fiche véhicule */}
                <div className="sig-card" style={{ padding:"16px 18px" }}>
                  <div style={{ fontSize:12, fontWeight:800, color:C.text, marginBottom:12, display:"flex", alignItems:"center", gap:7 }}>
                    <Car size={14} color={C.green}/> Mon véhicule de fonction
                  </div>
                  {[
                    { label:"Immatriculation", val:vehicule.registration_number || vehicule.license_plate, bold:true, color:C.green },
                    { label:"Marque / Modèle", val:`${vehicule.make||vehicule.brand||""} ${vehicule.model||""}`.trim() },
                    { label:"Année",           val:vehicule.year || "—" },
                    { label:"Couleur",         val:vehicule.color || "—" },
                    { label:"Kilométrage",     val:vehicule.current_mileage ? `${Number(vehicule.current_mileage).toLocaleString("fr-FR")} km` : "—" },
                    { label:"Carburant",       val:vehicule.fuel_type || "—" },
                  ].map((f, i, arr) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none" }}>
                      <span style={{ fontSize:11, color:C.textXLight, fontWeight:500 }}>{f.label}</span>
                      <span style={{ fontSize:f.bold?13:12, fontWeight:f.bold?800:600, color:f.color||C.text }}>{f.val||"—"}</span>
                    </div>
                  ))}
                </div>

                {/* Conseils */}
                <div className="sig-card" style={{ padding:"16px 18px" }}>
                  <div style={{ fontSize:12, fontWeight:800, color:C.text, marginBottom:11, display:"flex", alignItems:"center", gap:7 }}>
                    <Lightbulb size={14} color={C.amber}/> Conseils
                  </div>
                  {[
                    "Garez le véhicule en sécurité si nécessaire",
                    "Notez les symptômes et bruits inhabituels",
                    "Prenez une photo du problème visible",
                    "Précisez votre localisation exacte",
                    "Suivez l'avancement depuis \"Mes signalements\"",
                  ].map((s, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:9, marginBottom:8 }}>
                      <div style={{ width:18, height:18, borderRadius:"50%", background:C.green, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, flexShrink:0, marginTop:1 }}>
                        {i+1}
                      </div>
                      <span style={{ fontSize:11, color:C.textMid, lineHeight:1.5 }}>{s}</span>
                    </div>
                  ))}
                </div>

                {/* Signalements récents */}
                {signalements.length > 0 && (
                  <div className="sig-card" style={{ padding:"16px 18px" }}>
                    <div style={{ fontSize:12, fontWeight:800, color:C.text, marginBottom:11, display:"flex", alignItems:"center", gap:7 }}>
                      <Clock size={14} color={C.green}/> Récents
                    </div>
                    {signalements.slice(0,3).map((s, i, arr) => {
                      const st = STATUT_CFG[s.status] || STATUT_CFG.SIGNALE;
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 0", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none" }}>
                          <st.Icon size={13} color={st.color} style={{ flexShrink:0 }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                              {s.title || "Panne"}
                            </div>
                            <div style={{ fontSize:10, color:C.textXLight }}>{fmtDateShort(s.reported_date||s.created_at)}</div>
                          </div>
                          <span style={{ fontSize:9, fontWeight:700, color:st.color, background:st.bg, padding:"2px 8px", borderRadius:99, whiteSpace:"nowrap" }}>
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ════ HISTORIQUE ════ */}
      {activeView === "historique" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* KPIs */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {[
              { label:"Total",      val:signalements.length,                                                                              Icon:FileText,    color:C.green },
              { label:"En attente", val:signalements.filter(s=>["SIGNALE","EN_ATTENTE"].includes(s.status)).length,                      Icon:Clock,       color:C.amber },
              { label:"En cours",   val:signalements.filter(s=>["EN_DIAGNOSTIC","EN_REPARATION"].includes(s.status)).length,             Icon:Wrench,      color:C.amber },
              { label:"Résolus",    val:signalements.filter(s=>s.status==="REPARE").length,                                              Icon:CheckCircle2,color:C.green },
            ].map((k,i) => (
              <div key={i} style={{ background:C.white, borderRadius:10, padding:"13px 15px", textAlign:"center", border:`1.5px solid ${C.border}`, borderTop:`3px solid ${k.color}` }}>
                <k.Icon size={18} color={k.color} style={{ margin:"0 auto 5px" }}/>
                <div style={{ fontSize:20, fontWeight:800, color:k.color }}>{k.val}</div>
                <div style={{ fontSize:10, color:C.textXLight, textTransform:"uppercase", letterSpacing:"1px", marginTop:3 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Liste */}
          <div className="sig-card" style={{ padding:"16px 18px" }}>
            <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14, display:"flex", alignItems:"center", gap:7 }}>
              <Folder size={14} color={C.green}/> Tous mes signalements
            </div>
            {signalements.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:C.textLight }}>
                <Inbox size={36} color={C.border} style={{ margin:"0 auto 10px" }}/>
                <div style={{ fontSize:13 }}>Aucun signalement enregistré</div>
              </div>
            ) : signalements.map((s, i, arr) => {
              const st = STATUT_CFG[s.status] || STATUT_CFG.SIGNALE;
              const isUrgent = s.severity === "CRITIQUE";
              return (
                <div key={i} className="sig-fade" style={{ padding:"13px 0", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    <div style={{ width:42, height:42, borderRadius:10, flexShrink:0, background:isUrgent?C.redLight:C.amberLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {isUrgent ? <AlertCircle size={20} color={C.red}/> : <Wrench size={20} color={C.amber}/>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{s.title || "Panne signalée"}</div>
                          <div style={{ fontSize:11, color:C.textXLight, marginTop:1, display:"flex", alignItems:"center", gap:7 }}>
                            <Clock size={10}/>
                            {fmtDate(s.reported_date||s.created_at)}
                            {s.location && <><MapPin size={10}/>{s.location}</>}
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                          {isUrgent && (
                            <span style={{ padding:"2px 9px", borderRadius:99, fontSize:9, fontWeight:800, background:C.redLight, color:C.red, border:`1px solid ${C.redBorder}`, display:"flex", alignItems:"center", gap:3 }}>
                              <AlertCircle size={9}/> URGENT
                            </span>
                          )}
                          <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:st.bg, color:st.color, display:"flex", alignItems:"center", gap:4 }}>
                            <st.Icon size={10}/>{st.label}
                          </span>
                        </div>
                      </div>
                      {s.description && (
                        <div style={{ fontSize:12, color:C.textMid, marginTop:4, lineHeight:1.5 }}>{s.description}</div>
                      )}
                      {s.diagnosis && (
                        <div style={{ marginTop:6, background:C.amberLight, border:`1px solid ${C.amberBorder}`, borderRadius:7, padding:"6px 10px", fontSize:11, color:C.amber, display:"flex", alignItems:"flex-start", gap:6 }}>
                          <Eye size={12} style={{ flexShrink:0, marginTop:1 }}/><span><b>Diagnostic :</b> {s.diagnosis}</span>
                        </div>
                      )}
                      {s.repair_actions && (
                        <div style={{ marginTop:5, background:C.greenLight, border:`1px solid ${C.greenBorder}`, borderRadius:7, padding:"6px 10px", fontSize:11, color:C.green, display:"flex", alignItems:"flex-start", gap:6 }}>
                          <CheckCircle2 size={12} style={{ flexShrink:0, marginTop:1 }}/><span><b>Réparation :</b> {s.repair_actions}</span>
                        </div>
                      )}
                      {s.assigned_technician && (
                        <div style={{ fontSize:11, color:C.textMid, marginTop:5, display:"flex", alignItems:"center", gap:5 }}>
                          <User size={12}/> Technicien : <b>{s.technician_name || s.assigned_technician}</b>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
