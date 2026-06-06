import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, LayoutGrid, CalendarDays, BarChart3, Wallet, Route, Plane, Briefcase, BookOpen } from 'lucide-react'
import type { JournalEntry } from '../../types'
import { calculateTotalDistance } from '../../lib/geo'

interface Props {
  year: number
  month: number
  onChangeMonth: (delta: number) => void
  view: 'plan' | 'month'
  onChangeView: (view: 'plan' | 'month') => void
  onAddClick: () => void
  onReportClick: () => void
  entries: JournalEntry[]
}

/** 基于行程数据AI生成月度洞察文案 */
function generateInsight(entries: JournalEntry[]): string {
  if (entries.length === 0) {
    return '新的一个月，期待你的第一段旅程。'
  }

  const completed = entries.filter(e => e.status === 'completed').length
  const total = entries.length

  const catCount: Record<string, number> = {}
  entries.forEach(e => {
    catCount[e.category] = (catCount[e.category] || 0) + 1
  })
  const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'travel'

  const locations = entries.map(e => e.location.name).filter(Boolean)
  const uniqueLocs = [...new Set(locations)].slice(0, 3)

  const totalCost = entries.reduce((s, e) => s + (e.cost || 0), 0)

  const templates: string[] = []

  if (completed >= total * 0.8) {
    templates.push(`${uniqueLocs.length > 0 ? `从${uniqueLocs.join('、')}一路走来，` : ''}每一段足迹都在书写属于你的故事。`)
  } else if (completed >= total * 0.5) {
    templates.push(`${uniqueLocs.length > 0 ? `「${uniqueLocs[0]}」等${uniqueLocs.length}处留下了你的印记，` : ''}余下的时光，愿计划与现实温柔相遇。`)
  } else {
    templates.push(`${uniqueLocs.length > 0 ? `「${uniqueLocs[0]}」已列入你的行程，` : ''}前方还有 ${total - completed} 段旅程等待展开。`)
  }

  if (topCat === 'travel' && totalCost > 200) {
    templates.push(`本月你在旅途上花费了 ¥${totalCost.toLocaleString()}，那些风景终将化作记忆里最温柔的底色。`)
  } else if (topCat === 'work') {
    templates.push(`本月工作占据了主要篇幅，在忙碌之余，别忘了给心灵留一扇透气的窗。`)
  } else if (topCat === 'study') {
    templates.push(`本月你在知识的海洋中深耕细作，每一份付出都会在未来的某刻开花结果。`)
  }

  if (totalCost > 500) {
    templates.push(`本月总消费 ¥${totalCost.toLocaleString()}，投资在时间与体验上的每一分钱，都是对生活最真诚的告白。`)
  }

  if (uniqueLocs.length >= 2) {
    templates.push(`从${uniqueLocs.join('到')}，本月你的足迹串联起${uniqueLocs.length}处风景。`)
  }

  return templates[Math.floor(Math.random() * templates.length)] || '愿每一段旅程，都能成为日后最温柔的回忆。'
}

