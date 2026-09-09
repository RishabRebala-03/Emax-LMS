import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import AnswererDashboard from './components/AnswererDashboard';
import './App.css';
import { apiGet } from './services/api';

type UserRole = 'admin' | 'answerer';

function App() {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<string>('');
  const navigate = useNavigate();

  // Prevent copying content from the portal UI. Cross-origin embeds such as
  // YouTube remain controlled by their own browser security boundary.
  useEffect(() => {
    const block = (event: Event) => event.preventDefault();
    const blockShortcuts = (event: KeyboardEvent) => {
      if (typeof event.key !== 'string') return;
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && (key === 'c' || key === 'x' || key === 'a')) {
        event.preventDefault();
      }
    };

    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('contextmenu', block);
    document.addEventListener('selectstart', block);
    document.addEventListener('dragstart', block);
    document.addEventListener('keydown', blockShortcuts);
    return () => {
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('selectstart', block);
      document.removeEventListener('dragstart', block);
      document.removeEventListener('keydown', blockShortcuts);
    };
  }, []);

  // Restore session on refresh
  useEffect(() => {
    const savedRole = sessionStorage.getItem('role') as UserRole | null;
    const savedUser = sessionStorage.getItem('userId');
    if (savedRole && savedUser) {
      setCurrentRole(savedRole);
      setCurrentUser(savedUser);
    }
  }, []);

  const handleLogin = (role: UserRole, userId: string, sessionToken?: string) => {
    sessionStorage.setItem('role', role);
    sessionStorage.setItem('userId', userId);
    if (sessionToken) {
      sessionStorage.setItem('sessionToken', sessionToken);
    }
    setCurrentRole(role);
    setCurrentUser(userId);
    navigate(role === 'admin' ? '/admin' : '/dashboard');
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setCurrentRole(null);
    setCurrentUser('');
    navigate('/login');
  };

  // A new login replaces the token in MongoDB. Older browsers discover that
  // replacement here and are returned to the login screen.
  useEffect(() => {
    if (!currentRole || !currentUser) return;
    const token = sessionStorage.getItem('sessionToken');
    if (!token) return;

    const check = async () => {
      try {
        const res = await apiGet<{ valid: boolean }>(`/auth/session?userId=${encodeURIComponent(currentUser)}&role=${currentRole}`);
        if (res && res.valid === false) {
          handleLogout();
        }
      } catch (err: any) {
        // Only log out if explicitly unauthorized (401 / 403), NOT on transient network glitches
        if (err && (err.status === 401 || err.status === 403)) {
          handleLogout();
        }
      }
    };
    const timer = window.setInterval(check, 5000);
    return () => window.clearInterval(timer);
  }, [currentRole, currentUser]);

  const isLoggedIn = !!currentRole && !!currentUser;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isLoggedIn
            ? <Navigate to={currentRole === 'admin' ? '/admin' : '/dashboard'} replace />
            : <Login onLogin={handleLogin} />
        }
      />
      <Route
        path="/admin/*"
        element={
          isLoggedIn && currentRole === 'admin'
            ? <AdminDashboard adminName={currentUser} onLogout={handleLogout} />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/dashboard/*"
        element={
          isLoggedIn && currentRole === 'answerer'
            ? <AnswererDashboard userName={currentUser} onLogout={handleLogout} />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="*"
        element={
          <Navigate to={isLoggedIn ? (currentRole === 'admin' ? '/admin' : '/dashboard') : '/login'} replace />
        }
      />
    </Routes>
  );
}

export default App;
