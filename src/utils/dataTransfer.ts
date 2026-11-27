import { STORE_VERSION, useAppStore } from '../store/useAppStore'
import type { PersistedAppState } from '../store/useAppStore'

const APP_ID = 'kafka-tutorial'

const PROGRESS_STATE_KEYS = [
  'completedLessons',
  'bookmarks',
  'notes',
  'inlineNotes',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function getPersistedSnapshot(): PersistedAppState {
  const state = useAppStore.getState()
  return {
    completedLessons: state.completedLessons,
    bookmarks: state.bookmarks,
    notes: state.notes,
    inlineNotes: state.inlineNotes,
    theme: state.theme,
    lastVisitedLesson: state.lastVisitedLesson,
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    lineHeight: state.lineHeight,
    collapsedSections: state.collapsedSections,
    sidebarCollapsed: state.sidebarCollapsed,
    tocCollapsed: state.tocCollapsed,
  }
}

export function buildExportJson(): string {
  const payload = {
    app: APP_ID,
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

  if (!isRecord(parsed)) {
    throw new Error('ساختار فایل با داده‌های پلتفرم سازگار نیست.')
  }

  const hasEnvelope = 'state' in parsed
  const state = hasEnvelope ? parsed.state : parsed

  if (hasEnvelope) {
    if ('app' in parsed && parsed.app !== APP_ID) {
      throw new Error('این فایل پشتیبان مربوط به این پلتفرم نیست.')
    }

    if ('schemaVersion' in parsed) {
      const version = parsed.schemaVersion
      if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
        throw new Error('نسخه اسکیمای فایل پشتیبان معتبر نیست.')
      }
      if (version > STORE_VERSION) {
        throw new Error('این فایل پشتیبان با نسخه جدیدتری از برنامه ساخته شده است.')
      }
    }
  }

  if (!isRecord(state)) {
    throw new Error('داده‌های پیشرفت در فایل پیدا نشد.')
  }

  if (!PROGRESS_STATE_KEYS.some((key) => key in state)) {
    throw new Error('در فایل انتخاب‌شده هیچ داده پیشرفتی پیدا نشد.')
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
  return `academy-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}
