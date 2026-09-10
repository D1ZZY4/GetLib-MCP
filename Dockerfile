FROM oven/bun:1.4.2 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.4.2 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build
RUN bun run build:mcp

# Runtime on Node, not Bun: .next output and dist/index.js are platform JS,
# and native helpers (SWC) resolve for linux at install time above, so the
# Bun-built artifacts run unmodified. node_modules stays unpruned on
# purpose - pruning devDeps without a verified build here risks dropping
# a runtime-needed package.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
# public/ is optional - Next.js serves it only when present, so the copy
# must not fail the build on repos without static assets.
# (Uncomment when a public/ directory is added.)
# COPY --from=builder /app/public ./public
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/management/health').then(r=>{if(r.status!==200&&r.status!==429)process.exit(1)}).catch(()=>process.exit(1))"
# Root-owned COPY layers above must be readable/writable by the
# unprivileged runtime user (Next.js image cache writes under .next).
RUN chown -R node:nodejs /app
USER node
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
