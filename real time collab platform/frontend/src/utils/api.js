const API_URL = 'http://localhost:5000';

const getToken = () => localStorage.getItem('token');

export const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log('API Request:', `${API_URL}${endpoint}`, options);
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    console.log('API Response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Request Failed:', error);
    throw error;
  }
};

// Auth APIs
export const authAPI = {
  register: (data) => apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  login: (data) => apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Workspace APIs
export const workspaceAPI = {
  getWorkspaces: () => apiRequest('/api/workspaces'),
  
  getWorkspace: (id) => apiRequest(`/api/workspaces/${id}`),
  
  createWorkspace: (data) => apiRequest('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  createRoom: (workspaceId, roomData) => apiRequest(`/api/workspaces/${workspaceId}/rooms`, {
    method: 'POST',
    body: JSON.stringify(roomData),
  }),
  
  getRooms: (workspaceId) => apiRequest(`/api/workspaces/${workspaceId}/rooms`),
  
  joinWorkspace: (inviteCode) => apiRequest('/api/workspaces/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  }),
  
  generateInviteCode: (workspaceId) => apiRequest(`/api/workspaces/${workspaceId}/invite-code`, {
    method: 'POST',
  }),
};

// Mock API for development
export const mockAPI = {
  createRoom: (workspaceId, roomData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newRoom = {
          _id: Date.now().toString(),
          ...roomData,
          workspace: workspaceId,
          createdBy: { username: 'You', color: '#3b82f6' },
          createdAt: new Date()
        };
        resolve({ success: true, room: newRoom });
      }, 500);
    });
  },
  
  getRooms: (workspaceId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const rooms = [
          {
            _id: '1',
            name: 'Main Code Editor',
            type: 'code',
            description: 'Primary coding room',
            workspace: workspaceId,
            createdBy: { username: 'John Doe', color: '#3b82f6' },
            settings: { language: 'javascript' }
          },
          {
            _id: '2',
            name: 'Project Docs',
            type: 'document',
            description: 'Documentation and notes',
            workspace: workspaceId,
            createdBy: { username: 'Jane Smith', color: '#8b5cf6' }
          },
          {
            _id: '3',
            name: 'Design Board',
            type: 'whiteboard',
            description: 'Wireframes and mockups',
            workspace: workspaceId,
            createdBy: { username: 'Alice Brown', color: '#f59e0b' }
          }
        ];
        resolve({ success: true, rooms });
      }, 500);
    });
  }
};

// Mock data for development
export const mockData = {
  workspaces: [
    {
      _id: '1',
      name: 'Web Dev Team',
      description: 'Frontend and backend development',
      owner: { username: 'John Doe', color: '#3b82f6' },
      members: [
        { user: { username: 'John Doe', color: '#3b82f6' }, role: 'owner' },
        { user: { username: 'Jane Smith', color: '#8b5cf6' }, role: 'member' },
        { user: { username: 'Bob Wilson', color: '#10b981' }, role: 'member' }
      ],
      rooms: 5,
      inviteCode: 'ABC123'
    },
    {
      _id: '2',
      name: 'Design Studio',
      description: 'UI/UX design projects',
      owner: { username: 'Alice Brown', color: '#f59e0b' },
      members: [
        { user: { username: 'Alice Brown', color: '#f59e0b' }, role: 'owner' },
        { user: { username: 'Charlie Davis', color: '#ef4444' }, role: 'admin' }
      ],
      rooms: 3,
      inviteCode: 'DEF456'
    }
  ],
  
  rooms: [
    {
      _id: '1',
      name: 'Main Code Editor',
      type: 'code',
      description: 'Primary coding room',
      createdBy: { username: 'John Doe', color: '#3b82f6' }
    },
    {
      _id: '2',
      name: 'Project Docs',
      type: 'document',
      description: 'Documentation and notes',
      createdBy: { username: 'Jane Smith', color: '#8b5cf6' }
    },
    {
      _id: '3',
      name: 'Design Board',
      type: 'whiteboard',
      description: 'Wireframes and mockups',
      createdBy: { username: 'Alice Brown', color: '#f59e0b' }
    },
    {
      _id: '4',
      name: 'Data Analysis',
      type: 'spreadsheet',
      description: 'Project metrics and data',
      createdBy: { username: 'Bob Wilson', color: '#10b981' }
    }
  ],
  
  users: [
    { id: '1', username: 'You', email: 'you@example.com', color: '#3b82f6', status: 'online' },
    { id: '2', username: 'John Doe', email: 'john@example.com', color: '#8b5cf6', status: 'online' },
    { id: '3', username: 'Jane Smith', email: 'jane@example.com', color: '#10b981', status: 'away' },
    { id: '4', username: 'Bob Wilson', email: 'bob@example.com', color: '#f59e0b', status: 'offline' }
  ],
  
  messages: [
    { id: '1', userId: '2', username: 'John Doe', message: 'Hey team! How\'s the project going?', timestamp: Date.now() - 3600000 },
    { id: '2', userId: '1', username: 'You', message: 'Working on the login page right now', timestamp: Date.now() - 1800000 },
    { id: '3', userId: '3', username: 'Jane Smith', message: 'I\'ll update the documentation later', timestamp: Date.now() - 900000 },
    { id: '4', userId: '2', username: 'John Doe', message: 'Great! Let me know if you need help', timestamp: Date.now() - 300000 }
  ]
};