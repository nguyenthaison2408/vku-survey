import { openDB, type IDBPDatabase } from 'idb'

// ── Types ──────────────────────────────────────────────────────────────────

export type SurveyStatus = 'DRAFT' | 'PENDING_SYNC' | 'SYNCED'
export type SurveyCategory = 'Hardware' | 'Projector' | 'AC' | 'Electrical' | 'Furniture'

export interface Survey {
  id: string
  status: SurveyStatus
  building: string
  floor: string
  room: string
  category: SurveyCategory
  rating: 1 | 2 | 3 | 4 | 5
  notes: string
  photoBase64: string | null
  createdAt: string
  updatedAt: string
  syncedAt: string | null
  syncAttempts: number
}

export type SurveyDraft = Partial<Omit<Survey, 'id' | 'status'>> & { id: string }

// ── Database Setup ─────────────────────────────────────────────────────────

const DB_NAME = 'vku-survey-db'
const DB_VERSION = 1

let _db: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db

  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Surveys store
      if (!db.objectStoreNames.contains('surveys')) {
        const store = db.createObjectStore('surveys', { keyPath: 'id' })
        store.createIndex('status', 'status')
        store.createIndex('createdAt', 'createdAt')
      }
      // Drafts store (form in progress)
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'id' })
      }
      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }
  })

  return _db
}

// ── Survey Operations ──────────────────────────────────────────────────────

export async function saveSurvey(survey: Survey): Promise<void> {
  const db = await getDB()
  await db.put('surveys', survey)
}

export async function getSurvey(id: string): Promise<Survey | undefined> {
  const db = await getDB()
  return db.get('surveys', id)
}

export async function getAllSurveys(): Promise<Survey[]> {
  const db = await getDB()
  const all = await db.getAll('surveys')
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getPendingSurveys(): Promise<Survey[]> {
  const db = await getDB()
  const index = db.transaction('surveys').store.index('status')
  const surveys = await index.getAll('PENDING_SYNC')
  return surveys.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export async function deleteSurvey(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('surveys', id)
}

export async function getSurveyCount(): Promise<{ total: number; pending: number; synced: number; draft: number }> {
  const all = await getAllSurveys()
  return {
    total: all.length,
    pending: all.filter(s => s.status === 'PENDING_SYNC').length,
    synced: all.filter(s => s.status === 'SYNCED').length,
    draft: all.filter(s => s.status === 'DRAFT').length
  }
}

// ── Draft Operations ───────────────────────────────────────────────────────

const CURRENT_DRAFT_KEY = 'current-draft'

export async function saveDraft(draft: SurveyDraft): Promise<void> {
  const db = await getDB()
  await db.put('drafts', { ...draft, id: CURRENT_DRAFT_KEY })
}

export async function loadDraft(): Promise<SurveyDraft | null> {
  const db = await getDB()
  const draft = await db.get('drafts', CURRENT_DRAFT_KEY)
  return draft ?? null
}

export async function clearDraft(): Promise<void> {
  const db = await getDB()
  await db.delete('drafts', CURRENT_DRAFT_KEY)
}

// ── Settings Operations ────────────────────────────────────────────────────

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const db = await getDB()
  const rec = await db.get('settings', key)
  return rec ? (rec.value as T) : defaultValue
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put('settings', { key, value })
}
