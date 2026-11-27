import { Navigate, useParams } from 'react-router-dom'
import { findCourseForLesson, findLessonBySlug, getLessonPath } from '../content/courses'
import { NotFoundPage } from './NotFoundPage'

/**
 * Keeps old `/lessons/:slug` links working after the platform moved to
 * course-scoped URLs.
 */
export function LegacyLessonRedirect() {
  const { slug } = useParams<{ slug: string }>()
  const lesson = slug ? findLessonBySlug(decodeURIComponent(slug)) : undefined
  const course = lesson ? findCourseForLesson(lesson) : undefined

  if (!lesson || !course) return <NotFoundPage />

  return <Navigate to={getLessonPath(course, lesson)} replace />
}
