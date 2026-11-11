// ─── pages/signalements/TabSignalements.jsx ──────────────────────────────────
// Module URGENCE TERRAIN — v3
// • lucide-react pour toutes les icônes (plus d'emojis UI)
// • Charte : vert #1B5E37 / rouge #C0182A / orange #D97706
// • Géolocalisation GPS intégrée
// • Modal SOS de confirmation in-app
// • Écran de succès professionnel animé
// • Réinitialisation complète après envoi
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import {
  AlertTriangle, AlertOctagon, Wrench, Flame, Circle,
  Truck, Car, Bus, MapPin, Camera, CheckCircle2, Clock,
  Phone, Shield, Navigation, Users, FileText, Radio,
  ChevronDown, ChevronUp, Send, RotateCcw, History,
  Zap, WifiOff, Lightbulb, Wind, Package, X,
  Siren, Ambulance, Bike, Eye, Download, Check,
  Map, LocateFixed, Image, Trash2, ArrowRight,
  TriangleAlert, Info, CircleCheck, RefreshCw,
  Crosshair,
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
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || json?.message || `Erreur ${res.status}`);
  return json?.data ?? json;
}

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const P = {
  green:       "#1B5E37",
  greenMid:    "#16A34A",
  greenLight:  "#EAF4EE",
  greenBorder: "#BBF7D0",
  red:         "#C0182A",
  redLight:    "#FDF0F1",
  redBorder:   "#FECDD3",
  orange:      "#D97706",
  orangeLight: "#FFFBEB",
  orangeBorder:"#FDE68A",
  blue:        "#1D4ED8",
  blueLight:   "#EFF6FF",
  border:      "#E2E8E5",
  bg:          "#F7FAF8",
  white:       "#FFFFFF",
  text:        "#1A2820",
  textMid:     "#4A6358",
  textLight:   "#8EA99A",
};

// ─────────────────────────────────────────────────────────────────────────────
// DONNÉES
// ─────────────────────────────────────────────────────────────────────────────
const CAUSES_IMMOBILISATION = [
  { val: "ACCIDENT_COLLISION", label: "Collision / Accident",        Icon: AlertOctagon },
  { val: "PANNE_MOTEUR",       label: "Panne moteur totale",         Icon: Wrench       },
  { val: "INCENDIE",           label: "Incendie / Fumée anormale",   Icon: Flame        },
  { val: "PERTE_FREINS",       label: "Perte de freinage",           Icon: TriangleAlert},
  { val: "CREVAISON_BLOCAGE",  label: "Crevaison bloquante",         Icon: Circle       },
  { val: "AUTRE_IMMOBILISANT", label: "Autre — ne peut plus avancer",Icon: Truck        },
];

const CAUSES_INCIDENT = [
  { val: "CREVAISON_SIMPLE",  label: "Crevaison (roue de secours)", Icon: Circle       },
  { val: "RETRO_CASSE",       label: "Rétroviseur endommagé",       Icon: Eye          },
  { val: "VITRE_CASSEE",      label: "Vitre brisée",                Icon: WifiOff      },
  { val: "ECLAIRAGE_DEFAUT",  label: "Défaut d'éclairage",          Icon: Lightbulb    },
  { val: "CARROSSERIE",       label: "Dommage carrosserie",         Icon: Car          },
  { val: "ESSUIE_GLACE",      label: "Essuie-glaces défectueux",    Icon: Wind         },
  { val: "AUTRE_SIMPLE",      label: "Autre incident mineur",       Icon: Package      },
];

const STATUT_CFG = {
  SIGNALE:       { label: "En attente",           color: P.orange, bg: P.orangeLight },
  EN_ATTENTE:    { label: "En attente",           color: P.orange, bg: P.orangeLight },
  EN_DIAGNOSTIC: { label: "Assistance en route",  color: P.blue,   bg: P.blueLight  },
  EN_REPARATION: { label: "Rapatriement",         color: P.orange, bg: P.orangeLight },
  REPARE:        { label: "Clôturé",              color: P.green,  bg: P.greenLight  },
  NON_REPARABLE: { label: "Irrécupérable",        color: "#6B7280",bg: "#F3F4F6"     },
};

const fmtDT = d => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
  : "—";
