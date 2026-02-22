// File: src/services/socket.js
// Purpose: Manages real-time WebSocket connections

import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  // Connect to socket server
  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io('http://localhost:5000', {
      withCredentials: true,
      auth: { token },
      transports: ['websocket', 'polling']
    });

    return this.socket;
  }

  // Disconnect from socket server
  disconnect() {
    if (this.socket) {
      this.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Check if connected
  isConnected() {
    return this.socket?.connected || false;
  }

  // Join a room
  joinRoom(roomId, userId, username) {
    if (this.socket?.connected) {
      const token = localStorage.getItem('token');
      this.socket.emit('join-room', { 
        roomId, 
        userId, 
        username,
        token 
      });
    }
  }

  // Leave a room
  leaveRoom(roomId) {
    if (this.socket?.connected) {
      this.socket.emit('leave-room', { roomId });
    }
  }

  // Send code changes to other users
  sendCodeChange(roomId, code, language) {
    if (this.socket?.connected) {
      this.socket.emit('code-change', { 
        roomId, 
        code, 
        language 
      });
    }
  }

  // Send cursor position to other users
  sendCursorMove(roomId, position, username) {
    if (this.socket?.connected) {
      this.socket.emit('cursor-move', { 
        roomId, 
        position, 
        username 
      });
    }
  }

  // Send chat message
  sendChatMessage(roomId, message, username) {
    if (this.socket?.connected) {
      this.socket.emit('chat-message', { 
        roomId, 
        message, 
        username 
      });
    }
  }

  // Send message to AI
  sendAIChat(roomId, message, username) {
    if (this.socket?.connected) {
      this.socket.emit('ai-chat', { 
        roomId, 
        message, 
        username 
      });
    }
  }

  // Register event listener
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      this.listeners.set(event, callback);
    }
  }

  // Remove event listener
  off(event) {
    if (this.socket && this.listeners.has(event)) {
      this.socket.off(event, this.listeners.get(event));
      this.listeners.delete(event);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.listeners.forEach((callback, event) => {
        this.socket.off(event, callback);
      });
      this.listeners.clear();
    }
  }
}

// Create a single instance (singleton)
const socketService = new SocketService();
export default socketService;