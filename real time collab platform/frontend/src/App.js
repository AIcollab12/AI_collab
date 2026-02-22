// App.js - FIXED VERSION (NO ERRORS)
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import RoomPage from './pages/RoomPage';
import WorkspaceSettings from './pages/WorkspaceSettings';
import ActivityStream from './client/activitystream';
import './App.css';

// Error Boundary to prevent white screen on render errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#f1f5f9',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '16px' }}>Something went wrong</h1>
            <p style={{ color: '#94a3b8', marginBottom: '24px' }}>An unexpected error occurred. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Shared database for all users
const SharedDB = {
  workspaces: [],
  rooms: [],
  
  init: function() {
    const savedData = localStorage.getItem('collabspace_shared_db');
    if (savedData) {
      let data;
      try {
        data = JSON.parse(savedData);
      } catch (e) {
        console.warn('Failed to parse shared DB from localStorage:', e);
        localStorage.removeItem('collabspace_shared_db');
        data = {};
      }
      this.workspaces = data.workspaces || [];
      this.rooms = data.rooms || [];
    } else {
      // Create some sample public workspaces
      this.workspaces = [
        {
          _id: 'public1',
          name: 'Public Coding Hub',
          description: 'A public workspace for developers to collaborate',
          visibility: 'public',
          owner: {
            _id: 'admin',
            username: 'Admin',
            email: 'admin@example.com',
            color: '#3B82F6'
          },
          members: [
            { 
              user: {
                _id: 'admin',
                username: 'Admin',
                email: 'admin@example.com',
                color: '#3B82F6'
              }, 
              role: 'owner', 
              joinedAt: new Date().toISOString() 
            }
          ],
          inviteCode: 'PUBLIC123',
          createdAt: new Date().toISOString(),
          rooms: [],
          settings: {
            collaboration: true,
            realtime: true,
            open: true
          }
        },
        {
          _id: 'public2',
          name: 'Open Design Studio',
          description: 'Public workspace for designers and creatives',
          visibility: 'public',
          owner: {
            _id: 'designer',
            username: 'DesignMaster',
            email: 'design@example.com',
            color: '#8B5CF6'
          },
          members: [
            { 
              user: {
                _id: 'designer',
                username: 'DesignMaster',
                email: 'design@example.com',
                color: '#8B5CF6'
              }, 
              role: 'owner', 
              joinedAt: new Date().toISOString() 
            }
          ],
          inviteCode: 'DESIGN456',
          createdAt: new Date().toISOString(),
          rooms: [],
          settings: {
            collaboration: true,
            realtime: true,
            open: true
          }
        }
      ];
      this.rooms = [];
      this.save();
    }
  },
  
  save: function() {
    localStorage.setItem('collabspace_shared_db', JSON.stringify({
      workspaces: this.workspaces,
      rooms: this.rooms
    }));
  },
  
  getPublicWorkspaces: function() {
    return this.workspaces.filter(workspace => workspace.visibility === 'public');
  },
  
  getAllWorkspaces: function() {
    return this.workspaces;
  },
  
  getUserWorkspaces: function(userId) {
    if (!userId) return [];
    return this.workspaces.filter(workspace => 
      workspace.members.some(member => member.user._id === userId)
    );
  },
  
  getAllVisibleWorkspaces: function(userId) {
    const publicWorkspaces = this.getPublicWorkspaces();
    if (!userId) return publicWorkspaces;
    
    const userWorkspaces = this.getUserWorkspaces(userId);
    
    const allWorkspaces = [...publicWorkspaces];
    userWorkspaces.forEach(workspace => {
      if (!allWorkspaces.some(w => w._id === workspace._id)) {
        allWorkspaces.push(workspace);
      }
    });
    
    return allWorkspaces;
  },
  
  createWorkspace: function(workspaceData, creator) {
    if (!creator || !creator._id) {
      console.error('Invalid creator data');
      return null;
    }
    
    const newWorkspace = {
      _id: Date.now().toString(),
      name: workspaceData.name || 'New Workspace',
      description: workspaceData.description || 'No description provided',
      visibility: workspaceData.visibility || 'private',
      owner: {
        _id: creator._id,
        username: creator.username || 'User',
        email: creator.email || '',
        color: creator.color || '#3B82F6'
      },
      members: [
        { 
          user: {
            _id: creator._id,
            username: creator.username || 'User',
            email: creator.email || '',
            color: creator.color || '#3B82F6'
          }, 
          role: 'owner', 
          joinedAt: new Date().toISOString() 
        }
      ],
      inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
      createdAt: new Date().toISOString(),
      rooms: [],
      settings: {
        collaboration: true,
        realtime: true,
        open: workspaceData.visibility === 'public'
      }
    };
    
    this.workspaces.push(newWorkspace);
    this.save();
    return newWorkspace;
  },
  
  joinWorkspace: function(workspaceId, user) {
    if (!user || !user._id) {
      return { success: false, error: 'Invalid user' };
    }
    
    const workspace = this.workspaces.find(w => w._id === workspaceId);
    
    if (!workspace) {
      return { success: false, error: 'Workspace not found' };
    }
    
    const isMember = workspace.members.some(member => member.user._id === user._id);
    if (isMember) {
      return { success: false, error: 'Already a member' };
    }
    
    if (workspace.visibility === 'private') {
      return { success: false, error: 'Private workspace requires invite code' };
    }
    
    workspace.members.push({
      user: {
        _id: user._id,
        username: user.username || 'User',
        email: user.email || '',
        color: user.color || '#6B7280'
      },
      role: 'member',
      joinedAt: new Date().toISOString()
    });
    
    this.save();
    return { success: true, workspace };
  },
  
  joinWorkspaceByInviteCode: function(inviteCode, user) {
    if (!user || !user._id) {
      return { success: false, error: 'Invalid user' };
    }
    
    const workspace = this.workspaces.find(w => w.inviteCode === inviteCode);
    
    if (!workspace) {
      return { success: false, error: 'Invalid invite code' };
    }
    
    const isMember = workspace.members.some(member => member.user._id === user._id);
    if (isMember) {
      return { success: false, error: 'Already a member' };
    }
    
    workspace.members.push({
      user: {
        _id: user._id,
        username: user.username || 'User',
        email: user.email || '',
        color: user.color || '#6B7280'
      },
      role: 'member',
      joinedAt: new Date().toISOString()
    });
    
    this.save();
    return { success: true, workspace };
  },
  
  createRoom: function(workspaceId, roomData, creator) {
    if (!creator || !creator._id) {
      console.error('Invalid creator data');
      return null;
    }
    
    const newRoom = {
      _id: Date.now().toString(),
      name: roomData.name || 'New Room',
      description: roomData.description || '',
      type: roomData.type || 'general',
      workspace: workspaceId,
      createdBy: {
        _id: creator._id,
        username: creator.username || 'User',
        color: creator.color || '#3B82F6'
      },
      createdAt: new Date().toISOString(),
      members: [creator._id],
      onlineMembers: [creator._id],
      content: '<h1>Welcome to this room!</h1><p>Start collaborating...</p>'
    };
    
    this.rooms.push(newRoom);
    
    const workspace = this.workspaces.find(w => w._id === workspaceId);
    if (workspace) {
      workspace.rooms.push(newRoom._id);
      this.save();
    }
    
    return newRoom;
  },
  
  deleteRoom: function(roomId, userId) {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    const roomIndex = this.rooms.findIndex(room => room._id === roomId);
    
    if (roomIndex === -1) {
      return { success: false, error: 'Room not found' };
    }
    
    const room = this.rooms[roomIndex];
    const workspace = this.workspaces.find(w => w._id === room.workspace);
    
    if (!workspace) {
      return { success: false, error: 'Workspace not found' };
    }
    
    const isCreator = room.createdBy._id === userId;
    const isWorkspaceOwner = workspace.owner._id === userId;
    
    if (!isCreator && !isWorkspaceOwner) {
      return { success: false, error: 'Only room creator or workspace owner can delete the room' };
    }
    
    const deletedRoom = this.rooms.splice(roomIndex, 1)[0];
    
    if (workspace) {
      const roomIdIndex = workspace.rooms.indexOf(roomId);
      if (roomIdIndex !== -1) {
        workspace.rooms.splice(roomIdIndex, 1);
      }
    }
    
    this.save();
    
    return { 
      success: true, 
      message: 'Room deleted successfully',
      deletedRoom: deletedRoom
    };
  },
  
  getWorkspaceRooms: function(workspaceId) {
    return this.rooms.filter(room => room.workspace === workspaceId);
  },
  
  getRoomById: function(roomId) {
    return this.rooms.find(room => room._id === roomId);
  },
  
  getWorkspaceById: function(workspaceId) {
    return this.workspaces.find(workspace => workspace._id === workspaceId);
  },
  
  deleteWorkspace: function(workspaceId, userId) {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    const workspaceIndex = this.workspaces.findIndex(w => w._id === workspaceId);
    
    if (workspaceIndex === -1) {
      return { success: false, error: 'Workspace not found' };
    }
    
    const workspace = this.workspaces[workspaceIndex];
    
    if (workspace.owner._id !== userId) {
      return { success: false, error: 'Only the workspace owner can delete it' };
    }
    
    this.rooms = this.rooms.filter(room => room.workspace !== workspaceId);
    this.workspaces.splice(workspaceIndex, 1);
    this.save();
    
    return { 
      success: true, 
      message: 'Workspace deleted successfully',
      deletedWorkspace: workspace
    };
  },
  
  updateWorkspace: function(workspaceId, updates, userId) {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    const workspace = this.workspaces.find(w => w._id === workspaceId);
    
    if (!workspace) {
      return { success: false, error: 'Workspace not found' };
    }
    
    if (workspace.owner._id !== userId) {
      return { success: false, error: 'Only the workspace owner can update it' };
    }
    
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'owner' && key !== 'members' && key !== 'createdAt') {
        workspace[key] = updates[key];
      }
    });
    
    this.save();
    
    return { 
      success: true, 
      message: 'Workspace updated successfully',
      workspace: workspace
    };
  },
  
  removeMember: function(workspaceId, memberId, userId) {
    if (!userId || !memberId) {
      return { success: false, error: 'User ID and member ID required' };
    }
    
    const workspace = this.workspaces.find(w => w._id === workspaceId);
    
    if (!workspace) {
      return { success: false, error: 'Workspace not found' };
    }
    
    if (workspace.owner._id !== userId) {
      return { success: false, error: 'Only the workspace owner can remove members' };
    }
    
    if (memberId === workspace.owner._id) {
      return { success: false, error: 'Cannot remove workspace owner' };
    }
    
    const memberIndex = workspace.members.findIndex(member => member.user._id === memberId);
    if (memberIndex !== -1) {
      workspace.members.splice(memberIndex, 1);
      this.save();
      return { success: true, message: 'Member removed successfully' };
    }
    
    return { success: false, error: 'Member not found in workspace' };
  }
};

