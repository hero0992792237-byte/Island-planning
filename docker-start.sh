#!/bin/sh
# Docker 容器内启动脚本

set -e

echo "🚀 启动迹划服务..."

# 启动后端（后台运行）
echo "📡 启动后端服务 (端口 3001)..."
node server/index.js &
BACKEND_PID=$!

# 等待后端启动
sleep 2

# 启动前端
echo "🌐 启动前端服务 (端口 3000)..."
serve -s dist -l 3000 &
FRONTEND_PID=$!

echo ""
echo "✅ 服务已启动！"
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:3001"
echo ""

# 等待任意进程结束
wait $BACKEND_PID $FRONTEND_PID
