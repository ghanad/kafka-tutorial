import { motion, useReducedMotion } from 'framer-motion'

export function HeroDiagram() {
  const shouldReduceMotion = useReducedMotion()
  const showMotion = !shouldReduceMotion

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative"
    >
      <div
        className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary-500/25 via-fuchsia-500/10 to-transparent blur-2xl"
        aria-hidden="true"
      />

      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
        <svg
          viewBox="0 0 560 380"
          role="img"
          aria-label="نمودار جریان پیام از Producer به سه Partition و سپس به Consumer Group"
          className="h-auto w-full"
        >
          <defs>
            <pattern id="hero-grid-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
              <path
                d="M 24 0 L 0 0 0 24"
                className="fill-none stroke-primary-500/10 dark:stroke-primary-300/10"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          <rect width="560" height="380" fill="url(#hero-grid-pattern)" rx="20" />

          <g>
            <rect
              x="16"
              y="132"
              width="112"
              height="96"
              rx="16"
              className="fill-primary-50 stroke-primary-300 dark:fill-primary-950/70 dark:stroke-primary-700"
              strokeWidth="1.5"
            />
            <circle cx="72" cy="158" r="11" className="fill-primary-500/15" />
            <circle cx="72" cy="158" r="3.5" className="fill-primary-500" />
            <text
              x="72"
              y="188"
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              className="fill-primary-800 dark:fill-primary-100"
            >
              PRODUCER
            </text>
            <text
              x="72"
              y="204"
              textAnchor="middle"
              fontSize="8.5"
              className="fill-primary-500 dark:fill-primary-300"
            >
              orders-service
            </text>
          </g>

          <g>
            <rect
              x="172"
              y="42"
              width="220"
              height="296"
              rx="20"
              className="fill-slate-50/80 stroke-slate-200 dark:fill-slate-950/50 dark:stroke-slate-800"
              strokeWidth="1.2"
              strokeDasharray="5 5"
            />
            <text
              x="282"
              y="66"
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              className="fill-slate-500 dark:fill-slate-400"
            >
              TOPIC
            </text>
            <text
              x="282"
              y="82"
              textAnchor="middle"
              fontSize="12"
              fontWeight="800"
              className="fill-slate-800 dark:fill-slate-100"
            >
              orders
            </text>

            {[
              { y: 100, name: 'partition-0', color: 'fill-primary-500' },
              { y: 184, name: 'partition-1', color: 'fill-fuchsia-500' },
              { y: 268, name: 'partition-2', color: 'fill-sky-500' },
            ].map((partition) => (
              <g key={partition.name}>
                <rect
                  x="192"
                  y={partition.y}
                  width="180"
                  height="58"
                  rx="12"
                  className="fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700"
                  strokeWidth="1.5"
                />
                <rect
                  x="192"
                  y={partition.y}
                  width="6"
                  height="58"
                  rx="3"
                  className={partition.color}
                />
                <text
                  x="208"
                  y={partition.y + 22}
                  fontSize="9.5"
                  fontWeight="700"
                  className="fill-slate-700 dark:fill-slate-200"
                >
                  {partition.name}
                </text>
                <text
                  x="208"
                  y={partition.y + 38}
                  fontSize="7.5"
                  className="fill-slate-400 dark:fill-slate-500"
                >
                  leader + follower
                </text>
                <g className="fill-slate-300 dark:fill-slate-700">
                  <rect x="208" y={partition.y + 44} width="16" height="5" rx="2" />
                  <rect x="228" y={partition.y + 44} width="10" height="5" rx="2" />
                  <rect x="242" y={partition.y + 44} width="20" height="5" rx="2" />
                  <rect x="266" y={partition.y + 44} width="7" height="5" rx="2" />
                </g>
                <text
                  x="356"
                  y={partition.y + 22}
                  textAnchor="end"
                  fontSize="7.5"
                  className="fill-slate-400 dark:fill-slate-500"
                >
                  offsets
                </text>
              </g>
            ))}
          </g>

          <g>
            <text
              x="486"
              y="92"
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              className="fill-slate-500 dark:fill-slate-400"
            >
              CONSUMER GROUP
            </text>
            {[
              { y: 112, name: 'consumer-a' },
              { y: 218, name: 'consumer-b' },
            ].map((consumer) => (
              <g key={consumer.name}>
                <rect
                  x="430"
                  y={consumer.y}
                  width="112"
                  height="58"
                  rx="12"
                  className="fill-emerald-50/80 stroke-emerald-300 dark:fill-emerald-950/40 dark:stroke-emerald-800"
                  strokeWidth="1.5"
                />
                <circle cx="446" cy={consumer.y + 20} r="3.5" className="fill-emerald-500" />
                <text
                  x="458"
                  y={consumer.y + 24}
                  fontSize="9.5"
                  fontWeight="700"
                  className="fill-emerald-800 dark:fill-emerald-200"
                >
                  {consumer.name}
                </text>
                <text
                  x="446"
                  y={consumer.y + 42}
                  fontSize="7.5"
                  className="fill-emerald-600/80 dark:fill-emerald-400/80"
                >
                  group: billing
                </text>
              </g>
            ))}
          </g>

          <g
            className="fill-none stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1.4"
          >
            <path d="M128 180 C 152 180, 154 129, 192 129" />
            <path d="M128 180 C 152 180, 154 213, 192 213" />
            <path d="M128 180 C 152 180, 154 297, 192 297" />
            <path d="M372 129 C 400 129, 408 141, 430 141" />
            <path d="M372 213 C 400 213, 408 247, 430 247" />
            <path d="M372 297 C 400 297, 404 247, 430 247" />
          </g>

          {showMotion && (
            <g>
              <circle r="3.5" className="fill-fuchsia-500">
                <animateMotion
                  dur="3s"
                  repeatCount="indefinite"
                  path="M128 180 C 152 180, 154 129, 192 129"
                />
              </circle>
              <circle r="3.5" className="fill-fuchsia-500">
                <animateMotion
                  dur="3s"
                  begin="1s"
                  repeatCount="indefinite"
                  path="M128 180 C 152 180, 154 213, 192 213"
                />
              </circle>
              <circle r="3.5" className="fill-fuchsia-500">
                <animateMotion
                  dur="3s"
                  begin="2s"
                  repeatCount="indefinite"
                  path="M128 180 C 152 180, 154 297, 192 297"
                />
              </circle>
              <circle r="3" className="fill-emerald-500">
                <animateMotion
                  dur="2.4s"
                  begin="0.4s"
                  repeatCount="indefinite"
                  path="M372 129 C 400 129, 408 141, 430 141"
                />
              </circle>
              <circle r="3" className="fill-emerald-500">
                <animateMotion
                  dur="2.4s"
                  begin="1.2s"
                  repeatCount="indefinite"
                  path="M372 213 C 400 213, 408 247, 430 247"
                />
              </circle>
            </g>
          )}
        </svg>

        <div className="mt-2 grid grid-cols-3 gap-2 border-t border-slate-200/70 pt-3 text-center dark:border-slate-800">
          {[
            { label: 'Producer', value: 'نوشتن رویداد' },
            { label: 'Partition', value: 'ترتیب و مقیاس' },
            { label: 'Consumer', value: 'خواندن مستقل' },
          ].map((item) => (
            <div key={item.label}>
              <p className="font-mono text-[10px] font-bold text-primary-600 dark:text-primary-300">
                {item.label}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
