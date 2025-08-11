# syntax=docker/dockerfile:1

# --- deps
FROM node:20-bullseye-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# --- build (generate Prisma client + compile TS)
FROM node:20-bullseye-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure Prisma client is generated for tsc types
RUN npx prisma generate
RUN npm run build

# --- runtime
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Only what we need at runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/server.js"]