import { saveSurvey, saveDraft, loadDraft, clearDraft, type Survey, type SurveyCategory } from '../db'
import { capturePhoto } from '../camera'
import { registerBackgroundSync, processSyncQueue } from '../sync'
import { isOnline } from '../network'
import { navigate } from '../router'
import { showToast } from '../components/toast'
import { createStarRating, type RatingValue } from '../components/star-rating'

// ── Form State ─────────────────────────────────────────────────────────────

interface FormState {
  id: string
  step: number
  building: string
  floor: string
  room: string
  category: SurveyCategory | ''
  rating: 1 | 2 | 3 | 4 | 5 | null
  notes: string
  photoBase64: string | null
}

const TOTAL_STEPS = 5

const CATEGORIES: Array<{ value: SurveyCategory; label: string; icon: string; desc: string }> = [
  { value: 'Hardware',   label: 'Phần cứng',  icon: '💻', desc: 'Máy tính, màn hình, thiết bị IT' },
  { value: 'Projector',  label: 'Máy chiếu',  icon: '📽️', desc: 'Projector, màn chiếu' },
  { value: 'AC',         label: 'Điều hòa',   icon: '❄️', desc: 'Điều hòa không khí, quạt' },
  { value: 'Electrical', label: 'Điện',        icon: '⚡', desc: 'Ổ cắm, công tắc, bảng điện' },
  { value: 'Furniture',  label: 'Nội thất',   icon: '🪑', desc: 'Bàn ghế, tủ, bảng' }
]

const BUILDINGS = [
  'Nhà A', 'Nhà B', 'Nhà C', 'Nhà D', 'Nhà E',
  'Hội trường', 'Thư viện', 'Ký túc xá', 'Nhà xe'
]

// ── Survey Page ────────────────────────────────────────────────────────────

