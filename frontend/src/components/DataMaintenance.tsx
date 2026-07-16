import React, { useEffect, useRef, useState } from "react";
import "./DataMaintenance.css";
import { apiDelete, apiGet, apiPatch, apiPost } from "../services/api";
import ValueHelpField, { ValueHelpOption } from "./ValueHelpField";
import { filterMasterItems } from "../utils/filterUtils";

const Icon = {
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Trash: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Close: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Gender: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M12 12v8M9 18h6" />
    </svg>
  ),
  Stream: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  Certificate: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  College: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Edit: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Warning: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

interface MasterItem {
  id: string;
  label: string;
  createdAt: string;
}

interface MasterData {
  genders: MasterItem[];
  streams: MasterItem[];
  certifications: MasterItem[];
  colleges: MasterItem[];
}

type Category = keyof MasterData;

interface ColMeta {
  key: Category;
  label: string;
  placeholder: string;
  Icon: React.FC;
}

const COLUMNS: ColMeta[] = [
  { key: "genders", label: "Gender", placeholder: "e.g. Male", Icon: Icon.Gender },
  { key: "streams", label: "Course Stream", placeholder: "e.g. Computer Science", Icon: Icon.Stream },
  { key: "certifications", label: "SAP Certification", placeholder: "e.g. SAP FICO", Icon: Icon.Certificate },
  { key: "colleges", label: "College Name", placeholder: "e.g. MIT College of Engg", Icon: Icon.College },
];

