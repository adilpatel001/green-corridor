# Green Corridor

A smart routing system that finds you the best path — and automatically
avoids road problems as people report them. If someone reports a pothole
or a flooded road nearby, your route updates on its own to avoid it. No
manual rules written for each hazard — the system just recalculates the
"cheapest" path every time road conditions change.

## Two parts

1. **Router** — figures out the best path between two points using an
   algorithm called A* (A-star). It treats the city like a map of dots
   (intersections) connected by lines (roads), each with a "cost" to
   travel.
2. **Heatmap** — a live map where people can report hazards (potholes,
   waterlogging, road closures). These reports directly affect how
   costly a road is, which is what makes the router avoid them.

## Built with

- **Frontend:** React + Leaflet.js — the map interface people see and interact with
- **Backend:** Node.js + Express — handles requests like "give me a route" or "save this hazard report"
- **Real-time updates:** Socket.IO — so new hazard reports show up instantly for everyone, without refreshing
- **Database:** MongoDB — stores hazard reports, with support for location-based queries
- **Algorithm:** A* search, written in plain JavaScript, using the Haversine formula (straight-line distance between two GPS points) to help it search efficiently

## Where this is at right now

Just getting started — setting up the project folders and environment.
No actual routing or hazard logic yet.

## What's coming, in order

- [ ] Step 1: Build the A* routing algorithm by itself, tested on a made-up mini map (no app around it yet)
- [ ] Step 2: Build a basic backend that can save and list hazard reports
- [ ] Step 3: Connect the two — hazard reports start actually changing the route
- [ ] Step 4: Swap the made-up map for a real one, with real GPS locations
- [ ] Step 5: Make hazard reports update everyone's map live, without refreshing
- [ ] Step 6: Polish things up — hazard severity levels, reports expiring over time, different user roles, and (if there's time) a more advanced technique called Contraction Hierarchies to make searches faster
