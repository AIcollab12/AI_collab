import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import MonacoEditor from "@monaco-editor/react";
import api from "../api/axios";

const socket = io("http://localhost:5000");

function Editor() {
  /* ================= FILE STATES ================= */
  const [files, setFiles] = useState([
    { name: "main.js", content: "// Start coding here...\n" },
  ]);
  const [activeFile, setActiveFile] = useState(files[0]);

  /* ================= OTHER STATES ================= */
  const [output, setOutput] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState([]);

  /* ================= SOCKET ================= */
  useEffect(() => {
    socket.emit("join-room", "room1");

    socket.on("code-update", (newCode) => {
      setActiveFile((prev) => ({ ...prev, content: newCode }));
    });

    socket.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("code-update");
      socket.off("chat-message");
    };
  }, []);

  /* ================= EDIT ================= */
  const onChange = (value) => {
    setActiveFile((prev) => ({ ...prev, content: value }));
    socket.emit("code-change", { roomId: "room1", code: value });
  };

  /* ================= RUN ================= */
  const runCode = () => {
    try {
      // eslint-disable-next-line no-eval
      const result = eval(activeFile.content);
      setOutput(String(result));
    } catch (e) {
      setOutput("Error: " + e.message);
    }
  };

  /* ================= AI ================= */
  const getAiSuggestion = async () => {
    try {
      setAiOutput("🤖 Thinking...");
      const res = await api.post("/ai/suggest", {
        code: activeFile.content,
      });

      const comment =
        "\n\n// ===== 🤖 AI Suggestions =====\n" +
        res.data.suggestion
          .split("\n")
          .map((l) => "// " + l)
          .join("\n");

      setActiveFile((prev) => ({
        ...prev,
        content: prev.content + comment,
      }));
      setAiOutput(res.data.suggestion);
    } catch {
      setAiOutput("AI Error");
    }
  };

  /* ================= FILE UPLOAD ================= */
  const uploadFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const newFile = { name: file.name, content: reader.result };
      setFiles((prev) => [...prev, newFile]);
      setActiveFile(newFile);
    };
    reader.readAsText(file);
  };

  /* ================= CREATE NEW FILE ================= */
  const createNewFile = () => {
    const fileName = prompt("Enter file name (example: test.js)");
    if (!fileName) return;

    const newFile = {
      name: fileName,
      content: "// New file\n",
    };

    setFiles((prev) => [...prev, newFile]);
    setActiveFile(newFile);
  };

  /* ================= CHAT ================= */
  const sendMessage = () => {
    if (!chatMsg) return;
    socket.emit("chat-message", chatMsg);
    setMessages((prev) => [...prev, "You: " + chatMsg]);
    setChatMsg("");
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: "#020617" }}>
      
      {/* ========== FILE EXPLORER ========== */}
      <div style={{ width: "220px", borderRight: "1px solid #333", color: "#fff" }}>
        <div style={{ padding: "10px", fontWeight: "bold" }}>Files</div>

        {files.map((f, i) => (
          <div
            key={i}
            onClick={() => setActiveFile(f)}
            style={{
              padding: "6px 10px",
              cursor: "pointer",
              background:
                activeFile.name === f.name ? "#1e293b" : "transparent",
            }}
          >
            {f.name}
          </div>
        ))}

        {/* CHOOSE FILE */}
        <div style={{ padding: "10px" }}>
          <input type="file" onChange={uploadFile} />
        </div>

        {/* CREATE FILE */}
        <div style={{ padding: "10px" }}>
          <button style={btn} onClick={createNewFile}>
            ➕ New File
          </button>
        </div>
      </div>

      {/* ========== MAIN AREA ========== */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* TOP BAR */}
        <div style={{ padding: "8px", display: "flex", gap: "10px" }}>
          <button style={btn} onClick={runCode}>▶ Run</button>
          <button style={btn} onClick={getAiSuggestion}>🤖 AI</button>
        </div>

        {/* EDITOR */}
        <div style={{ flex: 1 }}>
          <MonacoEditor
            height="100%"
            language="javascript"
            theme="vs-dark"
            value={activeFile.content}
            onChange={onChange}
            options={{ minimap: { enabled: false }, automaticLayout: true }}
          />
        </div>

        {/* OUTPUT + AI */}
        <div style={{ height: "220px", display: "flex", color: "#fff" }}>
          <div style={{ flex: 1, padding: "10px", borderRight: "1px solid #333" }}>
            <b>Output</b>
            <pre>{output}</pre>
          </div>
          <div style={{ flex: 1, padding: "10px" }}>
            <b>AI Suggestion</b>
            <pre>{aiOutput}</pre>
          </div>
        </div>
      </div>

      {/* ========== CHAT ========== */}
      <div style={{ width: "250px", borderLeft: "1px solid #333", color: "#fff" }}>
        <div style={{ padding: "10px", fontWeight: "bold" }}>Chat</div>
        <div style={{ height: "80%", overflow: "auto", padding: "10px" }}>
          {messages.map((m, i) => (
            <div key={i}>{m}</div>
          ))}
        </div>
        <div style={{ display: "flex" }}>
          <input
            value={chatMsg}
            onChange={(e) => setChatMsg(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default Editor;

/* ========== BUTTON STYLE ========== */
const btn = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  cursor: "pointer",
  borderRadius: "4px",
};
