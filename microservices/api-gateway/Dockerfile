# Dockerfile multi-stage para producción óptima
# Stage 1: Build — compila TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production — imagen mínima sin herramientas de desarrollo
FROM node:20-alpine AS production
WORKDIR /app

# Crear usuario no-root por seguridad (nunca correr como root en producción)
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001

COPY --from=builder --chown=nodeapp:nodejs /app/dist ./dist
COPY --from=builder --chown=nodeapp:nodejs /app/node_modules ./node_modules

USER nodeapp

EXPOSE 3000
CMD ["node", "dist/index.js"]
