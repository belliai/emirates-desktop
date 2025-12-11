# ./Dockerfile
FROM node:22-bullseye

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable

# Copy manifests and install deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build Next.js
RUN pnpm run build

EXPOSE 3000

# Start the Next.js server
CMD ["pnpm", "start"]