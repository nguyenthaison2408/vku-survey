import { getSurveyCount, getAllSurveys, type Survey } from '../db'
import { isOnline, getNetworkBadge } from '../network'
import { processSyncQueue } from '../sync'
import { navigate } from '../router'

// ── Category Icons & Labels ────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  Hardware:    '💻',
  Projector:   '📽️',
  AC:          '❄️',
  Electrical:  '⚡',
  Furniture:   '🪑'
}

const CATEGORY_LABELS: Record<string, string> = {
  Hardware:    'Phần cứng',
  Projector:   'Máy chiếu',
  AC:          'Điều hòa',
  Electrical:  'Điện',
  Furniture:   'Nội thất'
}

function getStars(rating: number): string {
  return '⭐'.repeat(rating) + '☆'.repeat(5 - rating)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'vừa xong'
  if (mins < 60) return `${mins} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  return `${days} ngày trước`
}

function surveyCard(survey: Survey): string {
  const statusBadge = survey.status === 'PENDING_SYNC'
    ? '<span class="badge-pending"><span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>Chờ đồng bộ</span>'
    : survey.status === 'SYNCED'
      ? '<span class="badge-synced">✓ Đã đồng bộ</span>'
      : '<span class="badge-draft">Nháp</span>'

  return `
    <div class="card p-4 animate-fade-in" data-id="${survey.id}">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-11 h-11 bg-vku-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
            ${CATEGORY_ICONS[survey.category] ?? '📋'}
          </div>
          <div class="min-w-0">
            <div class="font-semibold text-gray-900 text-sm truncate">
              ${CATEGORY_LABELS[survey.category] ?? survey.category}
            </div>
            <div class="text-xs text-gray-500 truncate">
              ${survey.building} · Tầng ${survey.floor} · Phòng ${survey.room}
            </div>
            <div class="text-xs text-gray-400 mt-0.5">${timeAgo(survey.createdAt)}</div>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
          ${statusBadge}
          <div class="text-sm">${getStars(survey.rating)}</div>
        </div>
      </div>
      ${survey.notes ? `<p class="mt-3 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 line-clamp-2">${survey.notes}</p>` : ''}
      ${survey.photoBase64 ? `
        <div class="mt-3">
          <img src="${survey.photoBase64}" alt="Ảnh kiểm tra" class="w-full h-32 object-cover rounded-xl" loading="lazy" />
        </div>
      ` : ''}
    </div>
  `
}

// ── Home Page ──────────────────────────────────────────────────────────────

export async function renderHome() {
  const main = document.getElementById('main-content')!
  main.innerHTML = `
    <div class="p-4 space-y-4 animate-fade-in">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-900">VKU Field Survey</h1>
          <div class="flex items-center gap-2 mt-1" id="network-status-home">
            ${getNetworkBadge()}
          </div>
        </div>
        <div class="w-12 h-12 bg-vku-600 rounded-2xl flex items-center justify-center shadow-lg shadow-vku-600/30">
          <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
        </div>
      </div>

      <!-- Stats loading skeleton -->
      <div id="stats-container">
        <div class="grid grid-cols-3 gap-3">
          ${['bg-vku-50', 'bg-amber-50', 'bg-emerald-50'].map((color) => `
            <div class="rounded-2xl p-4 animate-pulse ${color}">
              <div class="h-7 bg-gray-200 rounded w-8 mb-2"></div>
              <div class="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Quick action -->
      <button id="new-survey-btn" class="btn-primary w-full py-4 text-base rounded-2xl shadow-lg shadow-vku-600/30">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Tạo Phiếu Kiểm Tra Mới
      </button>

      <!-- Sync button (shown when offline pending) -->
      <button id="sync-btn" class="hidden btn-secondary w-full gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Đồng Bộ Ngay
      </button>

      <!-- Recent surveys -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-bold text-gray-900">Gần đây</h2>
          <button id="see-all-btn" class="text-sm text-vku-600 font-medium">Xem tất cả →</button>
        </div>
        <div id="recent-list" class="space-y-3">
          <div class="animate-pulse space-y-3">
            ${[1,2].map(() => `<div class="h-24 bg-gray-100 rounded-2xl"></div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `

  // Load real data
  const [counts, recentSurveys] = await Promise.all([
    getSurveyCount(),
    getAllSurveys().then(s => s.slice(0, 5))
  ])

  // Render stats
  document.getElementById('stats-container')!.innerHTML = `
    <div class="grid grid-cols-3 gap-3">
      <div class="bg-vku-50 rounded-2xl p-4">
        <div class="text-2xl font-bold text-vku-700">${counts.total}</div>
        <div class="text-xs text-vku-600 font-medium mt-0.5">Tổng số</div>
      </div>
      <div class="bg-amber-50 rounded-2xl p-4">
        <div class="text-2xl font-bold text-amber-600 flex items-center gap-1">
          ${counts.pending}
          ${counts.pending > 0 ? '<span class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>' : ''}
        </div>
        <div class="text-xs text-amber-600 font-medium mt-0.5">Chờ sync</div>
      </div>
      <div class="bg-emerald-50 rounded-2xl p-4">
        <div class="text-2xl font-bold text-emerald-600">${counts.synced}</div>
        <div class="text-xs text-emerald-600 font-medium mt-0.5">Đã sync</div>
      </div>
    </div>
  `

  // Show sync button if pending + online
  const syncBtn = document.getElementById('sync-btn')!
  if (counts.pending > 0 && isOnline()) {
    syncBtn.classList.remove('hidden')
    syncBtn.textContent = `🔄 Đồng Bộ ${counts.pending} Phiếu`
    syncBtn.addEventListener('click', async () => {
      syncBtn.textContent = 'Đang đồng bộ...'
      syncBtn.setAttribute('disabled', 'true')
      await processSyncQueue()
      await renderHome() // re-render
    })
  }

  // Render recent surveys
  const recentList = document.getElementById('recent-list')!
  if (recentSurveys.length === 0) {
    recentList.innerHTML = `
      <div class="card p-8 text-center text-gray-400">
        <div class="text-4xl mb-3">📋</div>
        <div class="font-semibold text-gray-500">Chưa có phiếu kiểm tra</div>
        <div class="text-sm mt-1">Nhấn nút bên trên để tạo phiếu mới</div>
      </div>
    `
  } else {
    recentList.innerHTML = recentSurveys.map(surveyCard).join('')
  }

  // Event listeners
  document.getElementById('new-survey-btn')!.addEventListener('click', () => navigate('/survey'))
  document.getElementById('see-all-btn')!.addEventListener('click', () => navigate('/history'))

  // Listen for updates
  const handler = () => renderHome()
  window.addEventListener('surveys-updated', handler, { once: true })
}
