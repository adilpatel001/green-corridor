import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Vite runs on 5173, Express on 3000 — proxy so the client can call
    // fetch("/graph") etc. without hardcoding a full URL or dealing with
    // CORS during development. ws: true does the same for the Socket.IO
    // handshake, which starts as a plain HTTP request before upgrading.
    proxy: {
      '/graph': 'http://localhost:3000',
      '/hazards': 'http://localhost:3000',
      '/route': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
})