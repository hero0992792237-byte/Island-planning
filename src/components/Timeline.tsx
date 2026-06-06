import { useState, useCallback } from 'react'
import {
  MapPin, Clock, RotateCcw, BookMarked, Phone, Star,
  ExternalLink, UtensilsCrossed, ShoppingBag,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { executePlanSteps } from '../services/api'
import { syncPlanToJournal } from '../lib/journalDB'
import { openPage, tryOpenXiaohongshu, buildDianpingSearchUrl, getMobileXiaohongshuLink } from '../services/meituanHub'
import { buildMeituanDealUrl, openMeituanPage } from '../services/meituanApi'
import ExtraServices from './ExtraServices'
import ShoppingList from './ShoppingList'
import PlanDetailsPanel from './PlanDetailsPanel'
import MapView from './MapView'
import { NODE_TYPE_LABELS, NODE_TYPE_EMOJIS } from '../types'
import type { PlanNode } from '../types'

function formatTime(hours: number, minutes: number = 0): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}小时`
  return `${h}小时${m}分钟`
}

function calculateEndTime(start: string, durationHours: number): string {
  const [h, m] = start.split(':').map(Number)
  const totalMinutes = h * 60 + m + durationHours * 60
  return formatTime(Math.floor(totalMinutes / 60) % 24, totalMinutes % 60)
}

/** 计算每个节点的时间窗口 */
function computeNodeTimes(nodes: PlanNode[], startTime: string): Array<{ start: string; end: string }> {
  const times: Array<{ start: string; end: string }> = []
  let current = startTime
  for (const node of nodes) {
    const end = calculateEndTime(current, node.durationHours)
    times.push({ start: current, end })
    current = end
  }
  return times
}

/** 节点类型对应的自定义图片 */
const TYPE_ICON_MAP: Record<string, string> = {
  scenic: '/icons/scenic.png',
  restaurant: '/icons/restaurant.png',
  snack: '/icons/snack.png',
  walk: '/icons/walk.png',
  activity: '/icons/activity.png',
  coffee: '/icons/coffee.png',
  bar: '/icons/bar.png',
  shopping: '/icons/shopping.png',
  photo: '/icons/photo.png',
  transport: '/icons/transport.png',
  hotel: '/icons/hotel.png',
  rest: '/icons/rest.png',
}

function NodeIcon({ type }: { type: string }) {
  const iconPath = TYPE_ICON_MAP[type]
  if (iconPath) {
    return <img src={iconPath} alt="" className="w-6 h-6 object-contain" />
  }
  const emoji = NODE_TYPE_EMOJIS[type as keyof typeof NODE_TYPE_EMOJIS]
  if (emoji) return <span className="text-sm">{emoji}</span>
  return <span className="text-xs">📍</span>
}

/** 是否为美食类节点（可团购） */
function isFoodType(type: string): boolean {
  return ['restaurant', 'snack', 'coffee', 'bar'].includes(type)
}

export default function Timeline() {
  const { state, dispatch } = useApp()
  const { plan, intent, isLoading } = state
  const people = intent?.people || plan?.people || 2
  const [showAltIndex, setShowAltIndex] = useState<number | null>(null)
  const [synced, setSynced] = useState(false)

  if (!plan) return null

  const nodeTimes = computeNodeTimes(plan.nodes, plan.startTime)

  const handleSwitchAlt = useCallback((nodeIndex: number, alt: PlanNode) => {
    const newNodes = [...plan.nodes]
    newNodes[nodeIndex] = alt
    // 将原来的节点加入备选
    const oldNode = plan.nodes[nodeIndex]
    if (!alt.alternatives) alt.alternatives = []
    alt.alternatives = alt.alternatives.filter((a) => a.id !== oldNode.id)
    alt.alternatives.unshift(oldNode)
    // 保持最多3个备选
    alt.alternatives = alt.alternatives.slice(0, 3)
    dispatch({
      type: 'SET_PLAN',
      payload: { ...plan, nodes: newNodes },
    })
    setShowAltIndex(null)
  }, [dispatch, plan])

  const handleExecute = useCallback(async () => {
    if (!plan) return
    dispatch({ type: 'RESET_EXECUTION' })
    dispatch({ type: 'SET_EXECUTION_COMPLETE', payload: { complete: true, success: false } })

    const extraService = state.extraService?.enabled
      ? {
          enabled: true,
          type: state.extraService.type,
          deliveryTime: state.extraService.deliveryTime,
          message: state.extraService.message,
        }
      : null

    const success = await executePlanSteps(plan, people, extraService, (steps) => {
      dispatch({ type: 'SET_EXECUTION_STEPS', payload: steps })
    })

    dispatch({ type: 'SET_EXECUTION_COMPLETE', payload: { complete: true, success } })

    if (success) {
      syncPlanToJournal(plan)
      setSynced(true)
    }
  }, [dispatch, plan, people, state.extraService])

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET_ALL' })
    setSynced(false)
  }, [dispatch])

  const handleSyncToJournal = useCallback(() => {
    if (!plan) return
    syncPlanToJournal(plan)
    setSynced(true)
  }, [plan])

  return (
    <div className="space-y-5">
      {/* Metrics summary */}
      <div className="flex items-center justify-between px-4 py-3 border border-neutral-200">
        <span className="text-xs text-neutral-500">{plan.totalDistance}km</span>
        <span className="text-xs text-neutral-500">{plan.startTime}—{plan.endTime}</span>
        <span className="text-xs font-medium text-neutral-800">¥{plan.totalBudget}</span>
      </div>

      {/* Map View */}
      <MapView plan={plan} amapKey={state.mapConfig.amapKey} />

      {/* Timeline nodes */}
      <div className="relative">
        <div className="absolute left-[19px] top-3 bottom-3 w-px bg-neutral-200" />

        <div className="space-y-0">
          {plan.nodes.map((node, i) => {
            const time = nodeTimes[i]
            const label = NODE_TYPE_LABELS[node.type] || '节点'
            const price = node.pricePerPerson * people

            return (
              <div key={node.id} className="relative flex gap-4">
                {/* 图标 */}
                <div className="flex-shrink-0 z-10 w-10 h-10 flex items-center justify-center bg-white border border-neutral-200">
                  <NodeIcon type={node.type} />
                </div>

                <div className="flex-1 min-w-0 pb-5">
                  <div className="border border-neutral-200">
                    <div className="flex items-start justify-between gap-2 px-3 py-2.5">
                      <div className="min-w-0">
                        {/* 时间 */}
                        <p className="text-[11px] text-neutral-400 mb-0.5">
                          {time.start} - {time.end}
                        </p>

                        {/* 名称 */}
                        <h4 className="text-sm font-medium text-neutral-900 truncate">
                          {node.name}
                        </h4>

                        {/* 类型标签 */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-500">
                            {label}
                          </span>
                          {node.type === 'snack' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600">
                              必吃
                            </span>
                          )}
                          {node.category && node.category !== label && (
                            <span className="text-[10px] text-neutral-400">
                              {node.category}
                            </span>
                          )}
                        </div>

                        {/* 评分 */}
                        {node.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star size={10} className="text-amber-400 fill-amber-400" />
                            <span className="text-[11px] text-amber-600 font-medium">
                              {node.rating}分
                            </span>
                          </div>
                        )}

                        {/* 电话 */}
                        {node.phone && (
                          <a
                            href={`tel:${node.phone}`}
                            className="text-[11px] text-teal-600 flex items-center gap-0.5 mt-1 hover:text-teal-700 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={10} />
                            {node.phone}
                          </a>
                        )}

                        {/* 地址 */}
                        {node.location && (
                          <a
                            href={`https://uri.amap.com/search?keyword=${encodeURIComponent(node.name + ' ' + node.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1 hover:text-neutral-600 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MapPin size={10} />
                            <span className="truncate">{node.location}</span>
                          </a>
                        )}

                        {/* 团购/小红书按钮（美食类节点） */}
                        {isFoodType(node.type) && (node.meituanDealUrl || node.xiaohongshuUrl) && (
                          <div className="flex items-center gap-2 mt-1.5">
                            {node.meituanDealUrl && (
                              <button
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-[#FF6633] text-white font-medium hover:bg-[#E55A2B] transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const city = node.location.split(/[市区]/)[0] || '南京'
                                  const h5Url = buildDianpingSearchUrl(node.name, city)
                                  openPage(h5Url)
                                }}
                              >
                                {node.type === 'snack' ? <ShoppingBag size={10} /> : <UtensilsCrossed size={10} />}
                                {node.type === 'snack' ? '搜点评' : '大众点评'}
                                <ExternalLink size={9} />
                              </button>
                            )}
                            {node.xiaohongshuUrl && (
                              <button
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-[#FF2442] text-white font-medium hover:bg-[#e0203b] transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const { appScheme, h5Url } = getMobileXiaohongshuLink(node.name)
                                  tryOpenXiaohongshu(appScheme, h5Url)
                                }}
                              >
                                小红书
                                <ExternalLink size={9} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 换一个按钮 */}
                      {node.alternatives && node.alternatives.length > 0 && (
                        <button
                          onClick={() => setShowAltIndex(showAltIndex === i ? null : i)}
                          className="flex-shrink-0 p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors"
                          title="换一个"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>

                    {/* 时长和价格 */}
                    <div className="flex items-center gap-3 px-3 py-2 border-t border-neutral-100 text-[11px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {formatDuration(node.durationHours)}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-neutral-800">
                        {price === 0 ? '免费' : `¥${price}`}
                      </span>
                    </div>
                  </div>

                  {/* Alternatives */}
                  {showAltIndex === i && node.alternatives && (
                    <div className="mt-2 space-y-1.5 animate-fade-in">
                      <p className="text-xs text-neutral-400 mb-1">换一个：</p>
                      {node.alternatives.map((alt) => (
                        <button
                          key={alt.id}
                          onClick={() => handleSwitchAlt(i, alt)}
                          className="w-full text-left px-3 py-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 transition-colors"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="min-w-0">
                              <span className="text-sm text-neutral-700">{alt.name}</span>
                              {alt.rating && (
                                <span className="ml-1.5 text-[10px] text-amber-600">
                                  ★ {alt.rating}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-neutral-500 font-medium flex-shrink-0 ml-2">
                              {alt.pricePerPerson === 0 ? '免费' : `¥${alt.pricePerPerson * people}`}
                            </span>
                          </div>
                          {alt.phone && (
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={`tel:${alt.phone}`}
                                className="text-[10px] text-teal-600 flex items-center gap-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone size={9} />
                                {alt.phone}
                              </a>
                              {alt.meituanDealUrl && (
                                <button
                                  className="text-[10px] text-[#FF6633] bg-[#333] px-1.5 py-0.5 flex items-center gap-0.5"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const altCity = alt.location.split(/[市区]/)[0] || '南京'
                                    const h5Url = buildMeituanDealUrl(alt.name, altCity)
                                    openMeituanPage(h5Url)
                                  }}
                                >
                                  点评
                                  <ExternalLink size={8} />
                                </button>
                              )}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Plan Details */}
      {plan.details && <PlanDetailsPanel details={plan.details} city={plan.nodes[0]?.location?.split(/[市区]/)[0] || '南京'} />}

      {/* Shopping List */}
      {plan.shoppingList && plan.shoppingList.length > 0 && (
        <ShoppingList items={plan.shoppingList} />
      )}

      {/* Extra Services */}
      <ExtraServices />

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {state.executionSuccess ? (
          synced ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-neutral-300 bg-neutral-50">
              <BookMarked size={14} className="text-neutral-500" />
              <span className="text-sm font-medium text-neutral-800">已同步到行程记录</span>
            </div>
          ) : (
            <button
              onClick={handleSyncToJournal}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#1a1a1a] text-white font-medium text-sm hover:opacity-90 transition-opacity min-h-[44px]"
            >
              <BookMarked size={14} />
              同步到行程记录
            </button>
          )
        ) : (
          <button
            onClick={handleExecute}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-neutral-800 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity min-h-[44px]"
          >
            一键安排
          </button>
        )}

        <button
          onClick={handleReset}
          className="px-5 py-3 border border-neutral-200 text-neutral-500 text-sm font-medium transition-colors min-h-[44px]"
        >
          重新规划
        </button>
      </div>
    </div>
  )
}
