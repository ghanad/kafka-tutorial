# AGENTS.md

Guidance for LLM-based coding agents working on this repository.

## Project

A Persian, offline-first interactive tutorial for Apache Kafka. The UI and all
lesson content are in Persian and the whole layout is RTL. There is no backend:
all user data lives in the browser's `localStorage`. The site must work fully
offline after `npm run build`; do not add external CDNs, remote fonts, or
runtime network dependencies.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

## Verification

- Run `npm run lint` and `npm run build` after every code or content change.
- Fix TypeScript, Vite, and lint errors before reporting completion.
- Do not perform visual checks in a browser. Verification is expected to happen
  through lint, type-checking, and the production build only.

## Stack

- React 18 + Vite + TypeScript
- React Router with `HashRouter`
- Tailwind CSS with RTL support and class-based dark mode
- framer-motion for animation
- lucide-react for icons
- prism-react-renderer for code highlighting
- Zustand with the persist middleware
- recharts for charts
- Vazirmatn font bundled locally from the `vazirmatn` package

Do not add new dependencies unless they are necessary for the requested task.

## Structure

```text
src/
  components/
    layout/       Header, Sidebar, Footer, LessonLayout
    ui/           Button, Card, Callout, CodeBlock, Badge, Tabs, Accordion, ...
    diagrams/     Hand-written inline SVG diagrams
    simulators/   Interactive simulators
  content/
    curriculum.ts Section and lesson metadata
    lessons/      Lesson content modules and the content registry
  pages/          Landing, Lesson, Progress, NotFound
  store/          Zustand store + persistence
  hooks/          Shared hooks
  utils/          Helpers, progress calculation, data transfer
```

## Lesson content model

- Course structure lives in `src/content/curriculum.ts`.
- Each lesson has `id`, `slug`, Persian `title`, Persian `description`,
  `readingTime`, `sectionId`, and `status`.
- `status: 'published'` means the lesson has content and counts toward progress.
  `status: 'planned'` means the metadata exists but the lesson is not yet
  available.
- Lesson content components live in `src/content/lessons/` and must be
  registered in `src/content/lessons/index.ts` via `getLessonContent`.
- Lesson content should use `h2` and `h3` headings because the table of contents
  is generated automatically from them.
- Keep content in Persian. This project intentionally has no per-lesson quiz or
  personal notes feature; do not add them back unless explicitly requested.

## Content style

- All prose is Persian; technical terms stay in Latin script.
- Wrap Latin technical terms inside Persian sentences with `<Ltr>...</Ltr>`.
- Use Persian digits in prose and Latin digits inside code, CLI commands, and
  config values.
- Use `CodeBlock` for code and CLI samples; it enforces `dir="ltr"` and left
  alignment.
- Prefer concrete examples, numeric calculations, comparison tables, analogies,
  and a "common mistakes" section.
- Use the existing `Callout` variants (`info`, `tip`, `warning`, `danger`)
  instead of inventing new box styles.

## UI and RTL rules

- Use Tailwind logical utilities: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`,
  `end-*`, `text-start`, `text-end`.
- Directional icons must be mirrored correctly for RTL.
- Every component must work in both light and dark themes.
- Respect `prefers-reduced-motion` for animations.
- Use existing UI components before creating new primitives.

## State and persistence

- Storage key: `kafka-tutorial-store`.
- Current schema version: `4` (`STORE_VERSION` in `src/store/useAppStore.ts`).
- Persisted fields: `completedLessons`, `bookmarks`, `notes`, `theme`,
  `lastVisitedLesson`, `fontSize`, `fontFamily`, `lineHeight`.
- If the persisted schema changes, bump `STORE_VERSION` and update
  `sanitizePersistedState` so old data migrates safely.
- Export/import of user data is implemented in `src/utils/dataTransfer.ts`.

## Routing

Routes are defined in `src/App.tsx` under `HashRouter`:

- `/` landing page
- `/lessons/:slug` lesson page
- `/progress` progress and backup page
- `*` Persian 404 page

Keep links working with hash-based routing; do not use plain `href="#..."` for
in-page anchors because `#` is reserved by `HashRouter`. Use scroll handlers
instead, as `LessonLayout` does for the table of contents.