const fmtShort = d => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })
  : "—";

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes s-spin   { to { transform: rotate(360deg); } }
  @keyframes s-fade   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes s-slide  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes s-pop    { 0%{opacity:0;transform:scale(.88)} 60%{transform:scale(1.03)} 100%{opacity:1;transform:scale(1)} }
  @keyframes s-ring   { 0%{transform:scale(1);opacity:1} 100%{transform:scale(1.7);opacity:0} }
  @keyframes s-sos    { 0%,100%{background:#C0182A;box-shadow:0 4px 24px #C0182A60} 50%{background:#DC2626;box-shadow:0 4px 32px #DC262680} }
  @keyframes s-check  { from{stroke-dashoffset:50} to{stroke-dashoffset:0} }
  @keyframes s-geo    { 0%,100%{opacity:1} 50%{opacity:.35} }

  .s-fade  { animation:s-fade  .22s ease both; }
  .s-slide { animation:s-slide .28s ease both; }
  .s-pop   { animation:s-pop   .35s cubic-bezier(.22,.68,0,1.2) both; }

  .s-sos-btn {
    animation:s-sos 1.6s ease-in-out infinite;
    transition:transform .1s;
  }
  .s-sos-btn:hover { transform:scale(1.02); }
  .s-sos-btn:active{ transform:scale(.97); }

  .s-card {
    background:#fff; border-radius:14px;
    box-shadow:0 1px 3px rgba(0,0,0,.06);
  }

  .s-type-btn {
    border-radius:13px; cursor:pointer;
    transition:all .15s; border:2px solid ${P.border};
    background:${P.bg}; text-align:left; padding:18px 16px;
    font-family:inherit;
  }
  .s-type-btn:hover { border-color:#8EA99A; background:#fff; }
  .s-type-btn.sel-red  { border-color:${P.red}!important;    background:${P.redLight}!important;    box-shadow:0 0 0 3px ${P.red}18; }
  .s-type-btn.sel-orng { border-color:${P.orange}!important; background:${P.orangeLight}!important; box-shadow:0 0 0 3px ${P.orange}18; }

  .s-cause-btn {
    padding:11px 13px; border-radius:9px; cursor:pointer;
    border:1.5px solid ${P.border}; background:${P.bg};
    display:flex; align-items:center; gap:10px;
    transition:all .12s; text-align:left; font-family:inherit;
  }
  .s-cause-btn:hover { border-color:${P.textMid}; background:#fff; }
  .s-cause-btn.sel-red  { border-color:${P.red}!important;    background:${P.redLight}!important; }
  .s-cause-btn.sel-orng { border-color:${P.orange}!important; background:${P.orangeLight}!important; }

  .s-ctx-btn {
    flex:1; padding:14px 16px; border-radius:10px; cursor:pointer;
    border:2px solid ${P.border}; background:${P.bg};
    text-align:left; transition:all .15s; font-family:inherit;
  }
  .s-ctx-btn:hover { border-color:${P.green}; background:${P.greenLight}; }
  .s-ctx-btn.sel   { border-color:${P.green}!important; background:${P.greenLight}!important; box-shadow:0 0 0 3px ${P.green}18; }

  .s-inp {
    padding:10px 13px; border:1.5px solid ${P.border}; border-radius:9px;
    font-size:13px; font-family:inherit; color:${P.text};
    background:#fff; width:100%; outline:none;
    transition:border-color .15s; box-sizing:border-box;
  }
  .s-inp:focus { border-color:${P.green}; box-shadow:0 0 0 3px ${P.green}14; }
  .s-inp-err   { border-color:${P.red}!important; background:${P.redLight}!important; }

  .s-lbl {
    font-size:10px; font-weight:700; color:${P.textMid};
    text-transform:uppercase; letter-spacing:1.2px;
    margin-bottom:6px; display:block;
  }

  .s-step { position:relative; padding-left:32px; padding-bottom:16px; }
  .s-step::before { content:''; position:absolute; left:10px; top:24px; bottom:0; width:1px; background:${P.border}; }
  .s-step:last-child::before { display:none; }
  .s-step-dot { position:absolute; left:0; top:3px; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; }

  .s-toast {
    position:fixed; bottom:24px; right:24px; z-index:9999;
    border-radius:13px; padding:14px 20px; font-size:13px; font-weight:600;
    display:flex; align-items:center; gap:10px;
    box-shadow:0 8px 32px rgba(0,0,0,.22); max-width:420px;
    animation:s-slide .3s ease; font-family:inherit;
  }

  .s-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.55);
    display:flex; align-items:center; justify-content:center;
    z-index:1200; animation:s-fade .2s ease;
    backdrop-filter:blur(3px);
  }

  .s-ring {
    position:absolute; inset:-7px; border-radius:50%;
    border:2px solid ${P.red}; animation:s-ring 1.4s ease-out infinite;
  }

  .s-geo-pulse { animation:s-geo 1.2s ease-in-out infinite; }

  .s-mission-row {
    padding:12px 14px; border-radius:9px; cursor:pointer;
    border:1.5px solid ${P.border}; background:${P.bg};
    transition:all .12s;
  }
  .s-mission-row:hover { border-color:${P.green}; background:${P.greenLight}; }
  .s-mission-row.sel   { border-color:${P.green}; background:${P.greenLight}; }

  @media (max-width:768px) {
    .s-sidebar { display:none!important; }
    .s-grid-2  { grid-template-columns:1fr!important; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    if (msg) { const t = setTimeout(onDone, 5000); return () => clearTimeout(t); }
  }, [msg, onDone]);
  if (!msg) return null;
  const map = {
    error:   { bg: P.red,    Icon: AlertTriangle },
    urgence: { bg: P.orange, Icon: Siren         },
    success: { bg: P.green,  Icon: CircleCheck   },
  };
  const { bg, Icon } = map[type] || map.success;
  return (
    <div className="s-toast" style={{ background: bg, color: "#fff" }}>
      <Icon size={18} />
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onDone} style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", cursor: "pointer", padding: 0 }}>
        <X size={16} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL CONFIRMATION SOS
// ─────────────────────────────────────────────────────────────────────────────
function ModalConfirmSOS({ causeLabel, onConfirm, onCancel, submitting }) {
  return (
    <div className="s-overlay">
      <div className="s-pop" style={{
        background: "#fff", borderRadius: 18, padding: "36px 32px",
        width: 480, maxWidth: "94vw", textAlign: "center",
        boxShadow: `0 24px 80px ${P.red}30`, fontFamily: "inherit",
      }}>
        {/* Icône animée */}
        <div style={{ position: "relative", width: 72, height: 72, margin: "0 auto 20px" }}>
          <div className="s-ring" />
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: P.redLight,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Siren size={32} color={P.red} />
          </div>
        </div>

        <div style={{ fontSize: 20, fontWeight: 800, color: P.red, marginBottom: 8 }}>
          Confirmer l'envoi du SOS
        </div>
        <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.7, marginBottom: 8 }}>
          Vous êtes sur le point d'envoyer une <strong>alerte d'urgence critique</strong>.
        </div>
        <div style={{ fontSize: 12, background: P.redLight, border: `1px solid ${P.redBorder}`, borderRadius: 9, padding: "10px 14px", marginBottom: 16, color: P.red, lineHeight: 1.6 }}>
          <strong>Cause :</strong> {causeLabel}<br />
          Le gestionnaire recevra une notification immédiate et déclenchera l'assistance.
        </div>
        <div style={{ background: P.orangeLight, border: `1px solid ${P.orangeBorder}`, borderRadius: 9, padding: "10px 14px", marginBottom: 24, fontSize: 12, color: P.orange, lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          Si des personnes sont blessées, appelez le <strong style={{ margin: "0 3px" }}>15 (SAMU)</strong> ou le <strong style={{ margin: "0 3px" }}>17 (Police)</strong> en priorité.
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onCancel} disabled={submitting}
            style={{ padding: "11px 24px", background: "transparent", color: P.textMid, border: `1.5px solid ${P.border}`, borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={onConfirm} disabled={submitting}
            style={{
              padding: "11px 24px", background: P.red, color: "#fff", border: "none", borderRadius: 9,
              fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 8,
              opacity: submitting ? 0.7 : 1, boxShadow: `0 4px 20px ${P.red}50`,
            }}>
            {submitting ? (
              <><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "s-spin .8s linear infinite", display: "inline-block" }} /> Envoi…</>
            ) : (
              <><Send size={15} /> Envoyer le SOS maintenant</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉCRAN SUCCÈS
// ─────────────────────────────────────────────────────────────────────────────
function EcranSucces({ mode, ticketRef, vehicleLabel, onNewReport, onHistory }) {
  const isUrgent = mode === "IMMOBILISATION";
  const accent   = isUrgent ? P.red : P.green;
  const accentDark = isUrgent ? "#7F1D1D" : "#064E3B";

  return (
    <div className="s-pop" style={{ borderRadius: 18, overflow: "hidden", boxShadow: `0 8px 40px ${accent}28`, fontFamily: "inherit" }}>
      {/* Header coloré */}
      <div style={{
        background: `linear-gradient(135deg, ${accentDark} 0%, ${accent} 100%)`,
        padding: "32px 28px 28px", textAlign: "center", color: "#fff",
      }}>
        <div style={{ width: 68, height: 68, margin: "0 auto 16px", position: "relative" }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isUrgent ? <Siren size={32} color="#fff" /> : <CheckCircle2 size={36} color="#fff" />}
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
          {isUrgent ? "SOS envoyé avec succès" : "Signalement transmis"}
        </div>
        <div style={{ fontSize: 13, opacity: .85, lineHeight: 1.6 }}>
          {isUrgent
            ? "Votre alerte d'urgence a été reçue. L'assistance est déclenchée."
            : "Votre incident a été enregistré. Le gestionnaire va prendre en charge votre demande."}
        </div>
      </div>

      {/* Corps */}
      <div style={{ background: "#fff", padding: "24px 28px" }}>
        {ticketRef && (
          <div style={{ background: P.bg, borderRadius: 10, padding: "12px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: P.textLight, fontWeight: 600 }}>N° de signalement</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: accent, fontFamily: "monospace" }}>#{ticketRef}</span>
          </div>
        )}
        {vehicleLabel && (
          <div style={{ background: P.bg, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: P.textLight, fontWeight: 600 }}>Véhicule concerné</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>{vehicleLabel}</span>
          </div>
        )}

        {/* Étapes */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: P.textLight, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>
            Prochaines étapes
          </div>
          {(isUrgent ? [
            { Icon: Phone,       text: "Le gestionnaire vous rappelle dans les 5 minutes" },
            { Icon: Ambulance,   text: "Assistance routière dépêchée sur votre position" },
            { Icon: Shield,      text: "Restez dans ou près du véhicule, feux de détresse allumés" },
          ] : [
            { Icon: Eye,         text: "Le gestionnaire examine votre signalement" },
            { Icon: Clock,       text: "Une intervention sera planifiée sous 24h" },
            { Icon: Radio,       text: "Vous recevrez une notification de suivi" },
          ]).map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: accent + "14", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <step.Icon size={14} color={accent} />
              </div>
              <span style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6, marginTop: 4 }}>{step.text}</span>
            </div>
          ))}
        </div>

        {/* Urgences si SOS */}
        {isUrgent && (
          <div style={{ background: P.redLight, border: `1px solid ${P.redBorder}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 20, justifyContent: "center" }}>
            {[["15","SAMU"],["17","Police"],["18","Pompiers"]].map(([n, l]) => (
              <div key={n} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: P.red, fontFamily: "monospace" }}>{n}</div>
                <div style={{ fontSize: 10, color: P.textLight, fontWeight: 600 }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onHistory}
            style={{ flex: 1, padding: 11, background: accent, color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <History size={14} /> Suivre mon signalement
          </button>
          <button onClick={onNewReport}
            style={{ padding: "11px 16px", background: P.bg, color: P.textMid, border: `1.5px solid ${P.border}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            <RotateCcw size={13} /> Nouveau
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUTON GÉOLOCALISATION
// ─────────────────────────────────────────────────────────────────────────────
function GeoButton({ onLocate, geoState }) {
  const map = {
    idle:    { label: "Obtenir ma position GPS",   color: P.blue,  bg: P.blueLight,  Icon: Crosshair    },
    loading: { label: "Localisation en cours…",    color: P.blue,  bg: P.blueLight,  Icon: Navigation   },
    success: { label: "Position obtenue",           color: P.green, bg: P.greenLight, Icon: LocateFixed  },
    error:   { label: "Position indisponible",      color: P.red,   bg: P.redLight,   Icon: WifiOff      },
  };
  const s = map[geoState] || map.idle;
  return (
    <button type="button" onClick={onLocate} disabled={geoState === "loading"}
      style={{
        display: "flex", alignItems: "center", gap: 7, padding: "8px 14px",
        borderRadius: 8, fontSize: 12, fontWeight: 700,
        cursor: geoState === "loading" ? "default" : "pointer", fontFamily: "inherit",
        background: s.bg, color: s.color, border: `1.5px solid ${s.color}30`, transition: "all .15s",
      }}>
      {geoState === "loading"
        ? <span className="s-geo-pulse" style={{ width: 12, height: 12, borderRadius: "50%", background: P.blue, display: "inline-block" }} />
        : <s.Icon size={13} />}
      {s.label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE SUIVI
// ─────────────────────────────────────────────────────────────────────────────
function TimelineSuivi({ ticket }) {
  const steps = [
    { label: "Signalement envoyé",  Icon: Send,         done: true,                                                            time: ticket.reported_date || ticket.created_at },
    { label: "Gestionnaire alerté", Icon: Phone,        done: ["EN_DIAGNOSTIC","EN_REPARATION","REPARE"].includes(ticket.status), time: ticket.assigned_date },
    { label: "Assistance en route", Icon: Ambulance,    done: ["EN_REPARATION","REPARE"].includes(ticket.status),              time: ticket.pickup_date },
    { label: "Incident clôturé",    Icon: CheckCircle2, done: ticket.status === "REPARE",                                      time: ticket.resolved_date },
  ];
  return (
    <div>
      {steps.map((s, i) => (
        <div key={i} className="s-step">
          <div className="s-step-dot"
            style={{ background: s.done ? P.green : P.border, color: s.done ? "#fff" : P.textLight }}>
            {s.done
              ? <Check size={12} color="#fff" />
              : <span style={{ fontSize: 9, fontWeight: 800 }}>{i + 1}</span>}
          </div>
          <div style={{ fontSize: 12, fontWeight: s.done ? 700 : 400, color: s.done ? P.text : P.textLight, display: "flex", alignItems: "center", gap: 5 }}>
            <s.Icon size={12} color={s.done ? P.green : P.textLight} />
            {s.label}
          </div>
          {s.time && s.done && (
            <div style={{ fontSize: 10, color: P.textLight, marginTop: 2 }}>{fmtDT(s.time)}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTE SIGNALEMENT HISTORIQUE
// ─────────────────────────────────────────────────────────────────────────────
function CarteSignalement({ s, expanded, onToggle }) {
  const st       = STATUT_CFG[s.status] || STATUT_CFG.SIGNALE;
  const isUrgent = s.severity === "CRITIQUE";
  const accent   = isUrgent ? P.red : P.orange;

  return (
    <div className="s-card s-fade" style={{ border: `1px solid ${P.border}`, borderLeft: `4px solid ${accent}` }}>
      <div style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12 }} onClick={onToggle}>
        <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: isUrgent ? P.redLight : P.orangeLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isUrgent ? <Siren size={20} color={P.red} /> : <Wrench size={20} color={P.orange} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>{s.title || "Incident signalé"}</div>
            <span style={{ padding: "2px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>
              {st.label}
            </span>
          </div>
          <div style={{ fontSize: 11, color: P.textLight, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={10} />
            {fmtDT(s.reported_date || s.created_at)}
            {s.location && (
              <><MapPin size={10} style={{ marginLeft: 6 }} /> {s.location}</>
            )}
          </div>
          {!["REPARE","NON_REPARABLE"].includes(s.status) && (
            <div style={{ marginTop: 5, fontSize: 11, color: P.green, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <RefreshCw size={10} /> Suivre l'intervention
            </div>
          )}
        </div>
        {expanded ? <ChevronUp size={16} color={P.textLight} /> : <ChevronDown size={16} color={P.textLight} />}
      </div>

      {expanded && (
        <div className="s-slide" style={{ padding: "0 16px 16px", borderTop: `1px solid ${P.border}` }}>
          {s.description && (
            <div style={{ marginTop: 12, fontSize: 12, color: P.textMid, lineHeight: 1.6, background: P.bg, borderRadius: 8, padding: "8px 12px" }}>
              {s.description}
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: P.textLight, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
              Suivi de l'intervention
            </div>
            <TimelineSuivi ticket={s} />
          </div>
          {s.notes && s.status === "REPARE" && (
            <div style={{ marginTop: 10, background: P.greenLight, borderRadius: 8, padding: "8px 12px", fontSize: 11, color: P.green, display: "flex", gap: 6, alignItems: "flex-start" }}>
              <CheckCircle2 size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span><b>Clôture :</b> {s.notes}</span>
            </div>
          )}
          {s.photo_url && (
            <div style={{ marginTop: 10, borderRadius: 9, overflow: "hidden" }}>
              <img src={s.photo_url} alt="Photo" style={{ width: "100%", maxHeight: 160, objectFit: "cover" }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export function TabSignalements({ vehicule, driverType = "SCOLAIRE" }) {
  const [missions,     setMissions]     = useState([]);
  const [signalements, setSignalements] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeView,   setActiveView]   = useState("nouveau");
  const [toast,        setToast]        = useState({ msg: "", type: "success" });
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(null);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [expandedId,   setExpandedId]   = useState(null);
  const fileRef = useRef();

  // Formulaire
  const [mode,      setMode]      = useState(null);
  const [cause,     setCause]     = useState("");
  const [contexte,  setContexte]  = useState(null);
  const [missionId, setMissionId] = useState("");
  const [form, setForm] = useState({ description: "", passagers: "", blesses: false, actions_terrain: "" });
  const [localisation, setLocalisation] = useState("");
  const [geoState,  setGeoState]  = useState("idle");
  const [geoCoords, setGeoCoords] = useState(null);
  const [photo,        setPhoto]        = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errors,    setErrors]    = useState({});

  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };
  const showToast = useCallback((msg, type = "success") => setToast({ msg, type }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, sig] = await Promise.all([
        apiFetch("/reservations/?driver=me&status=APPROUVEE").catch(() => []),
        apiFetch("/maintenance/breakdowns/?driver=me").catch(() => []),
      ]);
      const m = Array.isArray(res) ? res : res?.results ?? [];
      m.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      setMissions(m);
      setSignalements(Array.isArray(sig) ? sig : sig?.results ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Géolocalisation
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      showToast("Géolocalisation non supportée sur cet appareil", "error");
      setGeoState("error");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGeoCoords({ lat, lng });
        setGeoState("success");
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
            { headers: { "User-Agent": "DRIVEPARC-IUC/1.0" } }
          );
          const data = await r.json();
          setLocalisation(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          setErrors(e => ({ ...e, localisation: "" }));
        } catch {
          setLocalisation(`GPS : ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      },
      err => {
        setGeoState("error");
        showToast(err.code === 1 ? "Accès refusé — saisissez manuellement." : "Impossible d'obtenir la position GPS.", "error");
      },
      { timeout: 12000, maximumAge: 60000 }
    );
  };

  // Photo
  const handlePhoto = file => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast("Photo trop volumineuse (max 10 Mo)", "error"); return; }
    setPhoto(file);
    const r = new FileReader(); r.onload = e => setPhotoPreview(e.target.result); r.readAsDataURL(file);
  };

  // Reset complet
  const resetForm = useCallback(() => {
    setMode(null); setCause(""); setContexte(null); setMissionId("");
    setForm({ description: "", passagers: "", blesses: false, actions_terrain: "" });
    setLocalisation(""); setGeoState("idle"); setGeoCoords(null);
    setPhoto(null); setPhotoPreview(null); setErrors({});
    setSubmitted(null); setShowSOSModal(false);
  }, []);

  // Validation
  const validate = () => {
    const e = {};
    if (!cause)                    e.cause        = "Sélectionnez la cause.";
    if (!form.description.trim())  e.description  = "Décrivez l'incident.";
    if (!localisation.trim())      e.localisation = "Indiquez votre position.";
    if (driverType === "SCOLAIRE" && !contexte) e.contexte = "Précisez le contexte.";
    if (contexte === "MISSION" && !missionId)   e.missionId = "Sélectionnez la mission.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmitTrigger = () => {
    if (!validate()) return;
    if (mode === "IMMOBILISATION") setShowSOSModal(true);
    else doSubmit();
  };

  const doSubmit = async () => {
    setShowSOSModal(false);
    setSubmitting(true);
    try {
      const allCauses = [...CAUSES_IMMOBILISATION, ...CAUSES_INCIDENT];
      const causeLabel = allCauses.find(c => c.val === cause)?.label || cause;

      let vehicleId    = vehicule?.id || "";
      let vehicleLabel = vehicule ? `${vehicule.make || ""} ${vehicule.model || ""} ${vehicule.registration_number || vehicule.license_plate || ""}`.trim() : "";

      if (contexte === "MISSION" && missionId) {
        const m = missions.find(x => String(x.id) === String(missionId));
        if (m?.vehicle_id) vehicleId = m.vehicle_id;
        if (m?.vehicle_name && m.vehicle_name !== "Non assigné") vehicleLabel = m.vehicle_name;
      }

      const notesLines = [
        `Passagers à bord : ${form.passagers || 0}`,
        form.blesses ? "BLESSÉS SIGNALÉS" : "Conducteur indemne",
        form.actions_terrain ? `Actions terrain : ${form.actions_terrain}` : null,
        geoCoords ? `Coordonnées GPS : ${geoCoords.lat.toFixed(6)}, ${geoCoords.lng.toFixed(6)}` : null,
        contexte ? `Contexte : ${contexte === "TRANSPORT" ? "Transport scolaire habituel" : "Mission assignée"}` : null,
      ].filter(Boolean).join("\n");

      const fd = new FormData();
      fd.append("title",       causeLabel);
      fd.append("vehicle",     vehicleId);
      fd.append("description", form.description);
      fd.append("location",    localisation);
      fd.append("severity",    mode === "IMMOBILISATION" ? "CRITIQUE" : "MOYENNE");
      fd.append("category",    mode);
      fd.append("notes",       notesLines);
      if (missionId) fd.append("reservation", missionId);
      if (photo)     fd.append("photo", photo);

      const result = await apiFetch("/maintenance/breakdowns/", { method: "POST", body: fd });

      setSubmitted({ mode, ticketRef: result?.id || result?.reference || null, vehicleLabel: vehicleLabel || "—" });
      showToast(mode === "IMMOBILISATION" ? "SOS envoyé — le gestionnaire est alerté !" : "Incident signalé avec succès", mode === "IMMOBILISATION" ? "urgence" : "success");
      load();
    } catch (e) {
      showToast("Erreur : " + e.message, "error");
    } finally { setSubmitting(false); }
  };

  const selectedMission = missions.find(m => String(m.id) === String(missionId));
  const pendingCount    = signalements.filter(s => !["REPARE","NON_REPARABLE"].includes(s.status)).length;
  const allCauses       = [...CAUSES_IMMOBILISATION, ...CAUSES_INCIDENT];
  const causeLabel      = allCauses.find(c => c.val === cause)?.label || "";

  // Détermine le numéro d'étape affiché pour la section détails
  const detailStep = driverType === "SCOLAIRE"
    ? (contexte === "MISSION" ? "5" : "4")
    : "4";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 12 }}>
      <div style={{ width: 26, height: 26, border: `3px solid ${P.green}`, borderTopColor: "transparent", borderRadius: "50%", animation: "s-spin .8s linear infinite" }} />
      <span style={{ fontSize: 13, color: P.textLight }}>Chargement…</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "inherit" }}>
      <style>{CSS}</style>
      <Toast msg={toast.msg} type={toast.type} onDone={() => setToast({ msg: "" })} />

      {showSOSModal && (
        <ModalConfirmSOS
          causeLabel={causeLabel}
          onConfirm={doSubmit}
          onCancel={() => setShowSOSModal(false)}
          submitting={submitting}
        />
      )}

      {/* ── EN-TÊTE ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: P.text, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertOctagon size={20} color={P.red} /> Signalement d'Urgence
          </h2>
          <p style={{ fontSize: 12, color: P.textLight, margin: "4px 0 0" }}>Panne, accident, incident sur la route</p>
        </div>
        {vehicule && (
          <div style={{ background: P.greenLight, border: `1px solid ${P.green}20`, borderRadius: 9, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <Car size={16} color={P.green} />
            <div>
              <div style={{ fontSize: 10, color: P.textMid, fontWeight: 700 }}>Mon véhicule</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: P.green, fontFamily: "monospace" }}>
                {vehicule.registration_number || vehicule.license_plate}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ONGLETS ── */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { id: "nouveau",    label: "Signaler un incident", Icon: AlertTriangle },
          { id: "historique", label: "Mes signalements",     Icon: History, badge: pendingCount },
        ].map(t => (
          <button key={t.id}
            onClick={() => { setActiveView(t.id); setSubmitted(null); }}
            style={{
              padding: "9px 20px", borderRadius: 9, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", border: "none",
              display: "flex", alignItems: "center", gap: 6,
              background: activeView === t.id ? P.green : "#fff",
              color:      activeView === t.id ? "#fff"  : P.textMid,
              boxShadow:  activeView === t.id ? `0 4px 14px ${P.green}40` : "0 1px 3px rgba(0,0,0,.06)",
            }}>
            <t.Icon size={14} />
            {t.label}
            {t.badge > 0 && (
              <span style={{ background: P.red, color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 800, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════ NOUVEAU SIGNALEMENT ════════ */}
      {activeView === "nouveau" && (
        <>
          {submitted && (
            <EcranSucces
              mode={submitted.mode}
              ticketRef={submitted.ticketRef}
              vehicleLabel={submitted.vehicleLabel}
              onNewReport={resetForm}
              onHistory={() => { setActiveView("historique"); setSubmitted(null); }}
            />
          )}

          {!submitted && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }} className="s-grid-2">

              {/* ── Formulaire ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* STEP 1 — Type */}
                <div className="s-card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: P.text, marginBottom: 4 }}>1. Que se passe-t-il ?</div>
                  <div style={{ fontSize: 11, color: P.textLight, marginBottom: 16 }}>Choisissez la situation qui correspond à votre cas</div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {/* Immobilisation */}
                    <button
                      className={`s-type-btn${mode === "IMMOBILISATION" ? " sel-red" : ""}`}
                      onClick={() => { setMode("IMMOBILISATION"); setCause(""); setErrors(e => ({ ...e, cause: "" })); }}>
                      <Siren size={32} color={mode === "IMMOBILISATION" ? P.red : P.textLight} style={{ marginBottom: 8 }} />
                      <div style={{ fontSize: 14, fontWeight: 800, color: mode === "IMMOBILISATION" ? P.red : P.text, marginBottom: 6 }}>Immobilisation</div>
                      <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.5, marginBottom: 10 }}>
                        Le véhicule <strong>ne peut plus rouler</strong>. Accident, panne totale, incendie.
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 4,
                        background: mode === "IMMOBILISATION" ? "#fff" : P.red, color: mode === "IMMOBILISATION" ? P.red : "#fff" }}>
                        {mode === "IMMOBILISATION" ? <><Check size={10} /> Sélectionné</> : <><ArrowRight size={10} /> Urgence SOS</>}
                      </div>
                    </button>

                    {/* Incident mineur */}
                    <button
                      className={`s-type-btn${mode === "INCIDENT" ? " sel-orng" : ""}`}
                      onClick={() => { setMode("INCIDENT"); setCause(""); setErrors(e => ({ ...e, cause: "" })); }}>
                      <Wrench size={32} color={mode === "INCIDENT" ? P.orange : P.textLight} style={{ marginBottom: 8 }} />
                      <div style={{ fontSize: 14, fontWeight: 800, color: mode === "INCIDENT" ? P.orange : P.text, marginBottom: 6 }}>Incident mineur</div>
                      <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.5, marginBottom: 10 }}>
                        Le véhicule <strong>peut continuer</strong>. Rétro cassé, vitre brisée, crevaison.
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 4,
                        background: mode === "INCIDENT" ? "#fff" : P.orange, color: mode === "INCIDENT" ? P.orange : "#fff" }}>
                        {mode === "INCIDENT" ? <><Check size={10} /> Sélectionné</> : <><ArrowRight size={10} /> Signalement</>}
                      </div>
                    </button>
                  </div>
                  {errors.cause && <div style={{ fontSize: 11, color: P.red, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={11} /> {errors.cause}</div>}
                </div>

                {/* STEP 2 — Cause précise */}
                {mode && (
                  <div className="s-card s-slide" style={{ padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: P.text, marginBottom: 4 }}>2. Cause précise</div>
                    {mode === "IMMOBILISATION" && (
                      <div style={{ background: P.redLight, border: `1px solid ${P.redBorder}`, borderRadius: 9, padding: "10px 14px", marginBottom: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <Shield size={14} color={P.red} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ fontSize: 12, color: P.red, lineHeight: 1.5 }}>
                          <strong>Sécurité d'abord :</strong> si des blessés, appelez le <strong>15</strong> (SAMU) ou le <strong>17</strong> (Police) immédiatement.
                        </div>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {(mode === "IMMOBILISATION" ? CAUSES_IMMOBILISATION : CAUSES_INCIDENT).map(c => (
                        <button key={c.val} type="button"
                          onClick={() => { setCause(c.val); setErrors(e => ({ ...e, cause: "" })); }}
                          className={`s-cause-btn${cause === c.val ? (mode === "IMMOBILISATION" ? " sel-red" : " sel-orng") : ""}`}>
                          <c.Icon size={18} color={cause === c.val ? (mode === "IMMOBILISATION" ? P.red : P.orange) : P.textLight} style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: cause === c.val ? (mode === "IMMOBILISATION" ? P.red : P.orange) : P.text }}>
                            {c.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 3 — Contexte (scolaire uniquement) */}
                {mode && cause && driverType === "SCOLAIRE" && (
                  <div className="s-card s-slide" style={{ padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: P.text, marginBottom: 4 }}>3. Quel véhicule est concerné ?</div>
                    <div style={{ fontSize: 11, color: P.textLight, marginBottom: 14 }}>
                      L'incident concerne-t-il votre bus de transport habituel ou un véhicule de mission ?
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className={`s-ctx-btn${contexte === "TRANSPORT" ? " sel" : ""}`}
                        onClick={() => { setContexte("TRANSPORT"); setMissionId(""); setErrors(e => ({ ...e, contexte: "", missionId: "" })); }}>
                        <Bus size={24} color={contexte === "TRANSPORT" ? P.green : P.textLight} style={{ marginBottom: 6 }} />
                        <div style={{ fontSize: 13, fontWeight: 700, color: contexte === "TRANSPORT" ? P.green : P.text }}>Mon bus scolaire</div>
                        <div style={{ fontSize: 11, color: P.textLight, marginTop: 3, lineHeight: 1.5 }}>Transport d'élèves habituel</div>
                        {vehicule && (
                          <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: P.green, fontFamily: "monospace", background: P.greenLight, padding: "3px 8px", borderRadius: 6, display: "inline-block" }}>
                            {vehicule.registration_number || vehicule.license_plate}
                          </div>
                        )}
                      </button>
                      <button className={`s-ctx-btn${contexte === "MISSION" ? " sel" : ""}`}
                        onClick={() => { setContexte("MISSION"); setErrors(e => ({ ...e, contexte: "" })); }}>
                        <Map size={24} color={contexte === "MISSION" ? P.green : P.textLight} style={{ marginBottom: 6 }} />
                        <div style={{ fontSize: 13, fontWeight: 700, color: contexte === "MISSION" ? P.green : P.text }}>Véhicule de mission</div>
                        <div style={{ fontSize: 11, color: P.textLight, marginTop: 3, lineHeight: 1.5 }}>Autre véhicule assigné pour une mission</div>
                        {missions.length > 0 && (
                          <div style={{ marginTop: 8, fontSize: 10, color: P.textLight }}>
                            {missions.length} mission{missions.length > 1 ? "s" : ""} disponible{missions.length > 1 ? "s" : ""}
                          </div>
                        )}
                      </button>
                    </div>
                    {errors.contexte && <div style={{ fontSize: 11, color: P.red, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={11} /> {errors.contexte}</div>}
                  </div>
                )}

                {/* STEP 3b — Mission */}
                {mode && cause && (driverType === "POLYVALENT" || contexte === "MISSION") && (
                  <div className="s-card s-slide" style={{ padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: P.text, marginBottom: 4 }}>
                      {driverType === "SCOLAIRE" ? "4." : "3."} Mission en cours *
                    </div>
                    <div style={{ fontSize: 11, color: P.textLight, marginBottom: 12 }}>
                      Sélectionnez la mission lors de laquelle l'incident s'est produit
                    </div>
                    {missions.length === 0 ? (
                      <div style={{ background: P.orangeLight, borderRadius: 9, padding: "12px 14px", fontSize: 12, color: P.orange, display: "flex", gap: 8, alignItems: "center" }}>
                        <AlertTriangle size={14} /> Aucune mission approuvée en cours. Contactez le gestionnaire.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {missions.slice(0, 8).map(m => {
                          const sel = String(missionId) === String(m.id);
                          return (
                            <div key={m.id}
                              className={`s-mission-row${sel ? " sel" : ""}`}
                              onClick={() => { setMissionId(String(m.id)); setErrors(e => ({ ...e, missionId: "" })); }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: sel ? P.green : P.text }}>
                                    {m.requester_name || "Mission"} → {m.destination || "—"}
                                  </div>
                                  <div style={{ fontSize: 11, color: P.textLight, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                                    <Clock size={10} /> {fmtShort(m.start_date)}
                                    {m.vehicle_name && m.vehicle_name !== "Non assigné" && (
                                      <span style={{ fontWeight: 700, color: P.green, fontFamily: "monospace", fontSize: 10 }}>
                                        <Car size={10} style={{ display: "inline", marginRight: 3 }} />{m.vehicle_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {sel && <Check size={16} color={P.green} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {errors.missionId && <div style={{ fontSize: 11, color: P.red, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={11} /> {errors.missionId}</div>}

                    {selectedMission?.vehicle_name && selectedMission.vehicle_name !== "Non assigné" && (
                      <div style={{ marginTop: 12, background: P.greenLight, border: `1px solid ${P.greenBorder}`, borderRadius: 9, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                        <Car size={18} color={P.green} />
                        <div>
                          <div style={{ fontSize: 10, color: P.textMid, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>Véhicule de la mission</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: P.green, fontFamily: "monospace" }}>{selectedMission.vehicle_name}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP DÉTAILS */}
                {mode && cause && (driverType === "POLYVALENT" || contexte !== null) && (
                  <div className="s-card s-slide" style={{ padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: P.text, marginBottom: 16 }}>
                      {detailStep}. Détails de l'incident
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                      {/* Description */}
                      <div>
                        <label className="s-lbl">Ce qui s'est passé *</label>
                        <textarea
                          value={form.description}
                          onChange={e => setF("description", e.target.value)}
                          rows={4}
                          placeholder="Décrivez précisément l'incident : circonstances, symptômes, bruits anormaux, dommages visibles…"
                          className={`s-inp${errors.description ? " s-inp-err" : ""}`}
                          style={{ resize: "vertical", minHeight: 100 }}
                        />
                        {errors.description && <div style={{ fontSize: 11, color: P.red, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={10} /> {errors.description}</div>}
                      </div>

                      {/* Localisation */}
                      <div>
                        <label className="s-lbl">
                          Localisation exacte *
                          <span style={{ fontSize: 9, color: P.textLight, fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: 6 }}>pour que l'assistance puisse vous trouver</span>
                        </label>
                        <div style={{ marginBottom: 8 }}>
                          <GeoButton onLocate={handleGeolocate} geoState={geoState} />
                        </div>
                        <textarea
                          value={localisation}
                          onChange={e => { setLocalisation(e.target.value); setErrors(er => ({ ...er, localisation: "" })); }}
                          rows={2}
                          placeholder="Ex : Carrefour Ndokoti, km 12 Autoroute Douala-Yaoundé, Parking IUC Logbessou…"
                          className={`s-inp${errors.localisation ? " s-inp-err" : ""}`}
                          style={{ resize: "vertical" }}
                        />
                        {geoCoords && (
                          <div style={{ fontSize: 10, color: P.green, fontWeight: 600, marginTop: 3, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4 }}>
                            <MapPin size={10} /> {geoCoords.lat.toFixed(5)}, {geoCoords.lng.toFixed(5)}
                          </div>
                        )}
                        {errors.localisation && <div style={{ fontSize: 11, color: P.red, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={10} /> {errors.localisation}</div>}
                      </div>

                      {/* Passagers + Blessés */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label className="s-lbl">Passagers à bord</label>
                          <div style={{ position: "relative" }}>
                            <Users size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: P.textLight }} />
                            <input type="number" min="0" className="s-inp" value={form.passagers}
                              onChange={e => setF("passagers", e.target.value)}
                              placeholder="0" style={{ paddingLeft: 32 }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                          <div
                            onClick={() => setF("blesses", !form.blesses)}
                            style={{ padding: "10px 14px", borderRadius: 9, cursor: "pointer",
                              border: `1.5px solid ${form.blesses ? P.red : P.border}`,
                              background: form.blesses ? P.redLight : P.bg,
                              display: "flex", alignItems: "center", gap: 10, transition: "all .12s" }}>
                            <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: `2px solid ${form.blesses ? P.red : P.border}`, background: form.blesses ? P.red : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .12s" }}>
                              {form.blesses && <Check size={12} color="#fff" />}
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: form.blesses ? P.red : P.text }}>Des blessés</div>
                              <div style={{ fontSize: 10, color: P.textLight }}>Appel secours requis</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {form.blesses && (
                        <div className="s-fade" style={{ background: P.redLight, border: `1.5px solid ${P.redBorder}`, borderRadius: 9, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <Ambulance size={18} color={P.red} style={{ flexShrink: 0, marginTop: 2 }} />
                          <div style={{ fontSize: 12, color: P.red, lineHeight: 1.6 }}>
                            <strong>Appelez le 15 (SAMU) ou le 17 (Police) immédiatement</strong> pour les blessés. Ce signalement alertera aussi le gestionnaire.
                          </div>
                        </div>
                      )}

                      {/* Actions terrain */}
                      <div>
                        <label className="s-lbl">
                          Actions déjà prises
                          <span style={{ fontSize: 9, color: P.textLight, fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: 4 }}>(optionnel)</span>
                        </label>
                        <input className="s-inp" value={form.actions_terrain}
                          onChange={e => setF("actions_terrain", e.target.value)}
                          placeholder="Ex : Triangle posé, gyrophare allumé, roue de secours montée…" />
                      </div>

                      {/* Photo */}
                      <div>
                        <label className="s-lbl">Photo des dommages (recommandé)</label>
                        <div onClick={() => fileRef.current?.click()}
                          style={{ border: `2px dashed ${photo ? P.green : P.border}`, borderRadius: 10, padding: 16, cursor: "pointer", background: photo ? P.greenLight : P.bg, transition: "all .12s", display: "flex", alignItems: "center", gap: 14 }}>
                          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                            onChange={e => handlePhoto(e.target.files?.[0])} />
                          {photoPreview ? (
                            <>
                              <img src={photoPreview} alt="aperçu" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: P.green }}>{photo.name}</div>
                                <div style={{ fontSize: 11, color: P.textLight }}>{(photo.size / 1024).toFixed(0)} Ko</div>
                                <button onClick={e => { e.stopPropagation(); setPhoto(null); setPhotoPreview(null); }}
                                  style={{ marginTop: 4, fontSize: 11, color: P.red, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                                  <Trash2 size={11} /> Supprimer
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ width: 42, height: 42, borderRadius: 9, background: P.border + "60", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Camera size={20} color={P.textLight} />
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: P.textMid, fontWeight: 600 }}>Prenez une photo des dommages</div>
                                <div style={{ fontSize: 11, color: P.textLight, marginTop: 2 }}>JPG, PNG — max 10 Mo</div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* BOUTON ENVOI */}
                {mode && cause && (driverType === "POLYVALENT" || contexte !== null) && (
                  <button onClick={handleSubmitTrigger} disabled={submitting}
                    className={mode === "IMMOBILISATION" ? "s-sos-btn" : ""}
                    style={{
                      padding: "16px 24px", borderRadius: 10, border: "none",
                      background: mode === "IMMOBILISATION" ? P.red : P.green,
                      color: "#fff", fontSize: 14, fontWeight: 800,
                      cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
                      opacity: submitting ? 0.7 : 1,
                      boxShadow: mode === "IMMOBILISATION" ? `0 4px 24px ${P.red}60` : `0 4px 20px ${P.green}50`,
                    }}>
                    {submitting ? (
                      <>
                        <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "s-spin .8s linear infinite", display: "inline-block" }} />
                        Envoi en cours…
                      </>
                    ) : mode === "IMMOBILISATION"
                      ? <><Siren size={18} /> Envoyer le SOS — Urgence immédiate</>
                      : <><Send size={16} /> Envoyer le signalement</>}
                  </button>
                )}

                {/* Résumé erreurs */}
                {Object.keys(errors).length > 0 && (
                  <div className="s-fade" style={{ background: P.redLight, border: `1px solid ${P.redBorder}`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, color: P.red, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                      <AlertTriangle size={13} /> Corrigez les erreurs suivantes :
                    </div>
                    {Object.values(errors).filter(Boolean).map((e, i) => (
                      <div key={i} style={{ fontSize: 11, color: P.red, marginTop: 2 }}>• {e}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── SIDEBAR ── */}
              <div className="s-sidebar" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Urgences */}
                <div style={{ background: P.redLight, border: `1.5px solid ${P.redBorder}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: P.red, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Phone size={14} /> Numéros d'urgence
                  </div>
                  {[
                    { num: "15", label: "SAMU",     desc: "Urgences médicales",    Icon: Ambulance },
                    { num: "17", label: "Police",   desc: "Accidents de la route", Icon: Shield    },
                    { num: "18", label: "Pompiers", desc: "Incendie / Danger",     Icon: Flame     },
                  ].map(n => (
                    <div key={n.num} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${P.red}12` }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: P.red, minWidth: 28, fontFamily: "monospace" }}>{n.num}</div>
                      <n.Icon size={14} color={P.redLight === P.redLight ? P.red : "#fff"} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: P.text }}>{n.label}</div>
                        <div style={{ fontSize: 10, color: P.textLight }}>{n.desc}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 12, fontSize: 11, color: P.red, lineHeight: 1.6, display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                    En cas de blessés, appelez les secours <strong>avant</strong> ce formulaire.
                  </div>
                </div>

                {/* Guide */}
                <div className="s-card" style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Info size={14} color={P.green} /> Que faire en attendant ?
                  </div>
                  {[
                    { n: 1, text: "Mettez le triangle de signalisation (50 m en amont)" },
                    { n: 2, text: "Allumez les feux de détresse" },
                    { n: 3, text: "Faites descendre les passagers si danger immédiat" },
                    { n: 4, text: "Restez visible mais en sécurité hors de la chaussée" },
                    { n: 5, text: "Attendez les instructions du gestionnaire" },
                  ].map(s => (
                    <div key={s.n} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 9 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: P.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>
                        {s.n}
                      </div>
                      <span style={{ fontSize: 12, color: P.textMid, lineHeight: 1.5 }}>{s.text}</span>
                    </div>
                  ))}
                </div>

                {/* Signalements en cours */}
                {pendingCount > 0 && (
                  <div className="s-card" style={{ padding: "16px 18px" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: P.text, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={14} color={P.orange} /> En cours ({pendingCount})
                    </div>
                    {signalements.filter(s => !["REPARE","NON_REPARABLE"].includes(s.status)).slice(0, 3).map((s, i) => {
                      const st = STATUT_CFG[s.status] || STATUT_CFG.SIGNALE;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < 2 ? `1px solid ${P.border}` : "none" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: st.color, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: P.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title || "Incident"}</div>
                            <div style={{ fontSize: 10, color: P.textLight }}>{fmtShort(s.reported_date || s.created_at)}</div>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: st.color, background: st.bg, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>{st.label}</span>
                        </div>
                      );
                    })}
                    <button onClick={() => setActiveView("historique")}
                      style={{ marginTop: 8, width: "100%", padding: 7, border: `1px solid ${P.border}`, borderRadius: 7, background: P.bg, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: P.textMid, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <ArrowRight size={11} /> Voir tout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════ HISTORIQUE ════════ */}
      {activeView === "historique" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {[
              { label: "Total",      val: signalements.length,                                                                     color: P.blue,   Icon: FileText      },
              { label: "En attente", val: signalements.filter(s => ["SIGNALE","EN_ATTENTE"].includes(s.status)).length,             color: P.orange,  Icon: Clock         },
              { label: "En cours",   val: signalements.filter(s => ["EN_DIAGNOSTIC","EN_REPARATION"].includes(s.status)).length,    color: P.orange,  Icon: RefreshCw     },
              { label: "Clôturés",   val: signalements.filter(s => s.status === "REPARE").length,                                   color: P.green,   Icon: CheckCircle2  },
            ].map((k, i) => (
              <div key={i} className="s-card" style={{ padding: "14px 16px", textAlign: "center", borderTop: `3px solid ${k.color}` }}>
                <k.Icon size={18} color={k.color} style={{ margin: "0 auto 6px" }} />
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.val}</div>
                <div style={{ fontSize: 10, color: P.textLight, textTransform: "uppercase", letterSpacing: "1px", marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: P.blueLight, border: "1px solid #BFDBFE", borderRadius: 9, padding: "10px 14px", fontSize: 12, color: P.blue, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>Une fois votre véhicule rapatrié, le gestionnaire clôturera l'incident et créera une <strong>fiche de maintenance</strong> pour la réparation.</div>
          </div>

          {signalements.length === 0 ? (
            <div className="s-card" style={{ padding: "60px 20px", textAlign: "center" }}>
              <FileText size={40} color={P.border} style={{ margin: "0 auto 10px" }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>Aucun signalement enregistré</div>
              <div style={{ fontSize: 12, color: P.textLight, marginTop: 6 }}>Vos incidents signalés apparaîtront ici.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {signalements.map(s => (
                <CarteSignalement key={s.id} s={s}
                  expanded={expandedId === s.id}
                  onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}