import { useEffect, useRef, useState } from 'react'
import { Highlight, Prism, themes } from 'prism-react-renderer'
import type { Language } from 'prism-react-renderer'
import { Check, Copy } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { copyTextToClipboard } from '../../utils/clipboard'
import { cn } from '../../utils/cn'
import './prismLanguages'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
  className?: string
}

export function CodeBlock({
  code,
  language = 'bash',
  filename,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const theme = useAppStore((state) => state.theme)
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current)
    }
  }, [])

  async function handleCopy() {
    try {
      await copyTextToClipboard(code)
      setCopied(true)
      if (timer.current !== undefined) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const isDark = theme === 'dark'
  const prismTheme = isDark ? themes.vsDark : themes.github
  const languageAvailable =
    (Prism.languages as Record<string, unknown>)[language] !== undefined
  const safeLanguage = (languageAvailable ? language : 'text') as Language

  return (
    <div
      dir="ltr"
      className={cn(
        'overflow-hidden rounded-2xl border text-left shadow-soft',
        isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 border-b px-4 py-2.5',
          isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50',
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex shrink-0 gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </span>
          <span
            className={cn(
              'truncate font-mono text-xs',
              isDark ? 'text-slate-400' : 'text-slate-500',
            )}
          >
            {filename ?? language}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'کد کپی شد' : 'کپی کردن کد'}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors',
            isDark
              ? 'text-slate-400 hover:bg-white/10 hover:text-white'
              : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900',
          )}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{copied ? 'کپی شد' : 'کپی'}</span>
        </button>
      </div>

      <Highlight theme={prismTheme} code={code.trimEnd()} language={safeLanguage}>
        {({ tokens, getLineProps, getTokenProps, style }) => (
          <pre
            className="overflow-x-auto p-4 text-[13px] leading-7"
            style={style}
          >
            <code>
              {tokens.map((line, lineIndex) => {
                const { className: lineClassName, ...lineProps } = getLineProps({ line })
                return (
                  <div
                    key={lineIndex}
                    {...lineProps}
                    className={cn(lineClassName, 'flex min-h-[1.75rem] whitespace-pre')}
                  >
                    {showLineNumbers && (
                      <span
                        className={cn(
                          'w-9 shrink-0 select-none pe-4 text-end font-mono text-xs',
                          isDark ? 'text-slate-600' : 'text-slate-400',
                        )}
                        aria-hidden="true"
                      >
                        {lineIndex + 1}
                      </span>
                    )}
                    <span>
                      {line.map((token, tokenIndex) => (
                        <span key={tokenIndex} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </div>
                )
              })}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  )
}
