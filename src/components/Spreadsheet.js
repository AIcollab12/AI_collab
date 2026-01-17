import React, { useEffect, useState } from "react";

const CLIENT_ID = "Y586011566146-9p9qjh6koqo94pb0gcfktu3gqils619q.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

const Spreadsheet = () => {
  const [token, setToken] = useState(null);
  const [sheetUrl, setSheetUrl] = useState("");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const loginWithGoogle = () => {
    /* global google */
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        setToken(response.access_token);
      },
    });

    tokenClient.requestAccessToken();
  };

  const createSpreadsheet = async () => {
    if (!token) return alert("Login first");

    const res = await fetch(
      "https://sheets.googleapis.com/v4/spreadsheets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            title: "AI Collaborative Spreadsheet",
          },
        }),
      }
    );

    const data = await res.json();
    setSheetUrl(`https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📊 Google Spreadsheet</h2>

      {!token && (
        <button style={styles.btnBlue} onClick={loginWithGoogle}>
          🔐 Login with Google
        </button>
      )}

      {token && (
        <button style={styles.btnGreen} onClick={createSpreadsheet}>
          ➕ Create New Spreadsheet
        </button>
      )}

      {sheetUrl && (
        <iframe
          title="Google Spreadsheet"
          src={sheetUrl}
          style={styles.iframe}
        />
      )}
    </div>
  );
};

export default Spreadsheet;

/* ===================== STYLES ===================== */

const styles = {
  container: {
    background: "#0b0f14",
    minHeight: "100vh",
    padding: "20px",
    color: "#e0e0e0",
  },
  title: {
    color: "#4da3ff",
    marginBottom: "20px",
  },
  btnBlue: {
    background: "#1e90ff",
    border: "none",
    padding: "12px 18px",
    color: "#fff",
    fontSize: "16px",
    borderRadius: "6px",
    cursor: "pointer",
    marginRight: "10px",
  },
  btnGreen: {
    background: "#4caf50",
    border: "none",
    padding: "12px 18px",
    color: "#fff",
    fontSize: "16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  iframe: {
    width: "100%",
    height: "80vh",
    border: "none",
    marginTop: "20px",
    borderRadius: "8px",
  },
};
