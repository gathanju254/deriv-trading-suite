import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  base: '/',
  build: {
    outDir: 'build',  // ✅ Outputs to 'build' directory
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: { main: path.resolve(__dirname, 'index.html') },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        }
      }
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws': { target: 'http://localhost:8000', ws: true, changeOrigin: true },
    },
    hmr: { port: 5173 },
  },
})