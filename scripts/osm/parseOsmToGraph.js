// Converts raw Overpass API output into the exact shape algorithm/graph.js
// already expects: { nodeId: { lat, lng, edges: { neighborId: costKm } } }.
// This is the piece that actually matters — the fetch script around it is
// thin by comparison.
//
// THE CORE PROBLEM THIS SOLVES: a single real road in OSM is a "way" made
// of many nodes — most of them are just shape points describing the
// road's curve, not real intersections. If every one of those became a
// graph node, a graph covering even a small area would balloon into
// thousands of nodes, almost all of them degree-2 (one road in, one road
// out) and useless for routing decisions. Real routing engines compress
// these away, and so does this: only a node that's either (a) shared by
// two or more ways, or (b) the very first/last node of a way, becomes an
// actual graph node. Everything between two such nodes gets collapsed
// into a single edge, with cost = the summed Haversine distance along
// every shape point in between — so the real curve of the road is still
// reflected in the edge cost, even though it's not reflected in the
// graph's structure.

const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Road types worth routing on. Deliberately excludes footway/cycleway/
// path/steps — this is a vehicle router, and including pedestrian-only
// ways would let A* "drive" through a footpath.
const ROUTABLE_HIGHWAY_TYPES = new Set([
  "motorway", "trunk", "primary", "secondary", "tertiary",
  "unclassified", "residential", "living_street", "service",
  "motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link",
]);

function isOneway(tags) {
  return tags?.oneway === "yes" || tags?.oneway === "1" || tags?.oneway === "true";
}

function isReversedOneway(tags) {
  return tags?.oneway === "-1";
}

export function parseOsmToGraph(overpassJson) {
  const warnings = [];

  const nodeCoords = new Map(); // osm node id -> { lat, lng }
  const ways = [];

  for (const el of overpassJson.elements) {
    if (el.type === "node") {
      nodeCoords.set(el.id, { lat: el.lat, lng: el.lon });
    } else if (el.type === "way" && ROUTABLE_HIGHWAY_TYPES.has(el.tags?.highway)) {
      ways.push(el);
    }
  }

  // A node is a real intersection if it's shared by 2+ ways, or if it's
  // the first/last node of any single way (a dead end is still a
  // meaningful graph node — routing needs to be able to start/end there).
  const nodeWayCount = new Map();
  for (const way of ways) {
    const uniqueNodesInWay = new Set(way.nodes);
    for (const nodeId of uniqueNodesInWay) {
      nodeWayCount.set(nodeId, (nodeWayCount.get(nodeId) ?? 0) + 1);
    }
  }

  const intersectionIds = new Set();
  for (const way of ways) {
    if (way.nodes.length === 0) continue;
    intersectionIds.add(way.nodes[0]);
    intersectionIds.add(way.nodes[way.nodes.length - 1]);
    for (const nodeId of way.nodes) {
      if ((nodeWayCount.get(nodeId) ?? 0) >= 2) intersectionIds.add(nodeId);
    }
  }

  const graph = {};
  function ensureNode(osmId) {
    const key = String(osmId);
    if (!graph[key]) {
      const coord = nodeCoords.get(osmId);
      if (!coord) {
        warnings.push(`Node ${osmId} referenced by a way but missing from node data — skipped.`);
        return null;
      }
      graph[key] = { lat: coord.lat, lng: coord.lng, edges: {} };
    }
    return key;
  }

  for (const way of ways) {
    if (way.nodes.length < 2) continue;

    let segmentStart = way.nodes[0];
    let accumulatedCost = 0;
    let prevCoord = nodeCoords.get(segmentStart);

    for (let i = 1; i < way.nodes.length; i++) {
      const currentId = way.nodes[i];
      const currentCoord = nodeCoords.get(currentId);
      if (!prevCoord || !currentCoord) {
        warnings.push(`Way ${way.id} references a node with no coordinates — segment skipped.`);
        continue;
      }

      accumulatedCost += haversineKm(prevCoord.lat, prevCoord.lng, currentCoord.lat, currentCoord.lng);

      if (intersectionIds.has(currentId)) {
        const a = ensureNode(segmentStart);
        const b = ensureNode(currentId);
        if (a && b && a !== b) {
          const forward = !isReversedOneway(way.tags);
          const backward = !isOneway(way.tags) && !isReversedOneway(way.tags);

          if (forward) {
            if (graph[a].edges[b] === undefined || accumulatedCost < graph[a].edges[b]) {
              graph[a].edges[b] = accumulatedCost;
            }
          }
          if (isReversedOneway(way.tags)) {
            if (graph[b].edges[a] === undefined || accumulatedCost < graph[b].edges[a]) {
              graph[b].edges[a] = accumulatedCost;
            }
          } else if (!isOneway(way.tags)) {
            if (graph[b].edges[a] === undefined || accumulatedCost < graph[b].edges[a]) {
              graph[b].edges[a] = accumulatedCost;
            }
          }
        }
        segmentStart = currentId;
        accumulatedCost = 0;
      }

      prevCoord = currentCoord;
    }
  }

  const stats = checkConnectivity(graph, warnings);
  return { graph, stats };
}

// Real-world extracts are messy — a bounding box can slice through a
// road, or data quality gaps can leave a node genuinely unreachable from
// the rest. This isn't something the toy 9-node graph ever needed to
// check (it was hand-built to be fully connected by construction), but
// it's a real concern the moment the data comes from the outside world.
function checkConnectivity(graph, warnings) {
  const nodeIds = Object.keys(graph);
  if (nodeIds.length === 0) {
    return { nodeCount: 0, edgeCount: 0, componentCount: 0, largestComponentSize: 0, warnings };
  }

  const visited = new Set();
  const componentSizes = [];

  for (const start of nodeIds) {
    if (visited.has(start)) continue;
    let size = 0;
    const stack = [start];
    visited.add(start);
    while (stack.length > 0) {
      const node = stack.pop();
      size++;
      for (const neighbor of Object.keys(graph[node].edges)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
    componentSizes.push(size);
  }

  const largestComponentSize = Math.max(...componentSizes);
  if (componentSizes.length > 1) {
    warnings.push(
      `Graph has ${componentSizes.length} disconnected components (largest: ${largestComponentSize} nodes). ` +
      `Routing will fail between nodes in different components — consider widening the bounding box.`
    );
  }

  const edgeCount = nodeIds.reduce((sum, id) => sum + Object.keys(graph[id].edges).length, 0);

  return {
    nodeCount: nodeIds.length,
    edgeCount,
    componentCount: componentSizes.length,
    largestComponentSize,
    warnings,
  };
}