export default function JournalHeader({
  year,
  month,
  onChangeMonth,
  view,
  onChangeView,
  onAddClick: _onAddClick,
  onReportClick,
  entries,
}: Props) {
  const totalCost = useMemo(
    () => entries.reduce((sum, e) => sum + (e.cost || 0), 0),
    [entries]
  )
  const totalDistance = useMemo(() => calculateTotalDistance(entries), [entries])

  const completedCount = entries.filter(e => e.status === 'completed').length
  const totalCount = entries.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const categoryFocus = useMemo(() => {
    const counts: Record<string, number> = {}
    entries.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1 })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (sorted.length === 0) return null
    const map: Record<string, { label: string; icon: typeof Plane }> = {
      work: { label: '工作', icon: Briefcase },
      study: { label: '学习', icon: BookOpen },
      travel: { label: '旅行', icon: Plane },
    }
    return map[sorted[0][0]] || null
  }, [entries])

  const insight = useMemo(() => generateInsight(entries), [entries])

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  return (
    <div className="space-y-5">
      {/* 蓝调渐变顶部栏 */}
      <div className="-mx-4 -mt-5 px-5 pt-6 pb-8 gradient-blue-soft">
        {/* 月份选择器 */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => onChangeMonth(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/60 backdrop-blur-sm active:scale-95 transition-all"
          >
            <ChevronLeft size={20} className="text-[#4A7BF7]" />
          </button>
          <h2 className="font-headline text-2xl font-medium tracking-tight text-[#1c1c1e]">
            {year}年{monthNames[month - 1]}
          </h2>
          <button
            onClick={() => onChangeMonth(1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/60 backdrop-blur-sm active:scale-95 transition-all"
          >
            <ChevronRight size={20} className="text-[#4A7BF7]" />
          </button>
        </div>

        {/* 摘要条 */}
        <div className="flex items-center justify-center gap-6">
          <button onClick={onReportClick} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-soft">
              <Wallet size={14} className="text-[#4A7BF7]" />
            </div>
            <div className="text-left">
              <p className="font-label text-[10px] text-[#8e8e93]">消费</p>
              <p className="font-label text-sm font-semibold text-[#1c1c1e]">¥{totalCost.toLocaleString()}</p>
            </div>
          </button>
          <div className="w-px h-8 bg-[#e5e5ea]"></div>
          <button onClick={onReportClick} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-soft">
              <Route size={14} className="text-[#4A7BF7]" />
            </div>
            <div className="text-left">
              <p className="font-label text-[10px] text-[#8e8e93]">里程</p>
              <p className="font-label text-sm font-semibold text-[#1c1c1e]">{totalDistance} km</p>
            </div>
          </button>
        </div>
      </div>

      {/* Dashboard Cards - 三列横排 */}
      <div className="grid grid-cols-3 gap-3">
        {/* Schedule Summary */}
        <div className="p-4 rounded-2xl bg-white shadow-soft flex flex-col">
          <p className="font-label text-[10px] text-[#8e8e93] mb-2">
            行程概览
          </p>
          <div className="flex items-baseline gap-1">
            <span className="font-headline text-2xl font-bold text-[#1c1c1e]">{completedCount}</span>
            <span className="font-label text-xs text-[#8e8e93]">/{totalCount}</span>
          </div>
          <p className="font-label text-[10px] text-[#c7c7cc] mt-0.5">已完成</p>
          <div className="mt-auto pt-3 w-full bg-[#f2f2f7] h-1 rounded-full overflow-hidden">
            <div className="bg-[#4A7BF7] h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Focus Mode */}
        <div className="p-4 rounded-2xl bg-white shadow-soft flex flex-col">
          <p className="font-label text-[10px] text-[#8e8e93] mb-2">
            本月聚焦
          </p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#eef2ff] flex items-center justify-center">
              {categoryFocus ? <categoryFocus.icon size={16} className="text-[#4A7BF7]" /> : <Plane size={16} className="text-[#4A7BF7]" />}
            </div>
            <span className="font-headline text-lg font-semibold text-[#1c1c1e]">
              {categoryFocus?.label || '旅行'}
            </span>
          </div>
          <p className="mt-auto pt-2 text-[10px] text-[#c7c7cc] italic truncate">
            正在精心策划中...
          </p>
        </div>

        {/* Monthly Insight */}
        <div className="p-4 rounded-2xl bg-white shadow-soft flex flex-col">
          <p className="font-label text-[10px] text-[#8e8e93] mb-2">
            月度洞察
          </p>
          <p className="font-headline text-xs leading-relaxed text-[#1c1c1e] italic line-clamp-3">
            「{insight}」
          </p>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="flex items-center gap-2 p-1 bg-[#f2f2f7] rounded-xl">
        <button
          onClick={() => onChangeView('month')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium font-label transition-all rounded-lg
            ${view === 'month'
              ? 'bg-white text-[#1c1c1e] shadow-soft'
              : 'text-[#8e8e93] hover:text-[#1c1c1e]'
            }`}
        >
          <CalendarDays size={12} />
          月度视图
        </button>
        <button
          onClick={() => onChangeView('plan')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium font-label transition-all rounded-lg
            ${view === 'plan'
              ? 'bg-white text-[#1c1c1e] shadow-soft'
              : 'text-[#8e8e93] hover:text-[#1c1c1e]'
            }`}
        >
          <LayoutGrid size={12} />
          行程规划
        </button>
        <button
          onClick={onReportClick}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium font-label text-[#8e8e93] hover:text-[#1c1c1e] transition-colors"
        >
          <BarChart3 size={12} />
          报告
        </button>
      </div>
    </div>
  )
}
