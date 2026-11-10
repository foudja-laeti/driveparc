// ─── src/parametres/Parametres.jsx ───────────────────────────────────────────
// v3 — Adapté au nouveau schéma :
//  • School = vrai modèle Django avec id (FK)
//  • Department.school = ForeignKey(School) → expose school_name/color/icon
//  • Endpoints : /auth/schools/ + /auth/departments/
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2, BookOpen, ClipboardList, Plus, Pencil, Trash2,
  X, Check, AlertTriangle, Search, ChevronDown, GraduationCap,
  Users, Briefcase, Car, Wrench, Layers, School, Info,
  LayoutGrid, BookMarked, ChevronRight, FolderOpen,
} from "lucide-react";
import { apiFetch } from "../../utils/api";
import { C, S, M } from "../../constants/index";
import { Empty } from "../../components/ui";

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
  border:       "#E2E8E5",
  bg:           "#F7FAF8",
  white:        "#FFFFFF",
  text:         "#1A2820",
  textMid:      "#4A6358",
  textLight:    "#8EA99A",
};

// ─────────────────────────────────────────────────────────────────────────────
// ONGLETS
// ─────────────────────────────────────────────────────────────────────────────
const PARAM_TABS = [
  { id:"ecoles",       label:"Écoles",               Icon: School        },
  { id:"departements", label:"Départements",          Icon: Building2     },
  
];

const PERSONNEL_TYPES = [
  ["DIRECTEUR", "Directeur d'école",    "🎖️"],
  ["CHEF_DEPT", "Chef de département",  "📋"],
  ["AUTRE",     "Autre personnel",      "👤"],
];

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes p-spin     { to { transform: rotate(360deg); } }
  @keyframes p-slide-up { from{opacity:0;transform:translateY(14px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes p-fade-in  { from{opacity:0} to{opacity:1} }
  @keyframes p-shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .p-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.5);
    backdrop-filter:blur(4px); z-index:8000;
    display:flex; align-items:center; justify-content:center;
    animation:p-fade-in .15s ease;
  }
  .p-modal {
    background:#fff; border-radius:14px;
    width:min(540px, 95vw); max-height:92vh;
    display:flex; flex-direction:column;
    box-shadow:0 20px 60px rgba(0,0,0,.22);
    animation:p-slide-up .2s cubic-bezier(.34,1.56,.64,1);
    overflow:hidden;
  }
  .p-modal-lg {
    background:#fff; border-radius:14px;
    width:min(640px, 95vw); max-height:92vh;
    display:flex; flex-direction:column;
    box-shadow:0 20px 60px rgba(0,0,0,.22);
    animation:p-slide-up .2s cubic-bezier(.34,1.56,.64,1);
    overflow:hidden;
  }
  .p-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:18px 22px; border-bottom:1.5px solid ${P.border};
    flex-shrink:0;
  }
  .p-body {
    padding:20px 22px; overflow-y:auto; display:flex; flex-direction:column; gap:14px;
    flex:1;
  }
  .p-school-card {
    background:#fff; border-radius:11px;
    border:1.5px solid ${P.border};
    transition:all .2s; cursor:default;
    overflow:hidden; position:relative;
  }
  .p-school-card:hover { box-shadow:0 8px 24px rgba(27,94,55,.1); border-color:${P.green}; }
  .p-dept-card {
    background:#fff; border-radius:10px;
    border:1.5px solid ${P.border};
    padding:13px 15px; transition:all .18s;
  }
  .p-dept-card:hover { border-color:${P.green}; background:${P.greenLight}; }
  .p-skel {
    border-radius:6px;
    background:linear-gradient(90deg,${P.bg} 25%,#eaeceb 50%,${P.bg} 75%);
    background-size:200% 100%; animation:p-shimmer 1.4s ease infinite;
  }
  .p-input {
    padding:9px 12px; border:1.5px solid ${P.border}; border-radius:8px;
    font-size:12px; font-family:inherit; color:${P.text};
    background:#fff; width:100%; outline:none; box-sizing:border-box;
    transition:border-color .15s, box-shadow .15s;
  }
  .p-input:focus { border-color:${P.green}; box-shadow:0 0 0 3px ${P.green}16; }
  .p-input.err   { border-color:${P.red}; background:#FFF8F8; }
  .p-input:read-only { background:${P.bg}; color:${P.textMid}; }
  .p-tab-btn {
    display:flex; align-items:center; gap:7px;
    padding:9px 18px; border-radius:9px; font-size:12px; font-weight:700;
    cursor:pointer; font-family:inherit; border:1.5px solid ${P.border};
    background:${P.bg}; color:${P.textMid}; transition:all .15s;
  }
  .p-tab-btn.on {
    border-color:${P.green}; background:${P.greenLight}; color:${P.green};
  }
  .p-tab-btn:hover:not(.on) { border-color:${P.green}40; color:${P.green}; }
  .p-btn {
    display:inline-flex; align-items:center; gap:6px;
    padding:8px 16px; border-radius:8px; font-size:12px; font-weight:700;
    cursor:pointer; font-family:inherit; border:none;
    background:${P.green}; color:#fff; transition:all .15s;
  }
  .p-btn:hover { background:#155233; }
  .p-btn:disabled { opacity:.6; cursor:not-allowed; }
  .p-ghost {
    display:inline-flex; align-items:center; gap:6px;
    padding:8px 16px; border-radius:8px; font-size:12px; font-weight:700;
    cursor:pointer; font-family:inherit;
    border:1.5px solid ${P.border}; background:#fff; color:${P.textMid};
    transition:all .15s;
  }
  .p-ghost:hover { background:${P.bg}; border-color:${P.green}40; }
  .p-icon-btn {
    display:inline-flex; align-items:center; justify-content:center;
    width:30px; height:30px; border-radius:7px; border:none;
    cursor:pointer; font-family:inherit; transition:all .12s;
  }
  .tr-p:hover td { background:${P.bg}; }
  .tr-p td { transition:background .1s; }
  select {
    appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238EA99A' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 10px center; padding-right:28px !important;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function SecTitle({ icon: Icon, children }) {
  return (
    <div style={{ fontSize:9, fontWeight:800, color:P.textLight, textTransform:"uppercase",
      letterSpacing:"1.5px", display:"flex", alignItems:"center", gap:6,
      paddingBottom:8, borderBottom:`1.5px solid ${P.border}`, marginBottom:2 }}>
      {Icon && <Icon size={11}/>}
      {children}
    </div>
  );
}

function ErrBar({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"10px 14px",
      background:P.redLight, border:`1px solid ${P.redBorder}`, borderRadius:8,
      fontSize:12, color:P.red }}>
      <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }}/>
      <span>{msg}</span>
    </div>
  );
}

