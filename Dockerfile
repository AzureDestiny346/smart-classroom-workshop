# ===========================================
# 智课工坊 - Docker 构建文件
# 对齐仓库真实管线（scripts/build.sh）：next build 产物 .next + tsup 产物 dist/server.cjs，
# 运行入口为 src/server.ts 的自定义服务器（node dist/server.cjs）。
# 注意：next.config 未开启 output:'standalone'，不能使用 .next/standalone 方案。
# ===========================================

# ---------- 构建阶段：全量依赖 + 生产构建 ----------
FROM node:20-alpine AS builder

WORKDIR /app

# packageManager 字段钉住 pnpm@9
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# .dockerignore 已排除 node_modules/.next/.env*/docs 等
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# 显式分步执行，等价 build.sh 但不依赖 bash（alpine 无 bash）
RUN pnpm install --frozen-lockfile \
  && pnpm exec next build \
  && pnpm exec tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify

# ---------- 运行阶段：仅生产依赖 ----------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# 自定义服务器以 dev = COZE_PROJECT_ENV !== 'PROD' 判定模式
ENV COZE_PROJECT_ENV=PROD
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5000
ENV HOSTNAME=0.0.0.0

# 非 root 运行
RUN addgroup -S -g 1001 nodejs \
  && adduser -S -u 1001 -G nodejs nextjs

# 仅安装生产依赖：eslint/typescript/tailwind/tsup/vitest 等 devDeps 不进镜像
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate \
  && pnpm install --prod --frozen-lockfile

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 5000

CMD ["node", "dist/server.js"]
