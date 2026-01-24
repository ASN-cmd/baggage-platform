import express from "express";
import { startStream, stopStream, getActiveStreams } from "../utils/engine.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Start a new stream (Spawns Python Process)
router.post("/start", (req, res) => {
  let { source, existingStreamId, restart } = req.body;

  // Check for source, unless we are restarting (engine handles source lookup)
  if (!source && !restart) {
    return res.status(400).json({ error: "Source is required (RTSP URL or File Path)" });
  }

  // Hardcode demo video path
  if (source === "demo") {
    // Navigate from backend/src/routes to root/video/test_video.mp4
    source = "D:\\Final-Year-Project\\baggage-platform\\video\\test_video.mp4";
  }

  // Use existing ID if provided (restarting a stream), or generate new
  const streamId = existingStreamId || uuidv4();

  // Pass restart flag to engine
  startStream(streamId, source, restart);

  res.json({ success: true, streamId, message: "Stream started" });
});

// Stop a stream
router.post("/stop", (req, res) => {
  const { streamId } = req.body;
  const stopped = stopStream(streamId);
  res.json({ success: stopped, message: stopped ? "Stream stopped" : "Stream not found" });
});

// Get active streams
router.get("/active", (req, res) => {
  const activeIds = getActiveStreams();
  res.json({ active: activeIds, count: activeIds.length });
});

export default router;
