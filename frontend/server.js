// frontend/server.js - UPDATED
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist'), {
  index: false, // Don't serve index.html for all routes
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// SPA fallback - MUST be the last route
app.get('*', (req, res) => {
  console.log('SPA fallback triggered for:', req.url);
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`Serving from: ${path.join(__dirname, 'dist')}`);
});