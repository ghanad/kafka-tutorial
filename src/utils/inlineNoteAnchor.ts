import type { NoteAnchor } from '../store/useAppStore'
import { NOTE_QUOTE_MAX_LENGTH } from '../store/useAppStore'

export interface HighlightRect {
  top: number
  left: number
  width: number
  height: number
}

export interface NoteHighlight {
  id: string
  rects: HighlightRect[]
  marker: { top: number; left: number } | null
}

export interface AnchoredNote {
  id: string
  anchor: NoteAnchor
}

/**
 * Interactive widgets (buttons, form fields, diagrams) are not annotatable and
 * their text must stay out of the anchor index so quotes remain stable.
 */
const IGNORED_SELECTOR =
  'button, input, textarea, select, option, script, style, svg, noscript, [contenteditable="true"], [data-note-ignore]'

/** Only selections that start and end inside real prose blocks become notes. */
const TEXT_BLOCK_SELECTOR =
  'p, li, h1, h2, h3, h4, h5, h6, blockquote, pre, td, th, figcaption, dt, dd'

const CONTEXT_LENGTH = 48
const MAX_MATCHES = 300

interface IndexedTextNode {
  node: Text
  start: number
  end: number
}

interface TextIndex {
  text: string
  nodes: IndexedTextNode[]
}

function isInsideIgnoredElement(element: Element): boolean {
  return element.closest(IGNORED_SELECTOR) !== null
}

function acceptTextNode(node: Node): number {
  const parent = node.parentElement
  if (!parent || !node.nodeValue) return NodeFilter.FILTER_REJECT
  if (isInsideIgnoredElement(parent)) return NodeFilter.FILTER_REJECT
  return NodeFilter.FILTER_ACCEPT
}

function createTextWalker(root: HTMLElement): TreeWalker {
  return document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: acceptTextNode,
  })
}

function buildTextIndex(root: HTMLElement): TextIndex {
  const nodes: IndexedTextNode[] = []
  const parts: string[] = []
  let offset = 0

  const walker = createTextWalker(root)
  let currentNode = walker.nextNode()

  while (currentNode) {
    const textNode = currentNode as Text
    const start = offset
    offset += textNode.data.length
    parts.push(textNode.data)
    nodes.push({ node: textNode, start, end: offset })
    currentNode = walker.nextNode()
  }

  return { text: parts.join(''), nodes }
}

function boundaryElement(node: Node): Element | null {
  if (node.nodeType === Node.ELEMENT_NODE) return node as Element
  return node.parentElement
}

function isRangeEligible(root: HTMLElement, range: Range): boolean {
  if (range.collapsed) return false

  const { startContainer, endContainer } = range
  if (!root.contains(startContainer) || !root.contains(endContainer)) {
    if (range.commonAncestorContainer !== root) return false
  }

  const startElement = boundaryElement(startContainer)
  const endElement = boundaryElement(endContainer)
  if (!startElement || !endElement) return false
  if (!root.contains(startElement) || !root.contains(endElement)) return false
  if (isInsideIgnoredElement(startElement) || isInsideIgnoredElement(endElement)) {
    return false
  }

  const startBlock = startElement.closest(TEXT_BLOCK_SELECTOR)
  const endBlock = endElement.closest(TEXT_BLOCK_SELECTOR)
  if (!startBlock || !endBlock) return false
  if (!root.contains(startBlock) || !root.contains(endBlock)) return false

  return true
}

function extractRangeText(root: HTMLElement, range: Range): string {
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return ''
  }

  const parts: string[] = []
  const walker = createTextWalker(root)
  let currentNode = walker.nextNode()

  while (currentNode) {
    const textNode = currentNode as Text
    if (range.intersectsNode(textNode)) {
      const start = range.startContainer === textNode ? range.startOffset : 0
      const end = range.endContainer === textNode ? range.endOffset : textNode.data.length
      if (end > start) {
        parts.push(textNode.data.slice(start, end))
      }
    }
    currentNode = walker.nextNode()
  }

  return parts.join('')
}

