# Multi-stage Dockerfile for Next.js with Prisma
# Uses pnpm and Next.js standalone output for optimal image size
# Prisma client is generated at runtime using 'pnpm dlx' to avoid copying all node_modules

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

RUN pnpm prisma generate

# Build arguments for versioning
ARG VERSION=dev
ARG BUILD_DATE
ARG VCS_REF
ARG VCS_URL

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_VERSION=${VERSION}

# Build the application
RUN pnpm build

# Stage 3: Runner
FROM node:20-alpine AS runner

# Install dependencies and pnpm
RUN apk add --no-cache openssl && \
    corepack enable && \
    corepack prepare pnpm@latest --activate

WORKDIR /app

# Version metadata
ARG VERSION=dev
ARG BUILD_DATE
ARG VCS_REF
ARG VCS_URL

# OCI Image Labels
LABEL org.opencontainers.image.title="FuelFinder"
LABEL org.opencontainers.image.description="Smart petrol price comparison tool"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${VCS_REF}"
LABEL org.opencontainers.image.source="${VCS_URL}"
LABEL org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV VERSION=${VERSION}

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/package.json ./package.json

# Note: Prisma client is already generated and copied, migrations will use prisma.config.ts

# Copy startup script
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Create directories and set permissions
# Convert line endings to Unix format in case file was edited on Windows
RUN chmod +x ./docker-entrypoint.sh && \
    sed -i 's/\r$//' ./docker-entrypoint.sh && \
    mkdir -p /app/prisma /app/data /app/.next/cache && \
    chown -R nextjs:nodejs /app/prisma /app/data /app/.next

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use entrypoint script to handle Prisma migrations
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
