import { useState, useMemo } from 'react'
import { MapPin, Trash2, Clock } from 'lucide-react'
import type { JournalEntry } from '../../types'
import { CATEGORY_CONFIG } from './CategoryBadge'

interface Props {
  entries: JournalEntry[]
  year: number
  month: number
  onDeleteEntry?: (id: string) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function groupByDay(entries: JournalEntry[], year: number, month: number): Record<number, JournalEntry[]> {
  const groups: Record<number, JournalEntry[]> = {}
  entries.forEach((entry) => {
    const d = new Date(entry.startTime)
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      const day = d.getDate()
      if (!groups[day]) groups[day] = []
      groups[day].push(entry)
    }
  })
  Object.values(groups).forEach((list) => list.sort((a, b) => a.startTime.localeCompare(b.startTime)))
  return groups
}

function getCalendarDays(year: number, month: number): Array<{
  day: number
  isCurrentMonth: boolean
  date: Date
}> {
  const firstDayOfMonth = new Date(year, month - 1, 1)
  const lastDayOfMonth = new Date(year, month, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startWeekday = firstDayOfMonth.getDay()

  const days: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = []

  const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    days.push({
      day: prevMonthLastDay - i,
      isCurrentMonth: false,
      date: new Date(year, month - 2, prevMonthLastDay - i),
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      day: d,
      isCurrentMonth: true,
      date: new Date(year, month - 1, d),
    })
  }

  const remaining = (7 - (days.length % 7)) % 7
  for (let d = 1; d <= remaining; d++) {
    days.push({
      day: d,
      isCurrentMonth: false,
      date: new Date(year, month, d),
    })
  }

  return days
}

export default function MonthView({ entries, year, month, onDeleteEntry }: Props) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  const dayEntries = useMemo(() => groupByDay(entries, year, month), [entries, year, month])
  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month])

  const today = new Date()
  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-soft flex items-center justify-center mb-4">
          <span className="font-headline text-xl text-[#c7c7cc]">月</span>
        </div>
        <p className="text-[#8e8e93] text-sm mb-1 font-label">本月还没有行程</p>
        <p className="text-[#c7c7cc] text-xs font-label">点击右下角 + 添加行程</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center py-2">
            <span className="font-label text-[11px] text-[#c7c7cc]">{w}</span>
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(({ day, isCurrentMonth, date }, idx) => {
          const dayNum = date.getDate()
          const entriesForDay = isCurrentMonth ? dayEntries[dayNum] || [] : []
          const hasEntries = entriesForDay.length > 0
          const todayFlag = isToday(date)

          return (
            <div
              key={idx}
              className={`relative aspect-square rounded-xl transition-all cursor-default overflow-hidden
                ${isCurrentMonth
                  ? todayFlag
                    ? 'bg-[#4A7BF7]/5 border border-[#4A7BF7]/20'
                    : hasEntries
                      ? 'bg-white shadow-soft hover:shadow-soft-hover'
                      : 'bg-white/40 hover:bg-white/70'
                  : 'bg-transparent opacity-30'
                }
              `}
              onMouseEnter={() => isCurrentMonth && hasEntries && setHoveredDay(dayNum)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* 日期数字 */}
              <div className="absolute top-1.5 left-1.5">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full
                    ${todayFlag
                      ? 'bg-[#4A7BF7] text-white'
                      : isCurrentMonth
                        ? 'text-[#1c1c1e]'
                        : 'text-[#c7c7cc]'
                    }
                  `}
                >
                  {dayNum}
                </span>
              </div>

              {/* 行程条 */}
              {hasEntries && (
                <div className="absolute bottom-1.5 left-1.5 right-1.5 space-y-1">
                  {entriesForDay.slice(0, 2).map((entry) => {
                    const config = CATEGORY_CONFIG[entry.category]
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] truncate font-label"
                        style={{
                          backgroundColor: config.lightHex + '80',
                          color: config.hex,
                        }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: config.hex }}
                        />
                        <span className="truncate">
                          {entry.location.name || entry.title}
                        </span>
                      </div>
                    )
                  })}
                  {entriesForDay.length > 2 && (
                    <div className="text-[9px] text-[#c7c7cc] text-center font-label">
                      +{entriesForDay.length - 2}
                    </div>
                  )}
                </div>
              )}

              {/* Hover 详情浮层 */}
              {hoveredDay === dayNum && entriesForDay.length > 0 && (
                <div className="absolute z-20 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-white rounded-2xl shadow-soft-hover border border-[#f2f2f7] p-3 space-y-2 animate-fade-in">
                  <p className="font-label text-[10px] text-[#c7c7cc]">
                    {month}月{dayNum}日 · {entriesForDay.length} 个行程
                  </p>
                  {entriesForDay.map((entry) => {
                    const config = CATEGORY_CONFIG[entry.category]
                    const timeStr = entry.startTime.split('T')[1]?.slice(0, 5) || ''
                    return (
                      <div key={entry.id} className="flex items-start gap-2 group/entry">
                        <div
                          className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: config.hex }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#1c1c1e] truncate">
                            {entry.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-[#8e8e93]">
                            <span className="flex items-center gap-0.5">
                              <Clock size={8} />
                              {timeStr}
                            </span>
                            {entry.location.name && (
                              <span className="flex items-center gap-0.5 truncate">
                                <MapPin size={8} />
                                {entry.location.name}
                              </span>
                            )}
                          </div>
                        </div>
                        {onDeleteEntry && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteEntry(entry.id)
                            }}
                            className="opacity-0 group-hover/entry:opacity-100 p-1 text-[#c7c7cc] hover:text-[#ff3b30] transition-opacity"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-4 pt-2">
        {(['work', 'study', 'travel'] as const).map((cat) => {
          const config = CATEGORY_CONFIG[cat]
          return (
            <div key={cat} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.hex }} />
              <span className="font-label text-[10px] text-[#8e8e93]">{config.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
