import { useEffect, useRef, useCallback, useState } from 'react'
import { Mic, X, Loader2, Square, MicOff } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

function Waveform() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] bg-white rounded-full animate-wave"
          style={{
            height: '16%',
            animationDelay: `${i * 0.07}s`,
            animationDuration: `${0.5 + Math.random() * 0.3}s`,
          }}
        />
      ))}
    </div>
  )
}

function VoiceInputInner() {
  const { dispatch, hideVoiceInput } = useApp()
  const {
    isListening,
    transcript,
    error,
    permission,
    startListening,
    stopListening,
    reset,
    hasSupport,
    requestPermission,
  } = useSpeechRecognition()
  const stoppingRef = useRef(false)
  const [requesting, setRequesting] = useState(false)

  // Auto-start only if permission is already granted
  useEffect(() => {
    if (hasSupport && permission === 'granted') {
      startListening()
    }
    return () => stopListening()
  }, [hasSupport, permission, startListening, stopListening])

  // When recognition naturally stops and we have text, fill it into input box
  useEffect(() => {
    if (!isListening && transcript && !stoppingRef.current) {
      // Fill recognized text into input box and close voice modal
      dispatch({ type: 'SET_VOICE_INPUT_TEXT', payload: transcript })
      dispatch({ type: 'SET_UI_STATE', payload: 'expanded' })
    }
  }, [isListening, transcript, dispatch])

  const handleStop = useCallback(() => {
    stoppingRef.current = true
    if (transcript.trim()) {
      // Fill text into input box and close voice modal
      dispatch({ type: 'SET_VOICE_INPUT_TEXT', payload: transcript })
      dispatch({ type: 'SET_UI_STATE', payload: 'expanded' })
    } else {
      stopListening()
      reset()
      hideVoiceInput()
    }
  }, [transcript, dispatch, stopListening, reset, hideVoiceInput])

  // ESC key to stop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleStop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleStop])

  // Request permission handler
  const handleRequestPermission = useCallback(async () => {
    setRequesting(true)
    const granted = await requestPermission()
    setRequesting(false)
    if (granted) {
      startListening()
    }
  }, [requestPermission, startListening])

  if (!hasSupport) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={handleStop} />
        <div className="relative w-[300px] p-6 bg-white border border-neutral-200">
          <button onClick={handleStop} className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-800 transition-colors">
            <X size={16} />
          </button>
          <Mic size={32} className="mx-auto mb-3 text-neutral-300" />
          <p className="text-sm text-neutral-600 text-center">当前浏览器不支持语音识别</p>
          <p className="text-xs text-neutral-400 text-center mt-1">请使用 Chrome 或 Safari</p>
        </div>
      </div>
    )
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={handleStop} />
        <div className="relative w-[320px] p-6 bg-white border border-neutral-200">
          <button onClick={handleStop} className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-800 transition-colors">
            <X size={16} />
          </button>
          <MicOff size={32} className="mx-auto mb-3 text-red-400" />
          <p className="text-sm text-neutral-800 text-center font-medium">麦克风权限被拒绝</p>
          <p className="text-xs text-neutral-500 text-center mt-2 leading-relaxed">
            请在浏览器设置中允许麦克风权限：
          </p>
          <div className="mt-3 p-3 bg-neutral-50 text-xs text-neutral-600 leading-relaxed space-y-1">
            <p><strong>iPhone Safari:</strong> 设置 → Safari → 麦克风 → 允许</p>
            <p><strong>Android Chrome:</strong> 设置 → 网站设置 → 麦克风 → 允许</p>
          </div>
          <button
            onClick={handleRequestPermission}
            className="w-full mt-4 py-2.5 bg-neutral-800 text-white text-sm font-medium hover:bg-neutral-700 transition-colors"
          >
            重新请求权限
          </button>
        </div>
      </div>
    )
  }

  // Permission prompt - need user to grant
  if (permission === 'prompt' || permission === 'unknown') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={handleStop} />
        <div className="relative w-[300px] p-6 bg-white border border-neutral-200">
          <button onClick={handleStop} className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-800 transition-colors">
            <X size={16} />
          </button>
          <Mic size={32} className="mx-auto mb-3 text-neutral-600" />
          <p className="text-sm text-neutral-800 text-center font-medium">需要使用麦克风</p>
          <p className="text-xs text-neutral-500 text-center mt-2">语音识别需要访问您的麦克风</p>
          <button
            onClick={handleRequestPermission}
            disabled={requesting}
            className="w-full mt-4 py-2.5 bg-neutral-800 text-white text-sm font-medium hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            {requesting ? '请求中...' : '允许使用麦克风'}
          </button>
          <p className="text-[10px] text-neutral-400 text-center mt-2">麦克风数据仅用于语音识别，不会上传服务器</p>
        </div>
      </div>
    )
  }

  const isProcessing = !isListening && transcript && !error

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={handleStop} />

      <div
        className="relative w-[300px] bg-white border border-neutral-200 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <span className="text-sm font-medium text-neutral-800">
            {isListening ? '正在录音' : isProcessing ? '识别中' : '语音输入'}
          </span>
          <button
            onClick={handleStop}
            className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-medium transition-colors"
          >
            <Square size={10} fill="white" />
            停止
          </button>
        </div>

        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 mx-auto flex items-center justify-center transition-all bg-neutral-100">
            {isListening ? (
              <Waveform />
            ) : isProcessing ? (
              <Loader2 size={24} className="text-neutral-400 animate-spin" />
            ) : (
              <Mic size={24} className="text-neutral-400" />
            )}
          </div>

          {transcript && (
            <p className="text-sm text-neutral-600 px-4 leading-relaxed">"{transcript}"</p>
          )}

          {error && <p className="text-xs text-red-500 px-4">{error}</p>}

          {isListening && !transcript && (
            <p className="text-xs text-neutral-400">说话中，识别结果将填入输入框</p>
          )}

          {!isListening && !transcript && !error && (
            <p className="text-xs text-neutral-400">点击下方按钮开始录音</p>
          )}

          <button
            onClick={() => { reset(); startListening() }}
            className="px-4 py-2 text-sm text-neutral-600 border border-neutral-300 hover:bg-neutral-50 transition-colors"
          >
            重新录音
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VoiceInput() {
  const { state } = useApp()
  if (state.uiState !== 'voice') return null
  return <VoiceInputInner />
}
