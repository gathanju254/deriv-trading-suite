import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Base path - important for production
  base: '/',
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,  // Disable source maps in production
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'axios'],
        }
      }
    }
  },
  
  // Development server
  server: {
    port: 5173,
    host: true,
  },
})