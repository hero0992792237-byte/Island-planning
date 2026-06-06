/**
 * 美团生活服务导购 Skill (meituan-venue-guide) 封装
 * 覆盖五大业务线：外卖、闪购、餐饮团购、丽人运动休闲、医药
 *
 * ⚠️ 需要以下前置条件：
 * 1. Python 3.x
 * 2. Node.js >= 18
 * 3. pt-passport CLI (npm i -g pt-passport)
 * 4. Skill 脚本文件（init.sh, auth.py, bind.py, qrcode.sh）
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// ============ 常量 ============
const CLIENT_ID = process.env.MEITUAN_VENUE_CLIENT_ID || '578aafab312b44f1b76b0529b06bb0c6';
const SKILL_DIR = join(process.cwd(), 'server', 'skills', 'meituan-venue-guide');
const SCRIPTS_DIR = join(SKILL_DIR, 'scripts');
const BIND_DATA_PATH = join(homedir(), '.xiaomei-workspace', 'venue_bind.json');

// 脚本路径
const INIT_SCRIPT = join(SCRIPTS_DIR, 'init.sh');
const AUTH_SCRIPT = join(SCRIPTS_DIR, 'auth.py');
const BIND_SCRIPT = join(SCRIPTS_DIR, 'bind.py');
const QRCODE_SCRIPT = join(SCRIPTS_DIR, 'qrcode.sh');

// ============ 工具函数 ============

function checkScripts(): boolean {
  return existsSync(INIT_SCRIPT) && existsSync(AUTH_SCRIPT) && existsSync(BIND_SCRIPT);
}

function execPython(script: string, args: string[] = []): string {
  const cmd = `python3 "${script}" ${args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`;
  return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', timeout: 30000 });
}

function execCommand(cmd: string, args: string[] = [], timeout = 30000): string {
  return execSync(`${cmd} ${args.join(' ')}`, { encoding: 'utf-8', stdio: 'pipe', timeout });
}

// ============ 状态查询 ============

/** 检查环境是否就绪 */
export function checkEnvironment(): {
  scriptsReady: boolean;
  python3: boolean;
  node18: boolean;
  ptPassport: boolean;
  ptPassportVersion: string;
} {
  const result = {
    scriptsReady: checkScripts(),
    python3: false,
    node18: false,
    ptPassport: false,
    ptPassportVersion: '',
  };

  // 检查 Python 3
  try {
    execSync('python3 --version', { stdio: 'pipe' });
    result.python3 = true;
  } catch {
    // 尝试 python
    try {
      const v = execSync('python --version', { stdio: 'pipe', encoding: 'utf-8' });
      if (v.includes('Python 3')) result.python3 = true;
    } catch { /* ignore */ }
  }

  // 检查 Node.js >= 18
  try {
    const v = process.version;
    const major = parseInt(v.slice(1).split('.')[0], 10);
    result.node18 = major >= 18;
  } catch { /* ignore */ }

  // 检查 pt-passport
  try {
    const v = execSync('pt-passport --version', { stdio: 'pipe', encoding: 'utf-8' });
    result.ptPassport = true;
    result.ptPassportVersion = v.trim();
  } catch { /* ignore */ }

  return result;
}

/** 检查本地绑定状态 */
export function checkBindStatus(): {
  bound: boolean;
  expired: boolean;
  codeWord?: string;
  links?: Array<{ tenantName: string; link: string }>;
} {
  if (!existsSync(BIND_DATA_PATH)) {
    return { bound: false, expired: false };
  }

  try {
    const data = JSON.parse(readFileSync(BIND_DATA_PATH, 'utf-8'));
    const now = Date.now();
    const expireTime = data.expireTime ? new Date(data.expireTime).getTime() : 0;
    const expired = expireTime > 0 && now > expireTime;

    return {
      bound: true,
      expired,
      codeWord: data.codeWord,
      links: data.skillActLinkInfoList || [],
    };
  } catch {
    return { bound: false, expired: false };
  }
}

// ============ 认证流程 ============

/** 获取授权链接/二维码
 * @returns 授权 URL 和二维码图片路径
 */
export async function getAuthCode(): Promise<{
  success: boolean;
  authUrl?: string;
  qrCodePath?: string;
  qrCodeText?: string;
  token?: string; // 缓存命中时直接返回
  message?: string;
}>
{
  if (!checkScripts()) {
    return { success: false, message: 'Skill 脚本文件缺失，请下载 meituan-venue-guide 的 scripts 目录到 server/skills/meituan-venue-guide/scripts/' };
  }

  try {
    // 先尝试静默获取 Token（缓存命中）
    try {
      const cached = execCommand('pt-passport get-token', [`--client_id ${CLIENT_ID}`], 10000);
      if (cached.includes('Token:')) {
        const token = cached.match(/Token:\s*(\S+)/)?.[1];
        if (token) {
          return { success: true, token, message: 'Token 缓存命中' };
        }
      }
    } catch { /* 缓存未命中，继续走授权流程 */ }

    // 获取授权链接
    const result = execCommand('pt-passport auth get-code', [`--client_id ${CLIENT_ID}`], 30000);

    // 检查是否缓存命中
    if (result.includes('Token:')) {
      const token = result.match(/Token:\s*(\S+)/)?.[1];
      return { success: true, token, message: 'Token 缓存命中' };
    }

    // 提取 AUTH_LINK
    const authMatch = result.match(/AUTH_LINK:\s*(\S+)/);
    if (!authMatch) {
      return { success: false, message: '获取授权链接失败' };
    }
    const authUrl = authMatch[1];

    // 生成二维码
    let qrCodePath: string | undefined;
    let qrCodeText: string | undefined;

    try {
      const qrResult = execCommand('bash', [QRCODE_SCRIPT, authUrl, CLIENT_ID], 30000);
      const pathMatch = qrResult.match(/QRCODE_IMAGE:(.+)/);
      if (pathMatch) qrCodePath = pathMatch[1].trim();
      const textMatch = qrResult.match(/QRCODE_TEXT:([\s\S]+)/);
      if (textMatch) qrCodeText = textMatch[1].trim();
    } catch {
      // 二维码生成失败，仅返回链接
    }

    return { success: true, authUrl, qrCodePath, qrCodeText };
  } catch (e: any) {
    const msg = e.stderr?.toString() || e.message || '未知错误';
    return { success: false, message: `授权服务暂时出了点问题: ${msg}` };
  }
}

