import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { useApp } from '../context/AppContext'

interface Props {
  onClose: () => void
}

const POPULAR_CITIES = [
  '南京', '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆',
  '武汉', '西安', '苏州', '天津', '长沙', '郑州', '青岛', '大连',
  '厦门', '昆明', '丽江', '三亚', '桂林', '黄山', '青岛', '哈尔滨',
  '拉萨', '乌鲁木齐', '呼和浩特', '银川', '西宁', '兰州', '贵阳',
  '南宁', '海口', '台北', '香港', '澳门',
]

export default function SettingsPanel({ onClose }: Props) {
  const { state, dispatch } = useApp()
  const { apiConfig, mapConfig, location } = state

  const [key, setKey] = useState(apiConfig.key)
  const [baseUrl, setBaseUrl] = useState(apiConfig.baseUrl)
  const [model, setModel] = useState(apiConfig.model)
  const [enabled, setEnabled] = useState(apiConfig.enabled)
  const [amapKey, setAmapKey] = useState(mapConfig.amapKey)
  const [city, setCity] = useState(location.manualCity || location.city)
  const [showCityPicker, setShowCityPicker] = useState(false)

  const handleSave = () => {
    dispatch({
      type: 'SET_API_CONFIG',
      payload: { key, baseUrl, model, enabled },
    })
    dispatch({
      type: 'SET_MAP_CONFIG',
      payload: { amapKey, useRealMap: true },
    })
    // 保存或清除手动城市
    const trimmed = city.trim()
    if (trimmed && trimmed !== location.city) {
      dispatch({
        type: 'SET_LOCATION',
        payload: { ...location, manualCity: trimmed },
      })
    } else if (!trimmed || trimmed === location.city) {
      // 切回定位城市 → 清除手动覆盖
      if (location.manualCity) {
        dispatch({
          type: 'SET_LOCATION',
          payload: { ...location, manualCity: undefined },
        })
      }
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div className="relative w-[320px] max-w-[calc(100vw-32px)] max-h-[80vh] overflow-y-auto scrollbar-hide
        bg-white border border-neutral-200 animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h3 className="text-sm font-medium text-neutral-900">API 设置</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-800">
                {enabled ? 'LLM Agent 模式' : 'Mock Agent 模式'}
              </p>
              <p className="text-[11px] text-neutral-400">
                {enabled ? '调用真实 AI 接口' : '前端模拟，无需联网'}
              </p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                enabled ? 'bg-neutral-800' : 'bg-neutral-300'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* API Key */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 text-sm border border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 mb-2">
              API 地址
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.stepfun.com/step_plan/v1"
              className="w-full px-3 py-2 text-sm border border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
            />
          </div>

          {/* AMap Key */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 mb-2">
              高德地图 Key（可选）
            </label>
            <input
              type="password"
              value={amapKey}
              onChange={(e) => setAmapKey(e.target.value)}
              placeholder="xxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 text-sm border border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
            />
            <p className="mt-1.5 text-[11px] text-neutral-400 leading-relaxed">
              地图已默认使用高德中文地图。填入 Key 可启用高德步行路径规划。
              <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noopener noreferrer" className="text-neutral-600 hover:underline">去申请 Key →</a>
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 mb-2">
              模型
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="step-3.5-flash-2603"
              className="w-full px-3 py-2 text-sm border border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
            />
            <p className="mt-1.5 text-[11px] text-neutral-400">
              可选模型：<span className="text-neutral-600">step-3.5-flash-2603</span>（推荐 Agent）/ <span className="text-neutral-600">step-3.5-flash</span> / <span className="text-neutral-600">step-router-v1</span>
            </p>
          </div>

          {/* 目标城市 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 mb-2">
              行程城市
            </label>
            <div className="relative">
              <input
                type="text"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value)
                  setShowCityPicker(false)
                }}
                onFocus={() => setShowCityPicker(true)}
                placeholder={location.manualCity ? '' : location.city}
                className="w-full px-3 py-2 text-sm border border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
              />
              {showCityPicker && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-neutral-200 shadow-lg rounded-lg scrollbar-hide">
                  <p className="px-3 py-2 text-[11px] text-neutral-400 border-b border-neutral-100">热门城市</p>
                  {POPULAR_CITIES.filter(c =>
                    city ? c.includes(city) || city.includes(c) : true
                  ).map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCity(c)
                        setShowCityPicker(false)
                      }}
                      className={`w-full px-3 py-1.5 text-left text-sm transition-colors
                        ${c === city ? 'bg-neutral-800 text-white' : 'text-neutral-800 hover:bg-neutral-50'}
                      `}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-neutral-400">
              默认使用定位城市「{location.manualCity ? city : location.city}」，可手动切换
            </p>
          </div>
        </div>

        {/* Save */}
        <div className="px-5 py-4 border-t border-neutral-100">
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium transition-colors"
          >
            <Save size={15} />
            保存设置
          </button>
        </div>
      </div>
    </div>
  )
}
