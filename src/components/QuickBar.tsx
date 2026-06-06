import { X } from 'lucide-react'
import type { JournalCategory } from '../types'
import { CATEGORY_CONFIG } from './travel/CategoryBadge'

interface Props {
  onClose: () => void
  showPicker: boolean
  onTogglePicker: () => void
  onCategorySelect: (category: JournalCategory) => void
}

export default function QuickBar({ onClose, showPicker, onTogglePicker, onCategorySelect }: Props) {
  return (
    <div
      className="flex items-center h-12 rounded-2xl overflow-hidden
        bg-white/95 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.15)] select-none
        animate-scale-in"
      onClick={(e) => e.stopPropagation()}
      role="toolbar"
      aria-label="快速添加行程"
    >
      {/* 左侧：迹划标签 */}
      <div className="flex items-center gap-2 pl-4 pr-5 h-full flex-shrink-0
        bg-[#094cb2] text-white">
        <span className="text-xs font-medium tracking-wide whitespace-nowrap">迹划</span>
      </div>

      {/* 分隔线 */}
      <span className="w-px h-6 bg-neutral-200 flex-shrink-0 mx-1" />

      {!showPicker ? (
        /* ===== 初始态：添加行程按钮 ===== */
        <button
          onClick={onTogglePicker}
          className="flex items-center gap-1.5 px-4 h-full flex-shrink-0
            text-xs font-medium text-neutral-700 hover:text-[#094cb2]
            hover:bg-neutral-50 transition-colors whitespace-nowrap"
        >
          <span className="text-sm leading-none font-bold">+</span>
          添加行程
        </button>
      ) : (
        /* ===== 展开态：三个分类按钮 ===== */
        <>
          {[
            { key: 'work' as JournalCategory, label: '工作' },
            { key: 'study' as JournalCategory, label: '学习' },
            { key: 'travel' as JournalCategory, label: '旅行' },
          ].map(({ key, label }) => {
            const config = CATEGORY_CONFIG[key]
            const Icon = config.icon
            return (
              <button
                key={key}
                onClick={() => onCategorySelect(key)}
                className="flex items-center gap-1 px-3 h-full flex-shrink-0
                  text-[11px] font-medium text-[#094cb2] bg-[#094cb2]/8
                  hover:bg-[#094cb2]/15 active:scale-95 transition-all"
              >
                <Icon size={12} />
                {label}
              </button>
            )
          })}
          {/* 收起：点「添加行程」回去 */}
          <button
            onClick={onTogglePicker}
            className="flex items-center gap-1 px-3 h-full flex-shrink-0
              text-[11px] font-medium text-neutral-400 hover:text-neutral-600
              hover:bg-neutral-50 transition-colors"
          >
            ← 添加行程
          </button>
        </>
      )}

      {/* 最右侧：关闭 */}
      <span className="w-px h-6 bg-neutral-200 flex-shrink-0 mx-1" />
      <button
        onClick={onClose}
        className="flex items-center justify-center w-8 h-full flex-shrink-0
          text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors"
        aria-label="关闭"
      >
        <X size={14} />
      </button>
    </div>
  )
}
