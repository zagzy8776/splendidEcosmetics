FROM node:20-slim

WORKDIR /app

# Copy manifests and install ALL deps (including prisma CLI in devDeps)
COPY package*.json ./
RUN npm ci

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy remaining source
COPY . .

# Prune dev dependencies after generation
RUN npm prune --production

EXPOSE 4000

CMD ["node", "server.js"]
