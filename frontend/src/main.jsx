// frontend/src/main.jsx
import React, { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './styles/index.css';
import reportWebVitals from './reportWebVitals';

// Grab root element safely
const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container missing in index.html');
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <Suspense fallback={<div className="app-loading">Loading…</div>}>
      <App />
    </Suspense>
  </StrictMode>
);

// Performance metrics (wire to analytics or nuke it)
reportWebVitals(process.env.NODE_ENV === 'development'
  ? console.log
  : undefined
);