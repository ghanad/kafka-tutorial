import { BookOpen, Boxes, Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const courseIcons: Record<string, LucideIcon> = {
  kafka: Layers,
  kubernetes: Boxes,
}

export function getCourseIcon(icon: string): LucideIcon {
  return courseIcons[icon] ?? BookOpen
}