function Field({ label, required, hint, error, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:11, fontWeight:700, color:P.textMid,
        textTransform:"uppercase", letterSpacing:".8px" }}>
        {label}{required && <span style={{ color:P.red, marginLeft:2 }}>*</span>}
      </label>
      {children}
      {hint  && !error && <span style={{ fontSize:10, color:P.textLight }}>{hint}</span>}
      {error && <span style={{ fontSize:11, color:P.red, fontWeight:600, display:"flex", alignItems:"center", gap:3 }}><AlertTriangle size={10}/> {error}</span>}
    </div>
  );
}

function RoleBadge({ role }) {
  const MAP = {
    PERSONNEL:  { label:"Personnel",  bg:P.greenLight,  color:P.green  },
    CHAUFFEUR:  { label:"Chauffeur",  bg:P.greenLight,  color:P.greenMid },
    TECHNICIEN: { label:"Technicien", bg:P.orangeLight, color:P.orange },
  };
  const m = MAP[role] || { label:role, bg:P.bg, color:P.textMid };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px",
      borderRadius:99, fontSize:10, fontWeight:700, background:m.bg, color:m.color }}>
      {m.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER : extraire les résultats paginés ou non
// ─────────────────────────────────────────────────────────────────────────────
function toList(r) {
  if (Array.isArray(r)) return r;
  if (r?.results) return r.results;
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export function TabParametres() {
  const [activeTab, setActiveTab] = useState("ecoles");

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

        <div style={{ ...S.section, padding:"14px 18px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <Info size={13} color={P.textLight}/>
            <span style={{ fontSize:11, color:P.textLight }}>
              Ces paramètres configurent les données de base du système utilisées lors de la création des utilisateurs et réservations.
            </span>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {PARAM_TABS.map(t => (
              <button key={t.id}
                className={`p-tab-btn${activeTab === t.id ? " on" : ""}`}
                onClick={() => setActiveTab(t.id)}>
                <t.Icon size={14}/>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "ecoles"       && <PanelEcoles       />}
        {activeTab === "departements" && <PanelDepartements />}
        {activeTab === "registre"     && <PanelRegistre     />}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL ÉCOLES
// ─────────────────────────────────────────────────────────────────────────────
function PanelEcoles() {
  const [schools,  setSchools]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState("");
  const [deleting, setDeleting] = useState(null);
  const [search,   setSearch]   = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Nouveau endpoint School (vrai modèle Django)
      const r = await apiFetch("/auth/schools/?page_size=100");
      setSchools(toList(r));
    } catch (e) {
      console.error("Erreur chargement écoles :", e);
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = schools.filter(s => {
    const q = search.toLowerCase();
    return !q || [s.name, s.code, s.description].some(x => (x||"").toLowerCase().includes(q));
  });

  const openAdd  = () => { setEditItem(null); setFormErr(""); setShowForm(true); };
  const openEdit = s  => { setEditItem(s);   setFormErr(""); setShowForm(true); };
  const closeForm= () => { setShowForm(false); setEditItem(null); setFormErr(""); };

  const handleSave = async data => {
    setSaving(true); setFormErr("");
    try {
      if (editItem) {
        await apiFetch(`/auth/schools/${editItem.id}/`, { method:"PATCH", body:JSON.stringify(data) });
      } else {
        await apiFetch("/auth/schools/", { method:"POST", body:JSON.stringify(data) });
      }
      closeForm();
      loadAll();
    } catch (e) {
      try { setFormErr(Object.values(JSON.parse(e.message)).flat().join(" — ")); }
      catch { setFormErr(e.message || "Erreur lors de l'enregistrement."); }
    } finally { setSaving(false); }
  };

  const handleDelete = async s => {
    if (!window.confirm(`Supprimer l'école "${s.name}" ? Ses départements seront également affectés.`)) return;
    setDeleting(s.id);
    try { await apiFetch(`/auth/schools/${s.id}/`, { method:"DELETE" }); loadAll(); }
    catch (e) { alert("Suppression impossible : " + e.message); }
    finally { setDeleting(null); }
  };

  // ✅ department_count vient de l'annotation Django (SchoolViewSet.get_queryset annotate)
  const total     = schools.length;
  const deptCount = schools.reduce((acc, s) => acc + (s.department_count || 0), 0);

  return (
    <>
      {showForm && (
        <SchoolModal
          initial={editItem}
          onSave={handleSave}
          onClose={closeForm}
          saving={saving}
          error={formErr}
        />
      )}

      <div style={S.section}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:P.text, display:"flex", alignItems:"center", gap:8 }}>
              <School size={18} color={P.green}/> Écoles
            </div>
            <div style={{ fontSize:11, color:P.textLight, marginTop:4 }}>
              {total} école{total !== 1 ? "s" : ""} · {deptCount} département{deptCount !== 1 ? "s" : ""} au total
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ position:"relative" }}>
              <Search size={12} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:P.textLight }}/>
              <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
                className="p-input" style={{ paddingLeft:28, width:180 }}/>
            </div>
            <button className="p-btn" onClick={openAdd}>
              <Plus size={14}/> Nouvelle école
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
          {[
            { label:"Total écoles",  value:total,     color:P.green,  bg:P.greenLight,  Icon:School    },
            { label:"Départements",  value:deptCount, color:P.orange, bg:P.orangeLight, Icon:Building2 },
          ].map(k => (
            <div key={k.label} style={{ padding:"12px 16px", borderRadius:10, background:k.bg,
              border:`1px solid ${k.color}22`, display:"flex", alignItems:"center",
              gap:10, flex:1, minWidth:140 }}>
              <k.Icon size={18} color={k.color}/>
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:P.text }}>{k.value}</div>
                <div style={{ fontSize:10, color:k.color, fontWeight:600, textTransform:"uppercase", letterSpacing:"1px" }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Grille */}
        {loading ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ borderRadius:11, border:`1.5px solid ${P.border}`, overflow:"hidden" }}>
                <div className="p-skel" style={{ height:8 }}/>
                <div style={{ padding:16 }}>
                  <div className="p-skel" style={{ height:14, width:"60%", marginBottom:8 }}/>
                  <div className="p-skel" style={{ height:10, width:"80%", marginBottom:12 }}/>
                  <div className="p-skel" style={{ height:10, width:"40%" }}/>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 20px", color:P.textLight }}>
            <School size={40} color={P.border} style={{ marginBottom:12 }}/>
            <div style={{ fontSize:13, fontWeight:600 }}>
              {search ? "Aucune école trouvée pour cette recherche" : "Aucune école enregistrée"}
            </div>
            {!search && (
              <div style={{ fontSize:11, marginTop:6, marginBottom:16 }}>
                Créez votre première école pour commencer à structurer les départements.
              </div>
            )}
            {!search && (
              <button className="p-btn" onClick={openAdd} style={{ margin:"0 auto" }}>
                <Plus size={13}/> Créer la première école
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
            {filtered.map(s => {
              const color = s.color || P.green;
              const depts = s.department_count || 0;
              return (
                <div key={s.id} className="p-school-card">
                  <div style={{ height:5, background:color }}/>
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:9, background:color+"18",
                          display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                          {s.icon || "🏫"}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:800, color:P.text }}>{s.name}</div>
                          {s.code && (
                            <span style={{ fontSize:9, fontWeight:800, color,
                              background:color+"18", padding:"1px 6px",
                              borderRadius:4, display:"inline-block", marginTop:2, letterSpacing:"1px" }}>
                              {s.code}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:4 }}>
                        <button className="p-icon-btn" onClick={() => openEdit(s)}
                          style={{ background:"#EFF6FF", color:"#1D4ED8" }} title="Modifier">
                          <Pencil size={13}/>
                        </button>
                        <button className="p-icon-btn" onClick={() => handleDelete(s)}
                          disabled={deleting === s.id}
                          style={{ background:P.redLight, color:P.red, opacity:deleting===s.id ? .6 : 1 }}
                          title="Supprimer">
                          {deleting === s.id
                            ? <span style={{ animation:"p-spin .7s linear infinite", display:"inline-block", fontSize:12 }}>⟳</span>
                            : <Trash2 size={13}/>}
                        </button>
                      </div>
                    </div>
                    {s.description && (
                      <div style={{ fontSize:11, color:P.textLight, marginTop:10, lineHeight:1.5 }}>{s.description}</div>
                    )}
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:10, fontSize:10, color, fontWeight:600 }}>
                      <Building2 size={11}/>
                      {depts} département{depts !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL ÉCOLE
// ─────────────────────────────────────────────────────────────────────────────
const SCHOOL_COLORS = [
  "#1B5E37","#2563EB","#7C3AED","#D97706","#C0182A",
  "#059669","#0891B2","#EA580C","#0F766E","#9333EA",
];
const SCHOOL_ICONS = ["🏫","💻","⚙️","📊","🌍","🎓","🔬","📐","🏗️","📚"];

function SchoolModal({ initial, onSave, onClose, saving, error }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name:        initial?.name        || "",
    code:        initial?.code        || "",
    description: initial?.description || "",
    color:       initial?.color       || P.green,
    icon:        initial?.icon        || "🏫",
  });
  const [errors, setErrors] = useState({});

  const setF = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Nom obligatoire.";
    if (!form.code.trim()) e.code = "Code obligatoire (ex: 3IAC).";
    return e;
  };

  const handleSubmit = e => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSave({ ...form, code: form.code.toUpperCase().trim() });
  };

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="p-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="p-modal">
        <div className="p-header">
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:36, height:36, borderRadius:9, background:form.color+"18",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
              {form.icon}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:P.text }}>
                {isEdit ? `Modifier — ${initial.name}` : "Nouvelle école"}
              </div>
              <div style={{ fontSize:11, color:P.textLight, marginTop:1 }}>
                {isEdit ? "Modifiez les informations de l'école" : "Créez une nouvelle école"}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-icon-btn" style={{ background:P.bg, color:P.textMid }}>
            <X size={15}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:14, overflowY:"auto" }}>
          <ErrBar msg={error}/>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Field label="Icône">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 }}>
                {SCHOOL_ICONS.map(ico => (
                  <button key={ico} type="button"
                    onClick={() => setF("icon", ico)}
                    style={{ padding:8, borderRadius:8, border:`2px solid ${form.icon===ico?form.color:P.border}`,
                      background:form.icon===ico?form.color+"18":P.bg,
                      fontSize:18, cursor:"pointer", transition:"all .12s" }}>
                    {ico}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Couleur">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 }}>
                {SCHOOL_COLORS.map(col => (
                  <button key={col} type="button"
                    onClick={() => setF("color", col)}
                    style={{ width:"100%", aspectRatio:"1", borderRadius:8,
                      background:col, border:`3px solid ${form.color===col?"#fff":"transparent"}`,
                      outline:`2px solid ${form.color===col?col:"transparent"}`,
                      cursor:"pointer", transition:"all .12s" }}/>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Nom de l'école" required error={errors.name}>
            <input className={`p-input${errors.name?" err":""}`}
              value={form.name} onChange={e => setF("name", e.target.value)}
              placeholder="Ex : Institut Universitaire de la Côte"/>
          </Field>

          <Field label="Code" required error={errors.code} hint="Identifiant court unique (ex: 3IAC, ISTDI)">
            <input className={`p-input${errors.code?" err":""}`}
              value={form.code} onChange={e => setF("code", e.target.value.toUpperCase())}
              placeholder="Ex: 3IAC" maxLength={20}
              style={{ fontFamily:"monospace", fontWeight:700, letterSpacing:"1px" }}/>
          </Field>

          <Field label="Description">
            <textarea className="p-input"
              value={form.description} onChange={e => setF("description", e.target.value)}
              rows={2} placeholder="Description courte de l'école (optionnel)"
              style={{ resize:"vertical", fontFamily:"inherit" }}/>
          </Field>

          {/* Prévisualisation */}
          <div style={{ padding:"12px 14px", borderRadius:9, background:form.color+"12",
            border:`1.5px solid ${form.color}30`, display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:9, background:form.color+"25",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
              {form.icon}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:P.text }}>{form.name || "Nom de l'école"}</div>
              {form.code && (
                <span style={{ fontSize:9, fontWeight:800, color:form.color,
                  background:form.color+"18", padding:"1px 6px", borderRadius:4,
                  display:"inline-block", marginTop:2, letterSpacing:"1px" }}>
                  {form.code}
                </span>
              )}
            </div>
          </div>

          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, paddingTop:14, borderTop:`1px solid ${P.border}` }}>
            <button type="button" className="p-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" className="p-btn" disabled={saving}>
              {saving
                ? <><span style={{ animation:"p-spin .8s linear infinite", display:"inline-block" }}>⟳</span> Enregistrement…</>
                : <><Check size={13}/> {isEdit ? "Modifier" : "Créer l'école"}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL DÉPARTEMENTS
// ─────────────────────────────────────────────────────────────────────────────
function PanelDepartements() {
  const [depts,        setDepts]        = useState([]);
  const [schools,      setSchools]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editDept,     setEditDept]     = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [formErr,      setFormErr]      = useState("");
  const [deleting,     setDeleting]     = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterSchool, setFilterSchool] = useState(""); // id (string) de l'école filtrée

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([
        apiFetch("/auth/departments/?page_size=200"),
        apiFetch("/auth/schools/?page_size=100"),
      ]);
      setDepts(toList(d));
      setSchools(toList(s));
    } catch (e) {
      console.error("Erreur chargement :", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = depts.filter(d => {
    const q  = search.toLowerCase();
    const ms = !q || [d.name, d.code, d.description, d.school_name]
      .some(x => (x||"").toLowerCase().includes(q));
    // ✅ Comparer avec d.school (id entier venant de la FK)
    const schoolOk = !filterSchool || String(d.school) === filterSchool;
    return ms && schoolOk;
  });

  // ✅ Groupement par école — utilise school_name/color/icon du serializer
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(d => {
      const key = d.school_name || `École #${d.school}` || "Sans école";
      if (!map[key]) map[key] = {
        name:  key,
        color: d.school_color || P.green,
        icon:  d.school_icon  || "🏫",
        depts: [],
      };
      map[key].depts.push(d);
    });
    return Object.values(map);
  }, [filtered]);

  const openAdd  = () => { setEditDept(null); setFormErr(""); setShowForm(true); };
  const openEdit = d  => { setEditDept(d);   setFormErr(""); setShowForm(true); };
  const closeForm= () => { setShowForm(false); setEditDept(null); setFormErr(""); };

  const handleSave = async data => {
    setSaving(true); setFormErr("");
    try {
      if (editDept) {
        await apiFetch(`/auth/departments/${editDept.id}/`, { method:"PATCH", body:JSON.stringify(data) });
      } else {
        await apiFetch("/auth/departments/", { method:"POST", body:JSON.stringify(data) });
      }
      closeForm();
      loadAll();
    } catch (e) {
      try { setFormErr(Object.values(JSON.parse(e.message)).flat().join(" — ")); }
      catch { setFormErr(e.message || "Erreur lors de l'enregistrement."); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Supprimer le département "${name}" ? Les utilisateurs associés ne seront pas supprimés.`)) return;
    setDeleting(id);
    try { await apiFetch(`/auth/departments/${id}/`, { method:"DELETE" }); loadAll(); }
    catch (e) { alert("Suppression impossible : " + e.message); }
    finally { setDeleting(null); }
  };

  return (
    <>
      {showForm && (
        <DeptModal
          initial={editDept}
          schools={schools}
          onSave={handleSave}
          onClose={closeForm}
          saving={saving}
          error={formErr}
        />
      )}

      <div style={S.section}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:P.text, display:"flex", alignItems:"center", gap:8 }}>
              <Building2 size={18} color={P.green}/> Départements
            </div>
            <div style={{ fontSize:11, color:P.textLight, marginTop:4 }}>
              {depts.length} département{depts.length !== 1 ? "s" : ""} · {schools.length} école{schools.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            {/* ✅ Filtre par id d'école */}
            <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)}
              className="p-input" style={{ width:170, padding:"8px 28px 8px 10px" }}>
              <option value="">Toutes les écoles</option>
              {schools.map(s => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
            <div style={{ position:"relative" }}>
              <Search size={12} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:P.textLight }}/>
              <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
                className="p-input" style={{ paddingLeft:28, width:180 }}/>
            </div>
            <button className="p-btn" onClick={openAdd}>
              <Plus size={14}/> Nouveau département
            </button>
          </div>
        </div>

        {/* Alerte si aucune école */}
        {!loading && schools.length === 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px",
            background:P.orangeLight, border:`1.5px solid ${P.orangeBorder}`, borderRadius:10, marginBottom:16 }}>
            <AlertTriangle size={16} color={P.orange}/>
            <div style={{ fontSize:12, color:P.orange }}>
              <b>Aucune école enregistrée.</b> Créez d'abord des écoles dans l'onglet «&nbsp;Écoles&nbsp;» avant d'ajouter des départements.
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[1,2].map(i => <div key={i} className="p-skel" style={{ height:80, borderRadius:10 }}/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 20px", color:P.textLight }}>
            <Building2 size={40} color={P.border} style={{ marginBottom:12 }}/>
            <div style={{ fontSize:13, fontWeight:600 }}>
              {search || filterSchool ? "Aucun département pour ces critères" : "Aucun département enregistré"}
            </div>
            {!search && !filterSchool && schools.length > 0 && (
              <button className="p-btn" onClick={openAdd} style={{ marginTop:12 }}>
                <Plus size={13}/> Créer le premier département
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {grouped.map(group => (
              <div key={group.name}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8,
                  padding:"6px 10px", borderRadius:8,
                  background:group.color+"12", border:`1px solid ${group.color}22` }}>
                  <span style={{ fontSize:16 }}>{group.icon}</span>
                  <span style={{ fontSize:12, fontWeight:800, color:group.color }}>{group.name}</span>
                  <span style={{ fontSize:10, color:P.textLight, marginLeft:4 }}>
                    {group.depts.length} département{group.depts.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:10, paddingLeft:8 }}>
                  {group.depts.map(d => (
                    <div key={d.id} className="p-dept-card">
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:P.text }}>{d.name}</div>
                          {d.code && (
                            <span style={{ fontSize:9, fontWeight:800, color:P.textMid,
                              background:P.white, border:`1px solid ${P.border}`,
                              padding:"1px 6px", borderRadius:4, marginTop:3, display:"inline-block",
                              fontFamily:"monospace", letterSpacing:"1px" }}>
                              {d.code}
                            </span>
                          )}
                        </div>
                        <div style={{ display:"flex", gap:4 }}>
                          <button className="p-icon-btn" onClick={() => openEdit(d)}
                            style={{ background:"#EFF6FF", color:"#1D4ED8" }} title="Modifier">
                            <Pencil size={12}/>
                          </button>
                          <button className="p-icon-btn"
                            onClick={() => handleDelete(d.id, d.name)}
                            disabled={deleting === d.id}
                            style={{ background:P.redLight, color:P.red, opacity:deleting===d.id ? .6 : 1 }}
                            title="Supprimer">
                            {deleting === d.id
                              ? <span style={{ animation:"p-spin .7s linear infinite", display:"inline-block", fontSize:11 }}>⟳</span>
                              : <Trash2 size={12}/>}
                          </button>
                        </div>
                      </div>
                      {d.description && (
                        <div style={{ fontSize:10, color:P.textLight, lineHeight:1.4, marginTop:6 }}>{d.description}</div>
                      )}
                      <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:8, fontSize:10, color:P.greenMid, fontWeight:600 }}>
                        <Users size={10}/> {d.member_count || 0} membre{(d.member_count||0) !== 1 ? "s" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DÉPARTEMENT
// ─────────────────────────────────────────────────────────────────────────────
function DeptModal({ initial, schools, onSave, onClose, saving, error }) {
  const isEdit = !!initial;

  // ✅ En édition : retrouver l'école par son id (FK entier) et non par code texte
  const initialSchool = isEdit
    ? (schools.find(s => s.id === (initial.school ?? initial.school_id)) || null)
    : null;

  const [step,           setStep]           = useState(isEdit ? 2 : 1);
  const [selectedSchool, setSelectedSchool] = useState(initialSchool);

  const [form, setForm] = useState({
    name:        initial?.name        || "",
    code:        initial?.code        || "",
    description: initial?.description || "",
  });
  const [errors, setErrors] = useState({});

  const setF = (k, v) => {
    setForm(f => ({ ...f, [k]:v }));
    setErrors(e => { const n={...e}; delete n[k]; return n; });
  };

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name   = "Nom du département obligatoire.";
    if (!form.code.trim()) e.code   = "Code obligatoire (ex: DEP-INFO).";
    if (!selectedSchool)   e.school = "École obligatoire.";
    return e;
  };

  const handleSubmit = e => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    // ✅ Envoyer school = id entier (FK Django)
    onSave({
      name:        form.name.trim(),
      code:        form.code.toUpperCase().trim(),
      description: form.description.trim(),
      school:      selectedSchool.id,
    });
  };

  return (
    <div className="p-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="p-modal-lg">
        <div className="p-header">
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <Building2 size={18} color={P.green}/>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:P.text }}>
                {isEdit ? `Modifier — ${initial.name}` : "Nouveau département"}
              </div>
              <div style={{ fontSize:11, color:P.textLight, marginTop:1 }}>
                {step === 1
                  ? "Étape 1 — Choisir une école"
                  : `Étape 2 — Informations${selectedSchool ? ` · ${selectedSchool.name}` : ""}`}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {!isEdit && (
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                {[1,2].map(s => (
                  <div key={s} style={{ width:s===step?24:8, height:8, borderRadius:99,
                    background:s<=step?P.green:P.border, transition:"all .2s" }}/>
                ))}
              </div>
            )}
            <button onClick={onClose} className="p-icon-btn" style={{ background:P.bg, color:P.textMid }}>
              <X size={15}/>
            </button>
          </div>
        </div>

        <ErrBar msg={error}/>

        {/* ── ÉTAPE 1 : Sélection école ── */}
        {step === 1 && !isEdit && (
          <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:14, overflowY:"auto", flex:1 }}>
            <div style={{ padding:"10px 14px", background:P.orangeLight,
              border:`1px solid ${P.orangeBorder}`, borderRadius:8,
              fontSize:11, color:P.orange, display:"flex", gap:7 }}>
              <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>
              Chaque département appartient à une école. Sélectionnez l'école avant de continuer.
            </div>

            {schools.length === 0 ? (
              <div style={{ textAlign:"center", padding:"32px 20px", color:P.textLight }}>
                <School size={36} color={P.border} style={{ marginBottom:10 }}/>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Aucune école enregistrée</div>
                <div style={{ fontSize:11 }}>Créez d'abord des écoles dans l'onglet «&nbsp;Écoles&nbsp;».</div>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
                {schools.map(s => {
                  const color = s.color || P.green;
                  const sel   = selectedSchool?.id === s.id;
                  return (
                    <button key={s.id} type="button"
                      onClick={() => setSelectedSchool(s)}
                      style={{ padding:14, borderRadius:11, cursor:"pointer",
                        border:`2px solid ${sel ? color : P.border}`,
                        background:sel ? color+"14" : P.bg,
                        display:"flex", alignItems:"center", gap:10,
                        transition:"all .15s", fontFamily:"inherit", textAlign:"left" }}>
                      <div style={{ width:40, height:40, borderRadius:9, background:color+"25",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:20, flexShrink:0 }}>
                        {s.icon || "🏫"}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:800, color:sel?color:P.text }}>{s.name}</div>
                        {s.code && (
                          <span style={{ fontSize:9, fontWeight:800, color,
                            background:color+"18", padding:"1px 5px", borderRadius:3,
                            display:"inline-block", marginTop:2, letterSpacing:"1px" }}>
                            {s.code}
                          </span>
                        )}
                        <div style={{ fontSize:10, color:P.textLight, marginTop:3 }}>
                          {s.department_count || 0} département{(s.department_count||0)!==1?"s":""}
                        </div>
                      </div>
                      {sel && <Check size={16} color={color} style={{ flexShrink:0 }}/>}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, paddingTop:14, borderTop:`1px solid ${P.border}` }}>
              <button type="button" className="p-ghost" onClick={onClose}>Annuler</button>
              <button type="button" className="p-btn"
                disabled={!selectedSchool}
                onClick={() => selectedSchool && setStep(2)}
                style={{ opacity:selectedSchool ? 1 : .5 }}>
                Continuer <ChevronRight size={13}/>
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 : Formulaire ── */}
        {(step === 2 || isEdit) && (
          <form onSubmit={handleSubmit} style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:14, overflowY:"auto", flex:1 }}>

            {/* Rappel école */}
            {selectedSchool && (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                background:(selectedSchool.color||P.green)+"12",
                border:`1.5px solid ${(selectedSchool.color||P.green)}25`,
                borderRadius:9 }}>
                <div style={{ width:32, height:32, borderRadius:8,
                  background:(selectedSchool.color||P.green)+"25",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                  {selectedSchool.icon || "🏫"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:selectedSchool.color||P.green }}>
                    {selectedSchool.name}
                  </div>
                  <div style={{ fontSize:10, color:P.textLight }}>École associée · ID {selectedSchool.id}</div>
                </div>
                {!isEdit && (
                  <button type="button"
                    onClick={() => { setSelectedSchool(null); setStep(1); }}
                    style={{ fontSize:10, fontWeight:700, color:P.textLight, background:"none",
                      border:"none", cursor:"pointer", textDecoration:"underline" }}>
                    Changer
                  </button>
                )}
              </div>
            )}

            <Field label="Nom du département" required error={errors.name}>
              <input className={`p-input${errors.name?" err":""}`}
                value={form.name} onChange={e => setF("name", e.target.value)}
                placeholder="Ex: Département Informatique"/>
            </Field>

            <Field label="Code" required error={errors.code} hint="Identifiant court unique (ex: DEP-INFO)">
              <input className={`p-input${errors.code?" err":""}`}
                value={form.code} onChange={e => setF("code", e.target.value.toUpperCase())}
                placeholder="Ex: DEP-INFO" maxLength={20}
                style={{ fontFamily:"monospace", fontWeight:700, letterSpacing:"1px" }}/>
            </Field>

            <Field label="Description">
              <textarea className="p-input"
                value={form.description} onChange={e => setF("description", e.target.value)}
                rows={3} placeholder="Description optionnelle du département…"
                style={{ resize:"vertical", fontFamily:"inherit" }}/>
            </Field>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, paddingTop:14, borderTop:`1px solid ${P.border}` }}>
              <div>
                {!isEdit && (
                  <button type="button" className="p-ghost" onClick={() => setStep(1)}
                    style={{ display:"flex", alignItems:"center", gap:5 }}>
                    ← Retour
                  </button>
                )}
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button type="button" className="p-ghost" onClick={onClose}>Annuler</button>
                <button type="submit" className="p-btn" disabled={saving}>
                  {saving
                    ? <><span style={{ animation:"p-spin .8s linear infinite", display:"inline-block" }}>⟳</span> Enregistrement…</>
                    : <><Check size={13}/> {isEdit ? "Modifier" : "Créer le département"}</>}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

