import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Base path is CRITICAL
  base: './',  // Changed from '/' to './'
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Remove all rollupOptions - let Vite handle it
  },
})