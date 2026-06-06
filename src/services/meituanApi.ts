/**
 * 美团/大众点评 增强服务
 * 通过高德POI搜索获取商家真实信息，构建美团/点评链接
 */

import type { ActivityNode, RestaurantNode, PlanNode } from '../types';

/** 高德POI详情结果 */
interface AmapPOIDetail {
  name: string;
  address: string;
  tel?: string;
  location: string; // "lng,lat"
  type?: string;
  photos?: Array<{ url: string; title?: string }>;
  business?: {
    rating?: string;
    cost?: string;
    open_time?: string;
  };
}

/** 搜索POI详情（含电话） */
async function searchPOIDetail(
  name: string,
  city: string,
  amapKey: string
): Promise<AmapPOIDetail | null> {
  if (!amapKey || !name) return null;
  try {
    // 先用text搜索找到POI ID
    const searchUrl = new URL('https://restapi.amap.com/v5/place/text');
    searchUrl.searchParams.set('key', amapKey);
    searchUrl.searchParams.set('keywords', name);
    searchUrl.searchParams.set('region', city);
    searchUrl.searchParams.set('page_size', '1');
    searchUrl.searchParams.set('show_fields', 'business,photos');

    const res = await fetch(searchUrl.toString());
    const data = await res.json();

    if (data.status === '1' && data.pois?.[0]) {
      const poi = data.pois[0];
      return {
        name: poi.name,
        address: poi.address || poi.adname || '',
        tel: poi.business?.tel || poi.tel || undefined,
        location: poi.location,
        type: poi.type,
        photos: poi.photos,
        business: poi.business,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/** 构建美团搜索链接 */
function buildMeituanSearchUrl(name: string, city: string): string {
  const encodedName = encodeURIComponent(name);
  const encodedCity = encodeURIComponent(city);
  // 美团搜索页
  return `https://www.meituan.com/s/${encodedCity}-${encodedName}/`;
}

/** 构建美团团购链接 */
export function buildMeituanDealUrl(name: string, city: string): string {
  const encodedName = encodeURIComponent(name);
  const encodedCity = encodeURIComponent(city);
  // 美团美食搜索页（带团购标签）
  return `https://www.meituan.com/s/${encodedCity}-${encodedName}/?tab=food`;
}

/** 构建小红书搜索链接 */
function buildXiaohongshuSearchUrl(name: string): string {
  return `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(name + ' 探店')}`;
}

/** 通用唤起方案：尝试 scheme，失败 fallback 到 H5 */
export function getMobileMeituanLink(name: string, city: string): { appScheme: string; h5Url: string } {
  const encodedName = encodeURIComponent(name);
  const encodedCity = encodeURIComponent(city);

  // H5 兜底链接
  const h5Url = `https://www.meituan.com/s/${encodedCity}-${encodedName}/`;

  // 美团 App scheme（iOS/Android 通用）
  // meituan://www.meituan.com/search?q=xxx 是较老的 scheme
  // 现代方式：使用 universal link
  const appScheme = `meituan://www.meituan.com/s/${encodedCity}-${encodedName}/`;

  return { appScheme, h5Url };
}

/** 小红书唤起链接 */
export function getMobileXiaohongshuLink(name: string): { appScheme: string; h5Url: string } {
  const keyword = encodeURIComponent(name + ' 探店');
  const h5Url = `https://www.xiaohongshu.com/search_result?keyword=${keyword}`;
  // 小红书 scheme
  const appScheme = `xhsdiscover://search/result?keyword=${keyword}`;
  return { appScheme, h5Url };
}

/** 打开美团/小红书页面
 * 美团在移动端 scheme 唤起基本都被浏览器拦截了，直接打开 H5 更可靠
 * 小红书可以尝试唤起 App，失败 fallback 到 H5
 */
export function openMeituanPage(h5Url: string): void {
  window.open(h5Url, '_blank');
}

export function tryOpenXiaohongshu(schemeUrl: string, h5Url: string): void {
  const startTime = Date.now();
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:0;height:0;border:none;position:fixed;top:-9999px;';
  iframe.src = schemeUrl;
  document.body.appendChild(iframe);

  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    if (Date.now() - startTime < 2500) {
      window.open(h5Url, '_blank');
    }
  }, 2000);
}

/** 为餐厅节点增强美团/点评信息 */
export async function enrichRestaurantWithMeituan(
  restaurant: RestaurantNode,
  city: string,
  amapKey: string
): Promise<RestaurantNode> {
  const detail = await searchPOIDetail(restaurant.name, city, amapKey);

  if (!detail) {
    // 即使没有POI详情，也生成搜索链接
    return {
      ...restaurant,
      meituanUrl: buildMeituanSearchUrl(restaurant.name, city),
      meituanDealUrl: buildMeituanDealUrl(restaurant.name, city),
      xiaohongshuUrl: buildXiaohongshuSearchUrl(restaurant.name),
    };
  }

  // 解析坐标
  let lat = restaurant.lat;
  let lng = restaurant.lng;
  if (detail.location) {
    const [lngStr, latStr] = detail.location.split(',');
    const parsedLng = parseFloat(lngStr);
    const parsedLat = parseFloat(latStr);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      lat = parsedLat;
      lng = parsedLng;
    }
  }

  // 解析评分
  let rating: number | undefined;
  if (detail.business?.rating) {
    const parsed = parseFloat(detail.business.rating);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 5) {
      rating = Math.round(parsed * 10) / 10;
    }
  }

  // 解析人均
  let avgCost = restaurant.avgCostPerPerson;
  if (detail.business?.cost) {
    const parsed = parseInt(detail.business.cost, 10);
    if (!isNaN(parsed) && parsed > 0) {
      avgCost = parsed;
    }
  }

  return {
    ...restaurant,
    name: detail.name || restaurant.name,
    location: detail.address || restaurant.location,
    lat,
    lng,
    phone: detail.tel || restaurant.phone,
    rating: rating || restaurant.rating,
    avgCostPerPerson: avgCost,
    businessHours: detail.business?.open_time || restaurant.businessHours,
    meituanUrl: buildMeituanSearchUrl(restaurant.name, city),
    meituanDealUrl: buildMeituanDealUrl(restaurant.name, city),
    xiaohongshuUrl: buildXiaohongshuSearchUrl(restaurant.name),
  };
}

