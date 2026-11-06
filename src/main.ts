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
  navigator.serviceWorker.register('/sw.js').then(
    (registration: ServiceWorkerRegistration) => {
      console.log('[app] Service Worker registered:', registration)

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[app] New SW installed, auto-reloading...')
              showToast('🔄 Đang tải phiên bản mới nhất...', 'info', 1500)
              setTimeout(() => window.location.reload(), 800)
            }
          })
        }
      })
    },
    (error: Error) => {
      console.error('[app] Service Worker registration failed:', error)
    }
  )

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })
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
