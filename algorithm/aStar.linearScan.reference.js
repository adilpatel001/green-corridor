// Phase 1's original open-set implementation — a linear scan over the
// open set to find the lowest-fScore node each iteration, O(V) per
// extraction. Kept here ONLY as a reference for the benchmark in
// benchmark.mjs, comparing it against the binary-heap version now used
// in aStar.js. Not imported by anything in server/ — algorithm/aStar.js
// is the one actually used by the app.

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