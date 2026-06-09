import React, { useState } from 'react';
import './Login.css';
import { apiPost } from "../services/api";
import StudentRegistration from './StudentRegistration';
import AppIcon from './AppIcons';

type UserRole = 'admin' | 'answerer';

interface LoginProps {
  onLogin: (role: UserRole, userId: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('answerer');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password) return;
    setIsLoading(true);
    try {
      const res = await apiPost<{ user: any }>("/auth/login", {
        userId,
        password,
        role: selectedRole,
      });
      onLogin(res.user.role, res.user.userId);
    } catch (err: any) {
      const msg: string = err?.message || err?.error || "";
      if (msg.toLowerCase().includes("inactive")) {
        alert("Account Inactive\n\nYour account has been deactivated. Please contact your administrator to regain access.");
      } else {
        alert("Invalid credentials. Please check your User ID and password.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showRegister) {
    return (
      <StudentRegistration
        onBack={() => setShowRegister(false)}
        onSuccess={() => setShowRegister(false)}
      />
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo-container">
          <img
            src="/assets/emax-logo.png"
            alt="Emax Technologies"
            className="login-logo"
          />
        </div>

        <div className="login-header">
          <h1 className="login-title">Online Exam Portal</h1>
          <p className="login-subtitle">Select your role and sign in to continue</p>
        </div>

        <div className="role-selector">
          <button
            className={`role-btn ${selectedRole === 'answerer' ? 'active' : ''}`}
            onClick={() => setSelectedRole('answerer')}
            type="button"
          >
            <AppIcon name="users" className="role-icon" />
            <span className="role-label">Test Taker</span>
          </button>
          <button
            className={`role-btn ${selectedRole === 'admin' ? 'active' : ''}`}
            onClick={() => setSelectedRole('admin')}
            type="button"
          >
            <AppIcon name="admin" className="role-icon" />
            <span className="role-label">Administrator</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="userId">User ID</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your user ID"
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="security-badge">
          <AppIcon name="security" className="security-icon" />
          <span>Secure authentication</span>
        </div>

        <div className="login-footer">
          {selectedRole === 'answerer' ? (
            <p>
              New student?{' '}
              <button
                className="login-register-link"
                onClick={() => setShowRegister(true)}
                type="button"
              >
                Register here
              </button>
            </p>
          ) : (
            <p>Need help? <a href="#support">Contact support</a></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
