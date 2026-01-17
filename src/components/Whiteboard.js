import React, { useRef, useState, useEffect } from "react";

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);
  const [mode, setMode] = useState("draw"); // draw or erase
  const [aiMsg, setAiMsg] = useState("");
  const [aiChats, setAiChats] = useState([]);
  const [userMsg, setUserMsg] = useState("");
  const [userChats, setUserChats] = useState([]);

  // ---------------- INIT CANVAS ----------------
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = brushColor;
    ctxRef.current = ctx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initialize only once

  // ---------------- UPDATE BRUSH ----------------
  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.lineWidth = brushSize;
      ctxRef.current.strokeStyle = mode === "draw" ? brushColor : "#ffffff";
    }
  }, [brushColor, brushSize, mode]);

  // ---------------- DRAWING EVENTS ----------------
  const startDrawing = (e) => {
    setDrawing(true);
    const { offsetX, offsetY } = e.nativeEvent;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
  };

  const draw = (e) => {
    if (!drawing) return;
    const { offsetX, offsetY } = e.nativeEvent;
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();
  };

  const stopDrawing = () => {
    setDrawing(false);
    ctxRef.current.closePath();
  };

  // ---------------- CLEAR CANVAS ----------------
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
  };

  // ---------------- INSERT SYMBOL ----------------
  const insertSymbol = () => {
    const symbols = ["©", "®", "™", "✓", "★", "☆", "♠", "♣", "♥", "♦", "Ω", "π"];
    const sym = prompt("Choose symbol:\n" + symbols.join(" "));
    if (sym) {
      const canvas = canvasRef.current;
      ctxRef.current.font = "30px Arial";
      ctxRef.current.fillStyle = brushColor;
      ctxRef.current.fillText(sym, canvas.width / 2, canvas.height / 2);
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

  // ---------------- COLORS ----------------
  const colors = [
    "#000000",
    "#ff0000",
    "#0000ff",
    "#008000",
    "#ff69b4",
    "#800080",
    "#ffa500",
    "#ffffff"
  ];

  return (
    <div style={{ display: "flex", height: "90vh", fontFamily: "Arial, sans-serif" }}>

      {/* ---------------- WHITEBOARD CANVAS ---------------- */}
      <div style={{ flex: 3, padding: "10px" }}>
        <h2>🖌 Whiteboard</h2>

        {/* Toolbar */}
        <div style={{ marginBottom: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <label>
            Brush Size:
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(e.target.value)}
            />
          </label>

          {/* Color Buttons */}
          {colors.map((c) => (
            <button
              key={c}
              style={{
                background: c,
                width: "30px",
                height: "30px",
                border: brushColor === c && mode === "draw" ? "3px solid #555" : "1px solid #ccc",
                cursor: "pointer"
              }}
              onClick={() => {
                setBrushColor(c);
                setMode("draw");
              }}
            />
          ))}

          <button onClick={() => setMode("draw")}>✏️ Draw</button>
          <button onClick={() => setMode("erase")}>🧹 Eraser</button>
          <button onClick={clearCanvas}>🗑 Clear</button>
          <button onClick={insertSymbol}>© Ω ♠ Symbol</button>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          style={{
            border: "1px solid #ccc",
            width: "100%",
            height: "60vh",
            cursor: mode === "draw" ? "crosshair" : "cell"
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

      {/* ---------------- RIGHT PANEL ---------------- */}
      <div style={{ flex: 1, borderLeft: "1px solid #ccc", display: "flex", flexDirection: "column" }}>
        
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

export default Whiteboard;
