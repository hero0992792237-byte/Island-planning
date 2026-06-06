/**
 * 美团旅行 Skill (meituan-travel) 封装
 * 提供酒旅业务查询：酒店、机票、门票、度假、行程规划
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Token 读取
function getToken(): string {
  const token = process.env.MEITUAN_TRAVEL_TOKEN;
  if (!token) {
    throw new Error('未配置 MEITUAN_TRAVEL_TOKEN，请在 .env 文件中设置');
  }
  return token;
}

/** 将 Token 写入 mttravel CLI 配置文件 */
function ensureTokenConfig(): void {
  const token = getToken();
  const configDir = join(homedir(), '.config', 'meituan-travel');
  const configPath = join(configDir, 'config.json');

  try {
    mkdirSync(configDir, { recursive: true });
    writeFileSync(configPath, JSON.stringify({ key: token }, null, 2));
  } catch (e: any) {
    console.error('[meituan-travel] Token 配置写入失败:', e.message);
  }
}

/** 检查 mttravel CLI 是否已安装 */
function checkCLI(): boolean {
  try {
    execSync('mttravel --version', { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/** 调用 mttravel CLI */
export async function callMeituanTravel(
  city: string,
  query: string
): Promise<{ success: boolean; data: string; message: string }> {
  // 1. 确保 Token 已配置
  ensureTokenConfig();

  // 2. 检查 CLI
  if (!checkCLI()) {
    return {
      success: false,
      data: '',
      message:
        'mttravel CLI 未安装，请先运行：\n' +
        'npm i -g @meituan-travel/travel-cli',
    };
  }

  // 3. 执行查询
  try {
    const cmd = `mttravel "${city.replace(/"/g, '\\"')}" "${query.replace(/"/g, '\\"')}"`;
    const result = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 120000, // 2分钟，美团 API 响应较慢
      stdio: 'pipe',
    });

    return {
      success: true,
      data: result.trim(),
      message: '查询成功',
    };
  } catch (e: any) {
    const stderr = e.stderr?.toString() || '';
    const stdout = e.stdout?.toString() || '';

    // Token 失效检测
    if (
      stderr.includes('鉴权失败') ||
      stderr.includes('无效的访问令牌') ||
      stderr.includes('Token') ||
      stderr.includes('未设置')
    ) {
      return {
        success: false,
        data: '',
        message:
          '⚠️ Token 已失效，请前往美团开发者控制台重新创建 Token，\n' +
          '然后更新 .env 文件中的 MEITUAN_TRAVEL_TOKEN',
      };
    }

    return {
      success: false,
      data: stdout,
      message: `查询失败: ${stderr || e.message}`,
    };
  }
}

/** 从 meituan-travel 返回结果中提取结构化信息 */
export function parseTravelResult(raw: string): {
  hotels: Array<{ name: string; price: string; rating: string; link?: string }>;
  tickets: Array<{ name: string; price: string; link?: string }>;
  overview: string;
} {
  const result = {
    hotels: [] as Array<{ name: string; price: string; rating: string; link?: string }>,
    tickets: [] as Array<{ name: string; price: string; link?: string }>,
    overview: raw.slice(0, 500),
  };

  // 提取酒店信息
  const hotelMatches = raw.matchAll(/酒店[：:]\s*(.+?)\n.*?价格[：:]\s*(\S+).*?评分[：:]\s*(\S+)/gs);
  for (const m of hotelMatches) {
    result.hotels.push({
      name: m[1].trim(),
      price: m[2].trim(),
      rating: m[3].trim(),
    });
  }

  // 提取门票信息
  const ticketMatches = raw.matchAll(/门票[：:]\s*(.+?)\n.*?价格[：:]\s*(\S+)/gs);
  for (const m of ticketMatches) {
    result.tickets.push({
      name: m[1].trim(),
      price: m[2].trim(),
    });
  }

  return result;
}

/** 获取 Token 状态 */
export function getTokenStatus(): { configured: boolean; cliInstalled: boolean } {
  return {
    configured: !!process.env.MEITUAN_TRAVEL_TOKEN,
    cliInstalled: checkCLI(),
  };
}
