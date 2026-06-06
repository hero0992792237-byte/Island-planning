import { Briefcase, GraduationCap, Plane } from 'lucide-react'
import type { JournalCategory } from '../../types'

export const CATEGORY_CONFIG: Record<JournalCategory, {
  label: string
  labelEn: string
  hex: string
  lightHex: string
  icon: typeof Briefcase
}> = {
  work: {
    label: '工作',
    labelEn: 'WORK',
    hex: '#a42423',
    lightHex: '#fde0e0',
    icon: Briefcase,
  },
  study: {
    label: '学习',
    labelEn: 'EDUCATION',
    hex: '#7fa921',
    lightHex: '#e8f2cd',
    icon: GraduationCap,
  },
  travel: {
    label: '旅行',
    labelEn: 'LEISURE',
    hex: '#2563eb',
    lightHex: '#dbeafe',
    icon: Plane,
  },
}

interface Props {
  category: JournalCategory
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export default function CategoryBadge({ category, size = 'sm', showLabel = true }: Props) {
  const config = CATEGORY_CONFIG[category]

  return (
    <span
      className="inline-flex items-center font-label uppercase tracking-wider"
      style={{
        fontSize: size === 'sm' ? '10px' : '12px',
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
        backgroundColor: config.lightHex,
        color: config.hex,
      }}
    >
      {showLabel && config.label}
    </span>
  )
}
