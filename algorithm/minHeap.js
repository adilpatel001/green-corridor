// Standard array-based binary min-heap, ordered by `priority`.
//
// This replaces the linear scan aStar.js has used since Phase 1 to find
// the lowest-fScore node in the open set — that was O(V) per extraction,
// explicitly flagged back then as "fine for a 9-node graph, revisit at
// real-world scale." This is that revisit.
//
// No decrease-key operation: when a node's fScore improves, aStar just
// pushes a new entry rather than updating an existing one in place.
// That's simpler to implement correctly than a proper decrease-key, at
// the cost of the heap sometimes holding stale entries for a node whose
// score has since improved. aStar.js handles this with a "closed set" —
// once a node is popped and finalized, any later, worse entries for it
// are just skipped. This is the standard, well-documented way to run
// Dijkstra/A* with a plain binary heap without a fancier data structure.

export class MinHeap {
  constructor() {
    this.items = []; // each entry: [priority, value]
  }

  get size() {
    return this.items.length;
  }

  push(priority, value) {
    this.items.push([priority, value]);
    this._bubbleUp(this.items.length - 1);
  }

  // Returns [priority, value] of the minimum, or undefined if empty.
  pop() {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this._bubbleDown(0);
    }
    return top;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent][0] <= this.items[i][0]) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  _bubbleDown(i) {
    const n = this.items.length;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;
      if (left < n && this.items[left][0] < this.items[smallest][0]) smallest = left;
      if (right < n && this.items[right][0] < this.items[smallest][0]) smallest = right;
      if (smallest === i) break;
      [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
      i = smallest;
    }
  }
}