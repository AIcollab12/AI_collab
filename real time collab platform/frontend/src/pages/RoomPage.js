import React, { useState, useEffect, useCallback } from 'react';
import CodeEditor from '../components/editors/CodeEditor';
import DocumentEditor from '../components/editors/DocumentEditor';
import Whiteboard from '../components/editors/Whiteboard';
import Spreadsheet from '../components/editors/Spreadsheet';
import ChatPanel from '../components/chat/ChatPanel';
import UsersPanel from '../components/chat/UsersPanel';
import './RoomPage.css';

const RoomPage = ({ room, user, onBack, socket }) => {
  const [roomUsers, setRoomUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // Define sendMessage function with useCallback
  const sendMessage = useCallback(() => {
    if (!inputMessage.trim() || !room) return;
    
    const messageData = {
      id: Date.now(),
      userId: user?._id || 'user_' + Date.now(),
      username: user?.username || 'Anonymous',
      message: inputMessage.trim(),
      timestamp: Date.now(),
      roomId: room._id,
      type: 'user'
    };
    
    // Add message locally immediately
    setMessages(prev => [...prev, messageData]);
    setInputMessage('');
    
    // Send via socket
    if (socket && socket.connected) {
      socket.emit('send-message', {
        roomId: room._id,
        message: inputMessage.trim()
      });
    }
  }, [inputMessage, room, socket, user]);

  // Handle key press for sending message
  const handleKeyPress = useCallback((e) => {
    // Skip if user is typing in an input or textarea element
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]); // Added sendMessage as dependency

  const handleTypingStart = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit('typing-start', { roomId: room._id });
    }
  }, [socket, room._id]);

  const handleTypingStop = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit('typing-stop', { roomId: room._id });
    }
  }, [socket, room._id]);

  // Setup socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log('Socket connected');
      setConnectionStatus('connected');
      socket.emit('join-room', { 
        roomId: room._id, 
        userId: user?._id, 
        username: user?.username 
      });
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected');
      setConnectionStatus('disconnected');
    };

    const handleRoomJoined = (data) => {
      console.log('Room joined:', data);
      setRoomUsers(data.users || []);
      setMessages(prev => [...prev, ...(data.chat || [])]);
    };

    const handleUserJoined = (userData) => {
      console.log('User joined:', userData);
      setRoomUsers(prev => {
        // Check if user already exists
        if (prev.find(u => u.userId === userData.userId)) {
          return prev;
        }
        return [...prev, userData];
      });
      
      // Add join message
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        message: `${userData.username} joined the room`,
        timestamp: Date.now()
      }]);
    };

    const handleUserLeft = (data) => {
      console.log('User left:', data);
      setRoomUsers(prev => prev.filter(u => u.userId !== data.userId));
      
      // Add leave message
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        message: `${data.username} left the room`,
        timestamp: Date.now()
      }]);
    };

    const handleNewMessage = (message) => {
      console.log('New message:', message);
      setMessages(prev => [...prev, {
        ...message,
        id: message.id || Date.now()
      }]);
    };

    const handleTyping = (data) => {
      // Update user typing status
      setRoomUsers(prev => prev.map(user => 
        user.userId === data.userId 
          ? { ...user, isTyping: data.isTyping }
          : user
      ));
    };

    // Set initial users if socket not connected
    if (!socket.connected) {
      setRoomUsers([
        { 
          userId: user?._id || '1', 
          username: user?.username || 'You', 
          isTyping: false,
          isCurrentUser: true 
        },
        { userId: '2', username: 'Alice', isTyping: false },
        { userId: '3', username: 'Bob', isTyping: false }
      ]);
      
      setMessages([
        {
          id: 1,
          userId: 'system',
          username: 'System',
          message: 'Welcome to the room! Start collaborating...',
          timestamp: Date.now(),
          type: 'system'
        },
        {
          id: 2,
          userId: '2',
          username: 'Alice',
          message: 'Hello everyone! 👋',
          timestamp: Date.now() - 60000,
          type: 'user'
        },
        {
          id: 3,
          userId: '3',
          username: 'Bob',
          message: 'Ready to collaborate?',
          timestamp: Date.now() - 30000,
          type: 'user'
        }
      ]);
    }

    // Add event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room-joined', handleRoomJoined);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleTyping);

    // Join room if already connected
    if (socket.connected) {
      handleConnect();
    }

    // Add keydown listener for Enter key
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      // Cleanup
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room-joined', handleRoomJoined);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleTyping);
      window.removeEventListener('keydown', handleKeyPress);
      
      // Leave room on unmount
      if (socket.connected) {
        socket.emit('leave-room', { roomId: room._id });
      }
    };
  }, [socket, room._id, user, handleKeyPress]); // Added handleKeyPress dependency

  const renderRoomContent = () => {
    switch (room.type) {
      case 'code':
        return <CodeEditor room={room} socket={socket} user={user} />;
      case 'document':
        return <DocumentEditor room={room} socket={socket} user={user} />;
      case 'whiteboard':
        return <Whiteboard room={room} socket={socket} user={user} />;
      case 'spreadsheet':
        return <Spreadsheet room={room} socket={socket} user={user} />;
      default:
        return (
          <div className="unknown-room">
            <div className="unknown-content">
              <h3>Unknown Room Type</h3>
              <p>This room type is not supported yet.</p>
              <div className="room-types-list">
                <h4>Supported Room Types:</h4>
                <ul>
                  <li>💻 Code Editor</li>
                  <li>📝 Document Editor</li>
                  <li>🎨 Whiteboard</li>
                  <li>📊 Spreadsheet</li>
                </ul>
              </div>
            </div>
          </div>
        );
    }
  };

  const handleCopyInvite = () => {
    const inviteLink = `${window.location.origin}/room/${room._id}`;
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        alert('Invite link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
  };

  const handleExport = () => {
    switch (room.type) {
      case 'document':
        alert('Exporting document...');
        break;
      case 'code':
        alert('Exporting code...');
        break;
      case 'spreadsheet':
        alert('Exporting spreadsheet...');
        break;
      default:
        alert('Export feature coming soon!');
    }
  };

  return (
    <div className="room-page">
      <header className="room-header">
        <div className="header-left">
          <button className="back-button" onClick={onBack}>
            ← Back to Workspace
          </button>
          <div className="room-info">
            <h2>{room.name}</h2>
            <div className="room-meta">
              <span className={`connection-status ${connectionStatus}`}>
                {connectionStatus === 'connected' ? '🟢 Online' : '🔴 Offline'}
              </span>
              <span className="room-type">
                {room.type === 'code' && '💻 Code'}
                {room.type === 'document' && '📝 Document'}
                {room.type === 'whiteboard' && '🎨 Whiteboard'}
                {room.type === 'spreadsheet' && '📊 Spreadsheet'}
              </span>
              <span className="room-users">👥 {roomUsers.length} online</span>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <div className="header-actions">
            <button 
              className="header-button" 
              onClick={handleCopyInvite}
              title="Copy invite link"
            >
              🔗 Invite
            </button>
            <button 
              className="header-button" 
              onClick={handleExport}
              title="Export content"
            >
              📥 Export
            </button>
            <div className="user-info">
              <div 
                className="user-avatar"
                style={{ backgroundColor: user?.color || '#3B82F6' }}
              >
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="username">{user?.username || 'User'}</span>
            </div>
          </div>
        </div>
      </header>
      
      <div className="room-main">
        <div className="room-content">
          {renderRoomContent()}
        </div>
        
        <div className="room-sidebar">
          <UsersPanel 
            users={roomUsers} 
            currentUser={user}
            socket={socket}
            roomId={room._id}
          />
          <ChatPanel 
            messages={messages}
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            sendMessage={sendMessage}
            currentUser={user}
            room={room}
            socket={socket}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
          />
        </div>
      </div>
    </div>
  );
};

export default RoomPage;