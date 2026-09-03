// ── Star Rating Component ──────────────────────────────────────────────────

export type RatingValue = 1 | 2 | 3 | 4 | 5

export const RATING_LABELS: Record<RatingValue, string> = {
  1: 'Rất tệ',
  2: 'Tệ',
  3: 'Bình thường',
  4: 'Tốt',
  5: 'Xuất sắc'
}

export const RATING_COLORS: Record<RatingValue, string> = {
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-amber-500',
  4: 'text-lime-500',
  5: 'text-emerald-500'
}

interface StarRatingOptions {
  value?: RatingValue
  onChange: (rating: RatingValue) => void
}

export function createStarRating(container: HTMLElement, options: StarRatingOptions): {
  getValue: () => RatingValue | null
  setValue: (v: RatingValue | null) => void
} {
  let currentRating: RatingValue | null = options.value ?? null

  // Render static DOM skeleton once so elements aren't destroyed on hover/touch
  container.innerHTML = `
    <div class="flex flex-col items-center gap-3">
      <div class="flex items-center gap-2" id="stars-row" role="radiogroup" aria-label="Đánh giá tình trạng">
        ${[1, 2, 3, 4, 5].map(i => `
          <button
            type="button"
            class="star-btn text-4xl p-1 transition-all duration-150 cursor-pointer select-none focus:outline-none active:scale-90"
            data-value="${i}"
            aria-label="${i} sao"
            role="radio"
            aria-checked="false"
          >☆</button>
        `).join('')}
      </div>
      <div id="stars-status-label" class="text-sm font-semibold min-h-[1.5rem] transition-all duration-150 text-center text-gray-400">
        Chọn mức độ tình trạng (1–5 sao)
      </div>
    </div>
  `

  const starsRow = container.querySelector('#stars-row') as HTMLElement
  const labelEl = container.querySelector('#stars-status-label') as HTMLElement
  const buttons = Array.from(starsRow.querySelectorAll<HTMLButtonElement>('.star-btn'))

  function updateVisuals(rating: RatingValue | null) {
    const display = rating ?? currentRating

    buttons.forEach((btn, idx) => {
      const starIndex = (idx + 1) as RatingValue
      const isFilled = display !== null && starIndex <= display

      btn.textContent = isFilled ? '★' : '☆'
      btn.setAttribute('aria-checked', (currentRating === starIndex).toString())

      // Clean old color classes
      btn.classList.remove('text-red-500', 'text-orange-500', 'text-amber-500', 'text-lime-500', 'text-emerald-500', 'text-gray-300', 'scale-110')

      if (isFilled && display !== null) {
        btn.classList.add(RATING_COLORS[display], 'scale-110')
      } else {
        btn.classList.add('text-gray-300')
      }
    })

    // Update text label
    if (display !== null) {
      labelEl.textContent = `${display}/5 — ${RATING_LABELS[display]}`
      labelEl.className = `text-sm font-semibold min-h-[1.5rem] transition-all duration-150 text-center ${RATING_COLORS[display]}`
    } else {
      labelEl.textContent = 'Chọn mức độ tình trạng (1–5 sao)'
      labelEl.className = 'text-sm font-semibold min-h-[1.5rem] transition-all duration-150 text-center text-gray-400'
    }
  }

  // Initial render of rating if provided
  updateVisuals(currentRating)

  // Attach event listeners once
  buttons.forEach(btn => {
    const val = parseInt(btn.dataset['value'] ?? '1', 10) as RatingValue

    btn.addEventListener('click', (e) => {
      e.preventDefault()
      currentRating = val
      updateVisuals(currentRating)
      options.onChange(val)
    })

    btn.addEventListener('mouseenter', () => {
      updateVisuals(val)
    })
  })

  starsRow.addEventListener('mouseleave', () => {
    updateVisuals(currentRating)
  })

  return {
    getValue: () => currentRating,
    setValue: (v: RatingValue | null) => {
      currentRating = v
      updateVisuals(currentRating)
    }
  }
}
