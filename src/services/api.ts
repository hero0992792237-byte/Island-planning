import type { Plan, ApiResponse, ExecutionStep, ApiConfig, ChatMessage, Recommendation, PlanNode } from '../types';
import { generateRAGContext } from './rag';
import {
  enrichNodeWithMeituan,
  enrichNodeAlternatives,
} from './meituanApi';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function tryParseJSON(text: string): any | null {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(text);
  } catch {
    // ignore
  }

  // Strategy 2: Truncate to last complete '}' and try again
  // This handles cases where LLM output was cut off mid-JSON
  let lastBrace = text.lastIndexOf('}');
  while (lastBrace > 0) {
    const truncated = text.slice(0, lastBrace + 1);
    try {
      return JSON.parse(truncated);
    } catch {
      lastBrace = text.lastIndexOf('}', lastBrace - 1);
    }
  }

  return null;
}

function extractJSONFromLLM(content: string): string | null {
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  let braceCount = 0;
  let startIdx = -1;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') {
      if (braceCount === 0) startIdx = i;
      braceCount++;
    } else if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0 && startIdx >= 0) {
        return content.slice(startIdx, i + 1);
      }
    }
  }

  return null;
}

// ============ Helpers ============

function effectiveCity(location?: { city?: string; manualCity?: string }): string {
  return location?.manualCity || location?.city || '南京'
}

// ============ Geocoding / POI Search ============

