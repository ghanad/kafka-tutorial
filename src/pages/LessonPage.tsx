import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { LessonLayout } from '../components/layout/LessonLayout'
import {
  findLessonBySlug,
  findSectionForLesson,
  publishedLessons,
} from '../content/curriculum'
import { getLessonContent } from '../content/lessons'
import { useAppStore } from '../store/useAppStore'
import { NotFoundPage } from './NotFoundPage'

export function LessonPage() {
  const { slug } = useParams<{ slug: string }>()
  const lesson = slug ? findLessonBySlug(slug) : undefined
  const setLastVisitedLesson = useAppStore((state) => state.setLastVisitedLesson)

  useEffect(() => {
    if (lesson && lesson.status === 'published') {
      setLastVisitedLesson(lesson.id)
    }
  }, [lesson, setLastVisitedLesson])

  useEffect(() => {
    if (!lesson) return
    const previousTitle = document.title
    document.title = `${lesson.title} | آموزش Kafka`
    return () => {
      document.title = previousTitle
    }
  }, [lesson])

  if (!lesson) {
    return <NotFoundPage />
  }

  const section = findSectionForLesson(lesson)
  const content = getLessonContent(lesson.slug)
  const publishedIndex = publishedLessons.findIndex((item) => item.id === lesson.id)
  const previousLesson =
    publishedIndex > 0 ? publishedLessons[publishedIndex - 1] : undefined
  const nextLesson =
    publishedIndex >= 0 && publishedIndex < publishedLessons.length - 1
      ? publishedLessons[publishedIndex + 1]
      : undefined

  return (
    <LessonLayout
      lesson={lesson}
      section={section}
      content={content}
      previousLesson={previousLesson}
      nextLesson={nextLesson}
    />
  )
}
