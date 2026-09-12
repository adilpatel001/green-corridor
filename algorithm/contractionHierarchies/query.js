// Contraction Hierarchies — query phase.
//
// After preprocessing, every node has a rank (its position in contraction
// order). The key property CH preprocessing guarantees: the shortest path
// between any two nodes can always be found by only ever moving from
// lower-rank to higher-rank nodes in one direction, and higher-rank to
// lower-rank in the other — so a query never needs to search the "wrong
// way" through the hierarchy.
//
// This runs two restricted Dijkstra searches — forward from the start,
// backward from the goal — each only relaxing edges toward higher-rank
// nodes, and takes the best meeting point between them. On a graph this
// small the win is invisible; the whole point of CH is that this
// restriction turns what would be a huge search space on a real road
// network into a tiny one, at the one-time cost of preprocessing.

function upwardDijkstra(graph, rank, source) {
  const dist = { [source]: 0 };
  const cameFrom = {};
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
    if (current === null) break;
    visited.add(current);

    for (const [neighbor, cost] of Object.entries(graph[current].edges)) {
      if (rank[neighbor] <= rank[current]) continue; // only ever move upward
      const tentative = currentDist + cost;
      if (tentative < (dist[neighbor] ?? Infinity)) {
        dist[neighbor] = tentative;
        cameFrom[neighbor] = current;
      }
    }
  }

  return { dist, cameFrom };
}

// A shortcut edge (u, w) stands in for u -> via -> w, and either of those
// two sub-edges might itself be a shortcut from an earlier contraction —
// hence the recursion, walking all the way down to only original edges.
function unpackEdge(a, b, shortcuts) {
  const key = [a, b].sort().join("-");
  const shortcut = shortcuts[key];
  if (!shortcut) return [a, b]; // a real, original edge — nothing to unpack

  const { via } = shortcut;
  return [...unpackEdge(a, via, shortcuts).slice(0, -1), ...unpackEdge(via, b, shortcuts)];
}

function unpackPath(nodeSequence, shortcuts) {
  if (nodeSequence.length < 2) return nodeSequence;
  const full = [nodeSequence[0]];
  for (let i = 0; i < nodeSequence.length - 1; i++) {
    const segment = unpackEdge(nodeSequence[i], nodeSequence[i + 1], shortcuts);
    full.push(...segment.slice(1));
  }
  return full;
}

export function query(augmented, rank, shortcuts, start, goal) {
  if (!augmented[start] || !augmented[goal]) {
    return { path: null, cost: Infinity, reason: "INVALID_NODE" };
  }

  const forward = upwardDijkstra(augmented, rank, start);
  const backward = upwardDijkstra(augmented, rank, goal);

  let bestCost = Infinity;
  let bestMeetingNode = null;

  for (const node of Object.keys(augmented)) {
    const fd = forward.dist[node];
    const bd = backward.dist[node];
    if (fd === undefined || bd === undefined) continue;
    if (fd + bd < bestCost) {
      bestCost = fd + bd;
      bestMeetingNode = node;
    }
  }

  if (bestMeetingNode === null) {
    return { path: null, cost: Infinity, reason: "NO_PATH_FOUND" };
  }

  // Reconstruct start -> meeting node
  const forwardPath = [bestMeetingNode];
  let cur = bestMeetingNode;
  while (forward.cameFrom[cur] !== undefined) {
    cur = forward.cameFrom[cur];
    forwardPath.unshift(cur);
  }

  // Reconstruct goal -> meeting node, then reverse to meeting node -> goal
  const backwardPath = [bestMeetingNode];
  cur = bestMeetingNode;
  while (backward.cameFrom[cur] !== undefined) {
    cur = backward.cameFrom[cur];
    backwardPath.unshift(cur);
  }
  backwardPath.reverse();

  const contractedPath = [...forwardPath, ...backwardPath.slice(1)];
  const path = unpackPath(contractedPath, shortcuts);

  return { path, cost: bestCost };
}