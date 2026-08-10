import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import TestBuilder from './TestBuilder';
import TestEditor from './TestEditor';
import TestList from './TestList';
import TestResults from './TestResults';
import DataMaintenance from './DataMaintenance';
import CourseManagement from './CourseManagement';
import AdminInterviewPrep from './AdminInterviewPrep';
import './AdminDashboard.css';
import { apiGet, apiPost } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import AppIcon from './AppIcons';

type AdminView = 'dashboard' | 'users' | 'create-test' | 'edit-test' | 'tests' | 'results' | 'data-maintenance' | 'courses' | 'interview-prep';

const viewToPath: Record<AdminView, string> = {
  'dashboard':        '/admin',
  'users':            '/admin/users',
  'tests':            '/admin/tests',
  'create-test':      '/admin/tests/create',
  'edit-test':        '/admin/tests/edit',
  'results':          '/admin/results',
  'data-maintenance': '/admin/data-maintenance',
  'courses':          '/admin/courses',
  'interview-prep':   '/admin/interview-prep',
};

const pathToView: Record<string, AdminView> = {
  '/admin':                   'dashboard',
  '/admin/users':             'users',
  '/admin/tests':             'tests',
  '/admin/tests/create':      'create-test',
  '/admin/tests/edit':        'edit-test',
  '/admin/results':           'results',
  '/admin/data-maintenance':  'data-maintenance',
  '/admin/courses':           'courses',
  '/admin/interview-prep':    'interview-prep',
};

interface AdminDashboardProps {
  adminName: string;
  onLogout: () => void;
}

interface DashboardStats {
  totalUsers: number;
  activeTests: number;
  completedTests: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminName, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentView: AdminView = pathToView[location.pathname] ?? 'dashboard';
  const setCurrentView = (view: AdminView) => navigate(viewToPath[view]);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeTests: 0,
    completedTests: 0,
  });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  useEffect(() => {
    if (currentView === 'dashboard') {
      loadStats();
    }
  }, [location.pathname]);

  const loadStats = async () => {
    try {
      const res = await apiGet<DashboardStats>('/admin/dashboard-stats');
      setStats(res);
    } catch (e) {
      console.error('Failed to load dashboard stats:', e);
    }
  };

  const handleEditTest = (testId: string) => {
    setEditingTestId(testId);
    setCurrentView('edit-test');
  };

  const handleBackToTests = () => {
    setEditingTestId(null);
    setCurrentView('tests');
  };

  const resetPasswordModal = () => {
    setShowChangePassword(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangingPassword(false);
  };

  const renderView = () => {
    switch (currentView) {
      case 'users':
        return <UserManagement />;
      case 'create-test':
        return <TestBuilder onBack={() => setCurrentView('tests')} />;
      case 'edit-test':
        return editingTestId ? (
          <TestEditor testId={editingTestId} onBack={handleBackToTests} />
        ) : null;
      case 'tests':
        return <TestList onCreateNew={() => setCurrentView('create-test')} onEditTest={handleEditTest} />;
      case 'results':
        return <TestResults />;
      case 'data-maintenance':
        return <DataMaintenance />;
      case 'courses':
        return <CourseManagement />;
      case 'interview-prep':
        return <AdminInterviewPrep />;
      default:
        return (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <span className="dashboard-title">Admin Portal</span>
              </div>
              <div className="dashboard-topbar-right">
                {today}
              </div>
            </div>

            <div className="dashboard-home">
              <h2>Welcome, {adminName}</h2>
              <p className="subtitle">Manage tests, users, and monitor system performance</p>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon" aria-hidden="true">
                    <AppIcon name="users" className="stat-icon-svg" />
                  </div>
                  <div className="stat-info">
                    <h3>Total Users</h3>
                    <p className="stat-number">{stats.totalUsers}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" aria-hidden="true">
                    <AppIcon name="tests" className="stat-icon-svg" />
                  </div>
                  <div className="stat-info">
                    <h3>Active Tests</h3>
                    <p className="stat-number">{stats.activeTests}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" aria-hidden="true">
                    <AppIcon name="completed" className="stat-icon-svg" />
                  </div>
                  <div className="stat-info">
                    <h3>Completed Tests</h3>
                    <p className="stat-number">{stats.completedTests}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <img
            src="/assets/emax-logo.png"
            alt="Emax Technologies"
            className="sidebar-logo"
            style={{ height: '56px', maxWidth: '140px', objectFit: 'contain', display: 'block', marginBottom: '0.75rem' }}
          />
          <span className="admin-badge">Admin</span>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <AppIcon name="dashboard" className="nav-icon" />
            Dashboard
          </button>
          <button
            className={`nav-item ${currentView === 'users' ? 'active' : ''}`}
            onClick={() => setCurrentView('users')}
          >
            <AppIcon name="users" className="nav-icon" />
            Users
          </button>
          <button
            className={`nav-item ${currentView === 'tests' || currentView === 'create-test' || currentView === 'edit-test' ? 'active' : ''}`}
            onClick={() => setCurrentView('tests')}
          >
            <AppIcon name="tests" className="nav-icon" />
            Tests
          </button>
          <button
            className={`nav-item ${currentView === 'results' ? 'active' : ''}`}
            onClick={() => setCurrentView('results')}
          >
            <AppIcon name="results" className="nav-icon" />
            Test Results
          </button>
          <button
            className={`nav-item ${currentView === 'courses' ? 'active' : ''}`}
            onClick={() => setCurrentView('courses')}
          >
            <AppIcon name="courses" className="nav-icon" />
            Courses
          </button>
          <button
            className={`nav-item ${currentView === 'interview-prep' ? 'active' : ''}`}
            onClick={() => setCurrentView('interview-prep')}
          >
            <AppIcon name="interview" className="nav-icon" />
            Interview Prep
          </button>
          <button
            className={`nav-item ${currentView === 'data-maintenance' ? 'active' : ''}`}
            onClick={() => setCurrentView('data-maintenance')}
          >
            <AppIcon name="maintenance" className="nav-icon" />
            Data Maintenance
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{adminName.charAt(0).toUpperCase()}</div>
            <span className="user-name">{adminName}</span>
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
      <main className="admin-main">
        {renderView()}
      </main>

      {showChangePassword && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Change Password</h3>

            <div className="form-group">
              <label>Current Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={{ paddingRight: "2.25rem", width: "100%", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
                  title={showOldPassword ? "Hide password" : "Show password"}
                >
                  {showOldPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingRight: "2.25rem", width: "100%", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
                  title={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingRight: "2.25rem", width: "100%", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button className="secondary-btn" onClick={resetPasswordModal}>
                Cancel
              </button>

              <button
                className="primary-btn"
                disabled={changingPassword}
                onClick={async () => {
                  if (!oldPassword || !newPassword || !confirmPassword) {
                    alert('All fields are required');
                    return;
                  }

                  if (newPassword !== confirmPassword) {
                    alert('Passwords do not match');
                    return;
                  }

                  try {
                    setChangingPassword(true);
                    await apiPost('/auth/change-password', {
                      userId: adminName,
                      role: 'admin',
                      oldPassword,
                      newPassword,
                    });

                    alert('Password changed successfully');
                    resetPasswordModal();
                  } catch (err: any) {
                    alert(err?.message || 'Failed to change password');
                  } finally {
                    setChangingPassword(false);
                  }
                }}
              >
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