function textBeforeRange(root: HTMLElement, range: Range): string {
  try {
    const before = document.createRange()
    before.selectNodeContents(root)
    before.setEnd(range.startContainer, range.startOffset)
    return extractRangeText(root, before)
  } catch {
    return ''
  }
}

function textAfterRange(root: HTMLElement, range: Range): string {
  try {
    const after = document.createRange()
    after.selectNodeContents(root)
    after.setStart(range.endContainer, range.endOffset)
    return extractRangeText(root, after)
  } catch {
    return ''
  }
}

/**
 * Turns the current selection into a persistent text-quote anchor. Returns
 * null for selections that are too short, too long, or outside prose blocks.
 */
export function createNoteAnchor(root: HTMLElement, range: Range): NoteAnchor | null {
  if (!isRangeEligible(root, range)) return null

  const quote = extractRangeText(root, range)
  if (quote.length === 0 || quote.length > NOTE_QUOTE_MAX_LENGTH) return null
  if (quote.trim().length < 2) return null

  const before = textBeforeRange(root, range)

  return {
    quote,
    prefix: before.slice(-CONTEXT_LENGTH),
    suffix: textAfterRange(root, range).slice(0, CONTEXT_LENGTH),
    startOffset: before.length,
  }
}

export function isSameAnchor(a: NoteAnchor, b: NoteAnchor): boolean {
  return a.quote === b.quote && a.prefix === b.prefix && a.suffix === b.suffix
}

/** The rect of the visual end of a selection, used to place the floating UI. */
export function getRangeAnchorRect(range: Range): DOMRect | null {
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0.5 && rect.height > 0.5,
  )

  const lastRect = rects[rects.length - 1]
  if (lastRect) return lastRect

  const bounds = range.getBoundingClientRect()
  return bounds.width > 0 || bounds.height > 0 ? bounds : null
}

function commonPrefixLength(a: string, b: string): number {
  let length = 0
  while (length < a.length && length < b.length && a[length] === b[length]) {
    length += 1
  }
  return length
}

function commonSuffixLength(a: string, b: string): number {
  let length = 0
  while (
    length < a.length &&
    length < b.length &&
    a[a.length - 1 - length] === b[b.length - 1 - length]
  ) {
    length += 1
  }
  return length
}

function contextScore(text: string, start: number, anchor: NoteAnchor): number {
  const end = start + anchor.quote.length
  const actualPrefix = text.slice(Math.max(0, start - anchor.prefix.length), start)
  const actualSuffix = text.slice(end, end + anchor.suffix.length)
  return (
    commonSuffixLength(actualPrefix, anchor.prefix) +
    commonPrefixLength(actualSuffix, anchor.suffix)
  )
}

function rangeForOffsets(index: TextIndex, start: number, end: number): Range | null {
  const startNode = index.nodes.find((item) => start >= item.start && start < item.end)
  let endNode: IndexedTextNode | undefined
  for (let i = index.nodes.length - 1; i >= 0; i -= 1) {
    const item = index.nodes[i]
    if (end > item.start && end <= item.end) {
      endNode = item
      break
    }
  }

  if (!startNode || !endNode) return null

  const range = document.createRange()
  range.setStart(startNode.node, start - startNode.start)
  range.setEnd(endNode.node, end - endNode.start)
  return range
}

