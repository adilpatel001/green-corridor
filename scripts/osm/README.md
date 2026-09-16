# Real map data pipeline

Converts a real OpenStreetMap extract into a `graph.js`-shaped object —
same `{ nodeId: { lat, lng, edges: { neighborId: costKm } } }` shape
`aStar()`, `applyHazards()`, and the Haversine heuristic already expect.
No algorithm code changes needed to use the output.

## What's verified vs. what isn't

**Verified in this sandbox** (no live internet access to Overpass here):
the actual graph-building logic in `parseOsmToGraph.js`, against a
hand-crafted fixture (`fixture.js`) built to look structurally like real
Overpass output. 14 checks, all passing — see `test.js`. This covers the
genuinely tricky parts: compressing shape points into single edges
without losing the road's real bent-path distance, respecting `oneway`
tags directionally, deduplicating to the cheaper of two paths between the
same intersections, excluding non-drivable way types (footways etc.),
and detecting disconnected components.

**Not verified here, by necessity**: the live Overpass API call itself.
`overpass-api.de` isn't reachable from this development sandbox's network
— confirmed directly (`curl` returned "Host not in allowlist"). You'll
need to run `fetchAndBuildGraph.mjs` yourself.

## Running it

```bash
node scripts/osm/fetchAndBuildGraph.mjs
```

This queries Overpass for a small bounding box around Connaught Place,
New Delhi, builds the graph, prints stats (node/edge counts, connected
components, any warnings), and writes `algorithm/graph.real.js`.

**Review the output before using it** — specifically check the
"connected components" line. If it's more than 1, some part of the
bounding box got cut off from the rest by the box edge, and routing
between those pieces will silently fail with `NO_PATH_FOUND`. Widening
the bounding box slightly usually fixes this.

Once you're happy with it: rename/copy `algorithm/graph.real.js` over
`algorithm/graph.js`, then re-run `node algorithm/test.js` — the exact
same Phase 1–4 test suite should still pass, since it exercises the
graph through the same interface regardless of where the data came from.

## Changing the area

Edit the `BBOX` constant in `fetchAndBuildGraph.mjs` —
`[south, west, north, east]` in decimal degrees. Keep it small for a
first run (under ~1km²) — node counts grow fast with area, and it's much
easier to debug connectivity warnings on a small extract than a large one.

## What this deliberately does NOT do yet

- No graph simplification beyond shape-point compression — a dense urban
  area could still produce a few thousand nodes. If that becomes a
  performance problem, this is exactly where `aStar.js`'s linear open-set
  scan (flagged as a trade-off since Phase 1) would need the binary-heap
  upgrade.
- No travel-time weighting — edge costs are still pure distance, not
  distance adjusted for road type/speed limit. OSM's `maxspeed` tag would
  be the natural next input if you want time-based routing instead of
  distance-based.
- Doesn't touch `server/` or `client/` at all. Hazard reporting,
  geospatial snapping, live updates — everything built in Phases 3–6
  works unmodified against whatever `graph.js` contains, real or
  otherwise. That's the payoff of the abstraction decisions made back in
  Phase 1.