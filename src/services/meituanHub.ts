/**
 * 迹划 - 美团 Skill 代理 API 客户端
 * 前端通过这个封装调用后端代理服务，不直接暴露 Token
 */

// ==========================================
//  通用工具
// ==========================================

/** 小红书唤起链接 */
export function getMobileXiaohongshuLink(name: string): { appScheme: string; h5Url: string } {
  const keyword = encodeURIComponent(name + ' 探店');
  const h5Url = `https://www.xiaohongshu.com/search_result?keyword=${keyword}`;
  const appScheme = `xhsdiscover://search/result?keyword=${keyword}`;
  return { appScheme, h5Url };
}

/** 小红书唤起（scheme 尝试 + H5 fallback） */
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

/**
 * 打开页面（通用）
 */
export function openPage(url: string): void {
  window.open(url, '_blank');
}

// ==========================================
//  大众点评（主要入口，H5 更稳定）
// ==========================================

/** 构建大众点评搜索链接（移动端 H5） */
export function buildDianpingSearchUrl(name: string, city?: string): string {
  const keyword = city ? `${city} ${name}` : name;
  return `https://m.dianping.com/search/keyword/1/0_${encodeURIComponent(keyword)}`;
}

/** 构建大众点评商家详情链接（通过搜索跳转到商家） */
export function buildDianpingShopUrl(name: string, city?: string): string {
  const keyword = city ? `${city} ${name}` : name;
  return `https://m.dianping.com/shoplist/2/d/1/c/10/s/s_-1?keyword=${encodeURIComponent(keyword)}`;
}

/** 大众点评 App scheme（尝试唤起） */
export function getDianpingAppLink(name: string): { appScheme: string; h5Url: string } {
  const h5Url = buildDianpingSearchUrl(name);
  // 大众点评 scheme 格式
  const appScheme = `dianping://search?keyword=${encodeURIComponent(name)}`;
  return { appScheme, h5Url };
}

// ==========================================
//  美团（备用入口）
// ==========================================

/** 构建美团搜索 H5 链接 */
export function buildMeituanSearchUrl(name: string, city: string): string {
  return `https://www.meituan.com/s/${encodeURIComponent(city)}-${encodeURIComponent(name)}/`;
}

/** 构建美团团购 H5 链接 */
export function buildMeituanDealUrl(name: string, city: string): string {
  return `https://www.meituan.com/s/${encodeURIComponent(city)}-${encodeURIComponent(name)}/?tab=food`;
}

// ==========================================
//  meituan-travel (酒旅)
// ==========================================

/** 通用酒旅查询 */
export async function searchMeituanTravel(query: string, city: string) {
  const res = await fetch('/api/meituan/travel/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, city }),
  });
  return res.json();
}

/** 酒店推荐 */
export async function searchMeituanHotel(params: {
  city: string;
  checkIn?: string;
  checkOut?: string;
  budget?: string;
  stars?: string;
}) {
  const res = await fetch('/api/meituan/travel/hotel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

/** 景点门票 */
export async function searchMeituanTicket(city: string, scenic?: string) {
  const res = await fetch('/api/meituan/travel/ticket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city, scenic }),
  });
  return res.json();
}

/** 火车票查询 */
export async function searchMeituanTrain(from: string, to: string, date?: string) {
  const res = await fetch('/api/meituan/travel/train', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, date }),
  });
  return res.json();
}

/** 行程规划 */
export async function planMeituanTravel(params: {
  city: string;
  days?: number;
  people?: number;
  scene?: string;
}) {
  const res = await fetch('/api/meituan/travel/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

// ==========================================
//  meituan-venue-guide (导购)
// ==========================================

/** 检查导购环境状态 */
export async function checkVenueStatus() {
  const res = await fetch('/api/meituan/venue/status');
  return res.json();
}

/** 获取授权二维码 */
export async function getVenueAuth() {
  const res = await fetch('/api/meituan/venue/auth', { method: 'POST' });
  return res.json();
}

/** 轮询 Token */
export async function pollVenueToken() {
  const res = await fetch('/api/meituan/venue/poll', { method: 'POST' });
  return res.json();
}

/** 绑定口令 */
export async function bindVenueCodeWord(token: string, codeWord: string) {
  const res = await fetch('/api/meituan/venue/bind', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, codeWord }),
  });
  return res.json();
}

/** 获取会场链接 */
export async function getVenueLinks() {
  const res = await fetch('/api/meituan/venue/links');
  return res.json();
}

/** 根据意图匹配会场链接 */
export async function matchVenueLink(query: string) {
  const res = await fetch('/api/meituan/venue/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

/** 退出登录 */
export async function logoutVenue() {
  const res = await fetch('/api/meituan/venue/logout', { method: 'POST' });
  return res.json();
}

// ==========================================
//  健康检查
// ==========================================

export async function checkProxyHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}
