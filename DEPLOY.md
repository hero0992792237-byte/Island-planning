# 🚀 迹划 - 线上部署指南

**域名**: `xinqian-product.top` ✅ 已申请
**目标**: 将迹划部署到阿里云服务器，通过域名访问

---

## 📋 部署前准备

### 已完成 ✅
- [x] 域名注册（阿里云）
- [x] 项目代码（本地可运行）

### 需要准备 ⬜
- [ ] 阿里云服务器（ECS 或轻量应用服务器）
- [ ] SSL 证书（阿里云免费证书）
- [ ] API Keys（确保生产环境可用）

---

## 💰 成本估算

| 项目 | 费用 | 说明 |
|------|------|------|
| 域名 | ~70元/年 | 已购买 |
| 轻量应用服务器 | 99元/年 | 新用户优惠，2核2G3M带宽 |
| SSL 证书 | 免费 | 阿里云 DV 免费证书 |
| **总计** | **~170元/年** | 基础配置 |

> 💡 **建议**: 阿里云轻量应用服务器 2核2G3M 带宽，新用户首年 99元，足够个人项目使用。

---

## 🛒 第一步：购买阿里云服务器

### 推荐配置
```
类型: 轻量应用服务器
配置: 2核 CPU / 2G 内存 / 3M 带宽
系统: Ubuntu 22.04 LTS（推荐）或 CentOS 8
地域: 华东1（杭州）或离你用户最近的区域
数据盘: 50GB SSD（够用）
```

### 购买后操作
1. 进入阿里云控制台 → 轻量应用服务器
2. 重置密码（设置 root 密码）
3. 配置防火墙/安全组：
   - 开放 **80** 端口（HTTP）
   - 开放 **443** 端口（HTTPS）
   - 开放 **3000** 端口（前端开发调试用，生产可关闭）
   - 开放 **3001** 端口（后端 API，生产可用 Nginx 代理）
4. 记录服务器的 **公网 IP 地址**

---

## 🌐 第二步：配置 DNS 解析

### 在你的域名控制台（阿里云域名管理）

添加以下解析记录：

| 主机记录 | 记录类型 | 解析线路 | 记录值 | TTL |
|---------|---------|---------|--------|-----|
| @ | A | 默认 | 你的服务器公网 IP | 10分钟 |
| www | A | 默认 | 你的服务器公网 IP | 10分钟 |
| * | A | 默认 | 你的服务器公网 IP | 10分钟 |

### 验证解析生效
```bash
# 在本地电脑 CMD/PowerShell 运行
nslookup xinqian-product.top
# 应该显示你的服务器 IP
```

> ⏱️ DNS 生效时间：通常 10分钟 - 2小时

---

## 🖥️ 第三步：连接服务器并初始化

### 1. SSH 连接服务器
```bash
# Windows: 使用 PowerShell 或 Git Bash
ssh root@你的服务器公网IP

# 首次连接会提示确认，输入 yes
# 然后输入 root 密码
```

### 2. 系统更新
```bash
# Ubuntu
apt update && apt upgrade -y

# CentOS
yum update -y
```

### 3. 安装必要软件
```bash
# 安装基础工具
apt install -y curl wget git vim nginx

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# 验证安装
node -v  # 应显示 v18.x.x
npm -v   # 应显示 9.x.x

# 安装 PM2（进程管理器）
npm install -g pm2

# 验证 PM2
pm2 -v
```

---

## 📦 第四步：上传项目代码

### 方式一：Git 克隆（推荐，如果代码在 Git 仓库）
```bash
cd /opt
git clone 你的代码仓库地址
cd 迹划项目目录
```

### 方式二：SCP 上传（从本地电脑）
```bash
# 在本地 PowerShell 或终端执行
# 压缩项目（排除 node_modules）
Compress-Archive -Path "e:\mt版本管理\6.5\src", "e:\mt版本管理\6.5\server", "e:\mt版本管理\6.5\package.json", "e:\mt版本管理\6.5\.env" -DestinationPath "island-planner.zip"

# 上传到服务器
scp island-planner.zip root@你的服务器IP:/opt/

# SSH 到服务器解压
ssh root@你的服务器IP
cd /opt
unzip island-planner.zip
cd 迹划项目目录
```

