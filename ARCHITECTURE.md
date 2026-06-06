# 迹划 AI 行程规划系统 - 架构设计文档

**版本**: v1.0.0 | **日期**: 2026-06-06

---

## 1. Planning 策略

### 双模式规划引擎

**模式 A: 对话式规划** (`generatePlanFromConversation`)
- 用户通过自然语言对话逐步明确需求（场景/人数/时间/特殊需求）
- **RAG 增强**: 基于本地知识库的 TF-IDF 向量检索，为 LLM 提供真实商家数据
- 输出: 3-8个节点的多节点行程计划（支持10种节点类型）

**模式 B: 主题式规划** (`generatePlanFromTheme`)
- 用户选择灵感推荐主题后一键生成
- LLM 基于用户画像（兴趣/心情/预算）生成4个创意主题
- 强制所有节点符合主题调性
- 输出: 14:00-20:00 完整下午行程

### 节点编排策略

```
简单半日游: 3-4 节点 (景点→午餐→咖啡→散步)
标准一日游: 5-6 节点 (景点→小吃→午餐→活动→晚餐→酒吧)
深度逛街:  6-8 节点 (加入购物、多次小吃、拍照点)
```

**10种节点类型**: activity, restaurant, snack, walk, scenic, coffee, bar, shopping, photo, rest

### 增强策略

**高德 POI + 美团双重增强**:
1. 高德 POI API → 真实地址、电话、评分、营业时间
2. 自动构建美团搜索/团购链接 + 小红书种草链接
3. 餐厅/小吃/咖啡/酒吧 → 生成团购链接；其他 → 仅搜索链接

---

## 2. 工具调用链路

### 整体调用流程

```
用户输入
  ↓
[前端] InputPanel.handleSend() / handleGenerate()
  ↓
[前端] api.ts → chatWithAgent() / generatePlanFromConversation()
  ↓
[外部 API] StepFun LLM + 高德 POI API
  ↓
[前端] 解析 JSON → 构建 Plan 对象 → 渲染行程
```

### LLM 调用链路

**核心**: `callLLMWithJSONRetry` (api.ts:108-136)

```
Step 1: 调用 LLM (temperature=0.7, max_tokens=8192)
  ↓
Step 2: 提取 JSON (3种策略)
  ├─ markdown 代码块 ```json ... ```
  ├─ 匹配第一个 { ... } 完整对象
  └─ 截取到最后一个 } 递归重试
  ↓
Step 3: 验证 JSON
  ├─ 直接解析
  └─ 失败 → 截断到最后一个 } 递归
  ↓
Step 4: 失败重试 (最多1次)
  └─ 将错误内容发回 LLM 要求修正
  ↓
Step 5: 解析成功 → parseAndBuildPlan() → Plan 对象
```

### RAG 检索链路

**核心**: `generateRAGContext` (rag.ts)

```
用户查询 / 对话历史
  ↓
[分词] tokenize() - 中文分词 + 停用词过滤
  ↓
[向量化] computeTfIdfVector() - TF-IDF 向量化
  ↓
[检索] RAGEngine.search(topK=5) - 余弦相似度匹配
  ↓
[注入] 将 topK 知识库项注入到 LLM System Prompt
```

**知识库**: `travelKnowledgeBase` - 本地静态商家数据（南京地区）

### 美团增强链路

**核心**: `enrichNodeWithMeituan` (meituanApi.ts:270-327)

```
PlanNode (来自 LLM)
  ↓
[高德 POI 搜索] searchPOIDetail(name, city, amapKey)
  ├─ POST https://restapi.amap.com/v5/place/text
  ├─ 返回: name, address, tel, location, rating, business_hours
  ↓
[解析增强数据] 坐标 / 评分 / 人均 / 电话
  ↓
[构建链接] 美团搜索 + 美团团购 + 小红书
  ↓
增强后的 PlanNode
```

### 执行预订链路

