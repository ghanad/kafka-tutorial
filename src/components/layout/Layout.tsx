import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useActiveCourse } from '../../hooks/useActiveCourse'
import { useTypography } from '../../hooks/useTypography'
import { Footer } from './Footer'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function Layout() {
  useTypography()
  const location = useLocation()
  const course = useActiveCourse()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    function handlePopState() {
      setSidebarOpen(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col">
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
        className="absolute start-4 top-2 z-[100] -translate-y-24 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary-700 shadow-soft transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary-500 motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900 dark:text-primary-200"
      >
        پرش به محتوای اصلی
      </a>
      <Header onOpenSidebar={() => setSidebarOpen(true)} />

      <div className="mx-auto flex w-full max-w-[1500px] flex-1 items-stretch">
        {course && (
          <Sidebar course={course} mobileOpen={sidebarOpen} onClose={closeSidebar} />
        )}
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 scroll-mt-20 px-3 py-6 focus:outline-none sm:px-6 sm:py-8 lg:px-8"
        >
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  )
}
