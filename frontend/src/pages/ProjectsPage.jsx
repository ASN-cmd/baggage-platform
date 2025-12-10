import { useState, useEffect } from "react";
import { API } from "../api/backend";
import {
  TextField,
  Button,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

export default function ProjectsPage() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [projects, setProjects] = useState([]);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const [editProject, setEditProject] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");

  useEffect(() => {
    API.get("/clients").then((res) => setClients(res.data));
  }, []);

  const fetchProjects = async (id) => {
    const res = await API.get(`/projects/client/${id}`);
    setProjects(res.data);
  };

  const createProject = async () => {
    await API.post("/projects", { clientId, name, location });
    setName("");
    setLocation("");

    fetchProjects(clientId);
  };

  const openEditDialog = (project) => {
    setEditProject(project);
    setEditName(project.name);
    setEditLocation(project.location);
  };

  const updateProject = async () => {
    await API.put(`/projects/${editProject.id}`, {
      name: editName,
      location: editLocation,
    });
    setEditProject(null);
    fetchProjects(clientId);
  };

  const deleteProject = async (id) => {
    await API.delete(`/projects/${id}`);
    fetchProjects(clientId);
  };

  return (
    <div>
      <h2>Projects</h2>

      <TextField
        select
        label="Select Client"
        value={clientId}
        onChange={(e) => {
          setClientId(e.target.value);
          fetchProjects(e.target.value);
        }}
        style={{ width: 300, marginBottom: 20 }}
      >
        {clients.map((client) => (
          <MenuItem key={client.id} value={client.id}>
            {client.name}
          </MenuItem>
        ))}
      </TextField>

      <br />

      <TextField
        label="Project Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ marginRight: 10 }}
      />
      <TextField
        label="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        style={{ marginRight: 10 }}
      />

      <Button variant="contained" onClick={createProject}>
        Add Project
      </Button>

      <h3 style={{ marginTop: 20 }}>Project List</h3>

      {projects.map((p) => (
        <div
          key={p.id}
          style={{
            padding: "10px 5px",
            borderBottom: "1px solid #ddd",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <strong>{p.name}</strong> — {p.location}

          <span>
            <Button
              size="small"
              variant="outlined"
              onClick={() => openEditDialog(p)}
              style={{ marginRight: 10 }}
            >
              Edit
            </Button>

            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={() => deleteProject(p.id)}
            >
              Delete
            </Button>
          </span>
        </div>
      ))}

      {/* Edit Dialog */}
      <Dialog open={!!editProject} onClose={() => setEditProject(null)}>
        <DialogTitle>Edit Project</DialogTitle>
        <DialogContent>
          <TextField
            label="Project Name"
            fullWidth
            margin="dense"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <TextField
            label="Location"
            fullWidth
            margin="dense"
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProject(null)}>Cancel</Button>
          <Button variant="contained" onClick={updateProject}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
