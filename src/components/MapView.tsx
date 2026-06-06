import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { Navigation, AlertCircle } from 'lucide-react'
import AMapLoader from '@amap/amap-jsapi-loader'
import { useApp } from '../context/AppContext'
import type { Plan } from '../types'

interface Props {
  plan: Plan;
  amapKey?: string;
}

const EMOJI_ICONS: Record<string, string> = {
  activity: '🎯',
  restaurant: '🍽️',
  snack: '🍡',
  walk: '🚶',
  scenic: '🏞️',
  coffee: '☕',
  bar: '🍸',
  shopping: '🛍️',
  photo: '📸',
  extra: '✨',
}

const COLORS: Record<string, string> = {
  activity: '#6366f1',
  restaurant: '#f59e0b',
  snack: '#f97316',
  walk: '#22c55e',
  scenic: '#0ea5e9',
  coffee: '#a16207',
  bar: '#7c3aed',
  shopping: '#ec4899',
  photo: '#14b8a6',
  extra: '#a855f7',
}

interface MapNode {
  type: string;
  lat: number;
  lng: number;
  name: string;
}

// 高德步行路径规划 REST API
async function fetchAmapWalkingRoute(
  amapKey: string,
  nodes: MapNode[]
): Promise<[number, number][] | null> {
  if (nodes.length < 2) return null

  const origin = `${nodes[0].lng},${nodes[0].lat}`
  const destination = `${nodes[nodes.length - 1].lng},${nodes[nodes.length - 1].lat}`
  const waypoints = nodes.slice(1, -1).map((n) => `${n.lng},${n.lat}`).join(';')

  const url = new URL('https://restapi.amap.com/v3/direction/walking')
  url.searchParams.set('origin', origin)
  url.searchParams.set('destination', destination)
  url.searchParams.set('key', amapKey)
  if (waypoints) url.searchParams.set('waypoints', waypoints)

  try {
    const res = await fetch(url.toString())
    const data = await res.json()

    if (data.status === '1' && data.route?.paths?.[0]?.steps) {
      const coords: [number, number][] = []
      data.route.paths[0].steps.forEach((step: any) => {
        if (step.polyline) {
          step.polyline.split(';').forEach((point: string) => {
            const [lng, lat] = point.split(',').map(Number)
            if (!isNaN(lat) && !isNaN(lng)) {
              coords.push([lat, lng])
            }
          })
        }
      })
      return coords.length > 0 ? coords : null
    }
  } catch {
    // ignore
  }
  return null
}

// OSRM 路径规划（回退方案）
async function fetchOsrmRoute(nodes: MapNode[]): Promise<[number, number][] | null> {
  if (nodes.length < 2) return null

  const waypoints = nodes.map((n) => `${n.lng},${n.lat}`).join(';')
  const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${waypoints}?overview=full&geometries=geojson`

  try {
    const res = await fetch(osrmUrl)
    const data = await res.json()
    if (data.routes?.[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]]
      )
    }
  } catch {
    // ignore
  }
  return null
}

// 构建高德导航 URI
function buildAmapNavigationUri(nodes: MapNode[]): string {
  if (nodes.length < 2) return ''

  const params = new URLSearchParams()
  params.set('start', `${nodes[0].name},${nodes[0].lng},${nodes[0].lat}`)
  params.set('end', `${nodes[nodes.length - 1].name},${nodes[nodes.length - 1].lng},${nodes[nodes.length - 1].lat}`)
  params.set('navitype', '0')
  params.set('callnative', '1')
  params.set('src', '迹划')

  if (nodes.length > 2) {
    const waypoints = nodes.slice(1, -1).map((n) => `${n.lng},${n.lat}`).join(';')
    params.set('waypoints', waypoints)
  }

  return `https://uri.amap.com/route?${params.toString()}`
}

// 创建标记 HTML
function createMarkerHtml(emoji: string, color: string): string {
  return `
    <div style="
      width: 36px; height: 36px; border-radius: 50%;
      background: ${color}; display: flex;
      align-items: center; justify-content: center;
      font-size: 18px; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${emoji}</div>
  `
}

