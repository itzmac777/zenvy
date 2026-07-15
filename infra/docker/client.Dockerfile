FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
ARG NEXT_PUBLIC_MANAGER_UI_VERSION=simple
ARG NEXT_PUBLIC_MANAGER_SUPPORT_PHONE
ARG NEXT_PUBLIC_MANAGER_SUPPORT_WHATSAPP
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=$NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
ENV NEXT_PUBLIC_MANAGER_UI_VERSION=$NEXT_PUBLIC_MANAGER_UI_VERSION
ENV NEXT_PUBLIC_MANAGER_SUPPORT_PHONE=$NEXT_PUBLIC_MANAGER_SUPPORT_PHONE
ENV NEXT_PUBLIC_MANAGER_SUPPORT_WHATSAPP=$NEXT_PUBLIC_MANAGER_SUPPORT_WHATSAPP
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY client ./client
RUN npm run build --workspace client

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/client/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/client/.next/static ./client/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/client/public ./client/public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=12 CMD node -e "const net=require('node:net');const socket=net.connect(3000,'127.0.0.1',()=>{socket.end();process.exit(0)});socket.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),4000)"
CMD ["node", "client/server.js"]
