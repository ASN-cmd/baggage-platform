import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * CREATE PROJECT
 * POST /projects
 * body: { clientId, name, location }
 */
router.post("/", async (req, res) => {
  try {
    const { clientId, name, location } = req.body;

    // check if client exists
    const client = await prisma.client.findUnique({
      where: { id: Number(clientId) }
    });

    if (!client)
      return res.status(404).json({ error: "Client not found" });

    const project = await prisma.project.create({
      data: {
        name,
        location,
        clientId: Number(clientId)
      }
    });

    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

/**
 * GET ALL PROJECTS
 * GET /projects
 */
router.get("/", async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { id: "asc" }
    });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

/**
 * GET PROJECT BY ID
 * GET /projects/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(req.params.id) },
      include: { client: true } // return client info too
    });

    if (!project)
      return res.status(404).json({ error: "Project not found" });

    res.json(project);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

/**
 * GET ALL PROJECTS FOR A CLIENT
 * GET /projects/client/:clientId
 */
router.get("/client/:clientId", async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { clientId: Number(req.params.clientId) },
      orderBy: { id: "asc" }
    });

    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch client projects" });
  }
});

/**
 * UPDATE PROJECT
 * PUT /projects/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const { name, location } = req.body;

    const project = await prisma.project.update({
      where: { id: Number(req.params.id) },
      data: { name, location }
    });

    res.json(project);
  } catch (err) {
    res.status(500).json({ error: "Failed to update project" });
  }
});

/**
 * DELETE PROJECT
 * DELETE /projects/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    await prisma.project.delete({
      where: { id: Number(req.params.id) }
    });

    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
