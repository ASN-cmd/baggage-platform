import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

// ROUTES
import clientRoutes from "./routes/client.js";
import projectRoutes from "./routes/projects.js";
import cameraRoutes from "./routes/cameras.js";
import streamRoutes from "./routes/streams.js";
import annotationRoutes from "./routes/annotation.js";
import zoneRoutes from "./routes/zones.js";
import path from "path";
import { fileURLToPath } from "url";

// EXPRESS + PRISMA SETUP
const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/clients", clientRoutes);
app.use("/projects", projectRoutes);
app.use("/cameras", cameraRoutes);
app.use("/streams", streamRoutes);
app.use("/api/annotation", annotationRoutes);
app.use("/zones", zoneRoutes);

// SERVE STATIC FILES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../");

// Serve uploads so frontend can view them
app.use("/uploads", express.static(path.join(BACKEND_ROOT, "uploads")));
// Serve results
app.use("/results", express.static(path.join(BACKEND_ROOT, "current_annotation_output")));

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
    try {
      const parsed = JSON.parse(msg);

      // If it has streamId, it's a frame from Python
      if (parsed.streamId && parsed.image) {
        // Broadcast to all clients (Let frontend filter by streamId)
        // Optimization: Could filter by client subscription if we implemented that
        const broadcastMsg = JSON.stringify(parsed);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastMsg);
          }
        });
      }
    } catch (e) {
      console.log("Received non-JSON message or invalid format");
    }
  });
});


// =================================
// START EXPRESS API SERVER
// =================================
app.listen(5000, () => console.log("Server running on port 5000"));