export async function renderSurvey() {
  const main = document.getElementById('main-content')!

  // Try to restore draft
  const savedDraft = await loadDraft()
  const state: FormState = {
    id: savedDraft?.id ?? crypto.randomUUID(),
    step: 1,
    building: (savedDraft?.building as string) ?? '',
    floor: (savedDraft?.floor as string) ?? '',
    room: (savedDraft?.room as string) ?? '',
    category: (savedDraft?.category as SurveyCategory) ?? '',
    rating: (savedDraft?.rating as 1 | 2 | 3 | 4 | 5 | null) ?? null,
    notes: (savedDraft?.notes as string) ?? '',
    photoBase64: (savedDraft?.photoBase64 as string | null) ?? null
  }

  if (savedDraft) {
    showToast('📝 Đã khôi phục bản nháp', 'info')
  }

  function renderStep() {
    main.innerHTML = `
      <div class="p-4 animate-slide-in-up">
        <!-- Header -->
        <div class="flex items-center gap-3 mb-6">
          <button id="back-btn" class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="flex-1">
            <div class="text-xs text-gray-400 font-medium mb-1">Bước ${state.step}/${TOTAL_STEPS}</div>
            <div class="w-full bg-gray-100 rounded-full h-1.5">
              <div class="bg-vku-600 h-1.5 rounded-full transition-all duration-300" style="width: ${(state.step / TOTAL_STEPS) * 100}%"></div>
            </div>
          </div>
          <button id="discard-btn" class="text-xs text-red-500 font-medium">Hủy</button>
        </div>

        <!-- Step content -->
        <div id="step-content"></div>

        <!-- Navigation buttons -->
        <div class="mt-6 flex gap-3">
          ${state.step > 1 ? `<button id="prev-btn" class="btn-secondary flex-1">← Trước</button>` : ''}
          ${state.step < TOTAL_STEPS
            ? `<button id="next-btn" class="btn-primary flex-1">Tiếp theo →</button>`
            : `<button id="submit-btn" class="btn-primary flex-1">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Nộp phiếu
              </button>`
          }
        </div>
        <p class="text-center text-xs text-gray-400 mt-3">💾 Dữ liệu tự động lưu nháp</p>
      </div>
    `

    renderStepContent()
    attachStepEvents()
  }

  function renderStepContent() {
    const content = document.getElementById('step-content')!

    switch (state.step) {
      case 1:
        renderStep1(content)
        break
      case 2:
        renderStep2(content)
        break
      case 3:
        renderStep3(content)
        break
      case 4:
        renderStep4(content)
        break
      case 5:
        renderStep5(content)
        break
    }
  }

  // ── Step 1: Location ────────────────────────────────────────────────────

  function renderStep1(container: HTMLElement) {
    container.innerHTML = `
      <div class="space-y-4">
        <div class="text-center mb-6">
          <div class="text-4xl mb-2">📍</div>
          <h2 class="text-xl font-bold text-gray-900">Vị trí kiểm tra</h2>
          <p class="text-sm text-gray-500 mt-1">Nhập thông tin về địa điểm kiểm tra</p>
        </div>

        <div>
          <label class="form-label">Tòa nhà *</label>
          <select id="building-select" class="form-select">
            <option value="">Chọn tòa nhà</option>
            ${BUILDINGS.map(b => `<option value="${b}" ${state.building === b ? 'selected' : ''}>${b}</option>`).join('')}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Tầng *</label>
            <select id="floor-select" class="form-select">
              <option value="">Chọn tầng</option>
              ${['1', '2', '3', '4', '5', 'Trệt', 'Tầng hầm'].map(f =>
                `<option value="${f}" ${state.floor === f ? 'selected' : ''}>${f}</option>`
              ).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Số phòng *</label>
            <input
              id="room-input"
              type="text"
              inputmode="text"
              placeholder="VD: 101, Lab A"
              class="form-input"
              value="${state.room}"
              maxlength="20"
            />
          </div>
        </div>
      </div>
    `

    document.getElementById('building-select')!.addEventListener('change', (e) => {
      state.building = (e.target as HTMLSelectElement).value
      autoSave()
    })
    document.getElementById('floor-select')!.addEventListener('change', (e) => {
      state.floor = (e.target as HTMLSelectElement).value
      autoSave()
    })
    document.getElementById('room-input')!.addEventListener('input', (e) => {
      state.room = (e.target as HTMLInputElement).value
      autoSave()
    })
  }

  // ── Step 2: Category ────────────────────────────────────────────────────

  function renderStep2(container: HTMLElement) {
    container.innerHTML = `
      <div>
        <div class="text-center mb-6">
          <div class="text-4xl mb-2">🏷️</div>
          <h2 class="text-xl font-bold text-gray-900">Loại thiết bị</h2>
          <p class="text-sm text-gray-500 mt-1">Chọn loại thiết bị cần kiểm tra</p>
        </div>

        <div class="space-y-2.5" id="category-list">
          ${CATEGORIES.map(cat => `
            <button
              type="button"
              class="category-btn w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-150 text-left
                ${state.category === cat.value
                  ? 'border-vku-600 bg-vku-50 text-vku-900'
                  : 'border-gray-200 bg-white text-gray-800 hover:border-vku-300 hover:bg-vku-50/50'
                }"
              data-value="${cat.value}"
            >
              <div class="text-3xl w-12 text-center">${cat.icon}</div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm">${cat.label}</div>
                <div class="text-xs text-gray-500 mt-0.5">${cat.desc}</div>
              </div>
              ${state.category === cat.value ? `
                <svg class="w-5 h-5 text-vku-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
              ` : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `

    container.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.category = (btn as HTMLElement).dataset['value'] as SurveyCategory
        autoSave()
        renderStep2(container) // re-render to show selection
      })
    })
  }

  // ── Step 3: Condition Rating ─────────────────────────────────────────────

  const RATING_OPTIONS: Array<{
    value: RatingValue
    emoji: string
    label: string
    desc: string
    color: string
    activeBorder: string
    activeBg: string
  }> = [
    { value: 1, emoji: '😖', label: 'Rất tệ', desc: 'Hỏng hóc nặng', color: 'text-red-500', activeBorder: 'border-red-500', activeBg: 'bg-red-50' },
    { value: 2, emoji: '😕', label: 'Tệ', desc: 'Có lỗi / kém', color: 'text-orange-500', activeBorder: 'border-orange-500', activeBg: 'bg-orange-50' },
    { value: 3, emoji: '😐', label: 'Bình thường', desc: 'Dùng được', color: 'text-amber-500', activeBorder: 'border-amber-500', activeBg: 'bg-amber-50' },
    { value: 4, emoji: '😊', label: 'Tốt', desc: 'Hoạt động tốt', color: 'text-lime-600', activeBorder: 'border-lime-500', activeBg: 'bg-lime-50' },
    { value: 5, emoji: '😄', label: 'Xuất sắc', desc: 'Rất tốt, như mới', color: 'text-emerald-600', activeBorder: 'border-emerald-500', activeBg: 'bg-emerald-50' }
  ]

  function renderStep3(container: HTMLElement) {
    container.innerHTML = `
      <div>
        <div class="text-center mb-6">
          <div class="text-4xl mb-2">⭐</div>
          <h2 class="text-xl font-bold text-gray-900">Tình trạng thiết bị</h2>
          <p class="text-sm text-gray-500 mt-1">Đánh giá mức độ tình trạng từ 1–5 sao</p>
        </div>

        <div id="rating-card" class="card p-6 mb-4 transition-all duration-200">
          <div class="text-center text-sm text-gray-600 mb-2">
            <strong>${CATEGORIES.find(c => c.value === state.category)?.icon ?? ''} ${CATEGORIES.find(c => c.value === state.category)?.label ?? ''}</strong>
            — ${state.building} · Tầng ${state.floor} · Phòng ${state.room}
          </div>
          <div id="star-rating-container" class="flex justify-center py-2"></div>
        </div>

        <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">
          Hoặc chạm chọn nhanh mức độ:
        </div>

        <div class="grid grid-cols-5 gap-1.5" id="rating-options-grid">
          ${RATING_OPTIONS.map(opt => `
            <button
              type="button"
              class="rating-option-btn p-2 rounded-xl border-2 transition-all duration-150 text-center flex flex-col items-center justify-center cursor-pointer select-none active:scale-95 ${
                state.rating === opt.value
                  ? `${opt.activeBorder} ${opt.activeBg} font-semibold ring-2 ring-offset-1 ring-vku-400 shadow-sm`
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }"
              data-rating="${opt.value}"
            >
              <div class="text-2xl mb-1">${opt.emoji}</div>
              <div class="text-xs font-medium ${opt.color} leading-tight">${opt.label}</div>
              <div class="text-[10px] text-gray-400 leading-tight mt-0.5">${opt.desc}</div>
            </button>
          `).join('')}
        </div>

        <div id="rating-status-indicator" class="mt-4 p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-medium ${
          state.rating
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border border-amber-200 text-amber-700'
        }">
          ${
            state.rating
              ? `<span>✅ Đã chọn đánh giá: <strong>${state.rating}/5 sao</strong> (${RATING_OPTIONS.find(o => o.value === state.rating)?.label})</span>`
              : '<span>👉 Chạm vào sao hoặc mức độ bên trên để đánh giá</span>'
          }
        </div>
      </div>
    `

    function updateOptionButtons(rating: RatingValue) {
      container.querySelectorAll<HTMLButtonElement>('.rating-option-btn').forEach(btn => {
        const val = parseInt(btn.dataset['rating'] ?? '0', 10) as RatingValue
        const opt = RATING_OPTIONS.find(o => o.value === val)
        if (!opt) return

        if (val === rating) {
          btn.className = `rating-option-btn p-2 rounded-xl border-2 transition-all duration-150 text-center flex flex-col items-center justify-center cursor-pointer select-none active:scale-95 ${opt.activeBorder} ${opt.activeBg} font-semibold ring-2 ring-offset-1 ring-vku-400 shadow-sm`
        } else {
          btn.className = 'rating-option-btn p-2 rounded-xl border-2 transition-all duration-150 text-center flex flex-col items-center justify-center cursor-pointer select-none active:scale-95 border-gray-200 bg-white hover:border-gray-300'
        }
      })

      const indicator = container.querySelector('#rating-status-indicator')
      if (indicator) {
        const opt = RATING_OPTIONS.find(o => o.value === rating)
        indicator.className = 'mt-4 p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700'
        indicator.innerHTML = `<span>✅ Đã chọn đánh giá: <strong>${rating}/5 sao</strong> (${opt?.label})</span>`
      }
    }

    const starComponent = createStarRating(
      document.getElementById('star-rating-container')!,
      {
        value: state.rating ?? undefined,
        onChange: (rating) => {
          state.rating = rating
          updateOptionButtons(rating)
          autoSave()
        }
      }
    )

    // Option buttons click listeners
    container.querySelectorAll<HTMLButtonElement>('.rating-option-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        const val = parseInt(btn.dataset['rating'] ?? '0', 10) as RatingValue
        if (val >= 1 && val <= 5) {
          state.rating = val
          starComponent.setValue(val)
          updateOptionButtons(val)
          autoSave()
        }
      })
    })
  }

  // ── Step 4: Defect Notes ────────────────────────────────────────────────

  function renderStep4(container: HTMLElement) {
    container.innerHTML = `
      <div class="space-y-4">
        <div class="text-center mb-6">
          <div class="text-4xl mb-2">📝</div>
          <h2 class="text-xl font-bold text-gray-900">Ghi chú lỗi</h2>
          <p class="text-sm text-gray-500 mt-1">Mô tả chi tiết vấn đề (nếu có)</p>
        </div>

        <div>
          <label class="form-label">
            Ghi chú
            <span class="text-gray-400 font-normal">(không bắt buộc)</span>
          </label>
          <textarea
            id="notes-input"
            class="form-textarea"
            rows="6"
            placeholder="Mô tả tình trạng lỗi, vị trí hỏng hóc, mức độ ảnh hưởng...&#10;&#10;VD: Máy chiếu bị mờ hình, nguồn điện không ổn định, quạt điều hòa kêu to..."
            maxlength="1000"
          >${state.notes}</textarea>
          <div class="flex justify-end mt-1">
            <span id="char-count" class="text-xs text-gray-400">${state.notes.length}/1000</span>
          </div>
        </div>

        <div class="bg-blue-50 rounded-xl p-4 text-xs text-blue-700">
          <strong>💡 Gợi ý:</strong> Ghi rõ mã thiết bị (nếu có), thời gian phát hiện lỗi, và đề xuất phương án sửa chữa để dễ xử lý hơn.
        </div>
      </div>
    `

    const notesInput = document.getElementById('notes-input') as HTMLTextAreaElement
    const charCount = document.getElementById('char-count')!

    notesInput.addEventListener('input', () => {
      state.notes = notesInput.value
      charCount.textContent = `${state.notes.length}/1000`
      autoSave()
    })
  }

  // ── Step 5: Photo ───────────────────────────────────────────────────────

  function renderStep5(container: HTMLElement) {
    container.innerHTML = `
      <div class="space-y-4">
        <div class="text-center mb-6">
          <div class="text-4xl mb-2">📸</div>
          <h2 class="text-xl font-bold text-gray-900">Ảnh minh chứng</h2>
          <p class="text-sm text-gray-500 mt-1">Chụp ảnh thiết bị cần kiểm tra</p>
        </div>

        <div id="photo-area">
          ${state.photoBase64
            ? `
              <div class="relative">
                <img src="${state.photoBase64}" alt="Ảnh kiểm tra" class="photo-preview" />
                <button id="remove-photo-btn" class="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm shadow-md">✕</button>
              </div>
              <button id="retake-photo-btn" class="btn-secondary w-full mt-3">
                📷 Chụp lại
              </button>
            `
            : `
              <button id="capture-btn" class="w-full border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center gap-3 text-gray-500 hover:border-vku-400 hover:text-vku-600 hover:bg-vku-50/50 transition-all duration-150 active:scale-98">
                <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <div>
                  <div class="font-semibold text-sm">Chụp ảnh thiết bị</div>
                  <div class="text-xs text-gray-400 mt-0.5">Nhấn để mở camera</div>
                </div>
              </button>
              <p class="text-center text-xs text-gray-400 mt-2">Ảnh không bắt buộc, nhưng giúp ghi nhận bằng chứng rõ hơn</p>
            `
          }
        </div>

        <!-- Summary card -->
        <div class="card p-4 mt-4">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tóm tắt phiếu</div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Địa điểm</span>
              <span class="font-medium text-gray-900">${state.building} · T.${state.floor} · P.${state.room}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Loại</span>
              <span class="font-medium text-gray-900">${CATEGORIES.find(c => c.value === state.category)?.label ?? ''}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Đánh giá</span>
              <span class="font-medium">${state.rating ? '⭐'.repeat(state.rating) + ` (${state.rating}/5)` : '—'}</span>
            </div>
            ${state.notes ? `
              <div class="flex justify-between gap-4">
                <span class="text-gray-500 flex-shrink-0">Ghi chú</span>
                <span class="font-medium text-gray-900 text-right line-clamp-2">${state.notes}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `

    // Camera buttons
    const captureBtn = document.getElementById('capture-btn')
    const retakeBtn = document.getElementById('retake-photo-btn')
    const removeBtn = document.getElementById('remove-photo-btn')

    const handleCapture = async () => {
      try {
        showToast('📷 Đang mở camera...', 'info', 1500)
        const result = await capturePhoto()
        if (result) {
          state.photoBase64 = result.base64
          await autoSave()
          renderStep5(container)
          showToast('✅ Ảnh đã được chụp', 'success')
        }
      } catch (err) {
        console.error('Camera error:', err)
        showToast('❌ Không thể mở camera', 'error')
      }
    }

    captureBtn?.addEventListener('click', handleCapture)
    retakeBtn?.addEventListener('click', handleCapture)
    removeBtn?.addEventListener('click', () => {
      state.photoBase64 = null
      autoSave()
      renderStep5(container)
    })
  }

  // ── Auto Save Draft ─────────────────────────────────────────────────────

  async function autoSave() {
    await saveDraft({
      id: state.id,
      building: state.building,
      floor: state.floor,
      room: state.room,
      category: state.category as SurveyCategory,
      rating: state.rating ?? undefined,
      notes: state.notes,
      photoBase64: state.photoBase64
    })
  }

  // ── Validation ──────────────────────────────────────────────────────────

  function validateStep(): boolean {
    switch (state.step) {
      case 1:
        if (!state.building) { showToast('⚠️ Vui lòng chọn tòa nhà', 'warning'); return false }
        if (!state.floor)    { showToast('⚠️ Vui lòng chọn tầng', 'warning'); return false }
        if (!state.room.trim()) { showToast('⚠️ Vui lòng nhập số phòng', 'warning'); return false }
        return true
      case 2:
        if (!state.category) { showToast('⚠️ Vui lòng chọn loại thiết bị', 'warning'); return false }
        return true
      case 3:
        if (!state.rating) {
          showToast('⚠️ Vui lòng đánh giá tình trạng thiết bị', 'warning')
          const card = document.getElementById('rating-card')
          if (card) {
            card.classList.add('ring-2', 'ring-red-500', 'border-red-400')
            setTimeout(() => card.classList.remove('ring-2', 'ring-red-500', 'border-red-400'), 1500)
          }
          return false
        }
        return true
      default:
        return true
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  async function submitSurvey() {
    const btn = document.getElementById('submit-btn') as HTMLButtonElement
    if (btn) {
      btn.textContent = 'Đang lưu...'
      btn.disabled = true
    }

    try {
      const now = new Date().toISOString()
      const survey: Survey = {
        id: state.id,
        status: 'PENDING_SYNC',
        building: state.building,
        floor: state.floor,
        room: state.room,
        category: state.category as SurveyCategory,
        rating: state.rating!,
        notes: state.notes,
        photoBase64: state.photoBase64,
        createdAt: now,
        updatedAt: now,
        syncedAt: null,
        syncAttempts: 0
      }

      await saveSurvey(survey)
      await clearDraft()
      window.dispatchEvent(new CustomEvent('surveys-updated'))

      showToast('✅ Phiếu đã được lưu thành công!', 'success')

      // Auto sync if online
      if (isOnline()) {
        showToast('🔄 Đang đồng bộ...', 'info', 2000)
        setTimeout(async () => {
          await registerBackgroundSync()
          await processSyncQueue()
        }, 500)
      } else {
        showToast('📴 Sẽ đồng bộ khi có mạng', 'info')
        await registerBackgroundSync()
      }

      navigate('/')
    } catch (err) {
      console.error('Submit error:', err)
      showToast('❌ Lỗi khi lưu phiếu', 'error')
      if (btn) {
        btn.textContent = 'Nộp phiếu'
        btn.disabled = false
      }
    }
  }

  // ── Step Events ─────────────────────────────────────────────────────────

  function attachStepEvents() {
    document.getElementById('back-btn')?.addEventListener('click', () => {
      if (state.step === 1) navigate('/')
      else { state.step--; renderStep() }
    })

    document.getElementById('discard-btn')?.addEventListener('click', async () => {
      if (confirm('Bỏ phiếu này? Dữ liệu nháp sẽ bị xóa.')) {
        await clearDraft()
        navigate('/')
      }
    })

    document.getElementById('next-btn')?.addEventListener('click', async () => {
      if (!validateStep()) return
      await autoSave()
      state.step++
      renderStep()
    })

    document.getElementById('prev-btn')?.addEventListener('click', () => {
      state.step--
      renderStep()
    })

    document.getElementById('submit-btn')?.addEventListener('click', submitSurvey)
  }

  // Initial render
  renderStep()
}
