import './app.css';
import App from './App.svelte';
import { Router } from 'svelte-routing';

const target = document.getElementById('app');
if (!target) {
  document.body.innerHTML = '<div style="color:red;padding:2em;font-family:monospace">FATAL: #app element missing from index.html</div>';
  throw new Error('#app element missing');
}

function showErrorOverlay(err) {
  const msg = (err && (err.stack || err.message)) || String(err);
  target.innerHTML = `
    <div style="position:fixed;inset:0;background:#0a0a0c;color:#ef4444;padding:1.5em;font-family:monospace;white-space:pre-wrap;overflow:auto;z-index:9999">
      <h1 style="color:#f87171;margin:0 0 1em">App failed to load</h1>
      <pre style="margin:0;font-size:14px;line-height:1.4">${msg.replace(/[<>&]/g, c => ({'<': '&lt;', '>': '&gt;', '&': '&amp;'}[c]))}</pre>
    </div>
  `;
  console.error('App init failed:', err);
}

try {
  const app = new App({
    target,
  });
  // Tell index.html to remove the boot loader
  window.dispatchEvent(new Event('app:mounted'));
  // Expose for dev-tools debugging
  if (typeof window !== 'undefined') window.__app = app;
} catch (err) {
  showErrorOverlay(err);
  throw err;
}

// Global error handler so a runtime error inside a route doesn't blank the page
window.addEventListener('error', (e) => {
  console.error('Runtime error:', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
});
