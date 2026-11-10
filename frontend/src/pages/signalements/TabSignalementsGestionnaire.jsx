// ─── pages/signalements/TabSignalementsGestionnaire.jsx ──────────────────────
// Workflow simplifié 4 étapes :
// SIGNALE → TECHNICIEN_ENVOYE → CONSTAT_RECU → CLOTURE
// • Charte vert #1B5E37 / rouge #C0182A / orange #EA580C
// • Lucide-react pour toutes les icônes
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import {
  AlertTriangle, Wrench, Clock, MapPin, User, Car,
  CheckCircle, X, ChevronDown, ChevronUp, Send,
  Users, Phone, Navigation, Flame, Circle, Truck,
  Eye, WifiOff, Lightbulb, Wind, Package, RefreshCw,
  ArrowRight, Bell, FileText, BarChart2, Siren,
  ClipboardList, AlertOctagon,
} from "lucide-react";
import { apiFetch } from "../../utils/api";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  green:       "#1B5E37",
  greenMid:    "#2D7A4F",
  greenLight:  "#EAF4EE",
  greenLine:   "#BBF7D0",
  red:         "#C0182A",
  redLight:    "#FDF0F1",
  redLine:     "#FECDD3",
  orange:      "#EA580C",
  orangeLight: "#FFF7ED",
  orangeLine:  "#FDBA74",
  amber:       "#D97706",
  amberLight:  "#FFFBEB",
  amberLine:   "#FDE68A",
  white:       "#FFFFFF",
  bg:          "#F0F3F1",
  border:      "#E2E8E5",
  text:        "#1A2820",
  textMid:     "#4A6358",
  textLight:   "#8EA99A",
};

// ── Config workflow ───────────────────────────────────────────────────────────
const STATUS_CFG = {
  SIGNALE:            { label:"Nouveau",             color:C.red,    bg:C.redLight,    step:0 },
  EN_DIAGNOSTIC:      { label:"Technicien envoyé",   color:C.orange, bg:C.orangeLight, step:1 },
  SUR_PLACE:          { label:"Technicien sur place", color:C.amber,  bg:C.amberLight,  step:1 },
  CONSTAT_ENVOYE:     { label:"Constat reçu",         color:C.green,  bg:C.greenLight,  step:2 },
  EN_REPARATION:      { label:"En rapatriement",      color:C.amber,  bg:C.amberLight,  step:2 },
  RAPPATRIE:          { label:"Rapatrié",             color:C.green,  bg:C.greenLight,  step:2 },
  REPARE:             { label:"Clôturé",              color:C.green,  bg:C.greenLight,  step:3 },
  NON_REPARABLE:      { label:"Irrécupérable",        color:"#6B7280",bg:"#F3F4F6",     step:3 },
};

const SEVERITY_CFG = {
  CRITIQUE: { label:"Critique", color:C.red,    bg:C.redLight,    dot:C.red    },
  HAUTE:    { label:"Urgente",  color:C.orange, bg:C.orangeLight, dot:C.orange },
  MOYENNE:  { label:"Normale",  color:C.amber,  bg:C.amberLight,  dot:C.amber  },
  BASSE:    { label:"Faible",   color:C.green,  bg:C.greenLight,  dot:C.green  },
};

const WORKFLOW_STEPS = [
  { key:"SIGNALE",        label:"Signalé"   },
  { key:"EN_DIAGNOSTIC",  label:"Technicien"},
  { key:"CONSTAT_ENVOYE", label:"Constat"   },
  { key:"REPARE",         label:"Clôturé"   },
];

const IS_OPEN = s => !["REPARE","NON_REPARABLE"].includes(s);

const fmtDT = d => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
  : "—";
const fmtDate = d => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })
  : "—";
