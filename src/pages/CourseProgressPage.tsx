import { useParams } from 'react-router-dom'
import { getCourseBySlug } from '../content/courses'
import { NotFoundPage } from './NotFoundPage'
import { ProgressPage } from './ProgressPage'

export function CourseProgressPage() {
  const { courseSlug } = useParams<{ courseSlug: string }>()
  const course = courseSlug ? getCourseBySlug(decodeURIComponent(courseSlug)) : undefined

  if (!course) return <NotFoundPage />

  return <ProgressPage course={course} />
}
