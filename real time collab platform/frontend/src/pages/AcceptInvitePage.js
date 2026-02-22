import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './AcceptInvitePage.css';

const AcceptInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (token) {
      fetchInvitationDetails();
    }
  }, [token]);

  const fetchInvitationDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/invitations/details/${token}`);
      const result = await response.json();
      
      if (result.success) {
        setInvitation(result.invitation);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    const userToken = localStorage.getItem('token');
    
    if (!userToken) {
      // Redirect to login with invitation token
      localStorage.setItem('invitationToken', token);
      navigate('/login', { state: { invitationToken: token } });
      return;
    }

    setAccepting(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ token })
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(result.message);
        
        // Redirect to workspace after 2 seconds
        setTimeout(() => {
          navigate(`/workspace/${result.room.id}`);
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleLogin = () => {
    localStorage.setItem('invitationToken', token);
    navigate('/login');
  };

  const handleSignup = () => {
    localStorage.setItem('invitationToken', token);
    navigate('/signup');
  };

  if (loading) {
    return (
      <div className="accept-invite-page">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading invitation details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="accept-invite-page">
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h2>Invitation Error</h2>
          <p>{error}</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/')}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="accept-invite-page">
        <div className="error-container">
          <div className="error-icon">🔍</div>
          <h2>Invitation Not Found</h2>
          <p>The invitation link is invalid or has expired.</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/')}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <div className="accept-invite-page">
      <div className="invitation-card">
        <div className="invitation-header">
          <div className="header-icon">🎉</div>
          <h1>You're Invited!</h1>
          <p className="subtitle">Join a collaborative workspace</p>
        </div>

        <div className="invitation-content">
          <div className="workspace-info">
            <div className="workspace-icon">
              {invitation.roomType === 'code' && '💻'}
              {invitation.roomType === 'document' && '📄'}
              {invitation.roomType === 'whiteboard' && '🎨'}
              {invitation.roomType === 'spreadsheet' && '📊'}
            </div>
            <div className="workspace-details">
              <h2>{invitation.roomName}</h2>
              <div className="workspace-type">
                {invitation.roomType.charAt(0).toUpperCase() + invitation.roomType.slice(1)} Workspace
              </div>
            </div>
          </div>

          <div className="inviter-info">
            <div className="avatar">
              {invitation.inviterAvatar ? (
                <img src={invitation.inviterAvatar} alt={invitation.inviterName} />
              ) : (
                <div className="avatar-placeholder">
                  {invitation.inviterName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="inviter-details">
              <p className="invited-by">Invited by</p>
              <h3>{invitation.inviterName}</h3>
              <p className="inviter-email">{invitation.inviterEmail}</p>
            </div>
          </div>

          <div className="invitation-details">
            <div className="detail-item">
              <span className="detail-label">Invited Email:</span>
              <span className="detail-value">{invitation.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Permission:</span>
              <span className={`permission-badge ${invitation.role}`}>
                {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Invited on:</span>
              <span className="detail-value">
                {new Date(invitation.invitedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Expires in:</span>
              <span className="detail-value">
                {invitation.expiresIn} day{invitation.expiresIn !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {success && (
            <div className="success-message">
              <div className="success-icon">✅</div>
              <p>{success}</p>
              <p>Redirecting to workspace...</p>
            </div>
          )}

          {!success && (
            <div className="action-buttons">
              {isLoggedIn ? (
                <button
                  className="btn btn-accept"
                  onClick={handleAccept}
                  disabled={accepting}
                >
                  {accepting ? (
                    <>
                      <span className="spinner"></span>
                      Accepting...
                    </>
                  ) : (
                    'Accept Invitation'
                  )}
                </button>
              ) : (
                <div className="login-prompt">
                  <p>You need to login or sign up to accept this invitation</p>
                  <div className="auth-buttons">
                    <button className="btn btn-login" onClick={handleLogin}>
                      Login
                    </button>
                    <button className="btn btn-signup" onClick={handleSignup}>
                      Sign Up
                    </button>
                  </div>
                </div>
              )}
              
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/')}
                disabled={accepting}
              >
                Decline
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitePage;