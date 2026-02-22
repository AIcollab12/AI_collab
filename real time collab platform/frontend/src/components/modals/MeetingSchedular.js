import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './MeetingScheduler.css';

const MeetingScheduler = ({ workspaceId, onClose, onSchedule }) => {
  const [meetingDetails, setMeetingDetails] = useState({
    title: '',
    description: '',
    startTime: new Date(),
    endTime: new Date(new Date().getTime() + 60 * 60000), // +1 hour
    participants: [],
    isRecurring: false,
    recurrencePattern: 'weekly',
    reminders: [15, 60] // 15 min and 1 hour before
  });

  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Fetch workspace members
  React.useEffect(() => {
    fetchWorkspaceMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const fetchWorkspaceMembers = async () => {
    try {
      const response = await fetch(`/api/workpackage/${workspaceId}/members`);
      const data = await response.json();
      setAvailableUsers(data.members);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleScheduleMeeting = async () => {
    const meetingData = {
      ...meetingDetails,
      workspaceId,
      participants: selectedParticipants.map(p => ({
        userId: p._id,
        email: p.email,
        status: 'pending'
      }))
    };

    try {
      const response = await fetch('/api/meetings/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(meetingData)
      });

      if (response.ok) {
        const meeting = await response.json();
        
        // Send email invitations
        await sendInvitations(meeting);
        
        // Show success message
        onSchedule(meeting);
        onClose();
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error);
    }
  };

  const sendInvitations = async (meeting) => {
    // Send email invites to all participants
    try {
      await fetch('/api/meetings/send-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting._id })
      });
    } catch (err) {
      console.error('Failed to send meeting invitations:', err);
    }
  };

  return (
    <div className="meeting-scheduler-modal">
      <div className="modal-header">
        <h2>Schedule a Meeting</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="modal-body">
        {/* Meeting Title */}
        <div className="form-group">
          <label>Meeting Title *</label>
          <input
            type="text"
            value={meetingDetails.title}
            onChange={(e) => setMeetingDetails({
              ...meetingDetails,
              title: e.target.value
            })}
            placeholder="e.g., Sprint Planning, Code Review"
            required
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={meetingDetails.description}
            onChange={(e) => setMeetingDetails({
              ...meetingDetails,
              description: e.target.value
            })}
            placeholder="Meeting agenda, topics to discuss..."
            rows="3"
          />
        </div>

        {/* Date & Time Selection */}
        <div className="datetime-group">
          <div className="form-group">
            <label>Start Time</label>
            <DatePicker
              selected={meetingDetails.startTime}
              onChange={(date) => setMeetingDetails({
                ...meetingDetails,
                startTime: date,
                endTime: new Date(date.getTime() + 60 * 60000)
              })}
              showTimeSelect
              dateFormat="MMMM d, yyyy h:mm aa"
              minDate={new Date()}
              className="datetime-picker"
            />
          </div>

          <div className="form-group">
            <label>End Time</label>
            <DatePicker
              selected={meetingDetails.endTime}
              onChange={(date) => setMeetingDetails({
                ...meetingDetails,
                endTime: date
              })}
              showTimeSelect
              dateFormat="MMMM d, yyyy h:mm aa"
              minDate={meetingDetails.startTime}
              className="datetime-picker"
            />
          </div>
        </div>

        {/* Duration Display */}
        <div className="duration-display">
          Duration: {Math.round((meetingDetails.endTime - meetingDetails.startTime) / 60000)} minutes
        </div>

        {/* Participant Selection */}
        <div className="form-group">
          <label>Invite Participants</label>
          <div className="participant-selector">
            {availableUsers.map(user => (
              <label key={user._id} className="participant-checkbox">
                <input
                  type="checkbox"
                  value={user._id}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedParticipants([...selectedParticipants, user]);
                    } else {
                      setSelectedParticipants(
                        selectedParticipants.filter(p => p._id !== user._id)
                      );
                    }
                  }}
                />
                <span className="user-avatar-small">
                  {user.username.charAt(0).toUpperCase()}
                </span>
                <span>{user.username} ({user.email})</span>
              </label>
            ))}
          </div>
        </div>

        {/* Recurring Meeting Option */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={meetingDetails.isRecurring}
              onChange={(e) => setMeetingDetails({
                ...meetingDetails,
                isRecurring: e.target.checked
              })}
            />
            <span>Repeat this meeting</span>
          </label>

          {meetingDetails.isRecurring && (
            <div className="recurring-options">
              <select
                value={meetingDetails.recurrencePattern}
                onChange={(e) => setMeetingDetails({
                  ...meetingDetails,
                  recurrencePattern: e.target.value
                })}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
        </div>

        {/* Reminders */}
        <div className="form-group">
          <label>Reminders</label>
          <div className="reminder-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={meetingDetails.reminders.includes(15)}
                onChange={(e) => {
                  const newReminders = e.target.checked
                    ? [...meetingDetails.reminders, 15]
                    : meetingDetails.reminders.filter(r => r !== 15);
                  setMeetingDetails({ ...meetingDetails, reminders: newReminders });
                }}
              />
              <span>15 minutes before</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={meetingDetails.reminders.includes(60)}
                onChange={(e) => {
                  const newReminders = e.target.checked
                    ? [...meetingDetails.reminders, 60]
                    : meetingDetails.reminders.filter(r => r !== 60);
                  setMeetingDetails({ ...meetingDetails, reminders: newReminders });
                }}
              />
              <span>1 hour before</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={meetingDetails.reminders.includes(1440)}
                onChange={(e) => {
                  const newReminders = e.target.checked
                    ? [...meetingDetails.reminders, 1440]
                    : meetingDetails.reminders.filter(r => r !== 1440);
                  setMeetingDetails({ ...meetingDetails, reminders: newReminders });
                }}
              />
              <span>1 day before</span>
            </label>
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button 
          className="btn-primary" 
          onClick={handleScheduleMeeting}
          disabled={!meetingDetails.title || selectedParticipants.length === 0}
        >
          Schedule Meeting
        </button>
      </div>
    </div>
  );
};

export default MeetingScheduler;