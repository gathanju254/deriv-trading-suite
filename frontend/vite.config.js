// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 5173,
    host: true, // allows access via LAN / external devices

    proxy: {
      // Auth routes (OAuth, login, callback, etc.)
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },

      // API routes
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },

      // WebSocket for app (not HMR)
      '/ws': {
        target: 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },

    // Explicitly allow HMR to work without proxy
    hmr: {
      port: 5173,
    },
  },

  esbuild: {
    loader: 'jsx',
  },

  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})
