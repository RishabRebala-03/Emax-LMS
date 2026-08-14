import React, { useEffect, useMemo, useState } from "react";
import TestInterface from "./TestInterface";
import StudentCourses from "./StudentCourses";
import InterviewPrep from "./InterviewPrep";
import "./AnswererDashboard.css";
import { apiGet, apiPost, apiPostForm } from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";
import AppIcon from "./AppIcons";

type AnswererView = "dashboard" | "tests" | "history" | "courses" | "account-security" | "sap-registration" | "interview-prep";

const viewToPath: Record<AnswererView, string> = {
  'dashboard': '/dashboard',
  'tests': '/dashboard/tests',
  'history': '/dashboard/history',
  'courses': '/dashboard/courses',
  'account-security': '/dashboard/account-security',
  'sap-registration': '/dashboard/sap-registration',
  'interview-prep': '/dashboard/interview-prep',
};

const pathToView: Record<string, AnswererView> = {
  '/dashboard': 'dashboard',
  '/dashboard/tests': 'tests',
  '/dashboard/history': 'history',
  '/dashboard/courses': 'courses',
  '/dashboard/account-security': 'account-security',
  '/dashboard/sap-registration': 'sap-registration',
  '/dashboard/interview-prep': 'interview-prep',
};

interface Props {
  userName: string; // NOTE: you are passing userId into this currently
  onLogout: () => void;
}

interface Insights {
  testsTaken: number;
  testsPassed: number;
  avgScore: number;
  bestScore: number;
  streak: number;
}

interface AssignedTest {
  id: string;           // examId
  name: string;
  duration: number;
  questions: number;
  status: "active" | "draft" | "completed";

  totalMarks?: number;
  passingPercentage?: number;
  attempted?: boolean;
}

interface ExamForTaking {
  id: string;
  testName: string;
  duration: number;
  passingPercentage?: number;
  questions: any[];
}

interface TestHistoryItem {
  attemptId: string;
  examId: string;
  testName: string;
  submittedAt: string;
  scoredMarks: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  timeSpentSec: number;
}

interface AccountSecurityInfo {
  userId: string;
  name: string;
  email: string;
  collegeEmail: string;
  collegeEmailMasked: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  unlockMethod?: string;
}

interface SapRegistrationProfile {
  userId: string;
  naxUnid?: string;
  studentName?: string;
  firstName?: string;
  lastName?: string;
  studentId?: string;
  email?: string;
  collegeEmail?: string;
  mobile?: string;
  gender?: string;
  collegeName?: string;
  courseStream?: string;
  cgpa?: number | string;
  sapCertification?: string;
  dob?: string;
  documentUrl?: string;
  documentName?: string;
  needsSapRegistration: boolean;
  hasSapRegistrationTab: boolean;
  canEditDob: boolean;
  canUploadDocument: boolean;
}

type SapSystem = "SHD" | "EMQ" | "EMP" | "EMD"; // Add more SAP systems as needed

const SAP_SYSTEMS: SapSystem[] = ["SHD", "EMQ", "EMP", "EMD"];

