// Phase 4: run with `node algorithm/test.js` — still no server, no DB.

import { graph } from "./graph.js";
import { aStar } from "./aStar.js";
import { applyHazards } from "./applyHazards.js";
import { haversine } from "./heuristics/haversine.js";

console.log("--- Scenario 1: normal route A -> I (real distances, km) ---");
console.log(aStar(graph, "A", "I", haversine));

console.log("\n--- Scenario 2: hazard makes the direct route costlier ---");
const hazardGraph = applyHazards(graph, [{ from: "F", to: "I", severity: 3 }]);
console.log(aStar(hazardGraph, "A", "I", haversine));
console.log("original graph untouched:", graph.F.edges.I);

console.log("\n--- Scenario 3: hazards block every route into I ---");
const blockedGraph = applyHazards(graph, [
  { from: "F", to: "I", severity: "blocked" },
  { from: "H", to: "I", severity: "blocked" },
]);
console.log(aStar(blockedGraph, "A", "I", haversine));

console.log("\n--- Scenario 4: goal node doesn't exist in the graph ---");
console.log(aStar(graph, "A", "Z", haversine));

console.log("\n--- Scenario 5: heuristic sanity check ---");
console.log("Straight-line A -> I (km):", haversine(graph, "A", "I").toFixed(4));
console.log("This must be <= the actual path cost above in Scenario 1 for the heuristic to be admissible.");