SharedDB.init();

const WorkspaceWrapper = ({ user, onBack, onRoomSelect, onCreateRoom, onDeleteWorkspace, onDeleteRoom, onJoinWorkspace }) => {
  const { id } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    if (id) {
      const foundWorkspace = SharedDB.getWorkspaceById(id);
      if (foundWorkspace) {
        setWorkspace(foundWorkspace);
        
        if (user) {
          const memberCheck = foundWorkspace.members.some(member => member.user._id === user._id);
          setIsMember(memberCheck);
        }
        
        const workspaceRooms = SharedDB.getWorkspaceRooms(id);
        setRooms(workspaceRooms);
      } else {
        console.error('Workspace not found with ID:', id);
      }
      setLoading(false);
    }
  }, [id, user]);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <h2>Workspace not found</h2>
          <button onClick={onBack} className="btn btn-secondary">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <Workspace 
      workspace={workspace}
      rooms={rooms}
      user={user}
      onBack={onBack}
      onRoomSelect={onRoomSelect}
      onCreateRoom={onCreateRoom}
      onDeleteWorkspace={onDeleteWorkspace}
      onDeleteRoom={onDeleteRoom}
      onJoinWorkspace={onJoinWorkspace}
      isMember={isMember}
    />
  );
};

const RoomPageWrapper = ({ user, onBack }) => {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const foundRoom = SharedDB.getRoomById(id);
      if (foundRoom) {
        setRoom(foundRoom);
      } else {
        console.error('Room not found with ID:', id);
      }
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <h2>Room not found</h2>
          <button onClick={onBack} className="btn btn-secondary">
            ← Back to Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <RoomPage 
      room={room}
      user={user}
      onBack={onBack}
    />
  );
};

