import React from "react";

const Sidebar = () => {
  return (
    <div style={{
      width: "220px",
      background: "#1e1e1e",
      color: "white",
      padding: "20px"
    }}>
      <h2>Workspace</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        <li>📄 Docs</li>
        <li>💻 Code</li>
        <li>🎨 Whiteboard</li>
        <li>📊 Sheets</li>
        <li>💬 Chat</li>
      </ul>
    </div>
  );
};

export default Sidebar;
