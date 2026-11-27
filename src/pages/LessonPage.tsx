import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { LessonLayout } from '../components/layout/LessonLayout'
import {
  findLessonInCourse,
  getCourseBySlug,
  getCoursePublishedLessons,
} from '../content/courses'
import { getLessonContent } from '../content/lessons'
import { siteConfig } from '../content/site'
import { useAppStore } from '../store/useAppStore'
import { NotFoundPage } from './NotFoundPage'

export function LessonPage() {
  const { courseSlug, slug } = useParams<{ courseSlug: string; slug: string }>()
  const course = courseSlug ? getCourseBySlug(decodeURIComponent(courseSlug)) : undefined
  const lesson =
    course && slug ? findLessonInCourse(course, decodeURIComponent(slug)) : undefined
  const setLastVisitedLesson = useAppStore((state) => state.setLastVisitedLesson)

  useEffect(() => {
    if (lesson && lesson.status === 'published') {
      setLastVisitedLesson(lesson.id)
    }
  }, [lesson, setLastVisitedLesson])

  useEffect(() => {
    if (!lesson) return
    const previousTitle = document.title
    document.title = course
      ? `${lesson.title} | ${course.shortTitle} | ${siteConfig.name}`
      : `${lesson.title} | ${siteConfig.name}`
    return () => {
      document.title = previousTitle
    }
  }, [course, lesson])

  if (!course || !lesson) {
    return <NotFoundPage />
  }

  const section = course.sections.find((item) => item.id === lesson.sectionId)
  const content = getLessonContent(lesson.slug)
  const publishedLessons = getCoursePublishedLessons(course)
  const publishedIndex = publishedLessons.findIndex((item) => item.id === lesson.id)
  const previousLesson =
    publishedIndex > 0 ? publishedLessons[publishedIndex - 1] : undefined
  const nextLesson =
    publishedIndex >= 0 && publishedIndex < publishedLessons.length - 1
      ? publishedLessons[publishedIndex + 1]
      : undefined

  return (
    <LessonLayout
      course={course}
      lesson={lesson}
      section={section}
      content={content}
      previousLesson={previousLesson}
      nextLesson={nextLesson}
    />
  )
}
