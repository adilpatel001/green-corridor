// Run with `node algorithm/test.js` — still no server, no DB.
//
// Rewritten to be graph-agnostic: it no longer assumes node IDs like
// "A" or "F" exist. Those were fine for the Phase 1 toy grid, but real
// OSM data uses its own numeric node IDs, so this now discovers real
// start/goal nodes and a real edge to test hazards against, whatever
// graph.js currently contains.

import { graph } from "./graph.js";
import { aStar } from "./aStar.js";
import { applyHazards } from "./applyHazards.js";
import { haversine } from "./heuristics/haversine.js";

const nodeIds = Object.keys(graph);
if (nodeIds.length < 2) {
  throw new Error("Graph needs at least 2 nodes to run this test.");
}

const start = nodeIds[0];
const goal = nodeIds[nodeIds.length - 1];

console.log(`Testing against a graph with ${nodeIds.length} nodes.`);
console.log(`start = ${start}, goal = ${goal}\n`);

console.log("--- Scenario 1: normal route (real distances, km) ---");
const baseline = aStar(graph, start, goal, haversine);
console.log(baseline);

if (!baseline.path) {
  console.log("\nNo route found between these two nodes — pick different start/goal, or check graph connectivity.");
  process.exit(0);
}

// Pick an edge that's actually ON the baseline path, so the hazard is
// guaranteed to force a visible reroute rather than possibly landing
// somewhere irrelevant.
const hazardFrom = baseline.path[0];
const hazardTo = baseline.path[1];
const originalCost = graph[hazardFrom].edges[hazardTo];

console.log(`\n--- Scenario 2: hazard on ${hazardFrom} -> ${hazardTo} (on the baseline route) ---`);
const hazardGraph = applyHazards(graph, [{ from: hazardFrom, to: hazardTo, severity: 5 }]);
console.log(aStar(hazardGraph, start, goal, haversine));
console.log(`original graph untouched: ${graph[hazardFrom].edges[hazardTo]} (should still be ${originalCost})`);

// Block every edge that leads INTO goal, to force NO_PATH_FOUND — found
// dynamically rather than assuming which nodes happen to connect to it.
console.log(`\n--- Scenario 3: block every route into ${goal} ---`);
const incomingEdges = [];
for (const [nodeId, node] of Object.entries(graph)) {
  if (node.edges[goal] !== undefined) incomingEdges.push({ from: nodeId, to: goal, severity: "blocked" });
}
console.log(`(blocking ${incomingEdges.length} incoming edge(s))`);
const blockedGraph = applyHazards(graph, incomingEdges);
console.log(aStar(blockedGraph, start, goal, haversine));

console.log("\n--- Scenario 4: goal node doesn't exist in the graph ---");
console.log(aStar(graph, start, "__DOES_NOT_EXIST__", haversine));

console.log("\n--- Scenario 5: heuristic sanity check ---");
const straightLine = haversine(graph, start, goal);
console.log(`Straight-line ${start} -> ${goal} (km): ${straightLine.toFixed(4)}`);
console.log(`Baseline path cost (km): ${baseline.cost.toFixed(4)}`);
console.log(`Admissible (straight-line <= actual path cost): ${straightLine <= baseline.cost}`);