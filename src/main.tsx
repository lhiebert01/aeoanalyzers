import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Stale-deploy recovery: after a new deploy, old hashed chunks are removed from
// the server, so a tab still running the previous build fails to lazy-load a
// chunk (e.g. the code-split DOCX generator) with a MIME/"Failed to fetch
// dynamically imported module" error. Vite fires `vite:preloadError` in that
// case — reload once to fetch the current index.html and its valid chunks.
// The sessionStorage guard prevents a reload loop if the chunk is genuinely gone.
window.addEventListener('vite:preloadError', () => {
  // Time-based guard: reload on a fresh failure, but don't loop if the chunk is
  // genuinely missing even after reloading. A later deploy (>10s) can reload again.
  const last = Number(sessionStorage.getItem('aeo-chunk-reload-at') || '0');
  if (Date.now() - last > 10000) {
    sessionStorage.setItem('aeo-chunk-reload-at', String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
