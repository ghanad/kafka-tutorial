# Kafka Tutorial Website: Step-by-Step Prompts for DeepSeek

How to use: paste each prompt as a **separate message**, in order, in the same chat.
Run `npm install`, `npm run dev` and `npm run build` after every step, and paste any error back to DeepSeek verbatim before moving on.

---

## Step 0: Project Brief and Global Rules (no code yet)

```
You are a senior frontend engineer and an expert Apache Kafka instructor.
We will build, over several steps, an interactive Kafka learning website whose
content is entirely in Persian (Farsi). In this message, only learn the project
rules below. Do NOT write code yet. When done, reply "Ready" and wait for Step 1.

## Goal
A website that teaches ONLY Apache Kafka, from beginner to advanced, with heavy
interactivity and visuals.

## Tech stack
- React 18 + Vite + TypeScript
- React Router using HashRouter (so it works on any static hosting with no server config)
- Tailwind CSS with full RTL support
- framer-motion for animation
- Diagrams: hand-written inline SVG React components (no static images)
- lucide-react for icons
- prism-react-renderer for code highlighting
- Zustand with the persist middleware (localStorage)
- recharts for simple charts
- NO backend and NO database. All user data (lesson progress, quiz scores,
  bookmarks, notes, theme, last visited lesson, simulator state) lives only in
  the user's browser localStorage.
- NO external CDNs of any kind (fonts, scripts, styles, images). The site must
  work fully offline after build, because it may be hosted in an air-gapped network.

## Language and RTL rules
- All UI text and lesson content is Persian.
- <html lang="fa" dir="rtl">; the whole layout is RTL.
- Use Tailwind logical utilities (ms-*, me-*, ps-*, pe-*, start-*, end-*,
  text-start, text-end) instead of left/right wherever possible.
- Font: Vazirmatn, bundled locally. Install the `vazirmatn` npm package and load
  its woff2 files via @font-face (weights 400, 500, 700, 800). Apply it to the
  entire site.
- Technical terms (Topic, Partition, Broker, Producer, Consumer, Offset, ISR,
  etc.) stay in Latin script. Wrap them in a small <Ltr> component
  (<span dir="ltr" class="inline-block">) so mixed Persian/English sentences
  keep a correct word order.
- Code blocks, CLI commands, config keys and JSON are always dir="ltr",
  text-align left, with a monospace font.
- Use Persian digits in prose, Latin digits inside code and config values.
- Directional icons (arrows, chevrons) must be mirrored correctly in RTL.

## Content structure
- Multiple sections, each lesson on its OWN route/page. Never one long page.
- Each lesson contains:
  1. Detailed, fine-grained Persian explanation (analogies, real-world
     examples, numeric examples, comparison tables)
  2. At least one interactive diagram or simulator
  3. Code/CLI samples
  4. A "Common mistakes" section
  5. A short quiz (3-5 questions)
  6. Previous/Next navigation and a "Mark as complete" button that persists
     progress

## Code quality rules
- Small, reusable components.
- Lesson content lives in separate files under src/content/ so it is easy to edit.
- Write COMPLETE code. Never use "...", "rest is the same", or placeholders.
- Every step must run without errors after `npm install && npm run dev`.
- At the end of every step, list all files created or changed and the commands to run.

Reply only "Ready" and wait.
```

---

## Step 1: Project Skeleton, Font, Theme, Layout

```
Step 1: Project skeleton.

1. Give the exact commands to scaffold the Vite + React + TS project and install
   all dependencies.
2. Configure Tailwind with RTL support, a clean color palette (deep blue/violet
   primary) and both light and dark themes.
3. Set up the Vazirmatn font locally from the npm package and apply it globally.
4. Folder structure:
   src/
     components/ (layout, ui, diagrams, simulators, quiz)
     content/ (one file per lesson)
     pages/
     store/
     hooks/
     utils/
5. Main layout:
   - Sticky header: logo, lesson search, theme toggle, overall progress indicator
   - Sidebar on the right (RTL) listing sections and lessons with completion
     checkmarks; becomes a drawer on mobile
   - Simple footer
6. Zustand store persisted to localStorage with: completedLessons, quizScores,
   bookmarks, notes (per lesson), theme, lastVisitedLesson. Include a schema
   version number for future migrations.
7. Base UI components: Button, Card, Callout (info/warning/tip/danger),
   CodeBlock (copy button, dir=ltr, syntax highlight), Ltr, Badge, Tabs, Accordion.
8. HashRouter and a landing page: course intro, a visual learning roadmap, and a
   "Continue learning" button that goes to lastVisitedLesson.
9. One empty sample lesson to verify routing.

Write the complete code for every file.
```

---

## Step 2: Lesson Engine, Quiz, Progress Page

