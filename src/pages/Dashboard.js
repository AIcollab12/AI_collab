import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

import CodeEditor from "../components/CodeEditor";
import DocumentEditor from "../components/DocumentEditor";
import Whiteboard from "../components/Whiteboard";
import Spreadsheet from "../components/Spreadsheet";

const socket = io("http://localhost:5000");

const Dashboard = () => {
  const [active, setActive] = useState("code");
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();

  // -------- GROUP MEMBERS (DEMO) --------
  const members = [
    { id: 1, name: "Supriya", online: true },
    { id: 2, name: "harshu", online: false },
    { id: 3, name: "Rahul", online: true },
    { id: 4, name: "Anjali", online: false },
  ];

  useEffect(() => {
    const username =
      localStorage.getItem("username") ||
      prompt("Enter your username") ||
      "Guest";

    const email =
      localStorage.getItem("email") ||
      `${username.toLowerCase()}@example.com`;

    setUser({
      username,
      email,
      avatar: username.charAt(0).toUpperCase(),
    });

    localStorage.setItem("username", username);
    localStorage.setItem("email", email);

    socket.emit("join", { username });

    return () => socket.disconnect();
  }, []);

  const logout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#121212" }}>
      {/* ================= LEFT SIDEBAR ================= */}
      <div
        style={{
          width: "230px",
          background: "#1e1e1e",
          color: "#fff",
          padding: "15px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <button style={btn} onClick={() => setActive("code")}>
            💻 Code Editor
          </button>
          <button style={btn} onClick={() => setActive("doc")}>
            📄 Document Editor
          </button>
          <button style={btn} onClick={() => setActive("whiteboard")}>
            🧠 Whiteboard
          </button>
          <button style={btn} onClick={() => setActive("spreadsheet")}>
            📊 Spreadsheet
          </button>
          <button style={btn} onClick={() => navigate("/history")}>
            📈 History
          </button>
        </div>

        <p style={{ fontSize: "11px", color: "#aaa", textAlign: "center" }}>
          AI Collaborative Platform
        </p>
      </div>

      {/* ================= RIGHT CONTENT ================= */}
      <div style={{ flex: 1, position: "relative", padding: "15px" }}>
        {/* -------- PROFILE -------- */}
        {user && (
          <div style={{ position: "absolute", top: 15, right: 20 }}>
            <div
              onClick={() => setShowProfile(!showProfile)}
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "#1e90ff",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {user.avatar}
            </div>

            {showProfile && (
              <div
                style={{
                  position: "absolute",
                  top: "50px",
                  right: 0,
                  width: "260px",
                  background: "#111",
                  color: "#fff",
                  padding: "12px",
                  borderRadius: "8px",
                  boxShadow: "0 6px 12px rgba(0,0,0,0.6)",
                  zIndex: 100,
                }}
              >
                <p style={{ margin: 0, fontWeight: "bold" }}>
                  {user.username}
                </p>
                <p style={{ fontSize: "12px", color: "#aaa" }}>
                  {user.email}
                </p>

                <hr style={{ borderColor: "#333" }} />

                <p style={{ fontSize: "13px", color: "#4da3ff" }}>
                  👥 Group Members
                </p>

                {members.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "#333",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        marginRight: "8px",
                      }}
                    >
                      {m.name.charAt(0)}
                    </div>

                    <span style={{ flex: 1 }}>{m.name}</span>

                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: m.online ? "#00e676" : "#ff1744",
                      }}
                    />
                  </div>
                ))}

                <hr style={{ borderColor: "#333" }} />

                <button
                  onClick={logout}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "red",
                    color: "#fff",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}

        {/* -------- MAIN AREA -------- */}
        <div style={{ height: "100%" }}>
          {active === "code" && <CodeEditor socket={socket} />}
          {active === "doc" && <DocumentEditor socket={socket} />}
          {active === "whiteboard" && (
            <div style={{ background: "#fff", height: "100%" }}>
              <Whiteboard socket={socket} />
            </div>
          )}
          {active === "spreadsheet" && <Spreadsheet socket={socket} />}
        </div>
      </div>
    </div>
  );
};

/* ===== BUTTON STYLE ===== */
const btn = {
  width: "100%",
  padding: "10px",
  marginBottom: "10px",
  background: "red",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

export default Dashboard;
