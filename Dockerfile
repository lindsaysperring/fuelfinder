# Multi-stage Dockerfile for Next.js with Prisma
# Uses pnpm and Next.js standalone output for optimal image size
# Prisma client is generated at build; migrations use a pinned CLI installed in the runner

# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

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
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_VERSION=${VERSION}
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}

# Build the application
RUN pnpm build

# Stage 3: Prisma CLI (runs in parallel with the builder via BuildKit)
# Pinned CLI in an isolated prefix. Version is read from package.json: one
# source of truth, no ARG to forget. No --ignore-scripts: the schema engine
# must download at build time. prisma --version fails the build instead of
# shipping a broken image.
FROM node:22-alpine AS prisma-cli
RUN apk add --no-cache libc6-compat openssl
COPY package.json ./
RUN PRISMA_SPEC=$(node -p "require('./package.json').dependencies.prisma") && \
    DOTENV_SPEC=$(node -p "require('./package.json').dependencies.dotenv") && \
    npm install --prefix /opt/prisma-cli --no-package-lock "prisma@${PRISMA_SPEC}" "dotenv@${DOTENV_SPEC}" && \
    ln -s /opt/prisma-cli/node_modules/.bin/prisma /usr/local/bin/prisma && \
    prisma --version

# Stage 4: Runner
FROM node:22-alpine AS runner

# Install pnpm (libc6-compat: schema engine binary needs it on musl)
RUN apk add --no-cache openssl libc6-compat && \
    corepack enable && \
    corepack prepare pnpm@11.5.0 --activate

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

# Pinned Prisma CLI from the prisma-cli stage, symlinked into /app/node_modules
# so /app/prisma.config.ts can resolve `prisma/config` and `dotenv/config`.
COPY --from=prisma-cli /opt/prisma-cli /opt/prisma-cli
RUN ln -s /opt/prisma-cli/node_modules/prisma /app/node_modules/prisma && \
    ln -s /opt/prisma-cli/node_modules/dotenv /app/node_modules/dotenv && \
    ln -s /opt/prisma-cli/node_modules/.bin/prisma /usr/local/bin/prisma

ENV CHECKPOINT_DISABLE=1

# Note: Prisma client is already generated and copied, migrations use the pinned CLI above

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
