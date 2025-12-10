import { useEffect, useState } from "react";
import { API } from "../api/backend";
import {
  TextField,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Edit dialog state
  const [editClient, setEditClient] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const fetchClients = async () => {
    const res = await API.get("/clients");
    setClients(res.data);
  };

  const createClient = async () => {
    await API.post("/clients", { name, email });
    setName("");
    setEmail("");
    fetchClients();
  };

  const openEditDialog = (client) => {
    setEditClient(client);
    setEditName(client.name);
    setEditEmail(client.email);
  };

  const updateClient = async () => {
    await API.put(`/clients/${editClient.id}`, {
      name: editName,
      email: editEmail,
    });
    setEditClient(null);
    fetchClients();
  };

  const deleteClient = async (id) => {
    await API.delete(`/clients/${id}`);
    fetchClients();
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Clients</h2>

      <TextField
        label="Client Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ marginRight: 10 }}
      />
      <TextField
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ marginRight: 10 }}
      />
      <Button variant="contained" onClick={createClient}>
        Add Client
      </Button>

      <hr />

      <h3>Client List</h3>
      {clients.map((c) => (
        <div
          key={c.id}
          style={{
            padding: "10px 5px",
            borderBottom: "1px solid #ddd",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>
            <strong>{c.name}</strong> — {c.email}
          </span>

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
              color="error"
              variant="outlined"
              onClick={() => deleteClient(c.id)}
            >
              Delete
            </Button>
          </span>
        </div>
      ))}

      {/* Edit Dialog */}
      <Dialog open={!!editClient} onClose={() => setEditClient(null)}>
        <DialogTitle>Edit Client</DialogTitle>
        <DialogContent>
          <TextField
            label="Client Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            fullWidth
            margin="dense"
          />
          <TextField
            label="Email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            fullWidth
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditClient(null)}>Cancel</Button>
          <Button variant="contained" onClick={updateClient}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