// 创建信息窗体内容
function createInfoContent(node: MapNode, index: number): string {
  const navUri = `https://uri.amap.com/marker?position=${node.lng},${node.lat}&name=${encodeURIComponent(node.name)}&src=迹划&coordinate=gaode&callnative=1`
  const typeLabel = node.type === 'activity' ? '活动' : node.type === 'restaurant' ? '餐厅' : '额外'
  return `
    <div style="text-align:center;min-width:140px;padding:4px;">
      <div style="font-size:16px;margin-bottom:4px;">${EMOJI_ICONS[node.type]}</div>
      <div style="font-size:14px;font-weight:600;color:#1f2937;margin-bottom:2px;">${node.name}</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:6px;">第 ${index + 1} 站 · ${typeLabel}</div>
      <a href="${navUri}" target="_blank" rel="noopener noreferrer"
         style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#6366f1;text-decoration:none;padding:4px 10px;background:#eef2ff;border-radius:12px;">
        <span>🧭</span> 导航前往
      </a>
    </div>
  `
}

// 使用高德 PlaceSearch 插件搜索地点坐标
function searchPlace(AMap: any, name: string, city?: string): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    AMap.plugin(['AMap.PlaceSearch'], () => {
      const placeSearch = new AMap.PlaceSearch({
        pageSize: 1,
        city: city || '',
        citylimit: !!city,
      })
      placeSearch.search(name, (status: string, result: any) => {
        if (status === 'complete' && result.info === 'OK' && result.poiList?.pois?.[0]?.location) {
          const loc = result.poiList.pois[0].location
          // location 可能是字符串 "lng,lat" 或 AMap.LngLat 对象
          if (typeof loc === 'string') {
            const [lng, lat] = loc.split(',').map(Number)
            if (!isNaN(lat) && !isNaN(lng)) {
              resolve({ lat, lng })
              return
            }
          } else if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
            resolve({ lat: loc.lat, lng: loc.lng })
            return
          }
        }
        resolve(null)
      })
    })
  })
}