**核心**: `executePlanSteps` (api.ts:828-895)

```
用户点击"一键安排"
  ↓
Step 1: 预订活动 (bookActivity) → 600ms
  ↓
Step 2: 检查餐厅余位 (checkAvailability) → 300ms
  ↓
Step 3: 预订餐厅 (bookRestaurant) → 600ms
  ↓
[可选] Step 4: 订购鲜花/蛋糕 (orderGift) → 600ms
  ↓
Step 5: 发送计划给联系人 (sendPlan) → 400ms
  ↓
ExecutionProgress 实时更新状态
```

**状态流转**: `pending` → `running` → `success` | `failed`

---

## 3. 异常处理机制

### LLM 调用异常

| 异常类型 | 处理策略 | 用户反馈 |
|---------|---------|---------|
| HTTP 错误 | 解析错误体 | "HTTP {status}: {error}" |
| JSON 解析失败 | 自动重试1次，发回修正 | "JSON 格式不完整，请重试" |
| 空响应 | 直接返回失败 | "LLM 未返回有效数据" |
| 超时 | 依赖 fetch 超时机制 | "请求超时，请重试" |

### 高德 POI 异常

**策略**: 静默失败 + 降级链路

```
1. 高德 POI 成功 → 完整增强（地址+电话+评分+链接）
2. 高德 POI 失败 → 仅生成美团/小红书链接
3. 链接生成失败 → 返回原始节点
```

### 执行步骤异常

**策略**: 失败停止 + 部分成功

```typescript
steps[0].status = 'running'; onProgress([...steps]);
const activityRes = await bookActivity(...);
steps[0].status = activityRes.success ? 'success' : 'failed';
steps[0].message = activityRes.message;
onProgress([...steps]);
if (!activityRes.success) return false; // 失败停止
```

**规则**:
- 单步失败 → 停止后续步骤
- 前端根据 `executionSuccess` 显示"全部搞定" / "部分完成"
- 失败步骤保留 `message` 用于展示错误原因

### 前端异常边界

**ErrorBoundary**: 捕获组件树渲染异常

**InputPanel 异常处理**:
```typescript
try {
  const reply = await chatWithAgent(...);
  addMessage('agent', reply);
} catch (e: any) {
  addMessage('agent', `抱歉，出错了：${e.message}。请检查 API 设置。`);
} finally {
  dispatch({ type: 'SET_LOADING', payload: false });
}
```

**规则**:
- 所有异步操作必须 `try/catch`
- 错误必须 `addMessage` 到聊天记录
- 必须 `finally` 清理 loading 状态

### 数据验证异常

**JSON 解析多层容错**:
```
tryParseJSON(text)
  ├─ 直接 JSON.parse()
  ├─ 失败 → 截断到最后一个 } 递归
  └─ 失败 → 返回 null → 触发 LLM 重试
```

**类型守卫**: 所有外部数据必须 `Array.isArray()` / `typeof` 校验

---

## 4. 关键设计决策

### 4.1 为什么用 Mock API？

- **快速迭代**: 预订是演示功能，真实 API 对接需要商户合同
- **稳定性**: 避免第三方 API 故障影响核心行程规划
- **可扩展**: `bookActivity` / `bookRestaurant` 可轻松替换为真实 API

### 4.2 为什么选择 TF-IDF 而非 Embedding？

- **轻量**: 无需训练模型，本地运行
- **可解释**: 词汇表可见，匹配逻辑透明
- **足够精准**: 固定领域商家检索，TF-IDF 效果足够

### 4.3 为什么保留双格式兼容？

- **向后兼容**: 旧版 LLM 返回 `activity + restaurant` 格式
- **平滑升级**: 新版 LLM 返回 `nodes[]` 数组格式
- **降级策略**: 旧格式自动转换为新格式，不破坏用户体验

---

**文档维护**: Claude Code | **最后更新**: 2026-06-06 | **页数**: 2
