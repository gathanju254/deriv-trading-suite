// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync } from 'fs'  // Add this import

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    // Add this custom plugin to copy _redirects after build
    {
      name: 'copy-redirects',
      writeBundle() {
        const src = path.resolve(__dirname, 'public/_redirects')
        const dest = path.resolve(__dirname, 'dist/_redirects')
        try {
          copyFileSync(src, dest)
          console.log('✅ _redirects copied to dist/')
        } catch (error) {
          console.error('❌ Failed to copy _redirects:', error)
        }
      },
    },
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  // For production build on Render
  build: {
    outDir: 'dist',
    // IMPORTANT: Add emptyOutDir to clean dist folder
    emptyOutDir: true,
    // Add rollup options for SPA
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
    // Remove assetsInclude for _redirects (not needed now)
  },

  // For local development
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
    hmr: {
      port: 5173,
    },
  },
})