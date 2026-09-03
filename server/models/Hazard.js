// Phase 2: Hazard schema.
//
// `location` is stored as GeoJSON — the format MongoDB's geospatial
// queries expect. We're not running geospatial queries yet (that's
// Phase 3, when hazards need to be matched against graph edges), but
// the 2dsphere index has to exist on the schema from the start, since
// adding it retroactively to a populated collection means a migration.

import mongoose from "mongoose";

const hazardSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["pothole", "waterlogging", "blockage"],
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      // GeoJSON order is [longitude, latitude] — reversed from how most
      // people say coordinates out loud. Easy to get backwards later.
      type: [Number],
      required: true,
    },
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
});

hazardSchema.index({ location: "2dsphere" });

export const Hazard = mongoose.model("Hazard", hazardSchema);