### 方式三：使用 SFTP 工具
- 推荐工具：FileZilla、WinSCP
- 连接：SFTP 协议，用户名 root，密码你的 root 密码
- 上传项目文件到 `/opt/island-planner/`

---

## ⚙️ 第五步：安装依赖并构建

```bash
# 进入项目目录
cd /opt/island-planner

# 安装依赖
npm install

# 构建前端（生产版本）
npm run build

# 验证构建产物
ls -la dist/  # 应该看到 index.html 和 assets 文件夹
```

---

## 🔑 第六步：配置环境变量

```bash
# 编辑 .env 文件（或创建）
vim /opt/island-planner/.env
```

填入生产环境的配置：
```bash
# StepFun LLM（生产环境 API Key）
VITE_LLM_KEY=你的生产环境API_KEY
VITE_LLM_BASE_URL=https://api.stepfun.com/step_plan/v1
VITE_LLM_MODEL=step-3.5-flash-2603

# 高德地图
VITE_AMAP_KEY=你的高德Key

# Supabase（可选，如果不需要登录功能可跳过）
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon_key

# 美团 Skill（可选）
MEITUAN_TRAVEL_TOKEN=你的token
MEITUAN_VENUE_CLIENT_ID=你的client_id

# 后端配置
PORT=3001
NODE_ENV=production
```

> ⚠️ **重要**: 生产环境请使用正式的 API Key，不要泄露！

---

## 🚀 第七步：启动服务

### 方式一：使用 PM2（推荐）

```bash
cd /opt/island-planner

# 停止旧进程（如果有）
pm2 delete island-server 2>/dev/null || true
pm2 delete island-frontend 2>/dev/null || true

# 启动后端
pm2 start "npm run server" --name "island-server"

# 启动前端（静态文件服务器）
pm2 start "npx serve dist -l 3000" --name "island-frontend"

# 查看运行状态
pm2 status

# 保存配置（开机自启）
pm2 save
pm2 startup systemd
# 按照提示执行生成的命令
```

### 方式二：使用 Docker（更专业）

```bash
cd /opt/island-planner

# 构建 Docker 镜像
docker build -t island-planner .

# 运行容器
docker run -d \
  --name island-planner \
  -p 3000:3000 \
  -p 3001:3001 \
  --restart unless-stopped \
  island-planner

# 查看运行状态
docker ps
docker logs island-planner
```

### 方式三：使用 Docker Compose（最简单）

```bash
cd /opt/island-planner

# 启动
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

---

## 🔒 第八步：配置 Nginx + SSL（HTTPS）

### 1. 申请阿里云免费 SSL 证书

1. 登录阿里云控制台
2. 搜索 "SSL 证书" → 进入 SSL 证书控制台
3. 点击 "创建证书" → 选择 "免费证书"
4. 填写域名：`xinqian-product.top`
5. 验证方式：DNS 验证（自动）
6. 等待审核（通常几分钟内完成）
7. 下载证书（选择 Nginx 格式）

### 2. 上传证书到服务器

```bash
# 在服务器上创建证书目录
mkdir -p /etc/nginx/ssl

# 上传证书文件（通过 SCP 或 SFTP）
# 将下载的 .pem 和 .key 文件上传到 /etc/nginx/ssl/
# 并重命名为：
# /etc/nginx/ssl/xinqian-product.top.pem
# /etc/nginx/ssl/xinqian-product.top.key
```

### 3. 配置 Nginx

```bash
# 复制配置文件
cp /opt/island-planner/nginx.conf /etc/nginx/sites-available/island-planner

# 创建软链接
ln -s /etc/nginx/sites-available/island-planner /etc/nginx/sites-enabled/

# 删除默认配置（可选）
rm /etc/nginx/sites-enabled/default

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
systemctl enable nginx  # 开机自启
```

### 4. 验证 HTTPS

访问：`https://xinqian-product.top`

应该能看到绿色的小锁 🔒 标志。

---

## 🧪 第九步：验证部署

### 检查清单

