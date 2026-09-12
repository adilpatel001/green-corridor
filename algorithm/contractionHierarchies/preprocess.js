// Contraction Hierarchies — preprocessing phase.
//
// This is deliberately kept OUT of algorithm/ proper and never imported
// by the server. It's a standalone, correctness-verified demonstration
// of the technique for the interview talking point the roadmap flagged
// back in Phase 6 planning — see README.md in this folder for why it
// isn't (and, for this project's graph, shouldn't be) wired into live
// routing.
//
// THE IDEA: contract nodes one at a time, in order of "least important
// first." Contracting a node means removing it from the graph while
// preserving all shortest-path distances between its neighbors — which
// sometimes requires adding a "shortcut" edge directly between two
// neighbors to stand in for the path that used to go through the
// contracted node. After every node is contracted, queries can run a
// much faster restricted search instead of full A*/Dijkstra.
//
// ORDERING HEURISTIC: this implementation always contracts whichever
// remaining node currently has the fewest edges. Real CH implementations
// use a richer "edge difference" score (shortcuts added minus edges
// removed, plus a couple of secondary terms) recomputed lazily via a
// priority queue. Lowest-degree-first is a simplification — accurate
// enough to demonstrate the mechanism correctly, but a real
// implementation would produce a better (flatter, faster-querying)
// hierarchy. Worth saying exactly this if asked in an interview, rather
// than implying this ordering is what production CH does.
//
// WITNESS SEARCH: before adding a shortcut for neighbors (u, w) of the
// node being contracted, we check whether a path from u to w already
// exists elsewhere in the current graph, no longer than the shortcut
// would be. If one does, no shortcut is needed — the "witness path"
// already proves the shortcut wouldn't be needed for correctness. This
// is what keeps CH from adding a shortcut for every single contraction;
// skipping it would still be correct, just far less space-efficient.

import { structuredCloneGraph } from "./util.js";

// Local Dijkstra used only for witness search: is there a path from
// `source` to `target`, avoiding `excludeNode` entirely, with cost no
// more than `maxCost`? Stops early the moment nothing left in the frontier
// could possibly beat maxCost — witness search only needs a yes/no
// answer within a budget, not the true shortest distance.
function witnessPathExists(graph, source, target, excludeNode, maxCost) {
  if (source === target) return true;

  const dist = { [source]: 0 };
  const visited = new Set();

  while (true) {
    let current = null;
    let currentDist = Infinity;
    for (const [node, d] of Object.entries(dist)) {
      if (!visited.has(node) && d < currentDist) {
        currentDist = d;
        current = node;
      }
    }

    if (current === null || currentDist > maxCost) return false; // nothing left within budget
    if (current === target) return true;

    visited.add(current);
    for (const [neighbor, cost] of Object.entries(graph[current].edges)) {
      if (neighbor === excludeNode || visited.has(neighbor)) continue;
      const tentative = currentDist + cost;
      if (tentative < (dist[neighbor] ?? Infinity)) {
        dist[neighbor] = tentative;
      }
    }
  }
}

// Runs full preprocessing. Returns:
//   order      — node ids in contraction sequence (order[0] contracted first)
//   rank       — { nodeId: index in order }, lower = contracted earlier = "less important"
//   augmented  — graph containing every edge that ever existed: originals
//                plus every shortcut added during contraction
//   shortcuts  — { "u-w": { cost, via } } for unpacking a shortcut back
//                into the original edges it replaces
export function preprocess(baseGraph) {
  const working = structuredCloneGraph(baseGraph);
  const augmented = structuredCloneGraph(baseGraph); // never has edges removed, only added to
  const shortcuts = {};
  const order = [];

  const remaining = new Set(Object.keys(baseGraph));

  while (remaining.size > 0) {
    // Contract whichever remaining node currently has the fewest edges.
    let v = null;
    let fewestEdges = Infinity;
    for (const node of remaining) {
      const degree = Object.keys(working[node].edges).length;
      if (degree < fewestEdges) {
        fewestEdges = degree;
        v = node;
      }
    }

    const neighbors = Object.keys(working[v].edges);

    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const u = neighbors[i];
        const w = neighbors[j];
        const candidateCost = working[v].edges[u] + working[v].edges[w];

        const witnessExists = witnessPathExists(working, u, w, v, candidateCost);
        if (witnessExists) continue; // existing path is good enough, no shortcut needed

        const existing = working[u].edges[w];
        if (existing === undefined || candidateCost < existing) {
          working[u].edges[w] = candidateCost;
          working[w].edges[u] = candidateCost;
          augmented[u].edges[w] = candidateCost;
          augmented[w].edges[u] = candidateCost;
          const key = [u, w].sort().join("-");
          shortcuts[key] = { cost: candidateCost, via: v };
        }
      }
    }

    // Remove v from the working graph — it's fully contracted now.
    for (const neighbor of neighbors) {
      delete working[neighbor].edges[v];
    }
    delete working[v];
    remaining.delete(v);
    order.push(v);
  }

  const rank = Object.fromEntries(order.map((id, i) => [id, i]));

  return { order, rank, augmented, shortcuts };
}