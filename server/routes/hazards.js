// Phase 3 update: POST /hazards now takes fromNode/toNode instead of raw
// lat/lng, and validates the edge actually exists in the graph before
// hitting the database at all. This is stricter than applyHazards()
// itself, which silently skips unknown edges — for the write path, a
// hazard referencing a nonexistent road is a client error worth a 400,
// not something to quietly swallow.
//
// Phase 5 update: after a successful save, broadcast the new hazard to
// every connected client via Socket.IO. This is the one place hazards
// enter the system, so it's the only place that needs to know about
// live push at all — the rest of the app just reacts to the event.

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

    req.app.get("io").emit("hazard:created", hazard);

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