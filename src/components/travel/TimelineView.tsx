import { useState, useEffect } from 'react'
import { MapPin, Camera, Clock, CheckCircle2, Circle, Trash2 } from 'lucide-react'
import type { JournalEntry } from '../../types'
import CategoryBadge from './CategoryBadge'
import { getPhoto } from '../../lib/journalDB'

interface Props {
  entries: JournalEntry[]
  onEntryClick?: (entry: JournalEntry) => void
  onDeleteEntry?: (id: string) => void
}

function formatTime(dateStr: string): string {
  return dateStr.split('T')[1]?.slice(0, 5) || ''
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function PhotoPreview({ photoIds }: { photoIds: string[] }) {
  const [photos, setPhotos] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      const map: Record<string, string> = {}
      for (const id of photoIds.slice(0, 3)) {
        const data = await getPhoto(id)
        if (data) map[id] = data
      }
      if (!cancelled) setPhotos(map)
    }
    load()
    return () => { cancelled = true }
  }, [photoIds])

  if (photoIds.length === 0) return null

  return (
    <div className="grid grid-cols-4 gap-2 mt-3">
      {Object.values(photos).map((src, i) => (
        <div key={i} className="aspect-square rounded-lg overflow-hidden bg-surface-container">
          <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      ))}
      {photoIds.length > 3 && (
        <div className="aspect-square rounded-lg bg-surface-container-high flex flex-col items-center justify-center text-[#2563eb] border border-[#2563eb]/10">
          <span className="text-lg font-bold">+{photoIds.length - 3}</span>
          <span className="font-label text-[8px] uppercase">张照片</span>
        </div>
      )}
    </div>
  )
}

export default function TimelineView({ entries, onEntryClick: _onEntryClick, onDeleteEntry }: Props) {
  const grouped = entries.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
    const date = entry.startTime.split('T')[0]
    if (!acc[date]) acc[date] = []
    acc[date].push(entry)
    return acc
  }, {})

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  dates.forEach((d) => grouped[d].sort((a, b) => a.startTime.localeCompare(b.startTime)))

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 flex items-center justify-center border border-outline-variant/20 mb-4">
          <Clock size={28} className="text-outline" />
        </div>
        <p className="text-on-surface-variant text-sm mb-1">还没有时间线记录</p>
        <p className="text-outline text-xs">添加行程后，时间线将在这里展开</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {dates.map((date) => (
        <div key={date}>
          {/* 日期标题 */}
          <header className="flex items-center gap-3 mb-4">
            <h3 className="font-headline text-2xl text-on-surface">{formatDateHeader(date)}</h3>
            <div className="h-px flex-grow bg-outline-variant/30" />
          </header>

          {/* 时间轴 */}
          <div className="relative pl-7">
            {/* 主线 */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-outline-variant/30" />

            <div className="space-y-4">
              {grouped[date].map((entry) => {
                const hasPhotos = entry.photoIds.length > 0
                const isCompleted = entry.status === 'completed'
                const isMissed = entry.status === 'missed'

                return (
                  <div
                    key={entry.id}
                    className={`relative group ${isMissed ? 'opacity-50' : ''}`}
                  >
                    {/* 节点圆点 */}
                    <div className="absolute -left-7 top-1 z-10">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-[#2563eb]/10 flex items-center justify-center">
                          <CheckCircle2 size={14} className="text-[#2563eb]" />
                        </div>
                      ) : isMissed ? (
                        <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center">
                          <Circle size={14} className="text-outline" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white border-2 border-primary/30 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-[#2563eb]" />
                        </div>
                      )}
                    </div>

                    {/* 删除按钮 */}
                    {onDeleteEntry && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteEntry(entry.id)
                        }}
                        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center
                          text-outline hover:text-error hover:bg-error-container/30
                          opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    {/* 卡片 */}
                    <div className="bg-white p-5 rounded-xl border border-outline-variant/5 shadow-sm">
                      {/* 顶部：时间 + 分类 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider">
                            {formatTime(entry.startTime)} — {formatTime(entry.endTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CategoryBadge category={entry.category} size="sm" />
                          {entry.source === 'ai' && (
                            <span className="font-label text-[10px] px-1.5 py-0.5 bg-surface-container-high text-on-surface-variant uppercase tracking-wider">
                              AI
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 标题和地点 */}
                      <div className="mb-3">
                        <h4 className={`font-headline text-lg leading-tight ${
                          entry.category === 'travel' ? 'text-[#2563eb]' : 'text-on-surface'
                        }`}>
                          {entry.title}
                        </h4>
                        {entry.location.name && (
                          <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                            <MapPin size={12} />
                            {entry.location.address || entry.location.name}
                          </p>
                        )}
                      </div>

                      {/* 消费 */}
                      {entry.cost > 0 && (
                        <div className="flex flex-col mb-3">
                          <span className="font-label text-[10px] text-outline uppercase tracking-wider">消费</span>
                          <span className="text-sm font-medium text-on-surface">¥{entry.cost}</span>
                        </div>
                      )}

                      {entry.description && (
                        <p className="text-xs text-on-surface-variant/70 italic mb-3">
                          {entry.description}
                        </p>
                      )}

                      {/* 照片 */}
                      {hasPhotos && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Camera size={12} className="text-outline" />
                          <span className="font-label text-[10px] text-outline uppercase tracking-wider">
                            {entry.photoIds.length} 张照片
                          </span>
                        </div>
                      )}
                      {hasPhotos && <PhotoPreview photoIds={entry.photoIds} />}

                      {/* 未打卡提示 */}
                      {isMissed && (
                        <div className="mt-3 px-3 py-1.5 bg-surface-container-high text-[10px] text-on-surface-variant rounded font-label uppercase tracking-wider">
                          已规划但未产生签到或照片记录
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
