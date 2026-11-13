import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTypography } from '../../hooks/useTypography'
import { Footer } from './Footer'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function Layout() {
  useTypography()
  const location = useLocation()
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
    <div className="flex min-h-screen flex-col">
      <Header onOpenSidebar={() => setSidebarOpen(true)} />

      <div className="mx-auto flex w-full max-w-[1500px] flex-1 items-stretch">
        <Sidebar mobileOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="min-w-0 flex-1 px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  )
}
