import express from "express";
import { PrismaClient } from "@prisma/client";
import { startStream } from "../utils/engine.js";

const router = express.Router();
const prisma = new PrismaClient();

// GET /zones/camera/:cameraId - List all zones for a camera or stream
router.get("/camera/:cameraId", async (req, res) => {
    try {
        const { cameraId } = req.params;
        const isNumeric = /^\d+$/.test(String(cameraId));
        const numericId = isNumeric ? parseInt(cameraId, 10) : null;

        const zones = await prisma.zone.findMany({
            where: isNumeric
                ? { cameraId: numericId }
                : { streamId: cameraId }
        });
        res.json(zones);
    } catch (error) {
        console.error("Error fetching zones:", error);
        res.status(500).json({ error: "Failed to fetch zones" });
    }
});

// POST /zones - Create a new zone
router.post("/", async (req, res) => {
    try {
        const { cameraId, zoneName, coordinates } = req.body;
        console.log("=== POST /zones ===");
        console.log("Received cameraId:", cameraId);
        console.log("Received zoneName:", zoneName);
        console.log("Received coordinates:", coordinates);

        // coordinates should be an array of points [[x,y], [x,y], ...]
        if (!cameraId || !zoneName || !coordinates) {
            console.log("❌ Missing fields");
            return res.status(400).json({ error: "Missing fields" });
        }

        // Strict check: only digits allowed for numeric ID
        // parseInt("8b...") returns 8, which is bad for UUIDs starting with a digit
        const isNumeric = /^\d+$/.test(String(cameraId));
        const numericCameraId = isNumeric ? parseInt(cameraId, 10) : null;
        console.log("Is numeric?", isNumeric);
        console.log("Will save as:", isNumeric ? `cameraId=${numericCameraId}` : `streamId=${cameraId}`);

        const zone = await prisma.zone.create({
            data: {
                cameraId: isNumeric ? numericCameraId : null,
                streamId: isNumeric ? null : cameraId,
                zoneName,
                coordinates,
            },
        });

        console.log("✓ Zone created:", zone);

        // RESTART ENGINE TO RELOAD ZONES
        console.log(`Triggering restart for stream ${cameraId}...`);
        startStream(cameraId, null, true);

        res.json(zone);
    } catch (error) {
        console.error("❌ Error creating zone:", error);
        res.status(500).json({ error: "Failed to create zone", details: error.message });
    }
});

// DELETE /zones/:id - Delete a specific zone
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deletedZone = await prisma.zone.delete({
            where: { id: parseInt(id) },
        });

        // RESTART ENGINE TO RELOAD ZONES
        const streamId = deletedZone.streamId || (deletedZone.cameraId ? String(deletedZone.cameraId) : null);
        if (streamId) {
            console.log(`Triggering restart for stream ${streamId} after zone deletion...`);
            startStream(streamId, null, true);
        }

        res.json({ message: "Zone deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete zone" });
    }
});

// DELETE /zones/camera/:cameraId - Delete ALL zones for a camera or stream
router.delete("/camera/:cameraId", async (req, res) => {
    try {
        const { cameraId } = req.params;
        const isNumeric = /^\d+$/.test(String(cameraId));
        const numericId = isNumeric ? parseInt(cameraId, 10) : null;

        await prisma.zone.deleteMany({
            where: isNumeric
                ? { cameraId: numericId }
                : { streamId: cameraId }
        });

        // RESTART ENGINE TO RELOAD ZONES
        console.log(`Triggering restart for stream ${cameraId} after all zones deletion...`);
        startStream(cameraId, null, true);

        res.json({ message: "All zones deleted for camera/stream" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete zones" });
    }
});

export default router;
