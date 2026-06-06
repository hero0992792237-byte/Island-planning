import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ShoppingItem } from '../types'

interface Props {
  items: ShoppingItem[];
}

export default function ShoppingList({ items }: Props) {
  const [expanded, setExpanded] = useState(true)

  // Group by category
  const groups = items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const cat = item.category || '其他'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className="border border-neutral-200">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">购买清单</span>
          <span className="text-[10px] px-1.5 py-0.5 border border-neutral-200 text-neutral-500">
            {items.length} 项
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 animate-fade-in border-t border-neutral-100">
          {Object.entries(groups).map(([category, categoryItems]) => (
            <div key={category}>
              <p className="text-[10px] text-neutral-400 mb-1">{category}</p>
              <div className="space-y-1.5">
                {categoryItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 border border-neutral-200"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-neutral-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-neutral-400">{item.quantity}</p>
                    </div>
                    <a
                      href={`https://waimai.meituan.com/search?keyword=${encodeURIComponent(item.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 ml-2 px-2.5 py-1.5
                        bg-neutral-800 hover:bg-neutral-700 text-white
                        text-[11px] font-medium transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      外卖
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
