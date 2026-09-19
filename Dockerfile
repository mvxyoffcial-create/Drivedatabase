# Production Dockerfile for Koyeb & Container Deployments
# Exposes Port 8080 with 10 Gbps unthrottled streaming engine & Telegram Bot worker

FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; else npm install --legacy-peer-deps --no-audit; fi

# Copy source and build
COPY . .
RUN npm run build

# Production Runner Image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies only
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --legacy-peer-deps; else npm install --omit=dev --legacy-peer-deps --no-audit; fi

# Copy built server bundle and static web assets
COPY --from=builder /app/dist ./dist

# Create persistent storage directories
RUN mkdir -p /app/uploads/files /app/uploads/chunks

# Volume mount point for Koyeb Persistent Disk
VOLUME ["/app/uploads"]

# Koyeb default port
EXPOSE 8080

# Start server
CMD ["node", "dist/server.cjs"]
