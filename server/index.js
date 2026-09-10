// Phase 5 entrypoint. Run with: node server/index.js
// Requires MONGODB_URI in a .env file at the project root (see .env.example).

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./db.js";
import { hazardsRouter } from "./routes/hazards.js";
import { routeRouter } from "./routes/route.js";
import { graphRouter } from "./routes/graph.js";

dotenv.config();

const app = express();

app.use(cors()); // Phase 4's React client will run on a different port
app.use(express.json());
app.use(express.static("server/public")); // serves the basic test form

app.use("/hazards", hazardsRouter);
app.use("/route", routeRouter);
app.use("/graph", graphRouter);

// Phase 5: Express needs to hand its request handling to a raw HTTP
// server so Socket.IO can attach to the same port — Socket.IO isn't an
// Express middleware, it upgrades the underlying HTTP connection itself.
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" }, // dev convenience; the Vite proxy makes this
  // largely moot since requests appear same-origin to the browser, but
  // it's kept explicit here rather than left to whatever socket.io's
  // default happens to be.
});

// Routes reach the io instance via req.app.get("io") rather than
// importing it directly — avoids a circular import between index.js and
// routes/hazards.js, and keeps routes ignorant of how io was constructed.
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });