// pages/Workspace.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Workspace.css';

const Workspace = ({ workspace, rooms, user, onBack, onCreateRoom, onDeleteWorkspace }) => {
  const navigate = useNavigate();
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomType, setNewRoomType] = useState('code');
  const [showDeleteWorkspaceConfirm, setShowDeleteWorkspaceConfirm] = useState(false);
  const [showDeleteRoomConfirm, setShowDeleteRoomConfirm] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);

  // Handle room click
  const handleRoomClick = (room) => {
    console.log('Opening room:', room.name, 'Type:', room.type);
    navigate(`/room/${room._id}`);
  };

  // Handle create room
  const handleCreateRoom = () => {
    if (!newRoomName.trim()) {
      alert('Please enter a room name');
      return;
    }

    const roomData = {
      name: newRoomName,
      description: newRoomDescription,
      type: newRoomType
    };

    const result = onCreateRoom(workspace._id, roomData);
    
    if (result.success) {
      setShowCreateRoomModal(false);
      setNewRoomName('');
      setNewRoomDescription('');
      setNewRoomType('code');
      alert('Room created successfully!');
    } else {
      alert('Failed to create room: ' + result.error);
    }
  };

  // Handle delete room button click
  const handleDeleteRoomClick = (room, e) => {
    e.stopPropagation();
    setRoomToDelete(room);
    setShowDeleteRoomConfirm(true);
  };

  // Confirm delete room
  const confirmDeleteRoom = () => {
    if (roomToDelete) {
      console.log('Deleting room:', roomToDelete._id);
      // Here you need to implement your delete room logic
      alert(`Room "${roomToDelete.name}" has been deleted (in real app, this would remove from database).`);
      setShowDeleteRoomConfirm(false);
      setRoomToDelete(null);
    }
  };

  // Get room type display info
  const getRoomTypeInfo = (type) => {
    const types = {
      'code': { icon: '💻', label: 'Code Editor', color: '#10b981' },
      'document': { icon: '📄', label: 'Document Editor', color: '#8b5cf6' },
      'spreadsheet': { icon: '📊', label: 'Spreadsheet', color: '#f59e0b' },
      'whiteboard': { icon: '🎨', label: 'Whiteboard', color: '#ef4444' },
      'general': { icon: '📝', label: 'General Room', color: '#6b7280' }
    };
    return types[type] || types.general;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Handle workspace deletion
  const handleDeleteWorkspaceConfirm = () => {
    const result = onDeleteWorkspace(workspace._id);
    if (result.success) {
      alert('Workspace deleted successfully');
      onBack();
    } else {
      alert('Error: ' + result.error);
    }
    setShowDeleteWorkspaceConfirm(false);
  };

  return (
    <div className="workspace-page">
      {/* Header */}
      <div className="workspace-header">
        <div className="header-left">
          <button onClick={onBack} className="back-button">
            ← Back to Dashboard
          </button>
          <div className="workspace-title-section">
            <h1 className="workspace-title">{workspace.name}</h1>
            <p className="workspace-description">{workspace.description}</p>
            <div className="workspace-info">
              <span className="info-item">
                👥 {workspace.members?.length || 1} members
              </span>
              <span className="info-item">
                📁 {rooms.length} rooms
              </span>
              <span className="info-item">
                🔑 {workspace.visibility}
              </span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="workspace-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => setShowCreateRoomModal(true)}
            >
              ➕ Create Room
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate(`/workspace/${workspace._id}/settings`)}
            >
              ⚙ Settings
            </button>
            <button 
              className="btn btn-danger" 
              onClick={() => setShowDeleteWorkspaceConfirm(true)}
            >
              🗑 Delete Workspace
            </button>
            <div className="invite-section">
              <span className="invite-label">Invite Code:</span>
              <code className="invite-code">{workspace.inviteCode}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="workspace-content">
        <div className="rooms-section">
          <div className="section-header">
            <h2>Rooms in {workspace.name}</h2>
            <span className="room-count">{rooms.length} rooms</span>
          </div>

          {rooms.length === 0 ? (
            <div className="empty-rooms">
              <div className="empty-icon">📁</div>
              <h3>No rooms yet</h3>
              <p>Create your first room to start collaborating</p>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowCreateRoomModal(true)}
              >
                Create Your First Room
              </button>
            </div>
          ) : (
            <div className="rooms-grid">
              {rooms.map(room => {
                const typeInfo = getRoomTypeInfo(room.type);
                return (
                  <div 
                    key={room._id} 
                    className="room-card"
                    style={{ cursor: 'pointer', borderLeftColor: typeInfo.color }}
                  >
                    <div className="room-card-header">
                      <div className="room-icon" style={{ color: typeInfo.color }}>
                        {typeInfo.icon}
                      </div>
                      <div className="room-title-section">
                        <h3>{room.name}</h3>
                        <span className="room-type-badge" style={{ backgroundColor: typeInfo.color }}>
                          {typeInfo.label}
                        </span>
                      </div>
                    </div>
                    
                    <div className="room-card-content">
                      <p className="room-description">
                        {room.description || 'No description provided'}
                      </p>
                      
                      <div className="room-meta">
                        <div className="meta-item">
                          <span className="meta-label">Type:</span>
                          <span className="meta-value" style={{ color: typeInfo.color }}>
                            {typeInfo.label}
                          </span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Created:</span>
                          <span className="meta-value">
                            {formatDate(room.createdAt)}
                          </span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Created by:</span>
                          <span className="meta-value">
                            {room.createdBy?.username === user?.username ? 'You' : room.createdBy?.username}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="room-card-footer">
                      <div className="room-members">
                        <span className="member-count">
                          👥 {room.members?.length || 1} member{room.members?.length !== 1 ? 's' : ''}
                        </span>
                        <span className="online-count">
                          ● {room.onlineMembers?.length || 1} online
                        </span>
                      </div>
                      <div className="room-actions">
                        <button 
                          className="open-room-btn"
                          onClick={() => handleRoomClick(room)}
                        >
                          Open {typeInfo.icon}
                        </button>
                        <button 
                          className="delete-room-btn"
                          onClick={(e) => handleDeleteRoomClick(room, e)}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Members Section */}
        <div className="members-section">
          <h3>Members</h3>
          <div className="members-list">
            {workspace.members?.map((member, index) => (
              <div key={member.user._id || index} className="member-item">
                <div 
                  className="member-avatar" 
                  style={{ backgroundColor: member.user.color || '#3B82F6' }}
                >
                  {member.user.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="member-info">
                  <span className="member-name">
                    {member.user.username}
                    {member.user._id === user?._id && ' (You)'}
                  </span>
                  <span className="member-role">{member.role}</span>
                </div>
                <div className="member-status">
                  <span className="status-dot online"></span>
                </div>
              </div>
            ))}
          </div>
          <div className="members-stats">
            <div className="stat-item">
              <span className="stat-number">{workspace.members?.length || 1}</span>
              <span className="stat-label">Total Members</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{workspace.members?.length || 1}</span>
              <span className="stat-label">Online Now</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateRoomModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Room</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowCreateRoomModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="roomName">Room Name</label>
                <input
                  type="text"
                  id="roomName"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Enter room name"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="roomDescription">Description (Optional)</label>
                <textarea
                  id="roomDescription"
                  value={newRoomDescription}
                  onChange={(e) => setNewRoomDescription(e.target.value)}
                  placeholder="Describe what this room is for"
                  className="form-input"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label htmlFor="roomType">Room Type</label>
                <div className="room-type-options">
                  {[
                    { value: 'code', icon: '💻', label: 'Code Editor' },
                    { value: 'document', icon: '📄', label: 'Document Editor' },
                    { value: 'spreadsheet', icon: '📊', label: 'Spreadsheet' },
                    { value: 'whiteboard', icon: '🎨', label: 'Whiteboard' },
                    { value: 'general', icon: '📝', label: 'General' }
                  ].map(type => (
                    <label 
                      key={type.value} 
                      className={`room-type-option ${newRoomType === type.value ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="roomType"
                        value={type.value}
                        checked={newRoomType === type.value}
                        onChange={(e) => setNewRoomType(e.target.value)}
                      />
                      <span className="type-icon">{type.icon}</span>
                      <span className="type-label">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowCreateRoomModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreateRoom}
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Workspace Confirmation Modal */}
      {showDeleteWorkspaceConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Delete Workspace</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowDeleteWorkspaceConfirm(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-message">
                <div className="warning-icon">⚠️</div>
                <h3>Are you sure?</h3>
                <p>This action cannot be undone. All rooms and data in this workspace will be permanently deleted.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDeleteWorkspaceConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDeleteWorkspaceConfirm}
              >
                Delete Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Room Confirmation Modal */}
      {showDeleteRoomConfirm && roomToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Delete Room</h2>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowDeleteRoomConfirm(false);
                  setRoomToDelete(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-message">
                <div className="warning-icon">⚠️</div>
                <h3>Delete "{roomToDelete.name}"?</h3>
                <p>This action cannot be undone. All content in this room will be permanently deleted.</p>
                <div className="room-delete-info">
                  <p><strong>Type:</strong> {getRoomTypeInfo(roomToDelete.type).label}</p>
                  <p><strong>Created:</strong> {formatDate(roomToDelete.createdAt)}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowDeleteRoomConfirm(false);
                  setRoomToDelete(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={confirmDeleteRoom}
              >
                Delete Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;