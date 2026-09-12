// Same reasoning as applyHazards.js in Phase 1: a shallow copy would
// share the nested `edges` objects by reference, so mutating a "clone"
// during preprocessing would silently corrupt the original graph too.

export function structuredCloneGraph(graph) {
  return structuredClone(graph);
}