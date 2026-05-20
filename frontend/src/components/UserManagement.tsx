import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import "./UserManagement.css";
import { apiGet, apiPost, apiDelete, apiPut } from "../services/api";

// ─── SVG Icon Components ──────────────────────────────────────────────────────

const Icon = {
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Filter: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  Columns: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/>
    </svg>
  ),
  Download: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Close: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Eye: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Ban: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  ),
  Key: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  ArrowLeft: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  ArrowUp: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>
  ),
  ArrowDown: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
    </svg>
  ),
  ArrowsUpDown: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 11 12 6 7 11"/><polyline points="7 13 12 18 17 13"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  FileCsv: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="10" y1="9" x2="14" y2="9"/>
    </svg>
  ),
  FileExcel: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/><line x1="9" y1="9" x2="10" y2="9"/>
    </svg>
  ),
  Lock: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  User: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  GripVertical: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/>
      <circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/>
      <circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/>
    </svg>
  ),
  FileText: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Edit: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  userId: string;
  createdAt: string;
  isActive: boolean;
  mobile?: string;
  gender?: string;
  courseStream?: string;
  cgpa?: number;
  sapCertification?: string;
  collegeName?: string;
  collegeEmail?: string;
  collegeRollNumber?: string;
  naxUnid?: string;
  studentId?: string;
  status?: string;
}

interface MasterItem { id: string; label: string; }
interface MasterData {
  genders: MasterItem[];
  streams: MasterItem[];
  certifications: MasterItem[];
  colleges: MasterItem[];
}

type SortDir = "asc" | "desc";

interface ColDef {
  key: keyof User;
  label: string;
  sortable: boolean;
  render?: (u: User) => React.ReactNode;
}

// ─── Column definitions ───────────────────────────────────────────────────────