const WorkspaceSettingsWrapper = ({ user, onDeleteWorkspace, onUpdateWorkspace, onRemoveMember }) => {
  const { id } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const foundWorkspace = SharedDB.getWorkspaceById(id);
      if (foundWorkspace) {
        setWorkspace(foundWorkspace);
      } else {
        console.error('Workspace not found with ID:', id);
      }
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <h2>Workspace not found</h2>
          <button onClick={() => window.history.back()} className="btn btn-secondary">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceSettings 
      workspace={workspace}
      user={user}
      onDeleteWorkspace={onDeleteWorkspace}
      onUpdateWorkspace={onUpdateWorkspace}
      onRemoveMember={onRemoveMember}
    />
  );
};

// Dashboard with ActivityStream Wrapper
const DashboardWithActivityStream = ({ 
  user, 
  onLogout, 
  onCreateWorkspace,
  onJoinWorkspaceByInviteCode,
  userWorkspaces,
  publicWorkspaces,
  onDeleteWorkspace,
  onJoinWorkspace 
}) => {
  return (
    <div className="dashboard-layout">
      <div className="dashboard-main">
        <Dashboard 
          user={user} 
          onLogout={onLogout} 
          onCreateWorkspace={onCreateWorkspace}
          onJoinWorkspaceByInviteCode={onJoinWorkspaceByInviteCode}
          userWorkspaces={userWorkspaces}
          publicWorkspaces={publicWorkspaces}
          onDeleteWorkspace={onDeleteWorkspace}
          onJoinWorkspace={onJoinWorkspace}
        />
      </div>
      
      {user && (
        <div className="activity-stream-sidebar">
          <ActivityStream user={user} />
        </div>
      )}
    </div>
  );
};

