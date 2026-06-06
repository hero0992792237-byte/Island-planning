import { Plus } from 'lucide-react'

interface Props {
  isPressing: boolean
}

export default function CompactView({ isPressing }: Props) {

  return (
    <div
      className={`
        flex items-center gap-2.5 px-4 h-11 rounded-full
        bg-[#094cb2] text-white select-none shadow-lg
        transition-all duration-200 ease-out
        active:scale-95 cursor-pointer
        ${isPressing ? 'scale-110 w-[300px]' : 'w-[200px]'}
        shadow-[0_4px_20px_rgba(9,76,178,0.45)]
      `}
      role="button"
      aria-label="打开灵动岛"
      tabIndex={0}
    >
      {/* Plus icon */}
      <div className={`
        flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
        bg-white/20
        ${isPressing ? 'scale-110' : ''}
      `}>
        <Plus size={14} strokeWidth={2.5} />
      </div>

      {/* Label */}
      <span className="text-xs font-medium tracking-wide">
        迹划
      </span>

      {/* Dot indicator */}
      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
    </div>
  )
}
