// Phase 3 core milestone: GET /route?start=A&goal=I
//
// This is where the two halves of the project actually meet. Every call:
//   1. pulls the current hazard reports from MongoDB
//   2. translates them into the {from, to, severity} shape applyHazards()
//      expects
//   3. clones the base graph and mutates the clone's edge costs
//   4. runs A* on the mutated graph
//
// The base `graph` import is never mutated — applyHazards() clones it via
// structuredClone, so concurrent requests computing different routes at
// the same time can't corrupt each other's view of the graph. That
// safety property was built into Phase 1 specifically so this moment
// wouldn't need a rewrite.

import { Router } from "express";
import { Hazard } from "../models/Hazard.js";
import { graph } from "../../algorithm/graph.js";
import { aStar } from "../../algorithm/aStar.js";
import { applyHazards } from "../../algorithm/applyHazards.js";
import { SEVERITY_MULTIPLIERS } from "../severityMap.js";

export const routeRouter = Router();

routeRouter.get("/", async (req, res) => {
  try {
    const { start, goal } = req.query;

    if (!start || !goal) {
      return res.status(400).json({ error: "start and goal query params are required" });
    }

    const hazards = await Hazard.find();

    const hazardEdges = hazards.map((h) => ({
      from: h.fromNode,
      to: h.toNode,
      severity: SEVERITY_MULTIPLIERS[h.severity] ?? 1,
    }));

    const hazardGraph = applyHazards(graph, hazardEdges);
    const result = aStar(hazardGraph, start, goal);

    // JSON has no representation for Infinity — JSON.stringify silently
    // turns it into null, which would make a genuinely blocked route look
    // indistinguishable from a malformed response. Serialize it explicitly
    // instead so the client can tell "no path" apart from "something broke".
    res.json({
      ...result,
      cost: result.cost === Infinity ? null : result.cost,
      unreachable: result.cost === Infinity,
      hazardsApplied: hazardEdges.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});