import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../services/api";
import "./StudentCourses.css";

interface AssignedCourse {
  id: string;
  name: string;
  description: string;
  materialCount: number;
  daysCovered: number;
}

interface CourseMaterial {
  id: string;
  dayNumber: number;
  title: string;
  content: string;
}

type TabKey = "assigned" | "materials";

interface Props {
  userId: string;
}

const StudentCourses: React.FC<Props> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<TabKey>("assigned");
  const [courses, setCourses] = useState<AssignedCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await apiGet<{ courses: AssignedCourse[] }>(
        `/answerer/courses?userId=${encodeURIComponent(userId)}`
      );
      const fetchedCourses = res.courses || [];
      setCourses(fetchedCourses);
      setSelectedCourseId((current) =>
        current && fetchedCourses.some((course) => course.id === current)
          ? current
          : fetchedCourses[0]?.id || ""
      );
    } catch (error) {
      console.error(error);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadMaterials = async (courseId: string) => {
    if (!courseId) {
      setMaterials([]);
      return;
    }
    setLoadingMaterials(true);
    try {
      const res = await apiGet<{ materials: CourseMaterial[] }>(
        `/answerer/courses/${courseId}/materials?userId=${encodeURIComponent(userId)}`
      );
      setMaterials(res.materials || []);
    } catch (error) {
      console.error(error);
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [userId]);

  useEffect(() => {
    if (selectedCourseId) {
      loadMaterials(selectedCourseId);
    } else {
      setMaterials([]);
    }
  }, [selectedCourseId, userId]);

  return (
    <div className="student-courses">
      <div className="student-courses-header">
        <div>
          <h2>Courses</h2>
          <p className="subtitle">View your assigned courses and study the day-wise material shared by admin.</p>
        </div>
      </div>

      <div className="student-course-tabs">
        <button
          className={`student-course-tab ${activeTab === "assigned" ? "active" : ""}`}
          onClick={() => setActiveTab("assigned")}
        >
          Display Assigned Courses
        </button>
        <button
          className={`student-course-tab ${activeTab === "materials" ? "active" : ""}`}
          onClick={() => setActiveTab("materials")}
        >
          Course Material
        </button>
      </div>

      {activeTab === "assigned" && (
        <section className="student-course-panel">
          {loadingCourses ? (
            <div className="empty-state"><p>Loading assigned courses...</p></div>
          ) : courses.length === 0 ? (
            <div className="empty-state"><p>No courses have been assigned to you yet.</p></div>
          ) : (
            <div className="student-course-grid">
              {courses.map((course) => (
                <article key={course.id} className="student-course-card">
                  <div className="student-course-card-top">
                    <h3>{course.name}</h3>
                    <span className="student-course-pill">{course.daysCovered} days</span>
                  </div>
                  <p>{course.description || "No description added for this course yet."}</p>
                  <div className="student-course-stats">
                    <span>{course.materialCount} material item{course.materialCount !== 1 ? "s" : ""}</span>
                    <button
                      className="secondary-btn"
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setActiveTab("materials");
                      }}
                    >
                      View Material
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "materials" && (
        <section className="student-course-panel">
          {courses.length > 0 && (
            <div className="student-course-selector">
              <label>
                Select Course
                <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {!selectedCourse && !loadingCourses && (
            <div className="empty-state"><p>Select a course to view material.</p></div>
          )}

          {selectedCourse && (
            <div className="student-course-timeline">
              <div className="student-course-summary">
                <h3>{selectedCourse.name}</h3>
                <p>{selectedCourse.description || "Day-wise learning content will appear below."}</p>
              </div>

              {loadingMaterials ? (
                <div className="empty-state"><p>Loading course material...</p></div>
              ) : materials.length === 0 ? (
                <div className="empty-state"><p>No material has been added for this course yet.</p></div>
              ) : (
                materials.map((material) => (
                  <article key={material.id} className="student-material-card">
                    <div className="student-material-day">Day {material.dayNumber}</div>
                    <div className="student-material-content">
                      <h4>{material.title}</h4>
                      <p>{material.content || "Course material shared for this day is available below."}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default StudentCourses;
