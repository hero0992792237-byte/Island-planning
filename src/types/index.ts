export type Scene = 'family' | 'friends';
export type PlanStatus = 'draft' | 'confirmed' | 'executed';
export type NodeStatus = 'available' | 'booked';
export type ExtraType = 'flowers' | 'cake' | null;

/** 节点类型 - 行程中的各种节点 */
export type PlanNodeType =
  | 'activity'      // 游玩活动
  | 'restaurant'    // 正餐餐厅
  | 'snack'         // 小吃/必吃
  | 'walk'          // 散步/漫步
  | 'scenic'        // 景点
  | 'shopping'      // 购物
  | 'coffee'        // 咖啡/茶饮
  | 'bar'           // 酒吧/酒馆
  | 'transport'     // 交通
  | 'hotel'         // 住宿
  | 'rest'          // 休息
  | 'photo';        // 拍照打卡

/** 节点类型中文标签 */
export const NODE_TYPE_LABELS: Record<PlanNodeType, string> = {
  activity: '活动',
  restaurant: '餐厅',
  snack: '必吃',
  walk: '漫步',
  scenic: '景点',
  shopping: '购物',
  coffee: '咖啡',
  bar: '酒吧',
  transport: '交通',
  hotel: '住宿',
  rest: '休息',
  photo: '打卡',
};

/** 节点类型emoji */
export const NODE_TYPE_EMOJIS: Record<PlanNodeType, string> = {
  activity: '🎯',
  restaurant: '🍽️',
  snack: '🍡',
  walk: '🚶',
  scenic: '🏞️',
  shopping: '🛍️',
  coffee: '☕',
  bar: '🍸',
  transport: '🚇',
  hotel: '🏨',
  rest: '💤',
  photo: '📸',
};

/** ==========================================
 *  统一的行程节点类型（新的多节点架构）
 *  ========================================== */
export interface PlanNode {
  id: string;
  type: PlanNodeType;
  name: string;
  location: string;
  lat: number;
  lng: number;
  durationHours: number;
  pricePerPerson: number;
  tags: string[];
  status: NodeStatus;
  description?: string;

  // 美团/增强字段
  phone?: string;
  meituanUrl?: string;
  meituanDealUrl?: string;
  xiaohongshuUrl?: string;
  rating?: number;
  businessHours?: string;
  openingHours?: string;

  // 类型特定字段
  category?: string;       // activity, scenic 用
  cuisine?: string;        // restaurant, snack 用
  priceLevel?: number;     // restaurant 用
  healthyOptions?: boolean;
  kidsFriendly?: boolean;
  free?: boolean;          // walk, scenic 用

  // 备选（同一个节点类型）
  alternatives?: PlanNode[];
  /** 用户上传的照片ID列表 */
  photoIds?: string[];
}

/** ==========================================
 *  以下为兼容旧架构的独立节点类型
 *  ========================================== */

export interface ActivityNode {
  id: string;
  name: string;
  category: string;
  location: string;
  lat: number;
  lng: number;
  durationHours: number;
  pricePerPerson: number;
  tags: string[];
  openingHours: string;
  availableSlots: string[];
  status: NodeStatus;
  alternatives: ActivityNode[];
  description?: string;
  /** 活动电话 */
  phone?: string;
  /** 美团/大众点评链接 */
  meituanUrl?: string;
  /** 小红书笔记链接 */
  xiaohongshuUrl?: string;
  /** 商家评分 */
  rating?: number;
}

export interface RestaurantNode {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  lat: number;
  lng: number;
  priceLevel: number;
  tags: string[];
  healthyOptions: boolean;
  kidsFriendly: boolean;
  avgCostPerPerson: number;
  status: NodeStatus;
  alternatives: RestaurantNode[];
  queueMinutes?: number;
  description?: string;
  durationHours?: number;
  /** 餐厅电话 */
  phone?: string;
  /** 美团商家详情页链接 */
  meituanUrl?: string;
  /** 美团团购/套餐页面链接 */
  meituanDealUrl?: string;
  /** 小红书笔记链接 */
  xiaohongshuUrl?: string;
  /** 商家评分 */
  rating?: number;
  /** 营业时间 */
  businessHours?: string;
}

export interface ShoppingItem {
  name: string;
  quantity: string;
  category: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
  city: string;
  district: string;
  address: string;
  loaded: boolean;
  error?: string;
  /** 用户手动指定的城市（优先级高于自动定位的 city） */
  manualCity?: string;
}

export interface ExtraNode {
  type: ExtraType;
  name: string;
  durationHours: number;
  activityType: string;
  free: boolean;
  pricePerPerson: number;
  description: string;
  enabled?: boolean;
  deliveryTime?: string;
  message?: string;
}

export interface PlanDetailItem {
  name: string;
  description: string;
  location?: string;
  price?: number;
}

