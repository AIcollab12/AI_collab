import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";

import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());

// ---------- ROUTES ----------
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

// ---------- DATABASE ----------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.log("MongoDB connection error ❌", err));

// ---------- SOCKET.IO ----------
const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// ---------- SERVER ----------
const PORT = process.env.PORT || 5000;

// Handle EADDRINUSE automatically by picking another port
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
