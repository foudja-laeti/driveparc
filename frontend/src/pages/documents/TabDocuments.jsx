
// ─── pages/documents/TabDocuments.jsx ─────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import {
  Shield, FileText, Wrench, Tag, File, Car, AlertTriangle,
  CheckCircle, Clock, Download, Eye, ChevronDown, ChevronUp,
  Info, Lock, CalendarClock, Banknote, StickyNote,
} from "lucide-react";

const API_BASE = "http://localhost:8000/api/v1";

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

// ─── Palette sobre ────────────────────────────────────────────────────────────
const P = {
  green:        "#1B5E37",
  greenMid:     "#2D7A4F",
  greenLight:   "#EAF4EE",
  greenBorder:  "#BBF7D0",
  red:          "#C0182A",
  redLight:     "#FEF2F2",
  redBorder:    "#FECACA",
  orange:       "#C2410C",
  orangeLight:  "#FFF7ED",
  orangeBorder: "#FED7AA",
  amber:        "#B45309",
  amberLight:   "#FFFBEB",
  white:        "#FFFFFF",
  bg:           "#F7F8F7",
  border:       "#E4E9E6",
  text:         "#111827",
  textMid:      "#4B5563",
  textLight:    "#9CA3AF",
};

const CSS = `
  @keyframes td-spin { to { transform: rotate(360deg); } }
  @keyframes td-in   { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
  .td-card { background:#fff; border-radius:10px; border:1px solid ${P.border}; transition:box-shadow .15s; animation:td-in .2s ease both; }
  .td-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.07); }
  .td-doc-row { border-radius:10px; border:1px solid ${P.border}; border-left:3px solid; cursor:pointer; transition:all .13s; }
  .td-doc-row:hover { box-shadow:0 2px 10px rgba(0,0,0,.06); }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = d =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" }) : "—";

const daysUntil = d => d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : null;

function docStatus(expiry) {
  if (!expiry) return { key:"VALIDE",  label:"En règle",         color:P.green,  bg:P.greenLight,  border:P.greenBorder  };
  const d = daysUntil(expiry);
  if (d < 0)   return { key:"EXPIRE",  label:"Expiré",           color:P.red,    bg:P.redLight,    border:P.redBorder    };
  if (d <= 30) return { key:"URGENT",  label:`Expire dans ${d}j`,color:P.red,    bg:P.redLight,    border:P.redBorder    };
  if (d <= 90) return { key:"BIENTOT", label:`Expire dans ${d}j`,color:P.amber,  bg:P.amberLight,  border:P.orangeBorder };
  return         { key:"VALIDE",  label:"Valide",                 color:P.green,  bg:P.greenLight,  border:P.greenBorder  };
}

const DOC_META = {
  insurance:    { Icon:Shield,   label:"Assurance",          cat:"Assurance"     },
  registration: { Icon:FileText, label:"Carte grise",        cat:"Administratif" },
  inspection:   { Icon:Wrench,   label:"Visite technique",   cat:"Technique"     },
  vignette:     { Icon:Tag,      label:"Vignette automobile",cat:"Fiscal"        },
  other:        { Icon:File,     label:"Autre",              cat:"Autre"         },
};

const TYPES_ATTENDUS = ["insurance", "registration", "inspection", "vignette"];

function vtRegle(vehicleYear, vehicleType) {
  const age = new Date().getFullYear() - vehicleYear;
  const isBus = vehicleType === "BUS";
  if (age < 2 && !isBus) return { exonere:true, label:"Exonéré — véhicule < 2 ans" };
  return {
    exonere: false,
    label: isBus ? "Semestrielle" : age <= 5 ? "Biennale" : "Annuelle",
  };
}

// ─── Barre d'expiration ───────────────────────────────────────────────────────
function ExpiryBar({ created_at, expiry_date }) {
  if (!created_at || !expiry_date) return null;
  const total   = new Date(expiry_date) - new Date(created_at);
  const elapsed = Date.now() - new Date(created_at);
  const pct     = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const color   = pct > 85 ? P.red : pct > 65 ? P.amber : P.green;
  return (
    <div style={{ margin:"10px 0 4px" }}>
      <div style={{ height:4, background:P.border, borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99, transition:"width .5s" }}/>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:P.textLight, marginTop:3 }}>
        <span>Ajouté le {fmtDate(created_at)}</span>
        <span style={{ fontWeight:700, color }}>{Math.round(pct)}% écoulé</span>
        <span>{fmtDate(expiry_date)}</span>
      </div>
    </div>
  );
}

// ─── Badge statut ─────────────────────────────────────────────────────────────
function StatusBadge({ st }) {
  const Icon = st.key === "VALIDE" ? CheckCircle : AlertTriangle;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px",
      borderRadius:99, fontSize:10, fontWeight:700,
      background:st.bg, color:st.color, border:`1px solid ${st.border}`,
      whiteSpace:"nowrap" }}>
      <Icon size={9}/>{st.label}
    </span>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ Icon, val, label, color, small }) {
  return (
    <div className="td-card" style={{ padding:"14px 16px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <Icon size={16} color={color} style={{ opacity:.8 }}/>
      <div style={{ fontSize:small?11:22, fontWeight:800, color, lineHeight:1.1, marginTop:2 }}>{val}</div>
      <div style={{ fontSize:9, color:P.textLight, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", lineHeight:1.4 }}>{label}</div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function TabDocuments({ vehicule }) {
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId,  setOpenId]  = useState(null);

  const loadDocs = useCallback(async () => {
    if (!vehicule?.id) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/documents/?vehicle=${vehicule.id}`);
      setDocs(Array.isArray(res) ? res : res?.results ?? []);
    } catch { setDocs([]); }
    finally { setLoading(false); }
  }, [vehicule?.id]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // ── Pas de véhicule ──────────────────────────────────────────────────────
  if (!vehicule) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"80px 20px", gap:14, fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <Car size={48} color={P.border}/>
      <div style={{ fontSize:15, fontWeight:700, color:P.text }}>Aucun véhicule assigné</div>
      <div style={{ fontSize:13, color:P.textLight, textAlign:"center", maxWidth:340, lineHeight:1.6 }}>
        Les documents apparaîtront ici dès qu'un véhicule de fonction vous sera attribué.
      </div>
    </div>
  );

  const year  = vehicule.year ?? new Date().getFullYear();
  const age   = new Date().getFullYear() - year;
  const vt    = vtRegle(year, vehicule.vehicle_type);

  const nAlert        = docs.filter(d => { const s = docStatus(d.expiry_date); return s.key !== "VALIDE"; }).length;
  const typesPresents = new Set(docs.map(d => d.type));
  const typeManquants = TYPES_ATTENDUS.filter(t => !typesPresents.has(t));

  // ── Chargement ───────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12,
      fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <div style={{ width:22, height:22, border:`2.5px solid ${P.border}`, borderTopColor:P.green,
        borderRadius:"50%", animation:"td-spin .7s linear infinite" }}/>
      <span style={{ fontSize:13, color:P.textLight }}>Chargement des documents…</span>
      <style>{CSS}</style>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14,
      fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{CSS}</style>

      {/* ── Bannière véhicule ───────────────────────────────────────────── */}
      <div style={{ background:`linear-gradient(130deg, ${P.green} 0%, ${P.greenMid} 100%)`,
        borderRadius:12, padding:"16px 20px", color:"#fff",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:10, background:"rgba(255,255,255,.15)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Car size={22} color="#fff"/>
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:800 }}>{vehicule.make} {vehicule.model}</div>
            <div style={{ fontSize:20, fontWeight:900, letterSpacing:"3px", marginTop:2, opacity:.9 }}>
              {vehicule.registration_number}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
          {[
            `Année ${year}`,
            `Âge : ${age < 1 ? "< 1 an" : `${age} an${age > 1 ? "s" : ""}`}`,
            `Visite : ${vt.exonere ? "Exonéré" : vt.label}`,
          ].map((c, i) => (
            <span key={i} style={{ background:"rgba(255,255,255,.14)", borderRadius:6,
              padding:"4px 10px", fontSize:11, fontWeight:600 }}>{c}</span>
          ))}
        </div>
      </div>

      {/* ── Alertes ─────────────────────────────────────────────────────── */}
      {nAlert > 0 && (
        <div style={{ display:"flex", gap:10, alignItems:"flex-start",
          background:P.redLight, border:`1px solid ${P.redBorder}`,
          borderRadius:10, padding:"12px 16px" }}>
          <AlertTriangle size={15} color={P.red} style={{ flexShrink:0, marginTop:1 }}/>
          <div style={{ fontSize:12, color:P.red, lineHeight:1.7 }}>
            <b>{nAlert} document{nAlert > 1 ? "s" : ""} nécessite{nAlert > 1 ? "nt" : ""} une action urgente.</b>
            {" "}Contactez le gestionnaire pour le renouvellement.
          </div>
        </div>
      )}
      {typeManquants.length > 0 && (
        <div style={{ display:"flex", gap:10, alignItems:"flex-start",
          background:P.amberLight, border:`1px solid ${P.orangeBorder}`,
          borderRadius:10, padding:"12px 16px" }}>
          <Info size={14} color={P.amber} style={{ flexShrink:0, marginTop:1 }}/>
          <div style={{ fontSize:12, color:P.amber, lineHeight:1.7 }}>
            <b>{typeManquants.length} document{typeManquants.length > 1 ? "s" : ""} en attente :</b>
            {" "}{typeManquants.map(t => DOC_META[t]?.label).join(", ")}.
          </div>
        </div>
      )}

      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        <KpiCard Icon={FileText} val={docs.length} label="Documents chargés" color={P.green}/>
        <KpiCard Icon={Clock}    val={typeManquants.length} label="En attente" color={P.textLight}/>
        <KpiCard Icon={AlertTriangle} val={nAlert} label="Alertes" color={nAlert ? P.red : P.green}/>
        <KpiCard Icon={CalendarClock}
          val={docs.find(d => d.type === "inspection")?.expiry_date
            ? fmtDate(docs.find(d => d.type === "inspection").expiry_date)
            : vt.exonere ? "Exonéré" : "—"}
          label="Prochaine visite" color={P.amber} small/>
      </div>

      {/* ── Liste documents ──────────────────────────────────────────────── */}
      <div className="td-card" style={{ padding:"16px 20px" }}>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:800, color:P.text }}>Documents officiels</div>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:3 }}>
            <Lock size={10} color={P.textLight}/>
            <span style={{ fontSize:11, color:P.textLight }}>Gérés par le gestionnaire · Lecture seule</span>
          </div>
        </div>

        {/* Cas zéro docs : afficher les placeholders */}
        {docs.length === 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {TYPES_ATTENDUS.map(type => {
              const { Icon, label, cat } = DOC_META[type];
              return (
                <div key={type} style={{ display:"flex", alignItems:"center", gap:12,
                  padding:"12px 14px", borderRadius:9,
                  background:P.bg, border:`1px dashed ${P.border}`, opacity:.75 }}>
                  <div style={{ width:38, height:38, borderRadius:8, background:P.white,
                    border:`1px solid ${P.border}`, display:"flex", alignItems:"center",
                    justifyContent:"center" }}>
                    <Icon size={17} color={P.textLight}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:P.textMid }}>{label}</div>
                    <div style={{ fontSize:10, color:P.textLight, marginTop:1, fontStyle:"italic" }}>
                      En attente de chargement
                    </div>
                  </div>
                  <span style={{ fontSize:10, color:P.textLight, fontWeight:600 }}>
                    <Clock size={10} style={{ verticalAlign:"middle", marginRight:3 }}/>
                    En attente
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Docs présents */}
        {docs.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {docs.map(doc => {
              const st   = docStatus(doc.expiry_date);
              const meta = DOC_META[doc.type] || DOC_META.other;
              const open = openId === doc.id;
              const days = daysUntil(doc.expiry_date);
              return (
                <div key={doc.id} className="td-doc-row"
                  style={{ borderLeftColor:st.color, padding:"13px 16px",
                    background:open ? P.white : P.bg }}
                  onClick={() => setOpenId(open ? null : doc.id)}>

                  <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    {/* Icône */}
                    <div style={{ width:38, height:38, borderRadius:8, background:st.bg,
                      border:`1px solid ${st.border}`,
                      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <meta.Icon size={17} color={st.color}/>
                    </div>

                    {/* Contenu */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:P.text,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {doc.title}
                      </div>
                      <div style={{ fontSize:10, color:P.textLight, marginTop:2 }}>
                        {meta.label} · {meta.cat}
                      </div>
                    </div>

                    {/* Badges */}
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                      <StatusBadge st={st}/>
                      {days !== null && (
                        <span style={{ fontSize:9, color:days < 0 ? P.red : P.textLight, fontWeight:600 }}>
                          {days < 0 ? `Expiré il y a ${Math.abs(days)}j` : `${days}j restants`}
                        </span>
                      )}
                    </div>

                    {/* Chevron */}
                    <div style={{ color:P.textLight, flexShrink:0, marginLeft:4, marginTop:2 }}>
                      {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </div>
                  </div>

                  {/* Barre progression */}
                  {doc.expiry_date && (
                    <ExpiryBar created_at={doc.created_at} expiry_date={doc.expiry_date}/>
                  )}

                  {/* Méta-infos compactes */}
                  <div style={{ display:"flex", gap:14, marginTop:6, flexWrap:"wrap" }}>
                    {doc.expiry_date ? (
                      <span style={{ display:"flex", alignItems:"center", gap:4,
                        fontSize:10, color:P.textMid }}>
                        <CalendarClock size={10}/>Expire le {fmtDate(doc.expiry_date)}
                      </span>
                    ) : (
                      <span style={{ display:"flex", alignItems:"center", gap:4,
                        fontSize:10, color:P.green }}>
                        <CheckCircle size={10}/>Sans date d'expiration
                      </span>
                    )}
                    {doc.montant && (
                      <span style={{ display:"flex", alignItems:"center", gap:4,
                        fontSize:10, color:P.textMid }}>
                        <Banknote size={10}/>
                        {Number(doc.montant).toLocaleString("fr-FR")} FCFA
                      </span>
                    )}
                  </div>

                  {/* Détail déplié */}
                  {open && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${P.border}` }}
                      onClick={e => e.stopPropagation()}>

                      {doc.notes && (
                        <div style={{ display:"flex", gap:8, fontSize:11, color:P.textMid,
                          background:P.bg, borderRadius:8, padding:"8px 12px", marginBottom:10 }}>
                          <StickyNote size={12} style={{ flexShrink:0, marginTop:1 }}/>
                          <span>{doc.notes}</span>
                        </div>
                      )}

                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {doc.file && (
                          <>
                            <a href={doc.file} target="_blank" rel="noreferrer"
                              style={{ display:"inline-flex", alignItems:"center", gap:6,
                                padding:"7px 14px", background:P.greenLight, color:P.green,
                                border:`1px solid ${P.greenBorder}`, borderRadius:7,
                                fontSize:12, fontWeight:600, textDecoration:"none" }}>
                              <Eye size={13}/>Voir le document
                            </a>
                            <a href={doc.file} download
                              style={{ display:"inline-flex", alignItems:"center", gap:6,
                                padding:"7px 14px", background:P.white, color:P.textMid,
                                border:`1px solid ${P.border}`, borderRadius:7,
                                fontSize:12, fontWeight:600, textDecoration:"none" }}>
                              <Download size={13}/>Télécharger
                            </a>
                          </>
                        )}

                        {st.key !== "VALIDE" && (
                          <div style={{ display:"flex", gap:8, alignItems:"center",
                            background:P.redLight, border:`1px solid ${P.redBorder}`,
                            borderRadius:8, padding:"8px 12px", fontSize:11, color:P.red,
                            flexBasis:"100%" }}>
                            <AlertTriangle size={12} style={{ flexShrink:0 }}/>
                            Renouvellement nécessaire — contactez le gestionnaire.
                          </div>
                        )}
                      </div>

                      <div style={{ display:"flex", alignItems:"center", gap:5,
                        marginTop:10, fontSize:10, color:P.textLight, fontStyle:"italic" }}>
                        <Lock size={9}/>
                        Lecture seule — les modifications sont effectuées par le gestionnaire.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Types manquants en grisé après la liste */}
            {typeManquants.map(type => {
              const { Icon, label } = DOC_META[type];
              return (
                <div key={type} style={{ display:"flex", alignItems:"center", gap:12,
                  padding:"11px 14px", borderRadius:9,
                  border:`1px dashed ${P.border}`, background:P.bg, opacity:.65 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:P.white,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Icon size={15} color={P.textLight}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:P.textMid }}>{label}</div>
                    <div style={{ fontSize:10, color:P.textLight, fontStyle:"italic", marginTop:1 }}>
                      En attente de chargement
                    </div>
                  </div>
                  <Clock size={11} color={P.textLight}/>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pied de page */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        fontSize:11, color:P.textLight, padding:"4px 0 8px" }}>
        <Lock size={10}/>
        <span>Onglet en lecture seule. Modifications effectuées par le gestionnaire.</span>
      </div>
    </div>
  );
}
