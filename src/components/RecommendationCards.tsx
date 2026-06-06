import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { getRecommendations, generatePlanFromTheme } from '../services/api'
import type { Recommendation } from '../types'
import { MOOD_OPTIONS } from '../types'

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
}

const CATEGORIES = ['全部', '户外', '运动', '娱乐', '文艺', '美食', '社交'] as const

export default function RecommendationCards() {
  const { state, dispatch } = useApp()
  const [fetching, setFetching] = useState(false)
  const [scene, setScene] = useState<'family' | 'friends'>('friends')
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>('全部')

  const { userProfile } = state
  const currentMood = MOOD_OPTIONS.find((m) => m.value === userProfile.mood)

  const handleGetRecommendations = async () => {
    setFetching(true)
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const res = await getRecommendations(scene, state.apiConfig, userProfile, state.location)
      if (!res.success || !res.data) {
        dispatch({ type: 'SET_ERROR', payload: res.message || '获取推荐失败' })
        return
      }
      dispatch({ type: 'SET_RECOMMENDATIONS', payload: res.data })
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', payload: e.message || '获取推荐失败' })
    } finally {
      setFetching(false)
    }
  }

  const filteredRecommendations = state.recommendations
    ? activeCategory === '全部'
      ? state.recommendations
      : state.recommendations.filter((rec: any) =>
          rec.category === activeCategory || rec.tags.some((t: string) => t.includes(activeCategory))
        )
    : []

  const handleSelect = async (rec: Recommendation) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    dispatch({ type: 'SET_SHOW_RECOMMENDATIONS', payload: false })

    dispatch({
      type: 'ADD_CHAT_MESSAGE',
      payload: {
        id: generateId(),
        role: 'user',
        content: `我想体验"${rec.title}"这个主题`,
        timestamp: Date.now(),
      },
    })
    dispatch({
      type: 'ADD_CHAT_MESSAGE',
      payload: {
        id: generateId(),
        role: 'agent',
        content: `好的，我为你安排"${rec.title}"主题的行程。`,
        timestamp: Date.now(),
      },
    })

    try {
      const planRes = await generatePlanFromTheme(
        rec,
        scene,
        2,
        state.apiConfig,
        state.location,
        state.mapConfig.amapKey
      )
      if (!planRes.success || !planRes.data) {
        dispatch({ type: 'SET_ERROR', payload: planRes.message || '生成计划失败' })
        dispatch({ type: 'SET_LOADING', payload: false })
        return
      }

      dispatch({ type: 'SET_PLAN', payload: planRes.data })
      dispatch({
        type: 'SET_INTENT',
        payload: {
          scene: planRes.data.scene,
          people: planRes.data.people || 2,
        },
      })
      dispatch({ type: 'SET_LOADING', payload: false })
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          id: generateId(),
          role: 'agent',
          content: `「${rec.title}」行程已生成，总预算 ¥${planRes.data.totalBudget}，距离 ${planRes.data.totalDistance}km\n\n点击下方「一键安排」即可预订。`,
          timestamp: Date.now(),
        },
      })
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', payload: e.message || '生成计划失败' })
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // Scene selector + fetch button (shown when no recommendations yet)
  if (!state.recommendations) {
    return (
      <div className="space-y-3 animate-fade-in">
        {/* User profile hint */}
        {userProfile.interests.length > 0 || userProfile.mood ? (
          <div className="flex items-center gap-2 p-2.5 border border-neutral-200 bg-neutral-50">
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              {currentMood && `现在心情：${currentMood.emoji} ${currentMood.label}`}
              {currentMood && userProfile.interests.length > 0 && ' · '}
              {userProfile.interests.length > 0 && `兴趣：${userProfile.interests.slice(0, 3).join('、')}`}
            </p>
          </div>
        ) : (
          <p className="text-xs text-neutral-400 text-center">
            不知道去哪？选一个场景，AI 根据你的偏好来推荐
          </p>
        )}

        {/* Scene toggle */}
        <div className="flex border border-neutral-200">
          <button
            onClick={() => setScene('friends')}
            className={`flex-1 py-2 text-xs font-medium transition-colors
              ${scene === 'friends'
                ? 'bg-neutral-800 text-white'
                : 'bg-white text-neutral-500 hover:bg-neutral-50'
              }`}
          >
            朋友聚会
          </button>
          <div className="w-px bg-neutral-200" />
          <button
            onClick={() => setScene('family')}
            className={`flex-1 py-2 text-xs font-medium transition-colors
              ${scene === 'family'
                ? 'bg-neutral-800 text-white'
                : 'bg-white text-neutral-500 hover:bg-neutral-50'
              }`}
          >
            家庭出游
          </button>
        </div>

        <button
          onClick={handleGetRecommendations}
          disabled={fetching}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-neutral-800
            hover:bg-neutral-700 text-white font-medium text-sm
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-opacity active:scale-[0.98]"
        >
          {fetching ? '正在灵感爆发...' : '获取 AI 推荐'}
        </button>
      </div>
    )
  }

  // Recommendation cards
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-500">
          为你推荐的玩法
        </p>
        <button
          onClick={() => {
            dispatch({ type: 'SET_RECOMMENDATIONS', payload: null })
            setScene(scene === 'friends' ? 'family' : 'friends')
          }}
          className="text-[11px] text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          换一批
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-2.5 py-1 text-[11px] transition-colors
              ${activeCategory === cat
                ? 'bg-neutral-800 text-white'
                : 'bg-transparent text-neutral-500 hover:text-neutral-700'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredRecommendations.map((rec) => (
          <button
            key={rec.id}
            onClick={() => handleSelect(rec)}
            className="w-full text-left p-3 border border-neutral-200 hover:border-neutral-400 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-neutral-900 truncate">
                  {rec.title}
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {rec.description}
                </p>
              </div>
              <span className="flex-shrink-0 text-[10px] px-2 py-0.5 border border-neutral-200 text-neutral-500">
                {rec.vibe}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[10px] text-neutral-400">
              <span>人均 ¥{rec.estimatedCost}</span>
              <div className="flex gap-1">
                {rec.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-neutral-400">{tag}</span>
                ))}
              </div>
            </div>
          </button>
        ))}
        {filteredRecommendations.length === 0 && (
          <p className="text-xs text-neutral-400 text-center py-4">该类别暂无推荐，试试其他类别？</p>
        )}
      </div>

      <button
        onClick={() => dispatch({ type: 'SET_SHOW_RECOMMENDATIONS', payload: false })}
        className="w-full py-2 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        取消，我自己输入
      </button>
    </div>
  )
}
