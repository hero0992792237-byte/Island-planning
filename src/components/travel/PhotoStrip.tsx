import { useEffect, useState } from 'react'
import { getPhoto } from '../../lib/journalDB'
import { ImageIcon } from 'lucide-react'

interface Props {
  photoIds: string[]
  maxCount?: number
}

export default function PhotoStrip({ photoIds, maxCount = 4 }: Props) {
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const displayIds = photoIds.slice(0, maxCount)
  const remaining = photoIds.length - maxCount

  useEffect(() => {
    let cancelled = false
    async function load() {
      const map: Record<string, string> = {}
      for (const id of displayIds) {
        if (photos[id]) continue
        const data = await getPhoto(id)
        if (data) map[id] = data
      }
      if (!cancelled) {
        setPhotos((prev) => ({ ...prev, ...map }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [displayIds])

  if (photoIds.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-3">
      {displayIds.map((id) => (
        <div
          key={id}
          className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-neutral-100"
        >
          {photos[id] ? (
            <img
              src={photos[id]}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon size={14} className="text-neutral-300" />
            </div>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-neutral-100 flex items-center justify-center">
          <span className="text-[10px] text-neutral-400">+{remaining}</span>
        </div>
      )}
    </div>
  )
}
