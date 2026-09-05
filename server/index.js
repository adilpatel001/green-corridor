// Phase 2 entrypoint. Run with: node server/index.js
// Requires MONGODB_URI in a .env file at the project root (see .env.example).

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db.js";
import { hazardsRouter } from "./routes/hazards.js";
import { routeRouter } from "./routes/route.js";

dotenv.config();

const app = express();

app.use(cors()); // Phase 4's React client will run on a different port
app.use(express.json());
app.use(express.static("server/public")); // serves the basic test form

app.use("/hazards", hazardsRouter);
app.use("/route", routeRouter);

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });