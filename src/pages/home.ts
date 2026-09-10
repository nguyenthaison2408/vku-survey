import { getSurveyCount, getAllSurveys, type Survey } from '../db'
import { isOnline, getNetworkBadge } from '../network'
import { processSyncQueue, getSyncEndpoint, setGoogleSheetUrl, testGoogleSheetConnection, isGoogleSheetConfigured } from '../sync'
import { navigate } from '../router'
import { showToast } from '../components/toast'

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
  const isConfigured = await isGoogleSheetConfigured()
  const currentEndpoint = await getSyncEndpoint()

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
        <div class="flex items-center gap-2">
          <button id="settings-btn" class="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-vku-400 active:scale-95 transition-all shadow-sm" title="Cài đặt Google Sheet">
            <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </button>
          <div class="w-10 h-10 bg-vku-600 rounded-xl flex items-center justify-center shadow-md shadow-vku-600/30">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Google Sheets Banner -->
      <div id="google-sheet-banner" class="cursor-pointer p-3 rounded-2xl border transition-all duration-150 active:scale-98 ${
        isConfigured
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-lg flex-shrink-0">${isConfigured ? '📊' : '⚙️'}</span>
            <div class="min-w-0">
              <div class="font-semibold text-xs truncate">
                ${isConfigured ? 'Đang liên kết Google Sheets' : 'Chưa liên kết Google Sheets'}
              </div>
              <div class="text-[11px] opacity-80 truncate mt-0.5">
                ${isConfigured ? 'Phiếu hoàn thành sẽ tự động lưu vào trang tính' : 'Nhấn vào đây để dán Web App URL'}
              </div>
            </div>
          </div>
          <span class="text-xs font-semibold px-2 py-1 rounded-lg ${
            isConfigured ? 'bg-emerald-200/60 text-emerald-900' : 'bg-amber-200/60 text-amber-900'
          }">
            ${isConfigured ? 'Đang bật' : 'Cài đặt'}
          </span>
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

    <!-- Settings Modal -->
    <div id="settings-modal" class="hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div class="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <div>
              <h3 class="font-bold text-gray-900 text-base">Cấu hình Google Sheets</h3>
              <p class="text-xs text-gray-500">Tự động đồng bộ phiếu vào Google Sheet</p>
            </div>
          </div>
          <button id="close-modal-btn" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        <div class="space-y-3">
          <label class="block text-xs font-semibold text-gray-700">
            Google Apps Script Web App URL:
          </label>
          <input
            id="sheet-url-input"
            type="url"
            placeholder="https://script.google.com/macros/s/.../exec"
            value="${isConfigured ? currentEndpoint : ''}"
            class="w-full text-xs font-mono p-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-vku-500 focus:bg-white"
          />
          <p class="text-[11px] text-gray-500">
            💡 Nhập đường link Web App kết thúc bằng <code class="bg-gray-100 px-1 py-0.5 rounded text-vku-700 font-semibold">/exec</code>.
          </p>
        </div>

        <div class="flex gap-2">
          <button id="save-sheet-url-btn" class="btn-primary flex-1 py-2.5 text-sm">
            💾 Lưu Cài Đặt
          </button>
          <button id="test-sheet-btn" class="btn-secondary px-4 py-2.5 text-xs whitespace-nowrap">
            🚀 Test Thử
          </button>
        </div>

        <!-- Quick guide dropdown -->
        <div class="border-t border-gray-100 pt-4">
          <button id="toggle-guide-btn" class="w-full flex items-center justify-between text-xs font-semibold text-vku-700 hover:text-vku-800">
            <span>📖 Hướng dẫn lấy URL Google Sheet (3 bước)</span>
            <span id="guide-chevron">▼</span>
          </button>

          <div id="guide-content" class="hidden mt-3 p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs space-y-2 text-gray-700 leading-relaxed">
            <p><strong>Bước 1:</strong> Tạo Google Sheet mới tại <a href="https://sheets.new" target="_blank" class="text-blue-600 underline font-medium">sheets.new</a></p>
            <p><strong>Bước 2:</strong> Vào menu <em>Tiện ích mở rộng (Extensions)</em> ➔ <em>Apps Script</em>. Dán code từ file <code>google_apps_script.js</code> trong dự án vào.</p>
            <p><strong>Bước 3:</strong> Bấm <strong>Triển khai (Deploy)</strong> ➔ <strong>Triển khai mới</strong> ➔ Chọn loại <strong>Ứng dụng web (Web app)</strong> ➔ Mục <em>Ai có quyền truy cập</em> chọn <strong>Bất kỳ ai (Anyone)</strong> ➔ Copy link và dán vào ô bên trên.</p>
          </div>
        </div>
      </div>
    </div>
  `

  // Setup Settings Modal logic
  const modal = document.getElementById('settings-modal')!
  const openModal = () => modal.classList.remove('hidden')
  const closeModal = () => modal.classList.add('hidden')

  document.getElementById('settings-btn')?.addEventListener('click', openModal)
  document.getElementById('google-sheet-banner')?.addEventListener('click', openModal)
  document.getElementById('close-modal-btn')?.addEventListener('click', closeModal)

  // Toggle guide
  const guideBtn = document.getElementById('toggle-guide-btn')
  const guideContent = document.getElementById('guide-content')
  const guideChevron = document.getElementById('guide-chevron')
  guideBtn?.addEventListener('click', () => {
    const isHidden = guideContent?.classList.toggle('hidden')
    if (guideChevron) guideChevron.textContent = isHidden ? '▼' : '▲'
  })

  // Save URL
  document.getElementById('save-sheet-url-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('sheet-url-input') as HTMLInputElement
    const val = input.value.trim()

    if (val && !val.startsWith('https://script.google.com/')) {
      showToast('⚠️ URL phải bắt đầu bằng https://script.google.com/', 'warning')
      return
    }

    await setGoogleSheetUrl(val)
    showToast(val ? '✅ Đã lưu URL Google Sheet thành công!' : 'ℹ️ Đã xóa cấu hình Google Sheet', 'success')
    closeModal()
    await renderHome()
  })

  // Test URL
  document.getElementById('test-sheet-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('sheet-url-input') as HTMLInputElement
    const val = input.value.trim()
    if (!val) {
      showToast('⚠️ Vui lòng nhập URL Web App trước khi test', 'warning')
      return
    }

    const testBtn = document.getElementById('test-sheet-btn') as HTMLButtonElement
    testBtn.textContent = 'Đang test...'
    testBtn.disabled = true

    showToast('🔄 Đang gửi dòng thử nghiệm đến Google Sheet...', 'info', 2000)
    const res = await testGoogleSheetConnection(val)

    testBtn.textContent = '🚀 Test Thử'
    testBtn.disabled = false

    if (res.success) {
      showToast(res.message, 'success', 4000)
    } else {
      showToast(res.message, 'error', 4000)
    }
  })

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
