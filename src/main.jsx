import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import EnvCheck from './shared/components/EnvCheck'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <EnvCheck>
      <App />
    </EnvCheck>
  </React.StrictMode>
)

// Aplicație instalabilă: service worker doar în producție, nu blochează pornirea dacă eșuează
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}
