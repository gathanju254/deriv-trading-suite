// frontend/server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Serve static files from dist folder
app.use(express.static(path.join(__dirname, 'dist'), {
  index: false, // Don't automatically serve index.html
  maxAge: '1d'  // Cache static assets
}));

// IMPORTANT: SPA fallback - all routes to index.html
app.get('*', (req, res) => {
  console.log(`Serving SPA for route: ${req.path}`);
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Frontend server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`📡 API URL: ${process.env.VITE_API_BASE_URL || 'Not set'}`);
});