# AGENTS.md

Guidance for LLM-based coding agents working on this repository.

## Project

A Persian, offline-first multi-course learning platform. Each course (Apache
Kafka, Kubernetes, and future topics) has its own sections, lessons, and
progress. The UI and all lesson content are in Persian and the whole layout is
RTL. There is no backend: all user data lives in the browser's `localStorage`.
The site must work fully offline after `npm run build`; do not add external
CDNs, remote fonts, or runtime network dependencies.

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
    courses/      Course model, one file per course, and aggregate helpers
    lessons/      Lesson content modules and the content registry
    site.ts       Platform name and description
  pages/          Courses, Course, Lesson, Progress, NotFound
  store/          Zustand store + persistence
  hooks/          Shared hooks
  utils/          Helpers, progress calculation, data transfer
```

## Lesson content model

- The platform is a list of courses in `src/content/courses/index.ts`.
- Each course lives in its own file under `src/content/courses/` (for example
  `kafka.ts` and `kubernetes.ts`) and exports a `Course` object.
- A `Course` has `id`, `slug`, Persian `title`, `shortTitle`, `description`,
  `longDescription`, `level`, `icon`, and `sections`.
- Course structure is defined with `CourseSectionInput[]`; the course builder
  attaches `courseId` to every lesson automatically.
- Each lesson has `id`, `slug`, Persian `title`, Persian `description`,
  `readingTime`, `sectionId`, `courseId`, and `status`.
- Lesson ids and slugs must be globally unique across all courses. Keep the
  existing Kafka ids unchanged and prefix new courses (for example
  `k8s-pods`); this preserves users' saved progress in `localStorage`.
- Section ids must also be globally unique. Prefix new course sections (for
  example `k8s-basics`).
- `status: 'published'` means the lesson has content and counts toward progress.
  `status: 'planned'` means the metadata exists but the lesson is not yet
  available.
- Lesson content components live in `src/content/lessons/` and must be
  registered in `src/content/lessons/index.ts` via `getLessonContent`.
- Lesson content should use `h2` and `h3` headings because the table of contents
  is generated automatically from them.
- Progress is computed per course with `getCourseProgress` and globally with
  `getProgressPercent`; do not hard-code the Kafka course in shared UI.
- Keep content in Persian. Personal notes are an existing feature: each lesson
  has one general note plus inline notes anchored to selected text. Keep both
  working when touching lesson pages; do not add quizzes.

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
- Keep the main reading path short. Details that are not required to use a
  feature (file formats, byte-level layout, numeric proofs, internal
  algorithms) belong in a collapsible `DeepDive` block from
  `src/components/ui/DeepDive.tsx`; the practical part (what it is for, how to
  use it, common pitfalls) stays outside. The `DeepDive` title renders as an
  `h3` and appears in the table of contents; its inner parts use
  `DeepDiveSection`, which renders `h4` and stays out of the table of contents.

## Interactive step-by-step explainers

Some lessons embed a narrated walkthrough instead of an open-ended playground:
the reader moves through a small number of steps and one self-contained figure
changes with each step. This is the preferred model for new interactive visual
explainers — simple, explanatory, and free of extra chrome. Reference
implementations:

- `src/components/simulators/SparseIndexExplainer.tsx` and
  `src/components/simulators/TimeIndexExplainer.tsx` (lesson `log-segments`)
- `src/components/simulators/RetentionSimulator.tsx` and
  `src/components/simulators/CompactionSimulator.tsx` (lesson
  `retention-compaction`)

Read at least one of these before writing a new one, and follow its structure
rather than inventing a new layout. Name a pure walkthrough `*Explainer`.

### Model

- Freeze one concrete scenario (one topic, one partition, a handful of records)
  and narrate it. No randomness, no user-provided input, no network, no state
  that survives a reload.
- Make the picture a pure function of a step index. Either precompute a snapshot
  array at module scope (`buildSnapshots()` in the `*Explainer` components) or
  replay a declarative `STEPS` list into a state object (`buildState(stepIndex)`
  in the `*Simulator` components). Keep this logic outside the component so
  every step renders identically every time.
- One step = one event (one append, one roll, one index entry, one cleaner pass).
  Highlight exactly what that event changed and dim the rest.
- Keep the sequence short enough to finish (roughly 8–15 steps). If the story
  has two phases, split it into stage tabs (e.g. «نوشتن» / «جست‌وجو») instead of
  one long sequence.

### Anatomy

Follow this order and reuse existing components and tokens:

1. Card: `my-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900`.
2. Header: small Persian eyebrow («توضیح تعاملی گام‌به‌گام» or
   «شبیه‌ساز گام‌به‌گام»), an `h3` title phrased as the question the explainer
   answers, and a `Badge variant="primary"` with «گام X از Y» in Persian digits.
3. Optional read-only context strip in `dir="ltr"` monospace: topic, partition,
   and only the config values this explainer depends on.
4. Controls: «گام قبل» (`ChevronRight`, mirrored for RTL), «گام بعد»
   (`ChevronLeft`), «از اول» (`RotateCcw`). Add autoplay + speed, or a scrub
   `input[type="range"]`, only for longer explainers. Do not add config inputs,
   sliders, toggles, or legends.
5. Progress: a thin `bg-primary-500` bar with `role="progressbar"` and
   `aria-valuenow`, or the styled range input the reference explainers use.
6. Caption panel: `aria-live="polite"` and `border-s-4 border-s-primary-500`,
   with one 2–4 sentence paragraph about the current step.
7. Figure: a single inline SVG with `role="img"` and a Persian `aria-label`,
   wrapped in `dir="ltr"` + `overflow-x-auto` + a `min-w-[...]` so it stays LTR
   and scrolls on small screens; add the «نمودار را افقی بکشید» hint on mobile.
8. Muted footnote: which values are scaled down for readability, and that the
   logic matches what Kafka really does.

### Visual language

- Color carries meaning only: `slate` for idle, `primary` for the active item,
  `emerald` for the answer or success, `amber` for a caveat (out-of-order
  timestamp, dirty segment), `rose` for discarded or deleted, `slate-100` for
  skipped. Reuse the `boxClass(mark)` mapping from the reference files.
- Show flow with thin dashed connectors between the log, the index files, and
  the query; make the active connector `primary` and thicker.
- Put the numbers that matter (`offset`, `position`, `timestamp`) in short
  `font-mono` labels inside the figure. No icons, gradients, or decorative
  legend boxes: the caption does the explaining.
- Every color needs a dark-theme counterpart (`dark:fill-*`, `dark:stroke-*`,
  `dark:bg-*`).

### Step captions

- State the concrete values of this step, then the reason for it, e.g. «رکورد
  offset ۱۰۰۶ در position ۶۴۰۰ نوشته شد (۱۴۰۰ بایت).»
- Use Persian digits for plain prose counts (step numbers, record counts), but
  keep config keys, offsets, positions, timestamps, and formulas in Latin script
  inside `<Ltr>` or monospace spans. If you convert a technical value to Persian
  digits, do it for every occurrence of that value in the same explainer.
- When a value does not change as the reader might expect (no new index entry,
  no deletion, an out-of-order timestamp not indexed), explain why in the same
  step.
- End with one or two sentences stating the general rule, not a summary table.
- Keep the surrounding lesson readable on its own: introduce the explainer with
  a sentence about what the reader will see, and refer back to a specific step
  when it clarifies a subtle point, as the two reference lessons do.

### Constraints

- Reuse `Button`, `Badge`, `Ltr`, and `toPersianDigits` from
  `src/utils/persianDigits.ts`; add no dependencies and no new UI primitives.
- Every animated property needs `motion-reduce:transition-none`, and controls
  must be labelled and keyboard-reachable.
- Must work in both themes, fully offline after build, and needs no
  `localStorage`.

## UI and RTL rules

- Use Tailwind logical utilities: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`,
  `end-*`, `text-start`, `text-end`.
