#!/bin/bash
# 迹划 - 服务器初始化脚本
# 在阿里云 ECS 上运行

set -e

echo "🚀 开始初始化服务器..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. 系统更新
echo -e "${YELLOW}[1/8] 更新系统...${NC}"
yum update -y

# 2. 安装基础工具
echo -e "${YELLOW}[2/8] 安装基础工具...${NC}"
yum install -y curl wget git vim nginx

# 3. 安装 Node.js 18
echo -e "${YELLOW}[3/8] 安装 Node.js 18...${NC}"
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# 验证
node -v
npm -v

# 4. 安装 PM2
echo -e "${YELLOW}[4/8] 安装 PM2...${NC}"
npm install -g pm2

# 5. 安装 serve（静态文件服务器）
echo -e "${YELLOW}[5/8] 安装 serve...${NC}"
npm install -g serve

# 6. 配置 Nginx
echo -e "${YELLOW}[6/8] 配置 Nginx...${NC}"
systemctl start nginx
systemctl enable nginx

# 7. 创建项目目录
echo -e "${YELLOW}[7/8] 创建项目目录...${NC}"
mkdir -p /opt/island-planner
mkdir -p /etc/nginx/ssl
mkdir -p /opt/backups

# 8. 配置防火墙
echo -e "${YELLOW}[8/8] 配置防火墙...${NC}"
# 开放端口
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --permanent --add-port=3001/tcp
firewall-cmd --reload

echo -e "${GREEN}✅ 服务器初始化完成！${NC}"
echo ""
echo "Node.js 版本: $(node -v)"
echo "NPM 版本: $(npm -v)"
echo "PM2 版本: $(pm2 -v)"
echo "Nginx 状态: $(systemctl is-active nginx)"
echo ""
echo "下一步: 上传项目代码到 /opt/island-planner/"
