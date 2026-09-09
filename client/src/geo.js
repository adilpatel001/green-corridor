// Phase 4: geospatial snapping — the piece deliberately deferred since
// Phase 3, when hazards had to be reported by picking node ids from a
// dropdown instead of clicking an actual location.
//
// Approach: project lat/lng into a local flat-earth approximation (valid
// for areas this small — a few hundred meters, nowhere near where earth's
// curvature would matter), then run standard 2D point-to-line-segment
// distance against every edge. Cheap, and accurate enough at this scale;
// a global-scale version of this project would need proper geodesic
// distance-to-great-circle-arc math instead.

const KM_PER_DEG_LAT = 110.574;

function kmPerDegLng(atLat) {
  return 111.320 * Math.cos((atLat * Math.PI) / 180);
}

function toLocalKm(lat, lng, refLat) {
  return {
    x: lng * kmPerDegLng(refLat),
    y: lat * KM_PER_DEG_LAT,
  };
}

// Standard point-to-segment distance: project the point onto the
// infinite line through the segment, clamp the projection parameter t to
// [0, 1] so it can't fall past either endpoint, then measure the
// distance to that clamped point.
function distanceToSegmentKm(point, segStart, segEnd) {
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const lengthSq = dx * dx + dy * dy;

  let t = lengthSq === 0 ? 0 : ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = segStart.x + t * dx;
  const projY = segStart.y + t * dy;
  const distX = point.x - projX;
  const distY = point.y - projY;

  return Math.sqrt(distX * distX + distY * distY);
}

// clickLatLng: { lat, lng }
// edges: [{ from, to }], nodeById: { [id]: { lat, lng } }
// Returns { edge, distanceKm } for the closest edge, or null if edges is empty.
export function findNearestEdge(clickLatLng, edges, nodeById) {
  const refLat = clickLatLng.lat;
  const clickLocal = toLocalKm(clickLatLng.lat, clickLatLng.lng, refLat);

  let nearestEdge = null;
  let minDistance = Infinity;

  for (const edge of edges) {
    const from = nodeById[edge.from];
    const to = nodeById[edge.to];
    if (!from || !to) continue;

    const fromLocal = toLocalKm(from.lat, from.lng, refLat);
    const toLocal = toLocalKm(to.lat, to.lng, refLat);
    const distance = distanceToSegmentKm(clickLocal, fromLocal, toLocal);

    if (distance < minDistance) {
      minDistance = distance;
      nearestEdge = edge;
    }
  }

  return nearestEdge ? { edge: nearestEdge, distanceKm: minDistance } : null;
}