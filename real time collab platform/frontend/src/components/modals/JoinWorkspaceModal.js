import React, { useState } from 'react';
import './JoinWorkspaceModal.css';

const JoinWorkspaceModal = ({ isOpen, onClose, onJoin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if there's an invitation for this email
      const result = await onJoin(email);
      
      if (result.success) {
        setSuccess('Invitation accepted! Loading workspace...');
        setTimeout(() => {
          onClose();
          setEmail('');
        }, 1500);
      } else {
        setError(result.error || 'No invitation found for this email');
      }
    } catch (err) {
      setError('Failed to join workspace. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccess('');
    onClose();
  };

  const handleRequestNewInvitation = () => {
    // This would open a contact form or trigger a different action
    alert('Please contact the workspace owner for a new invitation.');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay join-workspace-modal">
      <div className="modal-container">
        <div className="modal-card">
          {/* Header */}
          <div className="modal-header">
            <div className="header-content">
              <div className="header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M20 8v6" stroke="currentColor" strokeWidth="2"/>
                  <path d="M23 11h-6" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h2 className="modal-title">Join Workspace</h2>
            </div>
            <button className="close-button" onClick={handleClose} disabled={loading}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            <div className="modal-description">
              <p className="description-text">
                You've been invited to join a workspace. Enter the email address where you received the invitation.
              </p>
            </div>

            {error && (
              <div className="error-alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="success-alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleEmailSubmit}>
              <div className="form-group">
                <label className="form-label">
                  <span>Email Address</span>
                  <span className="required-star">*</span>
                </label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter the email where you received invitation"
                    required
                    disabled={loading}
                    className="form-input"
                  />
                  {email && (
                    <button 
                      type="button"
                      className="clear-input"
                      onClick={() => setEmail('')}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="form-hint">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  Enter the email address where you received the workspace invitation
                </div>
              </div>

              {/* Invitation Status */}
              <div className="invitation-status">
                <div className="status-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  <span>Invitation Details</span>
                </div>
                <div className="status-content">
                  <ul className="status-list">
                    <li>• Check your email for the invitation link</li>
                    <li>• Invitations are valid for 7 days</li>
                    <li>• You can accept one invitation per email</li>
                    <li>• Contact workspace owner for new invitation</li>
                  </ul>
                </div>
              </div>

              {/* Troubleshoot Section */}
              <div className="troubleshoot-section">
                <details className="troubleshoot-details">
                  <summary className="troubleshoot-summary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <span>Not seeing your invitation?</span>
                  </summary>
                  <div className="troubleshoot-content">
                    <ol className="troubleshoot-steps">
                      <li>1. Check your spam or junk folder</li>
                      <li>2. Ensure you're using the correct email address</li>
                      <li>3. Contact the workspace owner for a new invitation</li>
                      <li>4. Ask them to verify your email address</li>
                    </ol>
                  </div>
                </details>
              </div>

              <div className="modal-actions">
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !email.trim()}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Checking...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      Accept Invitation
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Alternative Options */}
            <div className="alternative-options">
              <div className="divider">
                <span>OR</span>
              </div>
              <div className="alternative-buttons">
                <button 
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setEmail('');
                    setError('');
                  }}
                  disabled={loading}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"/>
                  </svg>
                  Check Different Email
                </button>
                <button 
                  type="button"
                  className="btn btn-outline"
                  onClick={handleRequestNewInvitation}
                  disabled={loading}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Request New Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinWorkspaceModal;