import { useState, useEffect } from "react";
import { API } from "../api/backend";
import {
  TextField,
  Button,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

export default function CamerasPage() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [cameras, setCameras] = useState([]);

  const [cameraName, setCameraName] = useState("");
  const [rtspUrl, setRtspUrl] = useState("");

  const [editCamera, setEditCamera] = useState(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");

  useEffect(() => {
    API.get("/projects").then((res) => setProjects(res.data));
  }, []);

  const fetchCameras = async (projId) => {
    const res = await API.get(`/cameras/project/${projId}`);
    setCameras(res.data);
  };

  const createCamera = async () => {
    await API.post("/cameras", { projectId, cameraName, rtspUrl });
    setCameraName("");
    setRtspUrl("");
    fetchCameras(projectId);
  };

  const openEditDialog = (camera) => {
    setEditCamera(camera);
    setEditName(camera.cameraName);
    setEditUrl(camera.rtspUrl);
  };

  const updateCamera = async () => {
    await API.put(`/cameras/${editCamera.id}`, {
      cameraName: editName,
      rtspUrl: editUrl,
    });
    setEditCamera(null);
    fetchCameras(projectId);
  };

  const deleteCamera = async (id) => {
    await API.delete(`/cameras/${id}`);
    fetchCameras(projectId);
  };

  return (
    <div>
      <h2>Cameras</h2>

      <TextField
        select
        label="Select Project"
        value={projectId}
        onChange={(e) => {
          setProjectId(e.target.value);
          fetchCameras(e.target.value);
        }}
        style={{ width: 300, marginBottom: 20 }}
      >
        {projects.map((project) => (
          <MenuItem key={project.id} value={project.id}>
            {project.name}
          </MenuItem>
        ))}
      </TextField>

      <br />

      <TextField
        label="Camera Name"
        value={cameraName}
        onChange={(e) => setCameraName(e.target.value)}
        style={{ marginRight: 10 }}
      />
      <TextField
        label="RTSP/HTTP URL"
        value={rtspUrl}
        onChange={(e) => setRtspUrl(e.target.value)}
        style={{ marginRight: 10 }}
      />

      <Button variant="contained" onClick={createCamera}>
        Add Camera
      </Button>

      <h3 style={{ marginTop: 20 }}>Camera List</h3>

      {cameras.map((c) => (
        <div
          key={c.id}
          style={{
            padding: "10px",
            borderBottom: "1px solid #ddd",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <strong>{c.cameraName}</strong> — {c.rtspUrl}

          <span>
            <Button
              size="small"
              variant="outlined"
              onClick={() => openEditDialog(c)}
              style={{ marginRight: 10 }}
            >
              Edit
            </Button>

            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => deleteCamera(c.id)}
            >
              Delete
            </Button>
          </span>
        </div>
      ))}

      {/* Edit Dialog */}
      <Dialog open={!!editCamera} onClose={() => setEditCamera(null)}>
        <DialogTitle>Edit Camera</DialogTitle>
        <DialogContent>
          <TextField
            label="Camera Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            fullWidth
            margin="dense"
          />
          <TextField
            label="RTSP/HTTP URL"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            fullWidth
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCamera(null)}>Cancel</Button>
          <Button variant="contained" onClick={updateCamera}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