const ALL_COLS: ColDef[] = [
  { key: "naxUnid",           label: "NAX_UNID",       sortable: true },
  { key: "name",              label: "Name",            sortable: true },
  { key: "studentId",         label: "Student ID",      sortable: true },
  { key: "userId",            label: "User ID",         sortable: true },
  { key: "email",             label: "Personal Email",  sortable: true },
  { key: "collegeEmail",      label: "College Email",   sortable: true },
  { key: "mobile",            label: "Mobile",          sortable: true },
  { key: "gender",            label: "Gender",          sortable: true },
  { key: "collegeName",       label: "College",         sortable: true },
  { key: "collegeRollNumber", label: "Roll No.",        sortable: true },
  { key: "courseStream",      label: "Stream",          sortable: true },
  { key: "cgpa",              label: "CGPA",            sortable: true },
  { key: "sapCertification",  label: "SAP Cert.",       sortable: true },
  {
    key: "isActive", label: "Status", sortable: true,
    render: (u) => (
      <span className={`status-pill ${u.isActive ? "active" : "inactive"}`}>
        {u.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
  {
    key: "createdAt", label: "Registered", sortable: true,
    render: (u) => new Date(u.createdAt).toLocaleDateString(),
  },
];

const DEFAULT_COL_KEYS: (keyof User)[] = [
  "naxUnid",
  "name",
  "studentId",
  "userId",
  "email",
  "collegeEmail",
  "mobile",
  "collegeName",
  "courseStream",
  "cgpa",
  "sapCertification",
  "isActive",
  "createdAt",
];

// ─── Export helpers ───────────────────────────────────────────────────────────

function escapeCSV(val: unknown): string {
  const s = val == null ? "" : String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCSV(rows: User[], cols: ColDef[]) {
  const header = cols.map(c => c.label).join(",");
  const body = rows.map(r =>
    cols.map(c => {
      if (c.key === "isActive") return r.isActive ? "Active" : "Inactive";
      if (c.key === "createdAt") return new Date(r.createdAt).toLocaleDateString();
      return escapeCSV(r[c.key]);
    }).join(",")
  ).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function exportExcel(rows: User[], cols: ColDef[]) {
  const header = `<tr>${cols.map(c => `<th>${c.label}</th>`).join("")}</tr>`;
  const body = rows.map(r =>
    `<tr>${cols.map(c => {
      if (c.key === "isActive") return `<td>${r.isActive ? "Active" : "Inactive"}</td>`;
      if (c.key === "createdAt") return `<td>${new Date(r.createdAt).toLocaleDateString()}</td>`;
      return `<td>${r[c.key] ?? ""}</td>`;
    }).join("")}</tr>`
  ).join("");
  const html = `<html><head><meta charset="utf-8"/></head><body><table>${header}${body}</table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `users_export_${new Date().toISOString().slice(0, 10)}.xls`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Edit Modal Sub-component ─────────────────────────────────────────────────
// Isolated so it can load master data once on mount without affecting the parent.

const EditUserModal: React.FC<{
  user: User;
  onClose: () => void;
  onSaved: (updated: User) => void;
}> = ({ user, onClose, onSaved }) => {
  const [formData, setFormData] = useState<Partial<User>>({ ...user });
  const [master, setMaster] = useState<MasterData>({ genders: [], streams: [], certifications: [], colleges: [] });
  const [masterLoading, setMasterLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<MasterData>("/public/master-data")
      .then(res => setMaster({
        genders: res.genders ?? [],
        streams: res.streams ?? [],
        certifications: res.certifications ?? [],
        colleges: res.colleges ?? [],
      }))
      .catch(() => {/* use empty lists — manual text input still works */})
      .finally(() => setMasterLoading(false));
  }, []);

  const set = (key: keyof User, val: any) => setFormData(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiPut<any>(`/admin/users/${user.id}`, formData);
      const updated: User = res.user ?? { ...user, ...formData };
      onSaved(updated);
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit — {user.name}</h3>
          <button className="modal-close-btn" onClick={onClose}><Icon.Close /></button>
        </div>

        {masterLoading && (
          <p className="um-modal-loading">Loading options…</p>
        )}

        <form onSubmit={handleSubmit}>
          {/* Row 1 */}
          <div className="form-row">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={formData.name || ""}
                onChange={e => set("name", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Personal Email</label>
              <input type="email" value={formData.email || ""}
                onChange={e => set("email", e.target.value)} />
            </div>
          </div>

          {/* Row 2 */}
          <div className="form-row">
            <div className="form-group">
              <label>College Email</label>
              <input type="email" value={formData.collegeEmail || ""}
                onChange={e => set("collegeEmail", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Mobile</label>
              <input type="tel" value={formData.mobile || ""}
                onChange={e => set("mobile", e.target.value)} />
            </div>
          </div>

          {/* Row 3 */}
          <div className="form-row">
            <div className="form-group">
              <label>NAX_UNID</label>
              <input type="text" value={formData.naxUnid || ""}
                onChange={e => set("naxUnid", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Student ID</label>
              <input type="text" value={formData.studentId || ""}
                onChange={e => set("studentId", e.target.value)} />
            </div>
          </div>

          {/* Row 4 — College dropdown */}
          <div className="form-row">
            <div className="form-group">
              <label>College Name</label>
              {master.colleges.length > 0 ? (
                <select value={formData.collegeName || ""}
                  onChange={e => set("collegeName", e.target.value)} disabled={masterLoading}>
                  <option value="">Select college</option>
                  {master.colleges.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                </select>
              ) : (
                <input type="text" value={formData.collegeName || ""}
                  onChange={e => set("collegeName", e.target.value)} />
              )}
            </div>
            <div className="form-group">
              <label>College Roll Number</label>
              <input type="text" value={formData.collegeRollNumber || ""}
                onChange={e => set("collegeRollNumber", e.target.value)} />
            </div>
          </div>

          {/* Row 5 — Stream dropdown + Gender dropdown */}
          <div className="form-row">
            <div className="form-group">
              <label>Course Stream</label>
              {master.streams.length > 0 ? (
                <select value={formData.courseStream || ""}
                  onChange={e => set("courseStream", e.target.value)} disabled={masterLoading}>
                  <option value="">Select stream</option>
                  {master.streams.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
                </select>
              ) : (
                <input type="text" value={formData.courseStream || ""}
                  onChange={e => set("courseStream", e.target.value)} />
              )}
            </div>
            <div className="form-group">
              <label>Gender</label>
              {master.genders.length > 0 ? (
                <select value={formData.gender || ""}
                  onChange={e => set("gender", e.target.value)} disabled={masterLoading}>
                  <option value="">Select gender</option>
                  {master.genders.map(g => <option key={g.id} value={g.label}>{g.label}</option>)}
                </select>
              ) : (
                <select value={formData.gender || ""}
                  onChange={e => set("gender", e.target.value)}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              )}
            </div>
          </div>

          {/* Row 6 — CGPA + SAP Cert dropdown */}
          <div className="form-row">
            <div className="form-group">
              <label>CGPA</label>
              <input type="number" min="0" max="10" step="0.01"
                value={formData.cgpa ?? ""}
                onChange={e => set("cgpa", parseFloat(e.target.value) || undefined)} />
            </div>
            <div className="form-group">
              <label>SAP Certification</label>
              {master.certifications.length > 0 ? (
                <select value={formData.sapCertification || ""}
                  onChange={e => set("sapCertification", e.target.value)} disabled={masterLoading}>
                  <option value="">Select certification</option>
                  {master.certifications.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                </select>
              ) : (
                <input type="text" value={formData.sapCertification || ""}
                  onChange={e => set("sapCertification", e.target.value)} />
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="um-btn">Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── UserProfile Sub-component ────────────────────────────────────────────────

const UserProfile: React.FC<{
  user: User;
  onBack: () => void;
  onToggleActive: (u: User) => void;
  onChangePassword: (u: User) => void;
  onDelete: (u: User) => void;
  onOfferLetter: (u: User) => void;
  onEdit: (u: User) => void;
}> = ({ user, onBack, onToggleActive, onChangePassword, onDelete, onOfferLetter, onEdit }) => {
  const fields: { label: string; value: React.ReactNode }[] = [
    { label: "NAX_UNID",           value: user.naxUnid || "—" },
    { label: "Full Name",          value: user.name },
    { label: "Student ID",         value: user.studentId || "—" },
    { label: "User ID",            value: user.userId },
    { label: "Personal Email",     value: user.email },
    { label: "College Email",      value: user.collegeEmail || "—" },
    { label: "Mobile",             value: user.mobile || "—" },
    { label: "Gender",             value: user.gender || "—" },
    { label: "College Name",       value: user.collegeName || "—" },
    { label: "College Roll No.",   value: user.collegeRollNumber || "—" },
    { label: "Course Stream",      value: user.courseStream || "—" },
    { label: "Last Semester CGPA", value: user.cgpa != null ? user.cgpa.toFixed(2) : "—" },
    { label: "SAP Certification",  value: user.sapCertification || "—" },
    { label: "Account Status",     value: (
        <span className={`status-pill ${user.isActive ? "active" : "inactive"}`}>
          {user.isActive ? "Active" : "Inactive"}
        </span>
      )},
    { label: "Registered On",      value: new Date(user.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric" }) },
  ];

  return (
    <div className="profile-view">
      <div className="profile-topbar">
        <button className="profile-back-btn" onClick={onBack}>
          <Icon.ArrowLeft /> Back to Users
        </button>
        <div className="profile-actions">
          <button className="profile-action-btn offer" onClick={() => onOfferLetter(user)}>
            <Icon.FileText /> Offer Letter
          </button>
          <button className="profile-action-btn edit" onClick={() => onEdit(user)}>
            <Icon.Edit /> Edit
          </button>
          <button
            className={`profile-action-btn ${user.isActive ? "deactivate" : "activate"}`}
            onClick={() => onToggleActive(user)}
          >
            {user.isActive ? <><Icon.Ban /> Deactivate</> : <><Icon.CheckCircle /> Activate</>}
          </button>
          <button className="profile-action-btn pwd" onClick={() => onChangePassword(user)}>
            <Icon.Key /> Change Password
          </button>
          <button className="profile-action-btn danger" onClick={() => onDelete(user)}>
            <Icon.Trash /> Delete User
          </button>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar-lg"><Icon.User /></div>
          <div className="profile-header-info">
            <h2>{user.name}</h2>
            <p className="profile-sub">{user.naxUnid || user.userId}</p>
            <p className="profile-sub">{user.email}</p>
          </div>
        </div>
        <div className="profile-divider" />
        <div className="profile-fields-grid">
          {fields.map(f => (
            <div className="profile-field" key={f.label}>
              <span className="profile-field-label">{f.label}</span>
              <span className="profile-field-value">{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const UserManagement: React.FC = () => {
  const [users, setUsers]             = useState<User[]>([]);
  const [loading, setLoading]         = useState(true);
  const [profileUser, setProfileUser] = useState<User | null>(null);

  // Filters
  const [search, setSearch]       = useState("");
  const [fCollege, setFCollege]   = useState("");
  const [fStream, setFStream]     = useState("");
  const [fGender, setFGender]     = useState("");
  const [fStatus, setFStatus]     = useState("");
  const [fCert, setFCert]         = useState("");
  const [fCgpaMin, setFCgpaMin]   = useState("");
  const [fCgpaMax, setFCgpaMax]   = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo]     = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortKey, setSortKey] = useState<keyof User>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Columns
  const [colOrder, setColOrder]           = useState<(keyof User)[]>(DEFAULT_COL_KEYS);
  const [showColPicker, setShowColPicker] = useState(false);
  const dragColRef  = useRef<keyof User | null>(null);
  const dragOverRef = useRef<keyof User | null>(null);

  // Modals
  const [showForm, setShowForm]         = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword]   = useState("");
  const [formData, setFormData]         = useState({ name: "", email: "", userId: "", password: "" });

  // Edit modal
  const [editTarget, setEditTarget] = useState<User | null>(null);

  // Export
  const [showExport, setShowExport] = useState(false);

  // Offer letter
  const [generatingOffer, setGeneratingOffer] = useState<string | null>(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = () => {
    setLoading(true);
    apiGet<any>("/admin/users")
      .then(res => setUsers(Array.isArray(res) ? res : (res.users ?? [])))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  const uColleges = useMemo(() => [...new Set(users.map(u => u.collegeName).filter(Boolean) as string[])].sort(), [users]);
  const uStreams  = useMemo(() => [...new Set(users.map(u => u.courseStream).filter(Boolean) as string[])].sort(), [users]);
  const uGenders  = useMemo(() => [...new Set(users.map(u => u.gender).filter(Boolean) as string[])].sort(), [users]);
  const uCerts    = useMemo(() => [...new Set(users.map(u => u.sapCertification).filter(Boolean) as string[])].sort(), [users]);

  const activeFilterCount = [fCollege, fStream, fGender, fStatus, fCert, fCgpaMin, fCgpaMax, fDateFrom, fDateTo].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(""); setFCollege(""); setFStream(""); setFGender("");
    setFStatus(""); setFCert(""); setFCgpaMin(""); setFCgpaMax(""); setFDateFrom(""); setFDateTo("");
  };

  const processed = useMemo(() => {
    let out = [...users];
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(u =>
        [u.name, u.email, u.userId, u.naxUnid, u.mobile, u.collegeEmail, u.collegeRollNumber, u.studentId]
          .some(v => v?.toLowerCase().includes(q))
      );
    }
    if (fCollege) out = out.filter(u => u.collegeName === fCollege);
    if (fStream)  out = out.filter(u => u.courseStream === fStream);
    if (fGender)  out = out.filter(u => u.gender === fGender);
    if (fCert)    out = out.filter(u => u.sapCertification === fCert);
    if (fStatus === "active")   out = out.filter(u => u.isActive);
    if (fStatus === "inactive") out = out.filter(u => !u.isActive);
    if (fCgpaMin) out = out.filter(u => (u.cgpa ?? 0) >= parseFloat(fCgpaMin));
    if (fCgpaMax) out = out.filter(u => (u.cgpa ?? 0) <= parseFloat(fCgpaMax));
    if (fDateFrom) out = out.filter(u => new Date(u.createdAt) >= new Date(fDateFrom));
    if (fDateTo)   out = out.filter(u => new Date(u.createdAt) <= new Date(fDateTo + "T23:59:59"));
    out.sort((a, b) => {
      const av = a[sortKey] ?? ""; const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [users, search, fCollege, fStream, fGender, fStatus, fCert, fCgpaMin, fCgpaMax, fDateFrom, fDateTo, sortKey, sortDir]);

  const visibleColDefs = useMemo(
    () => colOrder.map(k => ALL_COLS.find(c => c.key === k)!).filter(Boolean),
    [colOrder]
  );

  const handleSort = (key: keyof User) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleDragStart = (key: keyof User) => { dragColRef.current = key; };
  const handleDragOver  = (e: React.DragEvent, key: keyof User) => { e.preventDefault(); dragOverRef.current = key; };
  const handleDrop = () => {
    const from = dragColRef.current; const to = dragOverRef.current;
    if (!from || !to || from === to) return;
    setColOrder(prev => {
      const arr = [...prev];
      const fi = arr.indexOf(from); const ti = arr.indexOf(to);
      arr.splice(fi, 1); arr.splice(ti, 0, from);
      return arr;
    });
    dragColRef.current = null; dragOverRef.current = null;
  };

  const toggleCol = (key: keyof User) => {
    setColOrder(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiPost<any>("/admin/users", { ...formData, role: "answerer" });
      setUsers(prev => [...prev, res.user ?? res]);
      setShowForm(false);
      setFormData({ name: "", email: "", userId: "", password: "" });
    } catch (err: any) { alert(err.message || "Failed to create user"); }
  };

  const handleDelete = useCallback(async (user: User) => {
    if (!window.confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/admin/users/${user.id}`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      if (profileUser?.id === user.id) setProfileUser(null);
    } catch (err: any) { alert(err.message || "Failed to delete user"); }
  }, [profileUser]);

  const handleToggleActive = useCallback(async (user: User) => {
    try {
      await apiPut(`/admin/users/${user.id}/status`, { isActive: !user.isActive });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
      if (profileUser?.id === user.id) setProfileUser(p => p ? { ...p, isActive: !p.isActive } : p);
    } catch (err: any) { alert(err.message || "Failed to update status"); }
  }, [profileUser]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || newPassword.length < 4) { alert("Minimum 4 characters"); return; }
    try {
      await apiPut(`/admin/users/${selectedUser.id}/change-password`, { newPassword });
      alert(`Password updated for ${selectedUser.name}`);
      setShowPwdModal(false); setSelectedUser(null); setNewPassword("");
    } catch (err: any) { alert(err.message || "Failed"); }
  };

  const openPasswordModal = useCallback((user: User) => {
    setSelectedUser(user); setNewPassword(""); setShowPwdModal(true);
  }, []);

  // Called by EditUserModal when save succeeds
  const handleUserSaved = useCallback((updated: User) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    if (profileUser?.id === updated.id) setProfileUser(updated);
  }, [profileUser]);

  const handleOfferLetter = useCallback(async (user: User) => {
    if (generatingOffer) return;
    setGeneratingOffer(user.id);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/admin/offer-letter/${user.id}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate offer letter");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      const safeName = user.name.replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replace(/\s+/g, "_");
      a.download = `${safeName}_Devcon_Offer_Letter.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Could not generate offer letter. Please try again.");
    } finally {
      setGeneratingOffer(null);
    }
  }, [generatingOffer]);

  // ─── Profile view ──────────────────────────────────────────────────────────
  if (profileUser) {
    const latest = users.find(u => u.id === profileUser.id) ?? profileUser;
    return (
      <>
        <UserProfile
          user={latest}
          onBack={() => setProfileUser(null)}
          onToggleActive={handleToggleActive}
          onChangePassword={openPasswordModal}
          onDelete={handleDelete}
          onOfferLetter={handleOfferLetter}
          onEdit={u => setEditTarget(u)}
        />

        {showPwdModal && selectedUser && (
          <div className="modal-overlay" onClick={() => setShowPwdModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Change Password</h3>
                <button className="modal-close-btn" onClick={() => setShowPwdModal(false)}><Icon.Close /></button>
              </div>
              <p className="modal-sub">{selectedUser.name} · <strong>{selectedUser.userId}</strong></p>
              <form onSubmit={handlePasswordSubmit}>
                <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 500, fontSize: "0.8125rem" }}>New Password *</label>
                  <div className="um-pwd-input-wrap">
                    <span className="um-pwd-icon"><Icon.Lock /></span>
                    <input type="password" value={newPassword} required minLength={4}
                      placeholder="Enter new password" onChange={e => setNewPassword(e.target.value)}
                      style={{ width: "100%", padding: "0.65rem 0.65rem 0.65rem 2.25rem",
                        border: "1px solid #d1d5db", borderRadius: "0.375rem",
                        fontSize: "0.9rem", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <small style={{ color: "#9ca3af", fontSize: "0.775rem" }}>Minimum 4 characters</small>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowPwdModal(false)} className="um-btn">Cancel</button>
                  <button type="submit" className="primary-btn">Update Password</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editTarget && (
          <EditUserModal
            user={editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={handleUserSaved}
          />
        )}
      </>
    );
  }

  // ─── Main list view ────────────────────────────────────────────────────────
  return (
    <div className="user-management" style={{ paddingTop: "2rem" }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>User Management</h2>
          <p className="um-subtitle">{users.length} total users</p>
        </div>
        <div className="um-toolbar">
          <div className="um-search-wrap">
            <span className="um-search-icon"><Icon.Search /></span>
            <input className="um-search" type="text"
              placeholder="Search name, email, ID, UNID, mobile…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className={`um-btn ${showFilters ? "active" : ""}`} onClick={() => setShowFilters(s => !s)}>
            <Icon.Filter /> Filters
            {activeFilterCount > 0 && <span className="um-badge">{activeFilterCount}</span>}
          </button>
          <button className={`um-btn ${showColPicker ? "active" : ""}`} onClick={() => setShowColPicker(s => !s)}>
            <Icon.Columns /> Columns
          </button>
          <div className="um-export-wrap">
            <button className="um-btn" onClick={() => setShowExport(s => !s)}>
              <Icon.Download /> Export <Icon.ChevronDown />
            </button>
            {showExport && (
              <div className="um-export-menu" onMouseLeave={() => setShowExport(false)}>
                <button onClick={() => { exportCSV(processed, visibleColDefs); setShowExport(false); }}>
                  <Icon.FileCsv /> Export CSV — filtered ({processed.length} rows)
                </button>
                <button onClick={() => { exportExcel(processed, visibleColDefs); setShowExport(false); }}>
                  <Icon.FileExcel /> Export Excel — filtered ({processed.length} rows)
                </button>
                <div className="um-export-divider" />
                <button onClick={() => { exportCSV(users, visibleColDefs); setShowExport(false); }}>
                  <Icon.FileCsv /> Export CSV — all ({users.length} rows)
                </button>
                <button onClick={() => { exportExcel(users, visibleColDefs); setShowExport(false); }}>
                  <Icon.FileExcel /> Export Excel — all ({users.length} rows)
                </button>
              </div>
            )}
          </div>
          <button className="primary-btn" onClick={() => setShowForm(s => !s)}>
            {showForm ? <><Icon.Close /> Cancel</> : <><Icon.Plus /> Add User</>}
          </button>
        </div>
      </div>

      {/* Column Picker */}
      {showColPicker && (
        <div className="form-card um-col-picker">
          <div className="um-col-picker-header">
            <h3>Columns — drag to reorder</h3>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="um-link-btn" onClick={() => setColOrder(ALL_COLS.map(c => c.key))}>Show All</button>
              <button className="um-link-btn" onClick={() => setColOrder([...DEFAULT_COL_KEYS])}>Reset</button>
            </div>
          </div>
          <div className="um-col-grid">
            {ALL_COLS.map(col => (
              <label key={col.key} className={`um-col-tag ${colOrder.includes(col.key) ? "on" : "off"}`}
                draggable onDragStart={() => handleDragStart(col.key)}
                onDragOver={e => handleDragOver(e, col.key)} onDrop={handleDrop}>
                <input type="checkbox" checked={colOrder.includes(col.key)} onChange={() => toggleCol(col.key)} />
                <span className="um-col-drag-handle"><Icon.GripVertical /></span>
                {col.label}
              </label>
            ))}
          </div>
          <p className="um-col-hint">Drag column chips to reorder them in the table</p>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="form-card">
          <div className="um-filter-header">
            <h3>Filters</h3>
            {activeFilterCount > 0 && <button className="um-link-btn" onClick={clearFilters}><Icon.Close /> Clear All ({activeFilterCount})</button>}
          </div>
          <div className="um-filter-grid">
            <div className="form-group">
              <label>College</label>
              <select value={fCollege} onChange={e => setFCollege(e.target.value)}>
                <option value="">All Colleges</option>
                {uColleges.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Course Stream</label>
              <select value={fStream} onChange={e => setFStream(e.target.value)}>
                <option value="">All Streams</option>
                {uStreams.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select value={fGender} onChange={e => setFGender(e.target.value)}>
                <option value="">All Genders</option>
                {uGenders.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Account Status</label>
              <select value={fStatus} onChange={e => setFStatus(e.target.value)}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="form-group">
              <label>SAP Certification</label>
              <select value={fCert} onChange={e => setFCert(e.target.value)}>
                <option value="">All Certifications</option>
                {uCerts.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>CGPA Min</label>
              <input type="number" min="0" max="10" step="0.1" placeholder="0.0"
                value={fCgpaMin} onChange={e => setFCgpaMin(e.target.value)} />
            </div>
            <div className="form-group">
              <label>CGPA Max</label>
              <input type="number" min="0" max="10" step="0.1" placeholder="10.0"
                value={fCgpaMax} onChange={e => setFCgpaMax(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Registered From</label>
              <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Registered To</label>
              <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Add User Form */}
      {showForm && (
        <div className="form-card">
          <h3>Create New Test Taker</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" value={formData.name} placeholder="Enter full name" required
                  onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={formData.email} placeholder="Enter email" required
                  onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>User ID *</label>
                <input type="text" value={formData.userId} placeholder="Enter user ID" required
                  onChange={e => setFormData({ ...formData, userId: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input type="password" value={formData.password} placeholder="Enter password" required
                  onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="primary-btn">Create User</button>
            </div>
          </form>
        </div>
      )}

      {/* Results bar */}
      <div className="um-results-bar">
        <span className="um-count">
          Showing <strong>{processed.length}</strong> of <strong>{users.length}</strong> users
          {activeFilterCount > 0 && (
            <button className="um-link-btn" onClick={clearFilters} style={{ marginLeft: "0.5rem" }}>Clear filters</button>
          )}
        </span>
        <div className="um-sort-bar">
          <span className="um-sort-label">Sort by</span>
          <select value={sortKey} onChange={e => setSortKey(e.target.value as keyof User)} className="um-sort-select">
            {ALL_COLS.filter(c => c.sortable).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <button className="um-btn sm" onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}>
            {sortDir === "asc" ? <><Icon.ArrowUp /> Asc</> : <><Icon.ArrowDown /> Desc</>}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="users-table">
        <table>
          <thead>
            <tr>
              {visibleColDefs.map(col => (
                <th key={col.key} draggable
                  onDragStart={() => handleDragStart(col.key)}
                  onDragOver={e => handleDragOver(e, col.key)}
                  onDrop={handleDrop}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`um-th ${col.sortable ? "sortable" : ""}`}
                  title="Click to sort · Drag to reorder"
                >
                  <span className="um-th-content">
                    <span className="um-th-drag"><Icon.GripVertical /></span>
                    {col.label}
                    {col.sortable && (
                      <span className={`sort-icon ${sortKey === col.key ? "active" : ""}`}>
                        {sortKey === col.key
                          ? (sortDir === "asc" ? <Icon.ArrowUp /> : <Icon.ArrowDown />)
                          : <Icon.ArrowsUpDown />}
                      </span>
                    )}
                  </span>
                </th>
              ))}
              <th className="um-th um-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={visibleColDefs.length + 1} className="empty-state">Loading users…</td></tr>
            ) : processed.length === 0 ? (
              <tr><td colSpan={visibleColDefs.length + 1} className="empty-state">No users match the current filters.</td></tr>
            ) : (
              processed.map(user => (
                <tr key={user.id} className="um-row">
                  {visibleColDefs.map(col => (
                    <td key={col.key}
                      className={col.key === "name" ? "um-name-cell" : ""}
                      onClick={col.key === "name" ? () => setProfileUser(user) : undefined}
                      title={col.key === "name" ? "Click to view profile" : undefined}
                    >
                      {col.render
                        ? col.render(user)
                        : col.key === "cgpa"
                        ? (user.cgpa != null ? user.cgpa.toFixed(2) : "—")
                        : ((user[col.key] as string) || "—")}
                    </td>
                  ))}
                  <td className="um-td-actions">
                    <div className="um-row-actions">
                      <button className="um-action-btn view" onClick={() => setProfileUser(user)} title="View profile">
                        <Icon.Eye />
                      </button>
                      <button className={`um-action-btn ${user.isActive ? "deactivate" : "activate"}`}
                        onClick={() => handleToggleActive(user)}
                        title={user.isActive ? "Deactivate" : "Activate"}>
                        {user.isActive ? <Icon.Ban /> : <Icon.CheckCircle />}
                      </button>
                      <button className="um-action-btn pwd" onClick={() => openPasswordModal(user)} title="Change password">
                        <Icon.Key />
                      </button>
                      <button className="um-action-btn edit" onClick={() => setEditTarget(user)} title="Edit user">
                        <Icon.Edit />
                      </button>
                      <button className="um-action-btn offer"
                        onClick={() => handleOfferLetter(user)} title="Offer letter"
                        disabled={generatingOffer === user.id}>
                        {generatingOffer === user.id
                          ? <span style={{ fontSize: "10px", lineHeight: 1 }}>…</span>
                          : <Icon.FileText />}
                      </button>
                      <button className="um-action-btn del" onClick={() => handleDelete(user)} title="Delete user">
                        <Icon.Trash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Password Modal */}
      {showPwdModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPwdModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="modal-close-btn" onClick={() => setShowPwdModal(false)}><Icon.Close /></button>
            </div>
            <p className="modal-sub">{selectedUser.name} · <strong>{selectedUser.userId}</strong></p>
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 500, fontSize: "0.8125rem" }}>New Password *</label>
                <div className="um-pwd-input-wrap">
                  <span className="um-pwd-icon"><Icon.Lock /></span>
                  <input type="password" value={newPassword} required minLength={4}
                    placeholder="Enter new password" onChange={e => setNewPassword(e.target.value)}
                    style={{ width: "100%", padding: "0.65rem 0.65rem 0.65rem 2.25rem",
                      border: "1px solid #d1d5db", borderRadius: "0.375rem",
                      fontSize: "0.9rem", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <small style={{ color: "#9ca3af", fontSize: "0.775rem" }}>Minimum 4 characters</small>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowPwdModal(false)} className="um-btn">Cancel</button>
                <button type="submit" className="primary-btn">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleUserSaved}
        />
      )}

    </div>
  );
};

export default UserManagement;
