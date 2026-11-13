import { STORE_VERSION, useAppStore } from '../store/useAppStore'
import type { PersistedAppState } from '../store/useAppStore'

export function getPersistedSnapshot(): PersistedAppState {
  const state = useAppStore.getState()
  return {
    completedLessons: state.completedLessons,
    bookmarks: state.bookmarks,
    notes: state.notes,
    theme: state.theme,
    lastVisitedLesson: state.lastVisitedLesson,
  }
}

export function buildExportJson(): string {
  const payload = {
    app: 'kafka-tutorial',
    schemaVersion: STORE_VERSION,
    exportedAt: new Date().toISOString(),
    state: getPersistedSnapshot(),
  }

  return JSON.stringify(payload, null, 2)
}

export function extractImportedState(text: string): unknown {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('فایل انتخاب‌شده یک JSON معتبر نیست.')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('ساختار فایل با داده‌های دوره سازگار نیست.')
  }

  const record = parsed as Record<string, unknown>
  const state = 'state' in record ? record.state : parsed

  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('داده‌های پیشرفت در فایل پیدا نشد.')
  }

  return state
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function backupFileName(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `kafka-tutorial-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}
