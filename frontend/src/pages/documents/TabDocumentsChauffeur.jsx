// ─── pages/documents/TabDocumentsChauffeur.jsx ────────────────────────────────
// v2 — lucide-react + charte vert #1B5E37 / rouge #C0182A / orange #D97706
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import {
  Car, Wrench, Settings, Shield, Tag, FileText,
  Clock, CheckCircle2, AlertTriangle, XCircle,
  Eye, Lock, Fuel, Users, Palette, Calendar,
  Gauge, Zap, RefreshCw, FolderOpen, Bell,
  ChevronRight, Info, BadgeCheck,
} from "lucide-react";

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/api/v1`;

async function apiFetch(path) {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  if (res.status === 204) return null;
  const json = await res.json();
  return json?.data ?? json;
}

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const P = {
  green:        "#1B5E37",
  greenMid:     "#16A34A",
  greenLight:   "#EAF4EE",
  greenBorder:  "#BBF7D0",
  red:          "#C0182A",
  redLight:     "#FDF0F1",
  redBorder:    "#FECDD3",
  orange:       "#D97706",
  orangeLight:  "#FFFBEB",
  orangeBorder: "#FDE68A",
  blue:         "#1D4ED8",
  blueLight:    "#EFF6FF",
  border:       "#E2E8E5",
  bg:           "#F7FAF8",
  white:        "#FFFFFF",
  text:         "#1A2820",
  textMid:      "#4A6358",
  textLight:    "#8EA99A",
  slate:        "#475569",
  slateLight:   "#F8FAFC",
};

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes dc-spin    { to { transform: rotate(360deg); } }
  @keyframes dc-fade-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes dc-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .dc-fade { animation: dc-fade-in .22s ease both; }

  .dc-card {
    background:#fff; border-radius:14px;
    box-shadow:0 1px 4px rgba(0,0,0,.06);
  }

  .dc-info-cell {
    padding:11px 14px; transition:background .1s;
  }
  .dc-info-cell:hover { background:#F0F4F2; }

  .dc-doc-row {
    display:flex; align-items:center; gap:10px;
    padding:10px 12px; background:${P.bg}; border-radius:9px;
    border:1.5px solid ${P.border}; transition:all .15s;
  }
  .dc-doc-row:hover { border-color:${P.green}; background:${P.greenLight}; }

  .dc-alert-row {
    display:flex; align-items:flex-start; gap:12px;
    padding:12px 14px; border-radius:10px; transition:all .15s;
  }

  .dc-skel {
    border-radius:6px;
    background:linear-gradient(90deg,${P.bg} 25%,#eaeceb 50%,${P.bg} 75%);
    background-size:200% 100%; animation:dc-shimmer 1.4s ease infinite;
  }

  .dc-status-chip {
    display:inline-flex; align-items:center; gap:5px;
    padding:3px 10px; border-radius:99px;
    font-size:10px; font-weight:700; white-space:nowrap;
  }

  @media(max-width:768px) {
    .dc-two-col { grid-template-columns:1fr!important; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = d =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" }) : "—";

const daysUntil = d => d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : null;

function alertStatus(days) {
  if (days === null) return { color: P.green,  bg: P.greenLight,  border: P.greenBorder,  Icon: CheckCircle2,  label: "Valide",              level: "ok"      };
  if (days < 0)      return { color: P.red,    bg: P.redLight,    border: P.redBorder,    Icon: XCircle,       label: `Expiré depuis ${Math.abs(days)}j`, level: "danger"  };
  if (days <= 30)    return { color: P.red,    bg: P.redLight,    border: P.redBorder,    Icon: AlertTriangle, label: `Expire dans ${days}j`, level: "danger"  };
  if (days <= 90)    return { color: P.orange, bg: P.orangeLight, border: P.orangeBorder, Icon: AlertTriangle, label: `Encore ${days} jours`, level: "warning" };
  return               { color: P.green,  bg: P.greenLight,  border: P.greenBorder,  Icon: CheckCircle2,  label: `Encore ${days} jours`,level: "ok"      };
}

// Icône et label par type de document
const DOC_TYPE_META = {
  insurance:   { Icon: Shield,    label: "Assurance"         },
  inspection:  { Icon: Wrench,    label: "Contrôle technique"},
  vignette:    { Icon: Tag,       label: "Vignette"          },
  maintenance: { Icon: Settings,  label: "Révision"          },
  other:       { Icon: FileText,  label: "Document"          },
};

function getDocMeta(type) {
  return DOC_TYPE_META[type] || DOC_TYPE_META.other;
}

// Statut véhicule
function VehicleStatusChip({ status }) {
  const map = {
    DISPONIBLE:     { label: "Disponible",     color: P.green,  bg: P.greenLight,  Icon: CheckCircle2 },
    EN_SERVICE:     { label: "En service",     color: P.orange, bg: P.orangeLight, Icon: RefreshCw    },
    EN_MAINTENANCE: { label: "Maintenance",    color: P.red,    bg: P.redLight,    Icon: Wrench       },
  };
  const s = map[status] || { label: status || "—", color: P.textLight, bg: P.bg, Icon: Info };
  return (
    <div className="dc-status-chip" style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}22` }}>
      <s.Icon size={11} />
      {s.label}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function TabDocumentsChauffeur({ vehicule }) {
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDocs = useCallback(async () => {
    if (!vehicule?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`/documents/?vehicle=${vehicule.id}`);
      setDocs(Array.isArray(res) ? res : res?.results ?? []);
    } catch { setDocs([]); }
    finally { setLoading(false); }
  }, [vehicule?.id]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // ── État : pas de véhicule assigné ────────────────────────────────────────
  if (!vehicule) return (
    <>
      <style>{CSS}</style>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 20px", gap:14, textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:16, background:P.greenLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Car size={36} color={P.green}/>
        </div>
        <div style={{ fontSize:16, fontWeight:800, color:P.text }}>Aucun véhicule assigné</div>
        <div style={{ fontSize:13, color:P.textLight, maxWidth:300, lineHeight:1.6 }}>
          Contactez le gestionnaire pour qu'un véhicule vous soit attribué.
        </div>
      </div>
    </>
  );

  // ── Chargement ────────────────────────────────────────────────────────────
  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {/* Skeleton header */}
        <div className="dc-skel" style={{ height:90, borderRadius:14 }}/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div className="dc-skel" style={{ height:340, borderRadius:14 }}/>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div className="dc-skel" style={{ height:200, borderRadius:14 }}/>
            <div className="dc-skel" style={{ height:120, borderRadius:14 }}/>
          </div>
        </div>
      </div>
    </>
  );

  // ── Données ────────────────────────────────────────────────────────────────
  const make  = vehicule.brand || vehicule.make || "—";
  const model = vehicule.model || "—";
  const plate = vehicule.registration_number || vehicule.license_plate || "—";

  const infos = [
    { label:"Marque",             val: make,                                                                        Icon: Car      },
    { label:"Modèle",             val: model,                                                                       Icon: Car      },
    { label:"Immatriculation",    val: plate,                                         bold:true,                   Icon: BadgeCheck},
    { label:"Année",              val: vehicule.year || "—",                                                        Icon: Calendar },
    { label:"Catégorie",          val: vehicule.category || vehicule.vehicle_type || "—",                           Icon: FileText },
    { label:"Capacité",           val: vehicule.seating_capacity ? `${vehicule.seating_capacity} places` : "—",    Icon: Users    },
    { label:"Transmission",       val: vehicule.transmission || "—",                                                Icon: Settings },
    { label:"Couleur",            val: vehicule.color || "—",                                                       Icon: Palette  },
    { label:"Mise en service",    val: fmt(vehicule.created_at),                                                    Icon: Calendar },
    { label:"Kilométrage",        val: vehicule.current_mileage ? `${Number(vehicule.current_mileage).toLocaleString("fr-FR")} km` : "—", Icon: Gauge },
    { label:"Carburant",          val: vehicule.fuel_type || "—",                                                   Icon: Fuel     },
    { label:"Puissance",          val: vehicule.power ? `${vehicule.power} CV` : "—",                              Icon: Zap      },
  ];

  const docMap = {};
  docs.forEach(d => { docMap[d.type] = d; });

  const alertes = [
    { key:"insurance",   label:"Assurance",          Icon: Shield,   expiry: docMap.insurance?.expiry_date   ?? null, detail: docMap.insurance?.title   ?? null, present: !!docMap.insurance   },
    { key:"inspection",  label:"Contrôle technique",  Icon: Wrench,   expiry: docMap.inspection?.expiry_date  ?? null, detail: docMap.inspection?.title  ?? null, present: !!docMap.inspection  },
    { key:"vignette",    label:"Vignette",            Icon: Tag,      expiry: docMap.vignette?.expiry_date    ?? null, detail: docMap.vignette?.title    ?? null, present: !!docMap.vignette    },
    { key:"maintenance", label:"Révision",            Icon: Settings, expiry: docMap.maintenance?.expiry_date ?? null, detail: docMap.maintenance?.title ?? null, present: !!docMap.maintenance },
  ];

  // Nb alertes urgentes
  const urgentCount = alertes.filter(a => {
    if (!a.present) return false;
    const d = daysUntil(a.expiry);
    return d !== null && d <= 30;
  }).length;

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display:"flex", flexDirection:"column", gap:16, fontFamily:"inherit" }} className="dc-fade">

        {/* ── HEADER VÉHICULE ── */}
        <div style={{
          background:`linear-gradient(130deg, ${P.green} 0%, #16A34A 100%)`,
          borderRadius:14, padding:"18px 22px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          flexWrap:"wrap", gap:12, color:"#fff",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:52, height:52, borderRadius:12, background:"rgba(255,255,255,.18)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Car size={28} color="#fff"/>
            </div>
            <div>
              <div style={{ fontSize:11, opacity:.75, textTransform:"uppercase", letterSpacing:"1.5px", fontWeight:700, marginBottom:3 }}>
                Mon véhicule assigné
              </div>
              <div style={{ fontSize:18, fontWeight:800 }}>{make} {model}</div>
              <div style={{ fontSize:22, fontWeight:900, letterSpacing:"3px", opacity:.92, fontFamily:"monospace" }}>
                {plate}
              </div>
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
            <VehicleStatusChip status={vehicule.status}/>
            {urgentCount > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,.15)", borderRadius:8, padding:"5px 10px", fontSize:11 }}>
                <AlertTriangle size={13}/>
                <span>{urgentCount} alerte{urgentCount > 1 ? "s" : ""} urgente{urgentCount > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── DEUX COLONNES ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }} className="dc-two-col">

          {/* ── COLONNE GAUCHE — Informations techniques ── */}
          <div className="dc-card" style={{ padding:"18px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:P.greenLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Settings size={16} color={P.green}/>
              </div>
              <span style={{ fontSize:14, fontWeight:800, color:P.text }}>Informations Techniques</span>
            </div>

            <div style={{ border:`1.5px solid ${P.border}`, borderRadius:10, overflow:"hidden" }}>
              {infos.map((info, i) => (
                <div key={i} className="dc-info-cell"
                  style={{
                    display:"grid", gridTemplateColumns:"auto 1fr",
                    gap:10, alignItems:"center",
                    background: i % 2 === 0 ? P.white : P.bg,
                    borderBottom: i < infos.length - 1 ? `1px solid ${P.border}` : "none",
                  }}>
                  <div style={{ width:28, height:28, borderRadius:7, background:P.greenLight, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <info.Icon size={13} color={P.green}/>
                  </div>
                  <div>
                    <div style={{ fontSize:9, fontWeight:700, color:P.textLight, textTransform:"uppercase", letterSpacing:"1.2px", marginBottom:2 }}>
                      {info.label}
                    </div>
                    <div style={{ fontSize:info.bold ? 14 : 13, fontWeight:info.bold ? 800 : 600, color:info.bold ? P.green : P.text, fontFamily:info.bold?"monospace":"inherit" }}>
                      {info.val}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:6, justifyContent:"center", fontSize:11, color:P.textLight }}>
              <Lock size={11}/>
              Lecture seule — modifiable par le gestionnaire uniquement
            </div>
          </div>

          {/* ── COLONNE DROITE ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

            {/* Alertes */}
            <div className="dc-card" style={{ padding:"18px 20px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:urgentCount > 0 ? P.redLight : P.orangeLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Bell size={16} color={urgentCount > 0 ? P.red : P.orange}/>
                </div>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:14, fontWeight:800, color:P.text }}>Alertes & Maintenance</span>
                </div>
                {urgentCount > 0 && (
                  <div style={{ background:P.redLight, color:P.red, borderRadius:99, fontSize:10, fontWeight:800, padding:"2px 8px", border:`1px solid ${P.redBorder}` }}>
                    {urgentCount} urgente{urgentCount > 1 ? "s" : ""}
                  </div>
                )}
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {alertes.map((a, i) => {
                  // Document pas encore chargé
                  if (!a.present) {
                    return (
                      <div key={i} className="dc-alert-row" style={{ background:P.slateLight, border:`1px solid ${P.border}` }}>
                        <div style={{ width:36, height:36, borderRadius:9, background:"#fff", border:`1px solid ${P.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <a.Icon size={18} color={P.textLight}/>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:P.text }}>{a.label}</div>
                          <div style={{ fontSize:11, color:P.textLight, marginTop:3, fontStyle:"italic" }}>
                            En attente de chargement par le gestionnaire
                          </div>
                        </div>
                        <div className="dc-status-chip" style={{ background:"#F1F5F9", color:P.slate, border:"1px solid #E2E8F0" }}>
                          <Clock size={10}/> En attente
                        </div>
                      </div>
                    );
                  }

                  // Document présent
                  const days = daysUntil(a.expiry);
                  const st   = alertStatus(days);
                  return (
                    <div key={i} className="dc-alert-row" style={{ background:st.bg, border:`1px solid ${st.border}` }}>
                      <div style={{ width:36, height:36, borderRadius:9, background:"rgba(255,255,255,.7)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <a.Icon size={18} color={st.color}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6, flexWrap:"wrap" }}>
                          <div style={{ fontSize:13, fontWeight:700, color:P.text }}>{a.label}</div>
                          <div className="dc-status-chip" style={{ background:"rgba(255,255,255,.65)", color:st.color, border:`1px solid ${st.color}25` }}>
                            <st.Icon size={10}/> {st.label}
                          </div>
                        </div>
                        {a.detail && (
                          <div style={{ fontSize:11, color:P.textMid, marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.detail}</div>
                        )}
                        {a.expiry && (
                          <div style={{ fontSize:10, color:P.textLight, marginTop:3, display:"flex", alignItems:"center", gap:4 }}>
                            <Calendar size={9}/>
                            {days !== null && days >= 0
                              ? `Valide jusqu'au ${fmt(a.expiry)}`
                              : `Expiré le ${fmt(a.expiry)}`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Documents officiels */}
            {docs.length > 0 && (
              <div className="dc-card" style={{ padding:"18px 20px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:P.blueLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <FileText size={16} color={P.blue}/>
                  </div>
                  <span style={{ fontSize:14, fontWeight:800, color:P.text }}>Documents officiels</span>
                  <span style={{ marginLeft:"auto", fontSize:10, color:P.textLight, fontWeight:600 }}>
                    {docs.length} fichier{docs.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {docs.map((doc, i) => {
                    const days = daysUntil(doc.expiry_date);
                    const st   = alertStatus(days);
                    const meta = getDocMeta(doc.type);
                    return (
                      <div key={i} className="dc-doc-row">
                        <div style={{ width:32, height:32, borderRadius:8, background:P.greenLight, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <meta.Icon size={15} color={P.green}/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:P.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {doc.title}
                          </div>
                          {doc.expiry_date && (
                            <div style={{ fontSize:10, color:P.textLight, marginTop:2, display:"flex", alignItems:"center", gap:4 }}>
                              <Calendar size={9}/> Expire le {fmt(doc.expiry_date)}
                            </div>
                          )}
                        </div>
                        <div className="dc-status-chip" style={{ background:st.bg, color:st.color, border:`1px solid ${st.color}20` }}>
                          <st.Icon size={9}/> {st.label}
                        </div>
                        {doc.file && (
                          <a href={doc.file} target="_blank" rel="noreferrer"
                            style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:P.blue, fontWeight:700, textDecoration:"none", background:P.blueLight, padding:"5px 10px", borderRadius:7, flexShrink:0, border:`1px solid ${P.blue}20` }}>
                            <Eye size={12}/> Voir
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Aucun document */}
            {docs.length === 0 && (
              <div className="dc-card" style={{ padding:"28px 20px", textAlign:"center" }}>
                <div style={{ width:52, height:52, borderRadius:12, background:P.bg, margin:"0 auto 12px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <FolderOpen size={28} color={P.textLight}/>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:P.text, marginBottom:4 }}>Aucun document chargé</div>
                <div style={{ fontSize:11, color:P.textLight, lineHeight:1.6 }}>
                  Le gestionnaire n'a pas encore téléversé de documents pour ce véhicule.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}