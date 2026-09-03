// ── Network Monitor ────────────────────────────────────────────────────────
// Tracks online/offline status using:
//   • @capacitor/network on native (more accurate)
//   • navigator.onLine + window events on web

type NetworkListener = (isOnline: boolean) => void
const listeners = new Set<NetworkListener>()

let _isOnline = navigator.onLine

export function isOnline(): boolean {
  return _isOnline
}

function notifyListeners(online: boolean) {
  _isOnline = online
  listeners.forEach(fn => fn(online))
  updateNetworkBar(online)
}

export function onNetworkChange(fn: NetworkListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// ── Network Status Bar ─────────────────────────────────────────────────────

function updateNetworkBar(online: boolean) {
  const bar = document.getElementById('network-bar')
  const msg = document.getElementById('network-msg')
  if (!bar || !msg) return

  if (online) {
    bar.className = 'fixed top-0 left-0 right-0 z-50 py-1.5 text-center text-sm font-medium transition-all duration-300 bg-emerald-500 text-white'
    msg.textContent = '✅ Đã kết nối mạng'
    setTimeout(() => {
      bar.classList.add('hidden')
    }, 3000)
    bar.classList.remove('hidden')
  } else {
    bar.className = 'fixed top-0 left-0 right-0 z-50 py-1.5 text-center text-sm font-medium transition-all duration-300 bg-amber-500 text-white'
    msg.textContent = '📴 Không có mạng — dữ liệu sẽ lưu offline'
    bar.classList.remove('hidden')
  }
}

// ── Initialize ─────────────────────────────────────────────────────────────

export async function initNetwork(): Promise<void> {
  // Try Capacitor Network plugin first
  const isNative = !!(window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative

  if (isNative) {
    try {
      const { Network } = await import('@capacitor/network')

      // Get initial status
      const status = await Network.getStatus()
      notifyListeners(status.connected)

      // Listen for changes
      Network.addListener('networkStatusChange', (status) => {
        console.log('[network] Capacitor status:', status)
        notifyListeners(status.connected)
      })

      console.log('[network] Using Capacitor Network plugin')
      return
    } catch (err) {
      console.warn('[network] Capacitor Network unavailable, using web fallback:', err)
    }
  }

  // Web fallback
  _isOnline = navigator.onLine

  window.addEventListener('online', () => {
    console.log('[network] Online')
    notifyListeners(true)
  })

  window.addEventListener('offline', () => {
    console.log('[network] Offline')
    notifyListeners(false)
  })

  console.log('[network] Using web Network API, initial status:', _isOnline ? 'online' : 'offline')

  // If starting offline, show bar immediately
  if (!_isOnline) {
    updateNetworkBar(false)
  }
}

// ── Network Badge Helper ───────────────────────────────────────────────────

export function getNetworkBadge(): string {
  return _isOnline
    ? '<span class="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>Online</span>'
    : '<span class="inline-flex items-center gap-1 text-amber-600 text-xs font-medium"><span class="w-2 h-2 bg-amber-500 rounded-full"></span>Offline</span>'
}
