import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { LandingPage } from './pages/LandingPage'
import { LessonPage } from './pages/LessonPage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="lessons/:slug" element={<LessonPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
