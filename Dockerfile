FROM node:20-slim

WORKDIR /app

# Install production + dev deps (ts-node runs in prod)
COPY package*.json tsconfig.json ./
RUN npm ci

# Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# App source
COPY . .

# OpenSSL for HTTPS in Prisma
RUN apt-get update -y && apt-get install -y openssl

EXPOSE 4000
CMD ["node", "--loader", "ts-node/esm", "src/server.ts"]