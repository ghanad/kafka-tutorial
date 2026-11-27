import {
  allLessons,
  getCourseLessons,
  getCoursePublishedLessons,
  publishedLessons,
} from '../content/courses'
import type { Course, CourseSection, LessonMeta } from '../content/courses'

export function countCompletedLessons(
  lessons: LessonMeta[],
  completedLessons: string[],
): number {
  const completed = new Set(completedLessons)
  return lessons.reduce(
    (count, lesson) => count + (completed.has(lesson.id) ? 1 : 0),
    0,
  )
}

export function getCompletedLessonCount(
  completedLessons: string[],
  lessons: LessonMeta[] = publishedLessons,
): number {
  return countCompletedLessons(lessons, completedLessons)
}

export function getProgressPercent(
  completedLessons: string[],
  lessons: LessonMeta[] = publishedLessons,
): number {
  if (lessons.length === 0) return 0
  return Math.round((countCompletedLessons(lessons, completedLessons) / lessons.length) * 100)
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

export interface CourseProgress extends SectionProgress {
  percent: number
}

export function getCourseProgress(
  course: Course,
  completedLessons: string[],
): CourseProgress {
  const lessons = getCourseLessons(course)
  const published = getCoursePublishedLessons(course)
  const completed = countCompletedLessons(published, completedLessons)

  return {
    completed,
    published: published.length,
    total: lessons.length,
    percent: published.length > 0 ? Math.round((completed / published.length) * 100) : 0,
  }
}

export function getTotalPublishedLessonCount(): number {
  return publishedLessons.length
}

export function getTotalLessonCount(): number {
  return allLessons.length
}
