import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Base path (keep relative for static hosting)
  base: './',
  
  build: {
    outDir: 'build', // changed from 'dist' to match Render publish directory
    emptyOutDir: true,
  },
})