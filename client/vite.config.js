import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Vite runs on 5173, Express on 3000 — proxy so the client can call
    // fetch("/graph") etc. without hardcoding a full URL or dealing with
    // CORS during development.
    proxy: {
      '/graph': 'http://localhost:3000',
      '/hazards': 'http://localhost:3000',
      '/route': 'http://localhost:3000',
    },
  },
})