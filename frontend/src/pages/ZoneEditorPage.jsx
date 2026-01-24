import React, { useEffect, useRef, useState } from "react";
import { API } from "../api/backend";
import { Button, TextField } from "@mui/material";

export default function ZoneEditorPage() {
  const params = new URLSearchParams(window.location.search);
  const cameraId = params.get("cameraId"); // Keep as string to support both numeric IDs and UUID streamIds

  const [imageB64, setImageB64] = useState(null);

  // Points being currently drawn
  const [points, setPoints] = useState([]);

  // All saved zones for this camera
  const [existingZones, setExistingZones] = useState([]);

  // New zone name
  const [zoneName, setZoneName] = useState("");

  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  // -------------------------------------------------------
  // 1️⃣ Fetch all existing zones
  // -------------------------------------------------------
  useEffect(() => {
    if (!cameraId) return;

    API.get(`/zones/camera/${cameraId}`)
      .then((res) => setExistingZones(res.data || []))
      .catch(() => { });
  }, [cameraId]);

  // -------------------------------------------------------
  // 2️⃣ Capture snapshot from live stream
  // -------------------------------------------------------
  const captureSnapshot = () => {
    console.log("=== Capture Snapshot Clicked ===");
    console.log("Looking for streamId:", cameraId);
    const ws = new WebSocket("ws://localhost:8081");

    ws.onopen = () => {
      console.log("WebSocket connected successfully");
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        console.log("Received frame from streamId:", data.streamId);
        console.log("Comparing with:", cameraId);
        console.log("Match?", String(data.streamId) === String(cameraId));

        // Capture the first frame that has an image
        if (data.image && String(data.streamId) === String(cameraId)) {
          console.log("✓ Snapshot captured!");
          setImageB64(data.image);
          ws.close();
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      alert("Failed to connect to video stream. Make sure a stream is running.");
    };
  };

  // -------------------------------------------------------
  // 3️⃣ Handle canvas click (add polygon point)
  // -------------------------------------------------------
  const handleCanvasClick = (e) => {
    if (!imgRef.current) return;

    const rect = e.target.getBoundingClientRect();
    const x = Math.round(
      ((e.clientX - rect.left) / rect.width) *
      imgRef.current.naturalWidth
    );
    const y = Math.round(
      ((e.clientY - rect.top) / rect.height) *
      imgRef.current.naturalHeight
    );

    setPoints((prev) => [...prev, [x, y]]);
  };

  // -------------------------------------------------------
  // 4️⃣ Draw canvas overlay
  // -------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageB64) return;

    const ctx = canvas.getContext("2d");
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;

    console.log("Drawing zones:", existingZones);


    // Draw saved zones
    existingZones.forEach((zone, zi) => {
      if (!Array.isArray(zone.coordinates)) return;

      ctx.beginPath();
      zone.coordinates.forEach((pt, idx) => {
        if (!Array.isArray(pt) || pt.length !== 2) return;

        const [x, y] = pt;
        const sx = x * scaleX;
        const sy = y * scaleY;

        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });

      ctx.closePath();
      ctx.strokeStyle = `rgba(${(zi * 70) % 255},255,0,0.9)`; // different color per zone
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    // Draw currently drawn zone
    if (points.length > 0) {
      ctx.beginPath();
      points.forEach(([x, y], idx) => {
        const sx = x * scaleX;
        const sy = y * scaleY;
        idx === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      });
      ctx.strokeStyle = "rgba(0,200,255,0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw points
      points.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x * scaleX, y * scaleY, 5, 0, Math.PI * 2);
        ctx.fillStyle = "yellow";
        ctx.fill();
      });
    }
  }, [imageB64, points, existingZones]);

  // -------------------------------------------------------
  // 5️⃣ Save new zone
  // -------------------------------------------------------
  const saveZone = async () => {
    if (points.length < 3) {
      alert("Zone must have at least 3 points");
      return;
    }
    if (!zoneName.trim()) {
      alert("Please enter a zone name");
      return;
    }

    console.log("=== Saving Zone ===");
    console.log("cameraId:", cameraId);
    console.log("zoneName:", zoneName);
    console.log("coordinates:", points);

    try {
      const response = await API.post("/zones", {
        cameraId,
        zoneName,
        coordinates: points,
      });
      console.log("✓ Zone saved successfully:", response.data);

      setPoints([]);
      setZoneName("");

      const res = await API.get(`/zones/camera/${cameraId}`);
      setExistingZones(res.data);
    } catch (error) {
      console.error("❌ Error saving zone:", error);
      console.error("Error details:", error.response?.data);
      alert(`Failed to save zone: ${error.response?.data?.error || error.message}`);
    }
  };

  // -------------------------------------------------------
  // 6️⃣ Reset ALL zones
  // -------------------------------------------------------
  const resetZones = async () => {
    if (!window.confirm("Delete ALL zones for this camera?")) return;

    await API.delete(`/zones/camera/${cameraId}`);
    setExistingZones([]);
  };

  // -------------------------------------------------------
  // JSX
  // -------------------------------------------------------
  return (
    <div style={{ padding: 20 }}>
      <h2>Zone Editor – Camera {cameraId}</h2>

      {!imageB64 && (
        <Button variant="contained" onClick={captureSnapshot}>
          Capture Snapshot
        </Button>
      )}

      {imageB64 && (
        <>
          <div style={{ position: "relative", display: "inline-block" }}>
            <img
              ref={imgRef}
              src={`data:image/jpeg;base64,${imageB64}`}
              alt="zone frame"
              style={{ width: 800, display: "block" }}
            />
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                cursor: "crosshair",
              }}
            />
          </div>

          <br />
          <br />

          <TextField
            label="Zone Name"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            style={{ marginRight: 10 }}
          />

          <Button
            variant="outlined"
            color="error"
            onClick={() => setPoints([])}
          >
            Clear Points
          </Button>
          &nbsp;
          <Button variant="contained" onClick={saveZone}>
            Save Zone
          </Button>

          <br />
          <br />

          <Button variant="contained" color="error" onClick={resetZones}>
            Reset All Zones
          </Button>

          <hr />

          <h3>Existing Zones</h3>

          {existingZones.map((zone) => (
            <div
              key={zone.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px solid #ddd",
              }}
            >
              <span>{zone.zoneName}</span>
              <Button
                size="small"
                color="error"
                onClick={async () => {
                  await API.delete(`/zones/${zone.id}`);
                  setExistingZones((prev) =>
                    prev.filter((z) => z.id !== zone.id)
                  );
                }}
              >
                Delete
              </Button>
            </div>
          ))}

          <br />

          <Button
            onClick={() =>
              (window.location.href = `/live?cameraId=${cameraId}`)
            }
          >
            Back to Live View
          </Button>
        </>
      )}
    </div>
  );
}
