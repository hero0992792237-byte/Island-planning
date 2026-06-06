/**
 * 地理计算工具
 */

const EARTH_RADIUS_KM = 6371

/**
 * Haversine公式计算两点间球面距离（单位：公里）
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * 计算一组行程的总移动距离
 * 规则：按时间排序，累加相邻有GPS坐标点之间的距离
 */
export function calculateTotalDistance(
  entries: Array<{ location?: { lat?: number; lng?: number } }>
): number {
  const withCoords = entries.filter(
    (e) =>
      typeof e.location?.lat === 'number' && typeof e.location?.lng === 'number'
  ) as Array<{ location: { lat: number; lng: number } }>

  if (withCoords.length < 2) return 0

  let total = 0
  for (let i = 1; i < withCoords.length; i++) {
    const prev = withCoords[i - 1].location
    const curr = withCoords[i].location
    total += haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng)
  }
  return Math.round(total * 10) / 10 // 保留一位小数
}

/**
 * 趣味距离对比文案
 */
export function getDistanceFunFact(km: number): string {
  if (km === 0) return '本月还没出发呢，快开启你的第一段旅程吧。「千里之行，始于足下。」'
  const earthCircumference = 40075
  const moonDistance = 384400
  const circles = (km / earthCircumference).toFixed(2)
  const toMoon = ((km / moonDistance) * 100).toFixed(2)

  if (km < 10) return `本月累计出行 ${km} 公里，迈出了探索的第一步。积跬步，以至千里。`
  if (km < 100) return `本月累计出行 ${km} 公里，相当于绕标准跑道 ${Math.round(km / 0.4)} 圈。每一步都算数。`
  if (km < 1000) return `本月累计出行 ${km} 公里，相当于绕地球 ${circles} 圈。山河远阔，人间烟火。`
  if (km < 10000) return `本月累计出行 ${km} 公里，相当于绕地球 ${circles} 圈，或往返月球 ${toMoon}%。星辰大海，皆在脚下。`
  return `本月累计出行 ${km} 公里，足迹遍布千里！「海内存知己，天涯若比邻。」`
}
