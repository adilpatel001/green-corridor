// Strongly Connected Components via Kosaraju's algorithm.
//
// Fixes the flaw found earlier: a simple "follow outgoing edges from an
// arbitrary start" flood-fill can call two nodes "connected" even when
// only one of them can reach the other — a genuine issue once oneway
// streets are in the graph, which they are for real OSM data.
//
// HOW IT WORKS (two passes, both plain DFS):
//   1. DFS the graph as-is, and record each node's "finish time" — the
//      order in which the traversal is fully DONE with a node (all its
//      descendants explored), not the order nodes are first visited.
//   2. Build the reverse graph (every edge flipped) and DFS it again,
//      this time starting from whichever unvisited node finished LAST
//      in pass 1. Every node reached in one such DFS tree is exactly
//      one strongly connected component.
//
// The insight this relies on: a node that finished last in pass 1 is
// "most upstream" in the graph's structure. Starting the reverse-graph
// search there and only claiming nodes reachable backward from it
// correctly separates true round-trip circles from one-way chains that
// a simple forward-only flood-fill would incorrectly lump together.
//
// Both DFS passes are written iteratively (explicit stack), not
// recursively — a real city's road graph can have thousands of nodes,
// and a naive recursive DFS risks a stack overflow at that depth.

function dfsFinishOrder(graph) {
  const visited = new Set();
  const finishOrder = [];

  for (const start of Object.keys(graph)) {
    if (visited.has(start)) continue;

    // Each stack entry tracks whether we've already expanded its
    // neighbors. First time we see it (processed: false), we expand and
    // push children. Second time (processed: true, meaning everything
    // below it is done), we record its finish time and pop.
    const stack = [{ node: start, processed: false }];
    visited.add(start);

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (!top.processed) {
        top.processed = true;
        for (const neighbor of Object.keys(graph[top.node].edges)) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            stack.push({ node: neighbor, processed: false });
          }
        }
      } else {
        stack.pop();
        finishOrder.push(top.node);
      }
    }
  }

  return finishOrder;
}

function buildReverseGraph(graph) {
  const reverse = {};
  for (const id of Object.keys(graph)) reverse[id] = { edges: {} };
  for (const [id, node] of Object.entries(graph)) {
    for (const neighbor of Object.keys(node.edges)) {
      reverse[neighbor].edges[id] = true; // only existence matters for SCC purposes
    }
  }
  return reverse;
}

// Returns an array of components, each an array of node ids. Every node
// in the input graph appears in exactly one component.
export function findStronglyConnectedComponents(graph) {
  const finishOrder = dfsFinishOrder(graph);
  const reverseGraph = buildReverseGraph(graph);

  const visited = new Set();
  const components = [];

  // Process in DECREASING finish time — i.e., walk finishOrder backward.
  for (let i = finishOrder.length - 1; i >= 0; i--) {
    const start = finishOrder[i];
    if (visited.has(start)) continue;

    const component = [];
    const stack = [start];
    visited.add(start);

    while (stack.length > 0) {
      const node = stack.pop();
      component.push(node);
      for (const neighbor of Object.keys(reverseGraph[node].edges)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }

    components.push(component);
  }

  return components;
}