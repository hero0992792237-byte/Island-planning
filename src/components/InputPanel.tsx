import { useState, useRef, useEffect } from 'react'
import { Send, Mic } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { chatWithAgent, generatePlanFromConversation } from '../services/api'
import RecommendationCards from './RecommendationCards'
import VoiceInput from './VoiceInput'
import type { ChatMessage } from '../types'

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
}

const WELCOME_CONTENT =
  '你好，我是迹划。\n\n告诉我你的出行需求，比如人数和场景，我会帮你规划行程。'

function createWelcomeMessage(): ChatMessage {
  return {
    id: generateId(),
    role: 'agent',
    content: WELCOME_CONTENT,
    timestamp: Date.now(),
  }
}

export default function InputPanel() {
  const { state, dispatch } = useApp()
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [state.chatHistory, state.isLoading])

  // Fill voice input text into textarea
  useEffect(() => {
    if (state.voiceInputText) {
      setText(state.voiceInputText)
      dispatch({ type: 'SET_VOICE_INPUT_TEXT', payload: '' })
      // Focus textarea after voice input
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [state.voiceInputText, dispatch])

  // Init welcome
  useEffect(() => {
    if (
      state.chatHistory.length === 0 ||
      !state.chatHistory.some(
        (msg) => msg.role === 'agent' && msg.content === WELCOME_CONTENT
      )
    ) {
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: createWelcomeMessage() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addMessage = (role: ChatMessage['role'], content: string) => {
    dispatch({
      type: 'ADD_CHAT_MESSAGE',
      payload: { id: generateId(), role, content, timestamp: Date.now() },
    })
  }

  const handleSend = async () => {
    if (!text.trim() || state.isLoading) return
    const userText = text.trim()
    setText('')

    addMessage('user', userText)
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const reply = await chatWithAgent(state.chatHistory, userText, state.apiConfig)
      addMessage('agent', reply)
    } catch (e: any) {
      addMessage('agent', `抱歉，出错了：${e.message || '未知错误'}。请检查 API 设置。`)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const handleGenerate = async () => {
    if (state.isLoading) return
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const planRes = await generatePlanFromConversation(state.chatHistory, state.apiConfig, state.location, state.mapConfig.amapKey)
      if (!planRes.success || !planRes.data) {
        addMessage('agent', planRes.message || '生成计划失败，请重试')
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
      addMessage(
        'agent',
        `行程已生成！总预算 ¥${planRes.data.totalBudget}，距离 ${planRes.data.totalDistance}km\n\n点击下方「一键安排」即可预订。`
      )
    } catch (e: any) {
      addMessage('agent', `生成计划失败：${e.message || '未知错误'}`)
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleShowRecommendations = () => {
    dispatch({ type: 'SET_SHOW_RECOMMENDATIONS', payload: true })
    dispatch({ type: 'SET_RECOMMENDATIONS', payload: null })
  }

  const handleVoiceInput = () => {
    dispatch({ type: 'SET_UI_STATE', payload: 'voice' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Voice input modal */}
      <VoiceInput />

      {/* Chat history */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pb-4"
      >
        {state.chatHistory.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center overflow-hidden">
              {msg.role === 'agent' ? (
                <img src="/logo.png" alt="迹划" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-200 text-neutral-500 text-[10px]">
                  我
                </div>
              )}
            </div>

            {/* Bubble */}
            <div className={`
              max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
              ${msg.role === 'agent'
                ? 'bg-white border border-neutral-200 text-neutral-800'
                : 'bg-neutral-800 text-white'
              }
            `}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {state.isLoading && (
          <div className="flex gap-2">
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="迹划" className="w-full h-full object-cover" />
            </div>
            <div className="bg-white border border-neutral-200 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recommendations or Input area */}
      {state.showRecommendations ? (
        <div className="flex-shrink-0 pt-2">
          <RecommendationCards />
        </div>
      ) : (
        <div className="flex-shrink-0 pt-2 space-y-2">
          {/* Inspiration button */}
          <button
            onClick={handleShowRecommendations}
            disabled={state.isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-neutral-300
              text-neutral-800 font-medium text-sm
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-opacity active:scale-[0.98]"
          >
            不知道去哪？让 AI 推荐
          </button>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={state.isLoading || state.chatHistory.length < 2}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-800
              hover:bg-neutral-700 text-white font-medium text-sm
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-opacity active:scale-[0.98]"
          >
            生成计划
          </button>

          {/* Text input */}
          <div className="flex items-end gap-2 p-2 border border-neutral-200">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="和迹划聊聊你的出行计划..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-neutral-800
                placeholder:text-neutral-400
                resize-none outline-none min-h-[24px] max-h-[80px] py-1.5 px-1"
              style={{ overflow: 'hidden' } as React.CSSProperties}
            />

            {/* Voice input button */}
            <button
              onClick={handleVoiceInput}
              disabled={state.isLoading}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center
                bg-transparent border border-neutral-300
                text-neutral-500 hover:text-neutral-800 hover:border-neutral-500
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors"
              aria-label="语音输入"
              title="语音输入"
            >
              <Mic size={15} />
            </button>

            <button
              onClick={handleSend}
              disabled={!text.trim() || state.isLoading}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center
                bg-neutral-800 hover:bg-neutral-700
                disabled:bg-neutral-200
                text-white disabled:text-neutral-400
                transition-colors"
              aria-label="发送"
            >
              <Send size={15} />
            </button>
          </div>

          <p className="text-center text-[11px] text-neutral-400">
            {state.apiConfig.enabled ? 'LLM Agent 模式' : 'Mock Agent 模式'} · 按 Enter 发送
          </p>
        </div>
      )}
    </div>
  )
}
