import { useMemo } from 'react'
import { allLessons } from '../content/curriculum'
import type { LessonMeta } from '../content/curriculum'
import { normalizeSearchText } from '../utils/searchText'

const searchIndex = allLessons.map((lesson) => ({
  lesson,
  text: normalizeSearchText(`${lesson.title} ${lesson.description}`),
}))

export function filterLessons(query: string, limit = 6): LessonMeta[] {
  const normalized = normalizeSearchText(query)
  if (normalized === '') return []
  const tokens = normalized.split(' ').filter(Boolean)

  return searchIndex
    .filter((entry) => tokens.every((token) => entry.text.includes(token)))
    .slice(0, limit)
    .map((entry) => entry.lesson)
}

export function useLessonSearch(query: string, limit = 6): LessonMeta[] {
  return useMemo(() => filterLessons(query, limit), [query, limit])
}
