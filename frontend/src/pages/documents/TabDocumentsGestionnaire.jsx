
// ─── pages/documents/TabDocumentsGestionnaire.jsx ────────────────────────────
// Module Documents — Gestionnaire DRIVEPARC / IUC
// Version 4.0 — Sobre, professionnel, charte vert/rouge/orange, Lucide React
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, SlidersHorizontal, X, ChevronDown, ChevronUp,
  Shield, FileText, Wrench, Tag, File,
  AlertCircle, AlertTriangle, CheckCircle2, Clock,
  Eye, Pencil, Trash2, Plus, Download,
  BarChart2, Folder, Car, Users,
  Printer, FileSpreadsheet, Info, ChevronRight,
  Calendar, TrendingUp, List,
} from "lucide-react";

const API_BASE = "http://localhost:8000/api/v1";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(!options.isMultipart ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || json?.message || `Erreur ${res.status}`);
  return json?.data ?? json;
}

// ── Palette sobre — vert / rouge / orange ─────────────────────────────────────
const C = {
  green:      "#1B5E37",
  greenMid:   "#2D7A4F",
  greenLight: "#EAF4EE",
  greenXLight:"#F2FAF5",
  red:        "#BE123C",
  redLight:   "#FFF1F2",
  redBorder:  "#FECDD3",
  amber:      "#D97706",
  amberLight: "#FFFBEB",
  amberBorder:"#FDE68A",
  white:      "#FFFFFF",
  bg:         "#F8FAFB",
  bgCard:     "#FFFFFF",
  border:     "#E5E7EB",
  text:       "#111827",
  textMid:    "#374151",
  textLight:  "#6B7280",
  textXLight: "#9CA3AF",
};

