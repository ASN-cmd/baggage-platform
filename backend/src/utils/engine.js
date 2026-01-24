import { spawn } from "child_process";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Keep track of active processes and restart locks
const activeStreams = new Map();
const restartLocks = new Set();

export const startStream = async (streamId, source, restart = false) => {
  // Concurrency lock: prevent multiple restarts at the same time for same stream
  if (restartLocks.has(streamId)) {
    console.log(`Restart already in progress for ${streamId}, ignoring request.`);
    return;
  }

  if (activeStreams.has(streamId)) {
    const activeStream = activeStreams.get(streamId);

    if (restart) {
      restartLocks.add(streamId);
      console.log(`Restarting stream ${streamId} to reload zones...`);
      const proc = activeStream.process || activeStream;
      const existingSource = activeStream.source;

      if (proc && typeof proc.kill === 'function') {
        proc.kill();
      }
      activeStreams.delete(streamId);

      // Give some time for the process to exit and port to be freed if applicable
      await new Promise(resolve => setTimeout(resolve, 800));
      restartLocks.delete(streamId);

      // If source not provided in args, use existing
      if (!source && existingSource) {
        source = existingSource;
        console.log(`Using existing source for restart: ${source}`);
      }
    } else {
      console.log(`Stream ${streamId} already running.`);
      return;
    }
  }

  // Check if we found a source, either from args or existing active stream
  // If not, and we are restarting, try to fetch from DB
  if (!source && restart) {
    try {
      const streamRecord = await prisma.stream.findUnique({
        where: { id: streamId }
      });
      if (streamRecord && streamRecord.source) {
        source = streamRecord.source;
        console.log(`Recovered source for stream ${streamId} from database: ${source}`);
      }
    } catch (err) {
      console.error(`Error fetching stream ${streamId} from DB:`, err);
    }
  }

  // If we still don't have a source (e.g. restart failed to find one), error
  if (!source) {
    console.error(`Cannot start stream ${streamId} without source`);
    return;
  }

  // 1. Fetch zones for this stream (Assumes streamId is numeric cameraId, or we need look up)
  // Logic: In streamRoutes, we likely pass the DB ID as streamId.
  // If streamId is a UUID string, we might need to look it up.
  // For now, let's assume we can try to parse it or use it. 
  // If the user uses UUIDs for streams but INTs for cameras, we have a disconnect. 
  // Let's assume for this "simple" app, streamId matches what's in the DB for Camera ID if possible, 
  // OR we just pass it and let the DB find nothing if it's invalid.

  let zonesArg = "[]";
  try {
    // Try to fetch zones by numeric cameraId or by streamId (UUID)
    // Strict check for numeric ID to avoid matching UUIDs starting with digits
    const isNumeric = /^\d+$/.test(String(streamId));
    const numericId = isNumeric ? parseInt(streamId, 10) : null;

    const zones = await prisma.zone.findMany({
      where: isNumeric
        ? { cameraId: numericId }
        : { streamId: streamId }
    });

    if (zones.length > 0) {
      const zoneData = zones.map(z => ({ name: z.zoneName, poly: z.coordinates }));
      zonesArg = JSON.stringify(zoneData);
      console.log(`Loading ${zones.length} zones for stream ${streamId}`);
    }
  } catch (err) {
    console.error("Error fetching zones for stream:", err);
  }

  console.log(`Starting Python Engine for ${streamId} with source: ${source}`);

  // Path to python script (Adjust relative path as needed)
  // Assuming backend is at D:\...\backend and python-engine is D:\...\python-engine
  const pythonScript = path.resolve(process.cwd(), "../python-engine/live_yolo_engine.py");

  const pythonProcess = spawn("python", [
    pythonScript,
    "--source", source,
    "--streamId", streamId,
    "--zones", zonesArg
  ]);

  pythonProcess.stdout.on("data", (data) => {
    console.log(`[Python ${streamId}]: ${data}`);
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error(`[Python Err ${streamId}]: ${data}`);
  });

  pythonProcess.on("close", (code) => {
    console.log(`[Python ${streamId}] exited with code ${code}`);
    activeStreams.delete(streamId);
    // Optional: Mark stream as inactive in DB?
    // prisma.stream.update({ where: { id: streamId }, data: { isActive: false } }).catch(e => console.error(e));
  });

  // Store process AND source
  activeStreams.set(streamId, { process: pythonProcess, source });

  // Persist to DB
  try {
    await prisma.stream.upsert({
      where: { id: streamId },
      update: { source: source, isActive: true },
      create: { id: streamId, source: source, isActive: true }
    });
    console.log(`Persisted stream ${streamId} to database.`);
  } catch (err) {
    console.error("Failed to persist stream info to DB:", err);
  }
};

export const stopStream = (streamId) => {
  const process = activeStreams.get(streamId);
  if (process) {
    process.kill();
    activeStreams.delete(streamId);
    console.log(`Stopped stream ${streamId}`);
    return true;
  }
  return false;
};

export const getActiveStreams = () => {
  return Array.from(activeStreams.keys());
};

export const isStreamActive = (streamId) => {
  return activeStreams.has(streamId);
};
