# 迹划 - Docker 部署
# 使用方式:
# 1. docker build -t island-planner .
# 2. docker run -d -p 80:3000 -p 3001:3001 --name island island-planner

# 阶段一：构建前端
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm install

# 复制源代码
COPY . .

# 构建前端
RUN npm run build

# 阶段二：生产环境
FROM node:18-alpine

WORKDIR /app

# 安装 serve（静态文件服务器）
RUN npm install -g serve pm2

# 从构建阶段复制产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.env ./.env

# 暴露端口
EXPOSE 3000 3001

# 启动脚本
COPY docker-start.sh ./docker-start.sh
RUN chmod +x docker-start.sh

CMD ["./docker-start.sh"]
