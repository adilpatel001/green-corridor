// Phase 1: run this directly with `node test.js` — no server, no DB.

import { graph } from "./graph.js";
import { aStar } from "./aStar.js";
import { applyHazards } from "./applyHazards.js";

console.log("--- Scenario 1: normal route A -> I ---");
console.log(aStar(graph, "A", "I"));

console.log("\n--- Scenario 2: hazard makes the direct route costlier ---");
const hazardGraph = applyHazards(graph, [{ from: "F", to: "I", severity: 3 }]);
console.log(aStar(hazardGraph, "A", "I"));
console.log("original graph untouched:", graph.F.edges.I); // should still be 5

console.log("\n--- Scenario 3: hazards block every route into I ---");
const blockedGraph = applyHazards(graph, [
  { from: "F", to: "I", severity: "blocked" },
  { from: "H", to: "I", severity: "blocked" },
]);
console.log(aStar(blockedGraph, "A", "I"));

console.log("\n--- Scenario 4: goal node doesn't exist in the graph ---");
console.log(aStar(graph, "A", "Z"));