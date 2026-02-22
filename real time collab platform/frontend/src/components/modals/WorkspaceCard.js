import React, { useState } from 'react';
import './WorkspaceCard.css';

const WorkspaceCard = ({ workspace, onDelete, onEdit, onOpen, onInvite, isOwner }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(workspace.id);
      setShowDeleteConfirm(false);
      setShowMenu(false);
    }
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(workspace);
    setShowMenu(false);
  };

  const handleInvite = (e) => {
    e.stopPropagation();
    if (onInvite) onInvite(workspace);
    setShowMenu(false);
  };

  return (
    <div className="workspace-card" onClick={() => onOpen && onOpen(workspace)}>
      <div className="workspace-card-header">
        <div className="workspace-icon" style={{ backgroundColor: workspace.color }}>
          {workspace.name.charAt(0).toUpperCase()}
        </div>
        <div className="workspace-info">
          <h3 className="workspace-name">{workspace.name}</h3>
          <div className="workspace-meta">
            <span className="owner-badge">
              {workspace.owner === 'You' || isOwner ? 'Owner: You' : `Owner: ${workspace.owner}`}
            </span>
            {workspace.visibility && (
              <span className={`visibility-badge ${workspace.visibility}`}>
                {workspace.visibility === 'private' ? 'Private' : 'Public'}
              </span>
            )}
          </div>
        </div>
        
        <div className="workspace-actions">
          {isOwner && (
            <button className="action-menu-btn" onClick={handleMenuClick}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="5" r="1"/>
                <circle cx="12" cy="12" r="1"/>
                <circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
          )}
          
          {showMenu && isOwner && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={handleEdit}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit Workspace
              </button>
              <button className="dropdown-item" onClick={handleInvite}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                Invite Members
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item delete" onClick={() => setShowDeleteConfirm(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Delete Workspace
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="workspace-card-body">
        <p className="workspace-description">
          {workspace.description || 'No description provided'}
        </p>
        
        <div className="workspace-stats">
          <div className="stat">
            <strong>{workspace.memberCount || 1}</strong> member{workspace.memberCount !== 1 ? 's' : ''}
          </div>
          <div className="stat">
            <strong>{workspace.projectCount || 0}</strong> project{workspace.projectCount !== 1 ? 's' : ''}
          </div>
          <div className="stat">
            <strong>{workspace.roomCount || 0}</strong> room{workspace.roomCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="workspace-tags">
          <span className="tag">Collaboration</span>
          <span className="tag">Real-time</span>
          {workspace.visibility === 'public' && (
            <span className="tag public-tag">
              {workspace.joinPermission === 'request-to-join' ? 'Request to Join' : 'Public'}
            </span>
          )}
        </div>
      </div>

      <div className="workspace-card-footer">
        <button className="open-btn" onClick={() => onOpen && onOpen(workspace)}>
          Open →
        </button>
        
        {workspace.visibility === 'public' && !isOwner && (
          <button className="join-btn">
            Request to Join
          </button>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-modal">
            <div className="delete-confirm-header">
              <div className="delete-confirm-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h3>Delete Workspace</h3>
            </div>
            <div className="delete-confirm-body">
              <p>Are you sure you want to delete "<strong>{workspace.name}</strong>" workspace?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceCard;