import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { CoursePage } from './pages/CoursePage'
import { CourseProgressPage } from './pages/CourseProgressPage'
import { CoursesPage } from './pages/CoursesPage'
import { LegacyLessonRedirect } from './pages/LegacyLessonRedirect'
import { LessonPage } from './pages/LessonPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProgressPage } from './pages/ProgressPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<CoursesPage />} />
          <Route path="courses/:courseSlug" element={<CoursePage />} />
          <Route path="courses/:courseSlug/lessons/:slug" element={<LessonPage />} />
          <Route path="courses/:courseSlug/progress" element={<CourseProgressPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="lessons/:slug" element={<LegacyLessonRedirect />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
