import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

// ROUTES
import clientRoutes from "./routes/client.js";
import projectRoutes from "./routes/projects.js";
import cameraRoutes from "./routes/cameras.js";

// EXPRESS + PRISMA SETUP
const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/clients", clientRoutes);
app.use("/projects", projectRoutes);
app.use("/cameras", cameraRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend running" });
});

app.get("/test-db", async (req, res) => {
  const clients = await prisma.client.findMany();
  res.json(clients);
});

// ================================
// 🔥 WEBSOCKET SERVER (IMPORTANT)
// ================================
import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8081 });
console.log("WS Server running on ws://localhost:8081");

wss.on("connection", (ws) => {
  console.log("Client connected to WebSocket");

  ws.on("message", (msg) => {
    const text = msg.toString();

    // Check if message is valid base64 JPEG (Python frame)
    const isPythonFrame =
      text.length > 1000 &&               // base64 frame is large
      (text.startsWith("/") || text.startsWith("iVB") || text.startsWith("/9j"));

    if (!isPythonFrame) {
      console.log("Ignoring non-frame message");
      return;
    }

    console.log("Broadcasting frame:", text.length);

    // Broadcast only Python frames to all React clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    });
  });
});


// =================================
// START EXPRESS API SERVER
// =================================
app.listen(3000, () => console.log("Server running on port 3000"));
