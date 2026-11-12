import { allLessons, publishedLessons } from '../content/curriculum'
import type { CourseSection } from '../content/curriculum'

export function getCompletedLessonCount(completedLessons: string[]): number {
  const completed = new Set(completedLessons)
  return publishedLessons.reduce(
    (count, lesson) => count + (completed.has(lesson.id) ? 1 : 0),
    0,
  )
}

export function getProgressPercent(completedLessons: string[]): number {
  if (publishedLessons.length === 0) return 0
  return Math.round((getCompletedLessonCount(completedLessons) / publishedLessons.length) * 100)
}

export interface SectionProgress {
  completed: number
  published: number
  total: number
}

export function getSectionProgress(
  section: CourseSection,
  completedLessons: string[],
): SectionProgress {
  const completed = new Set(completedLessons)
  const published = section.lessons.filter((lesson) => lesson.status === 'published')

  return {
    completed: published.filter((lesson) => completed.has(lesson.id)).length,
    published: published.length,
    total: section.lessons.length,
  }
}

export function getTotalPublishedLessonCount(): number {
  return publishedLessons.length
}

export function getTotalLessonCount(): number {
  return allLessons.length
}
