###########################################################
# ---- FRONTEND BUILD (Vite / Vue) ----
###########################################################
FROM node:18 AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build


###########################################################
# ---- BACKEND BUILD (Node / Express / Socket.io) ----
###########################################################
FROM node:18 AS backend-builder

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .


###########################################################
# ---- FINAL IMAGE: NGINX + NODE ----
###########################################################
FROM node:18

# Install NGINX
RUN apt-get update && apt-get install -y nginx && apt-get clean

# ----------- Copy backend -------------
WORKDIR /app/backend
COPY --from=backend-builder /app/backend ./

# ----------- Copy frontend static files -------------
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# ----------- Copy nginx config ----------
COPY nginx.conf /etc/nginx/nginx.conf

# ----------- Expose port 80 -------------
EXPOSE 80

# ----------- Start script: Nginx + Node -------------
CMD service nginx start && node server.js
