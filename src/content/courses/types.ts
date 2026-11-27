export type LessonStatus = 'published' | 'planned'

export interface LessonMeta {
  id: string
  slug: string
  title: string
  description: string
  readingTime: number
  sectionId: string
  courseId: string
  status: LessonStatus
}

/** Lesson metadata before the owning course is attached. */
export type LessonMetaInput = Omit<LessonMeta, 'courseId'>

export interface CourseSection {
  id: string
  title: string
  description: string
  lessons: LessonMeta[]
}

/** Section metadata before the owning course is attached. */
export interface CourseSectionInput {
  id: string
  title: string
  description: string
  lessons: LessonMetaInput[]
}

export interface Course {
  id: string
  slug: string
  title: string
  shortTitle: string
  description: string
  longDescription: string
  level: string
  /** Key resolved to an icon in the UI layer. */
  icon: string
  sections: CourseSection[]
}
