import React, { useState } from 'react';
import { authAPI } from '../utils/api';
import './AuthPage.css';

const AuthPage = ({ setUser, setCurrentPage, socket }) => {
  const [authMode, setAuthMode] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate password confirmation
      if (authMode === 'register' && formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const apiData = {
        email: formData.email,
        password: formData.password,
        ...(authMode === 'register' && { username: formData.username })
      };

      const response = authMode === 'login' 
        ? await authAPI.login(apiData)
        : await authAPI.register(apiData);

      if (response.success) {
        // Save token and user data
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Set user and navigate
        setUser(response.user);
        setCurrentPage('dashboard');
        
        // Authenticate socket
        if (socket.connected) {
          socket.emit('authenticate', response.token);
        }
      } else {
        throw new Error(response.error || 'Authentication failed');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    // Demo credentials
    setFormData({
      email: 'demo@example.com',
      password: 'password',
      username: '',
      confirmPassword: ''
    });
    setAuthMode('login');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="text-gradient">🚀 CollabSpace</h1>
          <p>Real-time collaboration made simple</p>
        </div>

        <div className="auth-card glass-effect">
          <div className="auth-tabs">
            <button
              className={`tab-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
              disabled={loading}
            >
              Sign In
            </button>
            <button
              className={`tab-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => setAuthMode('register')}
              disabled={loading}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {authMode === 'register' && (
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="Choose a username"
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Enter your password"
                required
                minLength="6"
                disabled={loading}
              />
            </div>

            {authMode === 'register' && (
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  placeholder="Confirm your password"
                  required
                  minLength="6"
                  disabled={loading}
                />
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  Processing...
                </>
              ) : authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <div className="demo-section">
              <p>Want to try without account?</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDemoLogin}
                disabled={loading}
              >
                Use Demo Account
              </button>
            </div>
          </form>

          <div className="auth-footer">
            <p>
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                className="link-btn"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                disabled={loading}
              >
                {authMode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">💻</div>
            <h3>Code Editor</h3>
            <p>Real-time collaborative coding with syntax highlighting</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Documents</h3>
            <p>Rich text editing with live collaboration</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3>Whiteboard</h3>
            <p>Draw and brainstorm together in real-time</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Spreadsheets</h3>
            <p>Collaborative data analysis and calculations</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;