export interface PlanDetails {
  overview: string;
  morning?: PlanDetailItem;
  lunch?: PlanDetailItem;
  afternoon?: PlanDetailItem;
  dinner?: PlanDetailItem;
  snacks?: PlanDetailItem[];
  route?: Array<{ step: number; spot: string; duration: string; note: string }>;
  tips: string[];
}

export interface Plan {
  id: string;
  scene: Scene;
  people: number;
  startTime: string;
  endTime: string;
  /** 新的多节点行程流（主要数据结构） */
  nodes: PlanNode[];
  /** 保留旧字段向后兼容 */
  activity: ActivityNode;
  restaurant: RestaurantNode;
  extra: ExtraNode | null;
  totalBudget: number;
  totalDistance: number;
  status: PlanStatus;
  shoppingList?: ShoppingItem[];
  details?: PlanDetails;
}

export interface UserIntent {
  scene: Scene;
  people: number;
  dietConstraint?: 'low_cal';
  kidsAge?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
}

export interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message?: string;
}

export interface ExtraService {
  type: 'flowers' | 'cake' | 'delivery';
  label: string;
  price: number;
  enabled: boolean;
  deliveryTime: string;
  message: string;
}

export type UIState = 'compact' | 'bar' | 'expanded' | 'voice';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  type?: 'text' | 'plan' | 'confirm';
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  tags: string[];
  estimatedCost: number;
  vibe: string;
  emoji: string;
}

export type Mood = 'happy' | 'tired' | 'relaxed' | 'excited' | 'lonely' | 'social' | 'adventurous' | 'romantic';

export interface UserProfile {
  interests: string[];
  mood: Mood | null;
  budgetPreference: 'low' | 'medium' | 'high';
}

export const INTEREST_TAGS = [
  { category: '户外', tags: ['爬山', '骑行', '露营', '公园漫步'] },
  { category: '运动', tags: ['健身', '球类', '游泳', '滑雪'] },
  { category: '娱乐', tags: ['游乐园', '密室逃脱', '剧本杀', 'KTV'] },
  { category: '文艺', tags: ['看展', '书店', '咖啡馆', '音乐会'] },
  { category: '美食', tags: ['探店', '甜品', '烧烤', '火锅'] },
  { category: '社交', tags: ['酒吧', '桌游', '派对', '露台'] },
] as const;

export const MOOD_OPTIONS: { value: Mood; label: string; emoji: string }[] = [
  { value: 'happy', label: '开心想嗨', emoji: '😊' },
  { value: 'tired', label: '疲惫想放松', emoji: '😴' },
  { value: 'relaxed', label: '想安静独处', emoji: '🧘' },
  { value: 'excited', label: '想尝试新鲜', emoji: '🤩' },
  { value: 'romantic', label: '浪漫约会', emoji: '💕' },
  { value: 'social', label: '聚会社交', emoji: '🎉' },
  { value: 'adventurous', label: '冒险刺激', emoji: '🔥' },
  { value: 'lonely', label: '想静静', emoji: '🍃' },
];

export interface ApiConfig {
  key: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
}

export interface MapConfig {
  amapKey: string;
  useRealMap: boolean;
}

// ===================== 用户账户类型 =====================

export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  phone?: string;
  bio?: string;
  createdAt: number;
}

export interface Friend {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  status: 'online' | 'offline';
  lastSeen?: number;
}

export interface UserAuthState {
  isLoggedIn: boolean;
  user: User | null;
  token: string | null;
  friends: Friend[];
  inviteCode: string;
  inviteCount: number;
  freeApiQuota: number;
}

// ===================== 行程记录扩展类型 =====================

/** 行程分类 */
export type JournalCategory = 'work' | 'study' | 'travel';

/** 行程记录条目（核心数据模型） */
export interface JournalEntry {
  id: string;
  title: string;
  category: JournalCategory;
  startTime: string;      // ISO格式: "2024-01-15T14:00:00"
  endTime: string;
  location: {
    name: string;
    lat?: number;
    lng?: number;
    address?: string;
  };
  description: string;
  cost: number;
  photoIds: string[];
  source: 'ai' | 'manual';   // 来源区分
  status: 'planned' | 'completed' | 'missed';
  createdAt: number;
}

/** 分类视觉规范配置 */
export interface CategoryConfig {
  key: JournalCategory;
  label: string;
  color: string;         // Tailwind bg类名
  lightColor: string;    // Tailwind bg类名（浅色）
  borderColor: string;   // Tailwind border类名
  textColor: string;     // Tailwind text类名
  iconName: string;      // lucide icon name
  hex: string;           // 16进制色值
  lightHex: string;      // 浅色16进制
}

/** 月度汇总 */
export interface MonthlySummary {
  year: number;
  month: number;
  totalCost: number;
  totalDistance: number;
  categoryBreakdown: Record<JournalCategory, number>;
  entryCount: number;
  completedCount: number;
}
