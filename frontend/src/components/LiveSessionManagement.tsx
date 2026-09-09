import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "../services/api";
import ValueHelpField, { ValueHelpOption } from "./ValueHelpField";
import { filterAssignableStudents, type AssignableStatusFilter } from "../utils/filterUtils";
import "./CourseManagement.css";
import "./AdminInterviewPrep.css";
import "./LiveSessionManagement.css";

interface LiveSession {
  id: string;
  dayNumber: number;
  title: string;
  sessionUrl: string;
  assignmentCount: number;
}

interface Student {
  id: string;
  name: string;
  userId: string;
  email: string;
  isActive: boolean;
  courseStream?: string;
  collegeName?: string;
  gender?: string;
}

interface LiveSessionHistoryItem {
  id: string;
  sessionId: string;
  dayNumber: number;
  title: string;
  sessionUrl: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  collegeName?: string;
  courseStream?: string;
  joinedAt: string;
}

interface AssignmentHistoryItem {
  id: string;
  sessionId: string;
  dayNumber: number;
  title: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  collegeName?: string;
  courseStream?: string;
  assignedBy: string;
  assignedAt: string;
  action: "assigned" | "removed";
}

interface Props {
  adminName: string;
}

const emptyForm = { dayNumber: 1, title: "", sessionUrl: "" };