/** 为活动节点增强美团/点评信息 */
export async function enrichActivityWithMeituan(
  activity: ActivityNode,
  city: string,
  amapKey: string
): Promise<ActivityNode> {
  const detail = await searchPOIDetail(activity.name, city, amapKey);

  if (!detail) {
    return {
      ...activity,
      meituanUrl: buildMeituanSearchUrl(activity.name, city),
      xiaohongshuUrl: buildXiaohongshuSearchUrl(activity.name),
    };
  }

  let lat = activity.lat;
  let lng = activity.lng;
  if (detail.location) {
    const [lngStr, latStr] = detail.location.split(',');
    const parsedLng = parseFloat(lngStr);
    const parsedLat = parseFloat(latStr);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      lat = parsedLat;
      lng = parsedLng;
    }
  }

  let rating: number | undefined;
  if (detail.business?.rating) {
    const parsed = parseFloat(detail.business.rating);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 5) {
      rating = Math.round(parsed * 10) / 10;
    }
  }

  return {
    ...activity,
    name: detail.name || activity.name,
    location: detail.address || activity.location,
    lat,
    lng,
    phone: detail.tel || activity.phone,
    rating: rating || activity.rating,
    openingHours: detail.business?.open_time || activity.openingHours,
    meituanUrl: buildMeituanSearchUrl(activity.name, city),
    xiaohongshuUrl: buildXiaohongshuSearchUrl(activity.name),
  };
}

/** 为备选商家生成链接 */
export function enrichAlternativesWithLinks<T extends { name: string; meituanUrl?: string; xiaohongshuUrl?: string }>(
  alternatives: T[],
  city: string
): T[] {
  return alternatives.map(alt => ({
    ...alt,
    meituanUrl: alt.meituanUrl || buildMeituanSearchUrl(alt.name, city),
    xiaohongshuUrl: alt.xiaohongshuUrl || buildXiaohongshuSearchUrl(alt.name),
  }));
}

/** 为餐厅生成完整的预订信息卡片 */
export function generateRestaurantBookingInfo(restaurant: RestaurantNode): string {
  const lines: string[] = [`📍 ${restaurant.name}`];
  if (restaurant.phone) lines.push(`📞 ${restaurant.phone}`);
  if (restaurant.rating) lines.push(`⭐ ${restaurant.rating}分`);
  lines.push(`💰 人均 ¥${restaurant.avgCostPerPerson}`);
  if (restaurant.businessHours) lines.push(`🕐 ${restaurant.businessHours}`);
  if (restaurant.meituanDealUrl) lines.push(`🔗 美团团购`);
  return lines.join(' | ');
}

/** 为 PlanNode 统一增强美团/高德信息 */
export async function enrichNodeWithMeituan(
  node: PlanNode,
  city: string,
  amapKey: string
): Promise<PlanNode> {
  const detail = await searchPOIDetail(node.name, city, amapKey);

  // 生成链接（无论有没有POI详情都生成）
  const meituanSearchUrl = buildMeituanSearchUrl(node.name, city);
  const meituanDealUrl = buildMeituanDealUrl(node.name, city);
  const xiaohongshuUrl = buildXiaohongshuSearchUrl(node.name);

  if (!detail) {
    return {
      ...node,
      meituanUrl: meituanSearchUrl,
      meituanDealUrl: ['restaurant', 'snack', 'coffee', 'bar'].includes(node.type) ? meituanDealUrl : undefined,
      xiaohongshuUrl,
    };
  }

  // 解析坐标
  let lat = node.lat;
  let lng = node.lng;
  if (detail.location) {
    const [lngStr, latStr] = detail.location.split(',');
    const parsedLng = parseFloat(lngStr);
    const parsedLat = parseFloat(latStr);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      lat = parsedLat;
      lng = parsedLng;
    }
  }

  // 解析评分
  let rating: number | undefined;
  if (detail.business?.rating) {
    const parsed = parseFloat(detail.business.rating);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 5) {
      rating = Math.round(parsed * 10) / 10;
    }
  }

  return {
    ...node,
    name: detail.name || node.name,
    location: detail.address || node.location,
    lat,
    lng,
    phone: detail.tel || node.phone,
    rating: rating || node.rating,
    businessHours: detail.business?.open_time || node.businessHours,
    openingHours: detail.business?.open_time || node.openingHours,
    meituanUrl: meituanSearchUrl,
    meituanDealUrl: ['restaurant', 'snack', 'coffee', 'bar'].includes(node.type) ? meituanDealUrl : undefined,
    xiaohongshuUrl,
  };
}

/** 为 PlanNode 备选生成链接 */
export function enrichNodeAlternatives(alternatives: PlanNode[], city: string): PlanNode[] {
  return alternatives.map(alt => ({
    ...alt,
    meituanUrl: alt.meituanUrl || buildMeituanSearchUrl(alt.name, city),
    meituanDealUrl: alt.meituanDealUrl || (['restaurant', 'snack', 'coffee', 'bar'].includes(alt.type) ? buildMeituanDealUrl(alt.name, city) : undefined),
    xiaohongshuUrl: alt.xiaohongshuUrl || buildXiaohongshuSearchUrl(alt.name),
  }));
}
