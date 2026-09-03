// Phase 2: connection logic lives on its own so index.js doesn't need to
// know anything about Mongoose directly — it just calls connectDB().

import mongoose from "mongoose";
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and fill it in.");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");
}