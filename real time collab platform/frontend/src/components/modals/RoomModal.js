import React, { useState } from 'react';
import './RoomModal.css';

const RoomModal = ({ isOpen, onClose, onCreate, currentUser, workspaceColor = '#3B82F6' }) => {
  const [step, setStep] = useState(1); // 1: Type, 2: Details
  const [roomData, setRoomData] = useState({
    name: '',
    description: '',
    type: 'document',
    icon: '📄',
    color: '#10B981'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const roomTypes = [
    { 
      id: 'code', 
      icon: '💻', 
      name: 'Code Editor', 
      description: 'Real-time collaborative coding',
      color: '#3B82F6',
      features: ['Syntax highlighting', 'Multiple languages', 'Live collaboration', 'Code execution']
    },
    { 
      id: 'document', 
      icon: '📄', 
      name: 'Document Editor', 
      description: 'Rich text editing with formatting',
      color: '#10B981',
      features: ['Rich text formatting', 'Real-time editing', 'Comment system', 'Version history']
    },
    { 
      id: 'whiteboard', 
      icon: '🎨', 
      name: 'Digital Whiteboard', 
      description: 'Draw and brainstorm together',
      color: '#F59E0B',
      features: ['Drawing tools', 'Sticky notes', 'Templates', 'Infinite canvas']
    },
    { 
      id: 'spreadsheet', 
      icon: '📊', 
      name: 'Spreadsheet', 
      description: 'Collaborative spreadsheets',
      color: '#8B5CF6',
      features: ['Formulas support', 'Charts & graphs', 'Collaborative cells', 'Import/Export']
    },
    { 
      id: 'meeting', 
      icon: '🎥', 
      name: 'Meeting Room', 
      description: 'Video calls with screen sharing',
      color: '#EC4899',
      features: ['Video conferencing', 'Screen sharing', 'Chat', 'Recording']
    },
    { 
      id: 'kanban', 
      icon: '📋', 
      name: 'Kanban Board', 
      description: 'Project management board',
      color: '#06B6D4',
      features: ['Drag & drop', 'Custom columns', 'Assign tasks', 'Progress tracking']
    },
    { 
      id: 'mindmap', 
      icon: '🧠', 
      name: 'Mind Map', 
      description: 'Visual brainstorming tool',
      color: '#8B5CF6',
      features: ['Node connections', 'Hierarchy view', 'Export options', 'Collaborative editing']
    },
    { 
      id: 'presentation', 
      icon: '📽️', 
      name: 'Presentation', 
      description: 'Collaborative slides',
      color: '#EF4444',
      features: ['Slide templates', 'Real-time editing', 'Presenter mode', 'Export to PDF']
    }
  ];

  const programmingLanguages = [
    { value: 'javascript', label: 'JavaScript', color: '#F7DF1E', icon: '⚡' },
    { value: 'python', label: 'Python', color: '#3776AB', icon: '🐍' },
    { value: 'java', label: 'Java', color: '#007396', icon: '☕' },
    { value: 'typescript', label: 'TypeScript', color: '#3178C6', icon: '🔷' },
    { value: 'html', label: 'HTML', color: '#E34F26', icon: '🌐' },
    { value: 'css', label: 'CSS', color: '#1572B6', icon: '🎨' },
    { value: 'cpp', label: 'C++', color: '#00599C', icon: '⚙️' },
    { value: 'go', label: 'Go', color: '#00ADD8', icon: '🚀' },
    { value: 'rust', label: 'Rust', color: '#000000', icon: '🦀' },
    { value: 'ruby', label: 'Ruby', color: '#CC342D', icon: '💎' }
  ];

  const colorPalette = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1'
  ];

  const handleNext = () => {
    if (step === 1) {
      if (!roomData.type) {
        setError('Please select a room type');
        return;
      }
    } else if (step === 2) {
      if (!roomData.name.trim()) {
        setError('Room name is required');
        return;
      }
      if (roomData.name.length > 30) {
        setError('Room name must be less than 30 characters');
        return;
      }
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await onCreate(roomData);
      
      if (result.success) {
        setSuccessMessage(`✨ ${roomData.name} created successfully!`);
        
        // Reset form
        setRoomData({
          name: '',
          description: '',
          type: 'document',
          icon: '📄',
          color: '#10B981'
        });
        
        // Close modal after success
        setTimeout(() => {
          onClose();
          setStep(1);
          setSuccessMessage('');
        }, 1500);
      } else {
        setError(result.error || 'Failed to create room');
      }
    } catch (err) {
      setError('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRoomData({
      name: '',
      description: '',
      type: 'document',
      icon: '📄',
      color: '#10B981'
    });
    setError('');
    setSuccessMessage('');
    setStep(1);
    onClose();
  };

  if (!isOpen) return null;

  const selectedType = roomTypes.find(type => type.id === roomData.type);
  const gradientBackground = `linear-gradient(135deg, ${workspaceColor} 0%, ${roomData.color} 100%)`;

  return (
    <div className="modal-overlay room-modal-overlay" onClick={handleClose}>
      <div className="modal-container room-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="room-modal-card" style={{ background: `linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)` }}>
          
          {/* Animated Gradient Border */}
          <div className="modal-border" style={{ background: gradientBackground }}></div>
          
          {/* Header */}
          <div className="modal-header room-modal-header">
            <div className="header-left">
              <div className="modal-icon" style={{ background: gradientBackground }}>
                {step === 1 ? '🎨' : '📝'}
              </div>
              <div className="header-text">
                <h2>Create New Room</h2>
                <p className="subtitle">
                  {step === 1 ? 'Choose your room type' : 'Customize your room'}
                </p>
              </div>
            </div>
            
            <div className="step-indicator">
              <div className="step-dots">
                {[1, 2].map((dot) => (
                  <div 
                    key={dot} 
                    className={`step-dot ${step === dot ? 'active' : ''}`}
                    style={step === dot ? { background: roomData.color } : {}}
                  />
                ))}
              </div>
              <span className="step-text">Step {step} of 2</span>
            </div>
          </div>

          {/* Error/Success Messages */}
          <div className="message-container">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="success-message">
                <span className="success-icon">✨</span>
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="modal-content">
            {/* Step 1: Room Type Selection */}
            {step === 1 && (
              <div className="step-content step-type">
                <div className="type-grid">
                  {roomTypes.map((type) => (
                    <div
                      key={type.id}
                      className={`type-card ${roomData.type === type.id ? 'selected' : ''}`}
                      onClick={() => {
                        setRoomData({
                          ...roomData,
                          type: type.id,
                          icon: type.icon,
                          color: type.color
                        });
                      }}
                      style={{
                        borderColor: roomData.type === type.id ? type.color : 'rgba(255, 255, 255, 0.1)',
                        background: roomData.type === type.id ? 
                          `linear-gradient(135deg, ${type.color}20 0%, ${type.color}10 100%)` : 
                          'rgba(255, 255, 255, 0.03)'
                      }}
                    >
                      <div className="type-icon-container">
                        <div 
                          className="type-icon" 
                          style={{ 
                            background: `linear-gradient(135deg, ${type.color} 0%, ${type.color}80 100%)`,
                            boxShadow: `0 10px 30px ${type.color}40`
                          }}
                        >
                          {type.icon}
                        </div>
                      </div>
                      
                      <div className="type-content">
                        <h3>{type.name}</h3>
                        <p className="type-description">{type.description}</p>
                        
                        <div className="type-features">
                          {type.features.slice(0, 2).map((feature, idx) => (
                            <span key={idx} className="feature-tag">
                              {feature}
                            </span>
                          ))}
                          {type.features.length > 2 && (
                            <span className="feature-more">+{type.features.length - 2} more</span>
                          )}
                        </div>
                      </div>
                      
                      {roomData.type === type.id && (
                        <div className="selected-indicator">
                          <div className="check-circle" style={{ background: type.color }}>
                            ✓
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Room Preview */}
                {selectedType && (
                  <div className="room-preview">
                    <div className="preview-header">
                      <div className="preview-icon" style={{ background: roomData.color }}>
                        {roomData.icon}
                      </div>
                      <div className="preview-title">
                        <h4>{selectedType.name} Preview</h4>
                        <p>See how your room will look</p>
                      </div>
                    </div>
                    
                    <div className="preview-content">
                      <div className="preview-grid">
                        {selectedType.features.slice(0, 3).map((feature, idx) => (
                          <div key={idx} className="preview-item">
                            <div className="preview-dot" style={{ background: roomData.color }}></div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Room Details */}
            {step === 2 && (
              <div className="step-content step-details">
                <div className="details-header">
                  <div className="room-type-indicator" style={{ background: roomData.color }}>
                    <span className="room-icon">{roomData.icon}</span>
                    <span className="room-type-name">{selectedType?.name}</span>
                  </div>
                </div>
                
                <div className="details-form">
                  {/* Room Name */}
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">🏷️</span>
                      Room Name
                      <span className="required">*</span>
                    </label>
                    <div className="input-container">
                      <input
                        type="text"
                        className="form-input"
                        value={roomData.name}
                        onChange={(e) => setRoomData({...roomData, name: e.target.value})}
                        placeholder="Enter room name (e.g., 'Frontend Development', 'Project Planning')"
                        maxLength={30}
                        autoFocus
                      />
                      <div className="input-counter">
                        {roomData.name.length}/30
                      </div>
                    </div>
                    <div className="input-hint">
                      Choose a descriptive name for your room
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">📝</span>
                      Description
                      <span className="optional">(Optional)</span>
                    </label>
                    <textarea
                      className="form-textarea"
                      value={roomData.description}
                      onChange={(e) => setRoomData({...roomData, description: e.target.value})}
                      placeholder="Describe what this room will be used for..."
                      rows={3}
                      maxLength={150}
                    />
                    <div className="textarea-counter">
                      {roomData.description.length}/150
                    </div>
                    <div className="input-hint">
                      Briefly describe the purpose of this room
                    </div>
                  </div>
                  
                  {/* Language Selection for Code Editor */}
                  {roomData.type === 'code' && (
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-icon">💻</span>
                        Programming Language
                      </label>
                      <div className="language-grid">
                        {programmingLanguages.map((lang) => (
                          <button
                            key={lang.value}
                            type="button"
                            className={`language-chip ${roomData.settings?.language === lang.value ? 'selected' : ''}`}
                            onClick={() => setRoomData({
                              ...roomData,
                              settings: { ...roomData.settings, language: lang.value }
                            })}
                            style={{
                              borderColor: lang.color,
                              background: roomData.settings?.language === lang.value ? 
                                `linear-gradient(135deg, ${lang.color} 0%, ${lang.color}80 100%)` : 
                                'transparent',
                              color: roomData.settings?.language === lang.value ? 'white' : lang.color
                            }}
                          >
                            <span className="language-icon">{lang.icon}</span>
                            <span className="language-name">{lang.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Color Selection */}
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">🎨</span>
                      Room Color
                    </label>
                    <div className="color-grid">
                      {colorPalette.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`color-chip ${roomData.color === color ? 'selected' : ''}`}
                          onClick={() => setRoomData({...roomData, color: color})}
                          style={{ background: color }}
                          title={`Select ${color}`}
                        >
                          {roomData.color === color && (
                            <span className="color-check">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer room-modal-footer">
            <button
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            
            <div className="navigation-buttons">
              {step > 1 && (
                <button
                  className="btn btn-back"
                  onClick={handleBack}
                  disabled={loading}
                  style={{ borderColor: roomData.color, color: roomData.color }}
                >
                  ← Back
                </button>
              )}
              
              {step < 2 ? (
                <button
                  className="btn btn-primary"
                  onClick={handleNext}
                  disabled={loading || !roomData.type}
                  style={{ background: gradientBackground }}
                >
                  Continue
                  <span className="btn-icon">→</span>
                </button>
              ) : (
                <button
                  className="btn btn-create"
                  onClick={handleSubmit}
                  disabled={loading || !roomData.name.trim()}
                  style={{ background: gradientBackground }}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <span className="create-icon">✨</span>
                      Create Room
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomModal;