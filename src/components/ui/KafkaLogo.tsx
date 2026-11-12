import { cn } from '../../utils/cn'

interface KafkaLogoProps {
  className?: string
}

export function KafkaLogo({ className }: KafkaLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('h-9 w-9', className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="kafka-logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#312e81" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#kafka-logo-gradient)" />
      <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.9">
        <line x1="32" y1="32" x2="32" y2="14" />
        <line x1="32" y1="32" x2="17" y2="46" />
        <line x1="32" y1="32" x2="47" y2="46" />
      </g>
      <g fill="#ffffff">
        <circle cx="32" cy="32" r="7" />
        <circle cx="32" cy="14" r="4.5" />
        <circle cx="17" cy="46" r="4.5" />
        <circle cx="47" cy="46" r="4.5" />
      </g>
      <circle cx="32" cy="32" r="2.8" fill="#4f46e5" />
    </svg>
  )
}
