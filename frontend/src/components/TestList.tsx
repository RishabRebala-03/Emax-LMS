import React, { useEffect, useMemo, useState } from "react";
import "./TestList.css";
import { apiDelete, apiGet, apiPost } from "../services/api";
import ValueHelpField, { ValueHelpOption } from "./ValueHelpField";
import {
  filterAdminTests,
  filterAssignableStudents,
  type RelativeDateFilter,
  type TestDurationBand,
  type TestQuestionBand,
  type TestCutoffBand,
  type SectionCountBand,
  type AssignmentLoadBand,
} from "../utils/filterUtils";

interface Section {
  id: string;
  name: string;
}

interface Test {
  id: string;
  name: string;
  duration: number;
  questions: number;
  sections: Section[];
  createdAt: string;
  updatedAt?: string;
  status: "active" | "draft" | "completed";
  passingPercentage: number;
  assignmentCount?: number;
  assignedColleges?: string[];
}

interface User {
  id: string;
  name: string;
  userId: string;
  email?: string;
  isActive?: boolean;
  collegeName?: string;
  courseStream?: string;
  gender?: string;
}

interface TestListProps {
  onCreateNew: () => void;
  onEditTest?: (testId: string) => void;
}

type TestSortBy =
  "newest" | "oldest" | "updated" | "name" | "duration-high" | "duration-low" |
  "questions-high" | "questions-low" | "cutoff-high" | "cutoff-low" |
  "assignments-high" | "assignments-low";

