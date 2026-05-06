import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import TestBuilder from './TestBuilder';
import TestEditor from './TestEditor';
import TestList from './TestList';
import TestResults from './TestResults';
import DataMaintenance from './DataMaintenance';
import CourseManagement from './CourseManagement';
import './AdminDashboard.css';
import { apiGet } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';

type AdminView = 'dashboard' | 'users' | 'create-test' | 'edit-test' | 'tests' | 'results' | 'data-maintenance' | 'courses';

const viewToPath: Record<AdminView, string> = {
  'dashboard':        '/admin',
  'users':            '/admin/users',
  'tests':            '/admin/tests',
  'create-test':      '/admin/tests/create',
  'edit-test':        '/admin/tests/edit',
  'results':          '/admin/results',
  'data-maintenance': '/admin/data-maintenance',
  'courses':          '/admin/courses',
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
              <h2>Welcome, {adminName} 👋</h2>
              <p className="subtitle">Manage tests, users, and monitor system performance</p>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h3>Total Users</h3>
                    <p className="stat-number">{stats.totalUsers}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📝</div>
                  <div className="stat-info">
                    <h3>Active Tests</h3>
                    <p className="stat-number">{stats.activeTests}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
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
            <span className="nav-icon">📊</span>
            Dashboard
          </button>
          <button
            className={`nav-item ${currentView === 'users' ? 'active' : ''}`}
            onClick={() => setCurrentView('users')}
          >
            <span className="nav-icon">👥</span>
            Users
          </button>
          <button
            className={`nav-item ${currentView === 'tests' || currentView === 'create-test' || currentView === 'edit-test' ? 'active' : ''}`}
            onClick={() => setCurrentView('tests')}
          >
            <span className="nav-icon">📝</span>
            Tests
          </button>
          <button
            className={`nav-item ${currentView === 'results' ? 'active' : ''}`}
            onClick={() => setCurrentView('results')}
          >
            <span className="nav-icon">📈</span>
            Test Results
          </button>
          <button
            className={`nav-item ${currentView === 'courses' ? 'active' : ''}`}
            onClick={() => setCurrentView('courses')}
          >
            <span className="nav-icon">📚</span>
            Courses
          </button>
          <button
            className={`nav-item ${currentView === 'data-maintenance' ? 'active' : ''}`}
            onClick={() => setCurrentView('data-maintenance')}
          >
            <span className="nav-icon">🗂️</span>
            Data Maintenance
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{adminName.charAt(0).toUpperCase()}</div>
            <span className="user-name">{adminName}</span>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="admin-main">
        {renderView()}
      </main>
    </div>
  );
};

export default AdminDashboard;
