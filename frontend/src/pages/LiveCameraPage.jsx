import { useEffect, useState } from "react";

export default function LiveCameraPage() {
  const [image, setImage] = useState("");
  const [data, setData] = useState(null);
  const params = new URLSearchParams(window.location.search);
  const targetCameraId = params.get("cameraId");

  useEffect(() => {
    // Restart stream to ensure latest zones are loaded
    console.log("LiveCameraPage Mounted. targetCameraId:", targetCameraId);

    if (targetCameraId) {
      console.log(`Attempting to restart stream ${targetCameraId}...`);
      // Just fire and forget - if it fails, the stream might already be running or handled elsewhere
      // But we want to force a restart to pick up new zones
      fetch("http://localhost:5000/streams/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: targetCameraId,
          restart: true
        })
      })
        .then(res => res.json())
        .then(data => console.log("Restart response:", data))
        .catch(err => console.error("Failed to restart stream:", err));
    } else {
      console.warn("No targetCameraId found in URL!");
    }

    const ws = new WebSocket("ws://localhost:8081");

    ws.onopen = () => {
      console.log("🔵 React WebSocket Connected");
    };

    ws.onerror = (err) => {
      console.log("🔴 WebSocket Error:", err);
    };

    ws.onclose = () => {
      console.log("🟠 WebSocket Closed");
    };

    ws.onmessage = (msg) => {
      try {
        const payload = JSON.parse(msg.data);

        // Filter by streamId/cameraId if specified in URL
        if (targetCameraId && payload.streamId !== targetCameraId) {
          return;
        }

        setImage("data:image/jpeg;base64," + payload.image);
        setData(payload);
      } catch (e) {
        console.error("Error parsing WS message:", e);
      }
    };

    return () => ws.close();
  }, [targetCameraId]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Live YOLO Detection Stream {targetCameraId ? `(${targetCameraId})` : ""}</h2>

      {data && (
        <div style={{ marginBottom: 10 }}>
          <strong>Total Count: {data.count}</strong>
          {data.zone_counts && Object.entries(data.zone_counts).map(([name, count]) => (
            <span key={name} style={{ marginLeft: 15, color: 'blue' }}>
              {name}: {count}
            </span>
          ))}
        </div>
      )}

      {image ? (
        <img
          src={image}
          alt="YOLO Stream"
          style={{ width: "720px", border: "2px solid black", display: "block" }}
        />
      ) : (
        <p>Waiting for frames...</p>
      )}
    </div>
  );
}
