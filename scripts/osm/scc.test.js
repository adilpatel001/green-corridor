import { findStronglyConnectedComponents } from "./scc.js";

let allPass = true;
function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) allPass = false;
}

function sizesOf(components) {
  return components.map((c) => c.length).sort((a, b) => a - b);
}

// --- Test 1: the exact bug repro from earlier — oneway A->B, no return.
// A genuinely cannot round-trip with B, so these MUST be two separate
// SCCs of size 1 each, not one component of size 2 (which is what the
// old naive flood-fill incorrectly reported).
{
  const graph = {
    A: { edges: { B: 1 } },
    B: { edges: {} },
  };
  const components = findStronglyConnectedComponents(graph);
  check("oneway A->B with no return: two separate SCCs, not one", sizesOf(components).join(",") === "1,1");
}

// --- Test 2: a full oneway cycle A->B->C->A. Every node CAN reach every
// other node by going around — this genuinely is one SCC of size 3,
// despite every individual edge being one-directional.
{
  const graph = {
    A: { edges: { B: 1 } },
    B: { edges: { C: 1 } },
    C: { edges: { A: 1 } },
  };
  const components = findStronglyConnectedComponents(graph);
  check("full oneway cycle A->B->C->A: one SCC of size 3", sizesOf(components).join(",") === "3");
}

// --- Test 3: a two-way (bidirectional) road, same as the toy graph's
// original edges — should behave like ordinary undirected connectivity.
{
  const graph = {
    A: { edges: { B: 1 } },
    B: { edges: { A: 1, C: 1 } },
    C: { edges: { B: 1 } },
  };
  const components = findStronglyConnectedComponents(graph);
  check("fully two-way chain A-B-C: one SCC of size 3", sizesOf(components).join(",") === "3");
}

// --- Test 4: two separate two-way clusters, no connection between them
// at all (a genuinely disconnected graph, not a oneway subtlety).
{
  const graph = {
    A: { edges: { B: 1 } },
    B: { edges: { A: 1 } },
    X: { edges: { Y: 1 } },
    Y: { edges: { X: 1 } },
  };
  const components = findStronglyConnectedComponents(graph);
  check("two separate two-way pairs: two SCCs of size 2 each", sizesOf(components).join(",") === "2,2");
}

// --- Test 5: a realistic mixed case — a two-way "main road" loop with a
// oneway "slip road" dead-ending off of it. The slip-road node should be
// its OWN singleton SCC, separate from the main loop, since you can
// enter it but never leave.
{
  const graph = {
    A: { edges: { B: 1 } },
    B: { edges: { A: 1, C: 1 } }, // B->C is oneway (no C->B)
    C: { edges: {} },              // dead end — reachable, but can't leave
  };
  const components = findStronglyConnectedComponents(graph);
  const sizes = sizesOf(components);
  check("oneway dead-end off a two-way loop: {A,B} + {C} separately", sizes.join(",") === "1,2");

  // Confirm it's specifically C that's isolated, not A or B.
  const singleton = components.find((c) => c.length === 1);
  check("the isolated singleton is specifically the dead-end node C", singleton?.[0] === "C");
}

// --- Test 6: every node in its own component (no edges at all).
{
  const graph = { A: { edges: {} }, B: { edges: {} }, C: { edges: {} } };
  const components = findStronglyConnectedComponents(graph);
  check("no edges at all: 3 separate singleton SCCs", sizesOf(components).join(",") === "1,1,1");
}

// --- Test 7: every node accounted for exactly once, regardless of graph shape.
{
  const graph = {
    A: { edges: { B: 1 } }, B: { edges: { A: 1, C: 1 } }, C: { edges: {} },
    D: { edges: { E: 1 } }, E: { edges: { D: 1 } },
  };
  const components = findStronglyConnectedComponents(graph);
  const allNodes = components.flat().sort();
  check("every input node appears in exactly one output component", allNodes.join(",") === "A,B,C,D,E");
}

console.log(`\n${allPass ? "ALL PASS" : "SOME FAILED"}`);