- [ ] 访问 `https://xinqian-product.top` 能看到首页
- [ ] 访问 `https://xinqian-product.top/api/health` 返回 healthy
- [ ] AI 对话功能正常
- [ ] 行程规划功能正常
- [ ] 地图展示正常
- [ ] HTTPS 证书有效

### 常见问题排查

**问题 1: 访问域名显示 "无法访问此网站"**
```bash
# 检查 Nginx 状态
systemctl status nginx

# 检查防火墙
ufw status  # Ubuntu
firewall-cmd --list-all  # CentOS

# 检查安全组
# 阿里云控制台 → 轻量服务器 → 防火墙 → 确保 80/443 已开放
```

**问题 2: 前端显示 "无法连接到后端"**
```bash
# 检查后端是否运行
pm2 status
# 或
docker ps

# 检查后端日志
pm2 logs island-server
# 或
docker logs island-planner

# 检查 Nginx 配置中的 proxy_pass 是否正确
```

**问题 3: SSL 证书错误**
```bash
# 检查证书文件是否存在
ls -la /etc/nginx/ssl/

# 检查证书是否过期
openssl x509 -in /etc/nginx/ssl/xinqian-product.top.pem -noout -dates

# 重新申请证书
```

---

## 📊 第十步：监控和维护

### 日志查看
```bash
# PM2 日志
pm2 logs

# Nginx 访问日志
tail -f /var/log/nginx/access.log

# Nginx 错误日志
tail -f /var/log/nginx/error.log

# 系统日志
journalctl -u nginx -f
```

### 性能监控
```bash
# 查看 PM2 状态
pm2 monit

# 查看系统资源
htop

# 查看磁盘空间
df -h

# 查看内存使用
free -m
```

### 自动备份（推荐）
```bash
# 创建备份脚本
cat > /opt/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# 备份项目代码
tar -czf $BACKUP_DIR/island-planner_$DATE.tar.gz /opt/island-planner

# 保留最近 7 天的备份
find $BACKUP_DIR -name "island-planner_*.tar.gz" -mtime +7 -delete
EOF

chmod +x /opt/backup.sh

# 添加到定时任务（每天凌晨 3 点备份）
crontab -e
# 添加：
# 0 3 * * * /opt/backup.sh
```

---

## 🎯 部署架构图

```
用户访问 xinqian-product.top
        ↓
   [阿里云 DNS]
        ↓
   [阿里云 CDN] (可选)
        ↓
   [Nginx] (443端口, SSL)
        ├─ /       → 前端 (localhost:3000)
        └─ /api/   → 后端 (localhost:3001)
        ↓
   [PM2/Docker]
        ├─ island-frontend (Vite 静态文件)
        └─ island-server (Express API)
        ↓
   [外部服务]
        ├─ StepFun LLM API
        ├─ 高德地图 API
        ├─ Supabase (可选)
        └─ 美团 API (可选)
```

---

## 📁 部署文件清单

项目根目录已提供以下部署文件：

| 文件 | 用途 |
|------|------|
| `deploy.sh` | 一键部署脚本（PM2 方式） |
| `Dockerfile` | Docker 镜像构建 |
| `docker-compose.yml` | Docker Compose 编排 |
| `docker-start.sh` | Docker 容器启动脚本 |
| `nginx.conf` | Nginx 反向代理 + SSL 配置 |
| `DEPLOY.md` | 本部署文档 |

---

## 🆘 紧急回滚

如果部署失败，快速回滚：

```bash
# 停止服务
pm2 stop all
# 或
docker-compose down

# 恢复之前版本（如果有备份）
cd /opt
tar -xzf backups/island-planner_20240101_120000.tar.gz

# 重新启动
cd island-planner
npm install
npm run build
pm2 start all
```

---

## 📞 技术支持

如果遇到问题：
1. 查看本文档的 **常见问题排查** 部分
2. 检查日志：`pm2 logs` 或 `docker logs`
3. 确认 API Key 有效且未过期
4. 检查服务器资源是否充足（内存/磁盘）

---

**🎉 祝你部署顺利！**

**最后更新**: 2026-06-06
**文档版本**: v1.0.0
