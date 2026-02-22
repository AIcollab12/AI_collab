import React, { useState, useEffect, useCallback, useRef } from 'react';
import './MeetingPage.css';

// Video Call Component built directly into MeetingPage
const VideoCallComponent = ({ meeting, onClose, user }) => {
  const [localStream, setLocalStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const localVideoRef = useRef(null);
  const durationInterval = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  const stopLocalVideo = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setLocalStream(null);
  }, []);

  const startLocalVideo = useCallback(async () => {
    setIsLoading(true);
    try {
      if (streamRef.current) {
        stopLocalVideo();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });
      
      streamRef.current = stream;
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(e => console.log('Play error:', e));
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setError('Could not access camera or microphone. Please check permissions.');
    } finally {
      setIsLoading(false);
    }
  }, [stopLocalVideo]);

  const startCallTimer = useCallback(() => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
    durationInterval.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  // Initialize video on mount
  useEffect(() => {
    startLocalVideo();
    startCallTimer();

    // Store ref values in variables for cleanup
    const currentAnimationFrame = animationFrameRef.current;
    const currentDurationInterval = durationInterval.current;

    return () => {
      if (currentDurationInterval) {
        clearInterval(currentDurationInterval);
      }
      if (currentAnimationFrame) {
        cancelAnimationFrame(currentAnimationFrame);
      }
      stopLocalVideo();
    };
  }, [startLocalVideo, startCallTimer, stopLocalVideo]);

  // Stabilize video when stream changes
  useEffect(() => {
    if (localVideoRef.current && streamRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
      localVideoRef.current.play().catch(e => console.log('Play error:', e));
    }
  }, [localStream]);

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    stopLocalVideo();
    onClose();
  };

  // Helper functions to safely handle participant data
  const getParticipantName = (participant) => {
    if (!participant) return 'Participant';
    if (typeof participant === 'string') return participant;
    return participant.username || participant.name || participant.email || 'Participant';
  };

  const getParticipantId = (participant) => {
    if (!participant) return null;
    if (typeof participant === 'string') return participant;
    return participant.userId || participant.id || participant._id || null;
  };

  const getParticipantInitial = (participant) => {
    const name = getParticipantName(participant);
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // Filter out current user from participants list
  const otherParticipants = meeting?.participants?.filter(p => {
    const participantId = getParticipantId(p);
    const currentUserId = user?._id || user?.id;
    return participantId && participantId !== currentUserId;
  }) || [];

  return (
    <div className="video-call-container">
      {error && (
        <div className="call-error">
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="call-header">
        <div className="call-info">
          <h2>{meeting?.title || 'Video Call'}</h2>
          <div className="call-duration">
            <span className="live-dot"></span>
            {formatDuration(callDuration)}
          </div>
        </div>
        <div className="participant-count">
          <span>👥</span> {(meeting?.participants?.length || 0) + 1} participants
        </div>
      </div>

      <div className="video-grid">
        {/* Local Video */}
        <div className="video-container local-video">
          {isLoading && (
            <div className="video-loading">
              <div className="spinner"></div>
              <p>Starting camera...</p>
            </div>
          )}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ display: isLoading ? 'none' : 'block' }}
          />
          <div className="video-label">
            <span>You ({user?.username || 'You'})</span>
            {!isVideoEnabled && <span className="badge">Video Off</span>}
            {!isAudioEnabled && <span className="badge muted">Muted</span>}
          </div>
        </div>

        {/* Remote Participants */}
        {otherParticipants.map((participant, index) => (
          <div key={index} className="video-container remote-video">
            <div className="placeholder-video">
              <div className="avatar">
                {getParticipantInitial(participant)}
              </div>
            </div>
            <div className="video-label">
              <span>{getParticipantName(participant)}</span>
            </div>
          </div>
        ))}

        {/* If no other participants, show waiting message */}
        {otherParticipants.length === 0 && (
          <div className="video-container remote-video waiting-container">
            <div className="placeholder-video waiting">
              <div className="waiting-message">
                <span className="waiting-icon">⏳</span>
                <p>Waiting for others to join...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="call-controls">
        <div className="controls-left">
          <button 
            className={`control-btn ${!isAudioEnabled ? 'off' : ''}`}
            onClick={toggleAudio}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? '🎤' : '🔇'}
          </button>
          <button 
            className={`control-btn ${!isVideoEnabled ? 'off' : ''}`}
            onClick={toggleVideo}
            title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
          >
            {isVideoEnabled ? '📹' : '🚫'}
          </button>
        </div>
        
        <div className="controls-center">
          <button className="end-call-btn" onClick={handleEndCall}>
            End Call
          </button>
        </div>
      </div>
    </div>
  );
};

// Main MeetingPage Component
const MeetingPage = ({ user, workspaces = [] }) => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState('checking');
  const [currentUser, setCurrentUser] = useState(user);
  const [meetingData, setMeetingData] = useState({
    title: '',
    description: '',
    workspaceId: '',
    date: '',
    time: '',
    duration: 60
  });

  // Update current user when user prop changes
  useEffect(() => {
    setCurrentUser(user);
    // Reset meetings when user changes
    setMeetings([]);
  }, [user]);

  // Check if backend is reachable
  useEffect(() => {
    checkBackendStatus();
  }, []);

  const checkBackendStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/health');
      if (response.ok) {
        setApiStatus('online');
        setError('');
      } else {
        setApiStatus('offline');
        setError('Cannot connect to server. Please make sure backend is running on port 5000');
      }
    } catch (error) {
      console.error('Backend not reachable:', error);
      setApiStatus('offline');
      setError('Cannot connect to server. Please make sure backend is running on port 5000');
    }
  };

  // Fetch meetings for current user
  const fetchMeetings = useCallback(async () => {
    if (apiStatus === 'offline' || !currentUser?.token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('Fetching meetings for user:', currentUser._id);
      
      const response = await fetch('http://localhost:5000/api/meetings', {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 404) {
        setError('Meetings API not found. Please check backend routes.');
        setMeetings([]);
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        console.log(`Found ${data.meetings?.length || 0} meetings for user ${currentUser._id}`);
        setMeetings(data.meetings || []);
      } else {
        setError(data.error || 'Failed to fetch meetings');
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setError(error.message);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.token, currentUser?._id, apiStatus]);

  // Load meetings when user changes or API status changes - FIXED: Added fetchMeetings to dependencies
  useEffect(() => {
    if (apiStatus === 'online' && currentUser?.token) {
      fetchMeetings();
    }
  }, [apiStatus, currentUser?.token, fetchMeetings]); // fetchMeetings is now included

  const handleScheduleMeeting = async () => {
    if (!meetingData.title || !meetingData.date || !meetingData.time || !meetingData.workspaceId) {
      setError('Please fill in all required fields');
      return;
    }

    if (apiStatus === 'offline') {
      setError('Cannot schedule meeting: Backend is offline');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('Scheduling meeting for user:', currentUser._id);
      
      const response = await fetch('http://localhost:5000/api/meetings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...meetingData,
          createdBy: currentUser._id,
          createdByUsername: currentUser.username,
          participants: [{
            userId: currentUser._id,
            username: currentUser.username,
            email: currentUser.email,
            status: 'accepted',
            joinedAt: new Date()
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setShowScheduleModal(false);
        setMeetingData({
          title: '',
          description: '',
          workspaceId: '',
          date: '',
          time: '',
          duration: 60
        });
        // Refresh meetings list
        await fetchMeetings();
        
        // Show success message
        alert('Meeting scheduled successfully!');
      } else {
        setError(data.error || 'Failed to schedule meeting');
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = (meeting) => {
    setActiveCall(meeting);
  };

  const handleCloseCall = () => {
    setActiveCall(null);
  };

  const filteredMeetings = selectedWorkspace === 'all' 
    ? meetings 
    : meetings.filter(m => m.workspaceId === selectedWorkspace);

  const getStatusBadge = (meeting) => {
    const now = new Date();
    const meetingStart = new Date(`${meeting.date}T${meeting.time}`);
    const meetingEnd = new Date(meetingStart.getTime() + meeting.duration * 60000);
    
    if (meetingStart > now) {
      return { text: 'Upcoming', class: 'upcoming' };
    } else if (meetingStart <= now && meetingEnd > now) {
      return { text: 'Live Now', class: 'live' };
    } else {
      return { text: 'Ended', class: 'ended' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  // Get workspace name by ID
  const getWorkspaceName = (workspaceId) => {
    const workspace = workspaces.find(w => w._id === workspaceId);
    return workspace?.name || 'Unknown Workspace';
  };

  // Check if current user created the meeting
  const isMeetingCreator = (meeting) => {
    return meeting.createdBy === currentUser?._id;
  };

  return (
    <div className="meeting-page">
      {/* Header with user info */}
      <div className="meeting-header">
        <div>
          <h1>📅 Meetings</h1>
          <p>Welcome, {currentUser?.username || 'User'}! Schedule and join meetings with your team</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowScheduleModal(true)}
          disabled={workspaces.length === 0 || apiStatus === 'offline'}
        >
          + Schedule Meeting
        </button>
      </div>

      {/* Backend Status Warning */}
      {apiStatus === 'offline' && (
        <div className="error-alert">
          <span>⚠️ Cannot connect to server. Please make sure backend is running on port 5000</span>
          <button onClick={checkBackendStatus}>Retry</button>
        </div>
      )}

      {/* Error Message */}
      {error && apiStatus === 'online' && (
        <div className="error-alert">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* No Workspaces Warning */}
      {workspaces.length === 0 && apiStatus === 'online' && (
        <div className="warning-alert">
          <span>⚠️ You need to create or join a workspace first to schedule meetings.</span>
        </div>
      )}

      {/* Filter Bar */}
      {workspaces.length > 0 && apiStatus === 'online' && (
        <div className="filter-bar">
          <select
            value={selectedWorkspace}
            onChange={(e) => setSelectedWorkspace(e.target.value)}
          >
            <option value="all">All Workspaces</option>
            {workspaces.map(ws => (
              <option key={ws._id} value={ws._id}>{ws.name}</option>
            ))}
          </select>
          <span>📊 Total: {filteredMeetings.length} meetings for {currentUser?.username}</span>
        </div>
      )}

      {/* Meetings Grid */}
      {apiStatus === 'online' ? (
        loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading meetings for {currentUser?.username}...</p>
          </div>
        ) : (
          <div className="meetings-grid">
            {filteredMeetings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h2>No meetings scheduled for {currentUser?.username}</h2>
                <p>
                  {workspaces.length === 0 
                    ? 'Create or join a workspace to start scheduling meetings'
                    : 'Schedule your first meeting to get started'}
                </p>
                {workspaces.length > 0 && (
                  <button 
                    className="btn-primary"
                    onClick={() => setShowScheduleModal(true)}
                  >
                    Schedule Your First Meeting
                  </button>
                )}
              </div>
            ) : (
              filteredMeetings.map(meeting => {
                const status = getStatusBadge(meeting);
                const isCreator = isMeetingCreator(meeting);
                
                return (
                  <div key={meeting._id} className="meeting-card">
                    <div className="meeting-card-header">
                      <div className="meeting-time">
                        <span className="date">{formatDate(meeting.date)}</span>
                        <span className="time">{formatTime(meeting.time)}</span>
                      </div>
                      <span className={`status-badge ${status.class}`}>
                        {status.text}
                      </span>
                    </div>
                    
                    <div className="meeting-card-body">
                      <h3>{meeting.title}</h3>
                      <p className="description">{meeting.description || 'No description'}</p>
                      
                      <div className="meeting-details">
                        <span>⏱️ {meeting.duration} min</span>
                        <span>👥 {meeting.participants?.length || 1} participants</span>
                      </div>

                      <div className="workspace-tag">
                        {getWorkspaceName(meeting.workspaceId)}
                      </div>
                      
                      {isCreator && (
                        <div className="creator-badge">
                          👑 You organized this
                        </div>
                      )}
                    </div>

                    <div className="meeting-card-footer">
                      <button 
                        className="btn-secondary"
                        onClick={() => {/* View details */}}
                      >
                        Details
                      </button>
                      {status.class === 'live' && (
                        <button 
                          className="btn-primary join-btn"
                          onClick={() => handleJoinMeeting(meeting)}
                        >
                          🎥 Join Now
                        </button>
                      )}
                      {status.class === 'upcoming' && (
                        <button className="btn-secondary" disabled>
                          Starts at {formatTime(meeting.time)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )
      ) : (
        <div className="offline-state">
          <div className="offline-icon">🔌</div>
          <h2>Backend Server Not Running</h2>
          <p>Please start your backend server on port 5000</p>
          <button 
            className="btn-primary"
            onClick={checkBackendStatus}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showScheduleModal && workspaces.length > 0 && apiStatus === 'online' && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Schedule Meeting</h2>
              <button className="close-btn" onClick={() => setShowScheduleModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Meeting Title <span className="required">*</span></label>
                <input
                  type="text"
                  value={meetingData.title}
                  onChange={(e) => setMeetingData({...meetingData, title: e.target.value})}
                  placeholder="e.g., Sprint Planning"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={meetingData.description}
                  onChange={(e) => setMeetingData({...meetingData, description: e.target.value})}
                  placeholder="Meeting agenda"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Workspace <span className="required">*</span></label>
                <select
                  value={meetingData.workspaceId}
                  onChange={(e) => setMeetingData({...meetingData, workspaceId: e.target.value})}
                >
                  <option value="">Select workspace</option>
                  {workspaces.map(ws => (
                    <option key={ws._id} value={ws._id}>{ws.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date <span className="required">*</span></label>
                  <input
                    type="date"
                    value={meetingData.date}
                    onChange={(e) => setMeetingData({...meetingData, date: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="form-group">
                  <label>Time <span className="required">*</span></label>
                  <input
                    type="time"
                    value={meetingData.time}
                    onChange={(e) => setMeetingData({...meetingData, time: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Duration</label>
                  <select
                    value={meetingData.duration}
                    onChange={(e) => setMeetingData({...meetingData, duration: parseInt(e.target.value)})}
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>
              
              <div className="form-info">
                <p>Meeting will be scheduled for <strong>{currentUser?.username}</strong></p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowScheduleModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleScheduleMeeting}
                disabled={loading}
              >
                {loading ? 'Scheduling...' : 'Schedule Meeting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Call */}
      {activeCall && (
        <VideoCallComponent 
          meeting={activeCall} 
          onClose={handleCloseCall}
          user={currentUser}
        />
      )}
    </div>
  );
};

export default MeetingPage;