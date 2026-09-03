// Phase 1: applies hazard reports to a graph WITHOUT mutating the original.
//
// structuredClone gives a real deep copy — every nested edges object is
// independent memory. Without it (e.g. spreading only the top level),
// mutating newGraph.A.edges.B would also mutate graph.A.edges.B, silently
// corrupting the "clean" graph that other requests are still reading from.
// That matters once Phase 3 has concurrent requests hitting a shared graph.
//
// hazards: [{ from, to, severity }]
//   severity: a multiplier (e.g. 2 = twice as costly), or the string
//   "blocked" to make the edge impassable (cost = Infinity).

export function applyHazards(graph, hazards) {
  const newGraph = structuredClone(graph);

  for (const hazard of hazards) {
    const { from, to, severity } = hazard;

    if (!newGraph[from]?.edges?.[to]) continue; // unknown edge, skip silently

    applyToEdge(newGraph, from, to, severity);

    // Roads are two-way in this model — mirror the hazard on the reverse
    // edge if it exists, so a blocked road is blocked in both directions.
    if (newGraph[to]?.edges?.[from] !== undefined) {
      applyToEdge(newGraph, to, from, severity);
    }
  }

  return newGraph;
}

function applyToEdge(graphObj, from, to, severity) {
  if (severity === "blocked") {
    graphObj[from].edges[to] = Infinity;
  } else {
    graphObj[from].edges[to] *= severity;
  }
}