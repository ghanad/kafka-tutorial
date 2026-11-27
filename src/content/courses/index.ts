import { kafkaCourse } from './kafka'
import { kubernetesCourse } from './kubernetes'
import { ciliumCourse } from './cilium'
import type { Course, CourseSection, LessonMeta } from './types'

export type { Course, CourseSection, LessonMeta, LessonStatus } from './types'

export const courses: Course[] = [kafkaCourse, kubernetesCourse, ciliumCourse]

export const allSections: CourseSection[] = courses.flatMap((course) => course.sections)

export const allLessons: LessonMeta[] = allSections.flatMap((section) => section.lessons)

export const publishedLessons: LessonMeta[] = allLessons.filter(
  (lesson) => lesson.status === 'published',
)

export function getCourseBySlug(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug)
}

export function getCourseById(id: string): Course | undefined {
  return courses.find((course) => course.id === id)
}

export function getCourseLessons(course: Course): LessonMeta[] {
  return course.sections.flatMap((section) => section.lessons)
}

export function getCoursePublishedLessons(course: Course): LessonMeta[] {
  return getCourseLessons(course).filter((lesson) => lesson.status === 'published')
}

export function getCourseSections(course: Course): CourseSection[] {
  return course.sections
}

export function findLessonBySlug(slug: string): LessonMeta | undefined {
  return allLessons.find((lesson) => lesson.slug === slug)
}

export function findLessonById(id: string): LessonMeta | undefined {
  return allLessons.find((lesson) => lesson.id === id)
}

export function findLessonInCourse(
  course: Course,
  slug: string,
): LessonMeta | undefined {
  return getCourseLessons(course).find((lesson) => lesson.slug === slug)
}

export function findSectionById(id: string): CourseSection | undefined {
  return allSections.find((section) => section.id === id)
}

export function findSectionForLesson(lesson: LessonMeta): CourseSection | undefined {
  return findSectionById(lesson.sectionId)
}

export function findCourseForLesson(lesson: LessonMeta): Course | undefined {
  return getCourseById(lesson.courseId)
}

export function getCoursePath(course: Course): string {
  return `/courses/${course.slug}`
}

export function getCourseProgressPath(course: Course): string {
  return `/courses/${course.slug}/progress`
}

export function getLessonPath(course: Course, lesson: LessonMeta): string {
  return `/courses/${course.slug}/lessons/${lesson.slug}`
}

export function areAllLessonsCompleted(
  completedLessons: string[],
  lessons: LessonMeta[] = publishedLessons,
): boolean {
  if (lessons.length === 0) return false
  const completed = new Set(completedLessons)
  return lessons.every((lesson) => completed.has(lesson.id))
}
