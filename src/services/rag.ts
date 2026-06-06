/**
 * RAG (Retrieval-Augmented Generation) 服务
 * 基于本地知识库 + 简单向量检索，为行程规划提供真实商家数据增强
 */

import { travelKnowledgeBase, type KnowledgeItem } from '../data/travelKnowledge';

/** 分词并过滤停用词 */
function tokenize(text: string): string[] {
  const stopWords = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '吗', '吧', '呢', '啊', '哦', '嗯'
  ]);
  // 简单的中文分词：按字符拆分，过滤停用词和标点
  return text
    .toLowerCase()
    .replace(/[^一-龥a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !stopWords.has(w));
}

/** 计算TF-IDF向量 */
function computeTfIdfVector(tokens: string[], vocab: Map<string, number>): Float32Array {
  const vec = new Float32Array(vocab.size);
  const tf: Map<string, number> = new Map();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  for (const [term, idx] of vocab) {
    vec[idx] = tf.get(term) || 0;
  }
  return vec;
}

/** 归一化向量 */
function normalize(vec: Float32Array): Float32Array {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum);
  if (norm === 0) return vec;
  const result = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    result[i] = vec[i] / norm;
  }
  return result;
}

/** 余弦相似度 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot; // 已归一化，点积即相似度
}

/** RAG检索结果 */
export interface RAGResult {
  item: KnowledgeItem;
  score: number;
}

class RAGEngine {
  private vocab: Map<string, number> = new Map();
  private vectors: Float32Array[] = [];
  private items: KnowledgeItem[] = [];
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;

    // 构建词汇表
    const allTokens: string[][] = [];
    for (const item of travelKnowledgeBase) {
      const text = `${item.name} ${item.location} ${item.category} ${item.tags.join(' ')} ${item.description}`;
      const tokens = tokenize(text);
      allTokens.push(tokens);
      for (const t of tokens) {
        if (!this.vocab.has(t)) {
          this.vocab.set(t, this.vocab.size);
        }
      }
    }

    // 计算每个文档的TF-IDF向量并归一化
    for (const tokens of allTokens) {
      const vec = computeTfIdfVector(tokens, this.vocab);
      this.vectors.push(normalize(vec));
    }

    this.items = [...travelKnowledgeBase];
    this.initialized = true;
  }

  /** 根据查询检索相关知识 */
  search(query: string, topK: number = 5): RAGResult[] {
    const queryTokens = tokenize(query);
    const queryVec = normalize(computeTfIdfVector(queryTokens, this.vocab));

    const results: RAGResult[] = [];
    for (let i = 0; i < this.vectors.length; i++) {
      const score = cosineSimilarity(queryVec, this.vectors[i]);
      if (score > 0.05) {
        results.push({ item: this.items[i], score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /** 检索餐厅相关信息 */
  searchRestaurants(query: string, city?: string, topK: number = 3): RAGResult[] {
    let q = query + ' 餐厅 美食';
    if (city) q += ` ${city}`;
    return this.search(q, topK);
  }

  /** 检索活动和景点 */
  searchActivities(query: string, city?: string, topK: number = 3): RAGResult[] {
    let q = query + ' 景点 活动';
    if (city) q += ` ${city}`;
    return this.search(q, topK);
  }

  /** 检索酒店/住宿 */
  searchHotels(query: string, city?: string, topK: number = 3): RAGResult[] {
    let q = query + ' 酒店 住宿';
    if (city) q += ` ${city}`;
    return this.search(q, topK);
  }

  /** 格式化检索结果为上下文文本 */
  formatContext(results: RAGResult[]): string {
    if (results.length === 0) return '';

    const lines: string[] = ['【参考信息】'];
    for (const r of results) {
      const item = r.item;
      lines.push(`- ${item.name}（${item.category}，${item.location}）`);
      lines.push(`  评分：${item.rating}分 | 人均：¥${item.avgCost}`);
      if (item.phone) lines.push(`  电话：${item.phone}`);
      if (item.businessHours) lines.push(`  营业时间：${item.businessHours}`);
      lines.push(`  简介：${item.description}`);
      if (item.tags.length > 0) lines.push(`  标签：${item.tags.join('、')}`);
      lines.push('');
    }
    return lines.join('\n');
  }
}

export const ragEngine = new RAGEngine();

/** 为行程规划生成RAG增强的上下文 */
export function generateRAGContext(
  userQuery: string,
  city: string,
  scene: 'family' | 'friends'
): { activityContext: string; restaurantContext: string; hotelContext: string } {
  const sceneQuery = scene === 'family' ? '亲子 家庭' : '聚会 朋友';

  const activityResults = ragEngine.searchActivities(userQuery + ' ' + sceneQuery, city, 5);
  const restaurantResults = ragEngine.searchRestaurants(userQuery + ' ' + sceneQuery, city, 5);
  const hotelResults = ragEngine.searchHotels(userQuery, city, 3);

  return {
    activityContext: ragEngine.formatContext(activityResults),
    restaurantContext: ragEngine.formatContext(restaurantResults),
    hotelContext: ragEngine.formatContext(hotelResults),
  };
}
