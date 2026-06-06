# 🏝️ 迹划 - Island Planner

> AI 智能行程规划助手，以灵动岛悬浮窗口为核心，支持自然语言对话、智能主题推荐、一键预订执行。

**🌐 在线演示**: http://localhost:3000
**📖 作品简介**: [WORK_INTRODUCTION.md](WORK_INTRODUCTION.md)
**🏗️ 架构文档**: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## ✨ 核心特性

### 🤖 AI 智能规划
- **对话式规划**: 自然语言对话，逐步明确需求
- **主题推荐**: 基于兴趣/心情/预算生成 4 个创意主题
- **RAG 增强**: 本地知识库 + TF-IDF 检索，提供真实商家数据

### 📍 真实商家数据
- **高德 POI**: 获取商家地址、电话、评分、营业时间
- **美团集成**: 自动构建搜索/团购链接
- **小红书种草**: 生成探店搜索链接

### 🎯 灵活行程编排
- **10种节点类型**: activity, restaurant, snack, walk, scenic, coffee, bar, shopping, photo, rest
- **智能编排**: 3-8 个节点，根据场景自动规划
- **多场景支持**: 家庭出游、朋友聚会、同事团建

### 🚀 一键预订执行
- **自动预订**: 活动、餐厅、鲜花/蛋糕
- **实时进度**: ExecutionProgress 组件实时更新
- **部分成功**: 支持部分失败，展示预订详情

### 👤 用户系统
- **访客模式**: 无需登录，默认 1000 次免费额度
- **登录权益**: 邀请好友、好友系统、云端同步
- **Supabase 集成**: 安全认证、数据持久化

---

## 🛠️ 技术栈

### 前端
```
React 18 + TypeScript + Vite 5
├─ UI: 自定义组件库 + Tailwind CSS 3.4
├─ 状态: React Context + useReducer
├─ 图标: Lucide React
├─ 拖拽: react-draggable
└─ 语音: Web Speech API
```

### 后端
```
Express 5 + TypeScript
├─ 美团 Skill 代理 (localhost:3001)
├─ meituan-travel: 酒店/景点/火车票/行程规划
└─ meituan-venue-guide: 会场授权/二维码/绑定
```

### AI & 数据
```
StepFun LLM (step-3.5-flash-2603)
├─ 对话管理 + 行程规划
└─ 主题推荐

高德地图 API
├─ POI 搜索 + 坐标解析

RAG (TF-IDF + 余弦相似度)
└─ 本地知识库检索

Supabase
├─ 认证 + PostgreSQL 数据库
└─ 用户资料 + 好友关系
```

---

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 配置环境变量
复制 `.env` 文件并配置必要的 API Keys：
```bash
# StepFun LLM
VITE_LLM_KEY=your_key
VITE_LLM_BASE_URL=https://api.stepfun.com/step_plan/v1
VITE_LLM_MODEL=step-3.5-flash-2603

# 高德地图
VITE_AMAP_KEY=your_key

# Supabase（可选，用于登录功能）
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# 美团 Skill Token（可选）
MEITUAN_TRAVEL_TOKEN=your_token
```

### 启动开发服务器
```bash
npm run dev
```

**前端**: http://localhost:3000
**后端代理**: http://localhost:3001

### 手机端测试
```bash
npm run dev -- --host
```

手机浏览器访问控制台显示的局域网地址。

### 构建生产版本
```bash
npm run build
npm run preview
```

---

## 📖 使用指南

### 基础使用（访客模式）
1. 打开 http://localhost:3000
2. 直接输入出行需求（如"周末带娃去公园"）
3. AI 会通过对话逐步了解你的需求
4. 点击"生成计划"即可获得完整行程
5. 点击"一键安排"自动预订

### 登录使用
1. 点击右上角用户图标
2. 登录 Supabase 账号
3. 获得更多权益：
   - 邀请好友，双方各得 50 次免费额度
   - 云端同步偏好设置
   - 好友系统和邀请码

---

## 🏗️ 项目结构

```
src/
├── components/          # React 组件
│   ├── FloatingIsland.tsx     # 灵动岛主组件（拖拽+状态切换）
│   ├── CompactView.tsx        # 收缩态（悬浮球）
│   ├── ExpandedView.tsx       # 展开卡片
│   ├── InputPanel.tsx         # 对话界面
│   ├── Timeline.tsx           # 行程时间轴
│   ├── VoiceInput.tsx         # 语音输入
│   ├── ExecutionProgress.tsx  # 执行进度
│   ├── MapView.tsx            # 高德地图
│   ├── AuthModal.tsx          # 登录/注册弹窗
│   ├── UserCenterModal.tsx    # 用户中心
│   └── ...
├── context/             # React Context
│   └── AppContext.tsx    # 全局状态管理
├── services/            # 服务层
│   ├── api.ts           # LLM 调用 + 行程规划
│   ├── meituanApi.ts    # 高德 POI + 美团链接
│   ├── meituanHub.ts    # 美团 Skill 代理
│   ├── rag.ts           # RAG 检索
│   └── supabase.ts      # Supabase 认证
├── data/                # 数据
│   ├── mockData.ts      # Mock 数据
│   ├── travelKnowledge.ts # 旅行知识库
│   └── travelKnowledge.json
├── hooks/               # 自定义 Hooks
│   ├── useGeolocation.ts
│   └── useSpeechRecognition.ts
└── types/               # TypeScript 类型
    └── index.ts
```

