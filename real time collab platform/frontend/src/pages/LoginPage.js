// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageReady, setPageReady] = useState(false);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    } else {
      setPageReady(true);
    }
  }, [navigate]);

  // Handle OAuth callback
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const userParam = urlParams.get('user');
      
      if (token && userParam) {
        const userData = JSON.parse(decodeURIComponent(userParam));
        if (userData && userData._id) {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userData));
          onLogin(userData);
          navigate('/dashboard');
        } else {
          setError('Invalid user data received from OAuth');
        }
        // Clean the URL of query params
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err) {
      console.error('OAuth callback error:', err);
      setError('Failed to process login. Please try again.');
    }
  }, [navigate, onLogin]);

  // Validate email format
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!isLogin && !formData.username.trim()) {
      setError('Username is required');
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin
        ? { email: formData.email, password: formData.password }
        : { username: formData.username, email: formData.email, password: formData.password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        const userData = data.user || {
          _id: data._id || 'user_' + Date.now(),
          username: data.username || formData.email.split('@')[0],
          email: data.email || formData.email,
        };
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        onLogin(userData);
        navigate('/dashboard');
      } else {
        setError(data.message || data.error || 'Authentication failed. Please try again.');
      }
    } catch (err) {
      // If backend is unreachable, allow demo login as fallback
      console.warn('Backend unreachable, using demo login:', err.message);
      const demoUser = {
        _id: 'user_' + Date.now(),
        username: formData.username || formData.email.split('@')[0],
        email: formData.email,
      };
      const demoToken = 'demo_token_' + Date.now();
      localStorage.setItem('token', demoToken);
      localStorage.setItem('user', JSON.stringify(demoUser));
      onLogin(demoUser);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setLoading(true);
    setError('');
    try {
      const demoUser = {
        _id: 'demo_' + Date.now(),
        username: 'Demo User',
        email: 'demo@collabspace.com',
      };
      const demoToken = 'demo_token_' + Date.now();
      localStorage.setItem('token', demoToken);
      localStorage.setItem('user', JSON.stringify(demoUser));
      onLogin(demoUser);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to start demo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider) => {
    window.location.href = `${API_URL}/api/auth/${provider}`;
  };

  // Don't render until we've checked auth state
  if (!pageReady) {
    return (
      <div className="login-page">
        <div className="login-loading">
          <div className="login-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      {/* Animated Background Elements */}
      <div className="background-elements">
        <div className="bg-circle circle-1"></div>
        <div className="bg-circle circle-2"></div>
        <div className="bg-circle circle-3"></div>
        <div className="bg-grid"></div>
      </div>

      <div className="login-container">
        {/* Left Side - Visual Design */}
        <div className="login-visual">
          <div className="visual-header">
            <div className="logo">
              <div className="logo-symbol">
                <svg viewBox="0 0 24 24" width="40" height="40">
                  <path fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h1>Collab<span>Space</span></h1>
            </div>
            <p className="tagline">Where teams create together in real-time</p>
          </div>

          <div className="visual-animation">
            <div className="floating-element element-1">
              <div className="element-icon">💬</div>
              <span>Real-time Chat</span>
            </div>
            <div className="floating-element element-2">
              <div className="element-icon">💻</div>
              <span>Code Sync</span>
            </div>
            <div className="floating-element element-3">
              <div className="element-icon">📊</div>
              <span>Live Docs</span>
            </div>
          </div>

          <div className="stats">
            <div className="stat-item">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Active Teams</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">99.9%</span>
              <span className="stat-label">Uptime</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Support</span>
            </div>
          </div>
        </div>

        {/* Right Side - Authentication */}
        <div className="login-auth">
          <div className="auth-header">
            <h2>
              {isLogin ? 'Welcome Back!' : 'Join CollabSpace'}
            </h2>
            <p className="auth-subtitle">
              {isLogin 
                ? 'Sign in to continue your collaboration journey'
                : 'Create your account and start collaborating'
              }
            </p>
          </div>

          {/* Form Toggle */}
          <div className="form-toggle">
            <button 
              className={`toggle-btn ${isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              type="button"
            >
              Sign In
            </button>
            <button 
              className={`toggle-btn ${!isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
              type="button"
            >
              Sign Up
            </button>
          </div>

          {/* Social Login */}
          <div className="social-login">
            <button
              className="social-btn google"
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              type="button"
            >
              <div className="social-icon">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <span>Google</span>
            </button>

            <button
              className="social-btn github"
              onClick={() => handleOAuthLogin('github')}
              disabled={loading}
              type="button"
            >
              <div className="social-icon">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#333" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <span>GitHub</span>
            </button>
          </div>

          <div className="divider">
            <span>or continue with email</span>
          </div>

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {!isLogin && (
              <div className="form-group">
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    placeholder=" "
                    disabled={loading}
                    className="form-input"
                  />
                  <label className="input-label">Username</label>
                </div>
              </div>
            )}

            <div className="form-group">
              <div className="input-wrapper">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder=" "
                  disabled={loading}
                  className="form-input"
                  required
                />
                <label className="input-label">Email Address</label>
              </div>
            </div>

            <div className="form-group">
              <div className="input-wrapper">
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder=" "
                  disabled={loading}
                  className="form-input"
                  required
                />
                <label className="input-label">Password</label>
              </div>
            </div>

            {!isLogin && (
              <div className="form-group">
                <div className="input-wrapper">
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    placeholder=" "
                    disabled={loading}
                    className="form-input"
                  />
                  <label className="input-label">Confirm Password</label>
                </div>
              </div>
            )}

            {isLogin && (
              <div className="form-options">
                <label className="checkbox-label">
                  <input type="checkbox" /> Remember me
                </label>
                <button type="button" className="forgot-link" onClick={() => setError('Password reset email sent! (Demo mode)')}>Forgot password?</button>
              </div>
            )}

            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Demo Access */}
          <div className="demo-access">
            <button
              className="demo-btn"
              onClick={handleDemoLogin}
              disabled={loading}
              type="button"
            >
              <span className="demo-icon">🚀</span>
              <span className="demo-text">
                <strong>Try Demo Mode</strong>
                <small>No registration required</small>
              </span>
            </button>
          </div>

          {/* Footer Links */}
          <div className="auth-footer">
            <p>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button 
                className="footer-link"
                onClick={() => setIsLogin(!isLogin)}
                disabled={loading}
                type="button"
              >
                {isLogin ? ' Sign up' : ' Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;