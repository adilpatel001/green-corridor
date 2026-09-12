// Correctness check: CH's query() must produce the SAME shortest-path
// cost as the already-verified aStar() for every pair of nodes in the
// graph, and the unpacked path it returns must actually be a valid walk
// through real edges whose total cost matches.

import { graph } from "../graph.js";
import { aStar } from "../aStar.js";
import { haversine } from "../heuristics/haversine.js";
import { preprocess } from "./preprocess.js";
import { query } from "./query.js";

const { order, rank, augmented, shortcuts } = preprocess(graph);

console.log("Contraction order:", order.join(" -> "));
console.log("Shortcuts created:", Object.keys(shortcuts).length, Object.entries(shortcuts).map(([k, v]) => `${k} (via ${v.via}, cost ${v.cost.toFixed(4)})`).join(", ") || "none");

const nodeIds = Object.keys(graph);
let allMatch = true;
let checked = 0;

for (const start of nodeIds) {
  for (const goal of nodeIds) {
    if (start === goal) continue;
    checked++;

    const expected = aStar(graph, start, goal, haversine);
    const actual = query(augmented, rank, shortcuts, start, goal);

    const costMatches = Math.abs(expected.cost - actual.cost) < 1e-9;

    // Validate the unpacked path is a real walk through actual graph
    // edges whose costs sum to the claimed total — not just that the
    // number matches by coincidence.
    let walkCost = 0;
    let validWalk = true;
    for (let i = 0; i < actual.path.length - 1; i++) {
      const a = actual.path[i];
      const b = actual.path[i + 1];
      const edgeCost = graph[a]?.edges?.[b];
      if (edgeCost === undefined) {
        validWalk = false;
        break;
      }
      walkCost += edgeCost;
    }
    const walkCostMatches = validWalk && Math.abs(walkCost - actual.cost) < 1e-9;

    if (!costMatches || !validWalk || !walkCostMatches) {
      allMatch = false;
      console.log(`MISMATCH ${start}->${goal}: aStar=${expected.cost.toFixed(4)} CH=${actual.cost.toFixed(4)} validWalk=${validWalk} walkCost=${walkCost.toFixed(4)}`);
      console.log("  aStar path:", expected.path, " CH path:", actual.path);
    }
  }
}

console.log(`\nChecked ${checked} start/goal pairs.`);
console.log(allMatch ? "ALL MATCH — CH query produces identical shortest-path costs to aStar, with valid unpacked walks." : "MISMATCHES FOUND — see above.");