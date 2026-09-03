// Phase 1: A* search, isolated from any UI/server/DB.
//
// f(n) = g(n) + h(n)
//   g(n) = actual cost from start to n (sum of edge costs so far)
//   h(n) = estimated cost from n to goal (heuristic — must never
//          overestimate the true cost, or the result stops being optimal)
//
// Heuristic here is straight-line (Euclidean) distance over the x/y grid
// coords. This is a placeholder — it's admissible for a grid the same way
// Haversine distance will be admissible for real lat/lng in Phase 4,
// because both estimate physical distance, which is always <= actual
// road-network distance.

function heuristic(graph, a, b) {
  const dx = graph[a].x - graph[b].x;
  const dy = graph[a].y - graph[b].y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function aStar(graph, startId, goalId) {
  if (!graph[startId] || !graph[goalId]) {
    return { path: null, cost: Infinity, nodesExplored: 0, reason: "INVALID_NODE" };
  }

  const openSet = new Set([startId]);
  const cameFrom = {};
  const gScore = { [startId]: 0 };
  const fScore = { [startId]: heuristic(graph, startId, goalId) };
  let nodesExplored = 0;

  while (openSet.size > 0) {
    // Pick the open-set node with lowest fScore. Linear scan is fine for
    // graphs this small — see the README notes on swapping this for a
    // binary min-heap once the graph is real-world sized.
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
      if (cost === Infinity) continue; // hazard-blocked edge, skip entirely

      const tentativeG = gScore[current] + cost;
      if (tentativeG < (gScore[neighbor] ?? Infinity)) {
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeG;
        fScore[neighbor] = tentativeG + heuristic(graph, neighbor, goalId);
        openSet.add(neighbor);
      }
    }
  }

  // openSet emptied out without ever reaching goalId — no path exists
  // (either the graph is disconnected, or hazards blocked every route).
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