export default function MapView({ plan, amapKey }: Props) {
  const { state } = useApp()
  const city = state.location.city || '南京'
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [, setRouteSource] = useState<'amap' | 'osrm' | 'fallback' | null>(null)
  const [loadStatus, setLoadStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const nodes = useMemo<MapNode[]>(() => {
    return plan.nodes
      .filter((n) => n.lat && n.lng && n.name)
      .map((n) => ({
        type: ['activity', 'restaurant', 'snack', 'walk', 'scenic', 'coffee', 'bar', 'shopping', 'photo'].includes(n.type)
          ? (n.type as MapNode['type'])
          : 'activity',
        lat: n.lat,
        lng: n.lng,
        name: n.name,
      }))
  }, [plan])

  const handleNavigateAll = useCallback(() => {
    const uri = buildAmapNavigationUri(nodes)
    if (uri) window.open(uri, '_blank')
  }, [nodes])

  useEffect(() => {
    if (!containerRef.current || !amapKey) {
      setLoadStatus('error')
      setErrorMsg(amapKey ? '容器未就绪' : '缺少高德地图 Key')
      return
    }

    const key = amapKey
    let map: any = null
    let destroyed = false
    setLoadStatus('loading')
    setErrorMsg('')

    async function initMap() {
      try {
        // 配置安全密钥
        ;(window as any)._AMapSecurityConfig = {
          securityJsCode: '3ee2c0a4b3fca69f1e6ea776fc876a0a',
        }

        const AMap = await AMapLoader.load({
          key,
          version: '2.0',
          plugins: [],
        })

        if (destroyed || !containerRef.current) return

        // 用 PlaceSearch 搜索每个节点的真实坐标
        const mapNodes: MapNode[] = []
        for (const node of plan.nodes) {
          if (!node.name) continue
          const search = await searchPlace(AMap, node.name, city)
          const lat = search ? search.lat : node.lat
          const lng = search ? search.lng : node.lng
          mapNodes.push({
            type: ['activity', 'restaurant', 'snack', 'walk', 'scenic', 'coffee', 'bar', 'shopping', 'photo'].includes(node.type)
              ? (node.type as MapNode['type'])
              : 'activity',
            lat,
            lng,
            name: node.name,
          })
        }

        // 计算中心点
        const lats = mapNodes.map((n) => n.lat)
        const lngs = mapNodes.map((n) => n.lng)
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2

        // 创建地图
        map = new AMap.Map(containerRef.current, {
          zoom: 13,
          center: [centerLng, centerLat],
          zoomEnable: true,
          scrollWheel: false,
        })

        mapRef.current = map

        // 添加标记和信息窗体
        const markers: any[] = []

        mapNodes.forEach((node, index) => {
          const marker = new AMap.Marker({
            position: [node.lng, node.lat],
            content: createMarkerHtml(EMOJI_ICONS[node.type], COLORS[node.type]),
            offset: new AMap.Pixel(-18, -18),
          })

          const infoWindow = new AMap.InfoWindow({
            content: createInfoContent(node, index),
            offset: new AMap.Pixel(0, -36),
          })

          marker.on('click', () => {
            infoWindow.open(map, [node.lng, node.lat])
          })

          map.add(marker)
          markers.push(marker)
        })

        // 适配视野
        if (markers.length > 0) {
          map.setFitView(markers, false, [50, 50, 50, 50], 15)
        }

        setLoadStatus('success')

        // 绘制路径
        if (mapNodes.length >= 2) {
          let routeCoords: [number, number][] | null = null
          let source: 'amap' | 'osrm' | 'fallback' = 'fallback'

          routeCoords = await fetchAmapWalkingRoute(key, mapNodes)
          if (routeCoords) source = 'amap'

          if (!routeCoords) {
            routeCoords = await fetchOsrmRoute(mapNodes)
            if (routeCoords) source = 'osrm'
          }

          if (!destroyed && routeCoords) {
            const path = routeCoords.map(([lat, lng]) => new AMap.LngLat(lng, lat))
            const color = source === 'amap' ? '#6366f1' : 'rgba(99, 102, 241, 0.7)'
            const weight = source === 'amap' ? 5 : 4

            const polyline = new AMap.Polyline({
              path,
              strokeColor: color,
              strokeWeight: weight,
              strokeOpacity: 0.85,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            })

            map.add(polyline)
            setRouteSource(source)
          } else if (!destroyed) {
            const path = mapNodes.map((n) => new AMap.LngLat(n.lng, n.lat))
            const polyline = new AMap.Polyline({
              path,
              strokeColor: 'rgba(99, 102, 241, 0.5)',
              strokeWeight: 3,
              strokeOpacity: 0.7,
              strokeStyle: 'dashed',
              strokeDasharray: [8, 6],
              strokeLinecap: 'round',
            })
            map.add(polyline)
            setRouteSource('fallback')
          }
        }
      } catch (e: any) {
        if (!destroyed) {
          setLoadStatus('error')
          setErrorMsg(e?.message || '地图加载失败')
        }
      }
    }

    initMap()

    return () => {
      destroyed = true
      if (map) {
        map.destroy()
      }
      mapRef.current = null
    }
  }, [plan, amapKey, nodes])

  const navUri = buildAmapNavigationUri(nodes)

  return (
    <div className="relative w-full border border-neutral-200">
      {/* 加载中 / 错误遮罩 */}
      {loadStatus !== 'success' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-neutral-50">
          {loadStatus === 'loading' ? (
            <>
              <div className="w-8 h-8 border border-neutral-300 border-t-neutral-800 rounded-full animate-spin mb-3" />
              <span className="text-xs text-neutral-500">地图加载中...</span>
            </>
          ) : (
            <>
              <AlertCircle size={20} className="text-neutral-400 mb-2" />
              <span className="text-xs text-neutral-500">{errorMsg || '地图加载失败'}</span>
            </>
          )}
        </div>
      )}

      {/* 地图标签 */}
      <div className="absolute top-2 left-2 z-10">
        <span className="text-[9px] font-medium text-white/70 bg-black/40 px-2 py-0.5">
          高德地图
        </span>
      </div>

      {/* 路线导航按钮 */}
      {navUri && loadStatus === 'success' && (
        <div className="absolute bottom-2 right-2 z-10">
          <button
            onClick={handleNavigateAll}
            className="flex items-center gap-1 px-3 py-1
              bg-neutral-800 hover:bg-neutral-700 text-white text-[11px]
              transition-colors"
          >
            <Navigation size={10} />
            导航
          </button>
        </div>
      )}

      <div ref={containerRef} className="w-full h-[220px]" />
    </div>
  )
}
