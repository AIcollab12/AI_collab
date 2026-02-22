// WorkspaceSettings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WorkspaceSettings.css';

const WorkspaceSettings = ({ workspace, user, onDeleteWorkspace, onUpdateWorkspace, onRemoveMember }) => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('general');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  
  // Form states
  const [workspaceData, setWorkspaceData] = useState({
    name: '',
    description: '',
    visibility: 'private'
  });

  // Color palette for workspace
  const workspaceColors = [
    { name: 'Blue', value: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' },
    { name: 'Purple', value: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' },
    { name: 'Pink', value: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)' },
    { name: 'Green', value: '#10B981', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' },
    { name: 'Orange', value: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' },
    { name: 'Red', value: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' },
    { name: 'Teal', value: '#06B6D4', gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' },
    { name: 'Indigo', value: '#6366F1', gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }
  ];

  // Initialize form data
  useEffect(() => {
    if (workspace) {
      setWorkspaceData({
        name: workspace.name || '',
        description: workspace.description || '',
        visibility: workspace.visibility || 'private',
        color: workspace.owner?.color || '#3B82F6'
      });
    }
  }, [workspace]);

  if (!workspace || !user) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading workspace settings...</p>
        </div>
      </div>
    );
  }

  const isOwner = workspace.owner._id === user._id;
  const workspaceColor = workspace.owner?.color || '#3B82F6';

  const handleUpdate = async () => {
    if (!workspaceData.name.trim()) {
      alert('Workspace name is required');
      return;
    }

    try {
      const result = await onUpdateWorkspace(workspace._id, workspaceData);
      
      if (result.success) {
        alert('🎉 Workspace updated successfully!');
      } else {
        alert(`❌ Failed to update: ${result.error}`);
      }
    } catch (error) {
      alert('❌ Error updating workspace');
      console.error('Update error:', error);
    }
  };

  const handleDelete = async () => {
    if (confirmName !== workspace.name) {
      alert(`Please type "${workspace.name}" exactly to confirm`);
      return;
    }

    const confirmed = window.confirm(
      `🚨 FINAL WARNING!\n\nThis will PERMANENTLY delete:\n• "${workspace.name}" workspace\n• All rooms & content\n• All member data\n\nThis cannot be undone. Continue?`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    
    try {
      const result = await onDeleteWorkspace(workspace._id);
      
      if (result.success) {
        alert('✅ Workspace deleted successfully!');
        navigate('/dashboard');
      } else {
        alert(`❌ Failed to delete: ${result.error}`);
      }
    } catch (error) {
      alert('❌ Error deleting workspace');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this workspace?`)) return;

    try {
      const result = await onRemoveMember(workspace._id, memberId);
      
      if (result.success) {
        alert(`👋 ${memberName} removed successfully`);
      } else {
        alert(`❌ Failed to remove: ${result.error}`);
      }
    } catch (error) {
      alert('❌ Error removing member');
      console.error('Remove error:', error);
    }
  };

  const getGradientFromColor = (color) => {
    const colorMap = {
      '#3B82F6': 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      '#8B5CF6': 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      '#EC4899': 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
      '#10B981': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      '#F59E0B': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      '#EF4444': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      '#06B6D4': 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      '#6366F1': 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
    };
    return colorMap[color] || colorMap['#3B82F6'];
  };

  const workspaceGradient = getGradientFromColor(workspaceColor);

  return (
    <div className="workspace-settings-page" style={{ background: workspaceGradient + ', linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      {/* Back Button */}
      <div className="settings-back-btn">
        <button onClick={() => navigate(-1)} className="back-button">
          <span className="back-icon">←</span>
          Back to Workspace
        </button>
      </div>

      <div className="settings-container">
        {/* Header */}
        <div className="settings-header">
          <div className="workspace-header-info">
            <div className="workspace-icon-large" style={{ background: workspaceGradient }}>
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <div className="header-text">
              <h1 className="workspace-title">{workspace.name}</h1>
              <p className="workspace-subtitle">Workspace Settings</p>
              <div className="workspace-stats">
                <span className="stat-item">👤 {workspace.members.length} members</span>
                <span className="stat-item">📁 {workspace.rooms?.length || 0} rooms</span>
                <span className="stat-item">📅 {new Date(workspace.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="settings-main-content">
          {/* Left Sidebar - Tabs */}
          <div className="settings-sidebar">
            <div className="sidebar-tabs">
              <button 
                className={`tab-item ${activeTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveTab('general')}
                style={activeTab === 'general' ? { background: workspaceColor } : {}}
              >
                <span className="tab-icon">⚙️</span>
                <span className="tab-text">General</span>
              </button>
              
              <button 
                className={`tab-item ${activeTab === 'members' ? 'active' : ''}`}
                onClick={() => setActiveTab('members')}
                style={activeTab === 'members' ? { background: workspaceColor } : {}}
              >
                <span className="tab-icon">👥</span>
                <span className="tab-text">Members</span>
              </button>
              
              <button 
                className={`tab-item ${activeTab === 'appearance' ? 'active' : ''}`}
                onClick={() => setActiveTab('appearance')}
                style={activeTab === 'appearance' ? { background: workspaceColor } : {}}
              >
                <span className="tab-icon">🎨</span>
                <span className="tab-text">Appearance</span>
              </button>
              
              <button 
                className={`tab-item ${activeTab === 'danger' ? 'active' : ''}`}
                onClick={() => setActiveTab('danger')}
                style={activeTab === 'danger' ? { background: '#EF4444' } : {}}
              >
                <span className="tab-icon">⚠️</span>
                <span className="tab-text">Danger Zone</span>
              </button>
            </div>

            <div className="sidebar-info">
              <div className="owner-card">
                <div className="owner-avatar" style={{ background: workspace.owner.color }}>
                  {workspace.owner.username?.charAt(0).toUpperCase()}
                </div>
                <div className="owner-info">
                  <h4>Workspace Owner</h4>
                  <p>{workspace.owner.username}</p>
                </div>
              </div>
              
              <div className="invite-section">
                <h4>Invite Code</h4>
                <div className="invite-code-display">
                  <code>{workspace.inviteCode}</code>
                  <button className="copy-btn" onClick={() => {
                    navigator.clipboard.writeText(workspace.inviteCode).catch(() => {
                      const textarea = document.createElement('textarea');
                      textarea.value = workspace.inviteCode;
                      document.body.appendChild(textarea);
                      textarea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textarea);
                    });
                    alert('Invite code copied!');
                  }}>
                    📋 Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="settings-content-area">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="tab-panel general-panel">
                <div className="panel-header">
                  <h2>General Settings</h2>
                  <p>Configure basic workspace information</p>
                </div>
                
                <div className="settings-form-card">
                  <div className="form-section">
                    <label className="form-label">
                      <span className="label-icon">🏷️</span>
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      className="form-input colorful"
                      value={workspaceData.name}
                      onChange={(e) => setWorkspaceData({...workspaceData, name: e.target.value})}
                      placeholder="Enter workspace name"
                      disabled={!isOwner}
                      style={{ borderColor: workspaceColor }}
                    />
                  </div>
                  
                  <div className="form-section">
                    <label className="form-label">
                      <span className="label-icon">📝</span>
                      Description
                    </label>
                    <textarea
                      className="form-textarea colorful"
                      value={workspaceData.description}
                      onChange={(e) => setWorkspaceData({...workspaceData, description: e.target.value})}
                      placeholder="Describe your workspace"
                      rows="4"
                      disabled={!isOwner}
                      style={{ borderColor: workspaceColor }}
                    />
                  </div>
                  
                  <div className="form-section">
                    <label className="form-label">
                      <span className="label-icon">🔒</span>
                      Privacy Settings
                    </label>
                    <div className="privacy-options">
                      <div className="privacy-option">
                        <input
                          type="radio"
                          id="private"
                          name="visibility"
                          value="private"
                          checked={workspaceData.visibility === 'private'}
                          onChange={(e) => setWorkspaceData({...workspaceData, visibility: e.target.value})}
                          disabled={!isOwner}
                        />
                        <label htmlFor="private" className="privacy-label">
                          <span className="privacy-icon">🔒</span>
                          <div className="privacy-text">
                            <strong>Private</strong>
                            <small>Only invited members can join</small>
                          </div>
                        </label>
                      </div>
                      
                      <div className="privacy-option">
                        <input
                          type="radio"
                          id="public"
                          name="visibility"
                          value="public"
                          checked={workspaceData.visibility === 'public'}
                          onChange={(e) => setWorkspaceData({...workspaceData, visibility: e.target.value})}
                          disabled={!isOwner}
                        />
                        <label htmlFor="public" className="privacy-label">
                          <span className="privacy-icon">🌍</span>
                          <div className="privacy-text">
                            <strong>Public</strong>
                            <small>Anyone can join with invite code</small>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {isOwner && (
                    <button 
                      className="save-button"
                      onClick={handleUpdate}
                      style={{ background: workspaceGradient }}
                    >
                      💾 Save Changes
                    </button>
                  )}
                  
                  {!isOwner && (
                    <div className="permission-alert">
                      <span className="alert-icon">⚠️</span>
                      Only workspace owners can modify these settings
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Members Settings */}
            {activeTab === 'members' && (
              <div className="tab-panel members-panel">
                <div className="panel-header">
                  <h2>Workspace Members</h2>
                  <p>Manage members and their permissions</p>
                </div>
                
                <div className="members-list-card">
                  <div className="members-header">
                    <span className="total-members">👥 {workspace.members.length} Members</span>
                    <button className="invite-button" style={{ background: workspaceGradient }}>
                      ✨ Invite People
                    </button>
                  </div>
                  
                  <div className="members-grid">
                    {workspace.members.map((member, index) => (
                      <div key={index} className="member-card" style={{ borderColor: member.user.color }}>
                        <div className="member-header">
                          <div className="member-avatar" style={{ background: member.user.color }}>
                            {member.user.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="member-badges">
                            {member.role === 'owner' && (
                              <span className="badge owner-badge">👑 Owner</span>
                            )}
                            {member.role === 'member' && (
                              <span className="badge member-badge">👤 Member</span>
                            )}
                            {member.user._id === user._id && (
                              <span className="badge you-badge">✨ You</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="member-info">
                          <h4>{member.user.username}</h4>
                          <p className="member-email">{member.user.email || 'No email'}</p>
                          <p className="member-joined">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="member-actions">
                          {isOwner && member.user._id !== user._id && (
                            <button
                              className="remove-button"
                              onClick={() => handleRemoveMember(member.user._id, member.user.username)}
                              style={{ borderColor: '#EF4444', color: '#EF4444' }}
                            >
                              🗑️ Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
              <div className="tab-panel appearance-panel">
                <div className="panel-header">
                  <h2>Workspace Appearance</h2>
                  <p>Customize the look and feel of your workspace</p>
                </div>
                
                <div className="appearance-card">
                  <div className="color-section">
                    <h3>Workspace Color Theme</h3>
                    <p>Choose a color that represents your workspace</p>
                    
                    <div className="color-palette">
                      {workspaceColors.map((color, index) => (
                        <div 
                          key={index}
                          className={`color-option ${workspaceData.color === color.value ? 'selected' : ''}`}
                          onClick={() => {
                            if (isOwner) {
                              setWorkspaceData({...workspaceData, color: color.value});
                            }
                          }}
                          style={{ background: color.gradient }}
                          title={color.name}
                        >
                          {workspaceData.color === color.value && (
                            <span className="check-icon">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="preview-section">
                    <h3>Preview</h3>
                    <div className="theme-preview" style={{ background: getGradientFromColor(workspaceData.color) }}>
                      <div className="preview-header">
                        <div className="preview-icon">
                          {workspace.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="preview-title">
                          <h4>{workspace.name}</h4>
                          <p>Your workspace with the new theme</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isOwner && (
                    <button 
                      className="apply-button"
                      onClick={handleUpdate}
                      style={{ background: workspaceGradient }}
                    >
                      🎨 Apply Theme
                    </button>
                  )}
                  
                  {!isOwner && (
                    <div className="theme-permission-alert">
                      <span className="alert-icon">🎨</span>
                      Only workspace owners can change the theme
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Danger Zone */}
            {activeTab === 'danger' && (
              <div className="tab-panel danger-panel">
                <div className="panel-header">
                  <h2>Danger Zone</h2>
                  <p>Irreversible actions that affect your entire workspace</p>
                </div>
                
                <div className="danger-card">
                  <div className="danger-icon">⚠️</div>
                  
                  {isOwner ? (
                    <div className="delete-section">
                      <h3>Delete Workspace</h3>
                      <p className="danger-description">
                        Once you delete a workspace, there is no going back. 
                        Please be certain. This will permanently remove:
                      </p>
                      
                      <div className="delete-list">
                        <div className="delete-item">
                          <span className="delete-icon">🗑️</span>
                          <span>All rooms and their content</span>
                        </div>
                        <div className="delete-item">
                          <span className="delete-icon">👥</span>
                          <span>All member data and permissions</span>
                        </div>
                        <div className="delete-item">
                          <span className="delete-icon">💾</span>
                          <span>All stored files and documents</span>
                        </div>
                        <div className="delete-item">
                          <span className="delete-icon">📊</span>
                          <span>All analytics and activity history</span>
                        </div>
                      </div>
                      
                      <div className="confirmation-box">
                        <p className="confirmation-text">
                          To confirm, type <strong>{workspace.name}</strong> below:
                        </p>
                        
                        <div className="workspace-name-display">
                          <code>"{workspace.name}"</code>
                        </div>
                        
                        <input
                          type="text"
                          value={confirmName}
                          onChange={(e) => setConfirmName(e.target.value)}
                          placeholder={`Type "${workspace.name}" here`}
                          className="confirmation-input"
                          disabled={isDeleting}
                          style={{ borderColor: confirmName === workspace.name ? '#10B981' : '#EF4444' }}
                        />
                        
                        <p className="confirmation-hint">
                          This action is permanent and cannot be undone
                        </p>
                      </div>
                      
                      <div className="delete-actions">
                        <button
                          onClick={handleDelete}
                          disabled={confirmName !== workspace.name || isDeleting}
                          className="delete-button"
                        >
                          {isDeleting ? '🗑️ Deleting...' : '🗑️ Delete Workspace Permanently'}
                        </button>
                        <button
                          onClick={() => navigate(-1)}
                          className="cancel-button"
                          disabled={isDeleting}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="owner-only-message">
                      <div className="lock-icon">🔒</div>
                      <h3>Restricted Access</h3>
                      <p>Only the workspace owner can delete this workspace.</p>
                      <p className="owner-info">
                        Current owner: <strong>{workspace.owner.username}</strong>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSettings;