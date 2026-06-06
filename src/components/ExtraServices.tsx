import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function ExtraServices() {
  const { state, dispatch } = useApp()
  const [expanded, setExpanded] = useState(false)
  const [selectedType, setSelectedType] = useState<'flowers' | 'cake' | 'delivery'>('flowers')
  const [deliveryTime, setDeliveryTime] = useState('19:00')
  const [message, setMessage] = useState('')
  const [enabled, setEnabled] = useState(false)

  const restaurantName = state.plan?.restaurant.name || ''
  // Meituan Waimai (food delivery) search URL
  const meituanUrl = restaurantName
    ? `https://waimai.meituan.com/search?keyword=${encodeURIComponent(restaurantName)}`
    : 'https://waimai.meituan.com'
  // Meituan group-buy search URL
  const meituanGroupUrl = restaurantName
    ? `https://www.meituan.com/s/${encodeURIComponent(restaurantName)}/`
    : 'https://www.meituan.com'

  const handleToggle = () => {
    setEnabled(!enabled)
    if (!enabled) {
      const labels: Record<string, string> = {
        flowers: '送鲜花到餐厅',
        cake: '订儿童蛋糕',
        delivery: '美团外卖',
      }
      const prices: Record<string, number> = {
        flowers: 168,
        cake: 198,
        delivery: 0,
      }
      dispatch({
        type: 'SET_EXTRA_SERVICE',
        payload: {
          type: selectedType,
          label: labels[selectedType],
          price: prices[selectedType],
          enabled: true,
          deliveryTime,
          message,
        },
      })
    } else {
      dispatch({ type: 'SET_EXTRA_SERVICE', payload: null })
    }
  }

  const handleTypeChange = (type: 'flowers' | 'cake' | 'delivery') => {
    setSelectedType(type)
    if (enabled) {
      const labels: Record<string, string> = {
        flowers: '送鲜花到餐厅',
        cake: '订儿童蛋糕',
        delivery: '美团外卖',
      }
      const prices: Record<string, number> = {
        flowers: 168,
        cake: 198,
        delivery: 0,
      }
      dispatch({
        type: 'SET_EXTRA_SERVICE',
        payload: {
          type,
          label: labels[type],
          price: prices[type],
          enabled: true,
          deliveryTime,
          message,
        },
      })
    }
  }

  const handleTimeChange = (time: string) => {
    setDeliveryTime(time)
    if (enabled && state.extraService) {
      dispatch({
        type: 'SET_EXTRA_SERVICE',
        payload: { ...state.extraService, deliveryTime: time },
      })
    }
  }

  const handleMessageChange = (msg: string) => {
    setMessage(msg)
    if (enabled && state.extraService) {
      dispatch({
        type: 'SET_EXTRA_SERVICE',
        payload: { ...state.extraService, message: msg },
      })
    }
  }

  return (
    <div className="border border-neutral-200">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">额外服务</span>
          {enabled && (
            <span className="text-[10px] px-1.5 py-0.5 border border-neutral-300 text-neutral-600">
              已启用
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 animate-fade-in border-t border-neutral-100">
          {/* Enable toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggle}
              className="w-4 h-4 border border-neutral-300 text-neutral-800 focus:ring-0 focus:ring-offset-0"
            />
            <span className="text-sm text-neutral-700">启用额外服务</span>
          </label>

          {enabled && (
            <div className="space-y-3 animate-fade-in">
              {/* Type selection */}
              <div className="flex border border-neutral-200">
                <button
                  onClick={() => handleTypeChange('flowers')}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 py-2.5 px-1 text-xs font-medium transition-colors
                    ${selectedType === 'flowers'
                      ? 'bg-neutral-800 text-white'
                      : 'bg-white text-neutral-500 hover:bg-neutral-50'
                    }`}
                >
                  鲜花
                </button>
                <div className="w-px bg-neutral-200" />
                <button
                  onClick={() => handleTypeChange('cake')}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 py-2.5 px-1 text-xs font-medium transition-colors
                    ${selectedType === 'cake'
                      ? 'bg-neutral-800 text-white'
                      : 'bg-white text-neutral-500 hover:bg-neutral-50'
                    }`}
                >
                  蛋糕
                </button>
                <div className="w-px bg-neutral-200" />
                <button
                  onClick={() => handleTypeChange('delivery')}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 py-2.5 px-1 text-xs font-medium transition-colors
                    ${selectedType === 'delivery'
                      ? 'bg-neutral-800 text-white'
                      : 'bg-white text-neutral-500 hover:bg-neutral-50'
                    }`}
                >
                  外卖
                </button>
              </div>

              {/* Delivery time */}
              <div>
                <label className="text-[11px] text-neutral-500 mb-1.5 block">送达时间</label>
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm
                    bg-white border border-neutral-200 text-neutral-800
                    focus:outline-none focus:border-neutral-400"
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-[11px] text-neutral-500 mb-1.5 block">留言（可选）</label>
                <textarea
                  value={message}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  placeholder="写上你的祝福语..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm
                    bg-white border border-neutral-200 text-neutral-800
                    placeholder:text-neutral-400 resize-none outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
