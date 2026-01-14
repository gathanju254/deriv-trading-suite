// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-public',
      writeBundle() {
        const publicDir = path.resolve(__dirname, 'public')
        const distDir = path.resolve(__dirname, 'dist')
        
        if (existsSync(publicDir)) {
          console.log(`📁 Copying files from ${publicDir} to ${distDir}`)
          
          const copyFiles = (dir) => {
            const files = readdirSync(dir)
            files.forEach(file => {
              const srcPath = join(dir, file)
              const destPath = srcPath.replace(publicDir, distDir)
              
              // Ensure destination directory exists
              const destDir = path.dirname(destPath)
              if (!existsSync(destDir)) {
                // Create directory recursively
                import('fs').then(fs => {
                  fs.mkdirSync(destDir, { recursive: true })
                })
              }
              
              if (statSync(srcPath).isDirectory()) {
                // Recursively copy subdirectories
                copyFiles(srcPath)
              } else {
                try {
                  copyFileSync(srcPath, destPath)
                  console.log(`✅ Copied: ${file}`)
                } catch (error) {
                  console.error(`❌ Failed to copy ${file}:`, error.message)
                }
              }
            })
          }
          copyFiles(publicDir)
          console.log('🎉 All public files copied successfully!')
        } else {
          console.log('ℹ️ No public directory found, skipping copy')
        }
      },
    },
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },

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