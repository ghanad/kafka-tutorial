/**
 * Copies text to the clipboard in both secure and insecure contexts.
 *
 * `navigator.clipboard` is unavailable on `http://` and `file://` origins, so
 * fall back to a temporary textarea before giving up.
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    navigator.clipboard
  ) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)

  try {
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    if (!document.execCommand('copy')) {
      throw new Error('copy-failed')
    }
  } finally {
    document.body.removeChild(textarea)
  }
}
