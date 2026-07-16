import {
  filterAdminTests,
  filterAssignableStudents,
  filterMasterItems,
  filterPortalUsers,
  filterResultTests,
  filterTestResults,
  formatDurationBand,
  formatPassRateBand,
  formatScoreBand,
  formatTimeSpentBand,
  matchesAssignmentLoadBand,
  matchesCutoffBand,
  matchesRelativeDateRange,
  matchesSectionCountBand,
  matchesTestQuestionBand,
} from "./filterUtils";

describe("filterUtils", () => {
  const now = new Date("2026-07-16T12:00:00");

  it("uses calendar-day relative date matching and excludes future dates", () => {
    expect(matchesRelativeDateRange("2026-07-16T08:00:00", "today", now)).toBe(true);
    expect(matchesRelativeDateRange("2026-07-15T23:59:59", "today", now)).toBe(false);
    expect(matchesRelativeDateRange("2026-07-10T09:00:00", "last7", now)).toBe(true);
    expect(matchesRelativeDateRange("2026-06-16T09:00:00", "older", now)).toBe(true);
    expect(matchesRelativeDateRange("2026-07-17T09:00:00", "today", now)).toBe(false);
  });

  it("keeps test band filters mutually exclusive", () => {
    expect(matchesTestQuestionBand(20, "medium")).toBe(false);
    expect(matchesTestQuestionBand(30, "medium")).toBe(true);
    expect(matchesCutoffBand(45, "standard")).toBe(false);
    expect(matchesCutoffBand(65, "standard")).toBe(true);
    expect(matchesSectionCountBand(1, "few")).toBe(false);
    expect(matchesSectionCountBand(3, "few")).toBe(true);
    expect(matchesAssignmentLoadBand(0, "light")).toBe(false);
    expect(matchesAssignmentLoadBand(12, "light")).toBe(true);
  });

  it("filters admin tests with exact band boundaries and date ranges", () => {
    const tests = [
      {
        name: "Short Easy",
        duration: 25,
        questions: 20,
        sections: [{ name: "Basics" }],
        createdAt: "2026-07-16T08:00:00",
        updatedAt: "2026-07-16T08:30:00",
        status: "active" as const,
        passingPercentage: 45,
        assignmentCount: 0,
        assignedColleges: ["A"],
      },
      {
        name: "Medium Standard",
        duration: 45,
        questions: 35,
        sections: [{ name: "Basics" }, { name: "Advanced" }],
        createdAt: "2026-07-14T08:00:00",
        updatedAt: "2026-07-16T09:00:00",
        status: "active" as const,
        passingPercentage: 65,
        assignmentCount: 14,
        assignedColleges: ["B"],
      },
      {
        name: "Large Strict",
        duration: 75,
        questions: 60,
        sections: [{ name: "One" }, { name: "Two" }, { name: "Three" }, { name: "Four" }],
        createdAt: "2026-06-10T08:00:00",
        updatedAt: "2026-06-11T08:00:00",
        status: "draft" as const,
        passingPercentage: 80,
        assignmentCount: 30,
        assignedColleges: ["C"],
      },
    ];

    const filtered = filterAdminTests(
      tests,
      {
        search: "",
        status: "active",
        durationBand: "medium",
        section: "all",
        questionBand: "medium",
        cutoffBand: "standard",
        sectionCountBand: "few",
        assignmentLoad: "light",
        college: "all",
        createdRange: "last7",
        updatedRange: "today",
        minCutoff: "",
        maxCutoff: "",
        minDuration: "",
        maxDuration: "",
        minQuestions: "",
        maxQuestions: "",
        minAssignments: "",
        maxAssignments: "",
        createdFrom: "",
        createdTo: "",
        sortBy: "newest",
      },
      now
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Medium Standard");
  });

  it("filters result attempts by combined search, date, score, and sort", () => {
    const results = [
      {
        userId: "u-1",
        userName: "Asha",
        collegeName: "Alpha",
        percentage: 92,
        scoredMarks: 46,
        totalMarks: 50,
        passed: true,
        submittedAt: "2026-07-16T08:30:00",
        timeSpentSec: 600,
      },
      {
        userId: "u-2",
        userName: "Bala",
        collegeName: "Beta",
        percentage: 68,
        scoredMarks: 34,
        totalMarks: 50,
        passed: true,
        submittedAt: "2026-07-10T08:30:00",
        timeSpentSec: 2200,
      },
      {
        userId: "u-3",
        userName: "Chitra",
        collegeName: "Alpha",
        percentage: 42,
        scoredMarks: 21,
        totalMarks: 50,
        passed: false,
        submittedAt: "2026-07-15T23:50:00",
        timeSpentSec: 3200,
      },
    ];

    const filtered = filterTestResults(
      results,
      {
        search: "alpha",
        status: "passed",
        college: "Alpha",
        sortBy: "score-low",
        minPercent: 70,
        maxPercent: 100,
        scoreBand: "topper",
        timeSpentBand: "quick",
        dateFilter: "today",
        minScore: 40,
        minTimeSpentMinutes: 5,
        maxTimeSpentMinutes: 15,
      },
      now
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].userName).toBe("Asha");
  });

  it("filters test results overview cards by attempts, pass-rate, and duration bands", () => {
    const tests = [
      { name: "A", questions: 20, duration: 20, totalAttempts: 0, avgScore: 0, passRate: 0 },
      { name: "B", questions: 30, duration: 45, totalAttempts: 8, avgScore: 75, passRate: 65 },
      { name: "C", questions: 50, duration: 75, totalAttempts: 11, avgScore: 88, passRate: 85 },
    ];

    const filtered = filterResultTests(tests, {
      search: "",
      attempts: "with-attempts",
      passRateBand: "good",
      durationBand: "medium",
      sortBy: "attempts",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("B");
  });

  it("filters portal users by search, status, cgpa, date range, and sorting", () => {
    const users = [
      {
        name: "Riya",
        email: "riya@example.com",
        userId: "riya1",
        collegeName: "A",
        courseStream: "CS",
        gender: "Female",
        sapCertification: "FICO",
        isActive: true,
        cgpa: 8.4,
        createdAt: "2026-07-10T08:00:00",
      },
      {
        name: "Arun",
        email: "arun@example.com",
        userId: "arun1",
        collegeName: "B",
        courseStream: "ECE",
        gender: "Male",
        sapCertification: "ABAP",
        isActive: false,
        cgpa: 7.1,
        createdAt: "2026-07-15T08:00:00",
      },
    ];

    const filtered = filterPortalUsers(users, {
      search: "riya",
      college: "A",
      stream: "CS",
      gender: "Female",
      status: "active",
      certification: "FICO",
      cgpaMin: "8",
      cgpaMax: "9",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-16",
      sortKey: "name",
      sortDir: "asc",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].userId).toBe("riya1");
  });

  it("filters assignable students and master-data searches case-insensitively", () => {
    const students = [
      { name: "Nisha", userId: "n1", email: "nisha@example.com", courseStream: "CS", collegeName: "Alpha", gender: "Female", isActive: true },
      { name: "Om", userId: "o1", email: "om@example.com", courseStream: "ECE", collegeName: "Beta", gender: "Male", isActive: false },
    ];
    const items = [{ label: "Computer Science" }, { label: "Mechanical" }];

    expect(
      filterAssignableStudents(students, {
        search: "nisha",
        stream: "CS",
        college: "Alpha",
        status: "active",
      })
    ).toHaveLength(1);

    expect(filterMasterItems(items, "computer")).toEqual([{ label: "Computer Science" }]);
  });

  it("maps result bands consistently", () => {
    expect(formatDurationBand(30)).toBe("short");
    expect(formatDurationBand(31)).toBe("medium");
    expect(formatPassRateBand(39)).toBe("poor");
    expect(formatPassRateBand(80)).toBe("excellent");
    expect(formatScoreBand(84)).toBe("strong");
    expect(formatScoreBand(85)).toBe("topper");
    expect(formatTimeSpentBand(899)).toBe("quick");
    expect(formatTimeSpentBand(900)).toBe("balanced");
  });
});