---

## 🎨 功能演示

### 场景 1: 家庭周末出游
**输入**: "周末带娃去公园，午饭想吃清淡点"
**输出**: 紫金山 → 海底捞 → 红山动物园 → 南京大排档
**亮点**: 亲子友好、饮食清淡、预算适中

### 场景 2: 朋友聚会探店
**输入**: "想找有特色的咖啡馆，然后去逛逛街"
**输出**: 老门东 → 咖啡探店 → 夫子庙 → 新街口 → 日料晚餐
**亮点**: 拍照打卡、美食探店、社交氛围

### 场景 3: 同事团建活动
**输入**: "周末团建，想玩点刺激的"
**输出**: 密室逃脱 → 真人 CS → 烧烤自助 → KTV
**亮点**: 团队协作、刺激有趣、预算可控

---

## 📚 文档导航

### 用户文档
- 📖 [作品简介](WORK_INTRODUCTION.md) - 项目完整介绍
- 🎯 [访客模式说明](GUEST_MODE.md) - 无需登录即可使用
- 🔍 [登录问题诊断](LOGIN_TROUBLESHOOTING.md) - 登录故障排查

### 开发文档
- 🏗️ [架构设计](ARCHITECTURE.md) - Planning 策略、工具调用链路、异常处理（2页精简版）
- 📋 [部署总结](DEPLOYMENT_SUMMARY.md) - 访客模式部署说明

### 测试工具
- 🔧 [访客模式测试](http://localhost:3000/test-guest-mode.html)
- 🔧 [登录功能测试](http://localhost:3000/test-login.html)
- 🔧 [自动诊断工具](http://localhost:3000/test-diagnostics.html)

---

## 🎯 技术亮点

### 1. JSON 鲁棒性
- **3种提取策略**: markdown 代码块、完整 JSON 对象、截断重试
- **LLM 自我修正**: JSON 格式错误自动发回修正
- **多层容错**: 递归截断 + 类型守卫 + 空值检查

### 2. RAG 轻量实现
- **TF-IDF 向量化**: 无需训练模型，本地运行
- **余弦相似度**: 高效检索，topK=5
- **知识库注入**: 自动将真实商家数据注入 LLM prompt

### 3. 降级策略
- **高德 POI 失败**: 静默失败，仅生成链接
- **LLM JSON 失败**: 自动重试 + 自我修正
- **预订部分失败**: 停止后续步骤，展示部分成功

### 4. 用户体验
- **访客模式**: 零门槛使用
- **实时进度**: 预订状态实时更新
- **错误友好**: 清晰的错误提示和恢复建议

---

## 🏆 项目成就

### 技术成就
✅ **AI Agent 落地**: 真正的 AI 驱动的行程规划
✅ **RAG 实现**: 本地 TF-IDF 向量检索
✅ **多渠道集成**: 高德 + 美团 + 小红书 + Supabase
✅ **完整前后端**: 全栈 TypeScript 开发

### 产品成就
✅ **零门槛使用**: 访客模式无需登录
✅ **真实商家数据**: 高德 POI 增强
✅ **智能预订**: 一键执行预订流程
✅ **优秀交互**: 浮动岛设计 + 语音输入

---

## 📈 未来规划

### 短期（1-2个月）
- [ ] 真实预订 API 对接（美团/大众点评）
- [ ] 多城市知识库扩展
- [ ] 行程分享功能
- [ ] 移动端 App（React Native）

### 中期（3-6个月）
- [ ] 语音助手优化
- [ ] 社交功能完善
- [ ] 商家评价整合
- [ ] 个性化推荐算法优化

### 长期（6-12个月）
- [ ] AI 图像生成（行程预览图）
- [ ] AR 导航集成
- [ ] 多语言支持
- [ ] 开放平台 API

---

## 🐛 常见问题

### Q: 为什么看不到登录按钮？
**A**: 应用已启用访客模式，无需登录即可使用。点击用户图标可以随时登录。

### Q: 如何确认是访客模式？
**A**: 访问 http://localhost:3000/test-guest-mode.html 查看认证状态。

### Q: 访客模式有使用限制吗？
**A**: 有 1000 次免费 API 调用额度，用完可以登录获得更多。

### Q: LLM 返回格式错误怎么办？
**A**: 系统会自动重试并修正，如果多次失败请检查 API Key 配置。

### Q: 高德 POI 增强失败怎么办？
**A**: 静默降级，仅生成美团/小红书链接，不影响核心功能。

---

## 📄 许可证

内部项目，保留所有权利。

---

**🌟 如果这个项目对你有帮助，欢迎 Star 和 Fork！**

**最后更新**: 2026-06-06 | **版本**: v1.0.0-guest-mode
