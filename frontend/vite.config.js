import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Base path - important for production
  base: '/',
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Don't specify rollupOptions unless needed
  },
  
  // Development server
  server: {
    port: 5173,
    host: true,
  },
})