const fmtAgo = d => {
  if (!d) return "";
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1)  return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h/24)}j`;
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes sg-spin  { to { transform: rotate(360deg); } }
  @keyframes sg-fade  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sg-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

  .sg-card { animation: sg-fade .2s ease both; }
  .sg-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08) !important; }

  .sg-btn-primary {
    background: ${C.green}; color: #fff; border: none;
    padding: 9px 18px; border-radius: 8px; font-size: 12px; font-weight: 700;
    cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px;
    transition: opacity .15s, transform .1s;
  }
  .sg-btn-primary:hover { opacity: .88; transform: translateY(-1px); }
  .sg-btn-primary:disabled { opacity: .5; cursor: not-allowed; transform: none; }

  .sg-btn-ghost {
    background: transparent; color: ${C.textMid};
    border: 1.5px solid ${C.border};
    padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px;
    transition: all .15s;
  }
  .sg-btn-ghost:hover { border-color: ${C.green}; color: ${C.green}; background: ${C.greenLight}; }

  .sg-btn-danger {
    background: ${C.red}; color: #fff; border: none;
    padding: 9px 18px; border-radius: 8px; font-size: 12px; font-weight: 700;
    cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px;
    transition: opacity .15s;
  }
  .sg-btn-danger:hover { opacity: .88; }
  .sg-btn-danger:disabled { opacity: .5; cursor: not-allowed; }

  .sg-inp {
    padding: 9px 12px; border: 1.5px solid ${C.border}; border-radius: 8px;
    font-size: 13px; font-family: inherit; color: ${C.text};
    background: #fff; width: 100%; outline: none;
    transition: border-color .15s; box-sizing: border-box;
  }
  .sg-inp:focus { border-color: ${C.green}; box-shadow: 0 0 0 3px ${C.green}18; }

  .sg-lbl {
    font-size: 10px; font-weight: 700; color: ${C.textMid};
    text-transform: uppercase; letter-spacing: 1.2px;
    margin-bottom: 5px; display: block;
  }

  .sg-tech-row {
    padding: 10px 12px; border-radius: 9px; cursor: pointer;
    border: 1.5px solid ${C.border}; background: ${C.bg};
    display: flex; align-items: center; gap: 10px; transition: all .12s;
  }
  .sg-tech-row:hover { border-color: ${C.green}; background: ${C.greenLight}; }
  .sg-tech-row.sel   { border-color: ${C.green}; background: ${C.greenLight}; }

  .sg-filter-pill {
    padding: 5px 12px; border-radius: 99px; font-size: 11px; font-weight: 700;
    cursor: pointer; border: 1.5px solid ${C.border};
    background: #fff; color: ${C.textMid}; transition: all .12s;
  }
  .sg-filter-pill:hover { border-color: ${C.green}; color: ${C.green}; }
  .sg-filter-pill.on { background: ${C.green}; color: #fff; border-color: ${C.green}; }

  .sg-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.5);
    backdrop-filter: blur(4px); display: flex;
    align-items: center; justify-content: center;
    z-index: 1000; padding: 20px; animation: sg-fade .18s ease;
  }

  .sg-modal {
    background: #fff; border-radius: 16px; width: 100%;
    max-height: 92vh; display: flex; flex-direction: column;
    box-shadow: 0 24px 64px rgba(0,0,0,.24);
  }

  .sg-step { position: relative; padding-left: 28px; padding-bottom: 14px; }
  .sg-step::before { content:''; position:absolute; left:9px; top:22px; bottom:0;
    width:1px; background:${C.border}; }
  .sg-step:last-child::before { display:none; }
  .sg-step-dot { position:absolute; left:0; top:2px; width:20px; height:20px;
    border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:9px; font-weight:800; }

  .sg-pulse { animation: sg-pulse 2s ease infinite; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: #D4DDD9; border-radius: 99px; }
`;

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    if (msg) { const t = setTimeout(onDone, 4500); return () => clearTimeout(t); }
  }, [msg, onDone]);
  if (!msg) return null;
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:9999,
      background: type==="error" ? C.red : C.green,
      color:"#fff", borderRadius:10, padding:"12px 18px",
      fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:10,
      boxShadow:"0 4px 20px rgba(0,0,0,.25)", maxWidth:420,
    }}>
      {type==="error" ? <X size={14}/> : <CheckCircle size={14}/>}
      <span>{msg}</span>
    </div>
  );
}