function rangeForAnchor(index: TextIndex, anchor: NoteAnchor): Range | null {
  const { quote } = anchor
  if (quote.length === 0 || quote.length > index.text.length) return null

  // The saved offset disambiguates repeated quotes as long as the surrounding
  // text still matches; otherwise fall back to quote/context matching.
  if (typeof anchor.startOffset === 'number' && anchor.startOffset >= 0) {
    const offset = anchor.startOffset
    if (offset + quote.length <= index.text.length && index.text.startsWith(quote, offset)) {
      const actualPrefix = index.text.slice(Math.max(0, offset - anchor.prefix.length), offset)
      const actualSuffix = index.text.slice(offset + quote.length, offset + quote.length + anchor.suffix.length)
      if (
        actualPrefix.endsWith(anchor.prefix) &&
        actualSuffix.startsWith(anchor.suffix)
      ) {
        return rangeForOffsets(index, offset, offset + quote.length)
      }
    }
  }

  // Fast path: when the surrounding context is unique, it locates repeated
  // short quotes (e.g. a single word) unambiguously.
  if (anchor.prefix.length > 0 || anchor.suffix.length > 0) {
    const context = `${anchor.prefix}${quote}${anchor.suffix}`
    const contextStart = index.text.indexOf(context)
    if (
      contextStart !== -1 &&
      index.text.indexOf(context, contextStart + 1) === -1
    ) {
      const start = contextStart + anchor.prefix.length
      return rangeForOffsets(index, start, start + quote.length)
    }
  }

  let searchFrom = 0
  let bestStart = -1
  let bestScore = -1
  let matches = 0

  while (searchFrom <= index.text.length - quote.length && matches < MAX_MATCHES) {
    const found = index.text.indexOf(quote, searchFrom)
    if (found === -1) break

    matches += 1
    const score = contextScore(index.text, found, anchor)
    if (score > bestScore) {
      bestScore = score
      bestStart = found
    }

    const maxScore = anchor.prefix.length + anchor.suffix.length
    if (bestScore === maxScore) break

    searchFrom = found + Math.max(1, quote.length)
  }

  if (bestStart === -1) return null
  return rangeForOffsets(index, bestStart, bestStart + quote.length)
}

export function findAnchorRange(root: HTMLElement, anchor: NoteAnchor): Range | null {
  return rangeForAnchor(buildTextIndex(root), anchor)
}

function mergeLineRects(rects: DOMRect[], origin: DOMRect): HighlightRect[] {
  const normalized = rects
    .filter((rect) => rect.width > 0.5 && rect.height > 0.5)
    .map((rect) => ({
      top: rect.top - origin.top,
      left: rect.left - origin.left,
      width: rect.width,
      height: rect.height,
    }))
    .sort((a, b) => a.top - b.top || a.left - b.left)

  const merged: HighlightRect[] = []

  for (const rect of normalized) {
    const current = merged[merged.length - 1]
    const sameLine =
      current !== undefined &&
      rect.top < current.top + current.height - 1 &&
      rect.top + rect.height > current.top + 1

    if (current && sameLine) {
      const left = Math.min(current.left, rect.left)
      const right = Math.max(current.left + current.width, rect.left + rect.width)
      const top = Math.min(current.top, rect.top)
      const bottom = Math.max(current.top + current.height, rect.top + rect.height)
      current.left = left
      current.top = top
      current.width = right - left
      current.height = bottom - top
    } else {
      merged.push({ ...rect })
    }
  }

  return merged
}

/**
 * Resolves every note anchor and returns highlight geometry relative to the
 * content container. Anchors whose source text no longer exists are skipped;
 * they remain accessible from the lesson notes list.
 */
export function measureNoteHighlights(
  container: HTMLElement,
  originElement: HTMLElement,
  notes: AnchoredNote[],
): NoteHighlight[] {
  if (notes.length === 0) return []

  const origin = originElement.getBoundingClientRect()
  const index = buildTextIndex(container)
  const highlights: NoteHighlight[] = []

  for (const note of notes) {
    const range = rangeForAnchor(index, note.anchor)
    if (!range) continue

    const rects = mergeLineRects(Array.from(range.getClientRects()), origin)
    if (rects.length === 0) continue

    const lastRect = rects[rects.length - 1]
    highlights.push({
      id: note.id,
      rects,
      marker: {
        top: lastRect.top + lastRect.height / 2,
        left: lastRect.left,
      },
    })
  }

  return highlights
}

export function previewQuote(quote: string, maxLength = 120): string {
  const compact = quote.replace(/\s+/g, ' ').trim()
  if (compact.length <= maxLength) return compact
  return `${compact.slice(0, maxLength).trimEnd()}…`
}