const TestList: React.FC<TestListProps> = ({ onCreateNew, onEditTest }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assigningTest, setAssigningTest] = useState<Test | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [streamFilter, setStreamFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [testSearch, setTestSearch] = useState("");
  const [testStatusFilter, setTestStatusFilter] = useState<"" | "active" | "draft" | "completed">("");
  const [testDurationFilter, setTestDurationFilter] = useState<TestDurationBand>("all");
  const [testSectionFilter, setTestSectionFilter] = useState("all");
  const [testQuestionFilter, setTestQuestionFilter] = useState<TestQuestionBand>("all");
  const [testCutoffBand, setTestCutoffBand] = useState<TestCutoffBand>("all");
  const [testSectionCountFilter, setTestSectionCountFilter] = useState<SectionCountBand>("all");
  const [testAssignmentFilter, setTestAssignmentFilter] = useState<AssignmentLoadBand>("all");
  const [testCollegeFilter, setTestCollegeFilter] = useState("all");
  const [createdRangeFilter, setCreatedRangeFilter] = useState<RelativeDateFilter>("all");
  const [updatedRangeFilter, setUpdatedRangeFilter] = useState<RelativeDateFilter>("all");
  const [minCutoff, setMinCutoff] = useState("");
  const [maxCutoff, setMaxCutoff] = useState("");
  const [minDuration, setMinDuration] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [minQuestions, setMinQuestions] = useState("");
  const [maxQuestions, setMaxQuestions] = useState("");
  const [minAssignments, setMinAssignments] = useState("");
  const [maxAssignments, setMaxAssignments] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [testSortBy, setTestSortBy] = useState<TestSortBy>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const loadTests = async () => {
    setLoading(true);
    try {
      const res = await apiGet<any>("/admin/exams");
      setTests(Array.isArray(res.tests) ? res.tests : []);
    } catch (e) {
      console.error(e);
      alert("Failed to load tests from backend");
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await apiGet<any>("/admin/users");
      if (Array.isArray(res.users)) setAllUsers(res.users);
    } catch (e) {
      console.error("Failed to load users", e);
    }
  };

  useEffect(() => {
    loadTests();
    loadUsers();
  }, []);

  const availableStreams = useMemo(
    () => Array.from(new Set(allUsers.map((user) => user.courseStream).filter(Boolean) as string[])).sort(),
    [allUsers]
  );

  const availableColleges = useMemo(
    () => Array.from(new Set(allUsers.map((user) => user.collegeName).filter(Boolean) as string[])).sort(),
    [allUsers]
  );

  const assignedCollegeOptions: ValueHelpOption[] = useMemo(() => [
    { value: "all", label: "All Target Colleges" },
    ...Array.from(new Set(tests.flatMap((test) => test.assignedColleges || []).filter(Boolean) as string[]))
      .sort()
      .map((value) => ({ value, label: value })),
  ], [tests]);

  const testSearchOptions = useMemo<ValueHelpOption[]>(() => {
    const unique = Array.from(new Set(tests.flatMap((test) => [
      test.name,
      `${test.duration} min`,
      `${test.questions} questions`,
      `${test.passingPercentage}% cutoff`,
      `${test.assignmentCount || 0} assigned`,
      test.status,
      ...(test.assignedColleges || []),
      ...(test.sections || []).map((section) => typeof section === "string" ? section : section.name),
    ])));
    return unique.filter(Boolean).slice(0, 60).map((value) => ({ value: value as string, label: value as string }));
  }, [tests]);

  const studentSearchOptions = useMemo<ValueHelpOption[]>(() => {
    const unique = Array.from(new Set(allUsers.flatMap((user) => [
      user.name, user.userId, user.email, user.courseStream, user.collegeName, user.gender,
    ]).filter(Boolean) as string[]));
    return unique.slice(0, 40).map((value) => ({ value, label: value }));
  }, [allUsers]);

  const testStatusOptions: ValueHelpOption[] = [
    { value: "", label: "All Test Status" },
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "completed", label: "Completed" },
  ];
  const durationOptions: ValueHelpOption[] = [
    { value: "all", label: "All Durations" },
    { value: "short", label: "Short", keywords: ["30 min or less"] },
    { value: "medium", label: "Medium", keywords: ["31 to 60 min"] },
    { value: "long", label: "Long", keywords: ["over 60 min"] },
  ];
  const sectionOptions: ValueHelpOption[] = [
    { value: "all", label: "All Sections" },
    ...Array.from(new Set(tests.flatMap((test) => (test.sections || []).map((section) => typeof section === "string" ? section : section.name))))
      .filter(Boolean)
      .sort()
      .map((value) => ({ value: value as string, label: value as string })),
  ];
  const questionOptions: ValueHelpOption[] = [
    { value: "all", label: "All Question Counts" },
    { value: "short", label: "Up to 25 Questions" },
    { value: "medium", label: "26 to 50 Questions" },
    { value: "large", label: "More than 50 Questions" },
  ];
  const cutoffOptions: ValueHelpOption[] = [
    { value: "all", label: "All Cutoffs" },
    { value: "easy", label: "Up to 50%" },
    { value: "standard", label: "51% to 70%" },
    { value: "strict", label: "Above 70%" },
  ];
  const sectionCountOptions: ValueHelpOption[] = [
    { value: "all", label: "All Section Counts" },
    { value: "single", label: "Single Section" },
    { value: "few", label: "2 to 3 Sections" },
    { value: "many", label: "4+ Sections" },
  ];
  const assignmentOptions: ValueHelpOption[] = [
    { value: "all", label: "All Assignment Loads" },
    { value: "unassigned", label: "Unassigned" },
    { value: "light", label: "1 to 25 Students" },
    { value: "heavy", label: "26+ Students" },
  ];
  const createdRangeOptions: ValueHelpOption[] = [
    { value: "all", label: "Any Created Date" },
    { value: "today", label: "Created Today" },
    { value: "last7", label: "Created Last 7 Days" },
    { value: "last30", label: "Created Last 30 Days" },
    { value: "older", label: "Created Earlier" },
  ];
  const updatedRangeOptions: ValueHelpOption[] = [
    { value: "all", label: "Any Updated Date" },
    { value: "today", label: "Updated Today" },
    { value: "last7", label: "Updated Last 7 Days" },
    { value: "last30", label: "Updated Last 30 Days" },
    { value: "older", label: "Updated Earlier" },
  ];
  const sortOptions: ValueHelpOption[] = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "updated", label: "Recently Updated" },
    { value: "name", label: "Name (A-Z)" },
    { value: "duration-high", label: "Longest Duration" },
    { value: "duration-low", label: "Shortest Duration" },
    { value: "questions-high", label: "Most Questions" },
    { value: "questions-low", label: "Fewest Questions" },
    { value: "cutoff-high", label: "Highest Cutoff" },
    { value: "cutoff-low", label: "Lowest Cutoff" },
    { value: "assignments-high", label: "Most Assigned" },
    { value: "assignments-low", label: "Least Assigned" },
  ];

  const streamOptions: ValueHelpOption[] = [{ value: "", label: "All Streams" }, ...availableStreams.map((value) => ({ value, label: value }))];
  const collegeOptions: ValueHelpOption[] = [{ value: "", label: "All Colleges" }, ...availableColleges.map((value) => ({ value, label: value }))];
  const studentStatusOptions: ValueHelpOption[] = [
    { value: "active", label: "Active Only" },
    { value: "inactive", label: "Inactive Only" },
    { value: "all", label: "All Students" },
  ];

  const filteredTests = useMemo(() => {
    return filterAdminTests(tests, {
      search: testSearch,
      status: testStatusFilter,
      durationBand: testDurationFilter,
      section: testSectionFilter,
      questionBand: testQuestionFilter,
      cutoffBand: testCutoffBand,
      sectionCountBand: testSectionCountFilter,
      assignmentLoad: testAssignmentFilter,
      college: testCollegeFilter,
      createdRange: createdRangeFilter,
      updatedRange: updatedRangeFilter,
      minCutoff,
      maxCutoff,
      minDuration,
      maxDuration,
      minQuestions,
      maxQuestions,
      minAssignments,
      maxAssignments,
      createdFrom,
      createdTo,
      sortBy: testSortBy,
    });
  }, [
    tests, testSearch, testStatusFilter, testDurationFilter, testSectionFilter, testQuestionFilter,
    testCutoffBand, testSectionCountFilter, testAssignmentFilter, testCollegeFilter,
    createdRangeFilter, updatedRangeFilter, minCutoff, maxCutoff, minDuration, maxDuration,
    minQuestions, maxQuestions, minAssignments, maxAssignments, createdFrom, createdTo, testSortBy,
  ]);

  const filteredUsers = useMemo(() => {
    return filterAssignableStudents(allUsers, {
      search: studentSearch,
      stream: streamFilter,
      college: collegeFilter,
      status: statusFilter,
    });
  }, [allUsers, studentSearch, streamFilter, collegeFilter, statusFilter]);

  const filteredUserIds = useMemo(() => filteredUsers.map((user) => user.userId), [filteredUsers]);
  const allSelected = filteredUserIds.length > 0 && filteredUserIds.every((userId) => selectedUserIds.includes(userId));
  const someSelected = filteredUserIds.some((userId) => selectedUserIds.includes(userId)) && !allSelected;

  const handleSelectAll = () => {
    setSelectedUserIds((prev) => {
      if (allSelected) return prev.filter((userId) => !filteredUserIds.includes(userId));
      return Array.from(new Set([...prev, ...filteredUserIds]));
    });
  };

  const deleteTest = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this test?")) return;
    try {
      await apiDelete(`/admin/exams/${id}`);
      setTests((prev) => prev.filter((t) => t.id !== id));
      if (selectedTest?.id === id) setSelectedTest(null);
    } catch (e) {
      console.error(e);
      alert("Failed to delete test");
    }
  };

  const handleEdit = (testId: string) => {
    if (onEditTest) onEditTest(testId);
    else alert("Edit functionality will be implemented soon");
  };

  const getStatusColor = (status: string) => {
    if (status === "active") return "status-active";
    if (status === "draft") return "status-draft";
    if (status === "completed") return "status-completed";
    return "";
  };

  const activeFilterCount = [
    Boolean(testSearch.trim()),
    Boolean(testStatusFilter),
    testDurationFilter !== "all",
    testSectionFilter !== "all",
    testQuestionFilter !== "all",
    testCutoffBand !== "all",
    testSectionCountFilter !== "all",
    testAssignmentFilter !== "all",
    testCollegeFilter !== "all",
    createdRangeFilter !== "all",
    updatedRangeFilter !== "all",
    Boolean(minCutoff),
    Boolean(maxCutoff),
    Boolean(minDuration),
    Boolean(maxDuration),
    Boolean(minQuestions),
    Boolean(maxQuestions),
    Boolean(minAssignments),
    Boolean(maxAssignments),
    Boolean(createdFrom),
    Boolean(createdTo),
    testSortBy !== "newest",
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setTestSearch("");
    setTestStatusFilter("");
    setTestDurationFilter("all");
    setTestSectionFilter("all");
    setTestQuestionFilter("all");
    setTestCutoffBand("all");
    setTestSectionCountFilter("all");
    setTestAssignmentFilter("all");
    setTestCollegeFilter("all");
    setCreatedRangeFilter("all");
    setUpdatedRangeFilter("all");
    setMinCutoff("");
    setMaxCutoff("");
    setMinDuration("");
    setMaxDuration("");
    setMinQuestions("");
    setMaxQuestions("");
    setMinAssignments("");
    setMaxAssignments("");
    setCreatedFrom("");
    setCreatedTo("");
    setTestSortBy("newest");
  };

  return (
    <div className="test-list" style={{ paddingTop: "2rem" }}>
      <div className="page-header">
        <h2>All Tests</h2>
        <div className="test-list-toolbar">
          <button className="filter-toggle-btn" onClick={() => setShowFilters((prev) => !prev)}>
            <span className="filter-toggle-icon" aria-hidden="true">{showFilters ? "−" : "+"}</span>
            <span className="filter-toggle-label">{showFilters ? "Hide Filters" : "Show Filters"}</span>
            {activeFilterCount > 0 && <span className="filter-toggle-count">{activeFilterCount}</span>}
          </button>
          <button className="primary-btn" onClick={loadTests}>Refresh</button>
          <button className="primary-btn" onClick={onCreateNew}>+ Create New Test</button>
        </div>
      </div>

      {loading && <p style={{ color: "#6a6d70" }}>Loading tests...</p>}

      {showFilters && (
        <section className="filters-panel">
          <div className="filters-panel-header">
            <div>
              <h3>Filter Tests</h3>
              <p>Refine the list only when you need it.</p>
            </div>
            {activeFilterCount > 0 && (
              <button className="clear-filters-btn" onClick={resetAllFilters}>
                ✕ Clear All Filters ({activeFilterCount})
              </button>
            )}
          </div>

          <div className="test-list-filters">
            <ValueHelpField label="Search Tests" placeholder="Search by name, duration, questions, section..." value={testSearch} options={testSearchOptions} onChange={setTestSearch} allowFreeText />
            <ValueHelpField label="Status" placeholder="All Test Status" value={testStatusFilter} options={testStatusOptions} onChange={(value) => setTestStatusFilter(value as "" | "active" | "draft" | "completed")} />
            <ValueHelpField label="Duration" placeholder="All Durations" value={testDurationFilter} options={durationOptions} onChange={(value) => setTestDurationFilter(value as "all" | "short" | "medium" | "long")} />
            <ValueHelpField label="Questions" placeholder="All Question Counts" value={testQuestionFilter} options={questionOptions} onChange={(value) => setTestQuestionFilter(value as "all" | "short" | "medium" | "large")} />
            <ValueHelpField label="Cutoff Band" placeholder="All Cutoffs" value={testCutoffBand} options={cutoffOptions} onChange={(value) => setTestCutoffBand(value as "all" | "easy" | "standard" | "strict")} />
            <ValueHelpField label="Section" placeholder="All Sections" value={testSectionFilter} options={sectionOptions} onChange={setTestSectionFilter} />
            <ValueHelpField label="Section Count" placeholder="All Section Counts" value={testSectionCountFilter} options={sectionCountOptions} onChange={(value) => setTestSectionCountFilter(value as "all" | "single" | "few" | "many")} />
            <ValueHelpField label="Assigned Students" placeholder="All Assignment Loads" value={testAssignmentFilter} options={assignmentOptions} onChange={(value) => setTestAssignmentFilter(value as "all" | "unassigned" | "light" | "heavy")} />
            <ValueHelpField label="Target College" placeholder="All Target Colleges" value={testCollegeFilter} options={assignedCollegeOptions} onChange={setTestCollegeFilter} />
            <ValueHelpField label="Created" placeholder="Any Created Date" value={createdRangeFilter} options={createdRangeOptions} onChange={(value) => setCreatedRangeFilter(value as RelativeDateFilter)} />
            <ValueHelpField label="Updated" placeholder="Any Updated Date" value={updatedRangeFilter} options={updatedRangeOptions} onChange={(value) => setUpdatedRangeFilter(value as RelativeDateFilter)} />
            <ValueHelpField label="Sort By" placeholder="Newest First" value={testSortBy} options={sortOptions} onChange={(value) => setTestSortBy(value as TestSortBy)} />
          </div>

          <div className="test-range-filters">
            <label className="range-input">
              <span>Cutoff % Min</span>
              <input type="number" min="0" max="100" value={minCutoff} onChange={(e) => setMinCutoff(e.target.value)} placeholder="0" />
            </label>
            <label className="range-input">
              <span>Cutoff % Max</span>
              <input type="number" min="0" max="100" value={maxCutoff} onChange={(e) => setMaxCutoff(e.target.value)} placeholder="100" />
            </label>
            <label className="range-input">
              <span>Duration Min</span>
              <input type="number" min="0" value={minDuration} onChange={(e) => setMinDuration(e.target.value)} placeholder="Minutes" />
            </label>
            <label className="range-input">
              <span>Duration Max</span>
              <input type="number" min="0" value={maxDuration} onChange={(e) => setMaxDuration(e.target.value)} placeholder="Minutes" />
            </label>
            <label className="range-input">
              <span>Questions Min</span>
              <input type="number" min="0" value={minQuestions} onChange={(e) => setMinQuestions(e.target.value)} placeholder="0" />
            </label>
            <label className="range-input">
              <span>Questions Max</span>
              <input type="number" min="0" value={maxQuestions} onChange={(e) => setMaxQuestions(e.target.value)} placeholder="Any" />
            </label>
            <label className="range-input">
              <span>Assigned Min</span>
              <input type="number" min="0" value={minAssignments} onChange={(e) => setMinAssignments(e.target.value)} placeholder="0" />
            </label>
            <label className="range-input">
              <span>Assigned Max</span>
              <input type="number" min="0" value={maxAssignments} onChange={(e) => setMaxAssignments(e.target.value)} placeholder="Any" />
            </label>
            <label className="range-input">
              <span>Created From</span>
              <input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
            </label>
            <label className="range-input">
              <span>Created To</span>
              <input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
            </label>
          </div>

          <div className="filters-panel-footer">
            <span className="filters-count-info">{filteredTests.length} of {tests.length} tests shown</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {activeFilterCount > 0 && (
                <span className="filters-active-badge">{activeFilterCount} active filters</span>
              )}
              <button
                className="clear-filters-btn-secondary"
                onClick={resetAllFilters}
                disabled={activeFilterCount === 0}
              >
                Reset All Filters
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="tests-grid">
        {filteredTests.map((test) => (
          <div key={test.id} className="test-card">
            <div className="test-card-header">
              <h3>{test.name}</h3>
              <span className={`status-badge ${getStatusColor(test.status)}`}>{test.status}</span>
            </div>
            <div className="test-card-body">
              <div className="test-info"><span className="info-label">Duration:</span><span className="info-value">{test.duration} min</span></div>
              <div className="test-info"><span className="info-label">Questions:</span><span className="info-value">{test.questions}</span></div>
              <div className="test-info"><span className="info-label">Cutoff:</span><span className="info-value">{test.passingPercentage}%</span></div>
              <div className="test-info"><span className="info-label">Assigned:</span><span className="info-value">{test.assignmentCount || 0}</span></div>
              <div className="test-info"><span className="info-label">Sections:</span><span className="info-value">{Array.isArray(test.sections) ? test.sections.map((s) => typeof s === "string" ? s : s.name).join(", ") : "N/A"}</span></div>
              <div className="test-info"><span className="info-label">Created:</span><span className="info-value">{new Date(test.createdAt).toLocaleDateString()}</span></div>
              <div className="test-info"><span className="info-label">Updated:</span><span className="info-value">{new Date(test.updatedAt || test.createdAt).toLocaleDateString()}</span></div>
              <div className="test-info test-info-stack"><span className="info-label">Target Colleges:</span><span className="info-value">{(test.assignedColleges || []).length > 0 ? test.assignedColleges!.join(", ") : "None yet"}</span></div>
            </div>
            <div className="test-card-actions">
              <button className="action-btn view-btn" onClick={() => setSelectedTest(test)}>View Details</button>
              <button className="action-btn edit-btn" onClick={() => handleEdit(test.id)}>Edit</button>
              <button className="action-btn edit-btn" onClick={() => { setAssigningTest(test); setSelectedUserIds([]); setStudentSearch(""); setStreamFilter(""); setCollegeFilter(""); setStatusFilter("active"); }}>Assign</button>
              <button className="action-btn delete-btn" onClick={() => deleteTest(test.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {!loading && filteredTests.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">No Results</div>
          <h3>{tests.length === 0 ? "No tests created yet" : "No tests match the current search"}</h3>
          <p>{tests.length === 0 ? "Create your first test to get started" : "Try another value-help suggestion or clear a few filters."}</p>
          <button className="primary-btn" onClick={onCreateNew}>Create Test</button>
        </div>
      )}

      {selectedTest && (
        <div className="modal-overlay" onClick={() => setSelectedTest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTest.name}</h2>
              <button className="close-btn" onClick={() => setSelectedTest(null)}>x</button>
            </div>
            <div className="modal-body">
              <div className="detail-row"><span className="detail-label">Duration:</span><span>{selectedTest.duration} minutes</span></div>
              <div className="detail-row"><span className="detail-label">Total Questions:</span><span>{selectedTest.questions}</span></div>
              <div className="detail-row"><span className="detail-label">Passing Cutoff:</span><span>{selectedTest.passingPercentage}%</span></div>
              <div className="detail-row"><span className="detail-label">Assigned Students:</span><span>{selectedTest.assignmentCount || 0}</span></div>
              <div className="detail-row">
                <span className="detail-label">Sections:</span>
                <div className="section-tags">
                  {selectedTest.sections.map((section) => (
                    <span key={typeof section === "string" ? section : section.id} className="section-tag">{typeof section === "string" ? section : section.name}</span>
                  ))}
                </div>
              </div>
              <div className="detail-row"><span className="detail-label">Status:</span><span className={`status-badge ${getStatusColor(selectedTest.status)}`}>{selectedTest.status}</span></div>
              <div className="detail-row"><span className="detail-label">Created:</span><span>{new Date(selectedTest.createdAt).toLocaleString()}</span></div>
              <div className="detail-row"><span className="detail-label">Updated:</span><span>{new Date(selectedTest.updatedAt || selectedTest.createdAt).toLocaleString()}</span></div>
              <div className="detail-row"><span className="detail-label">Target Colleges:</span><span>{(selectedTest.assignedColleges || []).length > 0 ? selectedTest.assignedColleges!.join(", ") : "None yet"}</span></div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setSelectedTest(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {assigningTest && (
        <div className="modal-overlay" onClick={() => setAssigningTest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Test: {assigningTest.name}</h2>
              <button className="close-btn" onClick={() => setAssigningTest(null)}>x</button>
            </div>
            <div className="modal-body">
              {allUsers.length === 0 && <p style={{ color: "#6a6d70" }}>No users available</p>}
              {allUsers.length > 0 && (
                <div className="assign-filter-wrap">
                  <div className="assign-filter-grid">
                    <ValueHelpField label="Search Students" placeholder="Search by name, user ID, email, stream, college" value={studentSearch} options={studentSearchOptions} onChange={setStudentSearch} allowFreeText />
                    <ValueHelpField label="Stream" placeholder="All Streams" value={streamFilter} options={streamOptions} onChange={setStreamFilter} />
                    <ValueHelpField label="College" placeholder="All Colleges" value={collegeFilter} options={collegeOptions} onChange={setCollegeFilter} />
                    <ValueHelpField label="Status" placeholder="Active Only" value={statusFilter} options={studentStatusOptions} onChange={(value) => setStatusFilter(value as "active" | "inactive" | "all")} />
                  </div>
                  <div className="assign-selection-meta">
                    <span>{filteredUsers.length} students shown</span>
                  </div>
                  <label className="assign-select-all">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => { if (input) input.indeterminate = someSelected; }}
                      onChange={handleSelectAll}
                    />
                    <span className="assign-select-all-text">
                      {allSelected ? "Deselect All" : "Select All"}
                      {selectedUserIds.length > 0 && ` (${selectedUserIds.length} selected)`}
                    </span>
                  </label>
                </div>
              )}

              <div className="assign-user-list">
                {filteredUsers.map((user) => (
                  <label key={user.userId} className="assign-user-row">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.userId)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedUserIds((prev) => [...prev, user.userId]);
                        else setSelectedUserIds((prev) => prev.filter((id) => id !== user.userId));
                      }}
                    />
                    <div className="assign-user-copy">
                      <span>{user.name} ({user.userId})</span>
                      <small>{user.courseStream || "No stream"} | {user.collegeName || "No college"}</small>
                    </div>
                  </label>
                ))}
                {filteredUsers.length === 0 && <p className="assign-empty-state">No students match the current filters.</p>}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="primary-btn"
                disabled={selectedUserIds.length === 0}
                onClick={async () => {
                  try {
                    await apiPost(`/admin/exams/${assigningTest.id}/assign`, { userIds: selectedUserIds });
                    alert("Test assigned successfully");
                    setAssigningTest(null);
                    loadTests();
                  } catch (err) {
                    console.error(err);
                    alert("Failed to assign test");
                  }
                }}
              >
                Assign Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestList;
