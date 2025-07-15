# ---- build ----
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build          # produces dist/

# ---- runtime ----
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev      # install only prod deps
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node","dist/server.js"]