// ============ LLM API Core ============

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callLLM(
  apiConfig: ApiConfig,
  messages: LLMMessage[],
  temperature = 0.7
): Promise<string> {
  const url = `${apiConfig.baseUrl}/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiConfig.key}`,
    },
    body: JSON.stringify({
      model: apiConfig.model,
      messages,
      temperature,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorText;
    } catch {
      errorMessage = errorText || `HTTP ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/** 调用 LLM，如果返回内容无法解析为合法 JSON，自动重试一次让模型修正 */
async function callLLMWithJSONRetry(
  apiConfig: ApiConfig,
  messages: LLMMessage[],
  temperature = 0.7,
  maxRetries = 1
): Promise<string> {

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const content = await callLLM(apiConfig, messages, temperature);
    const jsonText = extractJSONFromLLM(content);
    if (jsonText && tryParseJSON(jsonText) !== null) {
      return content; // 合法 JSON，直接返回
    }
    // 提取失败或解析失败 → 发回给模型修正
    if (attempt < maxRetries) {
      const fixMessages: LLMMessage[] = [
        ...messages,
        { role: 'assistant', content },
        {
          role: 'user',
          content:
            `你上一次的输出不是合法 JSON。请直接输出修正后的合法 JSON（只输出 JSON，不要任何其他文字）：\n\n${content.slice(0, 4000)}`,
        },
      ];
      messages = fixMessages;
    }
  }
  return ''; // 所有重试都失败
}

// ============ Multi-turn Chat ============

const CHAT_SYSTEM_PROMPT = `你是「迹划」，一个专业的行程规划 Agent。你的任务是通过自然、亲切的对话了解用户的出行需求。

你需要收集的信息（不要一次性全问，每次最多问1-2个）：
1. 场景：家庭出游还是朋友聚会？
2. 人数：几个人？
3. 时间偏好：今天下午？还是其他时间？（默认14:00-20:00）
4. 特殊需求：有小孩吗？多大？饮食偏好（比如不吃辣、素食）？预算范围？
5. 地点偏好：离家近还是远一点？有什么特别想去的地方类型吗？

对话策略：
- 语气像朋友聊天，自然亲切
- 如果用户说"帮我生成计划"或"安排一下"但信息不够，先追问关键信息
- 当信息基本足够后，告诉用户"信息已经够了，点击下方「生成计划」按钮，我来为你安排！"
- 不要主动列出JSON或结构化数据，只进行自然对话
- 你可以根据用户的描述主动推荐一些想法（比如"带5岁孩子的话，亲子乐园可能不错"）

注意：你当前只负责对话收集信息，不要输出行程计划。行程计划会在用户点击「生成计划」后由另一个流程处理。`;

export async function chatWithAgent(
  history: ChatMessage[],
  userText: string,
  apiConfig: ApiConfig
): Promise<string> {
  const messages: LLMMessage[] = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
  ];

  // Convert chat history to LLM messages
  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  // Add current user message
  messages.push({ role: 'user', content: userText });

  return await callLLM(apiConfig, messages, 0.8);
}

// ============ Recommendations ============

const RECOMMENDATION_PROMPT = `你是「迹划」的灵感推荐专家。你的任务是为用户推荐 4 个有趣、有创意的{{city}}下午玩法主题。

场景：{{scene}}（家庭出游 或 朋友聚会）
用户兴趣：{{interests}}
用户心情：{{mood}}
预算偏好：{{budget}}

要求：
1. 推荐的主题要具体、有趣、有画面感，不要泛泛而谈
2. 每个主题要有独特的调性和氛围
3. 主题要适合{{city}}本地的下午时段（14:00-20:00）
4. 家庭主题要考虑亲子友好、安全、有趣
5. 朋友主题要考虑社交性、话题性、可拍性
6. 必须结合用户的兴趣和心情来推荐，尽量匹配用户喜欢的类型
7. 预算偏好为"省钱"时推荐低价或免费活动，"轻奢"时可推荐中高端体验

每个推荐请包含：
- title: 主题名称（ catchy，8字以内）
- description: 一句话描述亮点（20字以内）
- tags: 标签数组（2-3个，如["户外","拍照","美食"]）
- estimatedCost: 预估人均花费（元）
- vibe: 氛围描述（如"轻松治愈"、"刺激有趣"）
- emoji: 一个能代表这个主题的 emoji
- category: 类别（户外/运动/娱乐/文艺/美食/社交）

输出严格 JSON 数组格式（不要加markdown代码块标记）：
[
  {
    "title": "...",
    "description": "...",
    "tags": ["...", "..."],
    "estimatedCost": 100,
    "vibe": "...",
    "emoji": "...",
    "category": "..."
  }
]`;

export async function getRecommendations(
  scene: 'family' | 'friends',
  apiConfig: ApiConfig,
  userProfile?: { interests: string[]; mood: string | null; budgetPreference: string },
  location?: { city: string }
): Promise<ApiResponse<Recommendation[]>> {
  const profile = userProfile || { interests: [], mood: null, budgetPreference: 'medium' };
  const moodLabel = profile.mood || '暂无';
  const budgetMap: Record<string, string> = { low: '省钱', medium: '适中', high: '轻奢' };
  const budgetLabel = budgetMap[profile.budgetPreference] || '适中';
  const city = effectiveCity(location);

  let prompt = RECOMMENDATION_PROMPT
    .replace(/\{\{city\}\}/g, city)
    .replace('{{scene}}', scene === 'family' ? '家庭出游' : '朋友聚会')
    .replace('{{interests}}', profile.interests.length > 0 ? profile.interests.join('、') : '未指定')
    .replace('{{mood}}', moodLabel)
    .replace('{{budget}}', budgetLabel);

  const messages: LLMMessage[] = [
    { role: 'system', content: prompt },
    { role: 'user', content: `给我推荐4个${scene === 'family' ? '适合家庭出游' : '适合朋友聚会'}的下午玩法主题` },
  ];

  const content = await callLLM(apiConfig, messages, 0.8);

  // Extract JSON array
  let jsonText: string | null = null;

  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  if (!jsonText) {
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (arrayMatch) jsonText = arrayMatch[0];
  }

  if (!jsonText) {
    console.error('[getRecommendations] LLM raw response:', content);
    return { success: false, message: 'LLM 未返回有效的推荐数据' };
  }

  try {
    const raw = tryParseJSON(jsonText);
    if (!raw || !Array.isArray(raw)) {
      return { success: false, message: 'LLM 返回的不是数组格式' };
    }

    const recommendations: Recommendation[] = raw.map((item: any, idx: number) => ({
      id: `rec_${Date.now()}_${idx}`,
      title: item.title || '推荐主题',
      description: item.description || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      estimatedCost: item.estimatedCost || 0,
      vibe: item.vibe || '休闲',
      emoji: item.emoji || '✨',
    }));

    return { success: true, data: recommendations, message: '推荐成功' };
  } catch (e: any) {
    console.error('[getRecommendations] Parse failed:', e.message);
    return { success: false, message: `解析推荐数据失败: ${e.message}` };
  }
}

export async function generatePlanFromTheme(
  theme: Recommendation,
  scene: 'family' | 'friends',
  people: number,
  apiConfig: ApiConfig,
  location?: { city: string; lat?: number; lng?: number },
  amapKey?: string
): Promise<ApiResponse<Plan>> {
  const city = effectiveCity(location);
  const baseLat = location?.lat || 32.0603;
  const baseLng = location?.lng || 118.7969;
  const themePrompt = `你是一个行程规划专家。请根据以下主题，为用户生成一个完整的下午行程计划。

主题：${theme.emoji} ${theme.title}
主题描述：${theme.description}
场景：${scene === 'family' ? '家庭出游' : '朋友聚会'}
人数：${people}人

要求：
1. 行程必须紧扣主题"${theme.title}"，所有节点选择要体现这个主题的调性
2. 时间窗口默认 14:00-20:00，总时长控制在6小时内
3. 行程由多个节点组成，节点数量和类型根据主题灵活安排（3-6个节点）
4. 地点假设在{{city}}，地址要具体（包含区/街道）
5. 价格和时长要合理真实

支持的节点类型（type字段）：
- "activity": 游玩活动（紧扣主题的活动）
- "restaurant": 正餐餐厅
- "snack": 小吃/必吃（和主题相关的小吃）
- "walk": 散步/漫步
- "scenic": 景点游览
- "coffee": 咖啡/茶饮
- "bar": 酒吧/酒馆
- "shopping": 购物
- "photo": 拍照打卡

每个节点必须包含：
- type: 节点类型
- name: 名称
- location: 具体地址
- durationHours: 时长（小时，可以是小数如1.5）
- pricePerPerson: 人均价格（元，0表示免费）
- description: 简短描述（20字以内）
- category: 类别标签（如"密室""火锅""生煎"等）
- alternatives: 同类型备选2个

输出严格 JSON 格式（不要加markdown代码块标记）：
{
  "scene": "${scene}",
  "people": ${people},
  "startTime": "14:00",
  "endTime": "20:00",
  "nodes": [
    {
      "type": "scenic",
      "name": "...",
      "location": "...",
      "durationHours": number,
      "pricePerPerson": number,
      "description": "...",
      "category": "...",
      "alternatives": [{ "name": "...", "location": "...", "pricePerPerson": number, "description": "..." }]
    },
    { "type": "snack", "name": "...", "location": "...", ... },
    { "type": "restaurant", "name": "...", "location": "...", ... },
    { "type": "activity", "name": "...", "location": "...", ... },
    { "type": "coffee", "name": "...", "location": "...", ... }
  ],
  "shoppingList": [{ "name": "...", "quantity": "...", "category": "..." }] | null,
  "details": {
    "overview": "行程亮点总览（30字以内）",
    "lunch": { "name": "...", "description": "...", "location": "...", "price": number } | null,
    "dinner": { "name": "...", "description": "...", "location": "...", "price": number } | null,
    "snacks": [{ "name": "...", "description": "...", "location": "...", "price": number }] | null,
    "route": [{ "step": 1, "spot": "...", "duration": "...", "note": "..." }] | null,
    "tips": ["...", "..."]
  },
  "totalBudget": number,
  "totalDistance": number
}

重要规则：
- details: 商业街/古街推荐小吃；景区/公园规划内部路线；overview概括亮点；tips至少3条实用建议
- shoppingList: 野营/BBQ/野餐/聚会等需准备物品的活动才生成，否则设为null
- totalBudget = 所有节点费用乘以人数之和
- totalDistance 估算为 2-10km 之间的合理数字

重要：你的回复必须只包含上述 JSON 对象，不要添加任何解释文字、markdown 代码块标记或其他内容。`;

  // RAG 检索
  const { activityContext, restaurantContext } = generateRAGContext(
    `${theme.title} ${theme.description} ${theme.tags.join(' ')}`,
    city,
    scene
  );
  const ragContext = activityContext || restaurantContext
    ? `${activityContext}\n\n${restaurantContext}`
    : '';

  let prompt = themePrompt.replace(/\{\{city\}\}/g, city);
  if (ragContext) {
    // 在要求部分注入RAG上下文
    prompt = prompt.replace(
      '要求：',
      `参考信息（优先使用以下真实商家数据）：\n${ragContext}\n\n要求：`
    );
  }

  const messages: LLMMessage[] = [
    { role: 'system', content: prompt },
    { role: 'user', content: `请根据主题"${theme.title}"生成一个${people}人的${scene === 'family' ? '家庭' : '朋友'}行程计划` },
  ];

  const content = await callLLMWithJSONRetry(apiConfig, messages, 0.5);

  // Extract JSON — reuse same logic as generatePlanFromConversation
  const jsonText = extractJSONFromLLM(content);
  if (!jsonText) {
    console.error('[generatePlanFromTheme] LLM raw response:', content);
    return { success: false, message: 'LLM 未返回有效的 JSON 格式计划' };
  }

  try {
    const raw = tryParseJSON(jsonText);
    if (!raw) {
      console.error('[generatePlanFromTheme] JSON parse failed on extracted text:', jsonText.substring(0, 500));
      return { success: false, message: 'LLM 返回的 JSON 格式不完整，请重试' };
    }
    return await parseAndBuildPlan(raw, scene, people, city, baseLat, baseLng, amapKey);
  } catch (e: any) {
    console.error('[generatePlanFromTheme] JSON parse failed:', e.message);
    return { success: false, message: `解析 LLM 返回失败: ${e.message}` };
  }
}

/** 公共解析函数：将 LLM 返回的 raw JSON 解析为 Plan 对象 */
async function parseAndBuildPlan(
  raw: any,
  scene: 'family' | 'friends',
  people: number,
  city: string,
  baseLat: number,
  baseLng: number,
  amapKey: string | undefined
): Promise<ApiResponse<Plan>> {
  // === 解析 nodes 数组（新的多节点格式，兼容旧格式）===
  let rawNodes: any[] = [];

  if (Array.isArray(raw.nodes) && raw.nodes.length > 0) {
    rawNodes = raw.nodes;
  } else if (raw.activity || raw.restaurant) {
    // 兼容旧格式
    if (raw.activity) rawNodes.push({ type: 'activity', ...raw.activity });
    if (raw.restaurant) rawNodes.push({ type: 'restaurant', ...raw.restaurant });
    if (raw.extra?.name) {
      rawNodes.push({ type: raw.extra.activityType === 'bar' ? 'bar' : 'walk', ...raw.extra });
    }
  }

  if (rawNodes.length === 0) {
    return { success: false, message: 'LLM 未返回有效的行程节点' };
  }

  // 构建 PlanNode 数组
  const nodes: PlanNode[] = rawNodes.map((n: any, idx: number) => {
    const nodeType = n.type || 'activity';
    const alts: any[] = Array.isArray(n.alternatives) ? n.alternatives : [];

    const node: PlanNode = {
      id: `node_${Date.now()}_${idx}`,
      type: nodeType,
      name: n.name || '未知',
      location: n.location || `${city}市区`,
      lat: baseLat + (Math.random() - 0.5) * 0.01,
      lng: baseLng + (Math.random() - 0.5) * 0.01,
      durationHours: n.durationHours || 1,
      pricePerPerson: n.pricePerPerson || n.avgCostPerPerson || 0,
      tags: n.tags || [n.category || n.cuisine || '其他'],
      status: 'available',
      description: n.description || '',
      category: n.category || '',
      cuisine: n.cuisine || '',
      alternatives: alts.map((alt: any, aidx: number) => ({
        id: `node_alt_${Date.now()}_${idx}_${aidx}`,
        type: nodeType,
        name: alt.name || '备选',
        location: alt.location || `${city}市区`,
        lat: baseLat + (Math.random() - 0.5) * 0.01,
        lng: baseLng + (Math.random() - 0.5) * 0.01,
        durationHours: n.durationHours || 1,
        pricePerPerson: alt.pricePerPerson || alt.avgCostPerPerson || 0,
        tags: n.tags || [n.category || n.cuisine || '其他'],
        status: 'available',
        description: alt.description || '',
      })),
    };
    return node;
  });

  // 构建向后兼容的 activity / restaurant / extra
  const firstActivityNode = nodes.find((n) => n.type === 'activity') || nodes[0];
  const firstRestaurantNode = nodes.find((n) => n.type === 'restaurant');
  const lastNode = nodes[nodes.length - 1];
  const isExtra = lastNode && !['restaurant', 'activity'].includes(lastNode.type);
  const extraNode = isExtra ? lastNode : null;

  const plan: Plan = {
    id: `plan_${Date.now()}`,
    scene,
    people,
    startTime: raw.startTime || '14:00',
    endTime: raw.endTime || '20:00',
    nodes,
    activity: {
      id: firstActivityNode.id,
      name: firstActivityNode.name,
      category: firstActivityNode.category || '活动',
      location: firstActivityNode.location,
      lat: firstActivityNode.lat,
      lng: firstActivityNode.lng,
      durationHours: firstActivityNode.durationHours,
      pricePerPerson: firstActivityNode.pricePerPerson,
      tags: firstActivityNode.tags,
      openingHours: firstActivityNode.openingHours || '10:00-22:00',
      availableSlots: ['14:00'],
      status: 'available',
      alternatives: [],
      description: firstActivityNode.description,
    },
    restaurant: firstRestaurantNode
      ? {
          id: firstRestaurantNode.id,
          name: firstRestaurantNode.name,
          cuisine: firstRestaurantNode.cuisine || firstRestaurantNode.category || '中餐',
          location: firstRestaurantNode.location,
          lat: firstRestaurantNode.lat,
          lng: firstRestaurantNode.lng,
          priceLevel: 2,
          tags: firstRestaurantNode.tags,
          healthyOptions: false,
          kidsFriendly: scene === 'family',
          avgCostPerPerson: firstRestaurantNode.pricePerPerson,
          status: 'available',
          alternatives: [],
          description: firstRestaurantNode.description,
          durationHours: firstRestaurantNode.durationHours,
        }
      : {
          id: `res_${Date.now()}`,
          name: '未知餐厅',
          cuisine: '中餐',
          location: `${city}市区`,
          lat: baseLat,
          lng: baseLng,
          priceLevel: 2,
          tags: ['中餐'],
          healthyOptions: false,
          kidsFriendly: scene === 'family',
          avgCostPerPerson: 80,
          status: 'available',
          alternatives: [],
          durationHours: 1.5,
        },
    extra: extraNode
      ? {
          type: null,
          name: extraNode.name,
          durationHours: extraNode.durationHours,
          activityType: extraNode.type,
          free: extraNode.pricePerPerson === 0,
          pricePerPerson: extraNode.pricePerPerson,
          description: extraNode.description || '',
        }
      : null,
    shoppingList: Array.isArray(raw.shoppingList)
      ? raw.shoppingList.map((item: any) => ({
          name: item.name || '',
          quantity: item.quantity || '1份',
          category: item.category || '其他',
        }))
      : undefined,
    details: raw.details
      ? {
          overview: raw.details.overview || '',
          lunch: raw.details.lunch || undefined,
          dinner: raw.details.dinner || undefined,
          snacks: Array.isArray(raw.details.snacks) ? raw.details.snacks : undefined,
          route: Array.isArray(raw.details.route) ? raw.details.route : undefined,
          tips: Array.isArray(raw.details.tips) ? raw.details.tips : [],
        }
      : undefined,
    totalBudget: raw.totalBudget || 0,
    totalDistance: raw.totalDistance || 3,
    status: 'draft',
  };

  // === 使用高德 POI + 美团增强获取真实商家信息 ===
  if (amapKey) {
    for (let i = 0; i < plan.nodes.length; i++) {
      plan.nodes[i] = await enrichNodeWithMeituan(plan.nodes[i], city, amapKey);
      if (plan.nodes[i].alternatives) {
        plan.nodes[i].alternatives = enrichNodeAlternatives(plan.nodes[i].alternatives!, city);
      }
    }
  }

  return { success: true, data: plan, message: '行程规划成功' };
}

// ============ Plan Generation ============

const PLAN_GENERATION_PROMPT = `你是一个行程规划专家。根据以下对话记录和参考信息，为用户生成一个完整的下午行程计划。

{{RAG_CONTEXT}}

要求：
1. 时间窗口默认 14:00-20:00，总时长控制在6小时内，但根据需求可灵活调整（如全天行程、夜游等）
2. 行程由多个节点组成，节点数量和类型根据场景灵活安排，不固定为3个
3. 地点假设在{{city}}，地址要具体（包含区/街道）
4. 价格和时长要合理真实，参考上述参考信息中的真实数据
5. 节点选择要符合场景特征（家庭/朋友），如家庭要亲子友好，朋友要社交氛围
6. 如果对话提到特殊需求（如儿童、低卡），要在选择中体现
7. 人数必须从对话中提取，如果未明确提到则默认为2
8. 优先推荐参考信息中的真实商家，如果没有合适的再自行发挥
9. 节点顺序要合理，考虑地理位置的连贯性

支持的节点类型（type字段）：
- "activity": 游玩活动（乐园、KTV、密室等）
- "restaurant": 正餐餐厅（午餐/晚餐）
- "snack": 小吃/必吃（街边小吃、甜品店等，这类要在下面加团购搜索）
- "walk": 散步/漫步（公园、湖边、古街等）
- "scenic": 景点游览（博物馆、寺庙、自然景区等）
- "coffee": 咖啡/茶饮（下午茶、咖啡馆歇脚）
- "bar": 酒吧/酒馆（夜生活）
- "shopping": 购物（商场、市集、文创店）
- "photo": 拍照打卡（网红点、观景台）
- "rest": 休息（酒店大堂、休息区等）

每个节点必须包含：
- type: 节点类型（从上面的列表选）
- name: 名称
- location: 具体地址
- durationHours: 时长（小时，可以是小数如1.5）
- pricePerPerson: 人均价格（元，0表示免费）
- description: 简短描述（20字以内）
- category: 类别标签（活动写"游乐园""密室"等，餐厅写"火锅""日料"等，小吃写"生煎""奶茶"等）
- alternatives: 同类型备选2个（每个包含 name, location, pricePerPerson, description）

节点安排策略：
- 简单半日游: 3-4个节点（如 景点→午餐→咖啡→散步）
- 标准一日游: 5-6个节点（如 景点→小吃→午餐→活动→晚餐→酒吧/夜景）
- 深度游/逛街: 6-8个节点（加入购物、多次小吃、拍照点等）
- 亲子游: 加入休息节点，餐厅选亲子友好

输出严格 JSON 格式（不要加markdown代码块标记）：
{
  "scene": "family" | "friends",
  "people": number,
  "startTime": "14:00",
  "endTime": "20:00",
  "nodes": [
    {
      "type": "scenic",
      "name": "...",
      "location": "...",
      "durationHours": number,
      "pricePerPerson": number,
      "description": "...",
      "category": "...",
      "alternatives": [
        { "name": "...", "location": "...", "pricePerPerson": number, "description": "..." }
      ]
    },
    { "type": "snack", "name": "...", ... },
    { "type": "restaurant", "name": "...", ... },
    { "type": "walk", "name": "...", ... },
    { "type": "coffee", "name": "...", ... }
  ],
  "shoppingList": [{ "name": "...", "quantity": "...", "category": "..." }] | null,
  "details": {
    "overview": "行程亮点总览（30字以内）",
    "lunch": { "name": "...", "description": "...", "location": "...", "price": number } | null,
    "dinner": { "name": "...", "description": "...", "location": "...", "price": number } | null,
    "snacks": [{ "name": "...", "description": "...", "location": "...", "price": number }] | null,
    "route": [{ "step": 1, "spot": "...", "duration": "...", "note": "..." }] | null,
    "tips": ["...", "..."]
  },
  "totalBudget": number,
  "totalDistance": number
}

重要规则：
- details: 商业街/古街推荐小吃；景区/公园规划内部路线；全天行程包含午餐晚餐；overview概括亮点；tips至少3条实用建议
- shoppingList: 野营/BBQ/野餐/聚会等需准备物品的活动才生成，否则设为null
- totalBudget = 所有节点费用乘以人数之和（加上午餐/晚餐/小吃额外费用）
- totalDistance 估算为 2-15km 之间的合理数字（节点越多距离越长）
- snack类型的节点：如果是必吃小吃，description里标注"必吃""招牌""网红"等词

重要：你的回复必须只包含上述 JSON 对象，不要添加任何解释文字、markdown 代码块标记或其他内容。`;

export async function generatePlanFromConversation(
  history: ChatMessage[],
  apiConfig: ApiConfig,
  location?: { city: string; lat?: number; lng?: number },
  amapKey?: string
): Promise<ApiResponse<Plan>> {
  const city = effectiveCity(location);
  const baseLat = location?.lat || 32.0603;
  const baseLng = location?.lng || 118.7969;

  // === 1. RAG 检索：从知识库获取真实商家信息 ===
  const conversationText = history
    .map((msg) => `${msg.role === 'user' ? '用户' : '助手'}：${msg.content}`)
    .join('\n');

  // 从对话中提取场景
  let sceneHint: 'family' | 'friends' = 'family';
  if (conversationText.includes('朋友') || conversationText.includes('聚会') || conversationText.includes('同事')) {
    sceneHint = 'friends';
  }

  const { activityContext, restaurantContext } = generateRAGContext(conversationText, city, sceneHint);
  const ragContext = activityContext || restaurantContext
    ? `${activityContext}\n\n${restaurantContext}`
    : '';

  // === 2. 构建带 RAG 上下文的提示词 ===
  let prompt = PLAN_GENERATION_PROMPT.replace(/\{\{city\}\}/g, city);
  if (ragContext) {
    prompt = prompt.replace('{{RAG_CONTEXT}}', ragContext);
  } else {
    prompt = prompt.replace('{{RAG_CONTEXT}}\n\n', '').replace('{{RAG_CONTEXT}}', '');
  }

  const messages: LLMMessage[] = [
    { role: 'system', content: prompt },
  ];

  messages.push({
    role: 'user',
    content: `根据以下对话记录生成行程计划：\n\n${conversationText}`,
  });

  const content = await callLLMWithJSONRetry(apiConfig, messages, 0.3);

  // Extract JSON — try multiple strategies
  const jsonText = extractJSONFromLLM(content);
  if (!jsonText) {
    console.error('[generatePlan] LLM raw response:', content.substring(0, 2000));
    return { success: false, message: 'LLM 未返回有效的 JSON 格式计划' };
  }

  try {
    const raw = tryParseJSON(jsonText);
    if (!raw) {
      console.error('[generatePlan] JSON parse failed on extracted text:', jsonText.substring(0, 500));
      return { success: false, message: 'LLM 返回的 JSON 格式不完整，请重试' };
    }
    const scene = raw.scene || 'family';
    const people = raw.people || 2;

    return await parseAndBuildPlan(raw, scene, people, city, baseLat, baseLng, amapKey);
  } catch (e: any) {
    console.error('[generatePlan] JSON parse failed:', e.message);
    console.error('[generatePlan] Raw text was:', jsonText?.substring(0, 500));
    return { success: false, message: `解析 LLM 返回失败: ${e.message}` };
  }
}

// ============ Mock Booking APIs ============

export async function checkAvailability(
  _restaurantId: string,
  _datetime: string,
  _people: number
): Promise<ApiResponse<{ available: boolean; queueMinutes: number }>> {
  await delay(300);
  const rand = Math.random();
  if (rand < 0.7) {
    return { success: true, data: { available: true, queueMinutes: 0 }, message: '有位置' };
  } else if (rand < 0.9) {
    return { success: true, data: { available: true, queueMinutes: 30 }, message: '需排队30分钟' };
  }
  return { success: false, data: { available: false, queueMinutes: 0 }, message: '今日已订满' };
}

export async function bookActivity(
  activityId: string,
  _datetime: string,
  _participants: number
): Promise<ApiResponse<{ bookingId: string; totalPrice: number; qrCode: string }>> {
  await delay(600);
  return {
    success: true,
    data: {
      bookingId: `BOOK_${activityId}_${Date.now()}`,
      totalPrice: 0,
      qrCode: `https://mock.com/qr/${activityId}`,
    },
    message: '预订成功，电子票已发送',
  };
}

