// Phase 6: hazard expiry. Different hazard types realistically clear at
// very different rates — waterlogging drains away in hours, a pothole
// sits there until someone repairs it. A single fixed expiry window for
// every hazard type would be wrong in both directions, so this is a
// lookup table, following the same pattern as severityMap.js: one place
// that owns the mapping, imported wherever it's needed.
//
// Deliberately computed explicitly here rather than hidden in a Mongoose
// pre-save hook — consistent with how this project has favored explicit,
// testable functions over framework "magic" since Phase 1's injected
// heuristic.

export const EXPIRY_HOURS_BY_TYPE = {
  pothole: 168,      // 7 days — needs an actual repair crew
  waterlogging: 6,    // drains away on its own, hours not days
  blockage: 24,        // typically cleared same-day or next-day
};

export function computeExpiresAt(type, reportedAt = new Date()) {
  const hours = EXPIRY_HOURS_BY_TYPE[type] ?? 24; // fallback for any future type
  return new Date(reportedAt.getTime() + hours * 60 * 60 * 1000);
}

// Shared Mongoose filter for "still active" hazards — the single
// definition of what "expired" means at query time, used by every route
// that needs to read only currently-relevant hazards.
export function activeHazardsFilter(now = new Date()) {
  return { expiresAt: { $gt: now } };
}