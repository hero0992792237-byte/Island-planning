import { useRef, useEffect, useCallback, useState } from 'react'
import { X, Loader2, Settings, User, Heart, LogIn } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { signOut } from '../services/supabase'
import InputPanel from './InputPanel'
import Timeline from './Timeline'
import ExecutionProgress from './ExecutionProgress'
import SettingsPanel from './SettingsPanel'
import UserProfilePanel from './UserProfilePanel'
import AuthModal from './AuthModal'
import UserCenterModal from './UserCenterModal'

export default function ExpandedView() {
  const { state, dispatch, collapseIsland } = useApp()
  const { plan, isLoading, executionComplete, error, apiConfig } = state
  const cardRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const touchCurrentY = useRef(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showUserCenter, setShowUserCenter] = useState(false)
  const { userAuth } = state

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if any modal is open
      if (showSettings || showProfile || showAuth || showUserCenter) return
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        collapseIsland()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [collapseIsland, showSettings, showProfile, showAuth, showUserCenter])

  const handleClose = () => {
    collapseIsland()
  }

  // Swipe down to close (mobile)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchCurrentY.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY
    const diff = touchCurrentY.current - touchStartY.current
    if (diff > 0 && cardRef.current) {
      cardRef.current.style.transform = `translateY(${diff * 0.5}px)`
      cardRef.current.style.transition = 'none'
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const diff = touchCurrentY.current - touchStartY.current
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.2s ease-out'
      if (diff > 80) {
        // Swipe down → close
        cardRef.current.style.transform = 'translateY(100%)'
        setTimeout(() => collapseIsland(), 200)
      } else if (diff < -80 && state.uiState === 'bar') {
        // Swipe up → bar → expanded
        cardRef.current.style.transform = 'translateY(0)'
        dispatch({ type: 'SET_UI_STATE', payload: 'expanded' })
      } else {
        cardRef.current.style.transform = 'translateY(0)'
      }
    }
  }, [collapseIsland, state.uiState, dispatch])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-end sm:justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/15 animate-fade-in"
        onClick={handleClose}
      />

      {/* Card */}
      <div
        ref={cardRef}
        className="
          relative w-full sm:w-[360px]
          max-h-[85vh] sm:max-h-[70vh]
          bg-white
          border border-neutral-200
          rounded-t-[24px] sm:rounded-[24px]
          overflow-hidden flex flex-col
          animate-slide-up sm:animate-scale-in
          mr-0 sm:mr-4 mb-0 sm:mb-4
          pb-safe
        "
      >
        {/* Drag handle (mobile only) - with swipe gesture */}
        <div
          className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 sm:py-4 border-b border-neutral-100 flex-shrink-0 sm:touch-auto touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center gap-2">
            <div className={`
              w-7 h-7 rounded-full flex items-center justify-center text-xs
              bg-neutral-100 text-neutral-500
            `}>
              {plan?.scene === 'friends' ? '友' : '家'}
            </div>
            <span className="text-sm font-medium text-neutral-800">
              {plan?.scene === 'friends' ? '朋友聚会' : plan?.scene === 'family' ? '家庭出游' : '迹划'}
            </span>
            {apiConfig.enabled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                AI
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (userAuth.isLoggedIn) {
                  setShowUserCenter(true)
                } else {
                  setShowAuth(true)
                }
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center
                text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100
                transition-colors"
              aria-label="个人中心"
              title="个人中心"
            >
              <User size={15} />
            </button>
            <button
              onClick={() => setShowProfile(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center
                text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100
                transition-colors"
              aria-label="我的偏好"
              title="我的偏好"
            >
              <Heart size={15} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center
                text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100
                transition-colors"
              aria-label="设置"
              title="设置"
            >
              <Settings size={15} />
            </button>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full flex items-center justify-center
                text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100
                transition-colors"
              aria-label="关闭"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-5">
          {(state.uiState === 'bar' || state.uiState === 'expanded') && (
            <div
              className="mb-2 py-2 text-center text-[11px] text-neutral-400 select-none cursor-pointer hover:text-neutral-600 transition-colors"
              onClick={() => {
                dispatch({ type: 'SET_UI_STATE', payload: 'expanded' })
              }}
            >
              ↑ 向上滑动或点击展开完整面板
            </div>
          )}
          {/* 访客模式提示 */}
          {!userAuth.isLoggedIn ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
                <LogIn size={28} className="text-neutral-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-800">请先登录</p>
                <p className="text-xs text-neutral-400 mt-1">登录后即可使用 AI 行程规划功能</p>
              </div>
              <button
                onClick={() => setShowAuth(true)}
                className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium transition-colors"
              >
                立即登录
              </button>
            </div>
          ) : (
            <>
              {/* Input Panel */}
              {!plan && !executionComplete && <InputPanel />}

              {/* Loading */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={32} className="text-indigo-500 animate-spin mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">正在规划行程...</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Timeline */}
              {plan && !executionComplete && <Timeline />}

              {/* Execution Progress */}
              {plan && executionComplete && <ExecutionProgress />}
            </>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* User Profile Panel */}
      {showProfile && <UserProfilePanel onClose={() => setShowProfile(false)} />}

      {/* Auth Modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* User Center Modal */}
      {showUserCenter && userAuth.isLoggedIn && (
        <UserCenterModal
          onClose={() => setShowUserCenter(false)}
          onLogout={async () => {
            await signOut()
            dispatch({ type: 'LOGOUT' })
            setShowUserCenter(false)
          }}
        />
      )}
    </div>
  )
}
