// ── Toast Notification Component ───────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info'

const ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
}

const COLORS: Record<ToastType, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800'
}

export function showToast(message: string, type: ToastType = 'info', duration = 3500) {
  const container = document.getElementById('toast-container')
  if (!container) return

  const toast = document.createElement('div')
  toast.className = `
    pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg
    text-sm font-medium animate-slide-in-right
    ${COLORS[type]}
  `.trim()

  toast.innerHTML = `
    <span class="text-base">${ICONS[type]}</span>
    <span class="flex-1">${message}</span>
    <button class="ml-2 opacity-60 hover:opacity-100 transition-opacity" aria-label="Đóng">✕</button>
  `

  const closeBtn = toast.querySelector('button')!
  const dismiss = () => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(100%)'
    toast.style.transition = 'all 0.2s ease-in'
    setTimeout(() => toast.remove(), 200)
  }

  closeBtn.addEventListener('click', dismiss)
  const timer = setTimeout(dismiss, duration)
  closeBtn.addEventListener('click', () => clearTimeout(timer))

  container.appendChild(toast)
}
