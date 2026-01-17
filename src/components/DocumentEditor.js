import React, { useRef, useState } from "react";

const DocumentEditor = () => {
  const editorRef = useRef(null);
  const [aiMsg, setAiMsg] = useState("");
  const [aiChats, setAiChats] = useState([]);
  const [userChats, setUserChats] = useState([]);
  const [userMsg, setUserMsg] = useState("");

  // ---------------- FILE UPLOAD ----------------
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editorRef.current.innerHTML = reader.result;
    };
    reader.readAsText(file);
  };

  // ---------------- FILE DOWNLOAD ----------------
  const handleFileDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([editorRef.current.innerHTML], { type: "text/html" });
    element.href = URL.createObjectURL(file);
    element.download = "document.html";
    document.body.appendChild(element);
    element.click();
  };

  // ---------------- TEXT FORMATTING ----------------
  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
  };

  // ---------------- TABLE INSERTION ----------------
  const insertTable = () => {
    const rows = prompt("Number of rows", 2);
    const cols = prompt("Number of columns", 2);
    if (!rows || !cols) return;

    let table = "<table style='border:1px solid black; border-collapse: collapse; width:100%;'>";
    for (let i = 0; i < rows; i++) {
      table += "<tr>";
      for (let j = 0; j < cols; j++) {
        table += "<td style='border:1px solid black; padding:5px;'>Cell</td>";
      }
      table += "</tr>";
    }
    table += "</table><br/>";
    editorRef.current.innerHTML += table;
  };

  // ---------------- SYMBOL INSERTION ----------------
  const insertSymbol = () => {
    const symbols = ["©", "®", "™", "✓", "★", "☆", "♠", "♣", "♥", "♦", "∞", "≈", "≠", "≤", "≥"];
    const sym = prompt("Choose symbol:\n" + symbols.join(" "));
    if (sym) {
      editorRef.current.innerHTML += sym;
    }
  };

  // ---------------- IMAGE INSERTION ----------------
  const insertImage = () => {
    const url = prompt("Enter image URL");
    if (url) {
      editorRef.current.innerHTML += `<img src='${url}' style='max-width:100%; height:auto;' /><br/>`;
    }
  };

  // ---------------- AI CHAT ----------------
  const sendAi = () => {
    if (!aiMsg.trim()) return;
    setAiChats([...aiChats, { q: aiMsg, a: "AI suggestion will appear here" }]);
    setAiMsg("");
  };

  // ---------------- USER CHAT ----------------
  const sendUserMsg = () => {
    if (!userMsg.trim()) return;
    setUserChats([...userChats, userMsg]);
    setUserMsg("");
  };

  return (
    <div style={{ display: "flex", height: "90vh", fontFamily: "Arial, sans-serif" }}>

      {/* ---------------- DOCUMENT AREA ---------------- */}
      <div style={{ flex: 3, padding: "10px" }}>
        <h2>📄 Word-like Document Editor</h2>

        {/* ---------------- FILE UPLOAD / DOWNLOAD ---------------- */}
        <div style={{ marginBottom: "10px", display: "flex", gap: "5px" }}>
          <label style={{ background: "#eee", padding: "5px 10px", cursor: "pointer", border: "1px solid #ccc" }}>
            📂 Choose File
            <input type="file" onChange={handleFileUpload} style={{ display: "none" }} />
          </label>
          <button onClick={handleFileDownload}>💾 Download</button>
        </div>

        {/* ---------------- TOOLBAR ---------------- */}
        {/* Row 1: Text Styles */}
        <div style={{ marginBottom: "5px", display: "flex", gap: "5px" }}>
          <button title="Bold (B)" onClick={() => formatText("bold")}>🅱️ Bold</button>
          <button title="Italic (I)" onClick={() => formatText("italic")}>𝘐 Italic</button>
          <button title="Underline (U)" onClick={() => formatText("underline")}>🔽 Underline</button>
          <button title="StrikeThrough" onClick={() => formatText("strikeThrough")}>✖ Strike</button>
          <button title="Undo" onClick={() => formatText("undo")}>↩ Undo</button>
        </div>

        {/* Row 2: Alignment & Redo */}
        <div style={{ marginBottom: "5px", display: "flex", gap: "5px" }}>
          <button title="Align Left" onClick={() => formatText("justifyLeft")}>⬅️ Left</button>
          <button title="Align Center" onClick={() => formatText("justifyCenter")}>🔳 Center</button>
          <button title="Align Right" onClick={() => formatText("justifyRight")}>➡️ Right</button>
          <button title="Justify" onClick={() => formatText("justifyFull")}>📏 Justify</button>
          <button title="Redo" onClick={() => formatText("redo")}>↪ Redo</button>
        </div>

        {/* Row 3: Lists, Tables, Images, Symbols */}
        <div style={{ marginBottom: "5px", display: "flex", gap: "5px" }}>
          <button title="Ordered List" onClick={() => formatText("insertOrderedList")}>1️⃣ OL</button>
          <button title="Unordered List" onClick={() => formatText("insertUnorderedList")}>• UL</button>
          <button title="Insert Table" onClick={insertTable}>🟦 Table</button>
          <button title="Insert Image" onClick={insertImage}>🖼 Image</button>
          <button title="Insert Symbol" onClick={insertSymbol}>© Ω ♠</button>
        </div>

        {/* Row 4: Colors & Fonts */}
        <div style={{ marginBottom: "5px", display: "flex", gap: "5px" }}>
          <input type="color" onChange={(e) => formatText("foreColor", e.target.value)} title="Text Color" />
          <input type="color" onChange={(e) => formatText("hiliteColor", e.target.value)} title="Background Color" />
          <select onChange={(e) => formatText("fontSize", e.target.value)} title="Font Size">
            <option value="1">8px</option>
            <option value="2">10px</option>
            <option value="3">12px</option>
            <option value="4">14px</option>
            <option value="5">18px</option>
            <option value="6">24px</option>
            <option value="7">32px</option>
          </select>
          <select onChange={(e) => formatText("fontName", e.target.value)} title="Font Family">
            <option value="Arial">Arial</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Verdana">Verdana</option>
          </select>
          <button title="Subscript" onClick={() => formatText("subscript")}>X₂</button>
        </div>

        {/* Row 5: Superscript */}
        <div style={{ marginBottom: "10px", display: "flex", gap: "5px" }}>
          <button title="Superscript" onClick={() => formatText("superscript")}>X²</button>
        </div>

        {/* ---------------- EDITABLE DOCUMENT ---------------- */}
        <div
          ref={editorRef}
          contentEditable
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            minHeight: "55vh",
            outline: "none",
            background: "#fff"
          }}
        >
          Start editing your document...
        </div>
      </div>

      {/* ---------------- RIGHT PANEL ---------------- */}
      <div style={{
        flex: 1,
        borderLeft: "1px solid #ccc",
        display: "flex",
        flexDirection: "column"
      }}>

        {/* AI CHAT */}
        <div style={{ flex: 1, padding: "10px", overflowY: "auto" }}>
          <h4>🤖 AI Suggestions</h4>
          {aiChats.map((c, i) => (
            <p key={i}><b>You:</b> {c.q}<br /><b>AI:</b> {c.a}</p>
          ))}
          <input
            value={aiMsg}
            onChange={(e) => setAiMsg(e.target.value)}
            placeholder="Ask AI..."
            style={{ width: "80%" }}
          />
          <button onClick={sendAi}>Send</button>
        </div>

        {/* USER CHAT */}
        <div style={{ flex: 1, padding: "10px", borderTop: "1px solid #ccc", overflowY: "auto" }}>
          <h4>💬 Users Chat</h4>
          {userChats.map((m, i) => <p key={i}>{m}</p>)}
          <input
            value={userMsg}
            onChange={(e) => setUserMsg(e.target.value)}
            placeholder="Message users..."
            style={{ width: "80%" }}
          />
          <button onClick={sendUserMsg}>Send</button>
        </div>

      </div>
    </div>
  );
};

export default DocumentEditor;
