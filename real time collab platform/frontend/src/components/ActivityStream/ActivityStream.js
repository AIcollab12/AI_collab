// frontend/src/components/ActivityStream.jsx
import React, { useState, useEffect } from 'react';
import './ActivityStream.css';

const ActivityStream = () => {
  const [activities, setActivities] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    fetchActivities();
    // Setup WebSocket for real-time
    let ws;
    try {
      ws = new WebSocket('ws://localhost:5000');
    } catch (e) {
      console.warn('WebSocket connection failed:', e);
      return;
    }
    
    ws.onerror = (err) => {
      console.warn('WebSocket error:', err);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'activity') {
          setActivities(prev => [data.activity, ...prev.slice(0, 49)]);
        }
        if (data.type === 'onlineCount') {
          setOnlineUsers(data.count);
        }
      } catch (e) {
        console.warn('Invalid WebSocket message:', e);
      }
    };

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/activities');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setActivities(data.activities || []);
      setOnlineUsers(data.onlineUsers || 0);
    } catch (e) {
      console.warn('Failed to fetch activities:', e);
    }
  };

  return (
    <div className="activity-stream">
      <div className="header">
        <h3>Live Activity Stream</h3>
        <div className="online-badge">
          ● {onlineUsers} users online
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Time</th><th>User</th><th>Activity</th><th>Workspace</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((act, i) => (
            <tr key={act._id || act.time + act.user + i}>
              <td>{act.time}</td>
              <td>{act.user}</td>
              <td>{act.activity}</td>
              <td>{act.workspace}</td>
              <td><span className={`status-${act.status}`}>{act.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ActivityStream;