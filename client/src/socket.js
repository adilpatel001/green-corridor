// Phase 5: a single shared socket connection for the whole app, created
// once at module load rather than inside a component. If this lived
// inside App's useEffect and something caused App to remount, a new
// socket would connect without the old one necessarily being cleaned up
// first — a module-level singleton avoids that class of bug entirely.
//
// io() with no URL connects to the page's own origin (localhost:5173 in
// dev), which Vite's proxy then forwards to the real server on :3000 —
// same mechanism as the REST calls, just for a persistent connection
// instead of one-off requests.

import { io } from "socket.io-client";

export const socket = io();