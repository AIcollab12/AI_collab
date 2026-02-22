import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthCallback = ({ onLogin }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const user = urlParams.get('user');
    
    if (token && user) {
      try {
        const userData = JSON.parse(decodeURIComponent(user));
        userData.token = token;
        onLogin(userData);
        navigate('/dashboard');
      } catch (err) {
        navigate('/login?error=oauth_failed');
      }
    } else {
      navigate('/login');
    }
  }, [navigate, onLogin]);

  return (
    <div className="auth-callback">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <p>Completing login...</p>
      </div>
    </div>
  );
};

export default AuthCallback;