import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export function useTypography() {
  const fontSize = useAppStore((state) => state.fontSize)
  const fontFamily = useAppStore((state) => state.fontFamily)
  const lineHeight = useAppStore((state) => state.lineHeight)
  const setFontSize = useAppStore((state) => state.setFontSize)
  const setFontFamily = useAppStore((state) => state.setFontFamily)
  const setLineHeight = useAppStore((state) => state.setLineHeight)
  const stepFontSize = useAppStore((state) => state.stepFontSize)
  const resetFontSettings = useAppStore((state) => state.resetFontSettings)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-font-size', fontSize)
    root.setAttribute('data-font-family', fontFamily)
    root.setAttribute('data-line-height', lineHeight)
  }, [fontSize, fontFamily, lineHeight])

  return {
    fontSize,
    fontFamily,
    lineHeight,
    setFontSize,
    setFontFamily,
    setLineHeight,
    stepFontSize,
    resetFontSettings,
  }
}
