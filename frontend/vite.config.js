import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Electron loads the built index.html via file://, where absolute asset
  // paths ("/assets/...") don't resolve. Relative paths work in both the
  // browser (served from a web root) and Electron's file:// protocol.
  base: './',
  server: {
    port: 5173,
  },
})
