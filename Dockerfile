# Image for the VPS (deploy/docker-compose.yml). Built and pushed by
# .github/workflows/ci.yml; nothing is built on the box.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# CI=true keeps the bundle visualizer from trying to open a browser.
ENV CI=true
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA
# Type-check and lint here rather than on the runner: one npm ci per run, and
# no image exists for code that would fail them.
RUN npm run type-check && npm run lint
# VITE_* values are inlined into the bundle at build time, so they are needed
# here, not at runtime. They arrive as a build secret -- the VITE_ lines of
# /opt/zembil-web/.env, read by the workflow -- so they never land in a layer.
# Vite reads .env.production itself; the sitemap prebuild only sees
# process.env, so the API URL is exported for it explicitly.
RUN --mount=type=secret,id=vite_env,target=/app/.env.production,required=false \
    export VITE_API_URL="$(grep -s '^VITE_API_URL=' .env.production | cut -d= -f2-)" && \
    npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server.mjs ./
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA
LABEL org.opencontainers.image.source=https://github.com/Zembil-Gift/go_zembil_frontend
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz > /dev/null || exit 1
CMD ["node", "server.mjs"]
