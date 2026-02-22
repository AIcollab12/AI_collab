// src/pages/Dashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MeetingPage from './MeetingPage';
import './Dashboard.css';

const Dashboard = ({ 
  user, 
  onLogout, 
  onCreateWorkspace, 
  onJoinWorkspaceByInviteCode,
  userWorkspaces = [],
  publicWorkspaces = [],
  onDeleteWorkspace,
  onJoinWorkspace,
  onUpdateWorkspace
}) => {
  const navigate = useNavigate();
  
  // State declarations
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workspaceToEdit, setWorkspaceToEdit] = useState(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState(null);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState({});
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState('');
  const [responseTime, setResponseTime] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [publicWorkspacesList, setPublicWorkspacesList] = useState([]);
  
  // Modal states
  const [modalWorkspaceName, setModalWorkspaceName] = useState('');
  const [modalWorkspaceDesc, setModalWorkspaceDesc] = useState('');
  const [modalWorkspaceColor, setModalWorkspaceColor] = useState('#6366f1');
  const [modalWorkspaceVisibility, setModalWorkspaceVisibility] = useState('private');
  
  // Stats
  const [stats, setStats] = useState({
    activeWorkspaces: 0,
    totalMembers: 0,
    publicWorkspaces: 0,
    activeRooms: 0,
    pendingInvites: 0
  });

  // Refs
  const intervalsRef = useRef([]);
  const socketRef = useRef(null);

  // Color options
  const colorOptions = [
    '#6366f1', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'
  ];

  // Update public workspaces list when prop changes
  useEffect(() => {
    console.log('Public workspaces received:', publicWorkspaces);
    if (Array.isArray(publicWorkspaces)) {
      setPublicWorkspacesList(publicWorkspaces);
    }
  }, [publicWorkspaces]);

  // Check authentication - early return for safety
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Show notification
  const showNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    const newNotification = {
      id,
      message,
      type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 3)]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Fetch REAL online users from backend
  const fetchRealOnlineUsers = useCallback(async () => {
    try {
      const start = Date.now();
      const response = await fetch('http://localhost:5000/api/online-users');
      const end = Date.now();
      
      if (!response.ok) throw new Error('Failed to fetch online users');
      
      const data = await response.json();
      if (data.success) {
        setOnlineUsers(data.count);
        setResponseTime(end - start);
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  }, []);

  // Update stats based on actual workspaces
  const updateStats = useCallback(() => {
    const userWs = Array.isArray(userWorkspaces) ? userWorkspaces : [];
    const publicWs = Array.isArray(publicWorkspacesList) ? publicWorkspacesList : [];
    
    // Calculate total unique members across all workspaces
    const memberSet = new Set();
    userWs.forEach(ws => {
      if (Array.isArray(ws.members)) {
        ws.members.forEach(member => {
          if (member.userId) memberSet.add(member.userId.toString());
        });
      }
    });
    
    setStats({
      activeWorkspaces: userWs.length,
      totalMembers: memberSet.size,
      publicWorkspaces: publicWs.length,
      activeRooms: userWs.reduce((total, ws) => total + (Array.isArray(ws.rooms) ? ws.rooms.length : 0), 0),
      pendingInvites: 0
    });
  }, [userWorkspaces, publicWorkspacesList]);

  // Initialize REAL-TIME data
  useEffect(() => {
    if (!user) return;

    const socket = new WebSocket('ws://localhost:5000');
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Connected to WebSocket');
      socket.send(JSON.stringify({
        type: 'user-online',
        userId: user._id,
        token: user.token,
        username: user.username
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'online-users-update') {
          setOnlineUsers(data.count);
        }

        if (data.type === 'workspace-invite') {
          showNotification(`You received an invite to ${data.workspace}`, 'success');
          setStats(prev => ({ ...prev, pendingInvites: prev.pendingInvites + 1 }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    const intervals = [
      setInterval(() => setCurrentTime(new Date()), 1000),
      setInterval(fetchRealOnlineUsers, 10000),
      setInterval(updateStats, 5000)
    ];

    intervalsRef.current = intervals;
    fetchRealOnlineUsers();
    updateStats();

    return () => {
      intervalsRef.current.forEach(interval => clearInterval(interval));
      intervalsRef.current = [];
      
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [user, fetchRealOnlineUsers, showNotification, updateStats]);

  // Handle workspace creation/edit
  const handleWorkspaceOperation = async () => {
    if (!modalWorkspaceName.trim()) {
      setError('Workspace name is required');
      return;
    }

    if (modalWorkspaceName.length < 3) {
      setError('Workspace name must be at least 3 characters');
      return;
    }

    const workspaceData = {
      name: modalWorkspaceName.trim(),
      description: modalWorkspaceDesc.trim(),
      color: modalWorkspaceColor,
      visibility: modalWorkspaceVisibility
    };

    setLoading(true);
    setError('');
    
    try {
      let result;
      
      if (workspaceToEdit) {
        if (!onUpdateWorkspace) throw new Error('Update workspace function not available');
        const workspaceId = workspaceToEdit.id || workspaceToEdit._id;
        result = await onUpdateWorkspace(workspaceId, workspaceData);
      } else {
        if (!onCreateWorkspace) throw new Error('Create workspace function not available');
        result = await onCreateWorkspace(workspaceData);
      }
      
      if (result && result.success) {
        setShowCreateModal(false);
        setWorkspaceToEdit(null);
        resetModalForm();
        
        showNotification(
          workspaceToEdit
            ? `Workspace "${workspaceData.name}" updated successfully` 
            : `Workspace "${workspaceData.name}" created successfully`, 
          'success'
        );
        
        if (result.workspace && result.workspace._id && !workspaceToEdit) {
          navigate(`/workspace/${result.workspace._id}`);
        }
      } else {
        setError(result?.error || `Failed to ${workspaceToEdit ? 'update' : 'create'} workspace`);
        showNotification(`Failed to ${workspaceToEdit ? 'update' : 'create'} workspace`, 'error');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      showNotification(err.message || 'Operation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetModalForm = () => {
    setModalWorkspaceName('');
    setModalWorkspaceDesc('');
    setModalWorkspaceColor('#6366f1');
    setModalWorkspaceVisibility('private');
  };

  // Handle joining by invite code
  const handleJoinByInviteCode = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter invite code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      if (!onJoinWorkspaceByInviteCode) throw new Error('Join workspace function not available');
      
      const result = await onJoinWorkspaceByInviteCode(inviteCode.trim());
      
      if (result && result.success) {
        setShowJoinModal(false);
        setInviteCode('');
        showNotification(`Joined workspace successfully`, 'success');
        
        if (result.workspace && result.workspace._id) {
          navigate(`/workspace/${result.workspace._id}`);
        }
      } else {
        setError(result?.error || 'Failed to join workspace');
        showNotification('Failed to join workspace', 'error');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      showNotification(err.message || 'Failed to join workspace', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle joining public workspace
  const handleJoinPublicWorkspace = async (workspace) => {
    if (!workspace || !workspace._id) return;
    
    setLoading(true);
    setError('');
    
    try {
      if (!onJoinWorkspace) throw new Error('Join workspace function not available');
      
      const result = await onJoinWorkspace(workspace._id);
      
      if (result && result.success) {
        showNotification(`Joined "${workspace.name}" successfully`, 'success');
        
        if (result.workspace && result.workspace._id) {
          navigate(`/workspace/${result.workspace._id}`);
        }
      } else {
        setError(result?.error || 'Failed to join workspace');
        showNotification('Failed to join workspace', 'error');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      showNotification(err.message || 'Failed to join workspace', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open workspace
  const handleOpenWorkspace = (workspace) => {
    if (workspace && workspace._id) {
      navigate(`/workspace/${workspace._id}`);
    }
  };

  // Edit workspace
  const handleEditWorkspace = (workspace, e) => {
    if (e) e.stopPropagation();
    setWorkspaceToEdit(workspace);
    setModalWorkspaceName(workspace.name || '');
    setModalWorkspaceDesc(workspace.description || '');
    setModalWorkspaceColor(workspace.color || '#6366f1');
    setModalWorkspaceVisibility(workspace.visibility || 'private');
    setShowCreateModal(true);
    setShowWorkspaceMenu({});
  };

  // Initiate workspace deletion
  const handleDeleteWorkspaceClick = (workspace, e) => {
    if (e) e.stopPropagation();
    if (workspace) {
      setWorkspaceToDelete(workspace);
      setShowDeleteModal(true);
      setShowWorkspaceMenu({});
    }
  };

  // Confirm workspace deletion
  const handleConfirmDelete = async () => {
    if (!workspaceToDelete || !workspaceToDelete._id) return;

    setLoading(true);
    setError('');
    
    try {
      if (!onDeleteWorkspace) throw new Error('Delete workspace function not available');
      
      const result = await onDeleteWorkspace(workspaceToDelete._id);
      
      if (result && result.success) {
        setShowDeleteModal(false);
        setWorkspaceToDelete(null);
        showNotification(`Workspace "${workspaceToDelete.name}" deleted`, 'success');
      } else {
        setError(result?.error || 'Failed to delete workspace');
        showNotification('Failed to delete workspace', 'error');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      showNotification(err.message || 'Failed to delete workspace', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle workspace menu
  const toggleWorkspaceMenu = (workspaceId, e) => {
    if (e) e.stopPropagation();
    setShowWorkspaceMenu(prev => ({
      [workspaceId]: !prev[workspaceId]
    }));
  };

  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get user initials
  const getUserInitials = (username) => {
    if (!username) return 'U';
    return username.charAt(0).toUpperCase();
  };

  // Get workspace initials
  const getWorkspaceInitials = (name) => {
    if (!name) return 'W';
    return name.charAt(0).toUpperCase();
  };

  // Safe data access
  const getUserWorkspaces = () => Array.isArray(userWorkspaces) ? userWorkspaces : [];

  // Loading state
  if (!user) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner-large"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="modern-dashboard">
      {/* Real-time Notifications */}
      <div className="notification-container">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            <div className="notification-icon">
              {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
            </div>
            <div className="notification-content">
              <p>{notification.message}</p>
              <span className="notification-time">{notification.time}</span>
            </div>
            <button className="notification-close" onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}>×</button>
          </div>
        ))}
      </div>

      {/* Simple Top Bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="logo" onClick={() => navigate('/dashboard')}>
            <span className="logo-icon">⚡</span>
            <span className="logo-text">CollabSpace</span>
          </div>
          <span className="live-badge">
            <span className="live-dot"></span>
            LIVE
          </span>
        </div>

        <div className="top-bar-right">
          <div className="time-display">
            <span className="time-icon">🕐</span>
            <span>{formatTime(currentTime)}</span>
          </div>
          
          <div className="online-indicator">
            <span className="online-dot"></span>
            <span>{onlineUsers} online</span>
            <span className="response-time">{responseTime}ms</span>
          </div>

          <button className="btn-create" onClick={() => {
            setWorkspaceToEdit(null);
            resetModalForm();
            setShowCreateModal(true);
          }}>
            + New Workspace
          </button>

          <div className="user-menu">
            <div className="user-avatar" style={{ backgroundColor: user.color || '#6366f1' }}>
              {getUserInitials(user.username)}
            </div>
            <button className="logout-btn" onClick={onLogout} title="Logout">
              <span>🚪</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="nav-icon">📊</span>
              <span>Dashboard</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'workspaces' ? 'active' : ''}`}
              onClick={() => setActiveTab('workspaces')}
            >
              <span className="nav-icon">📁</span>
              <span>Workspaces</span>
              <span className="nav-badge">{getUserWorkspaces().length}</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'meetings' ? 'active' : ''}`}
              onClick={() => setActiveTab('meetings')}
            >
              <span className="nav-icon">📅</span>
              <span>Meetings</span>
            </button>
            <button 
              className="nav-item"
              onClick={() => setShowJoinModal(true)}
            >
              <span className="nav-icon">🔗</span>
              <span>Join</span>
            </button>
          </nav>

          {/* Recent Workspaces */}
          <div className="recent-workspaces">
            <h4>Recent</h4>
            {getUserWorkspaces().slice(0, 3).map(workspace => (
              <button 
                key={workspace._id}
                className="recent-item"
                onClick={() => handleOpenWorkspace(workspace)}
              >
                <div className="recent-avatar" style={{ backgroundColor: workspace.color || '#6366f1' }}>
                  {getWorkspaceInitials(workspace.name)}
                </div>
                <div className="recent-details">
                  <span className="recent-name">{workspace.name}</span>
                  <span className="recent-meta">{workspace.members?.length || 1} members</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Content Area */}
        <main className="dashboard-content">
          {activeTab === 'meetings' ? (
            <MeetingPage user={user} workspaces={getUserWorkspaces()} />
          ) : (
            <>
              {/* Welcome Header */}
              <div className="welcome-header">
                <div>
                  <h1>Welcome back, {user.username}!</h1>
                  <p>Manage your workspaces and collaborate in real-time</p>
                </div>
                <div className="realtime-badge">
                  <span className="pulse-dot"></span>
                  Real-time active
                </div>
              </div>

              {/* Stats Cards */}
              <div className="stats-cards">
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <h3>{stats.activeWorkspaces}</h3>
                    <p>Active Workspaces</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h3>{stats.totalMembers}</h3>
                    <p>Team Members</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">📁</div>
                  <div className="stat-info">
                    <h3>{stats.activeRooms}</h3>
                    <p>Active Rooms</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">🌍</div>
                  <div className="stat-info">
                    <h3>{publicWorkspacesList.length}</h3>
                    <p>Public Workspaces</p>
                  </div>
                </div>
              </div>

              {/* Your Workspaces */}
              <section className="workspaces-section">
                <div className="section-header">
                  <h2>Your Workspaces</h2>
                  <button className="btn-outline" onClick={() => setShowCreateModal(true)}>
                    + New
                  </button>
                </div>

                {getUserWorkspaces().length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📁</div>
                    <h3>No workspaces yet</h3>
                    <p>Create your first workspace to start collaborating</p>
                    <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                      Create Workspace
                    </button>
                  </div>
                ) : (
                  <div className="workspaces-grid">
                    {getUserWorkspaces().map(workspace => {
                      const isOwner = workspace.createdBy === user._id || 
                        (workspace.owner && workspace.owner._id === user._id);
                      
                      return (
                        <div 
                          key={workspace._id} 
                          className="workspace-card"
                          onClick={() => handleOpenWorkspace(workspace)}
                        >
                          <div className="workspace-header" style={{ backgroundColor: workspace.color || '#6366f1' }}>
                            <span className="workspace-initials">{getWorkspaceInitials(workspace.name)}</span>
                            {isOwner && <span className="owner-badge">👑</span>}
                          </div>
                          
                          <div className="workspace-body">
                            <h4>{workspace.name}</h4>
                            <p className="workspace-description">{workspace.description || 'No description'}</p>
                            
                            <div className="workspace-meta">
                              <span>👥 {workspace.members?.length || 1}</span>
                              <span>📁 {workspace.rooms?.length || 0}</span>
                              {workspace.visibility === 'public' && <span className="public-badge">🌍 Public</span>}
                            </div>
                          </div>

                          <div className="workspace-footer">
                            <button className="btn-icon" onClick={(e) => {
                              e.stopPropagation();
                              toggleWorkspaceMenu(workspace._id, e);
                            }}>
                              ⋮
                            </button>
                            
                            {showWorkspaceMenu[workspace._id] && (
                              <div className="workspace-menu" onClick={e => e.stopPropagation()}>
                                <button onClick={() => handleOpenWorkspace(workspace)}>
                                  Open
                                </button>
                                {isOwner && (
                                  <>
                                    <button onClick={(e) => handleEditWorkspace(workspace, e)}>
                                      Edit
                                    </button>
                                    <button className="delete" onClick={(e) => handleDeleteWorkspaceClick(workspace, e)}>
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Public Workspaces Section - ALWAYS SHOWN */}
              <section className="workspaces-section">
                <div className="section-header">
                  <h2>🌍 Public Workspaces</h2>
                  <span className="badge">{publicWorkspacesList.length} available</span>
                </div>

                {publicWorkspacesList.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🌍</div>
                    <h3>No public workspaces available</h3>
                    <p>Check back later or create your own public workspace</p>
                    <button className="btn-primary" onClick={() => {
                      setModalWorkspaceVisibility('public');
                      setShowCreateModal(true);
                    }}>
                      Create Public Workspace
                    </button>
                  </div>
                ) : (
                  <div className="public-workspaces">
                    {publicWorkspacesList.map(workspace => {
                      // Check if user is already a member
                      const isMember = workspace.members?.some(m => 
                        (m.userId && m.userId.toString() === user?._id) || 
                        (m.user && m.user._id === user?._id)
                      );
                      
                      // Check if user is the owner
                      const isOwner = workspace.createdBy === user?._id || 
                        (workspace.owner && workspace.owner._id === user?._id);
                      
                      return (
                        <div key={workspace._id} className="public-card">
                          <div className="public-card-left">
                            <div className="public-avatar" style={{ backgroundColor: workspace.color || '#6366f1' }}>
                              {getWorkspaceInitials(workspace.name)}
                            </div>
                            <div className="public-info">
                              <h4>{workspace.name}</h4>
                              <p>{workspace.description || 'No description'}</p>
                              <div className="public-meta">
                                <span>👥 {workspace.members?.length || 1} members</span>
                                <span>👤 Owner: {workspace.owner?.username || 'Unknown'}</span>
                                {workspace.rooms && <span>📁 {workspace.rooms.length} rooms</span>}
                              </div>
                            </div>
                          </div>
                          
                          <div className="public-card-right">
                            {isOwner ? (
                              <button 
                                className="btn-secondary" 
                                onClick={() => handleOpenWorkspace(workspace)}
                              >
                                Manage
                              </button>
                            ) : isMember ? (
                              <button 
                                className="btn-primary" 
                                onClick={() => handleOpenWorkspace(workspace)}
                              >
                                Open
                              </button>
                            ) : (
                              <button 
                                className="btn-success" 
                                onClick={() => handleJoinPublicWorkspace(workspace)}
                              >
                                Join Workspace
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {/* Create/Edit Workspace Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateModal(false);
          setWorkspaceToEdit(null);
          resetModalForm();
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{workspaceToEdit ? 'Edit Workspace' : 'Create Workspace'}</h2>
              <button className="modal-close" onClick={() => {
                setShowCreateModal(false);
                setWorkspaceToEdit(null);
                resetModalForm();
              }}>×</button>
            </div>

            <div className="modal-body">
              {error && <div className="modal-error">{error}</div>}

              <div className="form-group">
                <label>Workspace Name *</label>
                <input
                  type="text"
                  value={modalWorkspaceName}
                  onChange={(e) => setModalWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name"
                  className="form-input"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={modalWorkspaceDesc}
                  onChange={(e) => setModalWorkspaceDesc(e.target.value)}
                  placeholder="Describe your workspace"
                  rows="3"
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label>Visibility</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="private"
                      checked={modalWorkspaceVisibility === 'private'}
                      onChange={(e) => setModalWorkspaceVisibility(e.target.value)}
                    />
                    <span>🔒 Private - Only invited members</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="public"
                      checked={modalWorkspaceVisibility === 'public'}
                      onChange={(e) => setModalWorkspaceVisibility(e.target.value)}
                    />
                    <span>🌍 Public - Anyone can join</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {colorOptions.map(color => (
                    <div
                      key={color}
                      className={`color-option ${modalWorkspaceColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setModalWorkspaceColor(color)}
                    >
                      {modalWorkspaceColor === color && '✓'}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => {
                setShowCreateModal(false);
                setWorkspaceToEdit(null);
                resetModalForm();
              }}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleWorkspaceOperation}
                disabled={!modalWorkspaceName.trim() || modalWorkspaceName.length < 3}
              >
                {workspaceToEdit ? 'Save Changes' : 'Create Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Workspace Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Join Workspace</h2>
              <button className="modal-close" onClick={() => setShowJoinModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter invite code"
                  className="form-input"
                  autoFocus
                />
                <small className="form-help">Get the invite code from the workspace owner</small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowJoinModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleJoinByInviteCode} disabled={!inviteCode.trim()}>
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Workspace Modal */}
      {showDeleteModal && workspaceToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Workspace</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>Are you sure you want to delete <strong>"{workspaceToDelete.name}"</strong>?</p>
              <p className="warning-text">This action cannot be undone. All data will be permanently lost.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Processing...</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;