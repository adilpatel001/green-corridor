// Phase 3 update: hazards now reference graph edges directly by node id
// (fromNode/toNode), since the algorithm still runs on the fake grid graph
// with placeholder x/y coords, not real lat/lng. Matching a hazard to "the
// nearest road segment" only makes sense once real coordinates exist —
// that's Phase 4. For now, the API caller states the edge explicitly.
//
// `location` is kept on the schema but no longer required. It stays
// unused dead weight through Phase 3, then becomes real once Phase 4
// swaps the fake grid for actual lat/lng and geospatial snapping replaces
// this explicit fromNode/toNode approach entirely.

import mongoose from "mongoose";

const hazardSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["pothole", "waterlogging", "blockage"],
  },
  fromNode: {
    type: String,
    required: true,
  },
  toNode: {
    type: String,
    required: true,
  },
  severity: {
    type: String,
    required: true,
    enum: ["minor", "moderate", "blocked"],
    default: "moderate",
  },
  description: {
    type: String,
    default: "",
  },
  reportedAt: {
    type: Date,
    default: Date.now,
  },
  // Phase 6: when this hazard stops affecting routing/display. Computed
  // at report time (server/expiry.js) rather than left to a default here,
  // since the correct duration depends on `type` — a field default can't
  // see another field's value.
  expiresAt: {
    type: Date,
    required: true,
  },
  // Phase 6: distinguishes a hazard that expired naturally (time ran out)
  // from one an Authority-role user marked resolved early. Both stop
  // affecting routing the same way (expiresAt <= now), but this field
  // preserves *why*, which matters for an honest audit history.
  resolved: {
    type: Boolean,
    default: false,
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      // No default here. With a default, Mongoose builds
      // { type: "Point" } even when no location is sent, and MongoDB's
      // 2dsphere index then rejects it for missing coordinates
      // (error 16755). Leaving it undefined means the whole `location`
      // field is simply absent unless a caller explicitly provides one.
    },
    coordinates: {
      type: [Number],
    },
  },
});

// sparse: true tells MongoDB to skip indexing any document where
// `location` is absent, instead of trying (and failing) to extract geo
// keys from it. Only documents that do have a valid location get indexed.
hazardSchema.index({ location: "2dsphere" }, { sparse: true });

export const Hazard = mongoose.model("Hazard", hazardSchema);