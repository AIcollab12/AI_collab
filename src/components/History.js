import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const History = () => {
  const [historyData, setHistoryData] = useState({
    codeEdits: [],
    docEdits: [],
    whiteboardEdits: [],
    aiSuggestions: [],
    chatMessages: [],
  });

  useEffect(() => {
    socket.on("updateHistory", (data) => {
      setHistoryData(data);
    });

    return () => {
      socket.off("updateHistory");
    };
  }, []);

  const colors = ["#1e90ff", "#00bcd4", "#4caf50", "#ff9800", "#e91e63"];

  const chartData = [
    { name: "Code", value: historyData.codeEdits.length },
    { name: "Docs", value: historyData.docEdits.length },
    { name: "Whiteboard", value: historyData.whiteboardEdits.length },
    { name: "AI", value: historyData.aiSuggestions.length },
    { name: "Chat", value: historyData.chatMessages.length },
  ];

  const sectionStyle = {
    background: "#121826",
    padding: "16px",
    borderRadius: "10px",
    marginBottom: "20px",
    border: "1px solid #1f2a40",
  };

  const titleStyle = {
    color: "#4da3ff",
    marginBottom: "10px",
  };

  const listStyle = {
    color: "#cfd8dc",
    fontSize: "14px",
  };

  return (
    <div
      style={{
        background: "#0b0f14",
        minHeight: "100vh",
        padding: "25px",
        color: "#e0e0e0",
      }}
    >
      <h2 style={{ color: "#4da3ff", marginBottom: "25px" }}>
        📜 History & Analytics
      </h2>

      <div style={sectionStyle}>
        <h3 style={titleStyle}>💻 Code Editor Edits ({historyData.codeEdits.length})</h3>
        <ul style={listStyle}>
          {historyData.codeEdits.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>

      <div style={sectionStyle}>
        <h3 style={titleStyle}>📄 Document Edits ({historyData.docEdits.length})</h3>
        <ul style={listStyle}>
          {historyData.docEdits.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>

      <div style={sectionStyle}>
        <h3 style={titleStyle}>
          🎨 Whiteboard Actions ({historyData.whiteboardEdits.length})
        </h3>
        <ul style={listStyle}>
          {historyData.whiteboardEdits.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>

      <div style={sectionStyle}>
        <h3 style={titleStyle}>
          🤖 AI Suggestions ({historyData.aiSuggestions.length})
        </h3>
        <ul style={listStyle}>
          {historyData.aiSuggestions.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>

      <div style={sectionStyle}>
        <h3 style={titleStyle}>
          💬 Chat Messages ({historyData.chatMessages.length})
        </h3>
        <ul style={listStyle}>
          {historyData.chatMessages.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>

      <div style={sectionStyle}>
        <h3 style={titleStyle}>📊 Activity Analytics</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" stroke="#90caf9" />
            <YAxis stroke="#90caf9" />
            <Tooltip
              contentStyle={{
                background: "#1a2236",
                border: "none",
                color: "#fff",
              }}
            />
            <Bar dataKey="value">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default History;
