import { X, Wallet, Route, Briefcase, GraduationCap, Plane } from 'lucide-react'
import type { JournalEntry } from '../../types'
import { CATEGORY_CONFIG } from './CategoryBadge'
import { calculateTotalDistance, getDistanceFunFact } from '../../lib/geo'

interface Props {
  entries: JournalEntry[]
  year: number
  month: number
  onClose: () => void
}

export default function MonthlyReportModal({ entries, year, month, onClose }: Props) {
  const totalCost = entries.reduce((sum, e) => sum + (e.cost || 0), 0)
  const totalDistance = calculateTotalDistance(entries)

  const categoryBreakdown: Record<string, { label: string; cost: number; hex: string; lightHex: string; icon: typeof Briefcase }> = {
    work: { label: '工作', cost: 0, hex: CATEGORY_CONFIG.work.hex, lightHex: CATEGORY_CONFIG.work.lightHex, icon: Briefcase },
    study: { label: '学习', cost: 0, hex: CATEGORY_CONFIG.study.hex, lightHex: CATEGORY_CONFIG.study.lightHex, icon: GraduationCap },
    travel: { label: '旅行', cost: 0, hex: CATEGORY_CONFIG.travel.hex, lightHex: CATEGORY_CONFIG.travel.lightHex, icon: Plane },
  }

  for (const entry of entries) {
    if (categoryBreakdown[entry.category]) {
      categoryBreakdown[entry.category].cost += entry.cost || 0
    }
  }

  const categories = Object.entries(categoryBreakdown)
    .filter(([, v]) => v.cost > 0)
    .sort((a, b) => b[1].cost - a[1].cost)

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  const pieGradient = (() => {
    if (totalCost === 0) return 'conic-gradient(#f2f2f7 0% 100%)'
    let start = 0
    const stops: string[] = []
    for (const [, data] of categories) {
      const pct = (data.cost / totalCost) * 100
      stops.push(`${data.hex} ${start}% ${start + pct}%`)
      start += pct
    }
    return `conic-gradient(${stops.join(', ')})`
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full sm:w-[400px] max-h-[90vh] bg-[#fafafa] sm:rounded-2xl rounded-t-2xl shadow-2xl animate-slide-up flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white flex-shrink-0">
          <h3 className="font-headline text-base font-semibold text-[#1c1c1e]">
            {year}年{monthNames[month - 1]} 行程报告
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#c7c7cc] hover:text-[#1c1c1e] transition-colors rounded-full hover:bg-[#f2f2f7]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 scrollbar-hide">
          {/* 核心数据 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-[#eef2ff] flex items-center justify-center">
                  <Wallet size={14} className="text-[#4A7BF7]" />
                </div>
                <span className="font-label text-[10px] text-[#8e8e93]">本月消费</span>
              </div>
              <div className="font-headline text-2xl font-semibold text-[#1c1c1e]">
                ¥{totalCost.toLocaleString()}
              </div>
              <div className="font-label text-[10px] text-[#c7c7cc] mt-1">
                共 {entries.length} 个行程
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-[#eef2ff] flex items-center justify-center">
                  <Route size={14} className="text-[#4A7BF7]" />
                </div>
                <span className="font-label text-[10px] text-[#8e8e93]">累计里程</span>
              </div>
              <div className="font-headline text-2xl font-semibold text-[#1c1c1e]">
                {totalDistance} <span className="text-sm font-normal text-[#8e8e93]">km</span>
              </div>
              <div className="font-label text-[10px] text-[#c7c7cc] mt-1">
                基于GPS坐标计算
              </div>
            </div>
          </div>

          {/* 趣味对比 */}
          {totalDistance > 0 && (
            <div className="bg-white rounded-2xl shadow-soft p-4 text-sm text-[#8e8e93] leading-relaxed italic font-headline">
              {getDistanceFunFact(totalDistance)}
            </div>
          )}

          {/* 分类消费饼图 */}
          {totalCost > 0 && (
            <div className="bg-white rounded-2xl shadow-soft p-4">
              <h4 className="font-label text-[10px] text-[#8e8e93] mb-4">
                分类消费占比
              </h4>
              <div className="flex items-center gap-5">
                <div
                  className="w-20 h-20 rounded-full flex-shrink-0"
                  style={{ background: pieGradient }}
                />
                <div className="flex-1 space-y-3">
                  {categories.map(([key, data]) => {
                    const pct = ((data.cost / totalCost) * 100).toFixed(1)
                    const Icon = data.icon
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-md flex-shrink-0"
                            style={{ backgroundColor: data.hex }}
                          />
                          <Icon size={12} className="text-[#c7c7cc]" />
                          <span className="font-label text-xs text-[#8e8e93]">{data.label}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-label text-xs font-medium text-[#1c1c1e]">¥{data.cost}</div>
                          <div className="font-label text-[10px] text-[#c7c7cc]">{pct}%</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 无数据提示 */}
          {totalCost === 0 && entries.length === 0 && (
            <div className="text-center py-6">
              <p className="font-headline text-sm text-[#8e8e93]">本月暂无行程记录</p>
              <p className="font-label text-xs text-[#c7c7cc] mt-1">添加行程后将自动生成报告</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
