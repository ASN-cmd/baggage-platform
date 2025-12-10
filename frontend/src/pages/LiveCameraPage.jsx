import { useEffect, useState } from "react";

export default function LiveCameraPage() {
  const [image, setImage] = useState("");

  useEffect(() => {
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
      console.log("🟢 React received frame:", msg.data.length);
      setImage("data:image/jpeg;base64," + msg.data);
    };

    return () => ws.close();
  }, []);

  return (
    <div>
      <h2>Live YOLO Detection Stream</h2>
      {image ? (
        <img
          src={image}
          alt="YOLO Stream"
          style={{ width: "720px", border: "2px solid black" }}
        />
      ) : (
        <p>Waiting for frames...</p>
      )}
    </div>
  );
}
