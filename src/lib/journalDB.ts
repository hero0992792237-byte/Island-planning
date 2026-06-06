const DB_NAME = 'island-journal'
const DB_VERSION = 1
const PHOTO_STORE = 'photos'
const META_KEY = 'island-journal-meta'
const JOURNAL_KEY = 'island-journal-entries'

import type { JournalEntry, Plan } from '../types'

export interface AlbumMeta {
  id: string
  name: string
  photoIds: string[]
  createdAt: number
}


function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: 'id' })
      }
    }
  })
}

// Album metadata (localStorage)
export function loadAlbumMeta(): AlbumMeta[] {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return []
}

export function saveAlbumMeta(albums: AlbumMeta[]) {
  localStorage.setItem(META_KEY, JSON.stringify(albums))
}

// Photos (IndexedDB)
export async function savePhoto(id: string, albumId: string, data: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(PHOTO_STORE, 'readwrite')
  const store = tx.objectStore(PHOTO_STORE)
  await new Promise<void>((resolve, reject) => {
    const req = store.put({ id, albumId, data })
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getPhoto(id: string): Promise<string | null> {
  const db = await openDB()
  const tx = db.transaction(PHOTO_STORE, 'readonly')
  const store = tx.objectStore(PHOTO_STORE)
  return new Promise((resolve, reject) => {
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result?.data ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(PHOTO_STORE, 'readwrite')
  const store = tx.objectStore(PHOTO_STORE)
  await new Promise<void>((resolve, reject) => {
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function deletePhotosByAlbum(albumId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(PHOTO_STORE, 'readwrite')
  const store = tx.objectStore(PHOTO_STORE)
  await new Promise<void>((resolve, reject) => {
    const req = store.openCursor()
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result
      if (cursor) {
        if (cursor.value.albumId === albumId) {
          cursor.delete()
        }
        cursor.continue()
      } else {
        resolve()
      }
    }
    req.onerror = () => reject(req.error)
  })
}

// ===================== 行程记录 CRUD (localStorage) =====================

export function loadJournalEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return []
}

export function saveJournalEntries(entries: JournalEntry[]) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries))
}

export function addJournalEntry(entry: JournalEntry) {
  const entries = loadJournalEntries()
  saveJournalEntries([entry, ...entries])
}

export function updateJournalEntry(entry: JournalEntry) {
  const entries = loadJournalEntries()
  saveJournalEntries(entries.map((e) => (e.id === entry.id ? entry : e)))
}

export function deleteJournalEntry(id: string) {
  const entries = loadJournalEntries()
  saveJournalEntries(entries.filter((e) => e.id !== id))
}

// ===================== AI Plan → JournalEntry 同步 =====================

function formatTime(hours: number, minutes: number = 0): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function calculateEndTime(start: string, durationHours: number): string {
  const [h, m] = start.split(':').map(Number)
  const totalMinutes = h * 60 + m + durationHours * 60
  return formatTime(Math.floor(totalMinutes / 60) % 24, totalMinutes % 60)
}

function dateStrFromTimestamp(ts: number = Date.now()): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 将 AI Plan 转换为 JournalEntry 数组并保存
 * 每个 PlanNode 转换为一个 entry
 */
export function syncPlanToJournal(plan: Plan): JournalEntry[] {
  const baseDate = dateStrFromTimestamp()
  const entries: JournalEntry[] = []

  let currentTime = plan.startTime

  for (const node of plan.nodes) {
    const nodeEnd = calculateEndTime(currentTime, node.durationHours)
    const descriptionSegments = [
      node.type,
      node.category || node.cuisine || '',
      ...node.tags,
    ]
      .filter(Boolean)
      .reduce<string[]>((result, value) => {
        if (!result.includes(value)) {
          result.push(value)
        }
        return result
      }, [])

    entries.push({
      id: `journal_${Date.now()}_${node.id}`,
      title: node.name,
      category: 'travel',
      startTime: `${baseDate}T${currentTime}:00`,
      endTime: `${baseDate}T${nodeEnd}:00`,
      location: {
        name: node.name,
        lat: node.lat,
        lng: node.lng,
        address: node.location,
      },
      description: descriptionSegments.join(' · '),
      cost: node.pricePerPerson * plan.people,
      photoIds: [],
      source: 'ai',
      status: 'planned',
      createdAt: Date.now() + entries.length,
    })
    currentTime = nodeEnd
  }

  // 保存到 localStorage
  const existing = loadJournalEntries()
  saveJournalEntries([...entries, ...existing])

  return entries
}

// Image compression
export function compressImage(
  base64: string,
  maxWidth: number = 1280,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let w = img.width
      let h = img.height
      if (w > maxWidth) {
        h = Math.round((maxWidth / w) * h)
        w = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('canvas error'))
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = base64
  })
}
