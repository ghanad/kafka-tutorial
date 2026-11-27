import { useLocation } from 'react-router-dom'
import { getCourseBySlug } from '../content/courses'
import type { Course } from '../content/courses'

export function getCourseFromPath(pathname: string): Course | undefined {
  const match = pathname.match(/^\/courses\/([^/]+)/)
  if (!match) return undefined
  return getCourseBySlug(decodeURIComponent(match[1]))
}

export function useActiveCourse(): Course | undefined {
  const { pathname } = useLocation()
  return getCourseFromPath(pathname)
}
