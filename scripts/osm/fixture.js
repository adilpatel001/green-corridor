// A hand-crafted, structurally realistic stand-in for real Overpass API
// output — same element shape (type/id/lat/lon for nodes; type/id/nodes/
// tags for ways) — small enough to reason about by hand, but exercising
// every tricky case the real parser needs to get right:
//
//   - Nodes 1-2-3-4 form a road with 2 and 3 as pure "shape points"
//     (not intersections) — tests that they get compressed away and
//     their distance folded into a single 1->4 edge.
//   - Node 4 is shared between two ways -> becomes a real intersection.
//   - Way 200 (4->5) is tagged oneway=yes -> only one direction should
//     appear in the graph.
//   - Way 300 duplicates way 100's 4->6 connection via a different path,
//     to confirm the cheaper of two possible edges wins.
//   - Node 99/100 form a completely separate, disconnected road -> tests
//     that connectivity checking correctly flags it.

export const fixture = {
  elements: [
    // Way 100: 1 -(shape pts 2,3)- 4 -(shape pt)- 6, two-way residential road
    { type: "node", id: 1, lat: 28.6320, lon: 77.2190 },
    { type: "node", id: 2, lat: 28.6321, lon: 77.2191 }, // shape point
    { type: "node", id: 3, lat: 28.6322, lon: 77.2192 }, // shape point
    { type: "node", id: 4, lat: 28.6325, lon: 77.2195 }, // real intersection (shared with way 200)
    { type: "node", id: 6, lat: 28.6330, lon: 77.2200 },

    // Way 200: 4 -> 5, oneway
    { type: "node", id: 5, lat: 28.6335, lon: 77.2205 },

    // Way 300: an alternate, shorter path from 4 to 6 (tests min-cost dedup)
    // (no extra nodes needed — reuses 4 and 6 directly)

    // Disconnected island: nodes 99-100, its own tiny road, not connected
    // to anything above
    { type: "node", id: 99, lat: 28.6500, lon: 77.2400 },
    { type: "node", id: 100, lat: 28.6501, lon: 77.2401 },

    {
      type: "way",
      id: 100,
      nodes: [1, 2, 3, 4, 6],
      tags: { highway: "residential" },
    },
    {
      type: "way",
      id: 200,
      nodes: [4, 5],
      tags: { highway: "residential", oneway: "yes" },
    },
    {
      type: "way",
      id: 300,
      nodes: [4, 6],
      tags: { highway: "residential" }, // a shorter, more direct 4->6 than way 100's path
    },
    {
      type: "way",
      id: 400,
      nodes: [99, 100],
      tags: { highway: "residential" },
    },
    // A footway that should be excluded entirely — not a routable type
    {
      type: "node", id: 7, lat: 28.6326, lon: 77.2196,
    },
    {
      type: "way",
      id: 500,
      nodes: [4, 7],
      tags: { highway: "footway" },
    },
  ],
};