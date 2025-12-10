import { useState, useEffect } from "react";
import { API } from "../api/backend";
import { TextField, MenuItem } from "@mui/material";

export default function LiveCameraPage() {
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState("");
  const [cameraUrl, setCameraUrl] = useState("");

  useEffect(() => {
    API.get("/cameras").then(res => setCameras(res.data));
  }, []);

  const selectCamera = (id) => {
    setCameraId(id);
    const cam = cameras.find(c => c.id === id);
    setCameraUrl(cam.rtspUrl);
  };

  return (
    <div>
      <h2>Live Camera Stream</h2>

      <TextField
        select
        label="Select Camera"
        value={cameraId}
        onChange={(e) => selectCamera(e.target.value)}
        style={{ width: 300, marginBottom: 20 }}
      >
        {cameras.map(camera => (
          <MenuItem key={camera.id} value={camera.id}>
            {camera.cameraName}
          </MenuItem>
        ))}
      </TextField>

      <br />

      {cameraUrl && (
        <img 
          src={cameraUrl} 
          alt="Live Stream" 
          style={{ width: "640px", border: "2px solid black" }} 
        />
      )}
    </div>
  );
}