```
Step 2: Lesson engine and quiz system.

1. Create src/content/curriculum.ts defining the full course structure (sections
   and lessons with id, slug, Persian title, short Persian description, and
   estimated reading time). Sections:
   1. Introduction and core concepts
   2. Architecture and internals
   3. Producer
   4. Consumer and Consumer Groups
   5. Replication and reliability
   6. Kafka in practice (CLI, Docker, configuration)
   7. Kafka Connect, Schema Registry, Kafka Streams
   8. Security, monitoring and operations
   9. Patterns and wrap-up
2. LessonLayout component: title, breadcrumb, auto-generated table of contents
   from headings, personal notes box (saved in localStorage), bookmark button,
   "Mark as complete" button, previous/next navigation.
3. Quiz component:
   - Multiple-choice and true/false questions
   - After answering, show a Persian explanation of why it is right or wrong
   - Store the best score in the store
   - Allow retry
4. "My Progress" page: overall percentage, completed lessons, quiz scores,
   bookmarks, notes, plus buttons to export/import all localStorage data as a
   JSON file and to wipe all data (with confirmation).
5. Client-side lesson search in the header (title and description only).
6. Build one sample lesson using this engine to prove it works.

Write complete code.
```

---

## Step 3: Sections 1 and 2 (Core Concepts and Architecture)

```
Step 3: Content for sections 1 and 2. Write all lesson content in Persian.

Section 1 lessons:
- What is Kafka and what problem does it solve? (compare with traditional message
  queues, point-to-point vs pub/sub, event streaming)
- Real-world use cases (logging, CDC, event sourcing, metrics, microservices)
- Key terms: Event/Record, Key, Value, Timestamp, Header, Topic, Partition,
  Offset, Broker, Cluster
- Quick install with Docker Compose in KRaft mode (no ZooKeeper) and how it
  differs from the ZooKeeper era

Section 2 lessons:
- Topics and Partitions: why partitions exist, scalability, ordering guarantees
- Log and Segments: append-only storage on disk, .log/.index/.timeindex files
- Retention and Log Compaction
- Brokers, the Controller and KRaft
- Leader and Follower per partition

Requirements:
- Each lesson has at least ~1000 words of fine-grained Persian explanation with
  simple analogies, numeric examples and comparison tables.
- At least one interactive component per lesson, for example:
  * Topic/Partition simulator: the user sends messages with a key and sees which
    partition they land on via hash(key) % partitions; the user can change the
    partition count and see the effect
  * Log visualizer: a strip of records with offsets, new records append at the end
  * Retention simulator: a time slider that expires old records
  * Log compaction simulator: before/after view for repeated keys
  * Cluster diagram (SVG) with brokers and leader/follower per partition; clicking
    a broker shows an explanation
- Each lesson: a "Common mistakes" section and a 3-5 question quiz.
- Register all lessons in curriculum.ts and wire up routes.

Write complete code. If the output would be too large, deliver Section 1 fully
first, then ask "Shall I continue with Section 2?"
```

---

## Step 4: Sections 3 and 4 (Producer and Consumer)

```
Step 4: Content for sections 3 and 4 (Persian content, same quality bar as Step 3).

Section 3 (Producer):
- Sending records: sync vs async, callbacks
- Partitioners and the role of the key (round-robin, sticky, custom)
- The acks setting (0, 1, all) and its effect on durability and latency
- Batching and compression: linger.ms, batch.size, compression.type
- Retries, idempotent producer, exactly-once
- Transactions

Section 4 (Consumer):
- Pull model and the poll loop
- Consumer Groups and rebalancing
- Offsets and commits (auto vs manual), the __consumer_offsets topic
- Delivery semantics: at-most-once, at-least-once, exactly-once
- Consumer lag and how to manage it
- Partition assignment strategies (Range, RoundRobin, Sticky, Cooperative)

Interactive components required:
- Producer simulator: the user adjusts acks, batch size and linger, and watches an
  animated record path to the leader and followers, with latency and data-loss
  risk shown
- Failure scenario: a "Kill the broker" button showing what happens under each
  acks value
- Consumer Group simulator: add/remove consumers and watch the rebalance and
  partition assignment animate; show that extra consumers beyond the partition
  count sit idle
- Offset simulator: committed offset vs current position, and how duplicates or
  lost records appear when a consumer dies before committing
- Lag visualization with interactive bars
- Code samples in Java and Python (language tabs) for producer and consumer
- A table of the most important configs per lesson, explained in Persian

Each lesson: common mistakes + quiz. Write complete code. If too large, deliver
Section 3 first, then Section 4.
```

---

## Step 5: Sections 5 and 6 (Replication and Kafka in Practice)