const DataMaintenance: React.FC = () => {
  const [masterData, setMasterData] = useState<MasterData>({ genders: [], streams: [], certifications: [], colleges: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [newValues, setNewValues] = useState<Record<Category, string>>({ genders: "", streams: "", certifications: "", colleges: "" });
  const [adding, setAdding] = useState<Record<Category, boolean>>({ genders: false, streams: false, certifications: false, colleges: false });
  const [searches, setSearches] = useState<Record<Category, string>>({ genders: "", streams: "", certifications: "", colleges: "" });
  const [activeInput, setActiveInput] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<{ cat: Category; item: MasterItem } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<MasterData>("/admin/master-data");
      setMasterData({
        genders: res.genders || [],
        streams: res.streams || [],
        certifications: res.certifications || [],
        colleges: res.colleges || [],
      });
    } catch (e) {
      console.error("Failed to load master data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (cat: Category) => {
    const label = newValues[cat].trim();
    if (!label) return;
    setAdding((prev) => ({ ...prev, [cat]: true }));
    try {
      const res = await apiPost<MasterItem>(`/admin/master-data/${cat}`, { label });
      setMasterData((prev) => ({ ...prev, [cat]: [...prev[cat], res] }));
      setNewValues((prev) => ({ ...prev, [cat]: "" }));
      setActiveInput(null);
    } catch (e: any) {
      alert(e?.message || "Failed to add item.");
    } finally {
      setAdding((prev) => ({ ...prev, [cat]: false }));
    }
  };

  const handleDelete = async (cat: Category, id: string, label: string) => {
    if (!window.confirm(`Delete "${label}"? This may affect the registration form.`)) return;
    try {
      await apiDelete(`/admin/master-data/${cat}/${id}`);
      setMasterData((prev) => ({ ...prev, [cat]: prev[cat].filter((i) => i.id !== id) }));
    } catch (e: any) {
      alert(e?.message || "Failed to delete item.");
    }
  };

  const handleEditStart = (cat: Category, item: MasterItem) => {
    setEditingItem({ cat, item });
    setEditValue(item.label);
  };

  const handleEditSave = async () => {
    if (!editingItem) return;
    const label = editValue.trim();
    if (!label) return;
    setSavingEdit(true);
    try {
      const res = await apiPatch<MasterItem>(`/admin/master-data/${editingItem.cat}/${editingItem.item.id}`, { label });
      setMasterData((prev) => ({
        ...prev,
        [editingItem.cat]: prev[editingItem.cat].map((entry) =>
          entry.id === editingItem.item.id ? { ...entry, ...res, createdAt: entry.createdAt } : entry
        ),
      }));
      setEditingItem(null);
      setEditValue("");
    } catch (e: any) {
      alert(e?.message || "Failed to update item.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, cat: Category) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd(cat);
    }
    if (e.key === "Escape") {
      setActiveInput(null);
      setNewValues((prev) => ({ ...prev, [cat]: "" }));
    }
  };

  const getFilteredItems = (cat: Category): MasterItem[] => {
    return filterMasterItems(masterData[cat], searches[cat]);
  };

  const maxRows = Math.max(...COLUMNS.map((c) => getFilteredItems(c.key).length), 0);
  const totalItems = COLUMNS.reduce((sum, c) => sum + masterData[c.key].length, 0);
  const getSearchOptions = (cat: Category): ValueHelpOption[] =>
    masterData[cat].map((item) => ({ value: item.label, label: item.label }));

  return (
    <div className="data-maintenance" style={{ paddingTop: "2rem" }}>
      <div className="dm-page-header">
        <div>
          <h2>Data Maintenance</h2>
          <p className="dm-subtitle">
            Manage dropdown values shown to students during registration
            {!isLoading && <span className="dm-total-badge">{totalItems} total entries</span>}
          </p>
        </div>
        <button className="dm-refresh-btn" onClick={loadData} title="Refresh data">
          <Icon.Refresh /> Refresh
        </button>
      </div>

      <div className="dm-grid-container">
        <div className="dm-grid-header">
          <div className="dm-row-num-header">#</div>
          {COLUMNS.map((col) => {
            const ColIcon = col.Icon;
            return (
              <div key={col.key} className="dm-col-header">
                <div className="dm-col-header-top">
                  <span className="dm-col-header-icon"><ColIcon /></span>
                  <span className="dm-col-header-label">{col.label}</span>
                  <span className="dm-col-count">{masterData[col.key].length}</span>
                </div>
                <div className="dm-col-search-wrap">
                  <ValueHelpField
                    label={`${col.label} Search`}
                    placeholder={`Filter ${col.label.toLowerCase()}...`}
                    value={searches[col.key]}
                    options={getSearchOptions(col.key)}
                    onChange={(value) => setSearches((prev) => ({ ...prev, [col.key]: value }))}
                    allowFreeText
                    compact
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="dm-add-row">
          <div className="dm-row-num dm-row-num-add">
            <Icon.Plus />
          </div>
          {COLUMNS.map((col) => (
            <div key={col.key} className="dm-add-cell">
              {activeInput === col.key ? (
                <div className="dm-inline-input-wrap">
                  <input
                    ref={(el) => { inputRefs.current[col.key] = el; }}
                    className="dm-inline-input"
                    type="text"
                    value={newValues[col.key]}
                    onChange={(e) => setNewValues((prev) => ({ ...prev, [col.key]: e.target.value }))}
                    onKeyDown={(e) => handleKeyDown(e, col.key)}
                    placeholder={col.placeholder}
                    autoFocus
                    disabled={adding[col.key]}
                  />
                  <button className="dm-inline-btn confirm" onClick={() => handleAdd(col.key)} disabled={adding[col.key] || !newValues[col.key].trim()} title="Add (Enter)">
                    <Icon.Check />
                  </button>
                  <button className="dm-inline-btn cancel" onClick={() => { setActiveInput(null); setNewValues((prev) => ({ ...prev, [col.key]: "" })); }} title="Cancel (Esc)">
                    <Icon.Close />
                  </button>
                </div>
              ) : (
                <button
                  className="dm-add-trigger"
                  onClick={() => {
                    setActiveInput(col.key);
                    setTimeout(() => inputRefs.current[col.key]?.focus(), 50);
                  }}
                >
                  <Icon.Plus />
                  <span>Add {col.label}</span>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="dm-grid-body">
          {isLoading ? (
            <div className="dm-loading-row">
              <div className="dm-spinner" />
              Loading data...
            </div>
          ) : maxRows === 0 ? (
            <div className="dm-empty-row">
              No entries found. Use the row above to add values.
            </div>
          ) : (
            Array.from({ length: maxRows }).map((_, rowIdx) => (
              <div key={rowIdx} className={`dm-data-row ${rowIdx % 2 === 0 ? "even" : "odd"}`}>
                <div className="dm-row-num">{rowIdx + 1}</div>
                {COLUMNS.map((col) => {
                  const item = getFilteredItems(col.key)[rowIdx];
                  return (
                    <div key={col.key} className="dm-data-cell">
                      {item ? (
                        <div className="dm-cell-content">
                          <span className="dm-cell-label" title={item.label}>{item.label}</span>
                          <button className="dm-edit-btn" onClick={() => handleEditStart(col.key, item)} title={`Edit "${item.label}"`}>
                            <Icon.Edit />
                          </button>
                          <button className="dm-delete-btn" onClick={() => handleDelete(col.key, item.id, item.label)} title={`Delete "${item.label}"`}>
                            <Icon.Trash />
                          </button>
                        </div>
                      ) : (
                        <span className="dm-cell-empty" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {!isLoading && (
          <div className="dm-grid-footer">
            <div className="dm-row-num-footer" />
            {COLUMNS.map((col) => (
              <div key={col.key} className="dm-footer-cell">
                {searches[col.key] ? (
                  <span className="dm-footer-filtered">
                    {getFilteredItems(col.key).length} of {masterData[col.key].length}
                  </span>
                ) : (
                  <span className="dm-footer-count">{masterData[col.key].length} {masterData[col.key].length === 1 ? "entry" : "entries"}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dm-info-note">
        <Icon.Warning />
        <span>Deleting a value will not affect students who have already registered with that value. It will only remove the option from the registration form.</span>
      </div>

      {editingItem && (
        <div className="dm-modal-backdrop" onClick={() => !savingEdit && setEditingItem(null)}>
          <div className="dm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dm-modal-header">
              <div className="dm-modal-title">
                <span className="dm-modal-title-icon"><Icon.Edit /></span>
                <span>Edit Value</span>
              </div>
              <button className="dm-modal-close" onClick={() => setEditingItem(null)} disabled={savingEdit}>
                <Icon.Close />
              </button>
            </div>
            <div className="dm-modal-body">
              <label className="dm-modal-cat-label">{COLUMNS.find((col) => col.key === editingItem.cat)?.label}</label>
              <input
                className="dm-modal-input"
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditSave();
                  if (e.key === "Escape" && !savingEdit) setEditingItem(null);
                }}
                disabled={savingEdit}
                autoFocus
              />
              <p className="dm-modal-prev">Current value: <span>{editingItem.item.label}</span></p>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-modal-btn-cancel" onClick={() => setEditingItem(null)} disabled={savingEdit}>Cancel</button>
              <button className="dm-modal-btn-save" onClick={handleEditSave} disabled={savingEdit || !editValue.trim()}>
                <Icon.Check /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataMaintenance;
