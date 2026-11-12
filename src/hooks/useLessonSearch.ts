import { useMemo } from 'react'
import { allLessons } from '../content/curriculum'
import type { LessonMeta } from '../content/curriculum'

export function filterLessons(query: string, limit = 6): LessonMeta[] {
  const normalized = query.trim().toLowerCase()
  if (normalized === '') return []

  return allLessons
    .filter(
      (lesson) =>
        lesson.title.toLowerCase().includes(normalized) ||
        lesson.description.toLowerCase().includes(normalized),
    )
    .slice(0, limit)
}

export function useLessonSearch(query: string, limit = 6): LessonMeta[] {
  return useMemo(() => filterLessons(query, limit), [query, limit])
}
