import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPut } from "../services/api";
import ValueHelpField, { ValueHelpOption } from "./ValueHelpField";
import { filterAssignableStudents } from "../utils/filterUtils";
import type { AssignableStatusFilter } from "../utils/filterUtils";
import "./AdminInterviewPrep.css";

interface Student {
  id: string;
  name: string;
  userId: string;
  email: string;
  isActive: boolean;
  collegeName?: string;
  courseStream?: string;
  gender?: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

const SECTION_STATS = [
  { label: "ABAP Dictionary", count: 10, color: "#0070f2" },
  { label: "Internal Tables & Open SQL", count: 10, color: "#8B5CF6" },
  { label: "Reports, ALV & Dialog", count: 10, color: "#059669" },
  { label: "Interfaces & Enhancements", count: 10, color: "#D97706" },
  { label: "OO ABAP & Performance", count: 14, color: "#DC2626" },
  { label: "S/4HANA, CDS, RAP & Cloud", count: 15, color: "#0891B2" },
  { label: "Real-Time Scenarios", count: 6, color: "#7C3AED" },
];

const AdminInterviewPrep: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [streamFilter, setStreamFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssignableStatusFilter>("active");
  const [assignedFilter, setAssignedFilter] = useState<"all" | "assigned" | "unassigned">("all");

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────
  const availableStreams = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.courseStream).filter(Boolean) as string[])
      ).sort(),
    [students]
  );

  const availableColleges = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.collegeName).filter(Boolean) as string[])
      ).sort(),
    [students]
  );

  const availableGenders = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.gender).filter(Boolean) as string[])
      ).sort(),
    [students]
  );

  const searchOptions = useMemo<ValueHelpOption[]>(() => {
    const unique = Array.from(
      new Set(
        students
          .flatMap((s) => [s.name, s.userId, s.email, s.courseStream, s.collegeName, s.gender])
          .filter(Boolean) as string[]
      )
    );
    return unique.slice(0, 50).map((v) => ({ value: v, label: v }));
  }, [students]);

  const streamOptions: ValueHelpOption[] = [
    { value: "", label: "All Streams" },
    ...availableStreams.map((v) => ({ value: v, label: v })),
  ];
  const collegeOptions: ValueHelpOption[] = [
    { value: "", label: "All Colleges" },
    ...availableColleges.map((v) => ({ value: v, label: v })),
  ];
  const genderOptions: ValueHelpOption[] = [
    { value: "", label: "All Genders" },
    ...availableGenders.map((v) => ({ value: v, label: v })),
  ];
  const statusOptions: ValueHelpOption[] = [
    { value: "active", label: "Active Only" },
    { value: "inactive", label: "Inactive Only" },
    { value: "all", label: "All Students" },
  ];
  const assignedOptions: ValueHelpOption[] = [
    { value: "all", label: "All" },
    { value: "assigned", label: "Assigned" },
    { value: "unassigned", label: "Not Assigned" },
  ];

  const filteredStudents = useMemo(() => {
    const base = filterAssignableStudents(students, {
      search: studentSearch,
      stream: streamFilter,
      college: collegeFilter,
      status: statusFilter,
    });
    if (genderFilter) {
      return base.filter((s) => s.gender === genderFilter);
    }
    if (assignedFilter === "assigned") {
      return base.filter((s) => assignedUserIds.includes(s.userId));
    }
    if (assignedFilter === "unassigned") {
      return base.filter((s) => !assignedUserIds.includes(s.userId));
    }
    return base;
  }, [students, studentSearch, streamFilter, collegeFilter, statusFilter, genderFilter, assignedFilter, assignedUserIds]);

  const filteredUserIds = useMemo(
    () => filteredStudents.map((s) => s.userId),
    [filteredStudents]
  );

  const allFilteredSelected = useMemo(
    () =>
      filteredUserIds.length > 0 &&
      filteredUserIds.every((id) => selectedUserIds.includes(id)),
    [filteredUserIds, selectedUserIds]
  );

  const activeFilterCount = [
    Boolean(studentSearch.trim()),
    Boolean(streamFilter),
    Boolean(collegeFilter),
    Boolean(genderFilter),
    statusFilter !== "active",
    assignedFilter !== "all",
  ].filter(Boolean).length;

  const changes = useMemo(() => {
    const sel = new Set(selectedUserIds);
    const cur = new Set(assignedUserIds);
    return {
      added: selectedUserIds.filter((id) => !cur.has(id)),
      removed: assignedUserIds.filter((id) => !sel.has(id)),
    };
  }, [selectedUserIds, assignedUserIds]);

  const hasChanges = changes.added.length > 0 || changes.removed.length > 0;

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await apiGet<{ users: Student[] }>("/admin/users");
      setStudents(res.users || []);
    } catch (e: any) {
      showToast(e.message || "Failed to load students", "error");
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await apiGet<{ userIds: string[] }>(
        "/admin/interview-prep/assignments"
      );
      const ids = res.userIds || [];
      setAssignedUserIds(ids);
      setSelectedUserIds(ids);
    } catch (e: any) {
      showToast(e.message || "Failed to load assignments", "error");
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    loadStudents();
    loadAssignments();
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiPut<{ userIds: string[]; message: string }>(
        "/admin/interview-prep/assignments",
        { userIds: selectedUserIds }
      );
      setAssignedUserIds(res.userIds || []);
      setSelectedUserIds(res.userIds || []);
      showToast(res.message || "Assignments saved successfully.", "success");
    } catch (e: any) {
      showToast(e.message || "Failed to save assignments", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setSelectedUserIds([...assignedUserIds]);
  };

  const toggleStudent = (userId: string, checked: boolean) => {
    setSelectedUserIds((prev) =>
      checked
        ? Array.from(new Set([...prev, userId]))
        : prev.filter((id) => id !== userId)
    );
  };

  const toggleAllFiltered = () => {
    setSelectedUserIds((prev) => {
      if (allFilteredSelected) {
        return prev.filter((id) => !filteredUserIds.includes(id));
      }
      return Array.from(new Set([...prev, ...filteredUserIds]));
    });
  };

  const clearFilters = () => {
    setStudentSearch("");
    setStreamFilter("");
    setCollegeFilter("");
    setGenderFilter("");
    setStatusFilter("active");
    setAssignedFilter("all");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const isLoading = loadingStudents || loadingAssignments;

  return (
    <div className="aip-page">
      {/* ── Page header ── */}
      <div className="aip-page-header">
        <div className="aip-page-header-copy">
          <h2 className="aip-page-title">Interview Preparation Access</h2>
          <p className="aip-page-subtitle">
            Select which students can access the SAP ABAP Interview Preparation
            module (75 Q&amp;A, 2026 Edition). Only assigned students will see
            the tab in their dashboard.
          </p>
        </div>
        <div className="aip-page-header-badge">
          <span className="aip-total-badge">
            {assignedUserIds.length} student{assignedUserIds.length !== 1 ? "s" : ""} assigned
          </span>
        </div>
      </div>

      {/* ── Info cards row ── */}
      <div className="aip-info-row">
        <div className="aip-info-card">
          <div className="aip-info-icon aip-info-icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div>
            <div className="aip-info-label">Total Questions</div>
            <div className="aip-info-value">75</div>
          </div>
        </div>
        <div className="aip-info-card">
          <div className="aip-info-icon aip-info-icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div>
            <div className="aip-info-label">Sections</div>
            <div className="aip-info-value">7</div>
          </div>
        </div>
        <div className="aip-info-card">
          <div className="aip-info-icon aip-info-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="7" r="3" />
              <path d="M3 20a6 6 0 0 1 12 0" />
              <circle cx="17" cy="7" r="3" />
              <path d="M21 20a6 6 0 0 0-6-6" />
            </svg>
          </div>
          <div>
            <div className="aip-info-label">Students Assigned</div>
            <div className="aip-info-value">{assignedUserIds.length}</div>
          </div>
        </div>
        <div className="aip-info-card">
          <div className="aip-info-icon aip-info-icon--yellow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div>
            <div className="aip-info-label">Pending Changes</div>
            <div className="aip-info-value" style={{ color: hasChanges ? "#D97706" : undefined }}>
              {hasChanges ? `+${changes.added.length} / −${changes.removed.length}` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section overview ── */}
      <div className="aip-sections-row">
        {SECTION_STATS.map((s) => (
          <div key={s.label} className="aip-section-chip" style={{ borderLeftColor: s.color }}>
            <span className="aip-section-chip-name">{s.label}</span>
            <span className="aip-section-chip-count" style={{ color: s.color }}>{s.count} Q</span>
          </div>
        ))}
      </div>

      {/* ── Assignment panel ── */}
      <div className="aip-panel">
        {/* Panel header */}
        <div className="aip-panel-header">
          <div className="aip-panel-header-left">
            <h3 className="aip-panel-title">Assign Students</h3>
            <span className="aip-panel-meta">
              {isLoading
                ? "Loading..."
                : `${filteredStudents.length} shown · ${selectedUserIds.length} selected · ${assignedUserIds.length} currently assigned`}
            </span>
          </div>
          <div className="aip-panel-header-right">
            <button
              className={`aip-filter-toggle ${showFilters ? "active" : ""}`}
              onClick={() => setShowFilters((p) => !p)}
            >
              <svg className="aip-filter-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="11" y1="18" x2="13" y2="18" />
              </svg>
              {showFilters ? "Hide Filters" : "Filters"}
              {activeFilterCount > 0 && (
                <span className="aip-filter-badge">{activeFilterCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="aip-filters-panel">
            <div className="aip-filter-grid">
              <ValueHelpField
                label="Search Students"
                placeholder="Name, user ID, email, stream, college…"
                value={studentSearch}
                options={searchOptions}
                onChange={setStudentSearch}
                allowFreeText
              />
              <ValueHelpField
                label="Stream"
                placeholder="All Streams"
                value={streamFilter}
                options={streamOptions}
                onChange={setStreamFilter}
              />
              <ValueHelpField
                label="College"
                placeholder="All Colleges"
                value={collegeFilter}
                options={collegeOptions}
                onChange={setCollegeFilter}
              />
              <ValueHelpField
                label="Gender"
                placeholder="All Genders"
                value={genderFilter}
                options={genderOptions}
                onChange={setGenderFilter}
              />
              <ValueHelpField
                label="Status"
                placeholder="Active Only"
                value={statusFilter}
                options={statusOptions}
                onChange={(v) => setStatusFilter(v as AssignableStatusFilter)}
              />
              <ValueHelpField
                label="Assignment Status"
                placeholder="All"
                value={assignedFilter}
                options={assignedOptions}
                onChange={(v) => setAssignedFilter(v as "all" | "assigned" | "unassigned")}
              />
            </div>
            {activeFilterCount > 0 && (
              <button className="aip-clear-filters" onClick={clearFilters}>
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Selection meta bar */}
        <div className="aip-selection-bar">
          <div className="aip-selection-bar-left">
            <label className="aip-select-all-label">
              <input
                type="checkbox"
                className="aip-checkbox"
                checked={allFilteredSelected}
                onChange={toggleAllFiltered}
                disabled={filteredUserIds.length === 0}
              />
              <span>{allFilteredSelected ? "Deselect all shown" : "Select all shown"}</span>
            </label>
          </div>
          <div className="aip-selection-bar-right">
            {changes.added.length > 0 && (
              <span className="aip-change-pill aip-change-pill--add">
                +{changes.added.length} to add
              </span>
            )}
            {changes.removed.length > 0 && (
              <span className="aip-change-pill aip-change-pill--remove">
                −{changes.removed.length} to remove
              </span>
            )}
          </div>
        </div>

        {/* Student list */}
        <div className="aip-student-list">
          {isLoading && (
            <div className="aip-empty-state">
              <div className="aip-spinner" />
              Loading students…
            </div>
          )}
          {!isLoading && filteredStudents.length === 0 && (
            <div className="aip-empty-state">
              No students match your current filters.
            </div>
          )}
          {!isLoading &&
            filteredStudents.map((student) => {
              const isChecked = selectedUserIds.includes(student.userId);
              const isAssigned = assignedUserIds.includes(student.userId);
              const isAdded = isChecked && !isAssigned;
              const isRemoved = !isChecked && isAssigned;

              return (
                <label
                  key={student.id}
                  className={`aip-student-row ${
                    isAssigned ? "aip-student-row--assigned" : ""
                  } ${isAdded ? "aip-student-row--adding" : ""} ${
                    isRemoved ? "aip-student-row--removing" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    className="aip-checkbox"
                    checked={isChecked}
                    onChange={(e) => toggleStudent(student.userId, e.target.checked)}
                  />

                  {/* Avatar */}
                  <div className="aip-student-avatar">
                    {(student.name?.[0] || "?").toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="aip-student-info">
                    <span className="aip-student-name">{student.name}</span>
                    <span className="aip-student-meta">
                      {student.userId}
                      {student.courseStream ? ` · ${student.courseStream}` : ""}
                      {student.collegeName ? ` · ${student.collegeName}` : ""}
                    </span>
                  </div>

                  {/* Right badges */}
                  <div className="aip-student-badges">
                    {!student.isActive && (
                      <span className="aip-badge aip-badge--inactive">Inactive</span>
                    )}
                    {isAssigned && !isRemoved && (
                      <span className="aip-badge aip-badge--assigned">Assigned</span>
                    )}
                    {isAdded && (
                      <span className="aip-badge aip-badge--add">+ Adding</span>
                    )}
                    {isRemoved && (
                      <span className="aip-badge aip-badge--remove">− Removing</span>
                    )}
                  </div>
                </label>
              );
            })}
        </div>

        {/* Save footer */}
        <div className="aip-save-footer">
          {hasChanges && (
            <button className="aip-discard-btn" onClick={handleDiscard} disabled={saving}>
              Discard Changes
            </button>
          )}
          <button
            className="aip-save-btn"
            onClick={handleSave}
            disabled={saving || isLoading}
          >
            {saving
              ? "Saving…"
              : hasChanges
              ? `Save Assignments (${changes.added.length + changes.removed.length} change${
                  changes.added.length + changes.removed.length !== 1 ? "s" : ""
                })`
              : "Save Assignments"}
          </button>
        </div>
      </div>

      {/* ── Toast stack ── */}
      {toasts.length > 0 && (
        <div className="aip-toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`aip-toast aip-toast--${toast.type}`}>
              <span className="aip-toast-icon">
                {toast.type === "success" ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8 12.5 11 15.5 16 9" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                  </svg>
                )}
              </span>
              <span className="aip-toast-message">{toast.message}</span>
              <button
                className="aip-toast-close"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminInterviewPrep;
