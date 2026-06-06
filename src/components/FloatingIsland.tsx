import { useRef, useCallback, useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import CompactView from './CompactView'
import QuickBar from './QuickBar'
import ExpandedView from './ExpandedView'
import VoiceInput from './VoiceInput'

const ISLAND_WIDTH = 200
const ISLAND_HEIGHT = 44
const EDGE_MARGIN = 12
const SNAP_PADDING = 24

export default function FloatingIsland() {
  const { state, dispatch } = useApp()
  const { uiState, position } = state
  const [isPressing, setIsPressing] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const toggleCategoryPicker = useCallback(() => {
    setShowCategoryPicker(p => !p)
  }, [])
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const posStart = useRef({ x: 0, y: 0 })
  const elRef = useRef<HTMLDivElement>(null)
  const dragStartRect = useRef<{ left: number; top: number } | null>(null)

  // Initialize position
  useEffect(() => {
    if (position.x === 0 && position.y === 0) {
      dispatch({
        type: 'SET_POSITION',
        payload: {
          x: typeof window !== 'undefined' ? window.innerWidth - ISLAND_WIDTH - EDGE_MARGIN : 100,
          y: typeof window !== 'undefined' ? window.innerHeight - ISLAND_HEIGHT - EDGE_MARGIN - 80 : 100,
        },
      })
    }
  }, [position.x, position.y, dispatch])

  // 离开 bar 状态时自动收起分类面板
  useEffect(() => {
    if (uiState !== 'bar') {
      setShowCategoryPicker(false)
    }
  }, [uiState])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (uiState !== 'compact') return
    e.preventDefault()
    e.stopPropagation()
    setIsPressing(true)
    dragRef.current = false
    startX.current = e.clientX
    startY.current = e.clientY
    if (elRef.current) {
      const r = elRef.current.getBoundingClientRect()
      posStart.current = { x: r.left, y: r.top }
      dragStartRect.current = { left: r.left, top: r.top }
    } else {
      posStart.current = position
      dragStartRect.current = { left: position.x, top: position.y }
    }
    pressTimer.current = setTimeout(() => {
      dispatch({ type: 'SET_UI_STATE', payload: 'voice' })
      setIsPressing(false)
    }, 800)
  }, [uiState, position, dispatch])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pressTimer.current && (Math.abs(e.clientX - startX.current) > 5 || Math.abs(e.clientY - startY.current) > 5)) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
      dragRef.current = true
      setIsPressing(false)
    }
    if (dragRef.current && elRef.current) {
      elRef.current.style.transition = 'none'
      const dx = e.clientX - startX.current
      const dy = e.clientY - startY.current
      const nx = Math.max(EDGE_MARGIN, Math.min(posStart.current.x + dx, window.innerWidth - ISLAND_WIDTH - EDGE_MARGIN))
      const ny = Math.max(EDGE_MARGIN, Math.min(posStart.current.y + dy, window.innerHeight - ISLAND_HEIGHT - EDGE_MARGIN))
      elRef.current.style.left = nx + 'px'
      elRef.current.style.top = ny + 'px'
    }
  }, [])

  const snapToNearest = useCallback((): { x: number; y: number } => {
    if (!elRef.current) return { x: position.x, y: position.y }
    const rect = elRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const vw = window.innerWidth
    const vh = window.innerHeight

    const candidates: { x: number; y: number }[] = [
      { x: SNAP_PADDING,               y: SNAP_PADDING },
      { x: vw * 0.25,                  y: SNAP_PADDING },
      { x: vw * 0.5,                   y: SNAP_PADDING },
      { x: vw * 0.75,                   y: SNAP_PADDING },
      { x: vw - ISLAND_WIDTH - SNAP_PADDING, y: SNAP_PADDING },
      { x: SNAP_PADDING,               y: vh - ISLAND_HEIGHT - SNAP_PADDING },
      { x: vw * 0.25,                  y: vh - ISLAND_HEIGHT - SNAP_PADDING },
      { x: vw * 0.5,                   y: vh - ISLAND_HEIGHT - SNAP_PADDING },
      { x: vw * 0.75,                  y: vh - ISLAND_HEIGHT - SNAP_PADDING },
      { x: vw - ISLAND_WIDTH - SNAP_PADDING, y: vh - ISLAND_HEIGHT - SNAP_PADDING },
      { x: SNAP_PADDING,               y: vh * 0.35 },
      { x: SNAP_PADDING,               y: vh * 0.65 },
      { x: vw - ISLAND_WIDTH - SNAP_PADDING, y: vh * 0.35 },
      { x: vw - ISLAND_WIDTH - SNAP_PADDING, y: vh * 0.65 },
    ]

    const start = dragStartRect.current
    const moved = start ? Math.hypot(rect.left - start.left, rect.top - start.top) : 0
    if (moved < 8) return { x: rect.left, y: rect.top }

    let best = candidates[0]
    let bestDist = Infinity
    for (const c of candidates) {
      const d = Math.hypot(c.x - cx, c.y - cy)
      if (d < bestDist) {
        bestDist = d
        best = c
      }
    }
    return best
  }, [position])

  const handlePointerUp = useCallback((_e: React.PointerEvent) => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    if (elRef.current) {
      const snapped = snapToNearest()
      if (elRef.current) {
        elRef.current.style.transition = 'left 0.35s cubic-bezier(0.23, 1, 0.32, 1), top 0.35s cubic-bezier(0.23, 1, 0.32, 1)'
        elRef.current.style.left = snapped.x + 'px'
        elRef.current.style.top = snapped.y + 'px'
      }
      requestAnimationFrame(() => {
        dispatch({ type: 'SET_POSITION', payload: { x: snapped.x, y: snapped.y } })
      })
    }
    dragRef.current = false
    setIsPressing(false)
  }, [dispatch, snapToNearest])

  const handleExpand = useCallback(() => {
    if (uiState === 'compact' && !dragRef.current) {
      dispatch({ type: 'SET_UI_STATE', payload: 'bar' })
    }
  }, [uiState, dispatch])

  const handleCloseBar = useCallback(() => {
    setShowCategoryPicker(false)
    dispatch({ type: 'SET_UI_STATE', payload: 'compact' })
  }, [dispatch])

  if (uiState === 'voice') {
    return <VoiceInput />
  }

  return (
    <>
      {/* Expanded white panel — shown in bar + expanded states */}
      {(uiState === 'bar' || uiState === 'expanded') && <ExpandedView />}

      <div
        ref={elRef}
        className="fixed touch-none floating-island"
        style={{
          left: position.x,
          top: position.y,
          zIndex: 2147483647,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleExpand}
      >
        {uiState === 'compact' && <CompactView isPressing={isPressing} />}
        {uiState === 'bar' && (
          <QuickBar
            onClose={handleCloseBar}
            showPicker={showCategoryPicker}
            onTogglePicker={toggleCategoryPicker}
            onCategorySelect={(cat) => {
              window.dispatchEvent(new CustomEvent('island-add-category', { detail: cat }))
              dispatch({ type: 'SET_UI_STATE', payload: 'expanded' })
            }}
          />
        )}
      </div>
    </>
  )
}
