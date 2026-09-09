// Phase 4: real lat/lng coordinates, replacing the fake x/y grid from
// Phase 1. Same 9-node topology as before (A–I connect the same way) so
// everything you already understand about the graph shape still applies —
// only the coordinate system and edge costs changed.
//
// Edge costs are now real distances in kilometers, computed as:
//   straight-line (Haversine) distance x a curvature factor (>= 1)
// The curvature factor represents that real roads bend — never assume a
// road is exactly as short as the crow flies. This also means the edge
// costs and the heuristic (Haversine) are now expressed in the same
// units, which is required for the heuristic to mean anything.
//
// Coordinates are illustrative (Bhopal-area, laid out on the same grid
// pattern as before) — this is still a placeholder graph, not real road
// data. Real OpenStreetMap data is a later concern, not Phase 4.

export const graph = {
  A: { lat: 23.259900, lng: 77.412600, edges: { B: 0.3371, D: 0.3503 } },
  B: { lat: 23.259900, lng: 77.415600, edges: { A: 0.3371, C: 0.3524, E: 0.5337 } },
  C: { lat: 23.259900, lng: 77.418600, edges: { B: 0.3524, F: 0.3669 } },
  D: { lat: 23.256900, lng: 77.412600, edges: { A: 0.3503, E: 0.3678, G: 0.4670 } },
  E: { lat: 23.256900, lng: 77.415600, edges: { B: 0.5337, D: 0.3678, F: 0.3371, H: 0.5004 } },
  F: { lat: 23.256900, lng: 77.418600, edges: { C: 0.3669, E: 0.3371, I: 0.3836 } },
  G: { lat: 23.253900, lng: 77.412600, edges: { D: 0.4670, H: 0.3371 } },
  H: { lat: 23.253900, lng: 77.415600, edges: { E: 0.5004, G: 0.3371, I: 0.3218 } },
  I: { lat: 23.253900, lng: 77.418600, edges: { F: 0.3836, H: 0.3218 } },
};