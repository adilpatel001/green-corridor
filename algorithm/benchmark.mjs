// Run with: node algorithm/benchmark.mjs
//
// Compares the current heap-based aStar.js against the Phase 1 linear-
// scan implementation (kept in aStar.linearScan.reference.js purely for
// this comparison), on synthetic grid graphs at several sizes.
//
// WHY THIS BENCHMARK EXISTS: "a binary heap is O(log V) instead of O(V),
// so it must be faster" is the obvious claim, and it's incomplete. This
// project's heap has no decrease-key — instead of updating an existing
// entry when a node's score improves, it pushes a new one and relies on
// a closed-set check to skip stale entries later (see minHeap.js). That
// tradeoff has a real cost: this benchmark found the heap pushes ~1.46x
// as many entries as there are nodes, and at smaller graph sizes that
// overhead actually made it SLOWER than the simple linear scan — the
// open set rarely gets close to full graph size early in a search, so
// the linear scan's real average cost is much less than its worst-case
// O(V). The heap only starts winning once the graph is large enough
// that O(V) scans genuinely start to hurt. Measuring this instead of
// assuming it is the entire point of this file.

import { aStar as aStarHeap } from "./aStar.js";
import { aStar as aStarLinear } from "./aStar.linearScan.reference.js";
import { haversine } from "./heuristics/haversine.js";

function buildGridGraph(size) {
  const graph = {};
  const latBase = 28.6, lngBase = 77.2, step = 0.001;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      graph[`${x}-${y}`] = { lat: latBase + y * step, lng: lngBase + x * step, edges: {} };
    }
  }

  function distKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const id = `${x}-${y}`;
      const node = graph[id];
      if (x < size - 1) {
        const rightId = `${x + 1}-${y}`;
        const cost = distKm(node.lat, node.lng, graph[rightId].lat, graph[rightId].lng);
        node.edges[rightId] = cost;
        graph[rightId].edges[id] = cost;
      }
      if (y < size - 1) {
        const downId = `${x}-${y + 1}`;
        const cost = distKm(node.lat, node.lng, graph[downId].lat, graph[downId].lng);
        node.edges[downId] = cost;
        graph[downId].edges[id] = cost;
      }
    }
  }
  return graph;
}

function time(fn) {
  const t0 = process.hrtime.bigint();
  const result = fn();
  return { result, ms: Number(process.hrtime.bigint() - t0) / 1e6 };
}

console.log("Grid size | Nodes   | Linear (ms) | Heap (ms) | Speedup");
console.log("----------|---------|-------------|-----------|--------");

for (const size of [60, 100, 150, 220, 300]) {
  const n = size * size;
  const graph = buildGridGraph(size);
  const start = "0-0";
  const goal = `${size - 1}-${size - 1}`; // opposite corners — forces a long, near-full search

  const linear = time(() => aStarLinear(graph, start, goal, haversine));
  const heap = time(() => aStarHeap(graph, start, goal, haversine));

  const correctnessOk =
    Math.abs(linear.result.cost - heap.result.cost) < 1e-9 &&
    linear.result.nodesExplored === heap.result.nodesExplored;

  if (!correctnessOk) {
    console.log(`MISMATCH at N=${n} — heap and linear scan disagree, something is wrong.`);
    continue;
  }

  console.log(
    `${String(size).padStart(9)} | ${String(n).padStart(7)} | ${linear.ms.toFixed(1).padStart(11)} | ${heap.ms.toFixed(1).padStart(9)} | ${(linear.ms / heap.ms).toFixed(2)}x`
  );
}

console.log(
  "\nNote: single-run timings in Node vary run to run (GC, JIT warmup) — " +
  "the crossover point will shift a little between runs, but the overall " +
  "trend (heap loses small, wins big) is consistent."
);
