import './style.css'
import { initNetwork } from './network'
import { initSyncListeners } from './sync'
import { defineRoute, initRouter } from './router'
import { renderHome } from './pages/home'
import { renderSurvey } from './pages/survey'
import { renderHistory } from './pages/history'
import { showToast } from './components/toast'

// ── PWA Service Worker Registration ───────────────────────────────────────

if ('serviceWorker' in navigator) {
  // vite-plugin-pwa registers the SW automatically via the plugin
  navigator.serviceWorker.register('/sw.js').then(
    (registration: ServiceWorkerRegistration) => {
      console.log('[app] Service Worker registered:', registration)
      showToast('✅ Ứng dụng đã sẵn sàng hoạt động offline!', 'success', 3000)
    },
    (error: Error) => {
      console.error('[app] Service Worker registration failed:', error)
    }
  )
}

// ── Routes ─────────────────────────────────────────────────────────────────

defineRoute('/',        renderHome)
defineRoute('/survey',  renderSurvey)
defineRoute('/history', renderHistory)

// ── Initialize ─────────────────────────────────────────────────────────────

async function init() {
  // Initialize network monitoring
  await initNetwork()

  // Initialize sync listeners (window.ononline + SW messages)
  initSyncListeners()

  // Start router
  initRouter()

  console.log('[app] VKU Field Survey initialized 🚀')
}

init().catch(console.error)
