import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../services/api";
import "./StudentCourses.css";
import { normalizeLessonContent, renderRichText, type CourseMaterialRecord, type LessonBlock, type LessonContent } from "./courseContent";

interface AssignedCourse {
  id: string;
  name: string;
  description: string;
  materialCount: number;
  daysCovered: number;
}

interface CourseMaterial extends CourseMaterialRecord {}

type TabKey = "assigned" | "materials";

interface Props {
  userId: string;
}

export function LessonBlockView({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case "paragraph":
      return <p>{renderRichText(block.text)}</p>;
    case "bullet_list":
      return (
        <div className="student-lesson-block">
          {block.title && <h5>{block.title}</h5>}
          <ul className="student-lesson-list">
            {block.items.map((item) => (
              <li key={item}>{renderRichText(item)}</li>
            ))}
          </ul>
        </div>
      );
    case "stat_grid":
      return (
        <div className="student-lesson-block">
          {block.title && <h5>{block.title}</h5>}
          <div className="student-stat-grid">
            {block.items.map((item) => (
              <article key={`${item.label}-${item.value}`} className="student-stat-card">
                <span className="student-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
                {item.detail && <p>{item.detail}</p>}
              </article>
            ))}
          </div>
        </div>
      );
    case "comparison_table":
      return (
        <div className="student-lesson-block">
          {block.title && <h5>{block.title}</h5>}
          <div className="student-table-wrap">
            <table className="student-lesson-table">
              <thead>
                <tr>
                  {block.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={`${row[0]}-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${cell}-${cellIndex}`}>{renderRichText(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    case "image":
      return (
        <figure className="student-lesson-figure">
          <img src={block.src} alt={block.alt} />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    case "image_grid":
      return (
        <div className="student-image-grid">
          {block.images.map((image) => (
            <figure key={`${image.src}-${image.caption || image.alt}`} className="student-lesson-figure grid">
              <img src={image.src} alt={image.alt} />
              {image.caption && <figcaption>{image.caption}</figcaption>}
            </figure>
          ))}
        </div>
      );
    case "callout":
      return (
        <aside className={`student-callout ${block.tone || "info"}`}>
          <strong>{block.title}</strong>
          <p>{renderRichText(block.text)}</p>
        </aside>
      );
    case "card_grid":
      return (
        <div className="student-lesson-block">
          {block.title && <h5>{block.title}</h5>}
          <div className="student-pillar-grid">
            {block.items.map((item) => (
              <article key={item.title} className="student-pillar-card">
                <h6>{item.title}</h6>
                <p>{renderRichText(item.text)}</p>
              </article>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}

export function LessonView({ lesson, material }: { lesson: LessonContent; material: CourseMaterial }) {
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  useEffect(() => {
    setActiveSectionIndex(0);
  }, [lesson.slug, material.id]);

  const totalSections = lesson.sections.length;
  const activeSection = lesson.sections[activeSectionIndex];

  return (
    <article className="student-material-card lesson">
      <div className="student-lesson-shell">
        <section className="student-lesson-hero">
          <div>
            <h4>{lesson.hero.title}</h4>
            <p>{lesson.hero.subtitle}</p>
          </div>
          <div className="student-lesson-hero-meta">
            <span className="student-course-pill">Day {material.dayNumber}</span>
          </div>
        </section>

        <nav className="student-lesson-nav">
          {lesson.sections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              className={`student-lesson-nav-chip ${index === activeSectionIndex ? "active" : ""}`}
              onClick={() => setActiveSectionIndex(index)}
            >
              {section.title}
            </button>
          ))}
        </nav>

        <div className="student-lesson-pagination">
          <div className="student-lesson-page-status">
            <span className="student-course-pill">Section {activeSectionIndex + 1} of {totalSections}</span>
            <strong>{activeSection?.title}</strong>
          </div>
          <div className="student-lesson-page-actions">
            <button
              type="button"
              className="student-lesson-page-button"
              onClick={() => setActiveSectionIndex((current) => Math.max(current - 1, 0))}
              disabled={activeSectionIndex === 0}
            >
              Previous
            </button>
            <button
              type="button"
              className="student-lesson-page-button primary"
              onClick={() => setActiveSectionIndex((current) => Math.min(current + 1, totalSections - 1))}
              disabled={activeSectionIndex === totalSections - 1}
            >
              Next
            </button>
          </div>
        </div>

        <section className="student-lesson-carousel" aria-live="polite">
          <div
            className="student-lesson-track"
            style={{ transform: `translateX(-${activeSectionIndex * 100}%)` }}
          >
            {lesson.sections.map((section) => (
              <article key={section.id} id={section.id} className="student-lesson-section">
              <h5>{section.title}</h5>
              {section.intro && <p className="student-section-intro">{renderRichText(section.intro)}</p>}
              <div className="student-section-blocks">
                {section.blocks.map((block, index) => (
                  <LessonBlockView key={`${section.id}-${block.type}-${index}`} block={block} />
                ))}
              </div>
            </article>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}

const StudentCourses: React.FC<Props> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<TabKey>("assigned");
  const [courses, setCourses] = useState<AssignedCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  const sortedMaterials = useMemo(
    () => materials.slice().sort((a, b) => a.dayNumber - b.dayNumber || a.title.localeCompare(b.title)),
    [materials]
  );

  const selectedMaterial = useMemo(
    () => sortedMaterials.find((material) => material.id === selectedMaterialId) ?? sortedMaterials[0] ?? null,
    [sortedMaterials, selectedMaterialId]
  );

  const selectedLesson = useMemo(
    () => (selectedMaterial ? normalizeLessonContent(selectedMaterial) : null),
    [selectedMaterial]
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
      setSelectedMaterialId("");
      return;
    }
    setLoadingMaterials(true);
    try {
      const res = await apiGet<{ materials: CourseMaterial[] }>(
        `/answerer/courses/${courseId}/materials?userId=${encodeURIComponent(userId)}`
      );
      const fetchedMaterials = res.materials || [];
      setMaterials(fetchedMaterials);
      setSelectedMaterialId((current) =>
        current && fetchedMaterials.some((material) => material.id === current)
          ? current
          : fetchedMaterials
              .slice()
              .sort((a, b) => a.dayNumber - b.dayNumber || a.title.localeCompare(b.title))[0]?.id || ""
      );
    } catch (error) {
      console.error(error);
      setMaterials([]);
      setSelectedMaterialId("");
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
      setSelectedMaterialId("");
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
                    <span className="student-course-pill">{course.daysCovered} day{course.daysCovered !== 1 ? "s" : ""}</span>
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
              ) : sortedMaterials.length === 0 ? (
                <div className="empty-state"><p>No material has been added for this course yet.</p></div>
              ) : (
                <>
                  <div className="student-material-switcher">
                    {sortedMaterials.map((material) => (
                      <button
                        key={material.id}
                        type="button"
                        className={`student-material-chip ${selectedMaterial?.id === material.id ? "active" : ""}`}
                        onClick={() => setSelectedMaterialId(material.id)}
                      >
                        Day {material.dayNumber}
                      </button>
                    ))}
                  </div>

                  {selectedMaterial && (
                    selectedLesson ? (
                      <LessonView lesson={selectedLesson} material={selectedMaterial} />
                    ) : (
                      <article className="student-material-card">
                        <div className="student-material-day">Day {selectedMaterial.dayNumber}</div>
                        <div className="student-material-content">
                          <h4>{selectedMaterial.title}</h4>
                          {selectedMaterial.summary && <p className="student-material-summary">{selectedMaterial.summary}</p>}
                          <p>{selectedMaterial.content || "Course material shared for this day is available below."}</p>
                        </div>
                      </article>
                    )
                  )}
                </>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default StudentCourses;
