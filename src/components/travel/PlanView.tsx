import { useState, useCallback, useRef, useEffect } from 'react'
import { MapPin, Clock, Trash2, Plus, X, Loader2, ImageIcon } from 'lucide-react'
import type { JournalEntry } from '../../types'
import CategoryBadge from './CategoryBadge'
import { getPhoto, savePhoto, compressImage } from '../../lib/journalDB'

interface Props {
  entries: JournalEntry[]
  onEntryClick?: (entry: JournalEntry) => void
  onDeleteEntry?: (id: string) => void
  onUpdateEntry?: (entry: JournalEntry) => void
}

function groupByDate(entries: JournalEntry[]): Record<string, JournalEntry[]> {
  const groups: Record<string, JournalEntry[]> = {}
  for (const entry of entries) {
    const date = entry.startTime.split('T')[0]
    if (!groups[date]) groups[date] = []
    groups[date].push(entry)
  }
  Object.values(groups).forEach((list) =>
    list.sort((a, b) => a.startTime.localeCompare(b.startTime))
  )
  return groups
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function formatTimeRange(start: string, end: string): string {
  const s = start.split('T')[1]?.slice(0, 5) || ''
  const e = end.split('T')[1]?.slice(0, 5) || ''
  return `${s} - ${e}`
}

/** 添加照片按钮 */
function AddPhotoButton({
  entry,
  onUpdate,
}: {
  entry: JournalEntry
  onUpdate?: (entry: JournalEntry) => void
}) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const photoIds = entry.photoIds || []

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0 || !onUpdate) return

      setUploading(true)
      const newIds: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('image/')) continue

        try {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
          const compressed = await compressImage(base64, 1280, 0.8)
          const photoId = `entry_${entry.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
          await savePhoto(photoId, `entry_${entry.id}`, compressed)
          newIds.push(photoId)
        } catch {
          // skip invalid files
        }
      }

      if (newIds.length > 0) {
        onUpdate({
          ...entry,
          photoIds: [...photoIds, ...newIds],
        })
      }

      setUploading(false)
      e.target.value = ''
    },
    [entry, photoIds, onUpdate]
  )

  if (!onUpdate) return null

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={(e) => {
          e.stopPropagation()
          fileRef.current?.click()
        }}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e5ea] bg-white px-3 py-2 text-xs font-medium text-[#4b4b4b]
          hover:border-[#4A7BF7] hover:text-[#4A7BF7] transition-colors"
      >
        {uploading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <>
            <ImageIcon size={14} />
            <span>添加照片</span>
          </>
        )}
      </button>
    </>
  )
}

/** 行程照片组件 */
function EntryPhotos({
  entry,
  onUpdate,
}: {
  entry: JournalEntry
  onUpdate?: (entry: JournalEntry) => void
}) {
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState(false)
  const photoIds = entry.photoIds || []
  const total = photoIds.length
  const showOverlay = total > 4 && !expanded

  useEffect(() => {
    let cancelled = false
    async function load() {
      const map: Record<string, string> = {}
      for (const id of photoIds) {
        const data = await getPhoto(id)
        if (data) map[id] = data
      }
      if (!cancelled) setPhotos(map)
    }
    load()
    return () => { cancelled = true }
  }, [photoIds])

  const handleDelete = useCallback(
    (photoId: string) => {
      if (!onUpdate) return
      onUpdate({
        ...entry,
        photoIds: photoIds.filter((id) => id !== photoId),
      })
      setPhotos((prev) => {
        const next = { ...prev }
        delete next[photoId]
        return next
      })
    },
    [entry, photoIds, onUpdate]
  )

  if (!onUpdate && photoIds.length === 0) return null
  if (photoIds.length === 0) return null

  return (
    <div className="mt-3">
      <div className="grid grid-cols-4 gap-2">
        {(expanded ? photoIds : photoIds.slice(0, 4)).map((id, idx) => {
          const isOverlay = showOverlay && idx === 3
          return (
            <div
              key={id}
              className="relative aspect-square rounded-xl overflow-hidden bg-[#f2f2f7] group"
              onClick={isOverlay ? () => setExpanded(true) : undefined}
            >
              {photos[id] ? (
                <img src={photos[id]} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 size={14} className="text-[#c7c7cc] animate-spin" />
                </div>
              )}
              {isOverlay && (
                <div className="absolute inset-0 bg-[#4A7BF7]/80 flex items-center justify-center cursor-pointer">
                  <span className="text-white text-sm font-medium">+{total - 3}</span>
                </div>
              )}
              {onUpdate && !isOverlay && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(id)
                  }}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/40 rounded-full flex items-center justify-center
                    text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {expanded && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(false)
          }}
          className="mt-2 w-full py-2 text-xs text-[#8e8e93] hover:text-[#4A7BF7] transition-colors"
        >
          收起照片
        </button>
      )}
    </div>
  )
}

export default function PlanView({ entries, onEntryClick, onDeleteEntry, onUpdateEntry }: Props) {
  const groups = groupByDate(entries)
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-soft flex items-center justify-center mb-4">
          <MapPin size={24} className="text-[#c7c7cc]" />
        </div>
        <p className="text-[#8e8e93] text-sm mb-1 font-label">还没有行程记录</p>
        <p className="text-[#c7c7cc] text-xs font-label">点击右下角 + 添加你的第一段旅程</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {dates.map((date) => (
        <div key={date}>
          {/* 日期标题 */}
          <header className="flex items-center gap-3 mb-4">
            <h3 className="font-headline text-lg text-[#1c1c1e]">{formatDateLabel(date)}</h3>
            <div className="h-px flex-grow bg-[#f2f2f7]" />
          </header>

          {/* 事件卡片 */}
          <div className="space-y-3">
            {groups[date].map((entry) => {
              const isMissed = entry.status === 'missed'

              return (
                <div
                  key={entry.id}
                  onClick={() => onEntryClick?.(entry)}
                  className={`relative bg-white p-5 rounded-2xl shadow-soft transition-all group hover:shadow-soft-hover ${
                    isMissed ? 'opacity-50' : ''
                  }`}
                >
                  {/* 删除按钮 */}
                  {onDeleteEntry && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteEntry(entry.id)
                      }}
                      className="absolute top-4 right-4 z-10 w-7 h-7 flex items-center justify-center
                        text-[#c7c7cc] hover:text-[#ff3b30] hover:bg-[#ff3b30]/5
                        opacity-0 group-hover:opacity-100 transition-all rounded-full"
                      title="删除"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}

                  {/* 顶部：标题 + 分类标签 + 添加照片 */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="pr-8">
                      <h4 className={`font-headline text-base leading-tight mb-1 ${
                        entry.category === 'travel' ? 'text-[#4A7BF7]' : 'text-[#1c1c1e]'
                      }`}>
                        {entry.title}
                      </h4>
                      {entry.location.name && (
                        <p className="text-xs text-[#8e8e93] flex items-center gap-1">
                          <MapPin size={11} />
                          {entry.location.address || entry.location.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={entry.category} />
                      {onUpdateEntry && (
                        <AddPhotoButton entry={entry} onUpdate={onUpdateEntry} />
                      )}
                    </div>
                  </div>

                  {/* 时间和消费信息 */}
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex items-center gap-1.5 text-xs text-[#8e8e93]">
                      <Clock size={12} />
                      <span>{formatTimeRange(entry.startTime, entry.endTime)}</span>
                    </div>
                    {entry.cost > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-[#8e8e93]">
                        <span className="w-px h-3 bg-[#e5e5ea]"></span>
                        <span>¥{entry.cost}</span>
                      </div>
                    )}
                  </div>

                  <EntryPhotos entry={entry} onUpdate={onUpdateEntry} />

                  {/* 描述 */}
                  {entry.description && (
                    <p className="text-xs text-[#c7c7cc] italic mb-2">{entry.description}</p>
                  )}

                  {/* 状态提示 */}
                  {entry.status === 'missed' && (
                    <div className="mt-2 px-3 py-1.5 bg-[#f2f2f7] text-[10px] text-[#8e8e93] rounded-lg font-label">
                      未打卡
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
