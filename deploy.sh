#!/bin/bash
# 迹划 - 线上部署脚本
# 使用方式: ./deploy.sh

set -e

echo "🚀 开始部署迹划..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置
DOMAIN="xinqian-product.top"
APP_NAME="island-planner"
FRONTEND_PORT=3000
BACKEND_PORT=3001

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}安装 Node.js 18+...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}安装 PM2...${NC}"
    npm install -g pm2
fi

# 检查 Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}安装 Nginx...${NC}"
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# 安装依赖
echo -e "${YELLOW}安装依赖...${NC}"
npm install

# 构建前端
echo -e "${YELLOW}构建前端...${NC}"
npm run build

# 停止旧进程
echo -e "${YELLOW}停止旧进程...${NC}"
pm2 delete $APP_NAME-server 2>/dev/null || true
pm2 delete $APP_NAME-frontend 2>/dev/null || true

# 启动后端
echo -e "${GREEN}启动后端服务 (端口 $BACKEND_PORT)...${NC}"
pm2 start "npm run server" --name "$APP_NAME-server"

# 启动前端
echo -e "${GREEN}启动前端服务 (端口 $FRONTEND_PORT)...${NC}"
pm2 start "npx serve dist -l $FRONTEND_PORT" --name "$APP_NAME-frontend"

# 保存 PM2 配置
pm2 save
pm2 startup

echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo -e "${GREEN}访问地址:${NC}"
echo "  前端: http://$DOMAIN"
echo "  后端: http://$DOMAIN:$BACKEND_PORT"
echo ""
echo -e "${YELLOW}PM2 进程状态:${NC}"
pm2 status

echo ""
echo -e "${YELLOW}如果需要配置 HTTPS，请:${NC}"
echo "1. 在阿里云申请免费 SSL 证书"
echo "2. 配置 Nginx SSL（参考 nginx.conf 模板）"
echo "3. 运行: sudo systemctl restart nginx"
