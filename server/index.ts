/**
 * 迹划后端代理服务
 * 集成美团两个 Skill：
 * 1. meituan-travel (酒旅) - Token 认证
 * 2. meituan-venue-guide (导购) - pt-passport + 口令绑定
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { callMeituanTravel, parseTravelResult, getTokenStatus } from './skills/meituan-travel';
import {
  checkEnvironment,
  checkBindStatus,
  getAuthCode,
  pollToken,
  bindCodeWord,
  matchVenueLink,
  getVenueLinks,
  logout,
} from './skills/meituan-venue-guide';

// 语音转录
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ============ 健康检查 ============
app.get('/api/health', (_req, res) => {
  const travelStatus = getTokenStatus();
  const venueStatus = checkBindStatus();
  const env = checkEnvironment();

  res.json({
    status: 'ok',
    service: '迹划代理服务',
    skills: {
      'meituan-travel': {
        tokenConfigured: travelStatus.configured,
        cliInstalled: travelStatus.cliInstalled,
      },
      'meituan-venue-guide': {
        scriptsReady: env.scriptsReady,
        python3: env.python3,
        node18: env.node18,
        ptPassport: env.ptPassport,
        bound: venueStatus.bound,
        expired: venueStatus.expired,
      },
    },
  });
});

// ==========================================
//  meituan-travel (酒旅) 路由
// ==========================================

/** 酒旅查询 */
app.post('/api/meituan/travel/search', async (req, res) => {
  const { query, city } = req.body;
  if (!query || !city) {
    res.status(400).json({ success: false, message: '缺少 query 或 city 参数' });
    return;
  }

  const result = await callMeituanTravel(city, query);
  res.json(result);
});

/** 酒店推荐 */
app.post('/api/meituan/travel/hotel', async (req, res) => {
  const { city, checkIn, checkOut, budget, stars } = req.body;
  if (!city) {
    res.status(400).json({ success: false, message: '缺少 city 参数' });
    return;
  }

  let query = `${city}酒店`;
  if (budget) query += ` ${budget}元以内`;
  if (stars) query += ` ${stars}星级`;
  if (checkIn) query += ` ${checkIn}入住`;

  const result = await callMeituanTravel(city, query);
  res.json(result);
});

/** 景点门票 */
app.post('/api/meituan/travel/ticket', async (req, res) => {
  const { city, scenic } = req.body;
  if (!city) {
    res.status(400).json({ success: false, message: '缺少 city 参数' });
    return;
  }

  const query = scenic ? `${city}${scenic}门票` : `${city}必去景点`;
  const result = await callMeituanTravel(city, query);
  res.json(result);
});

/** 火车票查询 */
app.post('/api/meituan/travel/train', async (req, res) => {
  const { from, to, date } = req.body;
  if (!from || !to) {
    res.status(400).json({ success: false, message: '缺少出发地或目的地' });
    return;
  }

  const query = date
    ? `${from}到${to} ${date}火车票`
    : `${from}到${to}火车票`;

  const result = await callMeituanTravel(from, query);
  res.json(result);
});

/** 行程规划 */
app.post('/api/meituan/travel/plan', async (req, res) => {
  const { city, days, people, scene } = req.body;
  if (!city) {
    res.status(400).json({ success: false, message: '缺少 city 参数' });
    return;
  }

  let query = `${city}${days || ''}日游行程规划`;
  if (people) query += ` ${people}人`;
  if (scene) query += ` ${scene}`;

  const result = await callMeituanTravel(city, query);
  res.json(result);
});

// ==========================================
//  meituan-venue-guide (导购) 路由
// ==========================================

/** 检查导购环境 */
app.get('/api/meituan/venue/status', (_req, res) => {
  const env = checkEnvironment();
  const bind = checkBindStatus();
  res.json({ success: true, data: { env, bind } });
});

/** 获取授权二维码 */
app.post('/api/meituan/venue/auth', async (_req, res) => {
  const result = await getAuthCode();
  res.json(result);
});

/** 轮询 Token（扫码后调用） */
app.post('/api/meituan/venue/poll', async (_req, res) => {
  const result = await pollToken();
  res.json(result);
});

/** 绑定口令 */
app.post('/api/meituan/venue/bind', async (req, res) => {
  const { token, codeWord } = req.body;
  if (!token || !codeWord) {
    res.status(400).json({ success: false, message: '缺少 token 或 codeWord' });
    return;
  }

  const result = await bindCodeWord(token, codeWord);
  res.json(result);
});

/** 获取会场链接 */
app.get('/api/meituan/venue/links', (_req, res) => {
  const links = getVenueLinks();
  res.json({ success: true, data: links });
});

/** 根据意图匹配会场链接 */
app.post('/api/meituan/venue/match', (req, res) => {
  const { query } = req.body;
  if (!query) {
    res.status(400).json({ success: false, message: '缺少 query 参数' });
    return;
  }

  const result = matchVenueLink(query);
  res.json({ success: true, data: result });
});

/** 退出登录 */
app.post('/api/meituan/venue/logout', (_req, res) => {
  const result = logout();
  res.json(result);
});

// ==========================================
//  启动
// ==========================================

app.listen(PORT, () => {
  console.log(`🚀 迹划代理服务已启动: http://localhost:${PORT}`);
  console.log(`📍 健康检查: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('📋 已集成的 Skill:');
  console.log('  • meituan-travel     (酒旅)  POST /api/meituan/travel/*');
  console.log('  • meituan-venue-guide (导购) POST /api/meituan/venue/*');
});