// ── Styles de base ─────────────────────────────────────────────────────────────
const inp = {
  padding: "8px 11px",
  border: `1.5px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "inherit",
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
  marginBottom: 5, display: "block",
};
const btnGhost = {
  padding: "7px 14px", background: "transparent", color: C.textMid,
  border: `1.5px solid ${C.border}`, borderRadius: 8,
  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  display: "flex", alignItems: "center", gap: 5,
};
const btnPrimary = {
  padding: "8px 16px", background: C.green, color: "#fff",
  border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
  display: "flex", alignItems: "center", gap: 6,
};

// ── Utilitaires ───────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";
const fmtShort = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const daysUntil = (d) => d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : null;

function urgencyLevel(expiry) {
  const d = daysUntil(expiry);
  if (d === null) return "none";
  if (d < 0)     return "expired";
  if (d <= 7)    return "critical";
  if (d <= 30)   return "warning";
  if (d <= 90)   return "soon";
  return "ok";
}

const URGENCY_STYLE = {
  expired:  { color: C.red,   bg: C.redLight,   border: C.redBorder,   label: "Expiré",        dot: C.red   },
  critical: { color: C.red,   bg: C.redLight,   border: C.redBorder,   label: "Critique < 7j", dot: C.red   },
  warning:  { color: C.amber, bg: C.amberLight, border: C.amberBorder, label: "< 30j",         dot: C.amber },
  soon:     { color: C.amber, bg: C.amberLight, border: C.amberBorder, label: "< 90j",         dot: C.amber },
  ok:       { color: C.green, bg: C.greenLight, border: "#BBF7D0",     label: "Valide",        dot: C.green },
  none:     { color: C.textLight, bg: C.bg,     border: C.border,      label: "Sans expiry",   dot: C.textXLight },
};

const URGENCY_ORDER = { expired: 0, critical: 1, warning: 2, soon: 3, ok: 4, none: 5 };

// ── Types de documents (4 obligatoires + other) ───────────────────────────────
const DOC_REQUIRED = ["insurance", "registration", "inspection", "vignette"];

const DOC_META = {
  insurance:    { Icon: Shield,   label: "Assurance",          color: C.green  },
  registration: { Icon: FileText, label: "Carte grise",        color: C.green  },
  inspection:   { Icon: Wrench,   label: "Visite technique",   color: C.amber  },
  vignette:     { Icon: Tag,      label: "Vignette",           color: C.amber  },
  other:        { Icon: File,     label: "Autre document",     color: C.textLight },
};

// ── Conformité véhicule : possède les 4 doc obligatoires valides ──────────────
function getVehicleCompliance(docs) {
  const validTypes = new Set(
    docs
      .filter(d => !["expired", "critical"].includes(urgencyLevel(d.expiry_date)))
      .map(d => d.type)
  );
  const missing = DOC_REQUIRED.filter(t => !validTypes.has(t));
  const isCompliant = missing.length === 0;
  return { isCompliant, missing, validTypes };
}

function calcExpiryFromToday(type, vehicleType) {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  switch (type) {
    case "insurance":
    case "vignette":
      base.setFullYear(base.getFullYear() + 1); break;
    case "inspection":
      base.setMonth(base.getMonth() + (vehicleType === "BUS" ? 6 : 12)); break;
    case "registration":
      base.setFullYear(base.getFullYear() + 5); break;
    default: return "";
  }
  return base.toISOString().split("T")[0];
}


// ── Export Excel (SheetJS) ────────────────────────────────────────────────────
function exportExcel(vehicles, docsPerVeh) {
  // Construire les données
  const rows = [];
  vehicles.forEach(v => {
    const docs = docsPerVeh[String(v.id)] || [];
    const { isCompliant, missing } = getVehicleCompliance(docs);
    if (docs.length === 0) {
      rows.push({
        "Véhicule": `${v.make} ${v.model}`,
        "Immatriculation": v.registration_number,
        "Statut conformité": "Non documenté",
        "Documents manquants": DOC_REQUIRED.map(t => DOC_META[t].label).join(", "),
        "Type document": "", "Titre": "", "Expiration": "", "Jours restants": "", "Statut document": "",
      });
    } else {
      docs.forEach(d => {
        const days = daysUntil(d.expiry_date);
        const urg  = urgencyLevel(d.expiry_date);
        rows.push({
          "Véhicule": `${v.make} ${v.model}`,
          "Immatriculation": v.registration_number,
          "Statut conformité": isCompliant ? "Conforme" : `Incomplet (manque: ${missing.map(t => DOC_META[t].label).join(", ")})`,
          "Documents manquants": missing.map(t => DOC_META[t].label).join(", ") || "—",
          "Type document": DOC_META[d.type]?.label || d.type,
          "Titre": d.title,
          "Expiration": d.expiry_date ? fmtShort(d.expiry_date) : "Sans expiration",
          "Jours restants": days !== null ? days : "—",
          "Statut document": URGENCY_STYLE[urg]?.label || urg,
        });
      });
    }
  });

  // CSV simple si SheetJS non disponible
  const headers = Object.keys(rows[0] || {});
  const csvContent = [
    headers.join(";"),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(";")),
  ].join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `documents_vehicules_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Export PDF ────────────────────────────────────────────────────────────────
function exportPDF(vehicles, docsPerVeh) {
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const totalDocs = Object.values(docsPerVeh).flat().length;
  const conformes = vehicles.filter(v => {
    const docs = docsPerVeh[String(v.id)] || [];
    return getVehicleCompliance(docs).isCompliant;
  }).length;

  const rows = vehicles.map(v => {
    const docs = docsPerVeh[String(v.id)] || [];
    const { isCompliant, missing } = getVehicleCompliance(docs);
    const expired = docs.filter(d => ["expired", "critical"].includes(urgencyLevel(d.expiry_date))).length;
    const warning = docs.filter(d => ["warning", "soon"].includes(urgencyLevel(d.expiry_date))).length;
    return `<tr>
      <td><strong>${v.make} ${v.model}</strong><br><span style="color:#6B7280;font-size:9px">${v.registration_number}</span></td>
      <td style="text-align:center">${docs.length}</td>
      <td style="text-align:center;color:${expired > 0 ? "#BE123C" : "#6B7280"};font-weight:${expired > 0 ? 700 : 400}">${expired > 0 ? expired : "—"}</td>
      <td style="text-align:center;color:${warning > 0 ? "#D97706" : "#6B7280"};font-weight:${warning > 0 ? 700 : 400}">${warning > 0 ? warning : "—"}</td>
      <td style="text-align:center">
        <span style="padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;background:${isCompliant ? "#EAF4EE" : "#FFF1F2"};color:${isCompliant ? "#1B5E37" : "#BE123C"}">
          ${isCompliant ? "✓ Conforme" : "✗ Incomplet"}
        </span>
        ${!isCompliant && missing.length > 0 ? `<br><span style="font-size:8px;color:#6B7280">Manque : ${missing.map(t => DOC_META[t].label).join(", ")}</span>` : ""}
      </td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Rapport Documents — ${now}</title>
  <style>
    @page { size:A4; margin:12mm 10mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; font-size:10px; color:#111827; }
    .hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; padding-bottom:10px; border-bottom:2px solid #1B5E37; }
    .hdr h1 { font-size:15px; font-weight:800; color:#1B5E37; }
    .hdr p  { font-size:9px; color:#6B7280; margin-top:3px; }
    .stats  { display:flex; gap:10px; margin-bottom:14px; }
    .stat   { flex:1; padding:8px 12px; border-radius:6px; background:#EAF4EE; text-align:center; }
    .stat .n{ font-size:18px; font-weight:800; color:#1B5E37; }
    .stat .l{ font-size:8px; color:#4A6358; font-weight:600; text-transform:uppercase; letter-spacing:.8px; }
    table { width:100%; border-collapse:collapse; }
    thead tr { background:#1B5E37; color:#fff; }
    thead th { padding:6px 8px; text-align:left; font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; }
    tbody tr:nth-child(even) { background:#F8FAFB; }
    tbody td { padding:7px 8px; border-bottom:1px solid #E5E7EB; vertical-align:middle; font-size:10px; }
    .footer { margin-top:14px; font-size:8px; color:#9CA3AF; text-align:center; border-top:1px solid #E5E7EB; padding-top:8px; }
  </style></head><body>
  <div class="hdr">
    <div>
      <h1>Rapport Documents Véhicules</h1>
      <p>Généré le ${now} · ${vehicles.length} véhicules · ${totalDocs} documents</p>
    </div>
    <div style="text-align:right;font-size:9px;color:#6B7280">
      <div style="font-weight:700;font-size:12px;color:#1B5E37">IUC Logbessou</div>
      <div>Service des Transports — DRIVEPARC</div>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><div class="n">${vehicles.length}</div><div class="l">Véhicules</div></div>
    <div class="stat"><div class="n">${totalDocs}</div><div class="l">Documents</div></div>
    <div class="stat" style="background:#EAF4EE"><div class="n" style="color:#1B5E37">${conformes}</div><div class="l">Conformes</div></div>
    <div class="stat" style="background:#FFF1F2"><div class="n" style="color:#BE123C">${vehicles.length - conformes}</div><div class="l">Non conformes</div></div>
    <div class="stat" style="background:#FFFBEB"><div class="n" style="color:#D97706">${Math.round((conformes / Math.max(vehicles.length, 1)) * 100)}%</div><div class="l">Taux conformité</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Véhicule</th><th style="text-align:center">Docs</th>
      <th style="text-align:center">Expirés</th><th style="text-align:center">Alertes</th>
      <th style="text-align:center">Conformité</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Système de Gestion du Parc Automobile · IUC Logbessou · Document généré automatiquement</div>
  <script>window.onload=function(){window.print()}<\/script>
  </body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  let f = document.getElementById("__doc_pdf__");
  if (!f) { f = document.createElement("iframe"); f.id = "__doc_pdf__"; f.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;"; document.body.appendChild(f); }
  f.src = url;
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { window.open(url, "_blank"); } setTimeout(() => URL.revokeObjectURL(url), 60000); };
}

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANTS UTILITAIRES
// ════════════════════════════════════════════════════════════════════════════

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  if (!msg) return null;
  const isErr = type === "error";
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: isErr ? C.red : C.green, color: "#fff",
      borderRadius: 10, padding: "12px 18px", fontSize: 13, fontWeight: 600,
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 4px 24px rgba(0,0,0,.2)", maxWidth: 380,
      animation: "toastIn .25s ease",
    }}>
      {isErr ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onDone} style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>
    </div>
  );
}

const Spinner = ({ size = 16, color = C.green }) => (
  <div style={{ width: size, height: size, border: `2px solid ${color}30`, borderTopColor: color, borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
);

function ModalConfirmDelete({ docTitle, onCancel, onConfirm, loading }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.white, borderRadius: 14, padding: 24, width: 400, boxShadow: "0 16px 48px rgba(0,0,0,.18)", animation: "toastIn .2s ease" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.redLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={20} color={C.red} />
          </div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 6 }}>Supprimer ce document ?</div>
        <div style={{ fontSize: 12, color: C.textLight, textAlign: "center", marginBottom: 20, lineHeight: 1.6 }}>
          <strong style={{ color: C.text }}>"{docTitle}"</strong> sera définitivement supprimé. Cette action est irréversible.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={btnGhost}>Annuler</button>
          <button onClick={onConfirm} disabled={loading}
            style={{ ...btnPrimary, background: C.red, opacity: loading ? 0.6 : 1 }}>
            {loading && <Spinner size={13} color="#fff" />}
            {loading ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── File Viewer ───────────────────────────────────────────────────────────────
function ModalFileViewer({ url, title, onClose }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
  const isPdf   = /\.pdf(\?.*)?$/i.test(url);
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.88)", zIndex: 2000, display: "flex", flexDirection: "column" }} onClick={onClose}>
      <div style={{ background: "rgba(0,0,0,.65)", padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, backdropFilter: "blur(6px)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          {isImage ? <File size={16} /> : <FileText size={16} />}
          {title}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isImage && (
            <>
              <button onClick={() => setZoom(z => Math.max(.3, z - .2))} style={{ ...btnGhost, padding: "4px 10px", color: "#fff", borderColor: "rgba(255,255,255,.25)", background: "rgba(255,255,255,.1)" }}>−</button>
              <span style={{ fontSize: 11, color: "#fff", minWidth: 38, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(3, z + .2))} style={{ ...btnGhost, padding: "4px 10px", color: "#fff", borderColor: "rgba(255,255,255,.25)", background: "rgba(255,255,255,.1)" }}>+</button>
              <button onClick={() => setRotate(r => r + 90)} style={{ ...btnGhost, padding: "4px 10px", color: "#fff", borderColor: "rgba(255,255,255,.25)", background: "rgba(255,255,255,.1)", fontSize: 11 }}>↻</button>
            </>
          )}
          <a href={url} download target="_blank" rel="noreferrer"
            style={{ padding: "6px 12px", background: "rgba(255,255,255,.12)", color: "#fff", borderRadius: 7, fontSize: 11, fontWeight: 600, textDecoration: "none", border: "1px solid rgba(255,255,255,.25)", display: "flex", alignItems: "center", gap: 4 }}>
            <Download size={13} /> Télécharger
          </a>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 7, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.25)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => e.stopPropagation()}>
        {isImage ? (
          <img src={url} alt={title} style={{ maxWidth: zoom === 1 ? "90vw" : "none", maxHeight: zoom === 1 ? "82vh" : "none", width: zoom !== 1 ? `${zoom * 80}vw` : undefined, objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,.4)", transform: `rotate(${rotate}deg)`, transition: "transform .3s ease" }} />
        ) : isPdf ? (
          <iframe src={url} title={title} style={{ width: "90vw", height: "85vh", border: "none", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,.4)", background: "#fff" }} />
        ) : (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,.7)" }}>
            <File size={60} style={{ opacity: .4 }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>Aperçu non disponible.</div>
            <a href={url} target="_blank" rel="noreferrer" style={{ color: "#93C5FD", fontSize: 12, marginTop: 8, display: "block" }}>Ouvrir dans un nouvel onglet →</a>
          </div>
        )}
      </div>
      <div style={{ background: "rgba(0,0,0,.4)", padding: "6px 16px", textAlign: "center", fontSize: 10, color: "rgba(255,255,255,.35)", flexShrink: 0 }}>
        Cliquer en dehors pour fermer
      </div>
    </div>
  );
}

function SkeletonDoc() {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 9, padding: "12px 16px", background: C.bg, animation: "shimmer 1.5s ease-in-out infinite" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: C.border, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 12, background: C.border, borderRadius: 5, width: "50%", marginBottom: 6 }} />
          <div style={{ height: 9, background: C.border, borderRadius: 5, width: "28%" }} />
        </div>
        <div style={{ height: 20, width: 72, background: C.border, borderRadius: 99 }} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STATISTIQUES — sobre et lisible
// ════════════════════════════════════════════════════════════════════════════
function TabStatistiques({ vehicles, allDocs }) {
  const totalVehicles = vehicles.length;
  const totalDocs     = allDocs.length;

  const docsExpired  = allDocs.filter(d => ["expired","critical"].includes(urgencyLevel(d.expiry_date)));
  const docsWarning  = allDocs.filter(d => ["warning","soon"].includes(urgencyLevel(d.expiry_date)));
  const docsOk       = allDocs.filter(d => urgencyLevel(d.expiry_date) === "ok");
  const docsNone     = allDocs.filter(d => urgencyLevel(d.expiry_date) === "none");

  // Conformité par véhicule
  const vehConformity = vehicles.map(v => {
    const vDocs = allDocs.filter(d => String(d.vehicle) === String(v.id));
    const { isCompliant, missing } = getVehicleCompliance(vDocs);
    const hasExpired = vDocs.some(d => ["expired","critical"].includes(urgencyLevel(d.expiry_date)));
    const hasWarning = vDocs.some(d => ["warning","soon"].includes(urgencyLevel(d.expiry_date)));
    return { v, vDocs, isCompliant, missing, hasExpired, hasWarning };
  });

  const conformes    = vehConformity.filter(x => x.isCompliant).length;
  const nonConformes = vehConformity.filter(x => !x.isCompliant).length;
  const tauxConf     = totalVehicles > 0 ? Math.round((conformes / totalVehicles) * 100) : 0;
  const confColor    = tauxConf >= 80 ? C.green : tauxConf >= 50 ? C.amber : C.red;

  // Couverture par type
  const coverageByType = Object.entries(DOC_META).filter(([k]) => k !== "other").map(([key, meta]) => {
    const docsOfType = allDocs.filter(d => d.type === key);
    const covered = new Set(docsOfType.filter(d => !["expired","critical"].includes(urgencyLevel(d.expiry_date))).map(d => String(d.vehicle))).size;
    return { key, meta, covered, total: totalVehicles, pct: totalVehicles > 0 ? Math.round((covered / totalVehicles) * 100) : 0 };
  });

  // Timeline 90j
  const upcoming = allDocs
    .filter(d => { const days = daysUntil(d.expiry_date); return days !== null && days >= 0 && days <= 90; })
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
    .slice(0, 8);

  // Véhicules non conformes détaillés
  const nonConformList = vehConformity.filter(x => !x.isCompliant).slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
        {[
          { label: "Taux conformité",   value: `${tauxConf}%`,       sub: `${conformes}/${totalVehicles} véhicules`, color: confColor,  Icon: TrendingUp   },
          { label: "Total documents",   value: totalDocs,             sub: `${totalVehicles} véhicules`,              color: C.green,    Icon: FileText     },
          { label: "Expirés / Critiques",value: docsExpired.length,  sub: "Action immédiate",                        color: docsExpired.length > 0 ? C.red : C.textXLight, Icon: AlertCircle },
          { label: "À renouveler",      value: docsWarning.length,   sub: "Dans 90 jours",                           color: docsWarning.length > 0 ? C.amber : C.textXLight, Icon: AlertTriangle },
          { label: "Véhicules conformes",value: conformes,            sub: `${nonConformes} non conformes`,           color: confColor,  Icon: CheckCircle2 },
        ].map((k, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 10, padding: "14px 16px", border: `1.5px solid ${C.border}`, borderTop: `3px solid ${k.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "1px" }}>{k.label}</span>
              <k.Icon size={15} color={k.color} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 10, color: C.textXLight, marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 1 : Couverture par type + Timeline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Couverture par type */}
        <div style={{ background: C.white, borderRadius: 10, padding: "16px 18px", border: `1.5px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <BarChart2 size={14} color={C.green} /> Couverture par type de document
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {coverageByType.map((c, i) => {
              const barColor = c.pct >= 80 ? C.green : c.pct >= 50 ? C.amber : C.red;
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
                      <c.meta.Icon size={13} color={c.meta.color} /> {c.meta.label}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>{c.covered}/{c.total} ({c.pct}%)</span>
                  </div>
                  <div style={{ height: 5, background: C.bg, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${c.pct}%`, background: barColor, borderRadius: 99, transition: "width .8s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline expirations */}
        <div style={{ background: C.white, borderRadius: 10, padding: "16px 18px", border: `1.5px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={14} color={C.amber} /> Expirations dans les 90 prochains jours
          </div>
          {upcoming.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: C.textLight, fontSize: 12 }}>
              <CheckCircle2 size={28} color={C.green} style={{ margin: "0 auto 8px" }} />
              <div>Aucune expiration imminente</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {upcoming.map((d, i) => {
                const days = daysUntil(d.expiry_date);
                const styl = URGENCY_STYLE[urgencyLevel(d.expiry_date)];
                const meta = DOC_META[d.type] || DOC_META.other;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 7, background: styl.bg, border: `1px solid ${styl.border}` }}>
                    <meta.Icon size={14} color={meta.color} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
                      <div style={{ fontSize: 10, color: C.textLight }}>{d.vehicle_name || "—"} · {fmtShort(d.expiry_date)}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: styl.color, whiteSpace: "nowrap" }}>
                      {days === 0 ? "Auj." : `${days}j`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 2 : Statut documents + Véhicules non conformes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Statut documents */}
        <div style={{ background: C.white, borderRadius: 10, padding: "16px 18px", border: `1.5px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <List size={14} color={C.green} /> Répartition des documents
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Expirés / Critiques", value: docsExpired.length, color: C.red   },
              { label: "Alertes (< 30j)",     value: docsWarning.length, color: C.amber },
              { label: "Valides",             value: docsOk.length,      color: C.green },
              { label: "Sans expiration",     value: docsNone.length,    color: C.textLight },
            ].map((row, i) => {
              const pct = totalDocs > 0 ? Math.round((row.value / totalDocs) * 100) : 0;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 11, color: C.textMid, width: 140, flexShrink: 0 }}>{row.label}</div>
                  <div style={{ flex: 1, height: 5, background: C.bg, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: row.color, borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: row.color, minWidth: 28, textAlign: "right" }}>{row.value}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 10, color: C.textXLight }}>Taux conformité global</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: C.textMid }}>Véhicules conformes</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: confColor }}>{tauxConf}%</span>
            </div>
            <div style={{ height: 8, background: C.bg, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${tauxConf}%`, background: confColor, borderRadius: 99, transition: "width 1s ease" }} />
            </div>
          </div>
        </div>

        {/* Véhicules non conformes */}
        <div style={{ background: C.white, borderRadius: 10, padding: "16px 18px", border: `1.5px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={14} color={C.red} /> Véhicules non conformes ({nonConformes})
          </div>
          {nonConformList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: C.textLight, fontSize: 12 }}>
              <CheckCircle2 size={28} color={C.green} style={{ margin: "0 auto 8px" }} />
              <div>Tous les véhicules sont conformes</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {nonConformList.map((x, i) => (
                <div key={i} style={{ padding: "9px 12px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{x.v.make} {x.v.model}</span>
                    <span style={{ fontSize: 10, color: C.textXLight }}>{x.v.registration_number}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {x.missing.map(t => (
                      <span key={t} style={{ padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700, background: C.redLight, color: C.red, border: `1px solid ${C.redBorder}`, display: "flex", alignItems: "center", gap: 3 }}>
                        <X size={8} /> {DOC_META[t].label}
                      </span>
                    ))}
                    {x.hasExpired && (
                      <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700, background: C.redLight, color: C.red, border: `1px solid ${C.redBorder}` }}>
                        Doc expiré
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {nonConformes > 6 && (
                <div style={{ fontSize: 11, color: C.textLight, textAlign: "center" }}>+ {nonConformes - 6} autres véhicules non conformes</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL UPLOAD / ÉDITION
// ════════════════════════════════════════════════════════════════════════════
function ModalUpload({ vehicle, docExistant, onClose, onSuccess, showToast }) {
  const isBus = vehicle?.vehicle_type === "BUS" || vehicle?.category === "BUS";

  const [form, setForm] = useState({
    type:        docExistant?.type        || "insurance",
    title:       docExistant?.title       || "",
    montant:     docExistant?.montant     || "",
    expiry_date: docExistant?.expiry_date || calcExpiryFromToday(docExistant?.type || "insurance", vehicle?.vehicle_type),
    notes:       docExistant?.notes       || "",
  });

  const [file, setFile]             = useState(null);
  const [aiResult, setAiResult]     = useState(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [showAiDetails, setShowAiDetails] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const [errors, setErrors]         = useState({});
  const fileRef = useRef();

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  const handleTypeChange = (val) => {
    const expiry = calcExpiryFromToday(val, vehicle?.vehicle_type);
    setForm(f => ({ ...f, type: val, expiry_date: expiry }));
    setErrors(e => ({ ...e, type: "", expiry_date: "" }));
  };

  const handleFile = async (f) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { showToast("Fichier trop volumineux (max 10 Mo)", "error"); return; }
    setFile(f);
    setAiResult(null);
    setShowAiDetails(false);
    setAiLoading(true);
    const result = await verifyDocumentAI(f, form.type);
    setAiResult(result);
    setAiLoading(false);
    // Auto-afficher les détails si suspect/invalide
    if (result.verdict !== "AUTHENTIQUE") setShowAiDetails(true);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Le titre est obligatoire.";
    if (!file && !docExistant) e.file = "Veuillez sélectionner un fichier.";
    if (["insurance","inspection","vignette","registration"].includes(form.type) && !form.expiry_date)
      e.expiry_date = "La date d'expiration est obligatoire pour ce type.";
    if (form.montant && isNaN(parseFloat(form.montant))) e.montant = "Montant invalide.";
    if (aiResult?.verdict === "INVALIDE") e.ai = "Document rejeté par l'IA. Téléversement bloqué.";
    setErrors(e);
    return !e.title && !e.file && !e.expiry_date && !e.montant && !e.ai;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("vehicle", vehicle.id);
      fd.append("type", form.type);
      fd.append("title", form.title.trim());
      if (form.expiry_date) fd.append("expiry_date", form.expiry_date);
      if (form.montant)     fd.append("montant", form.montant);
      if (form.notes)       fd.append("notes", form.notes);
      if (file)             fd.append("file", file);
      const path   = docExistant ? `/documents/${docExistant.id}/` : "/documents/";
      const method = docExistant ? "PATCH" : "POST";
      const tkn    = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      const res    = await fetch(`${API_BASE}${path}`, { method, headers: { Authorization: `Bearer ${tkn}` }, body: fd });
      if (!res.ok) { const j = await res.json(); throw new Error(j?.detail || Object.values(j).flat()[0] || "Erreur upload"); }
      showToast(docExistant ? "Document mis à jour ✓" : "Document téléversé ✓");
      onSuccess();
    } catch (e) { showToast(e.message, "error"); }
    finally    { setUploading(false); }
  };

  const needsExpiry = ["insurance","inspection","vignette","registration"].includes(form.type);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: C.white, borderRadius: 14, padding: 24, width: 600, maxWidth: "96vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{docExistant ? "Modifier le document" : "Ajouter un document"}</div>
            <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{vehicle?.make} {vehicle?.model} · {vehicle?.registration_number}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLight, display: "flex" }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Type */}
          <div>
            <label style={lbl}>Type de document *</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {Object.entries(DOC_META).map(([val, meta]) => (
                <button key={val} type="button" onClick={() => handleTypeChange(val)}
                  style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 5, transition: "all .12s",
                    border: `1.5px solid ${form.type === val ? meta.color : C.border}`,
                    background: form.type === val ? `${meta.color}12` : C.white,
                    color: form.type === val ? meta.color : C.textMid,
                  }}>
                  <meta.Icon size={13} /> {meta.label}
                  {DOC_REQUIRED.includes(val) && <span style={{ fontSize: 9, color: C.red }}>*</span>}
                </button>
              ))}
            </div>
            {form.type === "inspection" && (
              <div style={{ marginTop: 7, fontSize: 11, color: C.amber, background: C.amberLight, padding: "5px 10px", borderRadius: 6, display: "flex", gap: 5, alignItems: "center", border: `1px solid ${C.amberBorder}` }}>
                <AlertTriangle size={12} /> {isBus ? "6 mois (transport en commun)" : "12 mois (tourisme / utilitaire)"}
              </div>
            )}
          </div>

          {/* Titre */}
          <div>
            <label style={lbl}>Titre / Référence *</label>
            <input style={errors.title ? { ...inp, borderColor: C.red } : inp} value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder={`Ex : Assurance ACTIVA 2025 — ${vehicle?.registration_number}`} />
            {errors.title && <div style={{ fontSize: 11, color: C.red, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={11} /> {errors.title}</div>}
          </div>

          {/* Zone drop */}
          <div>
            <label style={lbl}>Fichier (PDF ou image) {!docExistant && "*"}</label>
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop} onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${errors.file ? C.red : dragOver ? C.green : C.border}`, borderRadius: 9, padding: "18px 14px", textAlign: "center", cursor: "pointer", background: dragOver ? C.greenLight : file ? C.greenXLight : C.bg, transition: "all .15s" }}>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: "none" }} onChange={e => handleFile(e.target.files?.[0])} />
              {file ? (
                <div>
                  <FileText size={22} color={C.green} style={{ margin: "0 auto 6px" }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: C.textLight }}>{(file.size / 1024).toFixed(0)} Ko</div>
                  <button onClick={e => { e.stopPropagation(); setFile(null); setAiResult(null); setShowAiDetails(false); }}
                    style={{ marginTop: 5, fontSize: 11, color: C.red, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    Supprimer
                  </button>
                </div>
              ) : (
                <div>
                  <Folder size={26} color={C.textXLight} style={{ margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 12, color: C.textMid }}>Glisser-déposer ou cliquer pour sélectionner</div>
                  <div style={{ fontSize: 10, color: C.textXLight, marginTop: 3 }}>PDF, JPG, PNG — max 10 Mo</div>
                </div>
              )}
            </div>
            {errors.file && <div style={{ fontSize: 11, color: C.red, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={11} /> {errors.file}</div>}

            
            {aiResult && !aiLoading && (
              <div style={{ marginTop: 10, borderRadius: 9, overflow: "hidden", border: `1.5px solid ${aiResult.verdict === "AUTHENTIQUE" ? "#BBF7D0" : aiResult.verdict === "SUSPECT" ? C.amberBorder : C.redBorder}` }}>
                {/* En-tête */}
                <div style={{
                  padding: "9px 13px", fontSize: 12,
                  background: aiResult.verdict === "AUTHENTIQUE" ? C.greenLight : aiResult.verdict === "SUSPECT" ? C.amberLight : C.redLight,
                  color: aiResult.verdict === "AUTHENTIQUE" ? C.green : aiResult.verdict === "SUSPECT" ? C.amber : C.red,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {aiResult.verdict === "AUTHENTIQUE" ? <CheckCircle2 size={16} /> : aiResult.verdict === "SUSPECT" ? <AlertTriangle size={16} /> : <AlertCircle size={16} />}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>
                        {aiResult.verdict === "AUTHENTIQUE" ? "Document authentique — vérification réussie"
                          : aiResult.verdict === "SUSPECT"   ? "Document suspect — vérification manuelle recommandée"
                          :                                    "Document invalide — téléversement bloqué"}
                      </div>
                      {aiResult.confidence != null && (
                        <div style={{ fontSize: 10, opacity: .8, marginTop: 1 }}>Confiance : <b>{aiResult.confidence}%</b></div>
                      )}
                    </div>
                  </div>
                  {aiResult.verdict !== "AUTHENTIQUE" && (
                    <button type="button" onClick={() => setShowAiDetails(d => !d)}
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: "rgba(0,0,0,.08)", color: "inherit", border: "none", display: "flex", alignItems: "center", gap: 4 }}>
                      <Info size={11} /> {showAiDetails ? "Masquer" : "Détails"}
                    </button>
                  )}
                </div>

                {/* Détails IA */}
                {aiResult.verdict !== "AUTHENTIQUE" && showAiDetails && (
                  <div style={{ padding: "13px 15px", background: C.white, borderTop: `1px solid ${aiResult.verdict === "INVALIDE" ? C.redBorder : C.amberBorder}` }}>
                    {/* Type détecté vs attendu */}
                    {(aiResult.detected_type || aiResult.matches_expected !== null) && (
                      <div style={{ marginBottom: 10, padding: "8px 11px", borderRadius: 7, background: C.bg, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.textLight, marginBottom: 5, textTransform: "uppercase", letterSpacing: "1px" }}>Analyse du type</div>
                        <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
                          <div><span style={{ color: C.textLight }}>Attendu : </span><span style={{ fontWeight: 700, color: C.text }}>{DOC_META[form.type]?.label || form.type}</span></div>
                          {aiResult.detected_type && (
                            <div>
                              <span style={{ color: C.textLight }}>Détecté : </span>
                              <span style={{ fontWeight: 700, color: aiResult.matches_expected ? C.green : C.red }}>{aiResult.detected_type}</span>
                              {!aiResult.matches_expected && <span style={{ color: C.red, marginLeft: 4, fontWeight: 700 }}>≠ Incohérent</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Problèmes identifiés */}
                    {aiResult.issues && aiResult.issues.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.textLight, marginBottom: 7, textTransform: "uppercase", letterSpacing: "1px" }}>
                          Problèmes identifiés ({aiResult.issues.length})
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {aiResult.issues.map((issue, i) => (
                            <div key={i} style={{
                              padding: "7px 10px", borderRadius: 6, fontSize: 11, lineHeight: 1.6,
                              background: aiResult.verdict === "INVALIDE" ? C.redLight : C.amberLight,
                              color:      aiResult.verdict === "INVALIDE" ? C.red      : C.amber,
                              borderLeft: `3px solid ${aiResult.verdict === "INVALIDE" ? C.red : C.amber}`,
                              display: "flex", alignItems: "flex-start", gap: 7,
                            }}>
                              {aiResult.verdict === "INVALIDE" ? <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />}
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommandation */}
                    <div style={{ marginTop: 9, padding: "7px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: aiResult.verdict === "INVALIDE" ? C.redLight : C.amberLight,
                      color:      aiResult.verdict === "INVALIDE" ? C.red      : C.amber,
                      border: `1px solid ${aiResult.verdict === "INVALIDE" ? C.redBorder : C.amberBorder}`,
                      display: "flex", alignItems: "flex-start", gap: 6,
                    }}>
                      <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      {aiResult.verdict === "INVALIDE"
                        ? "Ce document ne peut pas être téléversé. Fournissez un document officiel valide."
                        : "Vous pouvez soumettre mais une vérification manuelle est recommandée."}
                    </div>
                  </div>
                )}
              </div>
            )}
            {errors.ai && <div style={{ fontSize: 11, color: C.red, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={11} /> {errors.ai}</div>}
          </div>

          {/* Montant + Date expiration */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Montant (FCFA)</label>
              <input style={inp} type="number" min="0" value={form.montant} onChange={e => set("montant", e.target.value)} placeholder="Ex : 120 000" />
              {errors.montant && <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>{errors.montant}</div>}
            </div>
            <div>
              <label style={lbl}>Date d'expiration {needsExpiry && <span style={{ color: C.red }}>*</span>}</label>
              <input
                style={{ ...inp, colorScheme: "light",
                  background: form.expiry_date ? (new Date(form.expiry_date) < new Date() ? C.redLight : C.greenLight) : C.white,
                  color: form.expiry_date ? (new Date(form.expiry_date) < new Date() ? C.red : C.green) : C.text,
                  fontWeight: form.expiry_date ? 700 : 400,
                  borderColor: errors.expiry_date ? C.red : C.border,
                }}
                type="date" value={form.expiry_date} onChange={e => set("expiry_date", e.target.value)} />
              {form.expiry_date && new Date(form.expiry_date) >= new Date() && !errors.expiry_date && (
                <div style={{ fontSize: 10, color: C.green, marginTop: 3 }}>Expire dans {daysUntil(form.expiry_date)}j</div>
              )}
              {errors.expiry_date && <div style={{ fontSize: 11, color: C.red, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={11} /> {errors.expiry_date}</div>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={lbl}>Notes internes</label>
            <textarea style={{ ...inp, height: 56, resize: "vertical" }} value={form.notes}
              onChange={e => set("notes", e.target.value)} placeholder="N° de police, prestataire, remarques…" />
          </div>

          {/* Résumé erreurs */}
          {Object.values(errors).some(Boolean) && (
            <div style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: "10px 13px" }}>
              <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}><AlertCircle size={13} /> Erreurs à corriger</div>
              {Object.values(errors).filter(Boolean).map((msg, i) => (
                <div key={i} style={{ fontSize: 11, color: C.red, marginTop: 3, display: "flex", gap: 4 }}><span>•</span><span>{msg}</span></div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <button onClick={onClose} style={btnGhost}>Annuler</button>
          <button onClick={handleSubmit} disabled={uploading || aiResult?.verdict === "INVALIDE"}
            style={{ ...btnPrimary, opacity: (uploading || aiResult?.verdict === "INVALIDE") ? 0.65 : 1 }}>
            {uploading && <Spinner size={13} color="#fff" />}
            {uploading ? "Téléversement…" : docExistant ? "Mettre à jour" : "Téléverser"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CARTE DOCUMENT
// ════════════════════════════════════════════════════════════════════════════
function DocCard({ doc, onEdit, onDelete, deletingId }) {
  const [open, setOpen]         = useState(false);
  const [viewerUrl, setViewerUrl] = useState(null);
  const urg  = urgencyLevel(doc.expiry_date);
  const styl = URGENCY_STYLE[urg];
  const meta = DOC_META[doc.type] || DOC_META.other;
  const days = daysUntil(doc.expiry_date);
  const isDeleting = deletingId === doc.id;

  const barBlock = doc.expiry_date && doc.created_at ? (() => {
    const total   = new Date(doc.expiry_date) - new Date(doc.created_at);
    const elapsed = Date.now() - new Date(doc.created_at);
    const pct     = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
    const barCol  = pct > 85 ? C.red : pct > 65 ? C.amber : C.green;
    return { pct, barCol };
  })() : null;

  return (
    <>
      {viewerUrl && <ModalFileViewer url={viewerUrl} title={doc.title} onClose={() => setViewerUrl(null)} />}
      <div style={{
        border: `1px solid ${styl.border}`,
        borderLeft: `3px solid ${styl.color}`,
        borderRadius: 9, padding: "11px 14px",
        background: ["expired","critical"].includes(urg) ? styl.bg : C.white,
        opacity: isDeleting ? 0.6 : 1, transition: "all .12s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
          <div style={{ width: 34, height: 34, borderRadius: 7, background: `${meta.color}12`, border: `1px solid ${meta.color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <meta.Icon size={16} color={meta.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
            <div style={{ fontSize: 10, color: C.textLight, marginTop: 1 }}>{meta.label}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: styl.bg, color: styl.color, border: `1px solid ${styl.border}`, whiteSpace: "nowrap" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: styl.dot, display: "inline-block" }} />
              {styl.label}
            </span>
            {doc.expiry_date && (
              <div style={{ fontSize: 10, color: days !== null && days < 0 ? C.red : days !== null && days <= 30 ? C.amber : C.textXLight }}>
                {days !== null && days < 0 ? `Expiré ${Math.abs(days)}j` : days !== null ? `${days}j restants` : "—"}
              </div>
            )}
          </div>
          {open ? <ChevronUp size={14} color={C.textXLight} /> : <ChevronDown size={14} color={C.textXLight} />}
        </div>

        {barBlock && (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 3, background: C.bg, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${barBlock.pct}%`, background: barBlock.barCol, borderRadius: 99 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.textXLight, marginTop: 2 }}>
              <span>Créé {fmtShort(doc.created_at)}</span>
              <span style={{ fontWeight: 700, color: barBlock.barCol }}>{Math.round(barBlock.pct)}% écoulé</span>
              <span>Expire {fmtShort(doc.expiry_date)}</span>
            </div>
          </div>
        )}

        {open && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {[
                { Icon: Calendar, label: "Expiration", val: fmt(doc.expiry_date) || "Sans expiration" },
                { Icon: FileText, label: "Montant",    val: doc.montant ? `${Number(doc.montant).toLocaleString("fr-FR")} FCFA` : "Non renseigné" },
              ].map((r, i) => (
                <div key={i} style={{ background: C.bg, borderRadius: 7, padding: "7px 10px" }}>
                  <div style={{ fontSize: 9, color: C.textXLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
                    <r.Icon size={10} /> {r.label}
                  </div>
                  <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{r.val}</div>
                </div>
              ))}
              {doc.notes && (
                <div style={{ gridColumn: "1/-1", background: C.bg, borderRadius: 7, padding: "7px 10px" }}>
                  <div style={{ fontSize: 9, color: C.textXLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 3 }}>Notes</div>
                  <div style={{ fontSize: 11, color: C.textMid, lineHeight: 1.5 }}>{doc.notes}</div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              {doc.file && (
                <button onClick={() => setViewerUrl(doc.file)}
                  style={{ ...btnGhost, fontSize: 11, padding: "5px 11px" }}>
                  <Eye size={12} /> Visualiser
                </button>
              )}
              <button onClick={() => onEdit(doc)} disabled={isDeleting}
                style={{ ...btnGhost, fontSize: 11, padding: "5px 11px" }}>
                <Pencil size={12} /> Modifier
              </button>
              <button onClick={() => onDelete(doc)} disabled={isDeleting}
                style={{ ...btnGhost, fontSize: 11, padding: "5px 11px", color: C.red, borderColor: C.redBorder, background: C.redLight }}>
                {isDeleting ? <><Spinner size={11} color={C.red} /> Suppression…</> : <><Trash2 size={12} /> Supprimer</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PANNEAU VÉHICULE
// ════════════════════════════════════════════════════════════════════════════
function VehiclePanel({ vehicle, showToast, onRefreshAlerts, onDocsLoaded }) {
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [open, setOpen]           = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc]     = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/documents/?vehicle=${vehicle.id}`);
      const list = Array.isArray(res) ? res : res?.results ?? [];
      setDocs(list);
      onDocsLoaded?.(vehicle.id, list);
    } catch { setDocs([]); }
    finally  { setLoading(false); }
  }, [vehicle.id]);

  useEffect(() => { if (open) loadDocs(); }, [open, loadDocs]);

  const handleDeleteConfirm = async () => {
    if (!deleteDoc) return;
    setDeletingId(deleteDoc.id);
    setDeleteDoc(null);
    try {
      await apiFetch(`/documents/${deleteDoc.id}/`, { method: "DELETE" });
      showToast("Document supprimé");
      loadDocs();
      onRefreshAlerts?.();
    } catch (e) { showToast(e.message, "error"); }
    finally { setDeletingId(null); }
  };

  const handleSuccess = () => { setShowModal(false); setEditDoc(null); loadDocs(); onRefreshAlerts?.(); };

  const { isCompliant, missing } = getVehicleCompliance(docs);
  const nExpired  = docs.filter(d => ["expired","critical"].includes(urgencyLevel(d.expiry_date))).length;
  const nWarning  = docs.filter(d => ["warning","soon"].includes(urgencyLevel(d.expiry_date))).length;

  const borderColor = nExpired ? C.red : nWarning ? C.amber : isCompliant ? C.green : C.border;
  const headerBg    = nExpired ? `${C.redLight}` : nWarning ? `${C.amberLight}` : C.white;

  const badge = (() => {
    if (docs.length === 0 && !loading) return { label: "Non documenté", color: C.amber, bg: C.amberLight };
    if (nExpired) return { label: `${nExpired} expiré${nExpired > 1 ? "s" : ""}`, color: C.red, bg: C.redLight };
    if (!isCompliant) return { label: `Incomplet`, color: C.amber, bg: C.amberLight };
    return { label: "Conforme", color: C.green, bg: C.greenLight };
  })();

  return (
    <>
      {deleteDoc && (
        <ModalConfirmDelete docTitle={deleteDoc.title} onCancel={() => setDeleteDoc(null)} onConfirm={handleDeleteConfirm} loading={!!deletingId} />
      )}
      <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: 11, overflow: "hidden", background: C.white }}>
        <div style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, background: headerBg, borderBottom: open ? `1px solid ${C.border}` : "none" }}
          onClick={() => setOpen(o => !o)}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: C.greenLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Car size={20} color={C.green} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{vehicle.make} {vehicle.model}</div>
            <div style={{ fontSize: 10, color: C.textLight, letterSpacing: "1px", marginTop: 1 }}>
              {vehicle.registration_number}{vehicle.year && ` · ${vehicle.year}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {missing.length > 0 && !open && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {missing.slice(0, 2).map(t => (
                  <span key={t} style={{ padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700, background: C.redLight, color: C.red, border: `1px solid ${C.redBorder}`, display: "flex", alignItems: "center", gap: 3 }}>
                    <X size={8} /> {DOC_META[t].label}
                  </span>
                ))}
                {missing.length > 2 && <span style={{ fontSize: 9, color: C.textLight }}>+{missing.length - 2}</span>}
              </div>
            )}
            <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}>
              {badge.label}
            </span>
            <span style={{ fontSize: 10, color: C.textXLight }}>{docs.length} doc{docs.length > 1 ? "s" : ""}</span>
            {open ? <ChevronUp size={14} color={C.textXLight} /> : <ChevronDown size={14} color={C.textXLight} />}
          </div>
        </div>

        {open && (
          <div style={{ padding: "14px 16px" }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SkeletonDoc /><SkeletonDoc />
              </div>
            ) : (
              <>
                {/* Checklist conformité */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {DOC_REQUIRED.map(t => {
                    const doc = docs.find(d => d.type === t && !["expired","critical"].includes(urgencyLevel(d.expiry_date)));
                    const hasExpired = docs.some(d => d.type === t && ["expired","critical"].includes(urgencyLevel(d.expiry_date)));
                    const meta = DOC_META[t];
                    return (
                      <div key={t} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                        background: doc ? C.greenLight : hasExpired ? C.redLight : C.bg,
                        color: doc ? C.green : hasExpired ? C.red : C.textLight,
                        border: `1px solid ${doc ? "#BBF7D0" : hasExpired ? C.redBorder : C.border}`,
                      }}>
                        {doc ? <CheckCircle2 size={12} /> : hasExpired ? <AlertCircle size={12} /> : <X size={12} />}
                        {meta.label}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                  <button onClick={() => { setEditDoc(null); setShowModal(true); }} style={btnPrimary}>
                    <Plus size={14} /> Ajouter
                  </button>
                </div>

                {docs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: C.textLight, background: C.bg, borderRadius: 9, border: `2px dashed ${C.border}` }}>
                    <Folder size={28} color={C.textXLight} style={{ margin: "0 auto 8px" }} />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Aucun document téléversé</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {docs
                      .sort((a, b) => URGENCY_ORDER[urgencyLevel(a.expiry_date)] - URGENCY_ORDER[urgencyLevel(b.expiry_date)])
                      .map(doc => (
                        <DocCard key={doc.id} doc={doc} deletingId={deletingId}
                          onEdit={(d) => { setEditDoc(d); setShowModal(true); }}
                          onDelete={(d) => setDeleteDoc(d)} />
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {showModal && (
          <ModalUpload vehicle={vehicle} docExistant={editDoc}
            onClose={() => { setShowModal(false); setEditDoc(null); }}
            onSuccess={handleSuccess} showToast={showToast} />
        )}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export function TabDocumentsGestionnaire({ vehicles = [] }) {
  const [toast, setToast]             = useState({ msg: "", type: "success" });
  const [alertes, setAlertes]         = useState([]);
  const [allDocs, setAllDocs]         = useState([]);
  const [docsPerVeh, setDocsPerVeh]   = useState({});
  const [search, setSearch]           = useState("");
  const [filterDoc, setFilterDoc]     = useState("all");  // all | compliant | incomplete | nodocs | by type
  const [filterType, setFilterType]   = useState("");     // insurance|registration|inspection|vignette
  const [sortBy, setSortBy]           = useState("default");
  const [activeTab, setActiveTab]     = useState("documents");
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const showToast = useCallback((msg, type = "success") => setToast({ msg, type }), []);

  const loadAlertes = useCallback(async () => {
    try { const res = await apiFetch("/documents/expiring/?days=90"); setAlertes(Array.isArray(res) ? res : res?.results ?? []); }
    catch { setAlertes([]); }
  }, []);

  const loadAllDocs = useCallback(async () => {
    try { const res = await apiFetch("/documents/"); setAllDocs(Array.isArray(res) ? res : res?.results ?? []); }
    catch { setAllDocs([]); }
  }, []);

  useEffect(() => { loadAlertes(); loadAllDocs(); }, [loadAlertes, loadAllDocs]);

  const handleDocsLoaded = useCallback((vehicleId, docs) => {
    setDocsPerVeh(prev => ({ ...prev, [String(vehicleId)]: docs }));
  }, []);

  const nExpired  = alertes.filter(d => ["expired","critical"].includes(urgencyLevel(d.expiry_date))).length;
  const nCritical = alertes.filter(d => urgencyLevel(d.expiry_date) === "critical").length;
  const nWarning  = alertes.filter(d => ["warning","soon"].includes(urgencyLevel(d.expiry_date))).length;

  // Conformité basée sur les 4 docs obligatoires
  const getVehicleStatus = (vehicleId) => {
    const docs = docsPerVeh[String(vehicleId)] || [];
    if (docs.length === 0) return "nodocs";
    const { isCompliant } = getVehicleCompliance(docs);
    return isCompliant ? "compliant" : "incomplete";
  };

  // Filtre par type de document : véhicules qui ONT ce type de doc valide
  const getVehicleHasDocType = (vehicleId, type) => {
    const docs = docsPerVeh[String(vehicleId)] || [];
    return docs.some(d => d.type === type && !["expired","critical"].includes(urgencyLevel(d.expiry_date)));
  };

  const filtered = useMemo(() => {
    let list = vehicles.filter(v =>
      `${v.make} ${v.model} ${v.registration_number}`.toLowerCase().includes(search.toLowerCase())
    );
    if (filterDoc === "compliant")  list = list.filter(v => getVehicleStatus(v.id) === "compliant");
    else if (filterDoc === "incomplete") list = list.filter(v => getVehicleStatus(v.id) === "incomplete");
    else if (filterDoc === "nodocs")     list = list.filter(v => getVehicleStatus(v.id) === "nodocs");
    else if (filterDoc === "bytype" && filterType) list = list.filter(v => getVehicleHasDocType(v.id, filterType));
    else if (filterDoc === "bytype_missing" && filterType) list = list.filter(v => !getVehicleHasDocType(v.id, filterType));

    if (sortBy === "alpha")   list = [...list].sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`));
    if (sortBy === "urgency") {
      const order = { nodocs: 0, incomplete: 1, compliant: 2 };
      list = [...list].sort((a, b) => (order[getVehicleStatus(a.id)] || 1) - (order[getVehicleStatus(b.id)] || 1));
    }
    return list;
  }, [vehicles, search, filterDoc, filterType, sortBy, docsPerVeh]);

  const conformes = vehicles.filter(v => getVehicleStatus(v.id) === "compliant").length;
  const toutConforme = conformes === vehicles.length && vehicles.length > 0 && nExpired === 0;

  const activeFilterCount = [filterDoc !== "all" ? 1 : 0].reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "system-ui,-apple-system,sans-serif", color: C.text }}>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes toastIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }
        input[type="date"] { color-scheme: light; background: #FFFFFF; color: #111827; }
        select option { background: #FFFFFF; color: #111827; }
      `}</style>

      {/* ── Onglets ── */}
      <div style={{ display: "flex", gap: 4, background: C.bg, padding: 3, borderRadius: 9, border: `1px solid ${C.border}`, width: "fit-content" }}>
        {[{ id: "documents", label: "Documents", Icon: Folder }, { id: "stats", label: "Statistiques", Icon: BarChart2 }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: "none",
              background: activeTab === t.id ? C.white : "transparent",
              color: activeTab === t.id ? C.green : C.textLight,
              boxShadow: activeTab === t.id ? "0 1px 4px rgba(0,0,0,.07)" : "none",
              transition: "all .15s", display: "flex", alignItems: "center", gap: 6 }}>
            <t.Icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { Icon: Car,           val: vehicles.length, label: "Véhicules gérés",   color: C.green },
          { Icon: AlertCircle,   val: nExpired,        label: "Expirés",           color: nExpired  ? C.red   : C.textXLight },
          { Icon: AlertTriangle, val: nWarning,        label: "Alertes (< 90j)",   color: nWarning  ? C.amber : C.textXLight },
          { Icon: CheckCircle2,  val: conformes,       label: "Véhicules conformes", color: C.green },
        ].map((k, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 9, padding: "12px 14px", border: `1.5px solid ${C.border}`, borderTop: `3px solid ${k.color}`, display: "flex", alignItems: "center", gap: 12 }}>
            <k.Icon size={18} color={k.color} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 10, color: C.textXLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginTop: 2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bannières ── */}
      {nExpired > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 9, padding: "12px 14px", fontSize: 12, color: C.red }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <b>{nExpired} document{nExpired > 1 ? "s" : ""} nécessite{nExpired > 1 ? "nt" : ""} une action immédiate.</b>
            {alertes.filter(d => ["expired","critical"].includes(urgencyLevel(d.expiry_date))).slice(0, 3).map(d => (
              <div key={d.id} style={{ marginTop: 3, fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
                <ChevronRight size={11} />
                <b>{d.title}</b>{d.vehicle_name ? ` — ${d.vehicle_name}` : ""}
                {d.expiry_date ? ` · ${fmtShort(d.expiry_date)}` : ""}
              </div>
            ))}
          </div>
        </div>
      )}
      {nWarning > 0 && nExpired === 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", background: C.amberLight, border: `1px solid ${C.amberBorder}`, borderRadius: 9, padding: "10px 14px", fontSize: 12, color: C.amber }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <b>{nWarning} document{nWarning > 1 ? "s" : ""} expire{nWarning > 1 ? "nt" : ""} dans les 90 prochains jours.</b>
        </div>
      )}
      {toutConforme && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", background: C.greenLight, border: `1px solid #BBF7D0`, borderRadius: 9, padding: "10px 14px", fontSize: 12, color: C.green }}>
          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
          <b>Tous les véhicules possèdent leurs 4 documents obligatoires — parc conforme.</b>
        </div>
      )}

      {/* ════ ONGLET DOCUMENTS ════ */}
      {activeTab === "documents" && (
        <div style={{ background: C.white, borderRadius: 11, padding: "16px 18px", border: `1.5px solid ${C.border}` }}>

          {/* Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Documents par véhicule</div>
              <div style={{ fontSize: 11, color: C.textLight, marginTop: 1 }}>
                Un véhicule est conforme s'il possède : Assurance, Carte grise, Vignette et Visite technique valides
              </div>
            </div>

            {/* Boutons export */}
            <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => exportExcel(vehicles, docsPerVeh)} style={{ ...btnGhost, fontSize: 11, padding: "6px 12px", color: C.green, borderColor: "#BBF7D0", background: C.greenLight }}>
                <FileSpreadsheet size={13} /> Exporter CSV
              </button>
              <button onClick={() => exportPDF(vehicles, docsPerVeh)} style={{ ...btnGhost, fontSize: 11, padding: "6px 12px", color: C.red, borderColor: C.redBorder, background: C.redLight }}>
                <Printer size={13} /> Exporter PDF
              </button>
            </div>
          </div>

          {/* Barre filtres + recherche */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            {/* Recherche */}
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textXLight, pointerEvents: "none" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un véhicule…"
                style={{ ...inp, paddingLeft: 32, fontSize: 12, background: "#FFFFFF", color: C.text, colorScheme: "light" }} />
            </div>

            {/* Filtres rapides statut */}
            <div style={{ display: "flex", gap: 3, background: C.bg, padding: 3, borderRadius: 8, border: `1px solid ${C.border}` }}>
              {[
                ["all",        "Tous"          ],
                ["compliant",  "Conformes"     ],
                ["incomplete", "Incomplets"    ],
                ["nodocs",     "Sans documents"],
              ].map(([val, label]) => (
                <button key={val} onClick={() => { setFilterDoc(val); setFilterType(""); }}
                  style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "none",
                    background: filterDoc === val ? C.white : "transparent",
                    color: filterDoc === val ? C.green : C.textLight,
                    boxShadow: filterDoc === val ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                    transition: "all .12s",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Filtre avancé par type de doc */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowFilterPanel(p => !p)}
                style={{ ...btnGhost, fontSize: 11, padding: "6px 12px",
                  background: showFilterPanel ? C.greenLight : C.white,
                  borderColor: showFilterPanel ? C.green : C.border,
                  color: showFilterPanel ? C.green : C.textMid,
                }}>
                <SlidersHorizontal size={13} /> Filtre par document
                {filterDoc.startsWith("bytype") && filterType && <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />}
              </button>
              {showFilterPanel && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14, zIndex: 100, minWidth: 280, boxShadow: "0 8px 28px rgba(0,0,0,.12)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                    <SlidersHorizontal size={12} color={C.green} /> Filtrer par type de document
                  </div>
                  {DOC_REQUIRED.map(t => {
                    const meta = DOC_META[t];
                    return (
                      <div key={t} style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                          <meta.Icon size={11} color={meta.color} /> {meta.label}
                        </div>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => { setFilterDoc("bytype"); setFilterType(t); setShowFilterPanel(false); }}
                            style={{ flex: 1, padding: "5px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                              border: `1px solid ${C.green}`, background: filterDoc === "bytype" && filterType === t ? C.greenLight : C.white, color: C.green }}>
                            <CheckCircle2 size={11} /> Ont cette assurance
                          </button>
                          <button onClick={() => { setFilterDoc("bytype_missing"); setFilterType(t); setShowFilterPanel(false); }}
                            style={{ flex: 1, padding: "5px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                              border: `1px solid ${C.red}`, background: filterDoc === "bytype_missing" && filterType === t ? C.redLight : C.white, color: C.red }}>
                            <X size={11} /> Manque ce doc
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => { setFilterDoc("all"); setFilterType(""); setShowFilterPanel(false); }}
                    style={{ marginTop: 8, width: "100%", padding: "6px", border: `1px solid ${C.border}`, borderRadius: 7, background: C.bg, color: C.textMid, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <X size={12} /> Réinitialiser
                  </button>
                </div>
              )}
            </div>

            {/* Tri */}
            <div style={{ position: "relative" }}>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ ...inp, width: "auto", padding: "6px 28px 6px 10px", fontSize: 11, color: C.text, background: C.white, appearance: "none", WebkitAppearance: "none", colorScheme: "light" }}>
                <option value="default">Tri par défaut</option>
                <option value="urgency">Par urgence</option>
                <option value="alpha">A → Z</option>
              </select>
              <ChevronDown size={13} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: C.textXLight, pointerEvents: "none" }} />
            </div>
          </div>

          {/* Info filtre actif */}
          {(filterDoc !== "all" || search) && (
            <div style={{ fontSize: 11, color: C.textLight, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{filtered.length} véhicule{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}</span>
              <button onClick={() => { setFilterDoc("all"); setFilterType(""); setSearch(""); }}
                style={{ fontSize: 11, color: C.red, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                <X size={11} /> Effacer les filtres
              </button>
            </div>
          )}

          {/* Liste véhicules */}
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.textLight, fontSize: 13 }}>
                <Search size={32} color={C.border} style={{ margin: "0 auto 10px" }} />
                Aucun véhicule pour ce filtre
              </div>
            ) : (
              filtered.map(v => (
                <VehiclePanel key={v.id} vehicle={v} showToast={showToast}
                  onRefreshAlerts={() => { loadAlertes(); loadAllDocs(); }}
                  onDocsLoaded={handleDocsLoaded} />
              ))
            )}
          </div>
        </div>
      )}

      {/* ════ ONGLET STATS ════ */}
      {activeTab === "stats" && (
        <TabStatistiques vehicles={vehicles} allDocs={allDocs} />
      )}

      <Toast msg={toast.msg} type={toast.type} onDone={() => setToast({ msg: "", type: "success" })} />
    </div>
  );
}