export async function bookRestaurant(
  restaurantId: string,
  _datetime: string,
  _people: number
): Promise<ApiResponse<{ bookingId: string; expireMinutes: number }>> {
  await delay(600);
  return {
    success: true,
    data: {
      bookingId: `RBOOK_${restaurantId}_${Date.now()}`,
      expireMinutes: 30,
    },
    message: '预订成功！保留30分钟',
  };
}

export async function orderGift(
  type: string,
  deliveryTime: string,
  _message: string
): Promise<ApiResponse<{ orderId: string; trackingUrl: string }>> {
  await delay(500);
  return {
    success: true,
    data: {
      orderId: `GIFT_${Date.now()}`,
      trackingUrl: `https://mock.com/track/${Date.now()}`,
    },
    message: `已下单，${type === 'flowers' ? '鲜花' : '蛋糕'}预计${deliveryTime}送达`,
  };
}

export async function sendPlan(contact: string, _summary: string): Promise<ApiResponse<null>> {
  await delay(400);
  return { success: true, message: `已发送给${contact}` };
}

export async function executePlanSteps(
  plan: Plan,
  people: number,
  extraService: { enabled: boolean; type?: string; deliveryTime?: string; message?: string } | null,
  onProgress: (steps: ExecutionStep[]) => void
): Promise<boolean> {
  const steps: ExecutionStep[] = [
    { id: 'book_activity', name: '预订活动', status: 'pending' },
    { id: 'book_restaurant', name: '预订餐厅', status: 'pending' },
    ...(extraService?.enabled ? [{ id: 'order_gift', name: extraService.type === 'flowers' ? '订购鲜花' : '订购蛋糕', status: 'pending' as const }] : []),
    { id: 'send_plan', name: '发送计划给联系人', status: 'pending' },
  ];

  steps[0].status = 'running';
  onProgress([...steps]);
  await delay(800);
  const activityRes = await bookActivity(plan.activity.id, `${plan.startTime}`, people);
  steps[0].status = activityRes.success ? 'success' : 'failed';
  steps[0].message = activityRes.message;
  onProgress([...steps]);
  if (!activityRes.success) return false;

  steps[1].status = 'running';
  onProgress([...steps]);
  await delay(600);
  const availRes = await checkAvailability(plan.restaurant.id, `${plan.startTime}`, people);
  if (!availRes.success || !availRes.data?.available) {
    steps[1].status = 'failed';
    steps[1].message = availRes.message;
    onProgress([...steps]);
    return false;
  }

  const restRes = await bookRestaurant(plan.restaurant.id, `${plan.startTime}`, people);
  steps[1].status = restRes.success ? 'success' : 'failed';
  steps[1].message = restRes.message;
  onProgress([...steps]);
  if (!restRes.success) return false;

  if (extraService?.enabled) {
    const giftIdx = steps.findIndex((s) => s.id === 'order_gift');
    if (giftIdx >= 0) {
      steps[giftIdx].status = 'running';
      onProgress([...steps]);
      await delay(600);
      const giftRes = await orderGift(
        extraService.type || 'flowers',
        extraService.deliveryTime || '19:00',
        extraService.message || ''
      );
      steps[giftIdx].status = giftRes.success ? 'success' : 'failed';
      steps[giftIdx].message = giftRes.message;
      onProgress([...steps]);
      if (!giftRes.success) return false;
    }
  }

  const sendIdx = steps.findIndex((s) => s.id === 'send_plan');
  steps[sendIdx].status = 'running';
  onProgress([...steps]);
  await delay(400);
  const sendRes = await sendPlan(plan.scene === 'family' ? '老婆' : '朋友', '行程安排已确认');
  steps[sendIdx].status = sendRes.success ? 'success' : 'failed';
  steps[sendIdx].message = sendRes.message;
  onProgress([...steps]);

  return steps.every((s) => s.status === 'success');
}
