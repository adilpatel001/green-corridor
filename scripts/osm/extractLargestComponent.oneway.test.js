// Proves the actual fix: a graph where a naive flood-fill would
// incorrectly include a one-way dead-end in the "largest component,"
// but SCC-based extraction correctly excludes it.

import { extractLargestComponent } from "./extractLargestComponent.mjs";

let allPass = true;
function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) allPass = false;
}

// A two-way main loop A-B-C-D-A (4 nodes, real routable circle), plus a
// oneway slip road D -> E that dead-ends (E has no way back to D or
// anywhere else). A real router should NEVER be told "route to E" is
// fully supported, since you can get there but never get back.
const graph = {
  A: { lat: 0, lng: 0, edges: { B: 1, D: 1 } },
  B: { lat: 0, lng: 1, edges: { A: 1, C: 1 } },
  C: { lat: 1, lng: 1, edges: { B: 1, D: 1 } },
  D: { lat: 1, lng: 0, edges: { A: 1, C: 1, E: 1 } }, // D->E oneway
  E: { lat: 2, lng: 0, edges: {} },                     // dead end, no way out
};

const { graph: result, droppedNodes } = extractLargestComponent(graph);

check("kept exactly the 4-node main loop (A, B, C, D)", Object.keys(result).sort().join(",") === "A,B,C,D");
check("dropped exactly 1 node", droppedNodes === 1);
check("the oneway dead-end E is NOT in the result", result.E === undefined);
check("D's edge to E was removed too (no dangling reference)", result.D.edges.E === undefined);
check("D's real two-way edges to A and C are preserved", result.D.edges.A === 1 && result.D.edges.C === 1);

console.log(`\n${allPass ? "ALL PASS — SCC-based extraction correctly excludes a oneway dead-end" : "SOME FAILED"}`);