- Directional icons must be mirrored correctly for RTL.
- Every component must work in both light and dark themes.
- Respect `prefers-reduced-motion` for animations.
- Use existing UI components before creating new primitives.

## State and persistence

- Storage key: `kafka-tutorial-store`.
- Current schema version: `7` (`STORE_VERSION` in `src/store/useAppStore.ts`).
- Persisted fields: `completedLessons`, `bookmarks`, `notes`, `inlineNotes`,
  `theme`, `lastVisitedLesson`, `fontSize`, `fontFamily`, `lineHeight`,
  `collapsedSections`, `sidebarCollapsed`, `tocCollapsed`.
- If the persisted schema changes, bump `STORE_VERSION` and update
  `sanitizePersistedState` so old data migrates safely.
- Export/import of user data is implemented in `src/utils/dataTransfer.ts`.

## Routing

Routes are defined in `src/App.tsx` under `HashRouter`:

- `/` platform landing page (course list)
- `/courses/:courseSlug` course landing page
- `/courses/:courseSlug/lessons/:slug` lesson page
- `/courses/:courseSlug/progress` per-course progress and backup page
- `/progress` global progress and backup page
- `/lessons/:slug` legacy redirect to the course-scoped lesson URL
- `*` Persian 404 page

Keep links working with hash-based routing; do not use plain `href="#..."` for
in-page anchors because `#` is reserved by `HashRouter`. Use scroll handlers
instead, as `LessonLayout` does for the table of contents.