const AnswererDashboard: React.FC<Props> = ({ userName, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeView: AnswererView = pathToView[location.pathname] ?? 'dashboard';
  const setActiveView = (view: AnswererView) => navigate(viewToPath[view]);

  const [insights, setInsights] = useState<Insights>({
    testsTaken: 0,
    testsPassed: 0,
    avgScore: 0,
    bestScore: 0,
    streak: 0,
  });

  const [assignedTests, setAssignedTests] = useState<AssignedTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [testHistory, setTestHistory] = useState<TestHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [accountSecurity, setAccountSecurity] = useState<AccountSecurityInfo | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState("");
  const [unlockOtp, setUnlockOtp] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [showUnlockWindow, setShowUnlockWindow] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [sapUnlocking, setSapUnlocking] = useState(false);
  const [sapUnlockError, setSapUnlockError] = useState("");
  const [sapUnlockMessage, setSapUnlockMessage] = useState("");
  const [selectedSapSystem, setSelectedSapSystem] = useState<SapSystem>("SHD");
  const [sapRegistrationProfile, setSapRegistrationProfile] = useState<SapRegistrationProfile | null>(null);
  const [loadingSapRegistration, setLoadingSapRegistration] = useState(false);
  const [sapRegistrationFirstName, setSapRegistrationFirstName] = useState("");
  const [sapRegistrationLastName, setSapRegistrationLastName] = useState("");
  const [sapRegistrationDob, setSapRegistrationDob] = useState("");
  const [sapRegistrationFile, setSapRegistrationFile] = useState<File | null>(null);
  const [savingSapRegistration, setSavingSapRegistration] = useState(false);
  const [sapRegistrationMessage, setSapRegistrationMessage] = useState("");
  const [sapRegistrationError, setSapRegistrationError] = useState("");

  // when user chooses a test, we load it and render TestInterface
  const [activeExam, setActiveExam] = useState<ExamForTaking | null>(null);
  const [loadingExam, setLoadingExam] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [hasInterviewPrepAccess, setHasInterviewPrepAccess] = useState(false);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    []
  );

  const loadInsights = async () => {
    try {
      const res = await apiGet<{ insights: Insights }>(
        `/answerer/dashboard?userId=${encodeURIComponent(userName)}`
      );
      setInsights(res.insights);
    } catch (e) {
      console.error(e);
      // keep defaults
    }
  };

  const loadAssignedTests = async () => {
    setLoadingTests(true);
    try {
      const res = await apiGet<{ tests: AssignedTest[] }>(
        `/answerer/tests?userId=${encodeURIComponent(userName)}`
      );
      setAssignedTests(res.tests || []);
    } catch (e) {
      console.error(e);
      alert("Failed to load your tests from backend");
      setAssignedTests([]);
    } finally {
      setLoadingTests(false);
    }
  };

  const loadTestHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiGet<{ history: TestHistoryItem[] }>(
        `/answerer/history?userId=${encodeURIComponent(userName)}`
      );
      setTestHistory(res.history || []);
    } catch (e) {
      console.error(e);
      setTestHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadAccountSecurity = async () => {
    try {
      const res = await apiGet<{ account: AccountSecurityInfo }>(
        `/answerer/account-security?userId=${encodeURIComponent(userName)}`
      );
      setAccountSecurity(res.account);
    } catch (e) {
      console.error(e);
      setAccountSecurity(null);
    }
  };

  const loadInterviewPrepAccess = async () => {
    try {
      const res = await apiGet<{ hasAccess: boolean }>(
        `/answerer/interview-prep/access?userId=${encodeURIComponent(userName)}`
      );
      setHasInterviewPrepAccess(res.hasAccess === true);
    } catch (e) {
      console.error(e);
      setHasInterviewPrepAccess(false);
    }
  };

  const loadSapRegistrationProfile = async () => {
    setLoadingSapRegistration(true);
    try {
      const res = await apiGet<{ profile: SapRegistrationProfile }>(
        `/answerer/sap-registration?userId=${encodeURIComponent(userName)}`
      );
      setSapRegistrationProfile(res.profile);
      setSapRegistrationFirstName(res.profile.firstName || "");
      setSapRegistrationLastName(res.profile.lastName || "");
      setSapRegistrationDob(res.profile.dob || "");
      if (activeView === "sap-registration" && !res.profile.hasSapRegistrationTab) {
        navigate('/dashboard');
      }
    } catch (e) {
      console.error(e);
      setSapRegistrationProfile(null);
    } finally {
      setLoadingSapRegistration(false);
    }
  };

  useEffect(() => {
    loadInsights();
    loadAssignedTests();
    loadTestHistory();
    loadInterviewPrepAccess();
    loadSapRegistrationProfile();
    if (activeView === "account-security") {
      loadAccountSecurity();
    }
  }, [userName]);

  // Redirect away from interview-prep if access was revoked
  useEffect(() => {
    if (activeView === "interview-prep" && !hasInterviewPrepAccess) {
      navigate('/dashboard');
    }
  }, [activeView, hasInterviewPrepAccess]);

  useEffect(() => {
    if (activeView === "sap-registration" && sapRegistrationProfile && !sapRegistrationProfile.hasSapRegistrationTab) {
      navigate('/dashboard');
    }
  }, [activeView, sapRegistrationProfile]);

  useEffect(() => {
    if (activeView === "account-security") {
      loadAccountSecurity();
      setUnlockMessage("");
      setUnlockError("");
      setUnlockOtp("");
      setOtpRequested(false);
      setShowUnlockWindow(false);
      setOtpExpiresAt(null);
      setOtpSecondsLeft(0);
      setSapUnlockError("");
      setSapUnlockMessage("");
      setSelectedSapSystem("SHD");
    }
  }, [activeView]);

  useEffect(() => {
    if (!otpRequested || !otpExpiresAt) {
      setOtpSecondsLeft(0);
      return;
    }

    const updateRemaining = () => {
      const seconds = Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000));
      setOtpSecondsLeft(seconds);
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [otpRequested, otpExpiresAt]);

  const startExam = async (examId: string) => {
    setLoadingExam(true);
    try {
      const res = await apiGet<{ test: ExamForTaking }>(
        `/answerer/tests/${examId}?userId=${encodeURIComponent(userName)}`
      );
      setActiveExam(res.test);
      navigate('/dashboard/tests');
    } catch (e) {
      console.error(e);
      alert("Failed to start test");
    } finally {
      setLoadingExam(false);
    }
  };

  const exitExam = () => {
    setActiveExam(null);
    navigate('/dashboard');
    loadInsights();
    loadAssignedTests();
    loadTestHistory();
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatOtpCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Store the current view before entering test mode for proper highlighting
  const showSidebar = activeView !== "tests" || !activeExam;

  const handleRequestOtp = async () => {
    setSendingOtp(true);
    setUnlockError("");
    setUnlockMessage("");
    try {
      const res = await apiPost<{ message: string; collegeEmailMasked: string; expiresInMinutes: number }>(
        "/answerer/account-security/otp/request",
        { userId: userName }
      );
      setUnlockMessage(`${res.message}. Sent to ${res.collegeEmailMasked}.`);
      setOtpRequested(true);
      setShowUnlockWindow(false);
      const expiresInSeconds = Math.max(1, (res.expiresInMinutes ?? 5) * 60);
      setOtpExpiresAt(Date.now() + expiresInSeconds * 1000);
      setOtpSecondsLeft(expiresInSeconds);
      setSapUnlockError("");
      setSapUnlockMessage("");
      await loadAccountSecurity();
    } catch (err: any) {
      setUnlockError(err?.message || "Failed to send verification code");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!unlockOtp.trim()) {
      setUnlockError("Enter the 6-digit verification code");
      return;
    }
    if (otpSecondsLeft <= 0) {
      setUnlockError("This OTP has expired. Please request a new one.");
      return;
    }
    setVerifyingOtp(true);
    setUnlockError("");
    try {
      await apiPost("/answerer/account-security/otp/verify", {
        userId: userName,
        otp: unlockOtp.trim(),
      });
      setUnlockMessage("OTP verified successfully. You can now unlock the SAP profile.");
      setUnlockOtp("");
      setOtpRequested(false);
      setShowUnlockWindow(true);
      setOtpExpiresAt(null);
      setOtpSecondsLeft(0);
      setSapUnlockError("");
      setSapUnlockMessage("");
      await Promise.all([loadAccountSecurity(), loadInsights()]);
    } catch (err: any) {
      setUnlockError(err?.message || "Failed to verify the code");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSapUnlock = async () => {
    setSapUnlocking(true);
    setSapUnlockError("");
    setSapUnlockMessage("");
    try {
      const res = await apiPost<{ message: string }>("/answerer/account-security/sap-unlock", {
        userId: userName,
        sapSystem: selectedSapSystem,
      });
      setSapUnlockMessage(res.message || "SAP profile unlocked successfully.");
      setUnlockMessage("SAP profile unlocked successfully.");
      await Promise.all([loadAccountSecurity(), loadInsights()]);
    } catch (err: any) {
      setSapUnlockError(err?.message || "Failed to unlock SAP profile.");
    } finally {
      setSapUnlocking(false);
    }
  };

  const isUnlockFlowActive =
    activeView === "account-security" && (otpRequested || showUnlockWindow || sapUnlocking);

  const confirmCloseUnlockFlow = () => {
    if (!showUnlockWindow) {
      return true;
    }

    return window.confirm("Close the SAP unlock window? Your current unlock progress may be interrupted.");
  };

  const handleCloseUnlockWindow = () => {
    if (!confirmCloseUnlockFlow()) {
      return;
    }

    setShowUnlockWindow(false);
  };

  const handleSapRegistrationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["jpg", "jpeg", "pdf"].includes(ext)) {
      setSapRegistrationError("Upload a JPG, JPEG, or PDF file.");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setSapRegistrationError("Document must be 10MB or smaller.");
      e.target.value = "";
      return;
    }

    setSapRegistrationError("");
    setSapRegistrationFile(file);
  };

  const handleSapRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sapRegistrationProfile) return;
    if (!sapRegistrationProfile.needsSapRegistration) {
      setSapRegistrationError("SAP registration details are already completed and cannot be edited.");
      return;
    }

    if (!sapRegistrationFirstName.trim() || !sapRegistrationLastName.trim()) {
      setSapRegistrationError("Enter both First Name and Last Name.");
      return;
    }
    if (sapRegistrationProfile.canEditDob && !sapRegistrationDob) {
      setSapRegistrationError("Select your Date of Birth.");
      return;
    }
    if (sapRegistrationProfile.canUploadDocument && !sapRegistrationFile) {
      setSapRegistrationError("Upload your document.");
      return;
    }

    setSavingSapRegistration(true);
    setSapRegistrationError("");
    setSapRegistrationMessage("");
    try {
      const fd = new FormData();
      fd.append("userId", userName);
      fd.append("firstName", sapRegistrationFirstName.trim());
      fd.append("lastName", sapRegistrationLastName.trim());
      if (sapRegistrationProfile.canEditDob) {
        fd.append("dob", sapRegistrationDob);
      }
      if (sapRegistrationProfile.canUploadDocument && sapRegistrationFile) {
        fd.append("document", sapRegistrationFile);
      }

      const res = await apiPostForm<{ message: string; profile: SapRegistrationProfile }>(
        "/answerer/sap-registration/complete",
        fd
      );
      setSapRegistrationProfile(res.profile);
      setSapRegistrationFirstName(res.profile.firstName || "");
      setSapRegistrationLastName(res.profile.lastName || "");
      setSapRegistrationDob(res.profile.dob || "");
      setSapRegistrationFile(null);
      setSapRegistrationMessage(res.message || "SAP registration details updated successfully.");
    } catch (err: any) {
      setSapRegistrationError(err?.message || "Failed to update SAP registration details.");
    } finally {
      setSavingSapRegistration(false);
    }
  };

  useEffect(() => {
    if (!isUnlockFlowActive) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isUnlockFlowActive]);

  const profileDetailRows = sapRegistrationProfile
    ? [
        { label: "Full Name", value: sapRegistrationProfile.studentName },
        { label: "Student ID", value: sapRegistrationProfile.studentId },
        { label: "Personal Email ID", value: sapRegistrationProfile.email },
        { label: "College Email ID", value: sapRegistrationProfile.collegeEmail },
        { label: "Mobile Number", value: sapRegistrationProfile.mobile },
        { label: "Gender", value: sapRegistrationProfile.gender },
        { label: "College Name", value: sapRegistrationProfile.collegeName },
        { label: "Course Stream", value: sapRegistrationProfile.courseStream },
        { label: "Last Semester CGPA", value: sapRegistrationProfile.cgpa },
        { label: "SAP Certification", value: sapRegistrationProfile.sapCertification },
      ]
    : [];

  return (
    <div className="answerer-container">
      {/* Sidebar hidden during exam view */}
      {showSidebar && (
        <aside className="answerer-sidebar">
          <div className="sidebar-header">
            <img
              src="/assets/emax-logo.png"
              alt="Emax Technologies"
              className="sidebar-logo"
            />
            <span className="role-badge">Test Taker</span>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeView === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveView("dashboard")}
            >
              <AppIcon name="dashboard" className="nav-icon" />
              Dashboard
            </button>

            <button
              className={`nav-item ${activeView === "tests" ? "active" : ""}`}
              onClick={() => setActiveView("tests")}
            >
              <AppIcon name="tests" className="nav-icon" />
              Tests
            </button>

            <button
              className={`nav-item ${activeView === "courses" ? "active" : ""}`}
              onClick={() => setActiveView("courses")}
            >
              <AppIcon name="courses" className="nav-icon" />
              Courses
            </button>

            <button
              className={`nav-item ${activeView === "history" ? "active" : ""}`}
              onClick={() => setActiveView("history")}
            >
              <AppIcon name="history" className="nav-icon" />
              History
            </button>

            <button
              className={`nav-item ${activeView === "account-security" ? "active" : ""}`}
              onClick={() => setActiveView("account-security")}
            >
              <AppIcon name="security" className="nav-icon" />
              SAP Account Security
            </button>

            {sapRegistrationProfile?.hasSapRegistrationTab && (
              <button
                className={`nav-item ${activeView === "sap-registration" ? "active" : ""}`}
                onClick={() => setActiveView("sap-registration")}
              >
                <AppIcon name="registration" className="nav-icon" />
                SAP Registration
              </button>
            )}

            {hasInterviewPrepAccess && (
              <button
                className={`nav-item ${activeView === "interview-prep" ? "active" : ""}`}
                onClick={() => setActiveView("interview-prep")}
              >
                <AppIcon name="interview" className="nav-icon" />
                Interview Preparation
              </button>
            )}
          </nav>

          <div className="sidebar-footer">
            <div className="user-profile">
              <div className="user-avatar">
                {userName?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="user-name">{userName}</div>
            </div>

            <button
              className="change-password-btn"
              onClick={() => setShowChangePassword(true)}
            >
              Change Password
            </button>

            <button className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </aside>
      )}

      <main className={`answerer-main ${activeView === "tests" && activeExam ? "no-sidebar" : ""}`}>
        {activeView === "dashboard" && (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <span className="dashboard-title">Dashboard</span>
              </div>
              <div className="dashboard-topbar-right">{today}</div>
            </div>

            <div>
              <h2>Welcome back, {userName}</h2>
              <p className="subtitle">Track your progress and manage your tests</p>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon" aria-hidden="true">
                    <AppIcon name="tests" className="stat-icon-svg" />
                  </div>
                  <div className="stat-info">
                    <h3>Tests Taken</h3>
                    <p className="stat-number">{insights.testsTaken}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" aria-hidden="true">
                    <AppIcon name="completed" className="stat-icon-svg" />
                  </div>
                  <div className="stat-info">
                    <h3>Tests Passed</h3>
                    <p className="stat-number">{insights.testsPassed}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" aria-hidden="true">
                    <AppIcon name="score" className="stat-icon-svg" />
                  </div>
                  <div className="stat-info">
                    <h3>Average Score</h3>
                    <p className="stat-number">{insights.avgScore.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" aria-hidden="true">
                    <AppIcon name="trophy" className="stat-icon-svg" />
                  </div>
                  <div className="stat-info">
                    <h3>Best Score</h3>
                    <p className="stat-number">{insights.bestScore.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" aria-hidden="true">
                    <AppIcon name="streak" className="stat-icon-svg" />
                  </div>
                  <div className="stat-info">
                    <h3>Current Streak</h3>
                    <p className="stat-number">{insights.streak}</p>
                  </div>
                </div>
              </div>

              <div className="quick-actions" style={{ marginTop: '2rem' }}>
                <div className="qa-card enhanced">
                  <div className="qa-left">
                    <span className="qa-badge">Ready to test</span>
                    <h3>Take Your Next Test</h3>
                    <p>You have {assignedTests.length} test{assignedTests.length !== 1 ? 's' : ''} assigned. Start your next challenge and improve your skills.</p>
                  </div>
                  <div className="qa-right">
                    <button
                      className="primary-btn large"
                      onClick={() => setActiveView("tests")}
                      disabled={assignedTests.length === 0}
                    >
                      View Tests
                    </button>
                  </div>
                </div>
              </div>

              <div className="lower-grid">
                <div className="panel">
                  <h3 className="panel-title">Recent Activity</h3>
                  {testHistory.length === 0 && (
                    <p style={{ color: "#6a6d70", fontSize: "0.875rem" }}>
                      No recent activity yet
                    </p>
                  )}
                  {testHistory.slice(0, 3).map((item) => (
                    <div key={item.attemptId} className="activity-row">
                      <span>{item.testName}</span>
                      <span className={`activity-score ${item.passed ? '' : 'fail'}`}>
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>

                <div className="panel">
                  <h3 className="panel-title">Upcoming Tests</h3>
                  {assignedTests.length === 0 && (
                    <p style={{ color: "#6a6d70", fontSize: "0.875rem" }}>
                      No upcoming tests
                    </p>
                  )}
                  {assignedTests
                    .filter(t => !t.attempted)
                    .slice(0, 3)
                    .map((test) => (
                      <div key={test.id} className="test-row">
                        <div>
                          <div className="test-name">{test.name}</div>
                          <div className="test-meta">{test.questions} questions · {test.duration} min</div>
                        </div>
                        <span className={`status ${test.status === 'active' ? 'upcoming' : 'locked'}`}>
                          {test.status}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeView === "history" && (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <span className="dashboard-title">Test History</span>
              </div>
              <div className="dashboard-topbar-right">{today}</div>
            </div>

            <div className="history-page">
              <h2>Your Test History</h2>
              <p className="subtitle">View all your past test attempts and results</p>

              {loadingHistory && (
                <div style={{ padding: "2rem", textAlign: "center", color: "#6a6d70" }}>
                  Loading history...
                </div>
              )}

              {!loadingHistory && testHistory.length === 0 && (
                <div className="empty-state">
                  <p>No test history yet. Complete your first test to see results here!</p>
                </div>
              )}

              {!loadingHistory && testHistory.length > 0 && (
                <div className="history-list">
                  {testHistory.map((item) => (
                    <div key={item.attemptId} className="history-card">
                      <div className="history-card-header">
                        <h3>{item.testName}</h3>
                        <span className={`status-badge ${item.passed ? 'passed' : 'failed'}`}>
                          {item.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>

                      <div className="history-card-body">
                        <div className="history-stat">
                          <span className="stat-label">Score</span>
                          <span className="stat-value">{item.scoredMarks} / {item.totalMarks}</span>
                        </div>

                        <div className="history-stat">
                          <span className="stat-label">Percentage</span>
                          <span className="stat-value">{item.percentage.toFixed(2)}%</span>
                        </div>

                        <div className="history-stat">
                          <span className="stat-label">Time Taken</span>
                          <span className="stat-value">{formatDuration(item.timeSpentSec)}</span>
                        </div>

                        <div className="history-stat">
                          <span className="stat-label">Date</span>
                          <span className="stat-value">{formatDate(item.submittedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeView === "courses" && (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <span className="dashboard-title">Courses</span>
              </div>
              <div className="dashboard-topbar-right">{today}</div>
            </div>

            <StudentCourses userId={userName} />
          </>
        )}

        {activeView === "interview-prep" && (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <span className="dashboard-title">Interview Preparation</span>
              </div>
              <div className="dashboard-topbar-right">{today}</div>
            </div>

            <InterviewPrep />
          </>
        )}

        {activeView === "sap-registration" && sapRegistrationProfile?.hasSapRegistrationTab && (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <span className="dashboard-title">SAP Registration</span>
              </div>
              <div className="dashboard-topbar-right">{today}</div>
            </div>

            <div className="sap-registration-page">
              <section className="sap-registration-header card-surface">
                <div>
                  <span className="security-kicker">Profile completion</span>
                  <h2>{sapRegistrationProfile.needsSapRegistration ? "Complete your SAP registration details" : "SAP registration details"}</h2>
                  <p>
                    {sapRegistrationProfile.needsSapRegistration
                      ? "Your existing registration details are shown below. Only the missing Date of Birth and document upload can be updated."
                      : "Your submitted SAP registration details are shown below and cannot be edited."}
                  </p>
                </div>
                <div className="sap-registration-status">
                  <AppIcon name="registration" className="security-status-icon" />
                  {sapRegistrationProfile.needsSapRegistration ? "Pending details" : "Completed"}
                </div>
              </section>

              <form className="sap-registration-form card-surface" onSubmit={handleSapRegistrationSubmit}>
                {loadingSapRegistration ? (
                  <div className="sap-registration-loading">Loading registration details...</div>
                ) : (
                  <>
                    <div className="sap-name-grid">
                      <div className="sap-edit-field">
                        <label htmlFor="sapRegistrationFirstName">First Name *</label>
                        <input
                          id="sapRegistrationFirstName"
                          type="text"
                          value={sapRegistrationFirstName}
                          onChange={(e) => setSapRegistrationFirstName(e.target.value)}
                          placeholder="Enter first name"
                          readOnly={!sapRegistrationProfile.needsSapRegistration}
                          required
                        />
                      </div>
                      <div className="sap-edit-field">
                        <label htmlFor="sapRegistrationLastName">Last Name *</label>
                        <input
                          id="sapRegistrationLastName"
                          type="text"
                          value={sapRegistrationLastName}
                          onChange={(e) => setSapRegistrationLastName(e.target.value)}
                          placeholder="Enter last name"
                          readOnly={!sapRegistrationProfile.needsSapRegistration}
                          required
                        />
                      </div>
                    </div>

                    <div className="sap-readonly-grid">
                      {profileDetailRows.map((item) => (
                        <div key={item.label} className="sap-readonly-field">
                          <span>{item.label}</span>
                          <strong title={String(item.value || "")}>{item.value || "-"}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="sap-edit-grid">
                      <div className="sap-edit-field">
                        <label htmlFor="sapRegistrationDob">Date of Birth *</label>
                        {sapRegistrationProfile.canEditDob ? (
                          <input
                            id="sapRegistrationDob"
                            type="date"
                            value={sapRegistrationDob}
                            onChange={(e) => setSapRegistrationDob(e.target.value)}
                            required
                          />
                        ) : (
                          <div className="sap-readonly-input">{sapRegistrationProfile.dob || "-"}</div>
                        )}
                      </div>

                      <div className="sap-edit-field">
                        <label htmlFor="sapRegistrationDocument">Upload Document (JPG, JPEG, PDF) *</label>
                        {sapRegistrationProfile.canUploadDocument ? (
                          !sapRegistrationFile ? (
                            <>
                              <input
                                id="sapRegistrationDocument"
                                type="file"
                                accept=".jpg,.jpeg,.pdf,image/jpeg,image/jpg,application/pdf"
                                onChange={handleSapRegistrationFileChange}
                                style={{ display: "none" }}
                                required
                              />
                              <label htmlFor="sapRegistrationDocument" className="sap-upload-btn">
                                <AppIcon name="upload" className="sap-upload-icon" />
                                <span>Upload File</span>
                              </label>
                            </>
                          ) : (
                            <div className="sap-file-preview">
                              <div>
                                <strong title={sapRegistrationFile.name}>{sapRegistrationFile.name}</strong>
                                <span>{(sapRegistrationFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                              </div>
                              <button type="button" onClick={() => setSapRegistrationFile(null)} aria-label="Remove selected file">
                                x
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="sap-readonly-input">{sapRegistrationProfile.documentName || "Uploaded"}</div>
                        )}
                      </div>
                    </div>

                    {sapRegistrationMessage && <div className="security-feedback success">{sapRegistrationMessage}</div>}
                    {sapRegistrationError && <div className="security-feedback error">{sapRegistrationError}</div>}

                    {sapRegistrationProfile.needsSapRegistration && (
                      <div className="sap-registration-actions">
                        <button
                          type="submit"
                          className="primary-btn large"
                          disabled={savingSapRegistration}
                        >
                          {savingSapRegistration ? "Submitting..." : "Submit Details"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </form>
            </div>
          </>
        )}

        {activeView === "account-security" && (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <span className="dashboard-title">SAP Account Security</span>
              </div>
              <div className="dashboard-topbar-right">{today}</div>
            </div>

            <div className="security-page">
              <div className="security-hero card-surface">
                <div className="security-hero-copy">
                  <span className="security-kicker">Student only</span>
                  <h2>Unlock your SAP Account user with a verified code</h2>
                  <p>
                    Request a one-time passcode to your college email, then enter it here to restore access to your SAP Account user.
                  </p>
                </div>
                <div className="security-hero-meta">
                  <div className="security-status-pill">
                    <AppIcon name="security" className="security-status-icon" />
                    {accountSecurity?.isActive ? "SAP Account user active" : "SAP Account user locked"}
                  </div>
                  <p className="security-note">
                    This flow is available only for the signed-in SAP Account user.
                  </p>
                </div>
              </div>

              <div className="security-grid">
                <section className="security-panel card-surface">
                  <h3>SAP Account unlock</h3>
                  <p className="security-muted">
                    Step 1: send a verification code to your college email.
                  </p>

                  <div className="security-form">
                    <div className="sap-system-entry">
                      <label htmlFor="sapSystem">SAP system</label>
                      <select
                        id="sapSystem"
                        value={selectedSapSystem}
                        onChange={(e) => setSelectedSapSystem(e.target.value as SapSystem)}
                        disabled={sendingOtp || verifyingOtp || otpRequested}
                      >
                        {SAP_SYSTEMS.map((system) => (
                          <option key={system} value={system}>{system}</option>
                        ))}
                      </select>
                      <span>Choose the SAP system where your account should be unlocked.</span>
                    </div>

                    <button
                      className="primary-btn large security-action-btn"
                      onClick={handleRequestOtp}
                      disabled={sendingOtp}
                    >
                      {sendingOtp ? "Sending code..." : "Send OTP to college email"}
                    </button>

                    {otpRequested && (
                      <>
                        <div className={`otp-timer ${otpSecondsLeft <= 0 ? "expired" : ""}`}>
                          {otpSecondsLeft > 0
                            ? `OTP valid for ${formatOtpCountdown(otpSecondsLeft)}`
                            : "OTP expired. Request a new code."}
                        </div>

                        <div className="otp-entry">
                          <label htmlFor="unlockOtp">Enter OTP</label>
                          <input
                            id="unlockOtp"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            placeholder="000000"
                            value={unlockOtp}
                            onChange={(e) => setUnlockOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          />
                        </div>

                        <button
                          className="secondary-btn security-action-btn"
                          onClick={handleVerifyOtp}
                          disabled={verifyingOtp || otpSecondsLeft <= 0}
                        >
                          {verifyingOtp ? "Verifying..." : "Verify OTP and unlock"}
                        </button>
                      </>
                    )}

                    {unlockMessage && <div className="security-feedback success">{unlockMessage}</div>}
                    {unlockError && <div className="security-feedback error">{unlockError}</div>}
                  </div>
                </section>
              </div>
            </div>
          </>
        )}

        {activeView === "tests" && (
          <div className="tests-wrapper">
            {!activeExam ? (
              <>
                <div className="tests-page-header">
                  <h2>Your Tests</h2>
                  <button className="secondary-btn" onClick={exitExam}>
                    ← Back to Dashboard
                  </button>
                </div>

                <div className="tests-grid">
                  {assignedTests.map((t) => (
                    <div key={t.id} className="test-card detailed">
                      <div className="test-card-header">
                        <h3 className="test-title">{t.name}</h3>
                      </div>

                      <div className="test-card-body">
                        <div className="test-card-left">
                          <div className="test-meta-grid">
                            <div className="meta-item">
                              <div className="meta-label">Questions</div>
                              <div className="meta-value">{t.questions}</div>
                            </div>

                            <div className="meta-item">
                              <div className="meta-label">Duration</div>
                              <div className="meta-value">{t.duration}</div>
                            </div>

                            <div className="meta-item">
                              <div className="meta-label">Total Marks</div>
                              <div className="meta-value">{t.totalMarks ?? t.questions}</div>
                            </div>

                            <div className="meta-item">
                              <div className="meta-label">Pass Score</div>
                              <div className="meta-value">{t.passingPercentage ?? 40}%</div>
                            </div>
                          </div>
                        </div>

                        <div className="test-card-right">
                          <div className="test-action-stack">
                            <button
                              className="primary-btn large"
                              disabled={loadingExam || t.attempted}
                              onClick={() => startExam(t.id)}
                              title={
                                t.attempted
                                  ? "You have already attempted this test"
                                  : "Start Test"
                              }
                            >
                              {t.attempted
                                ? "Test Already Attempted"
                                : loadingExam
                                  ? "Starting..."
                                  : "Start Test"}
                            </button>

                            {t.attempted && (
                              <div className="attempted-hint">
                                You have already submitted this test.
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                      <div className="test-card-footer">
                        <span className={`test-status ${t.status}`}>
                          {t.status}
                        </span>
                        {t.status !== "active" && (
                          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {t.status === "draft" ? "Test is in draft mode" : "Test completed"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <TestInterface
                userId={userName}
                examId={activeExam.id}
                testName={activeExam.testName}
                duration={activeExam.duration}
                passingPercentage={activeExam.passingPercentage}
                questions={activeExam.questions}
                onExit={exitExam}
              />
            )}
          </div>
        )}
      </main>
      {/* ================= CHANGE PASSWORD MODAL ================= */}
      {showChangePassword && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Change Password</h3>

            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                className="secondary-btn"
                onClick={() => {
                  setShowChangePassword(false);
                  setOldPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                Cancel
              </button>

              <button
                className="primary-btn"
                disabled={changingPassword}
                onClick={async () => {
                  if (!oldPassword || !newPassword || !confirmPassword) {
                    alert("All fields are required");
                    return;
                  }

                  if (newPassword !== confirmPassword) {
                    alert("Passwords do not match");
                    return;
                  }

                  try {
                    setChangingPassword(true);
                    await apiPost("/auth/change-password", {
                      userId: userName,
                      role: "answerer",
                      oldPassword,
                      newPassword,
                    });

                    alert("Password changed successfully");
                    setShowChangePassword(false);
                    setOldPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  } catch (err: any) {
                    alert(err?.response?.data?.error || "Failed to change password");
                  } finally {
                    setChangingPassword(false);
                  }
                }}
              >
                {changingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showUnlockWindow && (
        <div className="modal-overlay" onClick={handleCloseUnlockWindow}>
          <div className="modal-card unlock-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Unlock SAP profile</h3>
            <p className="unlock-modal-copy">
              Your 6-digit verification code was verified. You can now send the SAP BASIS unlock request for this profile.
            </p>
            <div className="security-details compact">
              <div className="security-row">
                <span>User ID</span>
                <strong>{accountSecurity?.userId || userName}</strong>
              </div>
              <div className="security-row">
                <span>College email</span>
                <strong>{accountSecurity?.collegeEmailMasked || "Not available"}</strong>
              </div>
              <div className="security-row">
                <span>SAP system</span>
                <strong>{selectedSapSystem}</strong>
              </div>
            </div>
            {sapUnlockMessage && <div className="security-feedback success">{sapUnlockMessage}</div>}
            {sapUnlockError && <div className="security-feedback error">{sapUnlockError}</div>}
            <div className="modal-actions">
              <button
                className="primary-btn"
                onClick={handleSapUnlock}
                disabled={sapUnlocking}
              >
                {sapUnlocking ? "Unlocking..." : "Unlock SAP Profile"}
              </button>
              <button className="primary-btn" onClick={handleCloseUnlockWindow}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ================= END MODAL ================= */}
    </div>
  );
};

export default AnswererDashboard;
