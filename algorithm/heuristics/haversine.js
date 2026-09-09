// Phase 4: Haversine formula — great-circle distance between two lat/lng
// points, in kilometers. This is the standard admissible heuristic for
// geospatial A*: it can never overestimate true road distance, because a
// road can never be shorter than a straight line between its endpoints.
//
// Same function signature as the old Euclidean heuristic —
// (graph, nodeIdA, nodeIdB) => number — which is what makes this a
// drop-in replacement rather than a rewrite of aStar.js itself.

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function haversine(graph, a, b) {
  const nodeA = graph[a];
  const nodeB = graph[b];

  const dLat = toRadians(nodeB.lat - nodeA.lat);
  const dLng = toRadians(nodeB.lng - nodeA.lng);

  const lat1 = toRadians(nodeA.lat);
  const lat2 = toRadians(nodeB.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}