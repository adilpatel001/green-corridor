import { extractLargestComponent } from "./extractLargestComponent.mjs";

// Synthetic graph: a 4-node connected component (A-B-C-D), a 2-node
// component (X-Y), and an isolated single node (Z). Largest is clearly
// A-B-C-D with 4 nodes.
const graph = {
  A: { lat: 1, lng: 1, edges: { B: 1 } },
  B: { lat: 1, lng: 2, edges: { A: 1, C: 1 } },
  C: { lat: 1, lng: 3, edges: { B: 1, D: 1 } },
  D: { lat: 1, lng: 4, edges: { C: 1 } },
  X: { lat: 2, lng: 1, edges: { Y: 1 } },
  Y: { lat: 2, lng: 2, edges: { X: 1 } },
  Z: { lat: 3, lng: 1, edges: {} },
};

const { graph: result, droppedComponents, droppedNodes } = extractLargestComponent(graph);

let allPass = true;
function check(label, cond) {
  console.log(`${cond ? "PASS" : "FAIL"}: ${label}`);
  if (!cond) allPass = false;
}

check("kept exactly the 4 nodes of the largest component", 
  Object.keys(result).sort().join(",") === "A,B,C,D");
check("dropped 2 smaller components (X-Y and Z)", droppedComponents === 2);
check("dropped 3 nodes total (X, Y, Z)", droppedNodes === 3);
check("A's edges only reference kept nodes", Object.keys(result.A.edges).every(n => result[n] !== undefined));
check("no edge to dropped node X leaks in anywhere", 
  Object.values(result).every(n => !Object.keys(n.edges).includes("X")));
check("edge costs preserved correctly", result.A.edges.B === 1 && result.C.edges.D === 1);

console.log(allPass ? "\nALL PASS" : "\nSOME FAILED");