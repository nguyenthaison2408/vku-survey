import { getPendingSurveys, saveSurvey, type Survey } from './db'
import { showToast } from './components/toast'

// ── Constants ──────────────────────────────────────────────────────────────

// Mock API endpoint — replace with real backend URL
const API_ENDPOINT = 'https://jsonplaceholder.typicode.com/posts'
const MAX_RETRY_ATTEMPTS = 3
const SYNC_TAG = 'sync-surveys'

// ── Sync State ─────────────────────────────────────────────────────────────

let isSyncing = false

// ── Dispatch Single Survey ─────────────────────────────────────────────────

async function dispatchSurvey(survey: Survey): Promise<boolean> {
  try {
    const payload = {
      id: survey.id,
      building: survey.building,
      floor: survey.floor,
      room: survey.room,
      category: survey.category,
      rating: survey.rating,
      notes: survey.notes,
      hasPhoto: !!survey.photoBase64,
      createdAt: survey.createdAt,
      // Note: In production, upload photo separately (multipart) to save bandwidth
    }

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000)
    })

    if (!response.ok) {
      throw new Error(`Server responded ${response.status}`)
    }

    // Mark as synced
    await saveSurvey({
      ...survey,
      status: 'SYNCED',
      syncedAt: new Date().toISOString(),
      syncAttempts: survey.syncAttempts + 1
    })

    console.log(`[sync] Survey ${survey.id} synced successfully`)
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
