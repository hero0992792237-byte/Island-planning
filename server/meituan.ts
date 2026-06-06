/**
 * 美团酒旅 API 封装
 * 调用美团开放平台 Skills 获取真实旅游数据
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// 读取 Token（优先级：环境变量 > 配置文件）
function getToken(): string | null {
  // 1. 环境变量
  if (process.env.MEITUAN_TOKEN) {
    return process.env.MEITUAN_TOKEN;
  }
  // 2. 配置文件 ~/.config/meituan-travel/config.json
  const configPath = join(homedir(), '.config', 'meituan-travel', 'config.json');
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      return config.key || null;
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * 调用美团酒旅 API
 * @param city 城市名
 * @param query 查询语句（自然语言）
 */
export async function callMeituanAPI(city: string, query: string): Promise<string> {
  const token = getToken();
  if (!token) {
    throw new Error('未配置美团 Token，请在 .env 文件中设置 MEITUAN_TOKEN');
  }

  // 方式1：优先尝试 mttravel CLI（如果已安装）
  try {
    return await callViaCLI(city, query, token);
  } catch (cliError: any) {
    console.warn('[Meituan] CLI 调用失败，尝试 REST API:', cliError.message);
  }

  // 方式2：通过 REST API 调用
  return await callViaREST(city, query, token);
}

/** 通过 mttravel CLI 调用 */
async function callViaCLI(city: string, query: string, token: string): Promise<string> {
  // 先确保 Token 已写入配置文件
  const configDir = join(homedir(), '.config', 'meituan-travel');
  const configPath = join(configDir, 'config.json');

  try {
    const { mkdirSync, writeFileSync } = require('fs');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(configPath, JSON.stringify({ key: token }, null, 2));
  } catch {
    // ignore
  }

  // 检查 mttravel CLI 是否已安装
  try {
    execSync('mttravel --version', { stdio: 'pipe' });
  } catch {
    throw new Error('mttravel CLI 未安装，请先运行: npm i -g @meituan-travel/travel-cli');
  }

  // 执行 CLI 命令
  const cmd = `mttravel "${city}" "${query.replace(/"/g, '\\"')}"`;
  const result = execSync(cmd, {
    encoding: 'utf-8',
    timeout: 120000, // 2分钟超时（美团 API 响应较慢）
    stdio: 'pipe',
  });

  return result;
}

/** 通过 REST API 调用（备用方案） */
async function callViaREST(_city: string, _query: string, _token: string): Promise<string> {
  // TODO: 如果美团开放平台提供直接的 REST API，在这里实现
  // 目前 Skills 主要通过 CLI 方式调用
  throw new Error(
    '美团 REST API 未配置。请先安装 mttravel CLI:\n' +
    'npm i -g @meituan-travel/travel-cli\n\n' +
    '或者在 .env 中配置有效的 MEITUAN_TOKEN'
  );
}

/**
 * 构建美团搜索链接（用于直接跳转到美团）
 */
export function buildMeituanSearchUrl(name: string, city: string): string {
  const encodedName = encodeURIComponent(name);
  const encodedCity = encodeURIComponent(city);
  return `https://www.meituan.com/s/${encodedCity}-${encodedName}/`;
}

/**
 * 构建美团团购链接
 */
export function buildMeituanDealUrl(name: string, city: string): string {
  const encodedName = encodeURIComponent(name);
  const encodedCity = encodeURIComponent(city);
  return `https://www.meituan.com/s/${encodedCity}-${encodedName}/?tab=food`;
}
