import React, { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "../services/api";
import "./CourseManagement.css";

interface Course {
  id: string;
  name: string;
  description: string;
  assignmentCount: number;
  status: string;
}

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

interface Material {
  id: string;
  courseId: string;
  dayNumber: number;
  title: string;
  content: string;
}

const emptyCourseForm = { name: "", description: "" };
const emptyMaterialForm = { dayNumber: 1, title: "", content: "" };

async function submitMaterial(url: string, method: "POST" | "PUT", body: unknown) {
  const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || ""}${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = "Failed to save material";
    try {
      const payload = await res.json();
      message = payload.error || payload.message || message;
    } catch {
      const text = await res.text().catch(() => "");
      message = text || message;
    }
    throw new Error(message);
  }
}

const CourseManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [materialForm, setMaterialForm] = useState(emptyMaterialForm);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [streamFilter, setStreamFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  const availableStreams = useMemo(
    () => Array.from(new Set(students.map((student) => student.courseStream).filter(Boolean) as string[])).sort(),
    [students]
  );

  const availableColleges = useMemo(
    () => Array.from(new Set(students.map((student) => student.collegeName).filter(Boolean) as string[])).sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    return students.filter((student) => {
      const matchesStatus =
        statusFilter === "all" ? true : statusFilter === "active" ? student.isActive : !student.isActive;
      const matchesStream = streamFilter ? student.courseStream === streamFilter : true;
      const matchesCollege = collegeFilter ? student.collegeName === collegeFilter : true;
      const haystack = [student.name, student.userId, student.email, student.courseStream, student.collegeName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = term ? haystack.includes(term) : true;
      return matchesStatus && matchesStream && matchesCollege && matchesSearch;
    });
  }, [students, studentSearch, streamFilter, collegeFilter, statusFilter]);

  const filteredStudentIds = useMemo(
    () => filteredStudents.map((student) => student.userId),
    [filteredStudents]
  );

  const areAllFilteredStudentsSelected = useMemo(
    () =>
      filteredStudentIds.length > 0 &&
      filteredStudentIds.every((userId) => selectedUserIds.includes(userId)),
    [filteredStudentIds, selectedUserIds]
  );

  const loadCourses = async (preferredCourseId?: string) => {
    setLoading(true);
    try {
      const res = await apiGet<{ courses: Course[] }>("/admin/courses");
      const fetchedCourses = res.courses || [];
      setCourses(fetchedCourses);

      const nextSelectedId =
        preferredCourseId && fetchedCourses.some((course) => course.id === preferredCourseId)
          ? preferredCourseId
          : selectedCourseId && fetchedCourses.some((course) => course.id === selectedCourseId)
            ? selectedCourseId
            : fetchedCourses[0]?.id || "";
      setSelectedCourseId(nextSelectedId);
    } catch (error: any) {
      alert(error.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await apiGet<{ users: Student[] }>("/admin/users");
      setStudents(res.users || []);
    } catch (error: any) {
      alert(error.message || "Failed to load students");
    }
  };

  const loadMaterials = async (courseId: string) => {
    if (!courseId) {
      setMaterials([]);
      return;
    }
    setMaterialsLoading(true);
    try {
      const res = await apiGet<{ materials: Material[] }>(`/admin/courses/${courseId}/materials`);
      setMaterials(res.materials || []);
    } catch (error: any) {
      alert(error.message || "Failed to load course materials");
      setMaterials([]);
    } finally {
      setMaterialsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadMaterials(selectedCourseId);
    } else {
      setMaterials([]);
    }
  }, [selectedCourseId]);

  const resetCourseForm = () => {
    setCourseForm(emptyCourseForm);
    setEditingCourseId(null);
  };

  const resetMaterialForm = () => {
    setMaterialForm(emptyMaterialForm);
    setEditingMaterialId(null);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCourseId) {
        const res = await apiPut<{ course: Course }>(`/admin/courses/${editingCourseId}`, courseForm);
        await loadCourses(res.course.id);
      } else {
        const res = await apiPost<{ course: Course }>("/admin/courses", courseForm);
        await loadCourses(res.course.id);
      }
      resetCourseForm();
    } catch (error: any) {
      alert(error.message || "Failed to save course");
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setCourseForm({ name: course.name, description: course.description || "" });
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm("Delete this course and all assigned materials?")) {
      return;
    }
    try {
      await apiDelete(`/admin/courses/${courseId}`);
      if (selectedCourseId === courseId) {
        setSelectedCourseId("");
      }
      await loadCourses();
      resetCourseForm();
      resetMaterialForm();
    } catch (error: any) {
      alert(error.message || "Failed to delete course");
    }
  };

  const handleAssignCourse = async () => {
    if (!selectedCourseId) {
      alert("Select a course first");
      return;
    }
    if (selectedUserIds.length === 0) {
      alert("Select at least one student");
      return;
    }
    try {
      await apiPost(`/admin/courses/${selectedCourseId}/assign`, { userIds: selectedUserIds });
      await loadCourses(selectedCourseId);
      setSelectedUserIds([]);
      alert("Course assigned successfully");
    } catch (error: any) {
      alert(error.message || "Failed to assign course");
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      alert("Select a course before adding material");
      return;
    }
    try {
      if (editingMaterialId) {
        await submitMaterial(`/admin/courses/materials/${editingMaterialId}`, "PUT", materialForm);
      } else {
        await submitMaterial(`/admin/courses/${selectedCourseId}/materials`, "POST", materialForm);
      }
      await loadMaterials(selectedCourseId);
      await loadCourses(selectedCourseId);
      resetMaterialForm();
    } catch (error: any) {
      alert(error.message || "Failed to save material");
    }
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterialId(material.id);
    setMaterialForm({
      dayNumber: material.dayNumber,
      title: material.title,
      content: material.content || "",
    });
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!window.confirm("Delete this course material?")) {
      return;
    }
    try {
      await apiDelete(`/admin/courses/materials/${materialId}`);
      await loadMaterials(selectedCourseId);
    } catch (error: any) {
      alert(error.message || "Failed to delete material");
    }
  };

  return (
    <div className="course-management">
      <div className="page-header">
        <div>
          <h2>Course Management</h2>
          <p className="cm-subtitle">Create courses, assign them to students, and publish day-wise material.</p>
        </div>
      </div>

      <div className="cm-grid">
        <section className="cm-card cm-card-full">
          <div className="cm-card-header">
            <h3>{editingCourseId ? "Edit Course" : "Create Course"}</h3>
          </div>
          <form className="cm-form" onSubmit={handleSaveCourse}>
            <label>
              Course Name
              <input
                type="text"
                value={courseForm.name}
                onChange={(e) => setCourseForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={courseForm.description}
                onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </label>
            <div className="cm-actions">
              <button type="submit" className="primary-btn">
                {editingCourseId ? "Update Course" : "Create Course"}
              </button>
              {editingCourseId && (
                <button type="button" className="secondary-btn" onClick={resetCourseForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="cm-card">
          <div className="cm-card-header">
            <h3>Courses</h3>
            <span className="cm-muted">{loading ? "Loading..." : `${courses.length} total`}</span>
          </div>
          <div className="cm-course-list">
            {courses.length === 0 && <div className="cm-empty">No courses yet.</div>}
            {courses.map((course) => (
              <div
                key={course.id}
                className={`cm-course-item ${selectedCourseId === course.id ? "active" : ""}`}
                onClick={() => setSelectedCourseId(course.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedCourseId(course.id);
                  }
                }}
              >
                <div>
                  <strong>{course.name}</strong>
                  <p>{course.description || "No description added yet."}</p>
                </div>
                <div className="cm-course-meta">
                  <span>{course.assignmentCount} assigned</span>
                  <div className="cm-inline-actions">
                    <button
                      type="button"
                      className="cm-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCourse(course);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="cm-link danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCourse(course.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="cm-grid">
        <section className="cm-card">
          <div className="cm-card-header">
            <h3>Assign Course</h3>
            <span className="cm-muted">{selectedCourse ? selectedCourse.name : "Select a course"}</span>
          </div>
          <div className={`cm-assign-panel ${!selectedCourse ? "disabled" : ""}`}>
            {!selectedCourse && (
              <div className="cm-empty">
                Select a course first. After that, search and filter students here before assigning them.
              </div>
            )}
            <div className="cm-filter-bar">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name, user ID, email, stream, college"
                disabled={!selectedCourse}
              />
              <select value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)} disabled={!selectedCourse}>
                <option value="">All Streams</option>
                {availableStreams.map((stream) => (
                  <option key={stream} value={stream}>
                    {stream}
                  </option>
                ))}
              </select>
              <select value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)} disabled={!selectedCourse}>
                <option value="">All Colleges</option>
                {availableColleges.map((college) => (
                  <option key={college} value={college}>
                    {college}
                  </option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "active" | "inactive" | "all")} disabled={!selectedCourse}>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
                <option value="all">All Students</option>
              </select>
            </div>
            <div className="cm-selection-meta">
              <span>{filteredStudents.length} students shown</span>
              <button
                type="button"
                className="secondary-btn"
                disabled={!selectedCourse}
                onClick={() =>
                  setSelectedUserIds((prev) => {
                    if (areAllFilteredStudentsSelected) {
                      return prev.filter((userId) => !filteredStudentIds.includes(userId));
                    }
                    return Array.from(new Set([...prev, ...filteredStudentIds]));
                  })
                }
              >
                {areAllFilteredStudentsSelected ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="cm-student-list">
              {filteredStudents.map((student) => {
                const checked = selectedUserIds.includes(student.userId);
                return (
                  <label key={student.id} className="cm-student-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!selectedCourse}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setSelectedUserIds((prev) =>
                          isChecked ? [...prev, student.userId] : prev.filter((id) => id !== student.userId)
                        );
                      }}
                    />
                    <span>{student.name}</span>
                    <small>{student.userId}</small>
                    <small>{student.courseStream || "No stream"}</small>
                    <small>{student.collegeName || "No college"}</small>
                  </label>
                );
              })}
            </div>
            <button className="primary-btn" type="button" onClick={handleAssignCourse} disabled={!selectedCourse}>
              Assign Selected Students
            </button>
          </div>
        </section>
      </div>

      <div className="cm-grid">
        <section className="cm-card">
          <div className="cm-card-header">
            <h3>{editingMaterialId ? "Edit Material" : "Create Day-wise Material"}</h3>
            <span className="cm-muted">{selectedCourse ? selectedCourse.name : "Select a course"}</span>
          </div>
          <form className="cm-form" onSubmit={handleSaveMaterial}>
            <label>
              Day Number
              <input
                type="number"
                min={1}
                value={materialForm.dayNumber}
                onChange={(e) => setMaterialForm((prev) => ({ ...prev, dayNumber: Number(e.target.value) }))}
                required
              />
            </label>
            <label>
              Title
              <input
                type="text"
                value={materialForm.title}
                onChange={(e) => setMaterialForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </label>
            <label>
              Page Content
              <textarea
                value={materialForm.content}
                onChange={(e) => setMaterialForm((prev) => ({ ...prev, content: e.target.value }))}
                rows={10}
                placeholder="Write the day-wise reading content that students should see in the portal."
                required
              />
            </label>
            <div className="cm-helper-text">This material is text-only and will be shown as a readable page to students.</div>
            <div className="cm-actions">
              <button type="submit" className="primary-btn" disabled={!selectedCourseId}>
                {editingMaterialId ? "Update Material" : "Add Material"}
              </button>
              {editingMaterialId && (
                <button type="button" className="secondary-btn" onClick={resetMaterialForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
        <section className="cm-card">
          <div className="cm-card-header">
            <h3>Course Material Library</h3>
            <span className="cm-muted">{selectedCourse ? selectedCourse.name : "Select a course"}</span>
          </div>
          {materialsLoading ? (
            <div className="cm-empty">Loading materials...</div>
          ) : materials.length === 0 ? (
            <div className="cm-empty">No day-wise material added for this course yet.</div>
          ) : (
            <div className="cm-material-list">
              {materials.map((material) => (
                <article key={material.id} className="cm-material-card">
                  <div className="cm-material-head">
                    <div>
                      <span className="cm-day-pill">Day {material.dayNumber}</span>
                      <h4>{material.title}</h4>
                    </div>
                    <div className="cm-inline-actions">
                      <button type="button" className="secondary-btn" onClick={() => handleEditMaterial(material)}>
                        Edit
                      </button>
                      <button type="button" className="logout-btn cm-danger-btn" onClick={() => handleDeleteMaterial(material.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                  {material.content && <p>{material.content}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CourseManagement;
