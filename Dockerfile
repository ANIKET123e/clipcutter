# syntax=docker/dockerfile:1

# ---------- base ----------
FROM node:20-bookworm-slim AS base
WORKDIR /repo
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npx prisma generate

# ---------- app (Next.js — deploy this to Vercel instead in production) ----------
FROM base AS app-build
RUN npm run build

FROM node:20-bookworm-slim AS app
WORKDIR /repo
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=app-build /repo/.next ./.next
COPY --from=app-build /repo/node_modules ./node_modules
COPY --from=app-build /repo/public ./public
COPY --from=app-build /repo/package.json ./package.json
COPY --from=app-build /repo/prisma ./prisma
EXPOSE 3000
CMD ["npm", "run", "start"]

# ---------- worker (persistent FFmpeg processor — Railway/Render/Fly/VPS) ----------
FROM base AS worker-build
RUN npm run worker:build

FROM node:20-bookworm-slim AS worker
WORKDIR /repo
# ffmpeg + ffprobe from Debian's repo (static builds also work fine here)
RUN apt-get update -y && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=worker-build /repo/dist-worker ./dist-worker
COPY --from=worker-build /repo/node_modules ./node_modules
COPY --from=worker-build /repo/prisma ./prisma
COPY --from=worker-build /repo/package.json ./package.json
CMD ["node", "dist-worker/workers/clip-worker.js"]
