# Stage de build
FROM node:18-alpine AS builder
WORKDIR /app

# --- build frontend ---
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
RUN cd frontend && npm run build

# --- installer dépendances backend (production) ---
COPY backend/package*.json backend/
RUN cd backend && npm ci --only=production

# Copier tout le repo (nécessaire pour fichiers backend)
COPY . .

# Copier le 'dist' buildé du frontend dans backend/public
RUN rm -rf backend/public || true && mv frontend/dist backend/public

# Image finale
FROM node:18-alpine AS runtime
WORKDIR /app/backend

# Copier le backend prêt depuis le builder
COPY --from=builder /app/backend /app/backend

ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "server.js"]

