import React, { useState, useEffect, useCallback } from 'react';
import './Modal.css';

const InviteModal = ({ isOpen, onClose, workspace, onInviteSent }) => {
  const [inviteMethod, setInviteMethod] = useState('email');
  const [emailInput, setEmailInput] = useState('');
  const [invitedEmails, setInvitedEmails] = useState([]);
  const [role, setRole] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteCode, setInviteCode] = useState(workspace?.inviteCode || '');
  const [currentMembers, setCurrentMembers] = useState([]);

  // Define fetchWorkspaceMembers with useCallback
  const fetchWorkspaceMembers = useCallback(async () => {
    if (!workspace?._id) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/rooms/${workspace._id}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  }, [workspace?._id]);

  // Load workspace members on open
  useEffect(() => {
    if (isOpen && workspace?._id) {
      fetchWorkspaceMembers();
    }
  }, [isOpen, workspace, fetchWorkspaceMembers]);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAddEmail = () => {
    if (!emailInput.trim()) return;
    
    const email = emailInput.trim().toLowerCase();
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (invitedEmails.includes(email)) {
      setError('This email is already added');
      return;
    }
    
    // Check if email is already a member
    const isAlreadyMember = currentMembers.some(member => 
      member.user?.email?.toLowerCase() === email
    );
    
    if (isAlreadyMember) {
      setError('This user is already a member of this workspace');
      return;
    }
    
    setInvitedEmails([...invitedEmails, email]);
    setEmailInput('');
    setError('');
  };

  const handleRemoveEmail = (emailToRemove) => {
    setInvitedEmails(invitedEmails.filter(email => email !== emailToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleEmailInvite = async (e) => {
    e.preventDefault();
    if (invitedEmails.length === 0) {
      setError('Please add at least one email address');
      return;
    }

    if (!workspace?._id) {
      setError('Workspace not found');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/rooms/${workspace._id}/invite-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          emails: invitedEmails,
          role: role
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const message = result.sent.length > 0 
          ? `Invitations sent to ${result.sent.length} user(s)` 
          : 'No invitations sent';
        
        setSuccess(message);
        
        if (result.failed && result.failed.length > 0) {
          const failedMessages = result.failed.map(f => `${f.email}: ${f.reason}`).join(', ');
          setError(`Some failed: ${failedMessages}`);
        }
        
        if (onInviteSent) {
          onInviteSent(result.sent.length);
        }
        
        // Refresh members list
        fetchWorkspaceMembers();
        
        // Reset emails after success
        setTimeout(() => {
          if (result.sent.length > 0) {
            setInvitedEmails([]);
            setSuccess('');
            onClose();
          }
        }, 2000);
      } else {
        setError(result.message || 'Failed to send invitations');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!workspace?._id) {
      setError('Workspace not found');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/rooms/${workspace._id}/share-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setInviteCode(result.shareLink);
        setSuccess('Share link generated!');
      } else {
        setError(result.message || 'Failed to generate share link');
      }
    } catch (err) {
      setError('Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const inviteLink = `http://localhost:3000/join/${inviteCode}`;
    navigator.clipboard.writeText(inviteLink).catch(() => {
      // Fallback for non-HTTPS contexts
      const textarea = document.createElement('textarea');
      textarea.value = inviteLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
    setSuccess('Share link copied to clipboard!');
  };

  const handleClose = () => {
    setEmailInput('');
    setInvitedEmails([]);
    setError('');
    setSuccess('');
    setInviteMethod('email');
    onClose();
  };

  // Early return with null check
  if (!isOpen || !workspace) return null;

  // Get workspace type safely
  const workspaceType = workspace.type || 'document';
  const workspaceName = workspace.name || 'Workspace';

  const roleOptions = [
    { value: 'editor', label: 'Editor', description: 'Can edit and invite' },
    { value: 'viewer', label: 'Viewer', description: 'Can view only' }
  ];

  return (
    <div className="modal-overlay">
      <div className="modal invite-modal">
        <div className="modal-header">
          <div className="header-left">
            <h2>Invite to {workspaceName}</h2>
            <span className="workspace-type">
              {workspaceType.charAt(0).toUpperCase() + workspaceType.slice(1)} Workspace
            </span>
          </div>
          <button className="close-button" onClick={handleClose} disabled={loading}>
            ✕
          </button>
        </div>
        
        <div className="modal-body">
          {error && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="alert alert-success">
              <span>✅</span>
              <span>{success}</span>
            </div>
          )}
          
          <div className="invite-methods">
            <div className="method-tabs">
              <button
                className={`method-tab ${inviteMethod === 'email' ? 'active' : ''}`}
                onClick={() => setInviteMethod('email')}
                disabled={loading}
              >
                <span className="tab-icon">📧</span>
                <span className="tab-text">Email Invitation</span>
              </button>
              <button
                className={`method-tab ${inviteMethod === 'link' ? 'active' : ''}`}
                onClick={() => setInviteMethod('link')}
                disabled={loading}
              >
                <span className="tab-icon">🔗</span>
                <span className="tab-text">Shareable Link</span>
              </button>
            </div>
            
            {/* Email Invitation Section */}
            {inviteMethod === 'email' && (
              <div className="invite-section">
                <div className="section-description">
                  <p>Invite team members by email address. They'll receive an invitation email.</p>
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    Email Addresses
                    <span className="label-hint">Add multiple emails separated by commas</span>
                  </label>
                  
                  <div className="email-input-wrapper">
                    <input
                      type="email"
                      className="form-input"
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        if (error) setError('');
                      }}
                      onKeyDown={handleKeyPress}
                      placeholder="colleague@example.com"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="btn-add-email"
                      onClick={handleAddEmail}
                      disabled={loading || !emailInput.trim()}
                    >
                      Add
                    </button>
                  </div>
                  
                  {invitedEmails.length > 0 && (
                    <div className="email-tags-container">
                      <div className="email-tags">
                        {invitedEmails.map(email => (
                          <div key={email} className="email-tag">
                            <span className="email-text">{email}</span>
                            <button
                              type="button"
                              className="tag-remove"
                              onClick={() => handleRemoveEmail(email)}
                              disabled={loading}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="email-count">
                        {invitedEmails.length} email{invitedEmails.length !== 1 ? 's' : ''} added
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Permission Level</label>
                  <div className="role-selection">
                    {roleOptions.map(option => (
                      <label key={option.value} className="role-option">
                        <input
                          type="radio"
                          name="role"
                          value={option.value}
                          checked={role === option.value}
                          onChange={(e) => setRole(e.target.value)}
                          disabled={loading}
                        />
                        <div className="role-content">
                          <div className="role-header">
                            <span className="role-label">{option.label}</span>
                            <div className={`role-badge ${option.value}`}>
                              {option.value}
                            </div>
                          </div>
                          <p className="role-description">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <button 
                  type="button"
                  className="btn btn-primary send-invites-btn"
                  onClick={handleEmailInvite}
                  disabled={loading || invitedEmails.length === 0}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">✉️</span>
                      Send Invitations
                    </>
                  )}
                </button>
                
                <div className="invite-info">
                  <div className="info-icon">💡</div>
                  <div className="info-content">
                    <p><strong>How email invitations work:</strong></p>
                    <ul>
                      <li>Invited users receive an email with a secure join link</li>
                      <li>They need to login or signup to accept</li>
                      <li>Invitations expire in 7 days</li>
                      <li>You can resend invitations anytime</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {/* Shareable Link Section */}
            {inviteMethod === 'link' && (
              <div className="invite-section">
                <div className="section-description">
                  <p>Generate a shareable link that anyone can use to join this workspace.</p>
                </div>
                
                <div className="link-section">
                  <div className="link-preview">
                    <div className="link-label">Shareable Link:</div>
                    <div className="link-display">
                      <code className="link-code">
                        http://localhost:3000/join/{inviteCode || 'generating...'}
                      </code>
                    </div>
                  </div>
                  
                  <div className="link-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={copyToClipboard}
                      disabled={!inviteCode || loading}
                    >
                      <span className="btn-icon">📋</span>
                      Copy Link
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={handleGenerateLink}
                      disabled={loading}
                    >
                      <span className="btn-icon">🔄</span>
                      {inviteCode ? 'Regenerate Link' : 'Generate Link'}
                    </button>
                  </div>
                  
                  <div className="link-info">
                    <div className="info-icon">🔗</div>
                    <div className="info-content">
                      <p><strong>How share links work:</strong></p>
                      <ul>
                        <li>Anyone with this link can join the workspace</li>
                        <li>No email invitation required</li>
                        <li>Regenerating creates a new link and invalidates the old one</li>
                        <li>Useful for public collaboration</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Current Members Section */}
          <div className="current-members-section">
            <h3 className="section-title">
              Current Members ({currentMembers.length})
            </h3>
            
            <div className="members-list">
              {currentMembers.length === 0 ? (
                <div className="no-members">
                  <div className="no-members-icon">👥</div>
                  <p>No members yet. Invite someone to collaborate!</p>
                </div>
              ) : (
                currentMembers.map((member, index) => (
                  <div key={member.user?._id || index} className="member-item">
                    <div className="member-avatar" style={{ backgroundColor: member.user?.color || '#3B82F6' }}>
                      {member.user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="member-info">
                      <div className="member-name">
                        <span>{member.user?.username || 'Unknown User'}</span>
                        {member.role === 'owner' && <span className="owner-badge">👑 Owner</span>}
                      </div>
                      <div className="member-details">
                        <span className="member-email">{member.user?.email || 'No email'}</span>
                        <span className="member-role-badge" data-role={member.role}>
                          {member.role || 'member'}
                        </span>
                      </div>
                    </div>
                    <div className="member-status">
                      {member.user?.isOnline && <span className="online-dot"></span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Close
          </button>
          
          {inviteMethod === 'link' && inviteCode && (
            <button
              className="btn btn-primary"
              onClick={copyToClipboard}
              disabled={loading}
            >
              <span className="btn-icon">🔗</span>
              Copy & Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteModal;