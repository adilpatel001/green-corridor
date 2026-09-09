// Phase 4: GET /graph — exposes node coordinates and edges so the
// frontend never hardcodes or duplicates graph data. The backend stays
// the single source of truth; the map just renders whatever this returns.

import { Router } from "express";
import { graph } from "../../algorithm/graph.js";

export const graphRouter = Router();

graphRouter.get("/", (req, res) => {
  const nodes = Object.entries(graph).map(([id, node]) => ({
    id,
    lat: node.lat,
    lng: node.lng,
  }));

  // Each edge appears once even though the underlying graph stores it in
  // both directions (A->B and B->A) — the map only needs to draw one line
  // per road, not two overlapping ones.
  const seen = new Set();
  const edges = [];
  for (const [from, node] of Object.entries(graph)) {
    for (const [to, cost] of Object.entries(node.edges)) {
      const key = [from, to].sort().join("-");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from, to, cost });
    }
  }

  res.json({ nodes, edges });
});