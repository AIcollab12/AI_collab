// activitystream.js - FIXED VERSION (NO WARNINGS)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './activitystream.css';

const ActivityStream = ({ user }) => {
  const [activities, setActivities] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  // Fetch activities function with useCallback - FIXED DEPENDENCY
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching activities...');
      
      if (!user || !user.token) {
        console.log('No user token available');
        return;
      }
      
      const response = await fetch('http://localhost:5000/api/activities', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Activities response:', data);
      
      if (data.success) {
        setActivities(data.activities);
        setOnlineCount(data.onlineUsers);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [user]); // FIXED: Only depend on user object, not user.token

  // Fetch online users function with useCallback
  const fetchOnlineUsers = useCallback(async () => {
    try {
      console.log('Fetching online users...');
      const response = await fetch('http://localhost:5000/api/online-users');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOnlineCount(data.count);
        setOnlineUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch online users:', error);
    }
  }, []);

  // Connect to WebSocket and fetch data
  useEffect(() => {
    if (!user || !user.token || !user._id) {
      console.log('Waiting for user data...');
      setLoading(false);
      return;
    }

    console.log('Connecting to WebSocket for user:', user.username);
    
    // Initialize Socket.IO connection
    const socket = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    
    socketRef.current = socket;

    // Socket event handlers
    const handleConnect = () => {
      console.log('✅ Connected to WebSocket');
      
      socket.emit('user-online', {
        userId: user._id,
        token: user.token,
        username: user.username
      });
    };

    const handleOnlineUsersUpdate = (data) => {
      console.log(`👥 Online users update: ${data.count} users`);
      setOnlineCount(data.count);
      setOnlineUsers(data.users || []);
    };

    const handleNewActivity = (activity) => {
      console.log('📝 New activity received:', activity);
      setActivities(prev => {
        const newActivities = [activity, ...prev.slice(0, 19)];
        return newActivities;
      });
    };

    const handleUserConnected = (data) => {
      console.log(`➕ ${data.username} connected`);
      
      const newActivity = {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        user: data.username,
        activity: 'User logged in',
        workspace: 'General',
        status: 'joined',
        _id: `socket_${Date.now()}`
      };
      setActivities(prev => [newActivity, ...prev.slice(0, 19)]);
    };

    const handleUserDisconnected = (data) => {
      console.log(`➖ ${data.username} disconnected`);
    };

    const handleConnectError = (error) => {
      console.error('WebSocket connection error:', error);
    };

    const handleSocketError = (error) => {
      console.error('WebSocket error:', error);
    };

    // Attach event listeners
    socket.on('connect', handleConnect);
    socket.on('online-users-update', handleOnlineUsersUpdate);
    socket.on('new-activity', handleNewActivity);
    socket.on('user-connected', handleUserConnected);
    socket.on('user-disconnected', handleUserDisconnected);
    socket.on('connect_error', handleConnectError);
    socket.on('error', handleSocketError);

    // Fetch initial data
    fetchActivities();
    fetchOnlineUsers();

    // Cleanup function
    return () => {
      console.log('Disconnecting WebSocket...');
      
      // Remove event listeners
      socket.off('connect', handleConnect);
      socket.off('online-users-update', handleOnlineUsersUpdate);
      socket.off('new-activity', handleNewActivity);
      socket.off('user-connected', handleUserConnected);
      socket.off('user-disconnected', handleUserDisconnected);
      socket.off('connect_error', handleConnectError);
      socket.off('error', handleSocketError);
      
      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user, fetchActivities, fetchOnlineUsers]); // FIXED: Removed specific property dependencies

  // Get color based on status
  const getStatusColor = (status) => {
    const colors = {
      'joined': '#10B981',
      'created': '#3B82F6',
      'started': '#F59E0B',
      'completed': '#8B5CF6',
      'uploaded': '#EC4899',
      'failed': '#EF4444',
      'success': '#10B981'
    };
    return colors[status] || '#6B7280';
  };

  // Get user initial for avatar
  const getUserInitial = (username) => {
    if (!username) return 'U';
    return username.charAt(0).toUpperCase();
  };

  // Format time display
  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    return timeString.toLowerCase().replace(/\s/g, '');
  };

  // Handle refresh button click
  const handleRefresh = () => {
    fetchActivities();
    fetchOnlineUsers();
  };

  // Loading state
  if (loading && activities.length === 0) {
    return (
      <div className="activity-stream loading">
        <div className="loader">
          <div className="loading-spinner"></div>
          <p>Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-stream">
      <div className="activity-header">
        <h2>Live Activity Stream</h2>
        <div className="online-status">
          <span className="online-indicator"></span>
          <span className="online-count">
            {onlineCount} {onlineCount === 1 ? 'user' : 'users'} online
          </span>
          {onlineCount > 0 && onlineUsers.length > 0 && (
            <div className="online-users-tooltip">
              <div className="online-users-list">
                <h4>Online Now ({onlineCount})</h4>
                {onlineUsers.slice(0, 10).map(onlineUser => (
                  <div key={onlineUser._id} className="online-user-item">
                    <div 
                      className="user-avatar-small"
                      style={{ backgroundColor: onlineUser.color || '#3B82F6' }}
                    >
                      {getUserInitial(onlineUser.username)}
                    </div>
                    <span className="online-username">
                      {onlineUser.username || 'User'}
                    </span>
                  </div>
                ))}
                {onlineUsers.length > 10 && (
                  <div className="more-users">
                    +{onlineUsers.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="activity-table-container">
        <table className="activity-table">
          <thead>
            <tr>
              <th className="time-column">Time</th>
              <th className="user-column">User</th>
              <th className="activity-column">Activity</th>
              <th className="workspace-column">Workspace</th>
              <th className="status-column">Status</th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <tr className="no-activities">
                <td colSpan="5">
                  <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <h3>No activities yet</h3>
                    <p>Start collaborating to see activities here</p>
                    {user && (
                      <button 
                        className="refresh-btn-small"
                        onClick={handleRefresh}
                        disabled={loading}
                      >
                        {loading ? 'Refreshing...' : 'Refresh'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              activities.map((activity, index) => (
                <tr key={activity._id || `activity_${index}`} className="activity-row">
                  <td className="time-cell">
                    <span className="time-badge">
                      {formatTime(activity.time)}
                    </span>
                  </td>
                  <td className="user-cell">
                    <div className="user-info">
                      <div 
                        className="user-avatar"
                        style={{ backgroundColor: getStatusColor(activity.status) }}
                      >
                        {getUserInitial(activity.user)}
                      </div>
                      <span className="username">
                        {activity.user || 'User'}
                      </span>
                    </div>
                  </td>
                  <td className="activity-cell">
                    <span className="activity-text">
                      {activity.activity || 'Activity'}
                    </span>
                  </td>
                  <td className="workspace-cell">
                    <span className="workspace-badge">
                      {activity.workspace || 'General'}
                    </span>
                  </td>
                  <td className="status-cell">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(activity.status) }}
                    >
                      {activity.status || 'success'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="activity-footer">
        <button 
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Activities'}
        </button>
        <div className="activity-count">
          Showing {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
        </div>
      </div>
    </div>
  );
};

export default ActivityStream;