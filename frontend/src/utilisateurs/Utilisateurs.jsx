// ─── src/utilisateurs/TabUtilisateurs.jsx ────────────────────────────────────
// v4 — corrections :
//  • Colonne "Véhicule" supprimée du tableau (visuel allégé)
//  • Icônes des écoles supprimées (affichaient ???? sur certains OS)
//  • school envoyé en CODE texte (ex: "3IAC"), pas en id numérique
//  • deptsFiltres filtre par d.school_code === form.school (code texte)
//  • isOcc directeur : comparaison par u.school === s.code
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Users, Car, Bus, Wrench, Search, Grid3X3, List,
  Eye, Pencil, Power, PowerOff, FileText,
  ChevronUp, ChevronDown, ChevronsUpDown, ShieldAlert,
  BadgeCheck, Clock, Phone, Mail,
  GraduationCap, Briefcase, AlertTriangle, Check,
  Printer, FileDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Plus,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import { C, S, M } from "../constants/index";
import { Empty, StatusBadge } from "../components/ui";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 24;

const LICENSE_CATS = ["A","B","C","D","E","BC","CD"];

const MATRICULE_PREFIX = {
  DIRECTEUR:  "IUC-DIR-",
  CHEF_DEPT:  "IUC-CHEF-",
  TECHNICIEN: "IUC-TECH-",
  CHAUFFEUR:  "IUC-CHAUF-",
  PERSONNEL:  "IUC-PERS-",
};

const PALETTE = {
  green:       "#1B5E37",
  greenMid:    "#16A34A",
  greenLight:  "#EAF4EE",
  red:         "#C0182A",
  redLight:    "#FDF0F1",
  orange:      "#D97706",
  orangeLight: "#FFFBEB",
  border:      "#E2E8E5",
  bg:          "#F7FAF8",
  text:        "#1A2820",
  textMid:     "#4A6358",
  textLight:   "#8EA99A",
};

const ROLE_MAP = {
  PERSONNEL:    { label:"Personnel",    bg:PALETTE.greenLight,  color:PALETTE.green    },
  CHAUFFEUR:    { label:"Chauffeur",    bg:PALETTE.greenLight,  color:PALETTE.greenMid },
  TECHNICIEN:   { label:"Technicien",   bg:PALETTE.orangeLight, color:PALETTE.orange   },
  GESTIONNAIRE: { label:"Gestionnaire", bg:"#F5F3FF",           color:"#7C3AED"        },
  ADMIN:        { label:"Admin",        bg:PALETTE.redLight,    color:PALETTE.red      },
};

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes usr-spin     { to { transform: rotate(360deg); } }
  @keyframes usr-shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes usr-slide-up { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes usr-fade-in  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes usr-pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }

  .ctx-menu {
    position:fixed; z-index:9999;
    background:#fff; border:1.5px solid ${PALETTE.border}; border-radius:10px;
    box-shadow:0 12px 36px rgba(0,0,0,.18);
    padding:6px; min-width:200px;
    animation:usr-slide-up .15s ease;
  }
  .ctx-item {
    display:flex; align-items:center; gap:9px;
    padding:8px 12px; border-radius:7px;
    cursor:pointer; font-size:12px; font-weight:600;
    color:${PALETTE.textMid}; transition:all .1s;
    border:none; background:none; width:100%; font-family:inherit; text-align:left;
  }
  .ctx-item:hover { background:${PALETTE.bg}; color:${PALETTE.text}; }
  .ctx-item.danger:hover { background:${PALETTE.redLight}; color:${PALETTE.red}; }
  .ctx-sep { height:1px; background:${PALETTE.border}; margin:4px 6px; }

  .usr-card {
    background:#fff; border-radius:12px; overflow:hidden;
    border:1.5px solid ${PALETTE.border};
    transition:transform .2s, box-shadow .2s, border-color .2s;
    display:flex; flex-direction:column;
    animation: usr-fade-in .2s ease both; position:relative;
  }
  .usr-card:hover { transform:translateY(-3px); box-shadow:0 12px 28px rgba(27,94,55,.1); border-color:${PALETTE.green}; }
  .usr-card.inactive { opacity:.65; }
  .usr-card.inactive:hover { transform:none; box-shadow:none; }
  .usr-card-body { padding:14px 16px; flex:1; display:flex; flex-direction:column; }
  .usr-card-actions { display:flex; gap:6px; margin-top:10px; opacity:0; transition:opacity .15s; flex-wrap:wrap; }
  .usr-card:hover .usr-card-actions { opacity:1; }
  .usr-card-btn {
    flex:1; padding:6px 8px; border:none; border-radius:7px;
    font-size:11px; font-weight:700; cursor:pointer;
    transition:all .12s; font-family:inherit;
    display:flex; align-items:center; justify-content:center; gap:4px;
  }

  .usr-kpi {
    padding:14px 18px; border-radius:12px; cursor:pointer;
    transition:all .18s; flex:1; min-width:130px;
    background:#fff; border:1.5px solid ${PALETTE.border};
    position:relative; overflow:hidden;
  }
  .usr-kpi::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--kpi-color,${PALETTE.green}); }
  .usr-kpi:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,.08); }
  .usr-kpi.active { background:var(--kpi-bg,${PALETTE.greenLight}); border-color:var(--kpi-color,${PALETTE.green}); }

  .skel {
    border-radius:6px;
    background:linear-gradient(90deg,${PALETTE.bg} 25%,#EAECEB 50%,${PALETTE.bg} 75%);
    background-size:200% 100%; animation:usr-shimmer 1.4s ease infinite;
  }

  .tr-usr:hover td { background:#FAFBFA; }
  .tr-usr td { transition:background .1s; cursor:pointer; }
  .tr-inactive td { opacity:.55; }

  .usr-confirm {
    background:#fff; border-radius:14px; padding:28px 32px;
    max-width:420px; width:92%;
    box-shadow:0 24px 60px rgba(0,0,0,.22);
    animation:usr-slide-up .2s cubic-bezier(.34,1.56,.64,1);
  }

  .usr-modal-wrap {
    background:#fff; border-radius:14px; width:100%; max-width:640px;
    max-height:92vh; display:flex; flex-direction:column;
    box-shadow:0 20px 60px rgba(0,0,0,.2);
    animation:usr-slide-up .2s ease;
  }

  .usr-inp {
    padding:8px 12px; border:1.5px solid ${PALETTE.border}; border-radius:7px;
    font-size:12px; font-family:inherit; color:${PALETTE.text};
    background:#fff; width:100%; outline:none; box-sizing:border-box;
    transition:border-color .15s, box-shadow .15s;
  }
  .usr-inp:focus { border-color:${PALETTE.green} !important; box-shadow:0 0 0 3px ${PALETTE.green}18 !important; }
  .usr-inp.err   { border-color:${PALETTE.red} !important; background:#FFF8F8 !important; }

  .phone-wrap { display:flex; border:1.5px solid ${PALETTE.border}; border-radius:7px; overflow:hidden; transition:border-color .15s; }
  .phone-wrap:focus-within { border-color:${PALETTE.green}; box-shadow:0 0 0 3px ${PALETTE.green}18; }
  .phone-wrap.err { border-color:${PALETTE.red} !important; }
  .phone-prefix { padding:8px 11px; background:${PALETTE.bg}; font-size:12px; font-weight:700; color:${PALETTE.green}; border-right:1.5px solid ${PALETTE.border}; display:flex; align-items:center; gap:4px; user-select:none; }
  .phone-input  { flex:1; padding:8px 12px; border:none; outline:none; font-size:12px; font-family:inherit; color:${PALETTE.text}; background:#fff; }

  .pick-item {
    border:1.5px solid ${PALETTE.border}; border-radius:9px; padding:10px 12px;
    cursor:pointer; transition:all .12s; display:flex; align-items:center;
    gap:9px; background:${PALETTE.bg};
  }
  .pick-item:hover { border-color:${PALETTE.green}; background:${PALETTE.greenLight}; }
  .pick-item.sel   { border-color:${PALETTE.green}; background:${PALETTE.greenLight}; }
  .pick-item.occ   { opacity:.4; cursor:not-allowed; }

  .pg-btn {
    width:32px; height:32px; border-radius:7px; border:1.5px solid ${PALETTE.border};
    background:#fff; color:${PALETTE.textMid}; font-size:12px; font-weight:700;
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    transition:all .12s; font-family:inherit;
  }
  .pg-btn:hover:not(:disabled) { background:${PALETTE.greenLight}; border-color:${PALETTE.green}; color:${PALETTE.green}; }
  .pg-btn.on  { background:${PALETTE.green}; border-color:${PALETTE.green}; color:#fff; }
  .pg-btn:disabled { opacity:.4; cursor:not-allowed; }

  .view-btn {
    width:34px; height:34px; border-radius:7px; border:1.5px solid ${PALETTE.border};
    background:#fff; display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:all .15s; color:${PALETTE.textLight};
  }
  .view-btn.on { background:${PALETTE.green}; border-color:${PALETTE.green}; color:#fff; }
  .view-btn:not(.on):hover { background:${PALETTE.greenLight}; color:${PALETTE.green}; border-color:${PALETTE.green}; }

  .th-sort { cursor:pointer; user-select:none; }
  .th-sort:hover { color:${PALETTE.green}; background:${PALETTE.greenLight}; }

  select {
    appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238EA99A' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 10px center; padding-right:28px !important;
  }
  input[type=date] { color:${PALETTE.text}!important; background:#fff!important; color-scheme:light; }

  .veh-badge {
    display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:99px;
    font-size:10px; font-weight:700; background:${PALETTE.greenLight}; color:${PALETTE.green}; font-family:monospace;
  }
  .veh-badge.bus { background:#EFF6FF; color:#1D4ED8; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmtDate = d => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })
  : "—";

const fmtDateTime = d => d
  ? new Date(d).toLocaleString("fr-FR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
  : "—";

const licenseStatus = expiry => {
  if (!expiry) return null;
  const days = Math.ceil((new Date(expiry) - new Date()) / 86400000);
  if (days < 0)   return { label:`Expiré (${fmtDate(expiry)})`, color:PALETTE.red,    bg:PALETTE.redLight,    level:"danger"  };
  if (days <= 30) return { label:`Expire dans ${days}j`,        color:PALETTE.orange,  bg:PALETTE.orangeLight, level:"warning" };
  return            { label:`Valide — ${fmtDate(expiry)}`,      color:PALETTE.greenMid,bg:PALETTE.greenLight,  level:"ok"      };
};

const validatePhone = phone => {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length !== 9)     return "9 chiffres requis (indicatif +237 exclu).";
  if (!d.startsWith("6")) return "Commence par 6 (ex: 699 000 000).";
  return "";
};

const validateLicense = num => {
  if (!num) return "Numéro de permis obligatoire.";
  if (num.length < 6)  return "Trop court (minimum 6 caractères).";
  if (num.length > 20) return "Trop long (maximum 20 caractères).";
  if (!/^[A-Z0-9\-]+$/i.test(num)) return "Lettres, chiffres et tirets uniquement.";
  return "";
};

const nextMatricule = (prefix, users) => {
  const existing = users
    .map(u => u.employee_id || "")
    .filter(id => id.startsWith(prefix))
    .map(id => parseInt(id.replace(prefix, "")) || 0);
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
};

const getPrefix = (role, ptype) => {
  if (role === "TECHNICIEN") return MATRICULE_PREFIX.TECHNICIEN;
  if (role === "CHAUFFEUR")  return MATRICULE_PREFIX.CHAUFFEUR;
  if (role === "PERSONNEL")  return ptype === "CHEF_DEPT" ? MATRICULE_PREFIX.CHEF_DEPT : MATRICULE_PREFIX.DIRECTEUR;
  return MATRICULE_PREFIX.PERSONNEL;
};

const timeAgo = dateStr => {
  if (!dateStr) return "Jamais connecté";
  const m = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (m < 1)  return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `Il y a ${d} jour${d > 1 ? "s" : ""}`;
  if (d < 30) return `Il y a ${Math.floor(d / 7)} semaine${Math.floor(d / 7) > 1 ? "s" : ""}`;
  return `Il y a ${Math.floor(d / 30)} mois`;
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT PDF INDIVIDUEL
// ─────────────────────────────────────────────────────────────────────────────
function exportUserPDF(u) {
  const roleLabel = ROLE_MAP[u.role]?.label || u.role;
  const now       = new Date().toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" });
  const ls        = licenseStatus(u.driver_profile?.license_expiry_date);

  const veh    = u.assigned_vehicle && typeof u.assigned_vehicle === "object"
    ? `${u.assigned_vehicle.registration_number} — ${u.assigned_vehicle.make} ${u.assigned_vehicle.model}` : null;
  const busVeh = u.driver_profile?.assigned_vehicle_info
    ? u.driver_profile.assigned_vehicle_info.registration_number : null;

  const rows = [
    ["Matricule",          u.employee_id || "—"],
    ["Prénom",             u.first_name  || "—"],
    ["Nom",                u.last_name   || "—"],
    ["Rôle",               roleLabel],
    ["Email",              u.email       || "—"],
    ["Téléphone",          u.phone ? `+237 ${u.phone}` : "—"],
    ["École",              u.school || "—"],
    ["Département",        u.department_name || "—"],
    ["Statut",             u.is_active ? "Actif" : "Inactif"],
    ["Date d'inscription", fmtDate(u.date_joined || u.created_at)],
    ["Dernière connexion", u.last_login ? fmtDateTime(u.last_login) : "Jamais"],
    ...(veh    ? [["Véhicule de fonction", veh]]    : []),
    ...(busVeh ? [["Bus scolaire assigné", busVeh]] : []),
    ...(u.driver_profile ? [
      ["N° permis",       u.driver_profile.license_number   || "—"],
      ["Catégorie",       u.driver_profile.license_category || "—"],
      ["Expiration permis", u.driver_profile.license_expiry_date ? fmtDate(u.driver_profile.license_expiry_date) : "—"],
      ["Expérience",      u.driver_profile.years_of_experience ? `${u.driver_profile.years_of_experience} an(s)` : "—"],
    ] : []),
  ];

  const specsHtml = rows.map(([label, val], i) => `
    <tr style="${i % 2 === 0 ? "" : "background:#F7FAF8"}">
      <td class="spec-key">${label}</td>
      <td class="spec-val">${val}</td>
    </tr>`).join("");

  const alertHtml = ls && ls.level !== "ok" ? `<div class="alert alert--${ls.level}">${ls.label}</div>` : "";

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Fiche — ${u.first_name} ${u.last_name}</title>
  <style>
    @page{size:A4 portrait;margin:18mm 15mm;}
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1A2820;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:3px solid #1B5E37;margin-bottom:20px;}
    .header-title{font-size:20px;font-weight:800;color:#1B5E37;}
    .header-sub{font-size:12px;color:#4A6358;margin-top:4px;font-weight:600;}
    .header-right{text-align:right;font-size:10px;color:#6B7280;line-height:1.6;}
    .header-right strong{font-size:13px;color:#1B5E37;display:block;}
    .hero{display:flex;gap:20px;margin-bottom:20px;align-items:center;}
    .avatar{width:80px;height:80px;border-radius:16px;background:#EAF4EE;color:#1B5E37;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;flex-shrink:0;}
    .hero-name{font-size:22px;font-weight:800;color:#1A2820;}
    .hero-sub{font-size:13px;color:#4A6358;margin-top:3px;}
    .badges{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;}
    .badge{padding:3px 11px;border-radius:99px;font-size:10px;font-weight:800;}
    .badge--active{background:#EAF4EE;color:#16A34A;}
    .badge--inactive{background:#F3F4F6;color:#6B7280;}
    .badge--role{background:#EAF4EE;color:#1B5E37;}
    .badge--orange{background:#FFFBEB;color:#D97706;}
    .alert{padding:9px 13px;border-radius:8px;font-size:11px;font-weight:700;margin-bottom:14px;}
    .alert--danger{background:#FDF0F1;color:#C0182A;border:1px solid #FECDD3;}
    .alert--warning{background:#FFFBEB;color:#D97706;border:1px solid #FDE68A;}
    .section-title{font-size:9px;font-weight:800;color:#8EA99A;text-transform:uppercase;letter-spacing:1.5px;margin:16px 0 10px;padding-bottom:6px;border-bottom:1.5px solid #E8EDEB;}
    table.specs{width:100%;border-collapse:collapse;}
    table.specs td{padding:7px 10px;border-bottom:1px solid #F0F4F2;vertical-align:middle;}
    td.spec-key{font-weight:700;color:#4A6358;font-size:10px;text-transform:uppercase;letter-spacing:.6px;width:42%;}
    td.spec-val{font-size:12px;color:#1A2820;font-weight:600;}
    .footer{margin-top:24px;padding-top:12px;border-top:1px solid #E8EDEB;font-size:9px;color:#9CA3AF;display:flex;justify-content:space-between;}
  </style></head><body>
  <div class="header">
    <div><div class="header-title">Fiche Collaborateur</div><div class="header-sub">${u.employee_id || ""} · ${roleLabel}</div></div>
    <div class="header-right"><strong>IUC Logbessou</strong>Service des RH<br>Imprimé le ${now}</div>
  </div>
  <div class="hero">
    <div class="avatar">${(u.first_name||"?")[0]}${(u.last_name||"")[0]}</div>
    <div>
      <div class="hero-name">${u.first_name} ${u.last_name}</div>
      <div class="hero-sub">${u.email}${u.phone ? ` · +237 ${u.phone}` : ""}</div>
      <div class="badges">
        <span class="badge badge--role">${roleLabel}</span>
        <span class="badge badge--${u.is_active ? "active" : "inactive"}">${u.is_active ? "Actif" : "Inactif"}</span>
        ${u.school ? `<span class="badge badge--orange">${u.school}</span>` : ""}
        ${u.department_name ? `<span class="badge" style="background:#F4F6F5;color:#4A6358;">${u.department_name}</span>` : ""}
      </div>
    </div>
  </div>
  ${alertHtml}
  <div class="section-title">Informations complètes</div>
  <table class="specs"><tbody>${specsHtml}</tbody></table>
  <div class="footer">
    <span>Document généré automatiquement — Système RH · IUC Logbessou</span>
    <span>${u.employee_id || ""}</span>
  </div>
  <script>window.onload=function(){window.print();};<\/script>
  </body></html>`;

  const blob = new Blob([html], { type:"text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  let iframe = document.getElementById("__usr_pdf_frame__");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "__usr_pdf_frame__";
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
    document.body.appendChild(iframe);
  }
  iframe.src = url;
  iframe.onload = () => {
    try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
    catch { alert("Autorisez les popups pour imprimer."); }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT XML
// ─────────────────────────────────────────────────────────────────────────────
const exportXML = users => {
  const rows = users.map(u => `
    <Row>
      <Cell><Data ss:Type="String">${u.employee_id||""}</Data></Cell>
      <Cell><Data ss:Type="String">${u.first_name||""}</Data></Cell>
      <Cell><Data ss:Type="String">${u.last_name||""}</Data></Cell>
      <Cell><Data ss:Type="String">${u.role||""}</Data></Cell>
      <Cell><Data ss:Type="String">${u.email||""}</Data></Cell>
      <Cell><Data ss:Type="String">${u.phone||""}</Data></Cell>
      <Cell><Data ss:Type="String">${u.school||""}</Data></Cell>
      <Cell><Data ss:Type="String">${u.is_active?"Actif":"Inactif"}</Data></Cell>
    </Row>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Utilisateurs"><Table>
    <Row><Cell><Data ss:Type="String">Matricule</Data></Cell><Cell><Data ss:Type="String">Prénom</Data></Cell><Cell><Data ss:Type="String">Nom</Data></Cell><Cell><Data ss:Type="String">Rôle</Data></Cell><Cell><Data ss:Type="String">Email</Data></Cell><Cell><Data ss:Type="String">Téléphone</Data></Cell><Cell><Data ss:Type="String">École</Data></Cell><Cell><Data ss:Type="String">Statut</Data></Cell></Row>
    ${rows}
  </Table></Worksheet>
</Workbook>`;
  const blob = new Blob([xml], { type:"application/vnd.ms-excel;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `utilisateurs_${new Date().toISOString().slice(0,10)}.xml`; a.click();
  URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT MENU
// ─────────────────────────────────────────────────────────────────────────────
function ContextMenu({ x, y, user, onClose, onView, onEdit, onToggle, onPrint }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const esc     = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", esc); };
  }, [onClose]);

  return (
    <div ref={ref} className="ctx-menu" style={{
      left: Math.min(x, window.innerWidth  - 220),
      top:  Math.min(y, window.innerHeight - 200),
    }}>
      <div style={{ padding:"6px 12px", fontSize:11, fontWeight:800, color:PALETTE.textLight, textTransform:"uppercase", letterSpacing:"1px" }}>
        {user.first_name} {user.last_name}
      </div>
      <div className="ctx-sep"/>
      <button className="ctx-item" onClick={() => { onView(user); onClose(); }}><Eye size={14}/> Voir la fiche</button>
      <button className="ctx-item" onClick={() => { onEdit(user); onClose(); }}><Pencil size={14}/> Modifier</button>
      <button className="ctx-item" onClick={() => { onPrint(user); onClose(); }}><Printer size={14}/> Imprimer la fiche PDF</button>
      <div className="ctx-sep"/>
      <button className="ctx-item danger" onClick={() => { onToggle(user); onClose(); }}>
        {user.is_active ? <><PowerOff size={14}/> Désactiver</> : <><Power size={14}/> Réactiver</>}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGES
// ─────────────────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const m = ROLE_MAP[role] || { label:role, bg:PALETTE.bg, color:PALETTE.textMid };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 9px", borderRadius:99, fontSize:11, fontWeight:700, background:m.bg, color:m.color }}>
      {m.label}
    </span>
  );
}

function StatusDot({ active }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700,
      background:active ? PALETTE.greenLight : PALETTE.bg, color:active ? PALETTE.greenMid : PALETTE.textLight }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:active ? PALETTE.greenMid : PALETTE.textLight, display:"inline-block",
        ...(active ? { animation:"usr-pulse 2s ease infinite" } : {}) }}/>
      {active ? "Actif" : "Inactif"}
    </span>
  );
}

function SubBadge({ user }) {
  if (user.role === "PERSONNEL" && user.personnel_type === "DIRECTEUR")
    return <span style={{ display:"inline-flex", gap:3, padding:"2px 7px", borderRadius:99, fontSize:9, fontWeight:800, background:PALETTE.greenLight, color:PALETTE.green }}>Directeur</span>;
  if (user.role === "PERSONNEL" && user.personnel_type === "CHEF_DEPT")
    return <span style={{ display:"inline-flex", gap:3, padding:"2px 7px", borderRadius:99, fontSize:9, fontWeight:800, background:PALETTE.bg, color:PALETTE.textMid }}>Chef dépt.</span>;
  if (user.role === "CHAUFFEUR" && user.driver_profile?.assignment_type === "BUS_SCOLAIRE")
    return <span style={{ display:"inline-flex", gap:3, padding:"2px 7px", borderRadius:99, fontSize:9, fontWeight:800, background:"#EFF6FF", color:"#1D4ED8" }}>Bus sco.</span>;
  if (user.role === "CHAUFFEUR")
    return <span style={{ display:"inline-flex", gap:3, padding:"2px 7px", borderRadius:99, fontSize:9, fontWeight:800, background:PALETTE.greenLight, color:PALETTE.green }}>Polyvalent</span>;
  return null;
}

function VehBadge({ user }) {
  if (user.role === "PERSONNEL" && user.assigned_vehicle && typeof user.assigned_vehicle === "object")
    return <span className="veh-badge"><Car size={10}/> {user.assigned_vehicle.registration_number}</span>;
  if (user.role === "CHAUFFEUR" && user.driver_profile?.assigned_vehicle_info)
    return <span className="veh-badge bus"><Bus size={10}/> {user.driver_profile.assigned_vehicle_info.registration_number}</span>;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background:"#fff", borderRadius:12, border:`1.5px solid ${PALETTE.border}`, padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div className="skel" style={{ width:42, height:42, borderRadius:"50%", flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div className="skel" style={{ height:13, width:"60%", marginBottom:7, borderRadius:4 }}/>
          <div className="skel" style={{ height:10, width:"40%", borderRadius:4 }}/>
        </div>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        <div className="skel" style={{ height:20, width:70, borderRadius:99 }}/>
        <div className="skel" style={{ height:20, width:56, borderRadius:99 }}/>
      </div>
      <div className="skel" style={{ height:10, width:"80%", marginBottom:6, borderRadius:4 }}/>
      <div className="skel" style={{ height:10, width:"60%", borderRadius:4 }}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM DIALOG
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmDialog({ icon, title, message, confirmLabel, danger=true, onConfirm, onCancel, loading }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onCancel]);
  return (
    <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="usr-confirm">
        <div style={{ fontSize:38, textAlign:"center", marginBottom:12 }}>{icon}</div>
        <div style={{ fontSize:17, fontWeight:800, color:PALETTE.text, textAlign:"center", marginBottom:8 }}>{title}</div>
        <div style={{ fontSize:12, color:PALETTE.textMid, textAlign:"center", lineHeight:1.7, marginBottom:24 }}>{message}</div>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button onClick={onCancel} style={S.ghostBtn}>Annuler</button>
          <button onClick={onConfirm} disabled={loading}
            style={{ ...S.btn, background:danger ? PALETTE.red : PALETTE.green, opacity:loading?.7:1, display:"flex", alignItems:"center", gap:6 }}>
            {loading ? <><span style={{ animation:"usr-spin .8s linear infinite", display:"inline-block" }}>⟳</span> En cours…</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DÉTAIL
// ─────────────────────────────────────────────────────────────────────────────
function ModalDetail({ user: u, onClose, onEdit, onPrint }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const ls = licenseStatus(u.driver_profile?.license_expiry_date);
  const av = ROLE_MAP[u.role] || {};

  const Stat = ({ label, children }) => (
    <div style={{ background:PALETTE.bg, borderRadius:9, padding:"10px 13px" }}>
      <div style={{ fontSize:9, color:PALETTE.textLight, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:700, color:PALETTE.text }}>{children || "—"}</div>
    </div>
  );

  return (
    <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="usr-modal-wrap">
        <div style={M.header}>
          <div style={{ display:"flex", alignItems:"center", gap:13 }}>
            <div style={{ width:48, height:48, borderRadius:11, flexShrink:0, background:av.bg||PALETTE.bg, color:av.color||PALETTE.textMid,
              display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16 }}>
              {(u.first_name||"?")[0]}{(u.last_name||"")[0]}
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:PALETTE.text }}>{u.first_name} {u.last_name}</div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4, flexWrap:"wrap" }}>
                <RoleBadge role={u.role}/><SubBadge user={u}/><StatusDot active={u.is_active}/>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => onPrint(u)} style={{ ...S.ghostBtn, fontSize:11, display:"flex", alignItems:"center", gap:5 }}><Printer size={13}/> PDF</button>
            <button onClick={() => onEdit(u)} style={{ ...S.btn, fontSize:11, display:"flex", alignItems:"center", gap:5 }}><Pencil size={13}/> Modifier</button>
            <button onClick={onClose} style={M.closeBtn}>✕</button>
          </div>
        </div>

        <div style={{ ...M.body, gap:12 }}>
          <div style={M.secTitle}>Informations personnelles</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10 }}>
            <Stat label="Matricule">
              <span style={{ fontFamily:"monospace", fontSize:12, color:PALETTE.green, background:PALETTE.greenLight, padding:"1px 7px", borderRadius:5 }}>{u.employee_id||"—"}</span>
            </Stat>
            <Stat label="Email"><a href={`mailto:${u.email}`} style={{ color:"#2563EB", textDecoration:"none", fontSize:12 }}>{u.email||"—"}</a></Stat>
            <Stat label="Téléphone">{u.phone ? `+237 ${u.phone}` : "—"}</Stat>
            <Stat label="Inscrit le">{fmtDate(u.date_joined||u.created_at)}</Stat>
            <Stat label="Dernière connexion">
              {u.last_login
                ? <div><div>{fmtDateTime(u.last_login)}</div><div style={{ fontSize:10, color:PALETTE.textLight, marginTop:2 }}>{timeAgo(u.last_login)}</div></div>
                : <span style={{ fontSize:12, color:PALETTE.textLight, fontStyle:"italic" }}>Jamais connecté</span>}
            </Stat>
          </div>

          {u.role === "PERSONNEL" && u.assigned_vehicle && typeof u.assigned_vehicle === "object" && (
            <>
              <div style={M.secTitle}>Véhicule de fonction</div>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:PALETTE.greenLight, borderRadius:9 }}>
                <Car size={18} color={PALETTE.green}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:PALETTE.green, fontFamily:"monospace" }}>{u.assigned_vehicle.registration_number}</div>
                  <div style={{ fontSize:11, color:PALETTE.textMid }}>{u.assigned_vehicle.make} {u.assigned_vehicle.model}</div>
                </div>
              </div>
            </>
          )}

          {u.role === "CHAUFFEUR" && u.driver_profile?.assigned_vehicle_info && (
            <>
              <div style={M.secTitle}>Bus scolaire assigné</div>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#EFF6FF", borderRadius:9 }}>
                <Bus size={18} color="#1D4ED8"/>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#1D4ED8", fontFamily:"monospace" }}>{u.driver_profile.assigned_vehicle_info.registration_number}</div>
                  <div style={{ fontSize:11, color:PALETTE.textMid }}>{u.driver_profile.assigned_vehicle_info.make} {u.driver_profile.assigned_vehicle_info.model}</div>
                </div>
              </div>
            </>
          )}

          {u.role === "PERSONNEL" && (
            <>
              <div style={M.secTitle}>Affectation</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10 }}>
                <Stat label="Type">{u.personnel_type === "DIRECTEUR" ? "Directeur" : "Chef dépt."}</Stat>
                <Stat label="École">{u.school || "—"}</Stat>
                {u.department_name && <Stat label="Département">{u.department_name}</Stat>}
              </div>
            </>
          )}

          {u.role === "CHAUFFEUR" && u.driver_profile && (
            <>
              <div style={M.secTitle}>Profil chauffeur</div>
              {ls && ls.level !== "ok" && (
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 13px", borderRadius:8,
                  background:ls.level==="danger"?PALETTE.redLight:PALETTE.orangeLight,
                  border:`1px solid ${ls.level==="danger"?"#FECDD3":"#FDE68A"}`,
                  fontSize:11, fontWeight:700, color:ls.level==="danger"?PALETTE.red:PALETTE.orange, marginBottom:8 }}>
                  <AlertTriangle size={14}/> {ls.label}
                </div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10 }}>
                <Stat label="Type">{u.driver_profile.assignment_type==="BUS_SCOLAIRE"?"Bus scolaire":"Polyvalent"}</Stat>
                <Stat label="N° permis"><span style={{ fontFamily:"monospace" }}>{u.driver_profile.license_number||"—"}</span></Stat>
                <Stat label="Catégorie">{u.driver_profile.license_category||"—"}</Stat>
                <Stat label="Expiration">
                  {ls ? <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:ls.bg, color:ls.color }}>{ls.label}</span> : "—"}
                </Stat>
                <Stat label="Expérience">{u.driver_profile.years_of_experience ? `${u.driver_profile.years_of_experience} an(s)` : "—"}</Stat>
              </div>
            </>
          )}

          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, paddingTop:12, borderTop:`1px solid ${PALETTE.border}` }}>
            <button onClick={onClose} style={S.ghostBtn}>Fermer</button>
            <button onClick={() => { onPrint(u); onClose(); }}
              style={{ ...S.ghostBtn, display:"flex", alignItems:"center", gap:5, borderColor:PALETTE.orange, color:PALETTE.orange }}>
              <Printer size={13}/> Imprimer PDF
            </button>
            <button onClick={() => { onClose(); onEdit(u); }} style={{ ...S.btn, display:"flex", alignItems:"center", gap:5 }}>
              <Pencil size={13}/> Modifier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, required, hint, error, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:11, fontWeight:700, color:PALETTE.textMid, textTransform:"uppercase", letterSpacing:".8px" }}>
        {label}{required && <span style={{ color:"#E11D48", marginLeft:2 }}>*</span>}
      </label>
      {children}
      {hint  && !error && <span style={{ fontSize:10, color:PALETTE.textLight }}>{hint}</span>}
      {error && <span style={{ fontSize:11, color:"#E11D48", fontWeight:600, display:"flex", alignItems:"center", gap:3 }}>⚠ {error}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL FORMULAIRE
// ─────────────────────────────────────────────────────────────────────────────
function UserModal({ initial, tourismVeh, busVehicles, departments, schoolsList, users, onSave, onClose, saving, apiError }) {
  const isEdit = !!initial;

  const [role,          setRole]          = useState(initial?.role || "PERSONNEL");
  const [personnelType, setPersonnelType] = useState(initial?.personnel_type || "DIRECTEUR");
  const [driverType,    setDriverType]    = useState(initial?.driver_profile?.assignment_type || "POOL");

  const [form, setForm] = useState({
    employee_id:         initial?.employee_id || "",
    first_name:          initial?.first_name  || "",
    last_name:           initial?.last_name   || "",
    email:               initial?.email       || "",
    password:            "",
    phone:               initial?.phone       || "",
    // ✅ school stocke le CODE texte (ex: "3IAC"), pas l'id
    school:              initial?.school      || "",
    department:          String(initial?.department || ""),
    assigned_vehicle:    initial?.assigned_vehicle?.id ?? null,
    license_number:      initial?.driver_profile?.license_number      || "",
    license_category:    initial?.driver_profile?.license_category    || "B",
    license_expiry_date: initial?.driver_profile?.license_expiry_date || "",
    years_of_experience: String(initial?.driver_profile?.years_of_experience || ""),
    assigned_bus:        initial?.driver_profile?.assigned_vehicle?.id ?? null,
  });

  const [errors,  setErrors]  = useState({});
  const [touched, setTouched] = useState({});
  const [matDupe, setMatDupe] = useState(false);

  const setF = (k, v) => { setForm(f => ({ ...f, [k]:v })); setErrors(e => { const n={...e}; delete n[k]; return n; }); };
  const touch = k => setTouched(t => ({ ...t, [k]:true }));

  useEffect(() => {
    if (isEdit) return;
    setForm(f => ({ ...f, employee_id: nextMatricule(getPrefix(role, personnelType), users) }));
  }, [role, personnelType]); // eslint-disable-line

  useEffect(() => {
    const id   = form.employee_id;
    const dupe = id ? users.some(u => u.id !== initial?.id && u.employee_id === id) : false;
    setMatDupe(dupe);
    if (dupe) setErrors(e => ({ ...e, employee_id:"Ce matricule est déjà utilisé." }));
    else      setErrors(e => { const n={...e}; delete n.employee_id; return n; });
  }, [form.employee_id]); // eslint-disable-line

  // ✅ Comparaisons school par CODE TEXTE
  const schoolTaken = role==="PERSONNEL" && personnelType==="DIRECTEUR" && form.school
    ? users.some(u => u.id!==initial?.id && u.role==="PERSONNEL" && u.personnel_type==="DIRECTEUR" && u.school===form.school && u.is_active)
    : false;

  const deptTaken = role==="PERSONNEL" && personnelType==="CHEF_DEPT" && form.department
    ? users.some(u => u.id!==initial?.id && u.role==="PERSONNEL" && u.personnel_type==="CHEF_DEPT" && String(u.department)===form.department && u.is_active)
    : false;

  const emailTaken = form.email
    ? users.some(u => u.id!==initial?.id && u.email?.toLowerCase()===form.email.toLowerCase())
    : false;

  // ✅ CORRECTION CLEF : filtrage par school_code (exposé par DepartmentSerializer)
  const deptsFiltres = useMemo(() => {
    if (!form.school) return [];
    const schoolDepts = departments.filter(d =>
      d.school_code === form.school ||   // ✅ DepartmentSerializer expose school_code
      d.school === form.school           // fallback ancien CharField
    );
    return schoolDepts.map(d => ({
      ...d,
      isTaken: users.some(u =>
        u.id !== initial?.id &&
        u.role === "PERSONNEL" &&
        u.personnel_type === "CHEF_DEPT" &&
        String(u.department) === String(d.id) &&
        u.is_active
      ),
    }));
  }, [form.school, departments, users, initial?.id]);

  const tourismDispo = tourismVeh.filter(v => !v.director_user_id || v.director_user_id===initial?.id);

  const validate = () => {
    const e = {};
    const prefix = getPrefix(role, personnelType);
    if (!form.employee_id.trim()) e.employee_id = "Matricule obligatoire.";
    else if (!form.employee_id.startsWith(prefix)) e.employee_id = `Doit commencer par "${prefix}".`;
    else if (matDupe) e.employee_id = "Matricule déjà utilisé.";
    if (!form.first_name.trim()) e.first_name = "Prénom obligatoire.";
    if (!form.last_name.trim())  e.last_name  = "Nom obligatoire.";
    if (!form.email.trim()) e.email = "Email obligatoire.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Format invalide.";
    else if (emailTaken) e.email = "Email déjà utilisé.";
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) e.phone = phoneErr;
    if (role === "PERSONNEL") {
      if (!form.school) e.school = "École obligatoire.";
      else if (schoolTaken) e.school = "Cette école a déjà un directeur actif.";
      if (personnelType === "CHEF_DEPT") {
        if (!form.department) e.department = "Département obligatoire.";
        else if (deptTaken) e.department = "Ce département a déjà un chef actif.";
      }
    }
    if (role === "CHAUFFEUR") {
      const licErr = validateLicense(form.license_number);
      if (licErr) e.license_number = licErr;
      if (!form.license_expiry_date) e.license_expiry_date = "Date d'expiration obligatoire.";
    }
    return e;
  };

  const handleSubmit = e => {
    e.preventDefault();
    const allKeys = ["employee_id","first_name","last_name","email","phone","school","department","license_number","license_expiry_date"];
    setTouched(Object.fromEntries(allKeys.map(k => [k, true])));
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const data = {
      employee_id:    form.employee_id.trim(),
      first_name:     form.first_name.trim(),
      last_name:      form.last_name.trim(),
      email:          form.email.trim().toLowerCase(),
      phone:          form.phone.trim(),
      role,
      personnel_type: role === "PERSONNEL" ? personnelType : "",
      // ✅ on envoie le CODE texte — le backend Django attend un CharField avec choices
      school:         role === "PERSONNEL" ? form.school : "",
      department:     role === "PERSONNEL" && personnelType === "CHEF_DEPT" ? form.department : "",
      assigned_vehicle: role === "PERSONNEL" && personnelType === "DIRECTEUR" ? form.assigned_vehicle : null,
    };
    if (form.password) data.password = form.password;
    if (role === "CHAUFFEUR") {
      data.driver_assignment_type = driverType;
      data.license_number         = form.license_number.trim();
      data.license_category       = form.license_category;
      data.license_expiry_date    = form.license_expiry_date;
      data.years_of_experience    = parseInt(form.years_of_experience) || 0;
      data.assigned_bus           = driverType === "BUS_SCOLAIRE" ? form.assigned_bus : null;
    }
    onSave(data);
  };

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const errCount = Object.keys(errors).length;
  const ls = licenseStatus(form.license_expiry_date);

  const inp = key => ({
    ...S.search, width:"100%",
    borderColor: touched[key] && errors[key] ? "#E11D48" : PALETTE.border,
    background:  touched[key] && errors[key] ? "#FFF8F8" : "#fff",
  });

  const TypeBtn = ({ val, icon: Icon, label, desc, current, onClick, activeColor = PALETTE.green, activeBg }) => {
    const sel = current === val;
    return (
      <button type="button" onClick={onClick}
        style={{ flex:1, padding:"11px 8px", borderRadius:9, cursor:"pointer",
          border:`1.5px solid ${sel ? activeColor : PALETTE.border}`,
          background: sel ? (activeBg || PALETTE.greenLight) : PALETTE.bg,
          display:"flex", flexDirection:"column", alignItems:"center", gap:4,
          transition:"all .15s", fontFamily:"inherit" }}>
        <Icon size={22} color={sel ? activeColor : PALETTE.textLight}/>
        <span style={{ fontSize:11, fontWeight:700, color:sel ? activeColor : PALETTE.textMid }}>{label}</span>
        {desc && <span style={{ fontSize:9, color:PALETTE.textLight, textAlign:"center", lineHeight:1.3 }}>{desc}</span>}
      </button>
    );
  };

  return (
    <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="usr-modal-wrap" style={{ maxWidth:640 }}>
        <div style={M.header}>
          <div>
            <div style={M.title}>{isEdit ? `Modifier — ${initial.first_name} ${initial.last_name}` : "Nouvel utilisateur"}</div>
            <div style={{ fontSize:11, color:PALETTE.textLight, marginTop:2 }}>
              {isEdit ? "Modifiez uniquement les champs qui changent" : "Remplissez les informations ci-dessous"}
            </div>
          </div>
          <button onClick={onClose} style={M.closeBtn}>✕</button>
        </div>

        {apiError && (
          <div style={{ background:PALETTE.redLight, borderBottom:`1px solid #FECDD3`, padding:"10px 20px", fontSize:12, color:PALETTE.red, display:"flex", gap:8 }}>
            <AlertTriangle size={15} style={{ flexShrink:0, marginTop:1 }}/> <b>Erreur :</b> {apiError}
          </div>
        )}

        {errCount > 0 && Object.keys(touched).length > 0 && (
          <div style={{ background:PALETTE.redLight, borderBottom:`1px solid #fca5a5`, padding:"9px 22px", fontSize:11, color:PALETTE.red, display:"flex", gap:7, alignItems:"flex-start" }}>
            <AlertTriangle size={13} style={{ marginTop:1 }}/>
            <div><b>{errCount} erreur{errCount>1?"s":""} :</b> {Object.values(errors).join(" — ")}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={M.body}>

          {/* RÔLE */}
          <div style={M.secTitle}>Rôle</div>
          <div style={{ display:"flex", gap:10 }}>
            <TypeBtn val="PERSONNEL"  icon={Briefcase} label="Personnel"  current={role} onClick={() => setRole("PERSONNEL")}  activeColor={PALETTE.green}   activeBg={PALETTE.greenLight}/>
            <TypeBtn val="CHAUFFEUR"  icon={Car}        label="Chauffeur"  current={role} onClick={() => setRole("CHAUFFEUR")}  activeColor={PALETTE.greenMid} activeBg={PALETTE.greenLight}/>
            <TypeBtn val="TECHNICIEN" icon={Wrench}     label="Technicien" current={role} onClick={() => setRole("TECHNICIEN")} activeColor={PALETTE.orange}   activeBg={PALETTE.orangeLight}/>
          </div>

          {/* TYPE PERSONNEL */}
          {role === "PERSONNEL" && (
            <>
              <div style={M.secTitle}>Type de personnel</div>
              <div style={M.grid2}>
                <TypeBtn val="DIRECTEUR" icon={GraduationCap} label="Directeur d'école"  desc="Véhicule de fonction possible" current={personnelType} onClick={() => setPersonnelType("DIRECTEUR")} activeColor={PALETTE.green} activeBg={PALETTE.greenLight}/>
                <TypeBtn val="CHEF_DEPT" icon={Briefcase}     label="Chef de département" desc="Responsable d'un département"  current={personnelType} onClick={() => setPersonnelType("CHEF_DEPT")}  activeColor={PALETTE.textMid} activeBg={PALETTE.bg}/>
              </div>
            </>
          )}

          {/* TYPE CHAUFFEUR */}
          {role === "CHAUFFEUR" && (
            <>
              <div style={M.secTitle}>Type de chauffeur</div>
              <div style={M.grid2}>
                <TypeBtn val="POOL"         icon={Car} label="Polyvalent"   desc="Toutes les réservations" current={driverType} onClick={() => setDriverType("POOL")}         activeColor={PALETTE.green} activeBg={PALETTE.greenLight}/>
                <TypeBtn val="BUS_SCOLAIRE" icon={Bus} label="Bus scolaire" desc="Ramassage exclusif"      current={driverType} onClick={() => setDriverType("BUS_SCOLAIRE")} activeColor={"#1D4ED8"}    activeBg={"#EFF6FF"}/>
              </div>
            </>
          )}

          {/* IDENTITÉ */}
          <div style={M.secTitle}>Informations personnelles</div>
          <Field label="Matricule" required error={touched.employee_id && errors.employee_id} hint={`Préfixe attendu : ${getPrefix(role, personnelType)}`}>
            <input value={form.employee_id} onChange={e => setF("employee_id", e.target.value.toUpperCase())} onBlur={() => touch("employee_id")}
              placeholder={`${getPrefix(role, personnelType)}001`} style={{ ...inp("employee_id"), fontFamily:"monospace", fontWeight:700, letterSpacing:".5px" }}/>
          </Field>

          <div style={M.grid2}>
            <Field label="Prénom" required error={touched.first_name && errors.first_name}>
              <input value={form.first_name} onChange={e => setF("first_name",e.target.value)} onBlur={() => touch("first_name")} placeholder="Jean" style={inp("first_name")}/>
            </Field>
            <Field label="Nom" required error={touched.last_name && errors.last_name}>
              <input value={form.last_name} onChange={e => setF("last_name",e.target.value)} onBlur={() => touch("last_name")} placeholder="KAMGA" style={inp("last_name")}/>
            </Field>
            <Field label="Email" required error={touched.email && errors.email} hint="Format : prenom.nom@iuc.cm">
              <input type="email" value={form.email} onChange={e => setF("email",e.target.value)} onBlur={() => touch("email")} placeholder="jean.kamga@iuc.cm" style={inp("email")}/>
            </Field>
            <Field label="Téléphone" error={touched.phone && errors.phone} hint="+237 · 9 chiffres · commence par 6">
              <div className={`phone-wrap${touched.phone && errors.phone ? " err" : ""}`}>
                <div className="phone-prefix">+237</div>
                <input className="phone-input" value={form.phone} onChange={e => setF("phone",e.target.value.replace(/\D/g,"").slice(0,9))} onBlur={() => touch("phone")} placeholder="6XX XXX XXX" maxLength={9} inputMode="numeric"/>
              </div>
            </Field>
          </div>

          {/* MOT DE PASSE */}
          <div style={M.secTitle}>Sécurité</div>
          <Field label={isEdit ? "Nouveau mot de passe" : "Mot de passe"} hint={isEdit ? "Laisser vide = inchangé" : "Défaut si vide : driveparc2026!"}>
            <input type="password" value={form.password} onChange={e => setF("password",e.target.value)} placeholder={isEdit?"Laisser vide = inchangé":"driveparc2026!"} style={inp("password")}/>
          </Field>

          {/* ÉCOLE */}
          {role === "PERSONNEL" && (
            <>
              <div style={M.secTitle}>{personnelType==="DIRECTEUR" ? "École dirigée" : "École du département"}</div>

              {schoolTaken && touched.school && (
                <div style={{ background:PALETTE.redLight, border:`1px solid #fca5a5`, borderRadius:8, padding:"9px 13px", fontSize:11, color:PALETTE.red, display:"flex", alignItems:"center", gap:6 }}>
                  <AlertTriangle size={12}/> Cette école a déjà un directeur actif.
                </div>
              )}

              {schoolsList.length === 0 ? (
                <div style={{ background:PALETTE.orangeLight, border:`1px solid #FDE68A`, borderRadius:8, padding:"10px 13px", fontSize:11, color:PALETTE.orange }}>
                  Aucune école enregistrée. Créez-en dans les Paramètres.
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                  {schoolsList.map(s => {
                    const color = s.color || PALETTE.green;
                    // ✅ comparaison par CODE texte
                    const sel   = form.school === s.code;
                    const isOcc = personnelType==="DIRECTEUR" && users.some(u =>
                      u.id !== initial?.id &&
                      u.role === "PERSONNEL" &&
                      u.personnel_type === "DIRECTEUR" &&
                      u.school === s.code &&   // ✅ code texte
                      u.is_active
                    );
                    return (
                      <button key={s.id} type="button" disabled={isOcc}
                        onClick={() => {
                          if (!isOcc) {
                            setF("school", s.code);   // ✅ stocker le CODE
                            setF("department", "");
                            touch("school");
                          }
                        }}
                        style={{ padding:"12px 8px", borderRadius:9, cursor:isOcc?"not-allowed":"pointer",
                          border:`1.5px solid ${sel ? color : isOcc?"#E5E5E5":PALETTE.border}`,
                          background: sel ? color+"18" : isOcc?"#F9F9F9":PALETTE.bg,
                          display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                          opacity:isOcc?.4:1, transition:"all .13s", fontFamily:"inherit", position:"relative" }}>
                        {isOcc && (
                          <span style={{ position:"absolute", top:4, right:4, background:PALETTE.orange, color:"#fff", borderRadius:4, fontSize:8, fontWeight:800, padding:"1px 4px" }}>Pris</span>
                        )}
                        {/* ✅ PAS D'ICÔNE — affiche uniquement le nom et le code */}
                        <span style={{ fontSize:12, fontWeight:800, color:sel?color:isOcc?"#BBB":PALETTE.text }}>{s.name}</span>
                        {s.code && (
                          <span style={{ fontSize:9, color:sel?color:PALETTE.textLight, fontWeight:700, letterSpacing:"1px", fontFamily:"monospace" }}>{s.code}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {touched.school && errors.school && (
                <span style={{ fontSize:11, color:"#E11D48", fontWeight:600 }}>⚠ {errors.school}</span>
              )}

              {/* DÉPARTEMENT */}
              {personnelType === "CHEF_DEPT" && (
                <>
                  <div style={M.secTitle}>Département</div>
                  {!form.school ? (
                    <div style={{ background:PALETTE.orangeLight, border:`1px solid #FDE68A`, borderRadius:8, padding:"10px 13px", fontSize:11, color:PALETTE.orange, display:"flex", alignItems:"center", gap:7 }}>
                      <AlertTriangle size={13}/> Sélectionnez d'abord une école.
                    </div>
                  ) : deptsFiltres.length === 0 ? (
                    <div style={{ background:PALETTE.orangeLight, border:`1px solid #FDE68A`, borderRadius:8, padding:"10px 13px", fontSize:11, color:PALETTE.orange }}>
                      Aucun département trouvé pour «&nbsp;{form.school}&nbsp;». Créez-les dans les Paramètres.
                    </div>
                  ) : (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, maxHeight:210, overflowY:"auto" }}>
                      {deptsFiltres.map(d => {
                        const sel = form.department === String(d.id);
                        return (
                          <div key={d.id}
                            className={`pick-item${sel?" sel":""}${d.isTaken?" occ":""}`}
                            onClick={() => { if (!d.isTaken) { setF("department",String(d.id)); touch("department"); } }}>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:12, fontWeight:700, color:sel?PALETTE.green:d.isTaken?PALETTE.textLight:PALETTE.text }}>{d.name}</div>
                              <div style={{ fontSize:10, color:PALETTE.textLight }}>{d.code}</div>
                            </div>
                            {d.isTaken
                              ? <span style={{ fontSize:9, fontWeight:800, color:PALETTE.orange, background:PALETTE.orangeLight, borderRadius:4, padding:"1px 5px" }}>Attribué</span>
                              : sel && <Check size={13} color={PALETTE.green}/>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {touched.department && errors.department && (
                    <span style={{ fontSize:11, color:"#E11D48", fontWeight:600 }}>⚠ {errors.department}</span>
                  )}
                </>
              )}

              {/* VÉHICULE DIRECTEUR */}
              {personnelType === "DIRECTEUR" && (
                <>
                  <div style={M.secTitle}>
                    Véhicule de fonction <span style={{ fontSize:10, fontWeight:400, color:PALETTE.textLight, textTransform:"none", letterSpacing:0, marginLeft:4 }}>optionnel</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                    <div className={`pick-item${form.assigned_vehicle===null?" sel":""}`} onClick={() => setF("assigned_vehicle",null)}>
                      <Clock size={16} color={PALETTE.textLight}/>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:PALETTE.textMid }}>Aucun pour l'instant</div>
                        <div style={{ fontSize:10, color:PALETTE.textLight }}>À assigner depuis le module Véhicules</div>
                      </div>
                      {form.assigned_vehicle===null && <Check size={14} color={PALETTE.green} style={{ marginLeft:"auto" }}/>}
                    </div>
                    {tourismDispo.length > 0 && (
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, maxHeight:180, overflowY:"auto" }}>
                        {tourismDispo.map(v => {
                          const sel = form.assigned_vehicle === v.id;
                          return (
                            <div key={v.id} className={`pick-item${sel?" sel":""}`} onClick={() => setF("assigned_vehicle",v.id)}>
                              <Car size={16} color={sel?PALETTE.green:PALETTE.textLight}/>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:12, fontWeight:700, color:PALETTE.text, fontFamily:"monospace" }}>{v.registration_number}</div>
                                <div style={{ fontSize:10, color:PALETTE.textLight }}>{v.make} {v.model}</div>
                              </div>
                              {sel && <Check size={13} color={PALETTE.green}/>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* PERMIS CHAUFFEUR */}
          {role === "CHAUFFEUR" && (
            <>
              <div style={M.secTitle}>Permis de conduire</div>
              <div style={M.grid2}>
                <Field label="N° permis" required error={touched.license_number && errors.license_number} hint="Ex: CM-XXX-2024 · 6-20 caractères">
                  <input value={form.license_number} onChange={e => setF("license_number",e.target.value.toUpperCase())} onBlur={() => touch("license_number")} placeholder="CM-XXX-2024" maxLength={20} style={{ ...inp("license_number"), fontFamily:"monospace", letterSpacing:".4px" }}/>
                </Field>
                <Field label="Catégorie" required>
                  <select value={form.license_category} onChange={e => setF("license_category",e.target.value)} style={inp("license_category")}>
                    {LICENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Date d'expiration" required error={touched.license_expiry_date && errors.license_expiry_date}>
                  <input type="date" value={form.license_expiry_date} onChange={e => setF("license_expiry_date",e.target.value)} onBlur={() => touch("license_expiry_date")} style={inp("license_expiry_date")}/>
                  {form.license_expiry_date && ls && ls.level!=="ok" && (
                    <span style={{ marginTop:3, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:ls.bg, color:ls.color, display:"inline-flex", alignItems:"center", gap:4 }}>
                      <AlertTriangle size={10}/> {ls.label}
                    </span>
                  )}
                </Field>
                <Field label="Années d'expérience" hint="Entier">
                  <input type="number" min="0" max="60" value={form.years_of_experience} onChange={e => setF("years_of_experience",e.target.value)} placeholder="0" style={inp("years_of_experience")}/>
                </Field>
              </div>
            </>
          )}

          {/* FOOTER */}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8, paddingTop:14, borderTop:`1px solid ${PALETTE.border}` }}>
            <button type="button" onClick={onClose} style={S.ghostBtn}>Annuler</button>
            <button type="submit" disabled={saving} style={{ ...S.btn, opacity:saving?.7:1, display:"flex", alignItems:"center", gap:6 }}>
              {saving ? <><span style={{ animation:"usr-spin .8s linear infinite", display:"inline-block" }}>⟳</span> Enregistrement…</> : isEdit ? "Enregistrer" : "Créer l'utilisateur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTE UTILISATEUR
// ─────────────────────────────────────────────────────────────────────────────
function UserCard({ u, onView, onEdit, onToggle, onPrint, isDeleting }) {
  const isInactive = !u.is_active;
  const ls = licenseStatus(u.driver_profile?.license_expiry_date);
  const av = ROLE_MAP[u.role] || {};
  const [ctx, setCtx] = useState(null);

  return (
    <>
      <article className={`usr-card${isInactive?" inactive":""}`} onContextMenu={e => { e.preventDefault(); setCtx({ x:e.clientX, y:e.clientY }); }} title="Clic droit pour plus d'options">
        <div className="usr-card-body">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:9 }}>
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <div style={{ width:42, height:42, borderRadius:10, flexShrink:0, background:isInactive?"#F3F4F6":av.bg||PALETTE.bg, color:isInactive?"#9CA3AF":av.color||PALETTE.textMid, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:14, border:`2px solid ${isInactive?"#E5E7EB":(av.color||PALETTE.border)+"30"}` }}>
                {(u.first_name||"?")[0]}{(u.last_name||"")[0]}
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:13, color:isInactive?PALETTE.textLight:PALETTE.text, lineHeight:1.2 }}>{u.first_name} {u.last_name}</div>
                <div style={{ fontSize:10, color:PALETTE.textLight, fontFamily:"monospace", marginTop:2 }}>{u.employee_id||"—"}</div>
              </div>
            </div>
            <StatusDot active={u.is_active}/>
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:9 }}><RoleBadge role={u.role}/><SubBadge user={u}/></div>
          <VehBadge user={u}/>
          <div style={{ display:"flex", flexDirection:"column", gap:4, flex:1, fontSize:11, color:PALETTE.textMid, marginTop:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, overflow:"hidden" }}>
              <Mail size={11} color={PALETTE.textLight}/>
              <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</span>
            </div>
            {u.phone && <div style={{ display:"flex", alignItems:"center", gap:5 }}><Phone size={11} color={PALETTE.textLight}/><span style={{ fontFamily:"monospace" }}>+237 {u.phone}</span></div>}
            {u.school && <div style={{ color:PALETTE.green, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}><GraduationCap size={11}/>{u.school}{u.department_name && <span style={{ color:PALETTE.textLight, fontWeight:400 }}> · {u.department_name}</span>}</div>}
            {ls && ls.level!=="ok" && <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:6, fontSize:9, fontWeight:700, alignSelf:"flex-start", background:ls.bg, color:ls.color }}><AlertTriangle size={9}/> {ls.label}</span>}
          </div>
          <div className="usr-card-actions">
            <button className="usr-card-btn" onClick={e=>{e.stopPropagation();onView(u);}} style={{ background:PALETTE.greenLight, color:PALETTE.green }}><Eye size={12}/> Détails</button>
            <button className="usr-card-btn" onClick={e=>{e.stopPropagation();onEdit(u);}} style={{ background:"#EFF6FF", color:"#1D4ED8" }}><Pencil size={12}/> Modifier</button>
            <button className="usr-card-btn" onClick={e=>{e.stopPropagation();onPrint(u);}} style={{ background:PALETTE.orangeLight, color:PALETTE.orange, flex:"none", padding:"6px 9px" }} title="Imprimer"><Printer size={12}/></button>
            <button className="usr-card-btn" onClick={e=>{e.stopPropagation();onToggle(u);}} disabled={isDeleting===u.id}
              style={{ background:u.is_active?PALETTE.redLight:PALETTE.greenLight, color:u.is_active?PALETTE.red:PALETTE.greenMid, flex:"0 0 auto", padding:"6px 9px", opacity:isDeleting===u.id?.5:1 }}>
              {isDeleting===u.id ? <span style={{ animation:"usr-spin .8s linear infinite", display:"inline-block" }}>⟳</span> : u.is_active ? <PowerOff size={12}/> : <Power size={12}/>}
            </button>
          </div>
        </div>
      </article>
      {ctx && <ContextMenu x={ctx.x} y={ctx.y} user={u} onClose={() => setCtx(null)} onView={onView} onEdit={onEdit} onToggle={onToggle} onPrint={onPrint}/>}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export function TabUtilisateurs() {
  const [users,         setUsers]         = useState([]);
  const [tourismVeh,    setTourismVeh]    = useState([]);
  const [busVehicles,   setBusVehicles]   = useState([]);
  const [departments,   setDepartments]   = useState([]);
  const [schoolsList,   setSchoolsList]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filterRole,    setFilterRole]    = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [search,        setSearch]        = useState("");
  const [viewMode,      setViewMode]      = useState("table");
  const [showForm,      setShowForm]      = useState(false);
  const [editUser,      setEditUser]      = useState(null);
  const [viewUser,      setViewUser]      = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [apiError,      setApiError]      = useState("");
  const [deleting,      setDeleting]      = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [page,          setPage]          = useState(1);
  const [sortKey,       setSortKey]       = useState("last_name");
  const [sortDir,       setSortDir]       = useState("asc");
  const [tableCtx,      setTableCtx]      = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, v, b, d, s] = await Promise.all([
        apiFetch("/auth/users/"),
        apiFetch("/vehicles/?category=TOURISME&assignment_type=POOL"),
        apiFetch("/vehicles/?category=BUS&assignment_type=POOL"),
        apiFetch("/auth/departments/?page_size=200"),
        apiFetch("/auth/schools/?page_size=100").catch(() => []),
      ]);
      setUsers(Array.isArray(u) ? u : u?.results ?? []);
      setTourismVeh(Array.isArray(v) ? v : v?.results ?? []);
      setBusVehicles(Array.isArray(b) ? b : b?.results ?? []);
      setDepartments(Array.isArray(d) ? d : d?.results ?? []);
      setSchoolsList(Array.isArray(s) ? s : s?.results ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { setPage(1); }, [filterRole, filterStatus, search]);
  useEffect(() => {
    const close = () => setTableCtx(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users
      .filter(u => !filterRole   || u.role===filterRole)
      .filter(u => !filterStatus || (filterStatus==="active" ? u.is_active : !u.is_active))
      .filter(u => !q || [u.first_name,u.last_name,u.email,u.phone,u.employee_id,u.department_name,u.school].some(x=>(x||"").toLowerCase().includes(q)))
      .sort((a,b) => {
        const av=(a[sortKey]||"").toString().toLowerCase();
        const bv=(b[sortKey]||"").toString().toLowerCase();
        return sortDir==="asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [users, filterRole, filterStatus, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage-1)*PAGE_SIZE, safePage*PAGE_SIZE);

  const handleSort = k => {
    if (sortKey===k) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortKey(k); setSortDir("asc"); }
    setPage(1);
  };

  const kpis = useMemo(() => {
    const today = new Date();
    const ch = users.filter(u => u.role==="CHAUFFEUR" && u.is_active);
    return {
      total:       users.length,
      active:      users.filter(u=>u.is_active).length,
      personnel:   users.filter(u=>u.role==="PERSONNEL"&&u.is_active).length,
      chauffeurs:  ch.length,
      techniciens: users.filter(u=>u.role==="TECHNICIEN"&&u.is_active).length,
      expiredLic:  ch.filter(u=>{const e=u.driver_profile?.license_expiry_date;return e&&new Date(e)<today;}).length,
      expiringLic: ch.filter(u=>{const e=u.driver_profile?.license_expiry_date;if(!e)return false;const d=Math.ceil((new Date(e)-today)/86400000);return d>=0&&d<=30;}).length,
    };
  }, [users]);

  const openAdd   = () => { setEditUser(null); setApiError(""); setShowForm(true); };
  const openEdit  = u  => { setEditUser(u);   setApiError(""); setShowForm(true); setViewUser(null); };
  const closeForm = () => { setShowForm(false); setEditUser(null); setApiError(""); };

  const handleSave = async data => {
    setSaving(true); setApiError("");
    try {
      if (editUser) await apiFetch(`/auth/users/${editUser.id}/update-with-vehicle/`,{ method:"PATCH", body:JSON.stringify(data) });
      else          await apiFetch("/auth/users/create-with-vehicle/",               { method:"POST",  body:JSON.stringify(data) });
      closeForm(); loadAll();
    } catch (e) {
      let msg = e.message;
      try { const p=JSON.parse(e.message); msg=Object.entries(p).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(", "):v}`).join(" — "); } catch {}
      setApiError(msg);
    } finally { setSaving(false); }
  };

  const handleToggleConfirm = async () => {
    if (!confirmToggle) return;
    const u = confirmToggle;
    setDeleting(u.id); setConfirmToggle(null);
    try {
      if (u.is_active) await apiFetch(`/auth/users/${u.id}/`,         { method:"DELETE" });
      else             await apiFetch(`/auth/users/${u.id}/activate/`, { method:"POST"   });
      loadAll();
    } catch (e) { alert("Erreur : "+e.message); }
    finally { setDeleting(null); }
  };

  const SortIcon = ({ col }) => {
    if (!col.sort) return null;
    if (sortKey===col.key) return sortDir==="asc" ? <ChevronUp size={11}/> : <ChevronDown size={11}/>;
    return <ChevronsUpDown size={11} style={{ opacity:.4 }}/>;
  };

  // ✅ Colonne "Véhicule" supprimée
  const COLS = [
    { key:"last_name", label:"Collaborateur", sort:true  },
    { key:"role",      label:"Rôle",          sort:true  },
    { key:"email",     label:"Contact",        sort:false },
    { key:"school",    label:"École / Dépt.",  sort:true  },
    { key:"is_active", label:"Statut",         sort:true  },
    { key:"",          label:"Actions",        sort:false },
  ];

  return (
    <>
      <style>{CSS}</style>

      {confirmToggle && (
        <ConfirmDialog
          icon={confirmToggle.is_active?"🔒":"✅"}
          title={`${confirmToggle.is_active?"Désactiver":"Réactiver"} ce compte ?`}
          message={<span><b>{confirmToggle.first_name} {confirmToggle.last_name}</b> ({confirmToggle.employee_id})<br/>{confirmToggle.is_active?"Il ne pourra plus se connecter.":"Il pourra à nouveau accéder à l'application."}</span>}
          confirmLabel={confirmToggle.is_active?"Désactiver":"Réactiver"}
          danger={confirmToggle.is_active}
          loading={deleting===confirmToggle.id}
          onConfirm={handleToggleConfirm}
          onCancel={() => setConfirmToggle(null)}
        />
      )}

      {viewUser && <ModalDetail user={viewUser} onClose={() => setViewUser(null)} onEdit={openEdit} onPrint={exportUserPDF}/>}

      {showForm && (
        <UserModal
          initial={editUser} tourismVeh={tourismVeh} busVehicles={busVehicles}
          departments={departments} schoolsList={schoolsList} users={users}
          onSave={handleSave} onClose={closeForm} saving={saving} apiError={apiError}
        />
      )}

      {tableCtx && (
        <ContextMenu x={tableCtx.x} y={tableCtx.y} user={tableCtx.user}
          onClose={() => setTableCtx(null)} onView={setViewUser} onEdit={openEdit}
          onToggle={setConfirmToggle} onPrint={exportUserPDF}/>
      )}

      <div style={S.section}>

        {kpis.expiredLic > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:PALETTE.redLight, border:`1.5px solid #FECDD3`, borderRadius:10, marginBottom:14 }}>
            <ShieldAlert size={20} color={PALETTE.red}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:800, color:PALETTE.red }}>{kpis.expiredLic} permis expiré{kpis.expiredLic>1?"s":""} — intervention requise</div>
              <div style={{ fontSize:11, color:"#9F1239", marginTop:2 }}>Ces chauffeurs ne peuvent légalement plus conduire.</div>
            </div>
            <button onClick={() => { setFilterRole("CHAUFFEUR"); setFilterStatus("active"); }} style={{ ...S.btn, background:PALETTE.red, fontSize:11 }}>Voir →</button>
          </div>
        )}

        {kpis.expiringLic > 0 && kpis.expiredLic===0 && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", background:PALETTE.orangeLight, border:`1.5px solid #FDE68A`, borderRadius:10, marginBottom:14 }}>
            <AlertTriangle size={16} color={PALETTE.orange}/>
            <span style={{ fontSize:12, fontWeight:600, color:PALETTE.orange }}>{kpis.expiringLic} permis expire{kpis.expiringLic>1?"nt":""} dans moins de 30 jours.</span>
          </div>
        )}

        {/* KPIs */}
        <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
          {[
            { id:"",           icon:<Users size={14}/>,    label:"Total",       count:kpis.total,       sub:`${kpis.active} actifs`,  kc:PALETTE.green,   kb:PALETTE.greenLight  },
            { id:"PERSONNEL",  icon:<Briefcase size={14}/>,label:"Personnel",   count:kpis.personnel,   sub:"directeurs & chefs",     kc:PALETTE.green,   kb:PALETTE.greenLight  },
            { id:"CHAUFFEUR",  icon:<Car size={14}/>,       label:"Chauffeurs",  count:kpis.chauffeurs,  sub:"conducteurs actifs",     kc:PALETTE.greenMid,kb:PALETTE.greenLight  },
            { id:"TECHNICIEN", icon:<Wrench size={14}/>,    label:"Techniciens", count:kpis.techniciens, sub:"intervenants actifs",    kc:PALETTE.orange,  kb:PALETTE.orangeLight },
            { id:"active",     icon:<BadgeCheck size={14}/>,label:"Actifs",      count:kpis.active,      sub:`/${kpis.total} comptes`, kc:PALETTE.green,   kb:PALETTE.greenLight  },
          ].map(k => {
            const isAct=(k.id==="active"&&filterStatus==="active")||(k.id!=""&&k.id!="active"&&filterRole===k.id)||(k.id==""&&!filterRole&&!filterStatus);
            return (
              <div key={k.id} className={`usr-kpi${isAct?" active":""}`} style={{ "--kpi-color":k.kc, "--kpi-bg":k.kb }}
                onClick={() => {
                  if (k.id==="")            { setFilterRole(""); setFilterStatus(""); }
                  else if (k.id==="active") { setFilterStatus(filterStatus==="active"?"":"active"); setFilterRole(""); }
                  else                      { setFilterRole(filterRole===k.id?"":k.id); setFilterStatus(""); }
                }}>
                <div style={{ fontSize:9, fontWeight:700, color:k.kc, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8, display:"flex", alignItems:"center", gap:5 }}>{k.icon} {k.label}</div>
                <div style={{ fontSize:26, fontWeight:900, color:PALETTE.text, lineHeight:1 }}>{k.count}</div>
                <div style={{ fontSize:10, color:k.kc, fontWeight:600, marginTop:4 }}>{k.sub}</div>
              </div>
            );
          })}
        </div>

        {/* Barre outils */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ position:"relative" }}>
              <Search size={13} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:PALETTE.textLight }}/>
              <input placeholder="Nom, email, matricule…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.search, paddingLeft:30, width:220 }}/>
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...S.search, width:150 }}>
              <option value="">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
            <span style={{ fontSize:12, color:PALETTE.textLight }}>{filtered.length} utilisateur{filtered.length!==1?"s":""}</span>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <button onClick={() => exportXML(filtered)} style={{ ...S.ghostBtn, fontSize:11, display:"flex", alignItems:"center", gap:5 }}>
              <FileDown size={13}/> Excel XML
            </button>
            <button onClick={() => {
              const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Utilisateurs</title><style>@page{size:A4 landscape;margin:15mm;}body{font-family:Arial,sans-serif;font-size:10px;}h1{color:#1B5E37;font-size:15px;margin-bottom:3px;}p{color:#8EA99A;font-size:10px;margin:0 0 12px;}table{width:100%;border-collapse:collapse;}th{background:#1B5E37;color:#fff;padding:6px 9px;text-align:left;font-size:9px;text-transform:uppercase;}td{padding:5px 9px;border-bottom:1px solid #E2E8E5;}tr:nth-child(even)td{background:#F4F6F5;}.footer{margin-top:14px;font-size:9px;color:#8EA99A;text-align:right;}</style></head><body><h1>Utilisateurs IUC</h1><p>${filtered.length} utilisateur${filtered.length>1?"s":""} · Exporté le ${new Date().toLocaleDateString("fr-FR")}</p><table><thead><tr><th>Matricule</th><th>Nom</th><th>Rôle</th><th>Email</th><th>Téléphone</th><th>École</th><th>Statut</th></tr></thead><tbody>${filtered.map(u=>`<tr><td>${u.employee_id||"—"}</td><td><b>${u.first_name} ${u.last_name}</b></td><td>${u.role||"—"}</td><td>${u.email||"—"}</td><td>${u.phone?"+237 "+u.phone:"—"}</td><td>${u.school||"—"}</td><td style="color:${u.is_active?"#1B5E37":"#9CA3AF"};font-weight:700">${u.is_active?"Actif":"Inactif"}</td></tr>`).join("")}</tbody></table><div class="footer">IUC Logbessou — Confidentiel</div><script>window.onload=()=>{window.print();};<\/script></body></html>`;
              const blob=new Blob([html],{type:"text/html;charset=utf-8"});const url=URL.createObjectURL(blob);
              let iframe=document.getElementById("__usr_list_pdf__");
              if(!iframe){iframe=document.createElement("iframe");iframe.id="__usr_list_pdf__";iframe.style.cssText="position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";document.body.appendChild(iframe);}
              iframe.src=url;iframe.onload=()=>{try{iframe.contentWindow.focus();iframe.contentWindow.print();}catch{}setTimeout(()=>URL.revokeObjectURL(url),60000);};
            }} style={{ ...S.ghostBtn, fontSize:11, display:"flex", alignItems:"center", gap:5 }}>
              <FileText size={13}/> PDF liste
            </button>
            <div style={{ display:"flex", gap:3, background:PALETTE.bg, padding:3, borderRadius:9 }}>
              <button className={`view-btn${viewMode==="grid"?" on":""}`} onClick={() => setViewMode("grid")} title="Vue grille"><Grid3X3 size={14}/></button>
              <button className={`view-btn${viewMode==="table"?" on":""}`} onClick={() => setViewMode("table")} title="Vue liste"><List size={14}/></button>
            </div>
            <button onClick={openAdd} style={{ ...S.btn, display:"flex", alignItems:"center", gap:6, background:PALETTE.green }}>
              <Plus size={14}/> Ajouter un utilisateur
            </button>
          </div>
        </div>

        {/* Contenu */}
        {loading ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14 }}>
            {Array.from({length:8}).map((_,i) => <SkeletonCard key={i}/>)}
          </div>
        ) : filtered.length===0 ? (
          <Empty text={search||filterRole||filterStatus?"Aucun résultat pour ces critères":"Aucun utilisateur trouvé"}/>
        ) : viewMode==="grid" ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14 }}>
            {paginated.map(u => <UserCard key={u.id} u={u} onView={setViewUser} onEdit={openEdit} onToggle={setConfirmToggle} onPrint={exportUserPDF} isDeleting={deleting}/>)}
          </div>
        ) : (
          <div style={{ overflowX:"auto", borderRadius:10, border:`1.5px solid ${PALETTE.border}` }}>
            <table style={S.table}>
              <thead>
                <tr style={{ background:PALETTE.bg }}>
                  {COLS.map(col => (
                    <th key={col.label} className={col.sort?"th-sort":""} onClick={col.sort?()=>handleSort(col.key):undefined} style={S.th}>
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>{col.label}<SortIcon col={col}/></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((u,idx) => {
                  const isInactive=!u.is_active;
                  const ls=licenseStatus(u.driver_profile?.license_expiry_date);
                  const av=ROLE_MAP[u.role]||{};
                  return (
                    <tr key={u.id} className={`tr-usr${isInactive?" tr-inactive":""}`}
                      onClick={() => setViewUser(u)}
                      onContextMenu={e => { e.preventDefault(); setTableCtx({ x:e.clientX, y:e.clientY, user:u }); }}
                      style={{ borderBottom:`1px solid ${PALETTE.border}`, background:idx%2===0?"#fff":"#FAFBFA" }}>

                      {/* Collaborateur */}
                      <td style={S.td}>
                        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                          <div style={{ width:34, height:34, borderRadius:9, flexShrink:0, background:isInactive?"#F3F4F6":av.bg||PALETTE.bg, color:isInactive?"#9CA3AF":av.color||PALETTE.textMid, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12 }}>
                            {(u.first_name||"?")[0]}{(u.last_name||"")[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight:700, fontSize:13, color:isInactive?PALETTE.textLight:PALETTE.text }}>{u.first_name} {u.last_name}</div>
                            <div style={{ fontSize:10, color:PALETTE.textLight, fontFamily:"monospace" }}>{u.employee_id||"—"}</div>
                          </div>
                        </div>
                      </td>

                      {/* Rôle */}
                      <td style={S.td}><RoleBadge role={u.role}/><div style={{ marginTop:3 }}><SubBadge user={u}/></div></td>

                      {/* Contact */}
                      <td style={S.td}>
                        <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:PALETTE.textMid }}><Mail size={10} color={PALETTE.textLight}/> {u.email}</div>
                        {u.phone && <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:PALETTE.textLight, fontFamily:"monospace", marginTop:2 }}><Phone size={10}/> +237 {u.phone}</div>}
                      </td>

                      {/* École / Dépt */}
                      <td style={S.td}>
                        {u.school
                          ? <div>
                              <div style={{ fontSize:12, fontWeight:700, color:PALETTE.green, display:"flex", alignItems:"center", gap:4 }}><GraduationCap size={11}/> {u.school}</div>
                              {u.department_name && <div style={{ fontSize:10, color:PALETTE.textLight, marginTop:1 }}>{u.department_name}</div>}
                            </div>
                          : <span style={{ fontSize:11, color:PALETTE.textLight }}>—</span>}
                      </td>

                      {/* ✅ Colonne Véhicule supprimée — alerte permis intégrée dans statut */}

                      {/* Statut */}
                      <td style={S.td}>
                        <StatusDot active={u.is_active}/>
                        {ls && ls.level!=="ok" && (
                          <span style={{ display:"flex", alignItems:"center", gap:3, padding:"2px 6px", borderRadius:5, fontSize:9, fontWeight:700, marginTop:4, background:ls.bg, color:ls.color }}>
                            <AlertTriangle size={9}/> {ls.label}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={S.td} onClick={e => e.stopPropagation()}>
                        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                          <button onClick={() => setViewUser(u)} style={{ padding:"4px 8px", border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", background:PALETTE.greenLight, color:PALETTE.green, fontFamily:"inherit", display:"flex", alignItems:"center", gap:3 }}><Eye size={11}/> Voir</button>
                          <button onClick={() => openEdit(u)} style={{ padding:"4px 8px", border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", background:"#EFF6FF", color:"#1D4ED8", fontFamily:"inherit", display:"flex", alignItems:"center", gap:3 }}><Pencil size={11}/> Modifier</button>
                          <button onClick={() => exportUserPDF(u)} style={{ padding:"4px 8px", border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", background:PALETTE.orangeLight, color:PALETTE.orange, fontFamily:"inherit", display:"flex", alignItems:"center", gap:3 }} title="Imprimer"><Printer size={11}/></button>
                          <button onClick={() => setConfirmToggle(u)} disabled={deleting===u.id}
                            style={{ padding:"4px 8px", border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", background:u.is_active?PALETTE.redLight:PALETTE.greenLight, color:u.is_active?PALETTE.red:PALETTE.greenMid, opacity:deleting===u.id?.5:1, display:"flex", alignItems:"center", gap:3 }}>
                            {deleting===u.id ? <span style={{ animation:"usr-spin .8s linear infinite", display:"inline-block" }}>⟳</span> : u.is_active ? <><PowerOff size={11}/> Désactiver</> : <><Power size={11}/> Activer</>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && filtered.length > 0 && (
          <nav style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginTop:18 }}>
            <button className="pg-btn" onClick={() => setPage(1)} disabled={safePage===1}><ChevronsLeft size={13}/></button>
            <button className="pg-btn" onClick={() => setPage(p=>Math.max(1,p-1))} disabled={safePage===1}><ChevronLeft size={13}/></button>
            {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-safePage)<=2).reduce((acc,p,i,arr)=>{if(i>0&&p-arr[i-1]>1)acc.push("...");acc.push(p);return acc;},[]).map((p,i)=>
              p==="..."
                ? <span key={`e${i}`} style={{ fontSize:12, color:PALETTE.textLight, padding:"0 3px" }}>…</span>
                : <button key={p} className={`pg-btn${safePage===p?" on":""}`} onClick={()=>setPage(p)}>{p}</button>
            )}
            <button className="pg-btn" onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages}><ChevronRight size={13}/></button>
            <button className="pg-btn" onClick={() => setPage(totalPages)} disabled={safePage===totalPages}><ChevronsRight size={13}/></button>
            <span style={{ fontSize:11, color:PALETTE.textLight, marginLeft:4 }}>{(safePage-1)*PAGE_SIZE+1}–{Math.min(safePage*PAGE_SIZE,filtered.length)} / {filtered.length}</span>
          </nav>
        )}
      </div>
    </>
  );
}