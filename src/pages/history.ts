import { getAllSurveys, deleteSurvey, type Survey } from '../db'
import { processSyncQueue } from '../sync'
import { isOnline } from '../network'
import { showToast } from '../components/toast'

const CATEGORY_ICONS: Record<string, string> = {
  Hardware: '💻', Projector: '📽️', AC: '❄️', Electrical: '⚡', Furniture: '🪑'
}
const CATEGORY_LABELS: Record<string, string> = {
  Hardware: 'Phần cứng', Projector: 'Máy chiếu', AC: 'Điều hòa', Electrical: 'Điện', Furniture: 'Nội thất'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function surveyDetailCard(survey: Survey): string {
  const statusBadge = survey.status === 'PENDING_SYNC'
    ? '<span class="badge-pending"><span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>Chờ đồng bộ</span>'
    : '<span class="badge-synced">✓ Đã đồng bộ</span>'

  return `
    <div class="card overflow-hidden animate-fade-in" data-id="${survey.id}">
      ${survey.photoBase64 ? `
        <img src="${survey.photoBase64}" alt="Ảnh" class="w-full h-40 object-cover" loading="lazy" />
      ` : ''}
      <div class="p-4">
        <div class="flex items-start justify-between gap-2 mb-3">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${CATEGORY_ICONS[survey.category] ?? '📋'}</span>
            <div>
              <div class="font-bold text-gray-900">${CATEGORY_LABELS[survey.category] ?? survey.category}</div>
              <div class="text-xs text-gray-500">${survey.building} · Tầng ${survey.floor} · Phòng ${survey.room}</div>
            </div>
          </div>
          ${statusBadge}
        </div>

        <div class="text-lg mb-2">${'⭐'.repeat(survey.rating)}${'☆'.repeat(5 - survey.rating)} <span class="text-sm text-gray-500">(${survey.rating}/5)</span></div>

        ${survey.notes ? `<p class="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 mb-3">${survey.notes}</p>` : ''}

        <div class="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3 mt-1">
          <span>🕐 ${formatDate(survey.createdAt)}</span>
          ${survey.syncedAt ? `<span>✅ ${formatDate(survey.syncedAt)}</span>` : ''}
        </div>

        <div class="flex gap-2 mt-3">
          ${survey.status === 'PENDING_SYNC' && isOnline() ? `
            <button class="sync-single-btn btn-secondary flex-1 text-sm py-2 gap-1.5" data-id="${survey.id}">
              🔄 Sync
            </button>
          ` : ''}
          <button class="delete-btn btn-danger flex-1 text-sm py-2" data-id="${survey.id}">
            🗑️ Xóa
          </button>
        </div>
      </div>
    </div>
  `
}

type FilterType = 'all' | 'pending' | 'synced'

export async function renderHistory() {
  const main = document.getElementById('main-content')!
  let filter: FilterType = 'all'

  async function render() {
    let surveys = await getAllSurveys()
    if (filter === 'pending') surveys = surveys.filter(s => s.status === 'PENDING_SYNC')
    if (filter === 'synced')  surveys = surveys.filter(s => s.status === 'SYNCED')

    const pendingCount = surveys.filter(s => s.status === 'PENDING_SYNC').length

    main.innerHTML = `
      <div class="p-4 space-y-4 animate-fade-in">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-gray-900">Lịch sử kiểm tra</h1>
          ${pendingCount > 0 && isOnline() ? `
            <button id="sync-all-btn" class="btn-primary py-2 px-4 text-sm">
              🔄 Sync (${pendingCount})
            </button>
          ` : ''}
        </div>

        <!-- Filter tabs -->
        <div class="flex bg-gray-100 rounded-xl p-1 gap-1">
          ${(['all', 'pending', 'synced'] as FilterType[]).map(f => `
            <button
              class="filter-tab flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                filter === f ? 'bg-white text-vku-700 shadow-sm' : 'text-gray-500'
              }"
              data-filter="${f}"
            >${f === 'all' ? 'Tất cả' : f === 'pending' ? '⏳ Chờ sync' : '✅ Đã sync'}</button>
          `).join('')}
        </div>

        <!-- Survey list -->
        <div class="space-y-4">
          ${surveys.length === 0
            ? `
              <div class="card p-12 text-center">
                <div class="text-5xl mb-3">🗂️</div>
                <div class="font-semibold text-gray-500">Không có phiếu nào</div>
                <div class="text-sm text-gray-400 mt-1">
                  ${filter === 'pending' ? 'Không có phiếu chờ đồng bộ' : filter === 'synced' ? 'Chưa có phiếu được đồng bộ' : 'Chưa có phiếu kiểm tra nào'}
                </div>
                <button class="btn-primary mt-4" onclick="location.hash='/survey'">+ Tạo phiếu mới</button>
              </div>
            `
            : surveys.map(surveyDetailCard).join('')
          }
        </div>
      </div>
    `

    // Filter tabs
    main.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        filter = (btn as HTMLElement).dataset['filter'] as FilterType
        render()
      })
    })

    // Sync all
    document.getElementById('sync-all-btn')?.addEventListener('click', async () => {
      showToast('🔄 Đang đồng bộ...', 'info')
      await processSyncQueue()
      render()
    })

    // Delete buttons
    main.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset['id']!
        if (confirm('Xóa phiếu này?')) {
          await deleteSurvey(id)
          showToast('🗑️ Đã xóa phiếu', 'info')
          window.dispatchEvent(new CustomEvent('surveys-updated'))
          render()
        }
      })
    })

    // Single sync
    main.querySelectorAll('.sync-single-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        showToast('🔄 Đang đồng bộ...', 'info')
        await processSyncQueue()
        render()
      })
    })
  }

  render()

  window.addEventListener('surveys-updated', render)
}
