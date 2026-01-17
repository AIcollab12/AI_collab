import React, { useState } from "react";
import CodeEditor from "../components/CodeEditor";
import DocumentEditor from "../components/DocumentEditor";

function Workspace() {
  const [active, setActive] = useState("code");

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* TOP BAR */}
      <div style={topBar}>
        <button style={btn} onClick={() => setActive("code")}>
          💻 Code Editor
        </button>
        <button style={btn} onClick={() => setActive("docs")}>
          📝 Document Editor
        </button>
      </div>

      {/* EDITOR AREA */}
      <div style={{ flex: 1 }}>
        {active === "code" ? <CodeEditor /> : <DocumentEditor />}
      </div>
    </div>
  );
}

export default Workspace;

/* STYLES */
const topBar = {
  height: "50px",
  background: "#020617",
  display: "flex",
  alignItems: "center",
  padding: "0 10px",
};

const btn = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "6px 14px",
  marginRight: "10px",
  cursor: "pointer",
  borderRadius: "4px",
};
