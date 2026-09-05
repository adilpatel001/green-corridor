// Phase 3 update: POST /hazards now takes fromNode/toNode instead of raw
// lat/lng, and validates the edge actually exists in the graph before
// hitting the database at all. This is stricter than applyHazards()
// itself, which silently skips unknown edges — for the write path, a
// hazard referencing a nonexistent road is a client error worth a 400,
// not something to quietly swallow.

import { Router } from "express";
import { Hazard } from "../models/Hazard.js";
import { graph } from "../../algorithm/graph.js";

export const hazardsRouter = Router();

hazardsRouter.post("/", async (req, res) => {
  try {
    const { type, fromNode, toNode, severity, description } = req.body;

    if (!graph[fromNode]?.edges?.[toNode]) {
      return res.status(400).json({ error: `No edge from ${fromNode} to ${toNode} exists in the graph` });
    }

    const hazard = await Hazard.create({ type, fromNode, toNode, severity, description });
    res.status(201).json(hazard);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

hazardsRouter.get("/", async (req, res) => {
  try {
    const hazards = await Hazard.find().sort({ reportedAt: -1 });
    res.json(hazards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
