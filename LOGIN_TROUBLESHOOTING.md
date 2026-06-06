# 登录问题诊断指南

## 快速诊断步骤

### 1. 检查浏览器控制台错误

打开浏览器开发者工具（F12），切换到 **Console** 标签页，然后尝试登录，查看是否有以下错误：

#### 常见错误 1: Cookie 被阻止
```
Error: Failed to set cookie
```
**原因**: 浏览器阻止了第三方 Cookie 或本地存储
**解决方案**:
- 检查浏览器设置，确保允许网站使用 Cookie 和本地存储
- 在 Chrome/Edge: 设置 → 隐私和安全 → Cookie 和其他网站数据 → 允许所有 Cookie
- 或者点击地址栏的锁图标 → 网站设置 → 确保 Cookie 设置为"允许”

#### 常见错误 2: 邮箱未验证
```
Email not confirmed
```
**原因**: 注册后没有点击验证邮件
**解决方案**:
- 检查邮箱收件箱（包括垃圾邮件文件夹）
- 查找来自 Supabase 的验证邮件并点击链接
- 如果找不到邮件，可以尝试重新注册或联系管理员

#### 常见错误 3: 密码错误
```
Invalid login credentials
```
**原因**: 邮箱或密码输入错误
**解决方案**:
- 确认邮箱和密码正确
- 如果忘记密码，使用"忘记密码"功能重置
- 注意密码区分大小写

#### 常见错误 4: 网络问题
```
Failed to fetch
NetworkError
```
**原因**: 无法连接到 Supabase 服务器
**解决方案**:
- 检查网络连接
- 确认没有被防火墙或代理阻止
- 尝试刷新页面

### 2. 验证 Supabase 配置

在浏览器控制台运行以下代码验证配置：

```javascript
// 检查 Supabase 配置
console.log('Supabase URL:', 'https://fvvchxwtdloraozwdrfc.supabase.co')
console.log('当前域名:', window.location.origin)
```

**重要**: Supabase 项目需要在控制台配置允许的域名：
1. 访问 https://supabase.com/dashboard/project/fvvchxwtdloraozwdrfc/auth/providers
2. 点击 **Site URL** 和 **Redirect URLs**
3. 添加以下 URL（根据你的访问方式）：
   - `http://localhost:3000`
   - `http://localhost:5173` (Vite 默认端口)
   - `http://10.36.9.207:3000` (你的局域网地址)
   - 你的实际域名

### 3. 测试登录功能

我已经为您创建了一个测试页面：**http://localhost:3000/test-login.html**

在该页面中：
1. 输入测试账号的邮箱和密码
2. 点击"测试登录"
3. 查看详细的错误信息

### 4. 检查应用日志

在浏览器控制台中，应用会输出详细的日志：

```
[AuthModal] 开始登录流程...
[AuthModal] 邮箱: xxx@example.com
[supabase] signIn: { email, hasData, hasSession, error }
[AuthModal] signIn result: { data, error }
```

请将这些日志信息记录下来，以便进一步诊断。

## 常见场景和解决方案

### 场景 A: 首次注册后无法登录
**原因**: 邮箱需要验证
**解决**: 检查邮箱并点击验证链接，或联系管理员手动验证

### 场景 B: 以前可以登录，现在突然不行
**原因**: Cookie 被清除或过期
**解决**: 清除浏览器缓存和 Cookie，重新登录

### 场景 C: 提示"会话获取失败"
**原因**: Supabase Site URL 未配置或 Cookie 被阻止
**解决**:
1. 检查浏览器 Cookie 设置（见上文）
2. 在 Supabase 控制台添加当前域名到允许列表

### 场景 D: 开发环境可以，生产环境不行
**原因**: 生产环境域名未在 Supabase 配置
**解决**: 在生产环境的 Supabase 配置中添加生产域名

## 需要管理员检查的项目

如果以上步骤都无法解决，请联系管理员检查：

1. **Supabase 项目配置**:
   - Site URL 是否正确
   - Redirect URLs 是否包含所有需要的域名
   - 邮件验证模板是否配置

2. **用户账号状态**:
   - 用户是否已被删除或禁用
   - 用户邮箱是否已验证
   - 用户是否在 Supabase 控制台存在

3. **数据库配置**:
   - profiles 表是否存在
   - Row Level Security (RLS) 策略是否正确
   - 用户是否有权限访问自己的 profile

## 临时解决方案

如果登录功能暂时无法使用，可以考虑：

1. **使用访客模式**: 如果应用支持访客模式
2. **检查是否有本地账号系统**: 某些功能可能不需要登录
3. **联系技术支持**: 提供详细的错误日志和复现步骤

## 调试信息收集

如果问题持续，请提供以下信息：

- [ ] 浏览器类型和版本
- [ ] 浏览器控制台的完整错误日志
- [ ] 是否在多个浏览器/设备上测试过
- [ ] 测试账号信息（是否为新注册账号）
- [ ] 是否可以收到 Supabase 验证邮件
- [ ] 网络环境（公司网络/家庭网络/是否使用代理）

---

**最后更新**: 2026-06-06
**技术支持**: 请将以上信息发送给开发团队