// ── Barre de progression workflow ─────────────────────────────────────────────
function WorkflowBar({ status }) {
  const currentStep = STATUS_CFG[status]?.step ?? 0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      {WORKFLOW_STEPS.map((s, i) => {
        const done    = i < currentStep;
        const active  = i === currentStep;
        return (
          <div key={s.key} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{
              width:22, height:22, borderRadius:"50%",
              background: done ? C.green : active ? C.green : C.border,
              color: done||active ? "#fff" : C.textLight,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:9, fontWeight:800,
              boxShadow: active ? `0 0 0 3px ${C.green}30` : "none",
            }}>
              {done ? <CheckCircle size={11}/> : i+1}
            </div>
            {i < WORKFLOW_STEPS.length-1 && (
              <div style={{ width:20, height:2, borderRadius:99, background: done ? C.green : C.border }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Timeline interne ──────────────────────────────────────────────────────────
function Timeline({ ticket }) {
  const steps = [
    { label:"Signalement reçu",         time:ticket.reported_date, who:"Chauffeur"    },
    { label:"Technicien envoyé",         time:ticket.assigned_date, who:"Gestionnaire" },
    { label:"Constat du technicien",     time:ticket.constat_date,  who:"Technicien"   },
    { label:"Clôture",                   time:ticket.resolved_date, who:"Gestionnaire" },
  ];
  const currentStep = STATUS_CFG[ticket.status]?.step ?? 0;
  return (
    <div>
      {steps.map((s, i) => {
        const done = i <= currentStep;
        return (
          <div key={i} className="sg-step">
            <div className="sg-step-dot" style={{ background: done ? C.green : "#E2E8E5", color: done ? "#fff" : C.textLight }}>
              {done ? <CheckCircle size={10}/> : <span style={{ fontSize:9 }}>{i+1}</span>}
            </div>
            <div style={{ fontSize:12, fontWeight: done?700:400, color: done?C.text:C.textLight }}>{s.label}</div>
            <div style={{ fontSize:10, color:C.textLight, marginTop:1 }}>
              {s.who}{s.time && done ? ` · ${fmtDT(s.time)}` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Modal détail + actions ────────────────────────────────────────────────────
function ModalDetail({ ticket, techniciens, onClose, onRefresh, showToast }) {
  const sev     = SEVERITY_CFG[ticket.severity] || SEVERITY_CFG.MOYENNE;
  const st      = STATUS_CFG[ticket.status]     || STATUS_CFG.SIGNALE;
  const isOpen  = IS_OPEN(ticket.status);
  const [saving,      setSaving]      = useState(false);
  const [pane,        setPane]        = useState(null); // "assign" | "cloture" | "reject"
  const [techId,      setTechId]      = useState("");
  const [instructions,setInstructions]= useState("");
  const [cloNotes,    setCloNotes]    = useState("");
  const [doMaint,     setDoMaint]     = useState(false);
  const [rejectReason,setRejectReason]= useState("");
  const [photoZoom,   setPhotoZoom]   = useState(false);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // Action 1 : Envoyer technicien
  const handleAssign = async () => {
    if (!techId) { showToast("Sélectionnez un technicien", "error"); return; }
    setSaving(true);
    try {
      // Essai endpoint dédié, fallback PATCH
      try {
        await apiFetch(`/maintenance/breakdowns/${ticket.id}/assigner/`, {
          method:"POST",
          body: JSON.stringify({ technicien_id:techId, notes:instructions }),
        });
      } catch {
        await apiFetch(`/maintenance/breakdowns/${ticket.id}/`, {
          method:"PATCH",
          body: JSON.stringify({ status:"EN_DIAGNOSTIC", technicien:techId, notes:instructions }),
        });
      }
      showToast("Technicien envoyé sur place ✓");
      onRefresh(); onClose();
    } catch(e) { showToast("Erreur : "+e.message, "error"); }
    finally { setSaving(false); }
  };

  // Action 2 : Clôturer (+ créer maintenance corrective si souhaité)
  const handleCloture = async () => {
    setSaving(true);
    try {
      // Clôturer le signalement
      try {
        await apiFetch(`/maintenance/breakdowns/${ticket.id}/`, {
          method:"PATCH",
          body: JSON.stringify({ status:"REPARE", notes:cloNotes, resolved_date:new Date().toISOString() }),
        });
      } catch(e) { throw e; }

      // Créer le ticket maintenance corrective si demandé
      if (doMaint && ticket.vehicle) {
        try {
          await apiFetch("/maintenance/maintenance/", {
            method:"POST",
            body: JSON.stringify({
              vehicle:          ticket.vehicle,
              maintenance_type: "CORRECTIVE",
              status:           "PLANIFIE",
              scheduled_date:   new Date().toISOString().split("T")[0],
              priorite:         ticket.severity === "CRITIQUE" ? "CRITIQUE" : "HAUTE",
              description:
                `[Signalement #${ticket.id}] ${ticket.title || ""}. ` +
                (ticket.description || "") +
                (ticket.constat_text ? `\nConstat : ${ticket.constat_text}` : "") +
                (cloNotes ? `\nNotes : ${cloNotes}` : ""),
            }),
          });
          showToast("Clôturé + ticket maintenance créé ✓");
        } catch {
          showToast("Clôturé ✓ (maintenance non créée — vérifiez le module)", "error");
        }
      } else {
        showToast("Incident clôturé ✓");
      }
      onRefresh(); onClose();
    } catch(e) { showToast("Erreur : "+e.message, "error"); }
    finally { setSaving(false); }
  };

  // Action 3 : Rejeter
  const handleReject = async () => {
    if (!rejectReason.trim()) { showToast("Motif requis", "error"); return; }
    setSaving(true);
    try {
      try {
        await apiFetch(`/maintenance/breakdowns/${ticket.id}/rejeter/`, {
          method:"POST", body:JSON.stringify({ reason:rejectReason }),
        });
      } catch {
        await apiFetch(`/maintenance/breakdowns/${ticket.id}/`, {
          method:"PATCH",
          body: JSON.stringify({ status:"NON_REPARABLE", notes:rejectReason }),
        });
      }
      showToast("Signalement rejeté");
      onRefresh(); onClose();
    } catch(e) { showToast("Erreur : "+e.message, "error"); }
    finally { setSaving(false); }
  };

  const canAssign  = ["SIGNALE","EN_DIAGNOSTIC"].includes(ticket.status);
  const canCloture = ["CONSTAT_ENVOYE","EN_REPARATION","RAPPATRIE","SUR_PLACE"].includes(ticket.status);

  return (
    <div className="sg-overlay" onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      {photoZoom && ticket.photo_url && (
        <div onClick={() => setPhotoZoom(false)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.92)",
          zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:20,
        }}>
          <img src={ticket.photo_url} alt="Photo" style={{
            maxWidth:"88vw", maxHeight:"82vh", borderRadius:12, objectFit:"contain",
          }}/>
          <button onClick={() => setPhotoZoom(false)} style={{
            position:"absolute", top:20, right:20, width:34, height:34, borderRadius:"50%",
            background:C.red, color:"#fff", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}><X size={16}/></button>
        </div>
      )}

      <div className="sg-modal" style={{ maxWidth:640 }}>
        {/* Header */}
        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"18px 22px", borderBottom:`1px solid ${C.border}`, flexShrink:0,
          gap:12,
        }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:800, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              Incident #{ticket.id} — {ticket.vehicle_name || "Véhicule"}
            </div>
            <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
              {fmtAgo(ticket.reported_date)} · {ticket.reported_by_name || "—"}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <WorkflowBar status={ticket.status}/>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.textLight }}>
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Corps */}
        <div style={{ overflowY:"auto", padding:"18px 22px", display:"flex", flexDirection:"column", gap:14, flex:1 }}>

          {/* Badges */}
          <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ padding:"3px 10px", borderRadius:99, fontSize:10, fontWeight:800, background:sev.bg, color:sev.color, display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:sev.dot, display:"inline-block" }}/>
              {sev.label}
            </span>
            <span style={{ padding:"3px 10px", borderRadius:99, fontSize:10, fontWeight:700, background:st.bg, color:st.color }}>
              {st.label}
            </span>
          </div>

          {/* Infos */}
          <div style={{ background:C.bg, borderRadius:10, padding:"12px 14px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              ["Déclaré par",   ticket.reported_by_name || "—"],
              ["Véhicule",      ticket.vehicle_name    || "—"],
              ["Date",          fmtDT(ticket.reported_date)],
              ["Localisation",  ticket.location        || "Non précisée"],
            ].map(([l,v]) => (
              <div key={l}>
                <div style={{ fontSize:9, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:2 }}>{l}</div>
                <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          {ticket.description && (
            <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6, background:C.bg, borderRadius:8, padding:"10px 12px" }}>
              {ticket.description}
            </div>
          )}

          {/* Photo chauffeur */}
          {ticket.photo_url && (
            <div>
              <div style={lblS}>Photo de l'incident</div>
              <img src={ticket.photo_url} alt="Photo" onClick={() => setPhotoZoom(true)}
                style={{ width:"100%", maxHeight:160, objectFit:"cover", borderRadius:10, cursor:"zoom-in", border:`1.5px solid ${C.border}`, display:"block" }}/>
            </div>
          )}

          {/* Constat technicien (si reçu) */}
          {ticket.constat_text && (
            <div style={{ background:"#F0FDF4", border:`1.5px solid ${C.greenLine}`, borderRadius:10, padding:"12px 14px" }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.green, marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
                <ClipboardList size={13}/> Constat du technicien
              </div>
              {ticket.constat_roulable !== undefined && (
                <div style={{ fontSize:11, fontWeight:700, marginBottom:6,
                  color: ticket.constat_roulable ? C.green : C.red,
                  display:"flex", alignItems:"center", gap:5 }}>
                  {ticket.constat_roulable
                    ? <><CheckCircle size={12}/> Véhicule roulable</>
                    : <><X size={12}/> Véhicule immobilisé</>}
                </div>
              )}
              <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6 }}>{ticket.constat_text}</div>
            </div>
          )}

          {/* Technicien assigné */}
          {ticket.technician_name && (
            <div style={{ background:C.blueLight||"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:9, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"#1D4ED8", color:"#fff",
                display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:11, flexShrink:0 }}>
                {ticket.technician_name[0]}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#1D4ED8" }}>{ticket.technician_name}</div>
                <div style={{ fontSize:10, color:C.textLight }}>Technicien assigné</div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div style={{ background:C.bg, borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>
              Suivi de l'intervention
            </div>
            <Timeline ticket={ticket}/>
          </div>

          {/* ── Panneau ASSIGNER ── */}
          {pane === "assign" && (
            <div style={{ background:C.greenLight, border:`1.5px solid ${C.greenLine}`, borderRadius:12, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.green, marginBottom:14 }}>
                Envoyer un technicien sur place
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={lblS}>Technicien *</label>
                {techniciens.length === 0 ? (
                  <div style={{ fontSize:12, color:C.textLight, fontStyle:"italic" }}>Aucun technicien disponible</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:180, overflowY:"auto" }}>
                    {techniciens.map(t => (
                      <div key={t.id}
                        className={`sg-tech-row${String(techId)===String(t.id)?" sel":""}`}
                        onClick={() => setTechId(String(techId)===String(t.id)?"":t.id)}>
                        <div style={{ width:30, height:30, borderRadius:"50%", background:C.green,
                          color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                          fontWeight:800, fontSize:11, flexShrink:0 }}>
                          {(t.first_name||"?")[0]}{(t.last_name||"")[0]}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:C.text }}>
                            {t.full_name||`${t.first_name||""} ${t.last_name||""}`}
                          </div>
                          <div style={{ fontSize:10, color:C.textLight }}>{t.specialite||"Technicien"}</div>
                        </div>
                        {String(techId)===String(t.id) && <CheckCircle size={15} color={C.green}/>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={lblS}>Instructions (optionnel)</label>
                <textarea className="sg-inp" value={instructions}
                  onChange={e=>setInstructions(e.target.value)} rows={2}
                  placeholder="Ex : Apportez le matériel de remorquage, contactez le chauffeur…"
                  style={{ resize:"vertical" }}/>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="sg-btn-ghost" onClick={() => setPane(null)}>Annuler</button>
                <button className="sg-btn-primary" onClick={handleAssign} disabled={saving||!techId}>
                  {saving ? <><span style={{ width:12,height:12,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"sg-spin .8s linear infinite",display:"inline-block"}}/> Envoi…</> : <><Send size={13}/> Confirmer</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Panneau CLÔTURE ── */}
          {pane === "cloture" && (
            <div style={{ background:C.greenLight, border:`1.5px solid ${C.greenLine}`, borderRadius:12, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.green, marginBottom:14 }}>
                Clôturer l'incident
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={lblS}>Notes de clôture (optionnel)</label>
                <textarea className="sg-inp" value={cloNotes}
                  onChange={e=>setCloNotes(e.target.value)} rows={2}
                  placeholder="Observations finales, actions prises…" style={{ resize:"vertical" }}/>
              </div>
              {/* Option maintenance corrective */}
              <div onClick={() => setDoMaint(v=>!v)}
                style={{ padding:"12px 14px", borderRadius:9, cursor:"pointer",
                  border:`1.5px solid ${doMaint ? C.orange : C.border}`,
                  background: doMaint ? C.orangeLight : "#fff",
                  display:"flex", alignItems:"center", gap:10, marginBottom:12, transition:"all .12s" }}>
                <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${doMaint ? C.orange : C.border}`,
                  background: doMaint ? C.orange : "#fff",
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {doMaint && <CheckCircle size={12} color="#fff"/>}
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color: doMaint ? C.orange : C.text }}>
                    Créer un ticket de maintenance corrective
                  </div>
                  <div style={{ fontSize:10, color:C.textLight }}>
                    Le véhicule sera planifié en maintenance dans le module Maintenance
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="sg-btn-ghost" onClick={() => setPane(null)}>Annuler</button>
                <button className="sg-btn-primary" onClick={handleCloture} disabled={saving}>
                  {saving ? <><span style={{ width:12,height:12,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"sg-spin .8s linear infinite",display:"inline-block"}}/> Clôture…</> : <><CheckCircle size={13}/> Clôturer</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Panneau REJET ── */}
          {pane === "reject" && (
            <div style={{ background:C.redLight, border:`1.5px solid ${C.redLine}`, borderRadius:12, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.red, marginBottom:14 }}>
                Rejeter le signalement
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={lblS}>Motif du rejet *</label>
                <textarea className="sg-inp" value={rejectReason}
                  onChange={e=>setRejectReason(e.target.value)} rows={2}
                  placeholder="Ex : Doublon, fausse alerte, erreur de déclaration…" style={{ resize:"vertical" }}/>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="sg-btn-ghost" onClick={() => setPane(null)}>Annuler</button>
                <button className="sg-btn-danger" onClick={handleReject} disabled={saving||!rejectReason.trim()}>
                  {saving ? "Rejet…" : <><X size={13}/> Confirmer le rejet</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!pane && (
          <div style={{ padding:"14px 22px", borderTop:`1px solid ${C.border}`, flexShrink:0,
            display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            {canAssign && (
              <button className="sg-btn-primary" onClick={() => setPane("assign")}>
                <Send size={13}/> Envoyer un technicien
              </button>
            )}
            {canCloture && (
              <button className="sg-btn-primary" onClick={() => setPane("cloture")}
                style={{ background: ticket.constat_text ? C.green : C.amber }}>
                <CheckCircle size={13}/> Clôturer l'incident
              </button>
            )}
            {isOpen && !canCloture && (
              <button className="sg-btn-danger" onClick={() => setPane("reject")}>
                <X size={13}/> Rejeter
              </button>
            )}
            <button className="sg-btn-ghost" onClick={onClose} style={{ marginLeft:"auto" }}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const lblS = {
  fontSize:10, fontWeight:700, color:C.textMid,
  textTransform:"uppercase", letterSpacing:"1.2px", marginBottom:5, display:"block",
};

// ── Carte ticket ──────────────────────────────────────────────────────────────
function TicketCard({ ticket, onClick }) {
  const sev    = SEVERITY_CFG[ticket.severity] || SEVERITY_CFG.MOYENNE;
  const st     = STATUS_CFG[ticket.status]     || STATUS_CFG.SIGNALE;
  const isOpen = IS_OPEN(ticket.status);
  const needsAction = ["SIGNALE","CONSTAT_ENVOYE"].includes(ticket.status);

  return (
    <div className="sg-card" style={{
      background:C.white, borderRadius:12, padding:"14px 16px",
      boxShadow:"0 1px 4px rgba(0,0,0,.06)", border:`1px solid ${C.border}`,
      borderLeft:`4px solid ${sev.dot}`, cursor:"pointer",
      transition:"box-shadow .15s, transform .15s",
    }} onClick={onClick}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6, flexWrap:"wrap" }}>
            <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:800,
              background:sev.bg, color:sev.color, display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ width:6,height:6,borderRadius:"50%",background:sev.dot,display:"inline-block"}}/>
              {sev.label}
            </span>
            <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:st.bg, color:st.color }}>
              {st.label}
            </span>
            {needsAction && (
              <span className="sg-pulse" style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:800,
                background:C.orangeLight, color:C.orange }}>
                ● Action requise
              </span>
            )}
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {ticket.title || "Incident signalé"}
          </div>
          <div style={{ fontSize:11, color:C.textLight, marginTop:3, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ display:"flex", alignItems:"center", gap:3 }}><Car size={10}/>{ticket.vehicle_name||"—"}</span>
            <span style={{ display:"flex", alignItems:"center", gap:3 }}><User size={10}/>{ticket.reported_by_name||"—"}</span>
            {ticket.location && <span style={{ display:"flex", alignItems:"center", gap:3 }}><MapPin size={10}/>{ticket.location}</span>}
            <span style={{ color: needsAction ? C.orange : C.textLight, fontWeight: needsAction ? 700 : 400 }}>
              {fmtAgo(ticket.reported_date)}
            </span>
          </div>
          {ticket.description && (
            <div style={{ fontSize:12, color:C.textMid, marginTop:6, background:C.bg, borderRadius:7, padding:"6px 10px",
              overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", lineHeight:1.5 }}>
              {ticket.description}
            </div>
          )}
          {isOpen && (
            <div style={{ display:"flex", gap:3, marginTop:8 }}>
              {WORKFLOW_STEPS.slice(0,3).map((_,i) => (
                <div key={i} style={{ height:3, flex:1, borderRadius:99,
                  background: i <= (STATUS_CFG[ticket.status]?.step??0) ? sev.dot : C.border,
                  transition:"background .3s" }}/>
              ))}
            </div>
          )}
        </div>
        <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
          <button onClick={e => { e.stopPropagation(); onClick(); }}
            style={{ padding:"7px 14px", background: needsAction ? C.green : C.bg,
              color: needsAction ? "#fff" : C.textMid,
              border: needsAction ? "none" : `1.5px solid ${C.border}`,
              borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
              display:"flex", alignItems:"center", gap:5 }}>
            {needsAction ? <><AlertTriangle size={11}/> Gérer</> : <><Eye size={11}/> Voir</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export function TabSignalementsGestionnaire() {
  const [tickets,     setTickets]    = useState([]);
  const [techniciens, setTechs]      = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [filter,      setFilter]     = useState("OUVERT"); // "OUVERT" | "CLOTURE" | status
  const [search,      setSearch]     = useState("");
  const [detail,      setDetail]     = useState(null);
  const [toast,       setToast]      = useState({ msg:"", type:"success" });
  const pollingRef = useRef(null);

  const showToast = useCallback((msg, type="success") => setToast({ msg, type }), []);

  const load = useCallback(async () => {
    try {
      const [t, u] = await Promise.all([
        apiFetch("/maintenance/breakdowns/").catch(() => []),
        apiFetch("/auth/users/?role=TECHNICIEN").catch(() => []),
      ]);
      setTickets(Array.isArray(t) ? t : t?.results ?? []);
      setTechs(Array.isArray(u) ? u : u?.results ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    pollingRef.current = setInterval(load, 30000);
    return () => clearInterval(pollingRef.current);
  }, [load]);

  // Filtrage
  const filtered = tickets.filter(t => {
    const matchFilter =
      filter === "OUVERT"  ? IS_OPEN(t.status) :
      filter === "CLOTURE" ? !IS_OPEN(t.status) :
      t.status === filter;
    const matchSearch = !search ||
      [t.title, t.vehicle_name, t.reported_by_name, t.location]
        .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  const counts = {
    ouvert:   tickets.filter(t => IS_OPEN(t.status)).length,
    signale:  tickets.filter(t => t.status === "SIGNALE").length,
    enCours:  tickets.filter(t => ["EN_DIAGNOSTIC","SUR_PLACE"].includes(t.status)).length,
    constat:  tickets.filter(t => t.status === "CONSTAT_ENVOYE").length,
    cloture:  tickets.filter(t => !IS_OPEN(t.status)).length,
    critique: tickets.filter(t => t.severity === "CRITIQUE" && IS_OPEN(t.status)).length,
  };

  const FILTERS = [
    { val:"OUVERT",         label:"Actifs",           count:counts.ouvert  },
    { val:"SIGNALE",        label:"Nouveaux",         count:counts.signale },
    { val:"EN_DIAGNOSTIC",  label:"Technicien envoyé",count:counts.enCours },
    { val:"CONSTAT_ENVOYE", label:"Constat reçu",     count:counts.constat },
    { val:"CLOTURE",        label:"Clôturés",         count:counts.cloture },
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12 }}>
      <div style={{ width:24, height:24, border:`3px solid ${C.green}`, borderTopColor:"transparent",
        borderRadius:"50%", animation:"sg-spin .8s linear infinite" }}/>
      <span style={{ fontSize:13, color:C.textLight }}>Chargement…</span>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, fontFamily:"inherit" }}>
      <style>{CSS}</style>
      <Toast msg={toast.msg} type={toast.type} onDone={() => setToast({ msg:"" })}/>

      {detail && (
        <ModalDetail
          ticket={detail}
          techniciens={techniciens}
          onClose={() => setDetail(null)}
          onRefresh={() => { setDetail(null); load(); }}
          showToast={showToast}
        />
      )}

      {/* Bannière critique */}
      {counts.critique > 0 && (
        <div style={{
          background:C.redLight, border:`1.5px solid ${C.redLine}`, borderLeft:`4px solid ${C.red}`,
          borderRadius:"0 10px 10px 0", padding:"12px 16px",
          display:"flex", alignItems:"center", gap:12,
        }}>
          <Siren size={18} color={C.red} className="sg-pulse"/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:800, color:C.red }}>
              {counts.critique} incident{counts.critique>1?"s":""} critique{counts.critique>1?"s":""} en attente
            </div>
            <div style={{ fontSize:11, color:"#9f1239" }}>Intervention requise immédiatement</div>
          </div>
          <button onClick={() => setFilter("SIGNALE")}
            style={{ padding:"6px 14px", background:C.red, color:"#fff", border:"none",
              borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Voir
          </button>
        </div>
      )}

      {/* Bannière constat à valider */}
      {counts.constat > 0 && (
        <div style={{
          background:C.greenLight, border:`1.5px solid ${C.greenLine}`, borderLeft:`4px solid ${C.green}`,
          borderRadius:"0 10px 10px 0", padding:"12px 16px",
          display:"flex", alignItems:"center", gap:12,
        }}>
          <ClipboardList size={16} color={C.green}/>
          <div style={{ flex:1, fontSize:12, fontWeight:700, color:C.green }}>
            {counts.constat} constat{counts.constat>1?"s":""} reçu{counts.constat>1?"s":""} — vous pouvez clôturer l'incident
          </div>
          <button onClick={() => setFilter("CONSTAT_ENVOYE")}
            style={{ padding:"6px 14px", background:C.green, color:"#fff", border:"none",
              borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Traiter
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[
          { label:"Actifs",          val:counts.ouvert,  color:C.orange, Icon:AlertTriangle },
          { label:"En attente",      val:counts.signale, color:C.red,    Icon:Bell          },
          { label:"Tech. envoyé",    val:counts.enCours, color:C.amber,  Icon:Send          },
          { label:"Clôturés total",  val:counts.cloture, color:C.green,  Icon:CheckCircle   },
        ].map((k,i) => (
          <div key={i} style={{ background:C.white, borderRadius:11, padding:"14px 16px",
            borderTop:`3px solid ${k.color}`, boxShadow:"0 1px 3px rgba(0,0,0,.05)",
            display:"flex", alignItems:"center", gap:12, cursor:"pointer",
            transition:"transform .15s" }}
            onClick={() => setFilter(i===0?"OUVERT":i===1?"SIGNALE":i===2?"EN_DIAGNOSTIC":"CLOTURE")}>
            <div style={{ width:36, height:36, borderRadius:9,
              background:k.color+"14", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <k.Icon size={18} color={k.color}/>
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:k.color, lineHeight:1 }}>{k.val}</div>
              <div style={{ fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:".8px", marginTop:3 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Info workflow */}
      <div style={{ background:C.blueLight||"#EFF6FF", border:"1px solid #BFDBFE",
        borderRadius:9, padding:"10px 16px", fontSize:12, color:"#1D4ED8",
        display:"flex", alignItems:"center", gap:8 }}>
        <FileText size={13} style={{ flexShrink:0 }}/>
        <span>
          <b>Workflow :</b> 1 Nouveau signalement → 2 Vous envoyez un technicien → 3 Le technicien envoie un constat →
          <b> 4 Vous clôturez</b> (+ maintenance corrective si nécessaire)
        </span>
      </div>

      {/* Filtres + recherche */}
      <div style={{ background:C.white, borderRadius:11, padding:"12px 14px",
        display:"flex", gap:10, flexWrap:"wrap", alignItems:"center",
        boxShadow:"0 1px 3px rgba(0,0,0,.05)", border:`1px solid ${C.border}` }}>
        <div style={{ position:"relative", flex:1, minWidth:180 }}>
          <input className="sg-inp" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Rechercher véhicule, chauffeur, lieu…"
            style={{ paddingLeft:32 }}/>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
            color:C.textLight, pointerEvents:"none", display:"flex" }}>
            <AlertTriangle size={13}/>
          </span>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {FILTERS.map(f => (
            <button key={f.val}
              className={`sg-filter-pill${filter===f.val?" on":""}`}
              onClick={() => setFilter(f.val)}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>
        <button onClick={load} style={{ width:32, height:32, borderRadius:8,
          border:`1px solid ${C.border}`, background:C.bg, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", color:C.textMid,
          flexShrink:0 }}>
          <RefreshCw size={13}/>
        </button>
        <span style={{ fontSize:11, color:C.textLight, whiteSpace:"nowrap" }}>
          {filtered.length} résultat{filtered.length>1?"s":""}
        </span>
      </div>

      {/* Liste */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.length === 0 ? (
          <div style={{ background:C.white, borderRadius:12, padding:"60px 20px",
            textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)", border:`1px solid ${C.border}` }}>
            <CheckCircle size={40} color={C.greenLine} style={{ marginBottom:10 }}/>
            <div style={{ fontSize:15, fontWeight:700, color:C.text }}>
              {filter==="OUVERT" ? "Aucun incident actif" : "Aucun résultat"}
            </div>
            <div style={{ fontSize:12, color:C.textLight, marginTop:6 }}>
              {filter==="OUVERT" ? "Tous les incidents ont été traités. ✓" : "Modifiez vos filtres."}
            </div>
          </div>
        ) : (
          filtered.map(t => (
            <TicketCard key={t.id} ticket={t} onClick={() => setDetail(t)}/>
          ))
        )}
      </div>

      <div style={{ textAlign:"center", fontSize:10, color:C.textLight }}>
        Actualisation automatique toutes les 30 secondes
      </div>
    </div>
  );
}