// Kept from Phase 1 as a reference, not used by the current graph (which
// no longer has x/y fields). Notice it has the exact same signature as
// haversine.js — (graph, nodeIdA, nodeIdB) => number. That shared shape
// is what let aStar.js stop caring which heuristic it's given.

export function euclidean(graph, a, b) {
  const dx = graph[a].x - graph[b].x;
  const dy = graph[a].y - graph[b].y;
  return Math.sqrt(dx * dx + dy * dy);
}