/** 轮询获取 Token（用户扫码后） */
export async function pollToken(): Promise<{
  success: boolean;
  token?: string;
  message: string;
}> {
  try {
    const result = execCommand(
      'pt-passport auth poll-token',
      [`--client_id ${CLIENT_ID}`],
      600000 // 10分钟，等用户扫码
    );

    const tokenMatch = result.match(/Token:\s*(\S+)/);
    if (tokenMatch) {
      return { success: true, token: tokenMatch[1], message: '授权成功' };
    }

    return { success: false, message: '授权未完成或已超时' };
  } catch (e: any) {
    return { success: false, message: e.stderr?.toString() || '轮询超时' };
  }
}

/** 绑定口令
 * @param token 授权 Token
 * @param codeWord 用户输入的口令
 */
export async function bindCodeWord(
  token: string,
  codeWord: string
): Promise<{ success: boolean; message: string }>
{
  if (!checkScripts()) {
    return { success: false, message: 'Skill 脚本文件缺失' };
  }

  try {
    const result = execPython(BIND_SCRIPT, ['bind', '--token', token, '--code-word', codeWord]);
    const data = JSON.parse(result);

    if (data.success) {
      return { success: true, message: '口令绑定成功！' };
    }

    return {
      success: false,
      message: data.message || '口令绑定失败，请检查口令是否正确',
    };
  } catch (e: any) {
    return { success: false, message: `绑定失败: ${e.message}` };
  }
}

/** 获取会场链接 */
export function getVenueLinks(): Array<{ tenantName: string; link: string }> {
  if (!existsSync(BIND_DATA_PATH)) return [];

  try {
    const data = JSON.parse(readFileSync(BIND_DATA_PATH, 'utf-8'));
    return data.skillActLinkInfoList || [];
  } catch {
    return [];
  }
}

// ============ 业务意图匹配 ============

/** 根据用户查询匹配对应的会场链接 */
export function matchVenueLink(query: string): {
  category: string;
  link: string | null;
  tenantName: string;
} {
  const q = query.toLowerCase();
  const links = getVenueLinks();

  // 按优先级匹配意图
  const rules = [
    // 外卖
    {
      keywords: ['外卖', '点餐', '送餐', '奶茶', '咖啡', '宵夜', '早餐', '午餐', '晚餐', '配送', '送到家'],
      category: '外卖',
      tenantMatch: (t: string) => t.includes('外卖'),
    },
    // 闪购
    {
      keywords: ['超市', '便利店', '鲜花', '水果', '零食', '酒水', '饮料', '美妆', '日用品', '数码', '母婴', '宠物', '急送'],
      category: '闪购',
      tenantMatch: (t: string) => t.includes('闪购'),
    },
    // 餐饮团购
    {
      keywords: ['吃饭', '堂食', '团购', '代金券', '火锅', '烧烤', '日料', '西餐', '中餐', '快餐', '订座', '排队', '餐厅', '聚餐'],
      category: '餐饮团购',
      tenantMatch: (t: string) => t.includes('餐饮') || t.includes('团购'),
    },
    // 丽人运动休闲
    {
      keywords: ['ktv', 'k歌', '唱歌', '电影', '健身', '按摩', '美甲', '美睫', '美发', '宠物', '洗车', '剧本杀', '桌游', '摄影'],
      category: '丽人运动休闲',
      tenantMatch: (t: string) => t.includes('丽人') || t.includes('运动') || t.includes('休闲'),
    },
    // 医药
    {
      keywords: ['买药', '送药', '药店', '药品', '处方药', '保健品', '医疗器械', '感冒药', '退烧药'],
      category: '医药',
      tenantMatch: (t: string) => t.includes('医药'),
    },
  ];

  // 匹配意图
  for (const rule of rules) {
    if (rule.keywords.some(k => q.includes(k))) {
      const matched = links.find(l => rule.tenantMatch(l.tenantName));
      if (matched) {
        return { category: rule.category, link: matched.link, tenantName: matched.tenantName };
      }
    }
  }

  // 综合兜底
  const fallback = links.find(l => l.tenantName.includes('综合') || l.tenantName.includes('兜底'));
  return {
    category: '综合',
    link: fallback?.link || null,
    tenantName: fallback?.tenantName || '综合',
  };
}

/** 退出登录 */
export function logout(): { success: boolean; message: string } {
  try {
    if (existsSync(BIND_DATA_PATH)) {
      execPython(BIND_SCRIPT, ['clear']);
    }
    return { success: true, message: '已退出登录，本地数据已清除' };
  } catch (e: any) {
    return { success: false, message: `退出失败: ${e.message}` };
  }
}
