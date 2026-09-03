// Phase 2: two endpoints only, per the roadmap. No geospatial filtering
// on GET yet — that's introduced in Phase 3, once A* needs to ask
// "which hazards are near this edge" rather than "give me everything".

import { Router } from "express";
import { Hazard } from "../models/Hazard.js";

export const hazardsRouter = Router();

// POST /hazards — create a new hazard report
hazardsRouter.post("/", async (req, res) => {
  try {
    const { type, longitude, latitude, severity, description } = req.body;

    if (typeof longitude !== "number" || typeof latitude !== "number") {
      return res.status(400).json({ error: "longitude and latitude must be numbers" });
    }

    const hazard = await Hazard.create({
      type,
      severity,
      description,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    });

    res.status(201).json(hazard);
  } catch (err) {
    // Mongoose validation errors (bad enum value, missing required field)
    // land here as ValidationError — worth a distinct status code so the
    // client can tell "you sent something malformed" from "server broke".
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /hazards — list all hazard reports
hazardsRouter.get("/", async (req, res) => {
  try {
    const hazards = await Hazard.find().sort({ reportedAt: -1 });
    res.json(hazards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});