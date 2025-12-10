import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import clientRoutes from "./routes/client.js";
import projectRoutes from "./routes/projects.js";
import cameraRoutes from "./routes/cameras.js";

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

// Test DB connection
app.get("/test-db", async (req, res) => {
  const clients = await prisma.client.findMany();
  res.json(clients);
});

app.listen(3000, () => console.log("Server running on port 3000"));
