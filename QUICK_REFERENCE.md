# 🏝️ 迹划 - 快速参考卡

## 🚀 快速启动

```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
```

**服务地址**:
- 前端: http://localhost:3000
- 后端: http://localhost:3001
- 健康检查: http://localhost:3001/api/health

---

## 📁 核心文件速查

### 前端组件
| 文件 | 功能 | 关键代码 |
|------|------|---------|
| `src/components/FloatingIsland.tsx` | 灵动岛主组件 | 拖拽、状态切换 |
| `src/components/ExpandedView.tsx` | 展开卡片 | 主界面布局 |
| `src/components/InputPanel.tsx` | 对话界面 | `handleSend`, `handleGenerate` |
| `src/components/ExecutionProgress.tsx` | 执行进度 | 预订状态展示 |
| `src/components/MapView.tsx` | 高德地图 | 轨迹展示 |

### 服务层
| 文件 | 功能 | 关键函数 |
|------|------|---------|
| `src/services/api.ts` | LLM 调用 + 行程规划 | `callLLMWithJSONRetry`, `generatePlanFromConversation`, `executePlanSteps` |
| `src/services/meituanApi.ts` | 高德 POI + 美团链接 | `enrichNodeWithMeituan`, `searchPOIDetail` |
| `src/services/rag.ts` | RAG 检索 | `generateRAGContext`, `RAGEngine.search` |
| `src/services/supabase.ts` | 用户认证 | `signIn`, `signUp`, `signOut` |

### 状态管理
| 文件 | 功能 | 关键内容 |
|------|------|---------|
| `src/context/AppContext.tsx` | 全局状态 | `appReducer`, `initialState` |

### 数据层
| 文件 | 功能 | 关键内容 |
|------|------|---------|
| `src/data/travelKnowledge.ts` | 旅行知识库 | `travelKnowledgeBase` |
| `src/types/index.ts` | TypeScript 类型 | `Plan`, `PlanNode`, `UserAuthState` |

---

## 🔄 核心流程

### 1. 行程规划流程
```
用户输入
  ↓
InputPanel.handleSend() / handleGenerate()
  ↓
generatePlanFromConversation() / generatePlanFromTheme()
  ↓
RAG 检索 (rag.ts: generateRAGContext)
  ↓
LLM 调用 (api.ts: callLLMWithJSONRetry)
  ↓
JSON 解析 + 验证 (tryParseJSON + extractJSONFromLLM)
  ↓
parseAndBuildPlan() → Plan 对象
  ↓
美团增强 (meituanApi.ts: enrichNodeWithMeituan)
  ↓
渲染行程
```

### 2. 预订执行流程
```
用户点击"一键安排"
  ↓
executePlanSteps()
  ↓
Step 1: bookActivity() → 600ms
Step 2: checkAvailability() → 300ms
Step 3: bookRestaurant() → 600ms
[可选] Step 4: orderGift() → 600ms
Step 5: sendPlan() → 400ms
  ↓
ExecutionProgress 实时更新
```

### 3. RAG 检索流程
```
用户查询
  ↓
tokenize() - 中文分词 + 停用词过滤
  ↓
computeTfIdfVector() - TF-IDF 向量化
  ↓
RAGEngine.search(topK=5) - 余弦相似度匹配
  ↓
注入到 LLM System Prompt
```

---

## 🐛 常见问题排查

### 问题 1: 登录失败
**症状**: 提示"会话获取失败"
**原因**: Cookie 被阻止 / Supabase Site URL 未配置
**解决**:
1. 检查浏览器 Cookie 设置
2. 在 Supabase 控制台添加允许域名
3. 或直接使用访客模式（无需登录）

### 问题 2: LLM 返回格式错误
**症状**: "JSON 格式不完整"
**原因**: LLM 输出被截断或格式错误
**解决**:
1. 系统会自动重试 1 次
2. 检查 API Key 是否正确
3. 检查网络连接

### 问题 3: 高德 POI 增强失败
**症状**: 商家信息不完整
**原因**: 高德 API 限流或网络问题
**解决**:
1. 系统会自动降级（仅生成美团/小红书链接）
2. 不影响核心功能

### 问题 4: 语音输入不工作
**症状**: 点击麦克风无反应
**原因**: 浏览器不支持或权限被拒绝
**解决**:
1. 使用 Chrome/Edge 浏览器
2. 允许麦克风权限
3. 或直接使用文本输入

---

## 🔧 开发调试

### 开启详细日志
所有关键函数都有 `console.log` 输出，包括：
- `[AuthModal]` - 登录流程
- `[supabase]` - Supabase 调用
- `[AppContext]` - 会话管理
- `[InputPanel]` - 对话处理
- `[api]` - LLM 调用
- `[RAGEngine]` - 检索过程
- `[meituanApi]` - 商家增强

### 测试工具
- http://localhost:3000/test-guest-mode.html - 访客模式测试
- http://localhost:3000/test-login.html - 登录功能测试
- http://localhost:3000/test-diagnostics.html - 自动诊断

---

## 📊 性能指标

### LLM 调用
- **超时**: 30s（可配置）
- **重试**: 1 次
- **Temperature**: 0.3-0.8（根据场景）
- **Max Tokens**: 8192

### RAG 检索
- **TopK**: 5
- **索引大小**: ~200 条商家数据
- **检索耗时**: < 50ms

### 高德 POI
- **超时**: 5s
- **缓存**: 无（可添加）
- **失败降级**: 静默失败

---

## 🎯 关键代码片段

### JSON 解析容错
```typescript
// 3种提取策略
1. markdown 代码块: ```json ... ```
2. 完整 JSON 对象: { ... }
3. 截断重试: 最后一个 } 递归

// 自动重试
if (!jsonText) {
  // 发回 LLM 修正
  messages.push({
    role: 'user',
    content: `你上一次的输出不是合法 JSON，请修正...`
  });
}
```

### 高德 POI 降级
```typescript
try {
  const detail = await searchPOIDetail(name, city, amapKey);
  if (!detail) {
    // 降级: 仅生成链接
    return { ...node, meituanUrl, meituanDealUrl };
  }
} catch {
  // 静默失败
}
```

### 执行步骤状态机
```typescript
pending → running → success / failed
         ↓
    if (!success) return false; // 失败停止
```

---

## 📚 文档索引

| 文档 | 用途 | 页数 |
|------|------|------|
| [README.md](README.md) | 项目总览 | 3 |
| [WORK_INTRODUCTION.md](WORK_INTRODUCTION.md) | 作品简介 | 5 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 架构设计 | 2 |
| [GUEST_MODE.md](GUEST_MODE.md) | 访客模式说明 | 2 |
| [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) | 部署总结 | 2 |
| [LOGIN_TROUBLESHOOTING.md](LOGIN_TROUBLESHOOTING.md) | 登录诊断 | 3 |

---

## 💡 开发提示

### 添加新的节点类型
1. 在 `src/types/index.ts` 添加类型
2. 在 `generatePlanFromConversation` 的 prompt 中添加说明
3. 在 `enrichNodeWithMeituan` 中处理链接生成

### 添加新的知识库数据
1. 在 `src/data/travelKnowledge.ts` 添加 `KnowledgeItem`
2. 确保包含 `name`, `location`, `category`, `tags`, `description`

### 对接真实预订 API
1. 在 `src/services/api.ts` 替换 `bookActivity` / `bookRestaurant`
2. 保持函数签名一致
3. 添加错误处理和降级

---

**最后更新**: 2026-06-06 | **版本**: v1.0.0-guest-mode
