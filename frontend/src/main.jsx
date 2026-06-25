import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// When a deploy ships new JS chunks, an old PWA-cached index.html may still
// reference the previous chunk filenames. Loading those returns HTML (404 / SW
// fallback), which the browser can't parse as JS. Catch that and reload once
// to fetch the new index.html (and SW will update along the way).
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('reloaded_for_chunk_error')) {
    sessionStorage.setItem('reloaded_for_chunk_error', '1');
    window.location.reload();
  }
});
window.addEventListener('error', (event) => {
  const msg = String(event?.message || '');
  if (msg.includes('text/html') && msg.includes('MIME type')) {
    if (!sessionStorage.getItem('reloaded_for_chunk_error')) {
      sessionStorage.setItem('reloaded_for_chunk_error', '1');
      window.location.reload();
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
