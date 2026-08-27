// Phase 1: fake hardcoded graph.
// Nodes = intersections. Each node has x/y coords (placeholder for real
// lat/lng, which arrives in Phase 4) and an `edges` map of
// neighborId -> baseCost (the cost of the road segment).
//
// Roads are modeled as two-way: if A -> B exists, B -> A also exists.
// This mirrors a real street grid where hazard reports usually affect
// both directions of travel on a road.

export const graph = {
  A: { x: 0, y: 0, edges: { B: 4, D: 2 } },
  B: { x: 1, y: 0, edges: { A: 4, C: 5, E: 10 } },
  C: { x: 2, y: 0, edges: { B: 5, F: 3 } },
  D: { x: 0, y: 1, edges: { A: 2, E: 3, G: 8 } },
  E: { x: 1, y: 1, edges: { B: 10, D: 3, F: 4, H: 6 } },
  F: { x: 2, y: 1, edges: { C: 3, E: 4, I: 5 } },
  G: { x: 0, y: 2, edges: { D: 8, H: 3 } },
  H: { x: 1, y: 2, edges: { E: 6, G: 3, I: 2 } },
  I: { x: 2, y: 2, edges: { F: 5, H: 2 } },
};