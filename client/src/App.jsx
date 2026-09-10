import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMapEvents } from "react-leaflet";
import { findNearestEdge } from "./geo.js";
import { socket } from "./socket.js";

// A click more than this far from any road is treated as "not on a road"
// rather than force-snapped to whatever's nearest — otherwise a click in
// the middle of nowhere would silently attach itself to a distant edge.
const MAX_SNAP_DISTANCE_KM = 0.08; // 80m

const SEVERITY_COLORS = { minor: "#f4d35e", moderate: "#f77f00", blocked: "#6a0dad" };

// react-leaflet's default Marker icon points at image files by a relative
// path that most bundlers (Vite included) don't resolve correctly out of
// the box — a well-known gotcha that trips up almost everyone's first
// Leaflet integration. Using CircleMarker instead sidesteps the problem
// entirely: it's drawn as an SVG circle, no icon image asset involved.

// useMapEvents only works on a component rendered *inside* MapContainer,
// so the click listener has to live in its own child component rather
// than directly in App.
function ClickListener({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

export default function App() {
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState(null);

  const [start, setStart] = useState("");
  const [goal, setGoal] = useState("");
  const [route, setRoute] = useState(null); // last successful /route response
  const [routeError, setRouteError] = useState(null);
  const [computing, setComputing] = useState(false);
  const [autoUpdateNotice, setAutoUpdateNotice] = useState(null);

  const [hazards, setHazards] = useState([]);
  const [selected, setSelected] = useState(null); // { edge, distanceKm } from the last map click
  const [snapMessage, setSnapMessage] = useState(null);
  const [hazardForm, setHazardForm] = useState({ type: "pothole", severity: "moderate", description: "" });
  const [submittingHazard, setSubmittingHazard] = useState(false);
  const [hazardSubmitError, setHazardSubmitError] = useState(null);

  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    fetch("/graph")
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setGraph(data);
        // Default to the first and last node so there's something sensible
        // to compute on the very first click, rather than empty selects.
        if (data.nodes.length >= 2) {
          setStart(data.nodes[0].id);
          setGoal(data.nodes[data.nodes.length - 1].id);
        }
      })
      .catch((err) => setError(err.message));
    loadHazards();
  }, []);

  // Phase 5: connection status, purely cosmetic but useful for trusting
  // that live updates are actually possible right now.
  useEffect(() => {
    function onConnect() { setConnected(true); }
    function onDisconnect() { setConnected(false); }
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  // Phase 5: the actual milestone. Every connected client — including
  // ones that didn't report the hazard themselves — refreshes its hazard
  // overlay, and if this client currently has a computed route on screen,
  // that route is silently recomputed against the new hazard data. No
  // refresh, no re-clicking "Compute route".
  //
  // Re-registered whenever start/goal/route change so the listener always
  // closes over current values instead of the ones from first render.
  useEffect(() => {
    function onHazardCreated() {
      loadHazards();
      if (route && start && goal) {
        fetchRoute(start, goal, { silent: true });
      }
    }
    socket.on("hazard:created", onHazardCreated);
    return () => socket.off("hazard:created", onHazardCreated);
  }, [start, goal, route]);

  function loadHazards() {
    fetch("/hazards")
      .then((res) => res.json())
      .then(setHazards)
      .catch(() => {}); // hazards overlay is non-critical; fail quietly
  }

  // Shared by both the manual "Compute route" button and the automatic
  // re-route triggered by a live hazard event. `silent` skips the
  // computing spinner and shows a brief "auto-updated" notice instead of
  // treating it like a user-initiated action.
  async function fetchRoute(startId, goalId, { silent = false } = {}) {
    if (!silent) {
      setComputing(true);
      setRouteError(null);
    }
    try {
      const res = await fetch(`/route?start=${startId}&goal=${goalId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server responded ${res.status}`);
      if (data.reason === "INVALID_NODE") throw new Error("Start or goal node doesn't exist.");
      setRoute(data);
      if (silent) {
        setAutoUpdateNotice("Route updated automatically — a nearby hazard changed.");
        setTimeout(() => setAutoUpdateNotice(null), 4000);
      }
    } catch (err) {
      if (!silent) {
        setRouteError(err.message);
        setRoute(null);
      }
      // A silent auto-recompute failing quietly is fine — the old route
      // stays on screen rather than getting replaced by an error message
      // the user didn't ask for.
    } finally {
      if (!silent) setComputing(false);
    }
  }

  function computeRoute(e) {
    e.preventDefault();
    fetchRoute(start, goal);
  }

  function handleMapClick(latlng) {
    if (!graph) return;
    const nodeById = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));
    const result = findNearestEdge(latlng, graph.edges, nodeById);

    setHazardSubmitError(null);

    if (!result || result.distanceKm > MAX_SNAP_DISTANCE_KM) {
      setSelected(null);
      setSnapMessage("No road nearby — click closer to a road.");
      return;
    }
    setSnapMessage(null);
    setSelected(result);
  }

  async function submitHazard(e) {
    e.preventDefault();
    if (!selected) return;
    setSubmittingHazard(true);
    setHazardSubmitError(null);
    try {
      const res = await fetch("/hazards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...hazardForm,
          fromNode: selected.edge.from,
          toNode: selected.edge.to,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server responded ${res.status}`);
      setSelected(null);
      setHazardForm({ type: "pothole", severity: "moderate", description: "" });
      loadHazards();
    } catch (err) {
      setHazardSubmitError(err.message);
    } finally {
      setSubmittingHazard(false);
    }
  }

  if (error) {
    return (
      <div style={{ padding: 20, fontFamily: "sans-serif" }}>
        Couldn't load the graph: {error}. Is the backend running on port 3000?
      </div>
    );
  }

  if (!graph) {
    return <div style={{ padding: 20, fontFamily: "sans-serif" }}>Loading map…</div>;
  }

  // Center the map on the average position of all nodes, rather than
  // hardcoding a center — keeps this correct if the graph data changes.
  const center = [
    graph.nodes.reduce((sum, n) => sum + n.lat, 0) / graph.nodes.length,
    graph.nodes.reduce((sum, n) => sum + n.lng, 0) / graph.nodes.length,
  ];

  const nodeById = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));

  // Turn the path (a list of node ids) into actual coordinates for
  // Polyline. Only build this when there's a real, reachable path —
  // "unreachable" routes have path: null and should draw nothing.
  const routeCoords =
    route && !route.unreachable && route.path
      ? route.path.map((id) => [nodeById[id].lat, nodeById[id].lng])
      : null;

  const selectedCoords = selected
    ? [
        [nodeById[selected.edge.from].lat, nodeById[selected.edge.from].lng],
        [nodeById[selected.edge.to].lat, nodeById[selected.edge.to].lng],
      ]
    : null;

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1000,
          background: "white",
          padding: 14,
          borderRadius: 8,
          boxShadow: "0 1px 6px rgba(0,0,0,0.3)",
          fontFamily: "sans-serif",
          width: 220,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 12, color: "#555" }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: connected ? "#2ecc71" : "#c0392b",
              display: "inline-block",
            }}
          />
          {connected ? "Live" : "Reconnecting…"}
        </div>

        <form onSubmit={computeRoute}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
            Start
            <select value={start} onChange={(e) => setStart(e.target.value)} style={{ width: "100%" }}>
              {graph.nodes.map((n) => (
                <option key={n.id} value={n.id}>{n.id}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "block", fontSize: 13, margin: "8px 0 4px" }}>
            Goal
            <select value={goal} onChange={(e) => setGoal(e.target.value)} style={{ width: "100%" }}>
              {graph.nodes.map((n) => (
                <option key={n.id} value={n.id}>{n.id}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={computing} style={{ marginTop: 10, width: "100%" }}>
            {computing ? "Computing…" : "Compute route"}
          </button>
        </form>

        {autoUpdateNotice && (
          <div style={{ color: "#1a7f37", fontSize: 12, marginTop: 10, fontStyle: "italic" }}>
            {autoUpdateNotice}
          </div>
        )}

        {routeError && (
          <div style={{ color: "#c0392b", fontSize: 13, marginTop: 10 }}>{routeError}</div>
        )}
        {route && route.unreachable && (
          <div style={{ color: "#c0392b", fontSize: 13, marginTop: 10 }}>
            No path exists — every route is currently blocked.
          </div>
        )}
        {route && !route.unreachable && (
          <div style={{ fontSize: 13, marginTop: 10 }}>
            <div><strong>Path:</strong> {route.path.join(" → ")}</div>
            <div><strong>Cost:</strong> {route.cost.toFixed(3)} km</div>
            <div><strong>Hazards applied:</strong> {route.hazardsApplied}</div>
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 1000,
          background: "white",
          padding: 14,
          borderRadius: 8,
          boxShadow: "0 1px 6px rgba(0,0,0,0.3)",
          fontFamily: "sans-serif",
          width: 220,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>Report a hazard</div>

        {!selected && (
          <div style={{ fontSize: 13, color: "#555" }}>
            Click anywhere near a road to report a hazard there.
          </div>
        )}

        {snapMessage && !selected && (
          <div style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>{snapMessage}</div>
        )}

        {selected && (
          <form onSubmit={submitHazard}>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
              Selected road: <strong>{selected.edge.from} → {selected.edge.to}</strong>
              <br />
              ({Math.round(selected.distanceKm * 1000)}m from click)
            </div>

            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Type
              <select
                value={hazardForm.type}
                onChange={(e) => setHazardForm({ ...hazardForm, type: e.target.value })}
                style={{ width: "100%" }}
              >
                <option value="pothole">Pothole</option>
                <option value="waterlogging">Waterlogging</option>
                <option value="blockage">Blockage</option>
              </select>
            </label>

            <label style={{ display: "block", fontSize: 13, margin: "8px 0 4px" }}>
              Severity
              <select
                value={hazardForm.severity}
                onChange={(e) => setHazardForm({ ...hazardForm, severity: e.target.value })}
                style={{ width: "100%" }}
              >
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>

            <label style={{ display: "block", fontSize: 13, margin: "8px 0 4px" }}>
              Description
              <textarea
                value={hazardForm.description}
                onChange={(e) => setHazardForm({ ...hazardForm, description: e.target.value })}
                style={{ width: "100%", boxSizing: "border-box" }}
                rows={2}
              />
            </label>

            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button type="submit" disabled={submittingHazard} style={{ flex: 1 }}>
                {submittingHazard ? "Submitting…" : "Submit"}
              </button>
              <button type="button" onClick={() => setSelected(null)} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>

            {hazardSubmitError && (
              <div style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>{hazardSubmitError}</div>
            )}
          </form>
        )}
      </div>

      <MapContainer center={center} zoom={17} style={{ height: "100%", width: "100%" }}>
        <ClickListener onMapClick={handleMapClick} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {graph.edges.map((edge) => {
          const from = nodeById[edge.from];
          const to = nodeById[edge.to];
          if (!from || !to) return null; // defensive — skip if a node id doesn't resolve
          return (
            <Polyline
              key={`${edge.from}-${edge.to}`}
              positions={[
                [from.lat, from.lng],
                [to.lat, to.lng],
              ]}
              pathOptions={{ color: "#3388ff", weight: 4 }}
            />
          );
        })}

        {/* Existing hazards, colored by severity, drawn on top of base roads */}
        {hazards.map((h) => {
          const from = nodeById[h.fromNode];
          const to = nodeById[h.toNode];
          if (!from || !to) return null;
          return (
            <Polyline
              key={h._id}
              positions={[[from.lat, from.lng], [to.lat, to.lng]]}
              pathOptions={{
                color: SEVERITY_COLORS[h.severity] || "#888",
                weight: 5,
                dashArray: "6 6",
              }}
            >
              <Tooltip>{h.type} ({h.severity}){h.description ? `: ${h.description}` : ""}</Tooltip>
            </Polyline>
          );
        })}

        {/* Route, on top of hazards so it's always visible even over a blocked road */}
        {routeCoords && (
          <Polyline positions={routeCoords} pathOptions={{ color: "#e63946", weight: 6, opacity: 0.9 }} />
        )}

        {/* The edge currently selected for a pending hazard report */}
        {selectedCoords && (
          <Polyline positions={selectedCoords} pathOptions={{ color: "#1a1a1a", weight: 8, opacity: 0.4 }} />
        )}

        {graph.nodes.map((node) => (
          <CircleMarker
            key={node.id}
            center={[node.lat, node.lng]}
            radius={8}
            pathOptions={{ color: "#1a1a1a", fillColor: "#ffffff", fillOpacity: 1, weight: 2 }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]}>
              {node.id}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}