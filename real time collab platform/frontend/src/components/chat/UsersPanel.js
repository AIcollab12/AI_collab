import React from 'react';
import './UsersPanel.css';

const UsersPanel = ({ users, currentUser }) => {
  return (
    <div className="users-panel">
      <h3>Online Users ({users.length})</h3>
      <div className="users-list">
        {users.map(userItem => (
          <div key={userItem.userId} className="user-item">
            <div className="user-avatar">
              <div 
                className="avatar-circle" 
                style={{ 
                  backgroundColor: userItem.userId === currentUser?.id 
                    ? (currentUser?.color || '#3b82f6') 
                    : '#94a3b8' 
                }}
              >
                {userItem.username.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="user-info">
              <span className="user-name">
                {userItem.username}
                {userItem.userId === currentUser?.id && ' (You)'}
              </span>
              <span className="user-status">🟢 Online</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsersPanel;