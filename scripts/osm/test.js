import { parseOsmToGraph } from "./parseOsmToGraph.js";
import { fixture } from "./fixture.js";

const { graph, stats } = parseOsmToGraph(fixture);

console.log("--- Resulting graph ---");
console.log(JSON.stringify(graph, null, 2));
console.log("\n--- Stats ---");
console.log(stats);

let allPass = true;
function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) allPass = false;
}

// 1. Shape points 2 and 3 must NOT become graph nodes — only real
// intersections (1, 4, 6, 5, plus the disconnected 99/100) should exist.
check("shape point node 2 excluded", graph["2"] === undefined);
check("shape point node 3 excluded", graph["3"] === undefined);
check("intersection node 1 present", graph["1"] !== undefined);
check("intersection node 4 present", graph["4"] !== undefined);
check("intersection node 6 present", graph["6"] !== undefined);

// 2. Node 7 (only reachable via the footway) should not appear at all,
// since footway isn't a routable highway type.
check("footway-only node 7 excluded entirely", graph["7"] === undefined);

// 3. The 1->4 edge should exist directly (shape points compressed away),
// and cost should be roughly the sum of the three sub-segments, NOT a
// straight-line shortcut between 1 and 4.
const directHaversine1to4 = haversine(28.6320, 77.2190, 28.6325, 77.2195);
const edgeCost1to4 = graph["1"]?.edges?.["4"];
check(
  "1->4 edge cost reflects the actual bent path, not a straight shortcut",
  edgeCost1to4 !== undefined && edgeCost1to4 > directHaversine1to4
);
console.log(`  (edge cost ${edgeCost1to4?.toFixed(5)} km vs straight-line ${directHaversine1to4.toFixed(5)} km)`);

// 4. Way 200 (4->5) is oneway=yes: 4->5 should exist, 5->4 should NOT.
check("oneway 4->5 edge exists", graph["4"]?.edges?.["5"] !== undefined);
check("oneway reverse 5->4 does NOT exist", graph["5"]?.edges?.["4"] === undefined);

// 5. Way 100 and way 300 both connect 4 and 6 — way 300 is the direct,
// shorter path, so the final 4->6 edge should equal way 300's length,
// not way 100's longer bent path through node 6's approach segment.
const way300Cost = haversine(28.6325, 77.2195, 28.6330, 77.2200); // direct 4->6
const finalEdge4to6 = graph["4"]?.edges?.["6"];
check(
  "4->6 edge takes the cheaper of two duplicate paths",
  finalEdge4to6 !== undefined && Math.abs(finalEdge4to6 - way300Cost) < 1e-9
);

// 6. Two-way road (way 100, no oneway tag): 6->4 should also exist.
check("two-way road: 6->4 also exists", graph["6"]?.edges?.["4"] !== undefined);

// 7. Connectivity check should correctly flag the disconnected 99/100 island.
check("connectivity check found 2 components", stats.componentCount === 2);
check("disconnected node 99 still present in graph", graph["99"] !== undefined);
check("warning mentions disconnected components", stats.warnings.some(w => w.includes("disconnected")));

console.log(`\n${allPass ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"}`);

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}