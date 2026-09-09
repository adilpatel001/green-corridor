// Phase 4 refactor: aStar no longer hardcodes a heuristic. It now takes
// heuristicFn as a required parameter — dependency injection instead of a
// fixed internal function.
//
// Why this refactor, specifically now: Phase 1's heuristic was baked in
// because there was only ever one option (Euclidean, over fake x/y). Now
// that a second, real heuristic (Haversine) exists, hardcoding either one
// would mean editing this file every time the graph's coordinate system
// changes. Injecting the heuristic means aStar.js never needs to know
// whether it's running on a fake grid or real GPS data — it only needs a
// function with the shape (graph, nodeId, nodeId) => number. This also
// sets up Phase 6's Contraction Hierarchies work cleanly: benchmarking
// heuristics against each other becomes a one-line swap, not a rewrite.

export function aStar(graph, startId, goalId, heuristicFn) {
  if (!graph[startId] || !graph[goalId]) {
    return { path: null, cost: Infinity, nodesExplored: 0, reason: "INVALID_NODE" };
  }

  const openSet = new Set([startId]);
  const cameFrom = {};
  const gScore = { [startId]: 0 };
  const fScore = { [startId]: heuristicFn(graph, startId, goalId) };
  let nodesExplored = 0;

  while (openSet.size > 0) {
    let current = null;
    let lowestF = Infinity;
    for (const node of openSet) {
      const f = fScore[node] ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = node;
      }
    }

    if (current === goalId) {
      return {
        path: reconstructPath(cameFrom, current),
        cost: gScore[current],
        nodesExplored,
      };
    }

    openSet.delete(current);
    nodesExplored++;

    const neighbors = graph[current].edges || {};
    for (const [neighbor, cost] of Object.entries(neighbors)) {
      if (cost === Infinity) continue;

      const tentativeG = gScore[current] + cost;
      if (tentativeG < (gScore[neighbor] ?? Infinity)) {
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeG;
        fScore[neighbor] = tentativeG + heuristicFn(graph, neighbor, goalId);
        openSet.add(neighbor);
      }
    }
  }

  return { path: null, cost: Infinity, nodesExplored, reason: "NO_PATH_FOUND" };
}

function reconstructPath(cameFrom, current) {
  const path = [current];
  while (cameFrom[current] !== undefined) {
    current = cameFrom[current];
    path.unshift(current);
  }
  return path;
}