import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * CREATE CLIENT
 * POST /clients
 * body: { name, email }
 */
router.post("/", async (req, res) => {
  try {
    const { name, email } = req.body;

    const client = await prisma.client.create({
      data: { name, email },
    });

    res.json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create client" });
  }
});

/**
 * GET ALL CLIENTS
 * GET /clients
 */
router.get("/", async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { id: "asc" },
    });

    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

/**
 * GET ONE CLIENT
 * GET /clients/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!client)
      return res.status(404).json({ error: "Client not found" });

    res.json(client);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

/**
 * UPDATE CLIENT
 * PUT /clients/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const { name, email } = req.body;

    const client = await prisma.client.update({
      where: { id: Number(req.params.id) },
      data: { name, email },
    });

    res.json(client);
  } catch (err) {
    res.status(500).json({ error: "Failed to update client" });
  }
});

/**
 * DELETE CLIENT
 * DELETE /clients/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    await prisma.client.delete({
      where: { id: Number(req.params.id) },
    });

    res.json({ message: "Client deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete client" });
  }
});

export default router;
