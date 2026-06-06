import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { INTEREST_TAGS, MOOD_OPTIONS } from '../types'

interface Props {
  onClose: () => void
}

export default function UserProfilePanel({ onClose }: Props) {
  const { state, dispatch } = useApp()
  const { userProfile } = state

  const [interests, setInterests] = useState<string[]>(userProfile.interests)
  const [mood, setMood] = useState<typeof userProfile.mood>(userProfile.mood)
  const [budget, setBudget] = useState<typeof userProfile.budgetPreference>(userProfile.budgetPreference)

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSave = () => {
    dispatch({
      type: 'SET_USER_PROFILE',
      payload: { interests, mood, budgetPreference: budget },
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div className="relative w-[360px] max-w-[calc(100vw-32px)] max-h-[85vh] overflow-y-auto scrollbar-hide
        bg-white border border-neutral-200 animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h3 className="text-sm font-medium text-neutral-900">我的偏好</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* Mood selector */}
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-3 block">现在的心情</label>
            <div className="grid grid-cols-4 gap-2">
              {MOOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMood(opt.value)}
                  className={`flex flex-col items-center gap-1 p-2 transition-colors
                    ${mood === opt.value
                      ? 'bg-neutral-800 text-white'
                      : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
                    }`}
                >
                  <span className="text-base">{opt.emoji}</span>
                  <span className={`text-[10px] ${mood === opt.value ? 'text-white' : 'text-neutral-400'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Interest tags */}
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-3 block">兴趣标签（多选）</label>
            <div className="space-y-3">
              {INTEREST_TAGS.map((group) => (
                <div key={group.category}>
                  <p className="text-[10px] text-neutral-400 mb-1.5">{group.category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleInterest(tag)}
                        className={`px-2.5 py-1 text-[11px] transition-colors
                          ${interests.includes(tag)
                            ? 'bg-neutral-800 text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Budget preference */}
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-2 block">预算偏好</label>
            <div className="flex border border-neutral-200">
              {([
                { value: 'low', label: '省钱' },
                { value: 'medium', label: '适中' },
                { value: 'high', label: '轻奢' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBudget(opt.value)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors
                    ${budget === opt.value
                      ? 'bg-neutral-800 text-white'
                      : 'bg-white text-neutral-500 hover:bg-neutral-50'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="px-5 py-4 border-t border-neutral-100">
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium transition-colors"
          >
            <Save size={15} />
            保存偏好
          </button>
        </div>

        <p className="text-center text-[11px] text-neutral-400 pb-4">
          AI 推荐时会参考你的偏好和心情
        </p>
      </div>
    </div>
  )
}