const LiveSessionManagement: React.FC<Props> = ({ adminName }) => {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [streamFilter, setStreamFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssignableStatusFilter>("active");
  const [assignedFilter, setAssignedFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [activeTab, setActiveTab] = useState<"assignments" | "history">("assignments");
  const [history, setHistory] = useState<LiveSessionHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historySessionFilter, setHistorySessionFilter] = useState("");
  const [historyStreamFilter, setHistoryStreamFilter] = useState("");
  const [historyCollegeFilter, setHistoryCollegeFilter] = useState("");
  const [historyDateFilter, setHistoryDateFilter] = useState<"all" | "today" | "last7" | "last30">("all");
  const [historyMode, setHistoryMode] = useState<"joins" | "assignments">("joins");
  const [showHistoryFilters, setShowHistoryFilters] = useState(true);
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistoryItem[]>([]);
  const [loadingAssignmentHistory, setLoadingAssignmentHistory] = useState(false);
  const [assignmentActionFilter, setAssignmentActionFilter] = useState<"all" | "assigned" | "removed">("all");

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  const availableStreams = useMemo(
    () => Array.from(new Set(students.map((student) => student.courseStream).filter(Boolean) as string[])).sort(),
    [students]
  );

  const availableColleges = useMemo(
    () => Array.from(new Set(students.map((student) => student.collegeName).filter(Boolean) as string[])).sort(),
    [students]
  );

  const availableGenders = useMemo(
    () => Array.from(new Set(students.map((student) => student.gender).filter(Boolean) as string[])).sort(),
    [students]
  );

  const searchOptions = useMemo<ValueHelpOption[]>(() => {
    const unique = Array.from(new Set(students.flatMap((student) => [
      student.name,
      student.userId,
      student.email,
      student.courseStream,
      student.collegeName,
      student.gender,
    ]).filter(Boolean) as string[]));
    return unique.slice(0, 50).map((value) => ({ value, label: value }));
  }, [students]);

  const streamOptions: ValueHelpOption[] = [{ value: "", label: "All Streams" }, ...availableStreams.map((value) => ({ value, label: value }))];
  const collegeOptions: ValueHelpOption[] = [{ value: "", label: "All Colleges" }, ...availableColleges.map((value) => ({ value, label: value }))];
  const genderOptions: ValueHelpOption[] = [{ value: "", label: "All Genders" }, ...availableGenders.map((value) => ({ value, label: value }))];
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
    const genderMatched = genderFilter ? base.filter((student) => student.gender === genderFilter) : base;
    if (assignedFilter === "assigned") {
      return genderMatched.filter((student) => assignedUserIds.includes(student.userId));
    }
    if (assignedFilter === "unassigned") {
      return genderMatched.filter((student) => !assignedUserIds.includes(student.userId));
    }
    return genderMatched;
  }, [students, studentSearch, streamFilter, collegeFilter, statusFilter, genderFilter, assignedFilter, assignedUserIds]);

  const filteredUserIds = useMemo(() => filteredStudents.map((student) => student.userId), [filteredStudents]);
  const allFilteredSelected = filteredUserIds.length > 0 && filteredUserIds.every((userId) => selectedUserIds.includes(userId));
  const activeFilterCount = [
    Boolean(studentSearch.trim()),
    Boolean(streamFilter),
    Boolean(collegeFilter),
    Boolean(genderFilter),
    statusFilter !== "active",
    assignedFilter !== "all",
  ].filter(Boolean).length;
  const assignmentChanges = useMemo(() => {
    const selected = new Set(selectedUserIds);
    const assigned = new Set(assignedUserIds);
    return {
      added: selectedUserIds.filter((userId) => !assigned.has(userId)),
      removed: assignedUserIds.filter((userId) => !selected.has(userId)),
    };
  }, [assignedUserIds, selectedUserIds]);
  const hasAssignmentChanges = assignmentChanges.added.length > 0 || assignmentChanges.removed.length > 0;
  const historySessionOptions: ValueHelpOption[] = [
    { value: "", label: "All Sessions" },
    ...sessions.map((session) => ({ value: session.id, label: session.title || `Day ${session.dayNumber}` })),
  ];
  const historyStreamOptions: ValueHelpOption[] = [
    { value: "", label: "All Streams" },
    ...Array.from(new Set(history.map((item) => item.courseStream).filter(Boolean) as string[]))
      .sort()
      .map((value) => ({ value, label: value })),
  ];
  const historyCollegeOptions: ValueHelpOption[] = [
    { value: "", label: "All Colleges" },
    ...Array.from(new Set(history.map((item) => item.collegeName).filter(Boolean) as string[]))
      .sort()
      .map((value) => ({ value, label: value })),
  ];
  const historyDateOptions: ValueHelpOption[] = [
    { value: "all", label: "All Dates" },
    { value: "today", label: "Today" },
    { value: "last7", label: "Last 7 Days" },
    { value: "last30", label: "Last 30 Days" },
  ];
  const historySearchOptions = useMemo<ValueHelpOption[]>(() => {
    const activeItems = historyMode === "joins" ? history : assignmentHistory;
    const unique = Array.from(new Set(activeItems.flatMap((item) => [
      item.studentName,
      item.userId,
      item.studentEmail,
      item.title,
      item.courseStream,
      item.collegeName,
      "assignedBy" in item ? item.assignedBy : "",
    ]).filter(Boolean) as string[]));
    return unique.slice(0, 80).map((value) => ({ value, label: value }));
  }, [history, assignmentHistory, historyMode]);
  const assignmentActionOptions: ValueHelpOption[] = [
    { value: "all", label: "All Actions" },
    { value: "assigned", label: "Assigned" },
    { value: "removed", label: "Removed" },
  ];
  const historyActiveFilterCount = [
    Boolean(historySearch.trim()),
    Boolean(historySessionFilter),
    Boolean(historyStreamFilter),
    Boolean(historyCollegeFilter),
    historyDateFilter !== "all",
    historyMode === "assignments" && assignmentActionFilter !== "all",
  ].filter(Boolean).length;
  const filteredHistory = useMemo(() => {
    const keywords = historySearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return history.filter((item) => {
      if (historySessionFilter && item.sessionId !== historySessionFilter) return false;
      if (historyStreamFilter && item.courseStream !== historyStreamFilter) return false;
      if (historyCollegeFilter && item.collegeName !== historyCollegeFilter) return false;
      if (historyDateFilter !== "all") {
        const joinedAt = new Date(item.joinedAt).getTime();
        if (Number.isNaN(joinedAt)) return false;
        if (historyDateFilter === "today" && joinedAt < todayStart) return false;
        if (historyDateFilter === "last7" && joinedAt < now.getTime() - 7 * 24 * 60 * 60 * 1000) return false;
        if (historyDateFilter === "last30" && joinedAt < now.getTime() - 30 * 24 * 60 * 60 * 1000) return false;
      }
      if (keywords.length === 0) return true;
      const haystack = [
        item.title,
        item.userId,
        item.studentName,
        item.studentEmail,
        item.courseStream,
        item.collegeName,
      ].filter(Boolean).join(" ").toLowerCase();
      return keywords.every((keyword) => haystack.includes(keyword));
    });
  }, [history, historySearch, historySessionFilter, historyStreamFilter, historyCollegeFilter, historyDateFilter]);
  const filteredAssignmentHistory = useMemo(() => {
    const keywords = historySearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return assignmentHistory.filter((item) => {
      if (historySessionFilter && item.sessionId !== historySessionFilter) return false;
      if (historyStreamFilter && item.courseStream !== historyStreamFilter) return false;
      if (historyCollegeFilter && item.collegeName !== historyCollegeFilter) return false;
      if (assignmentActionFilter !== "all" && item.action !== assignmentActionFilter) return false;
      if (historyDateFilter !== "all") {
        const assignedAt = new Date(item.assignedAt).getTime();
        if (Number.isNaN(assignedAt)) return false;
        if (historyDateFilter === "today" && assignedAt < todayStart) return false;
        if (historyDateFilter === "last7" && assignedAt < now.getTime() - 7 * 24 * 60 * 60 * 1000) return false;
        if (historyDateFilter === "last30" && assignedAt < now.getTime() - 30 * 24 * 60 * 60 * 1000) return false;
      }
      if (keywords.length === 0) return true;
      const haystack = [
        item.title,
        item.userId,
        item.studentName,
        item.studentEmail,
        item.courseStream,
        item.collegeName,
        item.assignedBy,
        item.action,
      ].filter(Boolean).join(" ").toLowerCase();
      return keywords.every((keyword) => haystack.includes(keyword));
    });
  }, [assignmentHistory, historySearch, historySessionFilter, historyStreamFilter, historyCollegeFilter, historyDateFilter, assignmentActionFilter]);

  const loadSessions = useCallback(async (preferredId?: string) => {
    setLoading(true);
    try {
      const res = await apiGet<{ sessions: LiveSession[] }>("/admin/live-sessions");
      const fetched = res.sessions || [];
      setSessions(fetched);
      setSelectedSessionId((current) =>
        preferredId && fetched.some((session) => session.id === preferredId)
          ? preferredId
          : current && fetched.some((session) => session.id === current)
            ? current
            : fetched[0]?.id || ""
      );
    } catch (error: any) {
      alert(error.message || "Failed to load live sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStudents = async () => {
    try {
      const res = await apiGet<{ users: Student[] }>("/admin/users");
      setStudents(res.users || []);
    } catch (error: any) {
      alert(error.message || "Failed to load students");
    }
  };

  const loadAssignments = async (sessionId: string) => {
    if (!sessionId) {
      setAssignedUserIds([]);
      setSelectedUserIds([]);
      return;
    }
    try {
      const res = await apiGet<{ userIds: string[] }>(`/admin/live-sessions/${sessionId}/assignments`);
      setAssignedUserIds(res.userIds || []);
      setSelectedUserIds(res.userIds || []);
    } catch (error: any) {
      alert(error.message || "Failed to load live session assignments");
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiGet<{ history: LiveSessionHistoryItem[] }>("/admin/live-sessions/history");
      setHistory(res.history || []);
    } catch (error: any) {
      alert(error.message || "Failed to load live session history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadAssignmentHistory = async () => {
    setLoadingAssignmentHistory(true);
    try {
      const res = await apiGet<{ history: AssignmentHistoryItem[] }>("/admin/live-sessions/assignment-history");
      setAssignmentHistory(res.history || []);
    } catch (error: any) {
      alert(error.message || "Failed to load assignment history");
    } finally {
      setLoadingAssignmentHistory(false);
    }
  };

  useEffect(() => {
    loadSessions();
    loadStudents();
  }, [loadSessions]);

  useEffect(() => {
    loadHistory();
    loadAssignmentHistory();
  }, []);

  useEffect(() => {
    loadAssignments(selectedSessionId);
  }, [selectedSessionId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingSessionId(null);
  };

  const handleSaveSession = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      dayNumber: Number(form.dayNumber),
      title: form.title.trim() || `Day ${form.dayNumber}`,
      sessionUrl: form.sessionUrl.trim(),
    };
    try {
      if (editingSessionId) {
        const res = await apiPut<{ session: LiveSession }>(`/admin/live-sessions/${editingSessionId}`, payload);
        await loadSessions(res.session.id);
      } else {
        const res = await apiPost<{ session: LiveSession }>("/admin/live-sessions", payload);
        await loadSessions(res.session.id);
      }
      resetForm();
    } catch (error: any) {
      alert(error.message || "Failed to save live session");
    }
  };

  const handleEdit = (session: LiveSession) => {
    setEditingSessionId(session.id);
    setForm({
      dayNumber: session.dayNumber,
      title: session.title,
      sessionUrl: session.sessionUrl,
    });
  };

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm("Delete this live session?")) return;
    try {
      await apiDelete(`/admin/live-sessions/${sessionId}`);
      resetForm();
      await loadSessions();
    } catch (error: any) {
      alert(error.message || "Failed to delete live session");
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedSessionId) {
      alert("Select a live session first");
      return;
    }
    setSavingAssignments(true);
    try {
      const res = await apiPut<{ userIds: string[]; message: string }>(
        `/admin/live-sessions/${selectedSessionId}/assignments`,
        { userIds: selectedUserIds, assignedBy: adminName }
      );
      setAssignedUserIds(res.userIds || []);
      setSelectedUserIds(res.userIds || []);
      await loadSessions(selectedSessionId);
      await loadHistory();
      await loadAssignmentHistory();
      alert(res.message || "Assignments updated");
    } catch (error: any) {
      alert(error.message || "Failed to save assignments");
    } finally {
      setSavingAssignments(false);
    }
  };

  const toggleAllFiltered = () => {
    setSelectedUserIds((prev) => {
      if (allFilteredSelected) {
        return prev.filter((userId) => !filteredUserIds.includes(userId));
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

  const discardAssignmentChanges = () => {
    setSelectedUserIds([...assignedUserIds]);
  };

  const formatJoinedAt = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="course-management">
      <div className="page-header">
        <div>
          <h2>Live Sessions</h2>
          <p className="cm-subtitle">Create day-wise live session links and assign them to test takers.</p>
        </div>
      </div>

      <div className="live-session-admin-tabs" role="tablist" aria-label="Admin live session views">
        <button type="button" className={activeTab === "assignments" ? "active" : ""} onClick={() => setActiveTab("assignments")}>
          Assignments
        </button>
        <button type="button" className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>
          History
        </button>
      </div>

      {activeTab === "assignments" && (
        <>
      <div className="cm-grid">
        <section className="cm-card cm-card-full">
          <div className="cm-card-header">
            <h3>{editingSessionId ? "Edit Session Link" : "Create Session Link"}</h3>
          </div>
          <form className="cm-form" onSubmit={handleSaveSession}>
            <label>
              Day Number
              <input
                type="number"
                min={1}
                value={form.dayNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, dayNumber: Number(event.target.value) }))}
                required
              />
            </label>
            <label>
              Title
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder={`Day ${form.dayNumber}`}
              />
            </label>
            <label>
              Session Link
              <input
                type="url"
                value={form.sessionUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, sessionUrl: event.target.value }))}
                placeholder="https://meet.google.com/..."
                required
              />
            </label>
            <div className="cm-actions">
              <button type="submit" className="primary-btn">{editingSessionId ? "Update Session" : "Create Session"}</button>
              {editingSessionId && <button type="button" className="secondary-btn" onClick={resetForm}>Cancel</button>}
            </div>
          </form>
        </section>

        <section className="cm-card">
          <div className="cm-card-header">
            <h3>Session Links</h3>
            <span className="cm-muted">{loading ? "Loading..." : `${sessions.length} total`}</span>
          </div>
          <div className="cm-course-list">
            {sessions.length === 0 && <div className="cm-empty">No live sessions yet.</div>}
            {sessions.map((session) => (
              <div key={session.id} className={`cm-course-item ${selectedSessionId === session.id ? "active" : ""}`} onClick={() => setSelectedSessionId(session.id)}>
                <div>
                  <strong>{session.title || `Day ${session.dayNumber}`}</strong>
                  <p>{session.sessionUrl}</p>
                </div>
                <div className="cm-course-meta">
                  <span>{session.assignmentCount} assigned</span>
                  <div className="cm-inline-actions">
                    <button type="button" className="cm-link" onClick={(event) => { event.stopPropagation(); handleEdit(session); }}>Edit</button>
                    <button type="button" className="cm-link danger" onClick={(event) => { event.stopPropagation(); handleDelete(session.id); }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="cm-grid">
        <section className={`aip-panel ${!selectedSession ? "live-session-panel-disabled" : ""}`}>
          <div className="aip-panel-header">
            <div className="aip-panel-header-left">
              <h3 className="aip-panel-title">Assign Students</h3>
              <span className="aip-panel-meta">
                {selectedSession
                  ? `${filteredStudents.length} shown · ${selectedUserIds.length} selected · ${assignedUserIds.length} currently assigned`
                  : "Select a session link first"}
              </span>
            </div>
            <button
              type="button"
              className={`aip-filter-toggle ${showFilters ? "active" : ""}`}
              onClick={() => setShowFilters((prev) => !prev)}
              disabled={!selectedSession}
            >
              <svg className="aip-filter-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="11" y1="18" x2="13" y2="18" />
              </svg>
              {showFilters ? "Hide Filters" : "Filters"}
              {activeFilterCount > 0 && <span className="aip-filter-badge">{activeFilterCount}</span>}
            </button>
          </div>

          {showFilters && selectedSession && (
            <div className="aip-filters-panel">
              <div className="aip-filter-grid">
                <ValueHelpField label="Search Students" placeholder="Name, user ID, email, stream, college" value={studentSearch} options={searchOptions} onChange={setStudentSearch} allowFreeText />
                <ValueHelpField label="Stream" placeholder="All Streams" value={streamFilter} options={streamOptions} onChange={setStreamFilter} />
                <ValueHelpField label="College" placeholder="All Colleges" value={collegeFilter} options={collegeOptions} onChange={setCollegeFilter} />
                <ValueHelpField label="Gender" placeholder="All Genders" value={genderFilter} options={genderOptions} onChange={setGenderFilter} />
                <ValueHelpField label="Status" placeholder="Active Only" value={statusFilter} options={statusOptions} onChange={(value) => setStatusFilter(value as AssignableStatusFilter)} />
                <ValueHelpField label="Assignment Status" placeholder="All" value={assignedFilter} options={assignedOptions} onChange={(value) => setAssignedFilter(value as "all" | "assigned" | "unassigned")} />
              </div>
              {activeFilterCount > 0 && (
                <button type="button" className="aip-clear-filters" onClick={clearFilters}>
                  Clear all filters
                </button>
              )}
            </div>
          )}

          <div className="aip-selection-bar">
            <label className="aip-select-all-label">
              <input
                type="checkbox"
                className="aip-checkbox"
                checked={allFilteredSelected}
                onChange={toggleAllFiltered}
                disabled={!selectedSession || filteredUserIds.length === 0}
              />
              <span>{allFilteredSelected ? "Deselect all shown" : "Select all shown"}</span>
            </label>
            <div className="aip-selection-bar-right">
              {assignmentChanges.added.length > 0 && <span className="aip-change-pill aip-change-pill--add">+{assignmentChanges.added.length} to add</span>}
              {assignmentChanges.removed.length > 0 && <span className="aip-change-pill aip-change-pill--remove">-{assignmentChanges.removed.length} to remove</span>}
            </div>
          </div>

          <div className="aip-student-list">
            {!selectedSession && <div className="aip-empty-state">Select a live session link to assign students.</div>}
            {selectedSession && filteredStudents.length === 0 && <div className="aip-empty-state">No students match your current filters.</div>}
            {selectedSession && filteredStudents.map((student) => {
              const checked = selectedUserIds.includes(student.userId);
              const alreadyAssigned = assignedUserIds.includes(student.userId);
              const isAdded = checked && !alreadyAssigned;
              const isRemoved = !checked && alreadyAssigned;
              return (
                <label key={student.id} className={`aip-student-row ${alreadyAssigned ? "aip-student-row--assigned" : ""} ${isAdded ? "aip-student-row--adding" : ""} ${isRemoved ? "aip-student-row--removing" : ""}`}>
                  <input
                    type="checkbox"
                    className="aip-checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const isChecked = event.target.checked;
                      setSelectedUserIds((prev) =>
                        isChecked ? Array.from(new Set([...prev, student.userId])) : prev.filter((id) => id !== student.userId)
                      );
                    }}
                  />
                  <div className="aip-student-avatar">{(student.name?.[0] || "?").toUpperCase()}</div>
                  <div className="aip-student-info">
                    <span className="aip-student-name">{student.name}</span>
                    <span className="aip-student-meta">
                      {student.userId}
                      {student.courseStream ? ` · ${student.courseStream}` : ""}
                      {student.collegeName ? ` · ${student.collegeName}` : ""}
                    </span>
                  </div>
                  <div className="aip-student-badges">
                    {!student.isActive && <span className="aip-badge aip-badge--inactive">Inactive</span>}
                    {alreadyAssigned && !isRemoved && <span className="aip-badge aip-badge--assigned">Assigned</span>}
                    {isAdded && <span className="aip-badge aip-badge--add">+ Adding</span>}
                    {isRemoved && <span className="aip-badge aip-badge--remove">- Removing</span>}
                  </div>
                </label>
              );
            })}
          </div>

          <div className="aip-save-footer">
            {hasAssignmentChanges && (
              <button type="button" className="aip-discard-btn" onClick={discardAssignmentChanges} disabled={savingAssignments}>
                Discard Changes
              </button>
            )}
            <button className="aip-save-btn" type="button" onClick={handleSaveAssignments} disabled={!selectedSession || savingAssignments}>
              {savingAssignments
                ? "Saving..."
                : hasAssignmentChanges
                  ? `Save Assignments (${assignmentChanges.added.length + assignmentChanges.removed.length} changes)`
                  : "Save Assignments"}
            </button>
          </div>
        </section>
      </div>
        </>
      )}

      {activeTab === "history" && (
        <section className="aip-panel">
          <div className="aip-panel-header">
            <div className="aip-panel-header-left">
              <h3 className="aip-panel-title">{historyMode === "joins" ? "Join History" : "Assignment History"}</h3>
              <span className="aip-panel-meta">
                {historyMode === "joins"
                  ? loadingHistory ? "Loading..." : `${filteredHistory.length} records shown · ${history.length} total joins`
                  : loadingAssignmentHistory ? "Loading..." : `${filteredAssignmentHistory.length} records shown · ${assignmentHistory.length} total assignment actions`}
              </span>
            </div>
            <button
              type="button"
              className={`aip-filter-toggle ${showHistoryFilters ? "active" : ""}`}
              onClick={() => setShowHistoryFilters((prev) => !prev)}
            >
              <svg className="aip-filter-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="11" y1="18" x2="13" y2="18" />
              </svg>
              {showHistoryFilters ? "Hide Filters" : "Filters"}
              {historyActiveFilterCount > 0 && <span className="aip-filter-badge">{historyActiveFilterCount}</span>}
            </button>
          </div>

          <div className="live-session-history-mode-tabs">
            <button type="button" className={historyMode === "joins" ? "active" : ""} onClick={() => setHistoryMode("joins")}>
              Join History
            </button>
            <button type="button" className={historyMode === "assignments" ? "active" : ""} onClick={() => setHistoryMode("assignments")}>
              Assignment History
            </button>
          </div>

          {showHistoryFilters && (
          <div className="aip-filters-panel live-session-history-filter-panel">
            <div className="live-session-history-filters">
              <ValueHelpField
                label="Search History"
                placeholder={historyMode === "joins" ? "Student, user ID, email, stream, college" : "Student, admin, session, stream, college"}
                value={historySearch}
                options={historySearchOptions}
                onChange={setHistorySearch}
                allowFreeText
              />
              <ValueHelpField
                label="Session"
                placeholder="All Sessions"
                value={historySessionFilter}
                options={historySessionOptions}
                onChange={setHistorySessionFilter}
              />
              <ValueHelpField
                label="Stream"
                placeholder="All Streams"
                value={historyStreamFilter}
                options={historyStreamOptions}
                onChange={setHistoryStreamFilter}
              />
              <ValueHelpField
                label="College"
                placeholder="All Colleges"
                value={historyCollegeFilter}
                options={historyCollegeOptions}
                onChange={setHistoryCollegeFilter}
              />
              <ValueHelpField
                label="Date"
                placeholder="All Dates"
                value={historyDateFilter}
                options={historyDateOptions}
                onChange={(value) => setHistoryDateFilter(value as "all" | "today" | "last7" | "last30")}
              />
              {historyMode === "assignments" && (
                <ValueHelpField
                  label="Action"
                  placeholder="All Actions"
                  value={assignmentActionFilter}
                  options={assignmentActionOptions}
                  onChange={(value) => setAssignmentActionFilter(value as "all" | "assigned" | "removed")}
                />
              )}
            </div>
            {historyActiveFilterCount > 0 && (
              <button
                type="button"
                className="aip-clear-filters"
                onClick={() => {
                  setHistorySearch("");
                  setHistorySessionFilter("");
                  setHistoryStreamFilter("");
                  setHistoryCollegeFilter("");
                  setHistoryDateFilter("all");
                  setAssignmentActionFilter("all");
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
          )}

          <div className="live-session-history-list">
            {historyMode === "joins" && loadingHistory && <div className="aip-empty-state">Loading live session history...</div>}
            {historyMode === "joins" && !loadingHistory && (
              <div className="live-session-history-head">
                <span>Student</span>
                <span>Session</span>
                <span>Joined</span>
                <span>Details</span>
              </div>
            )}
            {historyMode === "joins" && !loadingHistory && filteredHistory.length === 0 && (
              <div className="aip-empty-state">No live session history found.</div>
            )}
            {historyMode === "joins" && !loadingHistory && filteredHistory.map((item) => (
              <article key={item.id} className="live-session-history-row">
                <div className="live-session-history-student">
                  <div className="live-session-history-icon" aria-hidden="true">
                    {(item.studentName?.[0] || item.userId?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="live-session-history-main">
                    <h4>{item.studentName || item.userId}</h4>
                    <p>{item.userId}</p>
                  </div>
                </div>
                <div className="live-session-history-main">
                  <h4>{item.title || `Day ${item.dayNumber}`}</h4>
                  <p>Day {item.dayNumber}</p>
                </div>
                <div className="live-session-history-main">
                  <h4>{formatJoinedAt(item.joinedAt)}</h4>
                  <p>{item.studentEmail || "No email"}</p>
                </div>
                <div className="live-session-history-meta">
                  <span>{item.courseStream || "No stream"}</span>
                  <span>{item.collegeName || "No college"}</span>
                </div>
              </article>
            ))}
            {historyMode === "assignments" && loadingAssignmentHistory && <div className="aip-empty-state">Loading assignment history...</div>}
            {historyMode === "assignments" && !loadingAssignmentHistory && (
              <div className="live-session-history-head live-session-assignment-history-head">
                <span>Assigned To</span>
                <span>Session</span>
                <span>Assigned By</span>
                <span>Time</span>
                <span>Action</span>
              </div>
            )}
            {historyMode === "assignments" && !loadingAssignmentHistory && filteredAssignmentHistory.length === 0 && (
              <div className="aip-empty-state">No assignment history found.</div>
            )}
            {historyMode === "assignments" && !loadingAssignmentHistory && filteredAssignmentHistory.map((item) => (
              <article key={item.id} className="live-session-history-row live-session-assignment-history-row">
                <div className="live-session-history-student">
                  <div className="live-session-history-icon" aria-hidden="true">
                    {(item.studentName?.[0] || item.userId?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="live-session-history-main">
                    <h4>{item.studentName || item.userId}</h4>
                    <p>{item.userId}</p>
                  </div>
                </div>
                <div className="live-session-history-main">
                  <h4>{item.title || `Day ${item.dayNumber}`}</h4>
                  <p>Day {item.dayNumber}</p>
                </div>
                <div className="live-session-history-main">
                  <h4>{item.assignedBy || "admin"}</h4>
                  <p>{item.studentEmail || "No email"}</p>
                </div>
                <div className="live-session-history-main">
                  <h4>{formatJoinedAt(item.assignedAt)}</h4>
                  <p>{item.courseStream || "No stream"} · {item.collegeName || "No college"}</p>
                </div>
                <div className="live-session-history-meta">
                  <span className={item.action === "assigned" ? "live-session-action-assigned" : "live-session-action-removed"}>
                    {item.action === "assigned" ? "Assigned" : "Removed"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default LiveSessionManagement;
