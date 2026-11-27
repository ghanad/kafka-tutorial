import { useMemo } from 'react'
import { allLessons, getCourseById } from '../content/courses'
import type { Course, LessonMeta } from '../content/courses'
import { normalizeSearchText } from '../utils/searchText'

export interface LessonSearchResult {
  lesson: LessonMeta
  course: Course
}

const searchIndex: (LessonSearchResult & { text: string })[] = []

for (const lesson of allLessons) {
  const course = getCourseById(lesson.courseId)
  if (!course) continue
  searchIndex.push({
    lesson,
    course,
    text: normalizeSearchText(`${lesson.title} ${lesson.description}`),
  })
}

export function filterLessons(query: string, limit = 6): LessonSearchResult[] {
  const normalized = normalizeSearchText(query)
  if (normalized === '') return []
  const tokens = normalized.split(' ').filter(Boolean)

  return searchIndex
    .filter((entry) => tokens.every((token) => entry.text.includes(token)))
    .slice(0, limit)
    .map(({ lesson, course }) => ({ lesson, course }))
}

export function useLessonSearch(query: string, limit = 6): LessonSearchResult[] {
  return useMemo(() => filterLessons(query, limit), [query, limit])
}
