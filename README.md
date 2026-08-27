# Green Corridor

A hazard-aware routing system: A* search over a road graph where live,
crowdsourced hazard reports (potholes, waterlogging, closures) dynamically
increase or block edge costs. Any user requesting a route gets one that
automatically bends around current conditions — no hardcoded rules, just
cost-based graph search reacting to real data.

## Two halves

1. **Router** — A* pathfinding over a graph of intersections/roads.
2. **Heatmap** — a full-stack app where citizens report hazards in real time,
   which feed directly into the router's cost graph.

## Stack

- Frontend: React + Leaflet.js
- Backend: Node.js + Express
- Real-time: Socket.IO
- Database: MongoDB (geospatial queries)
- Algorithm: A* in plain JavaScript, Haversine heuristic

## Status

Phase 0 — environment setup only. No algorithm or app logic yet.

## Roadmap

- [ ] Phase 1: A* in isolation (fake graph, no UI/server/DB)
- [ ] Phase 2: Express + MongoDB backend (`POST /hazards`, `GET /hazards`)
- [ ] Phase 3: Merge — DB hazards mutate the graph before A* runs
- [ ] Phase 4: Real map (Leaflet, real lat/lng, Haversine heuristic)
- [ ] Phase 5: Socket.IO live push + auto re-route on frontend
- [ ] Phase 6: Polish (severity, hazard expiry, roles, Contraction Hierarchies stretch goal)