```
Step 5: Content for sections 5 and 6 (Persian content, same quality bar).

Section 5 (Replication and reliability):
- Replication factor, ISR, High Watermark
- min.insync.replicas combined with acks=all
- Leader election and unclean leader election
- Failure and recovery scenarios
- Designing for high durability (recommended settings)

Section 6 (Kafka in practice):
- CLI tools: kafka-topics.sh, kafka-console-producer.sh,
  kafka-console-consumer.sh, kafka-consumer-groups.sh, kafka-configs.sh
- A complete Docker Compose file for a 3-node KRaft cluster
- Topic management: create, alter partitions, delete, describe
- Partition reassignment and cluster rebalancing
- UI tools (Kafka UI, AKHQ) and when to use them

Interactive components required:
- ISR simulator: slow down or stop a follower and watch ISR and High Watermark change
- Leader failure scenario with an animated new leader election
- Durability calculator: inputs RF, min.insync.replicas, acks; output how many
  brokers can fail without data loss and without losing availability
- A simulated terminal in the browser: the user types Kafka CLI commands and sees
  realistic sample output; support at least 8 commands; created topics persist in
  localStorage
- A "Config lab": the user changes topic settings and the equivalent CLI command
  is generated live

Each lesson: common mistakes + quiz. Write complete code.
```

---

## Step 6: Sections 7 and 8 (Ecosystem, Security, Monitoring, Operations)

```
Step 6: Content for sections 7 and 8 (Persian content, same quality bar).

Section 7:
- Kafka Connect: source and sink connectors, workers, tasks, converters, SMTs,
  a Debezium CDC example
- Schema Registry: Avro/Protobuf/JSON Schema, compatibility modes
  (backward/forward/full)
- Kafka Streams: KStream, KTable, windowing, state stores, comparison with
  Flink and ksqlDB

Section 8:
- Security: SSL/TLS, SASL (PLAIN, SCRAM, OAUTHBEARER), ACLs
- Monitoring: JMX, key metrics (UnderReplicatedPartitions, ActiveControllerCount,
  request latency, consumer lag), Prometheus and Grafana
- Tuning and capacity planning
- Troubleshooting common problems (constant rebalancing, high lag, full disk,
  unbalanced leaders)
- Rolling upgrades and MirrorMaker 2 for multi-datacenter setups

Interactive components required:
- A clickable Kafka Connect data-flow diagram
- Schema compatibility simulator: the user adds/removes a field and the tool says
  whether the change is compatible under the chosen mode
- Stream/Table duality and windowing animation
- A sample monitoring dashboard with fake recharts graphs where the user triggers
  a problem (e.g. high lag) and sees how to diagnose and fix it
- An interactive security and production-readiness checklist, with checkmarks
  saved in localStorage
- An interactive troubleshooting decision tree

Each lesson: common mistakes + quiz. Write complete code.
```

---

## Step 7: Section 9, Final Project, and Wrap-up Features

```
Step 7: Section 9 and finishing the site.

1. Section 9 (Patterns and wrap-up), in Persian:
   - Architecture patterns: Event Sourcing, CQRS, Outbox, Saga, Dead Letter
     Queue, Retry Topic
   - Topic design and naming conventions, choosing partition counts and keys
   - Kafka vs RabbitMQ, Pulsar, Redis Streams and when to pick which
   - Common Kafka interview questions
   - Where to go next
2. A "Workshop project": a design scenario (for example an online ordering
   system) where the user picks topics, partition counts, keys and consumer
   groups step by step and gets feedback; answers are saved in localStorage.
3. A comprehensive final exam (20 questions, optional timer) and a printable
   completion certificate (HTML/CSS print stylesheet) with the user's name and
   the Jalali (Persian calendar) date plus a print button.
4. A searchable Glossary page and a Cheat Sheet page (commands and key configs).
5. Show dates in the Jalali calendar throughout the site.
6. Accessibility: keyboard navigation, Persian aria-labels, good contrast, and
   respect prefers-reduced-motion for all animations.
7. Performance: lazy-load lessons with React.lazy and add a Persian 404 page.
8. A README with run/build commands and deployment instructions for any static
   host (Nginx, GitHub Pages, GitLab Pages), plus a note that no external
   network access is needed.
9. Run through `npm run build` mentally and fix any TypeScript or lint issues.

Write complete code.
```

---

## Step 8 (Optional): Review and Polish

```
Review the entire project and check and fix the following:
- RTL issues (directional icons, mixed Persian/English word order, chart and
  animation direction)
- Mobile and responsive problems
- Dark and light theme in every component
- Any use of a CDN or external resource (there must be none)
- localStorage robustness (corrupt JSON, schema versioning, migrations)
- Broken links between lessons
- Unused code and dependencies

List the problems found and the files you changed.
```

---

## Tips

- If DeepSeek's output is cut off, send: "Continue exactly from where you stopped, starting from file X."
- If a step is too heavy, split it yourself (for example Step 4 into Producer, then Consumer).
- Paste build errors back verbatim.
