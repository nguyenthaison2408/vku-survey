import { getPendingSurveys, saveSurvey, getSetting, setSetting, type Survey } from './db'
import { showToast } from './components/toast'

// ── Constants ──────────────────────────────────────────────────────────────

export const DEFAULT_API_ENDPOINT = 'https://jsonplaceholder.typicode.com/posts'
export const GOOGLE_SHEET_KEY = 'google_sheet_url'
const MAX_RETRY_ATTEMPTS = 3
const SYNC_TAG = 'sync-surveys'

// ── Settings Helpers ───────────────────────────────────────────────────────

export async function getSyncEndpoint(): Promise<string> {
  const customUrl = await getSetting<string>(GOOGLE_SHEET_KEY, '')
  if (customUrl && customUrl.trim()) {
    return customUrl.trim()
  }
  return DEFAULT_API_ENDPOINT
}

export async function setGoogleSheetUrl(url: string): Promise<void> {
  await setSetting(GOOGLE_SHEET_KEY, url.trim())
}

export async function isGoogleSheetConfigured(): Promise<boolean> {
  const url = await getSetting<string>(GOOGLE_SHEET_KEY, '')
  return !!url && url.includes('script.google.com')
}

// ── Sync State ─────────────────────────────────────────────────────────────

let isSyncing = false

// ── Test Connection Helper ─────────────────────────────────────────────────

export async function testGoogleSheetConnection(url: string): Promise<{ success: boolean; message: string }> {
  try {
    const trimmed = url.trim()
    if (!trimmed || !trimmed.startsWith('https://script.google.com/')) {
      return { success: false, message: 'URL không hợp lệ. URL phải bắt đầu bằng https://script.google.com/' }
    }

    const testPayload = {
      id: 'TEST-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
      building: 'Khu Kiểm Tra Thử',
      floor: 'Tầng 1',
      room: 'Test Room',
      category: 'Hardware',
      rating: 5,
      notes: 'Thử nghiệm kết nối từ VKU Field Survey lúc ' + new Date().toLocaleTimeString('vi-VN'),
      hasPhoto: false,
      photoBase64: null,
      createdAt: new Date().toISOString()
    }

    // Google Apps Script redirect handling with no-cors
    await fetch(trimmed, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(15_000)
    })

    return { success: true, message: '✅ Đã gửi dòng dữ liệu mẫu thành công! Bạn hãy mở Google Sheet để kiểm tra dòng mới.' }
  } catch (err) {
    console.error('Test sync error:', err)
    return { success: false, message: '❌ Lỗi khi gửi dữ liệu: ' + (err instanceof Error ? err.message : String(err)) }
  }
}

// ── Dispatch Single Survey ─────────────────────────────────────────────────

async function dispatchSurvey(survey: Survey): Promise<boolean> {
  try {
    const endpoint = await getSyncEndpoint()
    const isGoogleScript = endpoint.includes('script.google.com')

    const payload = {
      id: survey.id,
      building: survey.building,
      floor: survey.floor,
      room: survey.room,
      category: survey.category,
      rating: survey.rating,
      notes: survey.notes,
      hasPhoto: !!survey.photoBase64,
      photoBase64: survey.photoBase64,
      createdAt: survey.createdAt,
      submittedAt: new Date().toISOString()
    }

    if (isGoogleScript) {
      // Google Apps Script CORS & Redirect Handling:
      // Sending with 'text/plain' skips CORS preflight OPTIONS request.
      // Mode 'no-cors' allows browser to follow Google's 302 redirect cleanly.
      await fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000)
      })
    } else {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000)
      })

      if (!response.ok) {
        throw new Error(`Server responded ${response.status}`)
      }
    }

    // Mark as synced
    await saveSurvey({
      ...survey,
      status: 'SYNCED',
      syncedAt: new Date().toISOString(),
      syncAttempts: survey.syncAttempts + 1
    })

    console.log(`[sync] Survey ${survey.id} synced successfully to ${isGoogleScript ? 'Google Sheets' : 'Server'}`)
    return true
  } catch (err) {
    console.error(`[sync] Failed to sync survey ${survey.id}:`, err)

    // Increment attempt counter
    await saveSurvey({
      ...survey,
      syncAttempts: survey.syncAttempts + 1
    })

    return false
  }
}

// ── Process Sync Queue ─────────────────────────────────────────────────────

export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) {
    console.log('[sync] Already syncing, skipping...')
    return { synced: 0, failed: 0 }
  }

  isSyncing = true
  let synced = 0
  let failed = 0

  try {
    const pending = await getPendingSurveys()

    if (pending.length === 0) {
      console.log('[sync] No pending surveys')
      return { synced: 0, failed: 0 }
    }

    console.log(`[sync] Processing ${pending.length} pending survey(s)...`)

    for (const survey of pending) {
      // Skip if too many attempts
      if (survey.syncAttempts >= MAX_RETRY_ATTEMPTS) {
        console.warn(`[sync] Skipping survey ${survey.id} — max retries reached`)
        failed++
        continue
      }

      const success = await dispatchSurvey(survey)
      if (success) {
        synced++
      } else {
        failed++
      }
    }

    if (synced > 0) {
      showToast(`✅ Đồng bộ thành công ${synced} biểu mẫu`, 'success')
    }
    if (failed > 0) {
      showToast(`⚠️ Không thể đồng bộ ${failed} biểu mẫu`, 'warning')
    }

    // Notify the rest of the app
    window.dispatchEvent(new CustomEvent('surveys-updated'))
  } catch (err) {
    console.error('[sync] Unexpected error during sync:', err)
  } finally {
    isSyncing = false
  }

  return { synced, failed }
}

// ── Register Background Sync ───────────────────────────────────────────────

export async function registerBackgroundSync(): Promise<void> {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready
      // @ts-ignore — SyncManager types not always available
      await reg.sync.register(SYNC_TAG)
      console.log('[sync] Background sync registered:', SYNC_TAG)
    } catch (err) {
      console.warn('[sync] Background sync registration failed:', err)
    }
  }
}

// ── Listen for Online Event ────────────────────────────────────────────────

export function initSyncListeners(): void {
  // Foreground online recovery
  window.addEventListener('online', async () => {
    console.log('[sync] Network restored — triggering sync...')
    await registerBackgroundSync()
    await processSyncQueue()
  })

  // Listen for SW message (triggered by Background Sync event)
  navigator.serviceWorker?.addEventListener('message', async (event) => {
    if (event.data?.type === 'BACKGROUND_SYNC_TRIGGERED') {
      console.log('[sync] Background sync triggered by SW')
      await processSyncQueue()
    }
  })

  console.log('[sync] Sync listeners initialized')
}
