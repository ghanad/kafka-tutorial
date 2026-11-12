import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export function useTheme() {
  const theme = useAppStore((state) => state.theme)
  const toggleTheme = useAppStore((state) => state.toggleTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
  }, [theme])

  return { theme, toggleTheme }
}
