import React, { useState } from "react";
import axios from "axios";

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);

  // ---------- LOGIN STATE ----------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ---------- REGISTER STATE ----------
  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // ---------- ERROR STATE ----------
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ---------- LOGIN FUNCTION ----------
  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password }
      );

      localStorage.setItem("token", res.data.token);
      window.location.href = "/dashboard";
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Invalid email or password");
      } else {
        setError("Server error. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------- REGISTER FUNCTION ----------
  const handleRegister = async () => {
    setError("");

    if (!name || !regEmail || !regPassword) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);

      await axios.post("http://localhost:5000/api/auth/register", {
        name,
        email: regEmail,
        password: regPassword,
      });

      setIsRegister(false);
      setEmail(regEmail);
      setPassword(regPassword);
    } catch (err) {
      if (err.response?.status === 409) {
        setError("Email already exists");
      } else {
        setError("Registration failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------- OAUTH HANDLER ----------
  const handleOAuth = (provider) => {
    setError("");
    window.location.href = `http://localhost:5000/api/auth/${provider}`;
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ textAlign: "center" }}>
          {isRegister ? "Register" : "Login"}
        </h2>

        {/* -------- ERROR MESSAGE -------- */}
        {error && <div style={errorStyle}>{error}</div>}

        {isRegister ? (
          <>
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              style={inputStyle}
            />

            <input
              type="password"
              placeholder="Password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              style={inputStyle}
            />

            <button onClick={handleRegister} style={btnStyle} disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </button>

            <p style={switchStyle}>
              Already have an account?{" "}
              <span style={linkStyle} onClick={() => setIsRegister(false)}>
                Login
              </span>
            </p>
          </>
        ) : (
          <>
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />

            <button onClick={handleLogin} style={btnStyle} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <p style={switchStyle}>
              Don't have an account?{" "}
              <span style={linkStyle} onClick={() => setIsRegister(true)}>
                Register
              </span>
            </p>
          </>
        )}

        <hr style={{ margin: "20px 0" }} />

        {/* -------- OAuth Buttons -------- */}
        <button
          onClick={() => handleOAuth("google")}
          style={{ ...oauthBtnStyle, backgroundColor: "#db4437" }}
        >
          Continue with Google
        </button>

        <button
          onClick={() => handleOAuth("github")}
          style={{ ...oauthBtnStyle, backgroundColor: "#24292e" }}
        >
          Continue with GitHub
        </button>
      </div>
    </div>
  );
};

// ---------- STYLES ----------
const containerStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  background: "#f4f6f8",
};

const cardStyle = {
  padding: "40px",
  borderRadius: "10px",
  width: "400px",
  backgroundColor: "#fff",
  boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  margin: "10px 0",
  borderRadius: "5px",
  border: "1px solid #ccc",
};

const btnStyle = {
  width: "100%",
  padding: "10px",
  backgroundColor: "#1e90ff",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

const oauthBtnStyle = {
  width: "100%",
  padding: "10px",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  marginBottom: "10px",
};

const errorStyle = {
  background: "#ffe5e5",
  color: "#c00",
  padding: "10px",
  borderRadius: "5px",
  marginBottom: "10px",
  textAlign: "center",
};

const switchStyle = {
  textAlign: "center",
  marginTop: "10px",
};

const linkStyle = {
  color: "#1e90ff",
  cursor: "pointer",
};

export default Login;
