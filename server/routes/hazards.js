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
import { computeExpiresAt, activeHazardsFilter } from "../expiry.js";
import { requireAuthority } from "../middleware/requireRole.js";

export const hazardsRouter = Router();

hazardsRouter.post("/", async (req, res) => {
  try {
    const { type, fromNode, toNode, severity, description } = req.body;

    if (!graph[fromNode]?.edges?.[toNode]) {
      return res.status(400).json({ error: `No edge from ${fromNode} to ${toNode} exists in the graph` });
    }

    const hazard = await Hazard.create({
      type,
      fromNode,
      toNode,
      severity,
      description,
      expiresAt: computeExpiresAt(type),
    });

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
    const wantsAll = req.query.all === "true";

    // ?all=true is the historical/audit view — Authority-only. Checked
    // here rather than as router-level middleware, since GET / without
    // the flag is the normal Citizen view everyone should be able to
    // call; only this specific query shape needs the elevated role.
    if (wantsAll && req.headers["x-role"] !== "authority") {
      return res.status(403).json({ error: "Authority role required to view hazard history" });
    }

    const filter = wantsAll ? {} : activeHazardsFilter();
    const hazards = await Hazard.find(filter).sort({ reportedAt: -1 });
    res.json(hazards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Phase 6: Authority-only — resolve a hazard before its natural expiry.
// Deliberately mirrors the expiry design from Phase 6a: this does NOT
// delete the document. It sets expiresAt to now (so it immediately stops
// affecting routing/display, exactly like natural expiry does) and flags
// resolved: true so the audit history can tell the two apart.
hazardsRouter.patch("/:id/resolve", requireAuthority, async (req, res) => {
  try {
    const hazard = await Hazard.findById(req.params.id);
    if (!hazard) {
      return res.status(404).json({ error: "Hazard not found" });
    }

    hazard.expiresAt = new Date();
    hazard.resolved = true;
    await hazard.save();

    // Same live-update mechanism Phase 5 built for creation — every
    // connected client (including ones mid-route through this hazard)
    // reacts immediately, without needing a second, parallel notification
    // system built just for resolution.
    req.app.get("io").emit("hazard:resolved", hazard);

    res.json(hazard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});