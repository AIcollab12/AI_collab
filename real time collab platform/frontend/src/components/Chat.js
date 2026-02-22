import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import './Chat.css';

const Chat = ({ socket, roomId, username }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on('receive-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('file-uploaded', (fileData) => {
      setMessages(prev => [...prev, {
        id: fileData.id,
        userId: fileData.uploadedBy,
        message: `Uploaded file: ${fileData.originalname}`,
        type: 'file',
        fileUrl: fileData.path,
        timestamp: fileData.uploadedAt,
        username: 'System'
      }]);
    });

    return () => {
      socket.off('receive-message');
      socket.off('file-uploaded');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (inputMessage.trim()) {
      const messageData = {
        roomId,
        message: inputMessage,
        type: 'text',
        username
      };
      
      socket.emit('send-message', messageData);
      setInputMessage('');
      setShowEmojiPicker(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const onEmojiClick = (emojiObject) => {
    setInputMessage(prev => prev + emojiObject.emoji);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessageContent = (message) => {
    switch (message.type) {
      case 'file':
        return (
          <div className="file-message">
            <a href={`http://localhost:5000${message.fileUrl}`} target="_blank" rel="noopener noreferrer">
              📎 {message.message}
            </a>
          </div>
        );
      case 'image':
        return (
          <div className="image-message">
            <img 
              src={message.fileUrl} 
              alt="Shared" 
              onClick={() => window.open(message.fileUrl, '_blank')}
            />
          </div>
        );
      default:
        return <div className="text-message">{message.message}</div>;
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat</h3>
        <span className="online-count">{messages.length} messages</span>
      </div>
      
      <div className="messages-container">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`message ${msg.userId === socket.id ? 'own-message' : 'other-message'}`}
          >
            <div className="message-header">
              <span className="message-username">{msg.username}</span>
              <span className="message-time">{formatTime(msg.timestamp)}</span>
            </div>
            {renderMessageContent(msg)}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <div className="emoji-picker-wrapper">
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="emoji-button"
          >
            😀
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker">
              <EmojiPicker onEmojiClick={onEmojiClick} />
            </div>
          )}
        </div>
        
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your message..."
          rows="2"
          className="chat-input"
        />
        
        <button onClick={sendMessage} className="send-button">
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;