import {
  CheckCircle, Loader2, AlertCircle, ArrowLeft, X,
  BookMarked, Phone, UtensilsCrossed, ExternalLink,
  ShoppingBag, Coffee, Wine,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { openPage, buildDianpingSearchUrl } from '../services/meituanHub'
import { NODE_TYPE_EMOJIS, NODE_TYPE_LABELS } from '../types'

export default function ExecutionProgress() {
  const { state, dispatch, collapseIsland } = useApp()
  const { executionSteps, executionSuccess, plan } = state

  const handleBackToPlan = () => {
    dispatch({ type: 'RESET_EXECUTION' })
  }

  const handleClose = () => {
    collapseIsland()
  }

  if (!plan) return null

  // 筛选出有预订信息的节点（有电话或可团购的）
  const bookableNodes = plan.nodes.filter(
    (n) => n.phone || n.meituanDealUrl || n.meituanUrl
  )

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Title */}
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center">
          <CheckCircle size={32} className="text-neutral-800" />
        </div>
        <h3 className="text-base font-medium text-neutral-900">
          {executionSuccess ? '全部搞定' : '部分完成'}
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          {executionSuccess
            ? '预订已确认，祝你玩得开心'
            : '部分预订未完成，可以返回修改'}
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {executionSteps.map((step) => (
          <div
            key={step.id}
            className={`
              flex items-center gap-3 px-3 py-2.5 border transition-colors
              ${step.status === 'success'
                ? 'bg-neutral-50 border-neutral-200'
                : step.status === 'failed'
                  ? 'bg-neutral-50 border-neutral-200'
                  : step.status === 'running'
                    ? 'bg-neutral-50 border-neutral-200'
                    : 'bg-white border-neutral-100'
              }
            `}
          >
            <div className="flex-shrink-0">
              {step.status === 'success' && <CheckCircle size={18} className="text-neutral-400" />}
              {step.status === 'running' && <Loader2 size={18} className="text-neutral-400 animate-spin" />}
              {step.status === 'failed' && <AlertCircle size={18} className="text-neutral-500" />}
              {step.status === 'pending' && <div className="w-4 h-4 rounded-full border border-neutral-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${step.status !== 'pending' ? 'text-neutral-700' : 'text-neutral-400'}`}>
                {step.name}
              </p>
              {step.message && (
                <p className="text-[11px] text-neutral-400 mt-0.5 truncate">{step.message}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Success info */}
      {executionSuccess && (
        <div className="space-y-3">
          {/* 预订信息 - 遍历所有可预订节点 */}
          {bookableNodes.length > 0 && (
            <div className="px-4 py-3 border border-neutral-200 space-y-3">
              <p className="text-xs font-medium text-neutral-600 text-center">预订信息</p>

              {bookableNodes.map((node) => {
                const city = node.location.split(/[市区]/)[0] || '南京'
                const emoji = NODE_TYPE_EMOJIS[node.type] || '📍'
                const label = NODE_TYPE_LABELS[node.type] || '节点'

                return (
                  <div key={node.id} className="space-y-1.5">
                    <p className="text-[11px] text-neutral-400">
                      {emoji} {node.name} · {label}
                    </p>
                    {node.phone && (
                      <a
                        href={`tel:${node.phone}`}
                        className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 px-3 py-2 hover:bg-teal-100 transition-colors"
                      >
                        <Phone size={13} />
                        <span className="font-medium">{node.phone}</span>
                        <span className="text-[10px] text-teal-500 ml-auto">点击拨打</span>
                      </a>
                    )}
                    {node.meituanDealUrl && (
                      <button
                        onClick={() => {
                          const h5Url = buildDianpingSearchUrl(node.name, city)
                          openPage(h5Url)
                        }}
                        className="w-full flex items-center gap-1.5 text-xs text-white bg-[#FF6633] px-3 py-2 hover:bg-[#E55A2B] transition-colors"
                      >
                        {node.type === 'snack' ? <ShoppingBag size={13} /> :
                         node.type === 'coffee' ? <Coffee size={13} /> :
                         node.type === 'bar' ? <Wine size={13} /> :
                         <UtensilsCrossed size={13} />}
                        <span className="font-medium">
                          {node.type === 'snack' ? '搜团购' :
                           node.type === 'coffee' ? '美团咖啡' :
                           node.type === 'bar' ? '点评酒吧' : '大众点评'}
                        </span>
                        <ExternalLink size={11} className="ml-auto" />
                      </button>
                    )}
                    {node.meituanUrl && !node.meituanDealUrl && (
                      <button
                        onClick={() => {
                          const h5Url = buildDianpingSearchUrl(node.name, city)
                          openPage(h5Url)
                        }}
                        className="w-full flex items-center gap-1.5 text-xs text-neutral-700 bg-neutral-100 px-3 py-2 hover:bg-neutral-200 transition-colors"
                      >
                        <ExternalLink size={13} />
                        <span className="font-medium">美团搜索</span>
                        <ExternalLink size={11} className="ml-auto" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* 行程摘要 */}
          <div className="px-4 py-3 border border-neutral-200 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5">
              <BookMarked size={14} className="text-[#2AA8A8]" />
              <span className="text-xs text-[#2AA8A8] font-medium">已自动同步到行程记录</span>
            </div>
            <p className="text-sm text-neutral-700">
              总预算 <span className="font-medium text-neutral-900">¥{plan.totalBudget}</span>
            </p>
            <p className="text-[11px] text-neutral-400">
              距离 {plan.totalDistance}km · {plan.nodes.length}个节点
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={handleBackToPlan}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-neutral-200
            text-neutral-700 font-medium text-sm
            hover:bg-neutral-50 transition-colors min-h-[44px]"
        >
          <ArrowLeft size={15} />
          返回查看行程
        </button>

        <button
          onClick={handleClose}
          className="w-full flex items-center justify-center gap-2 py-3 px-4
            text-neutral-400 font-medium text-sm
            hover:text-neutral-600 transition-colors"
        >
          <X size={15} />
          关闭
        </button>
      </div>
    </div>
  )
}