// Main Layout Component
const MainLayout = ({ children, user }) => {
  return (
    <div className="main-layout">
      <nav className="main-nav">
        <div className="nav-left">
          <h1 className="logo">CollabSpace</h1>
        </div>
        <div className="nav-right">
          {user ? (
            <div className="user-info">
              <div 
                className="user-avatar-nav"
                style={{ backgroundColor: user.color || '#3B82F6' }}
              >
                {user.username?.charAt(0) || 'U'}
              </div>
              <span className="username-nav">{user.username}</span>
            </div>
          ) : (
            <a href="/login" className="login-link">Login</a>
          )}
        </div>
      </nav>
      
      <div className="layout-content">
        {children}
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userWorkspaces, setUserWorkspaces] = useState([]);
  const [publicWorkspaces, setPublicWorkspaces] = useState([]);
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        
        if (!userData._id) {
          userData._id = `user_${Date.now()}`;
        }
        if (!userData.username) {
          userData.username = 'User';
        }
        if (!userData.color) {
          userData.color = '#3B82F6';
        }
        
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        
        const workspaces = SharedDB.getUserWorkspaces(userData._id);
        setUserWorkspaces(workspaces);
        
        const publicWs = SharedDB.getPublicWorkspaces();
        setPublicWorkspaces(publicWs);
        
      } catch (error) {
        console.error('Error loading user:', error);
        localStorage.removeItem('user');
      }
    } else {
      const publicWs = SharedDB.getPublicWorkspaces();
      setPublicWorkspaces(publicWs);
    }
    
    setLoading(false);
  }, [forceUpdate]);

  const handleLogin = useCallback((userData) => {
    if (!userData._id) {
      userData._id = `user_${Date.now()}`;
    }
    if (!userData.username) {
      userData.username = 'User';
    }
    if (!userData.color) {
      userData.color = '#3B82F6';
    }
    
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    
    const workspaces = SharedDB.getUserWorkspaces(userData._id);
    setUserWorkspaces(workspaces);
    
    const publicWs = SharedDB.getPublicWorkspaces();
    setPublicWorkspaces(publicWs);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('user');
    setUser(null);
    setUserWorkspaces([]);
  }, []);

  const handleCreateWorkspace = useCallback((workspaceData) => {
    if (!user) {
      return { success: false, error: 'User not logged in' };
    }
    
    const newWorkspace = SharedDB.createWorkspace(workspaceData, user);
    
    if (!newWorkspace) {
      return { success: false, error: 'Failed to create workspace' };
    }
    
    const workspaces = SharedDB.getUserWorkspaces(user._id);
    setUserWorkspaces(workspaces);
    
    if (workspaceData.visibility === 'public') {
      const publicWs = SharedDB.getPublicWorkspaces();
      setPublicWorkspaces(publicWs);
    }
    
    return { success: true, workspace: newWorkspace };
  }, [user]);

  const handleJoinWorkspace = useCallback((workspaceId) => {
    if (!user) {
      return { success: false, error: 'Please login to join workspace' };
    }
    
    const result = SharedDB.joinWorkspace(workspaceId, user);
    if (result.success) {
      const workspaces = SharedDB.getUserWorkspaces(user._id);
      setUserWorkspaces(workspaces);
      setForceUpdate(prev => prev + 1);
    }
    return result;
  }, [user]);

  const handleJoinWorkspaceByInviteCode = useCallback((inviteCode) => {
    if (!user) {
      return { success: false, error: 'Please login to join workspace' };
    }
    
    const result = SharedDB.joinWorkspaceByInviteCode(inviteCode, user);
    if (result.success) {
      const workspaces = SharedDB.getUserWorkspaces(user._id);
      setUserWorkspaces(workspaces);
      setForceUpdate(prev => prev + 1);
    }
    return result;
  }, [user]);

  const handleCreateRoom = useCallback((workspaceId, roomData) => {
    if (!user) {
      return { success: false, error: 'User not logged in' };
    }
    
    const newRoom = SharedDB.createRoom(workspaceId, roomData, user);
    
    if (!newRoom) {
      return { success: false, error: 'Failed to create room' };
    }
    
    setForceUpdate(prev => prev + 1);
    
    return { success: true, room: newRoom };
  }, [user]);

  const handleDeleteRoom = useCallback((roomId) => {
    if (!user) {
      return { success: false, error: 'User not logged in' };
    }
    
    const result = SharedDB.deleteRoom(roomId, user._id);
    
    if (result.success) {
      setForceUpdate(prev => prev + 1);
    }
    
    return result;
  }, [user]);

  const handleDeleteWorkspace = useCallback((workspaceId) => {
    if (!user) {
      return { success: false, error: 'User not logged in' };
    }
    
    const result = SharedDB.deleteWorkspace(workspaceId, user._id);
    
    if (result.success) {
      const workspaces = SharedDB.getUserWorkspaces(user._id);
      setUserWorkspaces(workspaces);
      
      const publicWs = SharedDB.getPublicWorkspaces();
      setPublicWorkspaces(publicWs);
      
      setForceUpdate(prev => prev + 1);
    }
    
    return result;
  }, [user]);

  const handleUpdateWorkspace = useCallback((workspaceId, updates) => {
    if (!user) {
      return { success: false, error: 'User not logged in' };
    }
    
    const result = SharedDB.updateWorkspace(workspaceId, updates, user._id);
    
    if (result.success && updates.visibility) {
      const publicWs = SharedDB.getPublicWorkspaces();
      setPublicWorkspaces(publicWs);
    }
    
    return result;
  }, [user]);

  const handleRemoveMember = useCallback((workspaceId, memberId) => {
    if (!user) {
      return { success: false, error: 'User not logged in' };
    }
    
    return SharedDB.removeMember(workspaceId, memberId, user._id);
  }, [user]);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <Router>
      <MainLayout user={user}>
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/dashboard" />} 
          />
          
          <Route 
            path="/auth/callback" 
            element={<AuthCallback onLogin={handleLogin} />} 
          />
          
          <Route 
            path="/dashboard" 
            element={
              user ? (
                <DashboardWithActivityStream
                  user={user} 
                  onLogout={handleLogout} 
                  onCreateWorkspace={handleCreateWorkspace}
                  onJoinWorkspaceByInviteCode={handleJoinWorkspaceByInviteCode}
                  userWorkspaces={userWorkspaces}
                  publicWorkspaces={publicWorkspaces}
                  onDeleteWorkspace={handleDeleteWorkspace}
                  onJoinWorkspace={handleJoinWorkspace}
                />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          
          <Route 
            path="/workspace/:id" 
            element={
              <WorkspaceWrapper 
                user={user}
                onBack={() => window.history.back()}
                onRoomSelect={(room) => console.log('Room selected:', room)}
                onCreateRoom={handleCreateRoom}
                onDeleteWorkspace={handleDeleteWorkspace}
                onDeleteRoom={handleDeleteRoom}
                onJoinWorkspace={handleJoinWorkspace}
              />
            } 
          />
          
          <Route 
            path="/room/:id" 
            element={
              user ? (
                <RoomPageWrapper 
                  user={user}
                  onBack={() => window.history.back()}
                />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          
          <Route 
            path="/workspace/:id/settings" 
            element={
              user ? (
                <WorkspaceSettingsWrapper 
                  user={user}
                  onDeleteWorkspace={handleDeleteWorkspace}
                  onUpdateWorkspace={handleUpdateWorkspace}
                  onRemoveMember={handleRemoveMember}
                />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          
          <Route 
            path="/" 
            element={<Navigate to="/dashboard" />} 
          />
        </Routes>
      </MainLayout>
    </Router>
    </ErrorBoundary>
  );
}

export default App;