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
//
// Open-set upgrade: this used to pick the lowest-fScore node with a
// linear scan — O(V) per extraction, explicitly flagged since Phase 1 as
// "fine for a 9-node graph, revisit at real-world scale." Now that a real
// 200+ node graph exists (and will keep growing), it's a binary min-heap
// instead — see minHeap.js for why it uses a "closed set" pattern rather
// than a true decrease-key.

import { MinHeap } from "./minHeap.js";

export function aStar(graph, startId, goalId, heuristicFn) {
  if (!graph[startId] || !graph[goalId]) {
    return { path: null, cost: Infinity, nodesExplored: 0, reason: "INVALID_NODE" };
  }

  const openHeap = new MinHeap();
  const cameFrom = {};
  const gScore = { [startId]: 0 };
  const closed = new Set();
  let nodesExplored = 0;

  openHeap.push(heuristicFn(graph, startId, goalId), startId);

  while (openHeap.size > 0) {
    const [, current] = openHeap.pop();

    // The heap can hold multiple, increasingly-better entries for the
    // same node (pushed whenever gScore improved) rather than updating
    // one in place. Once a node is finalized via the closed set, any
    // later, worse entries for it are stale — just skip them.
    if (closed.has(current)) continue;
    closed.add(current);

    if (current === goalId) {
      return {
        path: reconstructPath(cameFrom, current),
        cost: gScore[current],
        nodesExplored,
      };
    }

    nodesExplored++;

    const neighbors = graph[current].edges || {};
    for (const [neighbor, cost] of Object.entries(neighbors)) {
      if (cost === Infinity) continue;
      if (closed.has(neighbor)) continue;

      const tentativeG = gScore[current] + cost;
      if (tentativeG < (gScore[neighbor] ?? Infinity)) {
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeG;
        const f = tentativeG + heuristicFn(graph, neighbor, goalId);
        openHeap.push(f, neighbor);
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