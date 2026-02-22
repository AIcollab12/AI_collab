import React, { useState, useEffect } from 'react';
import './WorkspaceModal.css';

const WorkspaceModal = ({ isOpen, onClose, onCreate, onDelete, workspaceToEdit }) => {
  const [workspaceData, setWorkspaceData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    visibility: 'private'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(null);

  const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'
  ];

  // Initialize with existing data if editing
  useEffect(() => {
    if (workspaceToEdit) {
      setWorkspaceData({
        name: workspaceToEdit.name || '',
        description: workspaceToEdit.description || '',
        color: workspaceToEdit.color || '#3B82F6',
        visibility: workspaceToEdit.visibility || 'private'
      });
      setWorkspaceId(workspaceToEdit.id || workspaceToEdit._id);
      setIsEditing(true);
    } else {
      resetForm();
    }
  }, [workspaceToEdit]);

  // Reset form to default values
  const resetForm = () => {
    setWorkspaceData({ 
      name: '', 
      description: '', 
      color: '#3B82F6',
      visibility: 'private'
    });
    setWorkspaceId(null);
    setIsEditing(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!workspaceData.name.trim()) {
      setError('Workspace name is required');
      return;
    }

    if (workspaceData.name.length < 3) {
      setError('Workspace name must be at least 3 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let result;
      
      if (isEditing && workspaceId) {
        // Update existing workspace
        result = await onCreate({ ...workspaceData, id: workspaceId });
      } else {
        // Create new workspace
        result = await onCreate(workspaceData);
      }
      
      if (result && result.success) {
        resetForm();
        onClose();
      } else {
        setError(result?.error || `Failed to ${isEditing ? 'update' : 'create'} workspace`);
      }
    } catch (err) {
      setError(err.message || `An error occurred`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const modalTitle = isEditing ? 'Edit Workspace' : 'Create Workspace';
  const submitButtonText = isEditing ? 'Save Changes' : 'Create Workspace';

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <h2>{modalTitle}</h2>
            <button className="close-btn" onClick={handleClose} disabled={loading}>
              ×
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Workspace Name */}
              <div className="form-group">
                <label>Workspace Name *</label>
                <input
                  type="text"
                  value={workspaceData.name}
                  onChange={(e) => setWorkspaceData({...workspaceData, name: e.target.value})}
                  placeholder="Enter workspace name"
                  disabled={loading}
                  className="form-input"
                  maxLength="50"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={workspaceData.description}
                  onChange={(e) => setWorkspaceData({...workspaceData, description: e.target.value})}
                  placeholder="Describe your workspace"
                  rows="3"
                  disabled={loading}
                  className="form-textarea"
                  maxLength="200"
                />
              </div>

              {/* Visibility */}
              <div className="form-group">
                <label>Visibility</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="private"
                      checked={workspaceData.visibility === 'private'}
                      onChange={(e) => setWorkspaceData({...workspaceData, visibility: e.target.value})}
                    />
                    <span>🔒 Private - Only invited members</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="public"
                      checked={workspaceData.visibility === 'public'}
                      onChange={(e) => setWorkspaceData({...workspaceData, visibility: e.target.value})}
                    />
                    <span>🌍 Public - Anyone can join</span>
                  </label>
                </div>
              </div>

              {/* Color Selection */}
              <div className="form-group">
                <label>Workspace Color</label>
                <div className="color-options">
                  {colorOptions.map((color) => (
                    <div
                      key={color}
                      className={`color-option ${workspaceData.color === color ? 'selected' : ''}`}
                      onClick={() => !loading && setWorkspaceData({...workspaceData, color: color})}
                      style={{ backgroundColor: color }}
                    >
                      {workspaceData.color === color && '✓'}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="modal-footer">
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
                  disabled={loading || !workspaceData.name.trim() || workspaceData.name.length < 3}
                  style={{ backgroundColor: workspaceData.color }}
                >
                  {loading ? 'Processing...' : submitButtonText}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceModal;