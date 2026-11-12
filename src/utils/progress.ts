import { allLessons } from '../content/curriculum'
import type { CourseSection } from '../content/curriculum'

export function getCompletedLessonCount(completedLessons: string[]): number {
  const completed = new Set(completedLessons)
  return allLessons.reduce((count, lesson) => count + (completed.has(lesson.id) ? 1 : 0), 0)
}

export function getProgressPercent(completedLessons: string[]): number {
  if (allLessons.length === 0) return 0
  return Math.round((getCompletedLessonCount(completedLessons) / allLessons.length) * 100)
}

export function getSectionProgress(
  section: CourseSection,
  completedLessons: string[],
): { completed: number; total: number } {
  const completed = new Set(completedLessons)
  return {
    completed: section.lessons.filter((lesson) => completed.has(lesson.id)).length,
    total: section.lessons.length,
  }
}
