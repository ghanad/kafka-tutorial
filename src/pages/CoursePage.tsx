import { useParams } from 'react-router-dom'
import { getCourseBySlug } from '../content/courses'
import { CourseLandingPage } from './CourseLandingPage'
import { NotFoundPage } from './NotFoundPage'

export function CoursePage() {
  const { courseSlug } = useParams<{ courseSlug: string }>()
  const course = courseSlug ? getCourseBySlug(decodeURIComponent(courseSlug)) : undefined

  if (!course) return <NotFoundPage />

  return <CourseLandingPage course={course} />
}
