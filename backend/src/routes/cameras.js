import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * CREATE CAMERA
 * POST /cameras
 * body: { projectId, cameraName, rtspUrl, fps, resolutionWidth, resolutionHeight }
 */
router.post("/", async (req, res) => {
  try {
    const { projectId, cameraName, rtspUrl, fps, resolutionWidth, resolutionHeight } = req.body;

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) }
    });

    if (!project) return res.status(404).json({ error: "Project not found" });

    const camera = await prisma.camera.create({
      data: {
        projectId: Number(projectId),
        cameraName,
        rtspUrl,
        fps: fps ? Number(fps) : null,
        resolutionWidth: resolutionWidth ? Number(resolutionWidth) : null,
        resolutionHeight: resolutionHeight ? Number(resolutionHeight) : null
      }
    });

    res.json(camera);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create camera" });
  }
});

/**
 * GET ALL CAMERAS
 * GET /cameras
 */
router.get("/", async (req, res) => {
  try {
    const cameras = await prisma.camera.findMany({
      orderBy: { id: "asc" }
    });
    res.json(cameras);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch cameras" });
  }
});

/**
 * GET ONE CAMERA
 * GET /cameras/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const camera = await prisma.camera.findUnique({
      where: { id: Number(req.params.id) }
    });

    if (!camera) return res.status(404).json({ error: "Camera not found" });

    res.json(camera);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch camera" });
  }
});

/**
 * GET CAMERAS FOR A PROJECT
 * GET /cameras/project/:projectId
 */
router.get("/project/:projectId", async (req, res) => {
  try {
    const cameras = await prisma.camera.findMany({
      where: { projectId: Number(req.params.projectId) },
      orderBy: { id: "asc" }
    });

    res.json(cameras);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch cameras for this project" });
  }
});

/**
 * UPDATE CAMERA
 * PUT /cameras/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const { cameraName, rtspUrl, fps, resolutionWidth, resolutionHeight } = req.body;

    const camera = await prisma.camera.update({
      where: { id: Number(req.params.id) },
      data: {
        cameraName,
        rtspUrl,
        fps: fps ? Number(fps) : null,
        resolutionWidth: resolutionWidth ? Number(resolutionWidth) : null,
        resolutionHeight: resolutionHeight ? Number(resolutionHeight) : null
      }
    });

    res.json(camera);
  } catch (err) {
    res.status(500).json({ error: "Failed to update camera" });
  }
});

/**
 * DELETE CAMERA
 * DELETE /cameras/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    await prisma.camera.delete({
      where: { id: Number(req.params.id) }
    });

    res.json({ message: "Camera deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete camera" });
  }
});

export default router;
