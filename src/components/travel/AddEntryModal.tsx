import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Briefcase, GraduationCap, Plane } from 'lucide-react'
import type { JournalCategory, JournalEntry } from '../../types'
import { CATEGORY_CONFIG } from './CategoryBadge'

interface Props {
  onSave: (entry: JournalEntry) => void
  onCancel: () => void
  initialCategory?: JournalCategory | null
}

type Step = 'category' | 'form'

const CATEGORY_OPTIONS: { key: JournalCategory; icon: typeof Briefcase }[] = [
  { key: 'work', icon: Briefcase },
  { key: 'study', icon: GraduationCap },
  { key: 'travel', icon: Plane },
]

/** 将 Date 转为 datetime-local 所需的本地时间字符串 */
function toDateTimeLocal(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 将 datetime-local 字符串转为 ISO 格式 */
function fromDateTimeLocal(local: string): string {
  return local + ':00'
}

/** Modal 内容组件（将通过 Portal 渲染到 body） */
function ModalContent({ onSave, onCancel, initialCategory }: Props) {
  const [step, setStep] = useState<Step>(initialCategory ? 'form' : 'category')
  const [category, setCategory] = useState<JournalCategory | null>(initialCategory || null)
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState(() => toDateTimeLocal(new Date()))
  const [endTime, setEndTime] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 1)
    return toDateTimeLocal(d)
  })
  const [locationName, setLocationName] = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const [cost, setCost] = useState('')
  const [description, setDescription] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'form') {
      setTimeout(() => titleRef.current?.focus(), 100)
    }
  }, [step])

  const handleCategorySelect = (cat: JournalCategory) => {
    setCategory(cat)
    setStep('form')
  }

  const handleSubmit = () => {
    if (!category || !title.trim()) return

    const entry: JournalEntry = {
      id: `journal_${Date.now()}`,
      title: title.trim(),
      category,
      startTime: fromDateTimeLocal(startTime),
      endTime: fromDateTimeLocal(endTime),
      location: {
        name: locationName.trim() || title.trim(),
        address: locationAddress.trim() || undefined,
      },
      description: description.trim(),
      cost: Number(cost) || 0,
      photoIds: [],
      source: 'manual',
      status: 'planned',
      createdAt: Date.now(),
    }

    onSave(entry)
    setCategory(null)
    setTitle('')
  }

  const isValid =
    category &&
    title.trim() &&
    startTime &&
    endTime &&
    new Date(startTime).getTime() <= new Date(endTime).getTime()

  // 分类选择
  if (step === 'category') {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="w-full sm:w-[400px] bg-[#fafafa] sm:rounded-2xl rounded-t-2xl p-6 shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline text-xl font-semibold text-[#1c1c1e]">选择分类</h3>
            <button
              onClick={onCancel}
              className="w-8 h-8 flex items-center justify-center text-[#c7c7cc] hover:text-[#1c1c1e] transition-colors rounded-full hover:bg-[#f2f2f7]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            {CATEGORY_OPTIONS.map(({ key }) => {
              const config = CATEGORY_CONFIG[key]
              const Icon = config.icon
              return (
                <button
                  key={key}
                  onClick={() => handleCategorySelect(key)}
                  className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-soft transition-all hover:shadow-soft-hover"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: config.hex }}
                  >
                    <Icon size={24} />
                  </div>
                  <div className="text-left">
                    <span className="font-headline text-base font-semibold text-[#1c1c1e] block">
                      {config.label}
                    </span>
                    <span className="font-label text-xs text-[#8e8e93]">
                      {key === 'work' && '会议 · 出差 · 客户拜访'}
                      {key === 'study' && '讲座 · 图书馆 · 研讨会'}
                      {key === 'travel' && '景点 · 美食 · 交通'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // 表单
  const config = category ? CATEGORY_CONFIG[category] : null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full sm:w-[400px] max-h-[90vh] bg-[#fafafa] sm:rounded-2xl rounded-t-2xl shadow-2xl animate-slide-up flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            {config && (
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: config.hex }}
              >
                <config.icon size={15} />
              </div>
            )}
            <h3 className="font-headline text-base font-semibold text-[#1c1c1e]">
              {config?.label}行程
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center text-[#c7c7cc] hover:text-[#1c1c1e] transition-colors rounded-full hover:bg-[#f2f2f7]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 scrollbar-hide">
          {/* 标题 */}
          <div>
            <label className="font-label text-[10px] text-[#8e8e93] mb-1.5 block">
              事件名称
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：团队周会、南京博物院..."
              className="w-full px-4 py-3 text-sm bg-white border border-[#f2f2f7]
                text-[#1c1c1e] placeholder-[#c7c7cc]
                outline-none focus:border-[#4A7BF7]/30 transition-colors rounded-xl"
            />
          </div>

          {/* 时间区间 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-label text-[10px] text-[#8e8e93] mb-1.5 block">开始时间</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-3 text-xs bg-white border border-[#f2f2f7]
                  text-[#1c1c1e] outline-none focus:border-[#4A7BF7]/30 transition-colors rounded-xl"
              />
            </div>
            <div>
              <label className="font-label text-[10px] text-[#8e8e93] mb-1.5 block">结束时间</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-3 text-xs bg-white border border-[#f2f2f7]
                  text-[#1c1c1e] outline-none focus:border-[#4A7BF7]/30 transition-colors rounded-xl"
              />
            </div>
          </div>

          {/* 地点 */}
          <div>
            <label className="font-label text-[10px] text-[#8e8e93] mb-1.5 block">地点</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="地点名称"
              className="w-full px-4 py-3 text-sm bg-white border border-[#f2f2f7]
                text-[#1c1c1e] placeholder-[#c7c7cc]
                outline-none focus:border-[#4A7BF7]/30 transition-colors rounded-xl mb-2"
            />
            <input
              type="text"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="详细地址（选填）"
              className="w-full px-4 py-3 text-sm bg-white border border-[#f2f2f7]
                text-[#1c1c1e] placeholder-[#c7c7cc]
                outline-none focus:border-[#4A7BF7]/30 transition-colors rounded-xl"
            />
          </div>

          {/* 消费金额 */}
          <div>
            <label className="font-label text-[10px] text-[#8e8e93] mb-1.5 block">消费金额</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#c7c7cc]">¥</span>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full pl-8 pr-4 py-3 text-sm bg-white border border-[#f2f2f7]
                  text-[#1c1c1e] placeholder-[#c7c7cc]
                  outline-none focus:border-[#4A7BF7]/30 transition-colors rounded-xl"
              />
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="font-label text-[10px] text-[#8e8e93] mb-1.5 block">备注</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加备注信息..."
              rows={3}
              className="w-full px-4 py-3 text-sm bg-white border border-[#f2f2f7]
                text-[#1c1c1e] placeholder-[#c7c7cc] resize-none
                outline-none focus:border-[#4A7BF7]/30 transition-colors rounded-xl"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 bg-white flex gap-3 flex-shrink-0">
          <button
            onClick={() => {
              setStep('category')
              setCategory(null)
            }}
            className="px-5 py-3 text-sm font-medium font-label text-[#8e8e93]
              hover:bg-[#f2f2f7] transition-colors rounded-xl"
          >
            上一步
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={`flex-1 py-3 text-sm font-medium font-label rounded-xl transition-all
              ${isValid
                ? 'bg-[#4A7BF7] text-white hover:opacity-90 shadow-glow-blue'
                : 'bg-[#f2f2f7] text-[#c7c7cc] cursor-not-allowed'
              }`}
          >
            添加行程
          </button>
        </div>
      </div>
    </div>
  )
}

/** 主组件：使用 Portal 将弹窗渲染到 body 根级别，避免被 FloatingIsland 遮挡 */
export default function AddEntryModal({ onSave, onCancel, initialCategory }: Props) {
  return createPortal(
    <ModalContent
      onSave={onSave}
      onCancel={onCancel}
      initialCategory={initialCategory}
    />,
    document.body
  )
}
