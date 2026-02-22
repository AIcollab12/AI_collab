import React, { useEffect, useRef } from 'react';
import './ChatPanel.css';

const ChatPanel = ({ messages, inputMessage, setInputMessage, sendMessage, currentUser, room }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>💬 Chat</h3>
        <span className="message-count">{messages.length} messages</span>
      </div>
      
      <div className="messages-container">
        {messages.map(msg => (
          <div 
            key={msg.id} 
            className={`message ${msg.userId === currentUser?.id ? 'own-message' : 'other-message'}`}
          >
            <div className="message-header">
              <span className="message-username">
                {msg.username}
                {msg.userId === currentUser?.id && ' (You)'}
              </span>
              <span className="message-time">
                {formatTime(msg.timestamp)}
              </span>
            </div>
            <div className="message-content">{msg.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={`Message in ${room.name}...`}
          disabled={!room}
        />
        <button 
          onClick={sendMessage} 
          disabled={!room || !inputMessage.trim()}
          className="send-button"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;