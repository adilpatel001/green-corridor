import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from "react-leaflet";

// react-leaflet's default Marker icon points at image files by a relative
// path that most bundlers (Vite included) don't resolve correctly out of
// the box — a well-known gotcha that trips up almost everyone's first
// Leaflet integration. Using CircleMarker instead sidesteps the problem
// entirely: it's drawn as an SVG circle, no icon image asset involved.

export default function App() {
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/graph")
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        return res.json();
      })
      .then(setGraph)
      .catch((err) => setError(err.message));
  }, []);

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

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <MapContainer center={center} zoom={17} style={{ height: "100%", width: "100%" }}>
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