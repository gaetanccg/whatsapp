# Docker Deployment Guide

Guide complet pour déployer l'application WhatsApp Clone avec Docker.

## 📋 Table des matières

- [Prérequis](#prérequis)
- [Configuration rapide](#configuration-rapide)
- [Déploiement en développement](#déploiement-en-développement)
- [Déploiement en production](#déploiement-en-production)
- [Scripts de déploiement](#scripts-de-déploiement)
- [Monitoring et logs](#monitoring-et-logs)
- [Backup et restauration](#backup-et-restauration)
- [Troubleshooting](#troubleshooting)

## Prérequis

- Docker 20.10+
- Docker Compose 2.0+
- MongoDB (Atlas ou local)
- 2GB RAM minimum
- 10GB espace disque

## Configuration rapide

### 1. Cloner le repository

```bash
git clone https://github.com/your-repo/whatsapp-clone.git
cd whatsapp-clone
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Modifier le fichier `.env` :

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/whatsapp
JWT_SECRET=your-super-secret-key-minimum-32-characters
CORS_ORIGIN=http://localhost:80
SENTRY_DSN=
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Déployer

```bash
./scripts/deploy.sh production
```

## Déploiement en développement

### Démarrage rapide

```bash
./scripts/start-dev.sh
```

### Ou manuellement

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Services disponibles

- **Frontend** : http://localhost:5173
- **Backend** : http://localhost:5000
- **API** : http://localhost:5000/api

### Hot reload

Les fichiers sont montés en volume, les modifications sont prises en compte automatiquement.

## Déploiement en production

### 1. Build des images

```bash
docker-compose build --no-cache
```

### 2. Démarrage des services

```bash
docker-compose up -d
```

### 3. Vérification

```bash
# État des services
docker-compose ps

# Health checks
curl http://localhost:5000/health
curl http://localhost:80/health
```

### Services disponibles

- **Application** : http://localhost:80
- **API** : http://localhost:80/api (proxifié via Nginx)
- **WebSocket** : ws://localhost:80/socket.io

## Scripts de déploiement

### deploy.sh

Script principal de déploiement en production.

```bash
./scripts/deploy.sh [environment]
```

**Ce qu'il fait :**
1. Vérifie la présence du fichier .env
2. Build les images Docker
3. Arrête les conteneurs existants
4. Nettoie les anciennes images
5. Démarre les nouveaux conteneurs
6. Vérifie les health checks

**Exemple :**
```bash
./scripts/deploy.sh production
```

### start-dev.sh

Démarrage rapide de l'environnement de développement.

```bash
./scripts/start-dev.sh
```

**Ce qu'il fait :**
1. Copie .env.example si nécessaire
2. Démarre les conteneurs en mode dev
3. Affiche les URLs des services

### backup.sh

Sauvegarde de la base de données.

```bash
./scripts/backup.sh
```

**Ce qu'il fait :**
1. Crée un dump MongoDB
2. Compresse le backup
3. Garde les 7 derniers backups
4. Stocke dans ./backups/

## Architecture Docker

### Images

#### Backend
- **Base** : node:18-alpine
- **Dépendances** : ffmpeg pour le traitement média
- **Port** : 5000
- **Health check** : GET /health

#### Frontend
- **Builder** : node:18-alpine
- **Production** : nginx:alpine
- **Port** : 80
- **Health check** : GET /health

### Volumes

```yaml
volumes:
  backend-uploads:  # Médias uploadés
```

### Networks

```yaml
networks:
  app-network:  # Réseau isolé pour les services
```

## Monitoring et logs

### Voir tous les logs

```bash
docker-compose logs -f
```

### Logs d'un service

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Logs avec horodatage

```bash
docker-compose logs -f -t
```

### Dernières 100 lignes

```bash
docker-compose logs --tail=100 backend
```

### Statistiques en temps réel

```bash
docker stats
```

### État des conteneurs

```bash
docker-compose ps
```

### Processus dans un conteneur

```bash
docker-compose top backend
```

## Backup et restauration

### Backup automatique

Configurez un cron job :

```bash
# Ouvrir crontab
crontab -e

# Ajouter un backup quotidien à 2h
0 2 * * * cd /path/to/project && ./scripts/backup.sh
```

### Backup manuel

```bash
./scripts/backup.sh
```

### Restauration

```bash
# Lister les backups
ls -lh backups/

# Restaurer un backup spécifique
mongorestore --uri="$MONGODB_URI" \
  --archive=./backups/backup_20231225_020000.gz \
  --gzip
```

## Commandes utiles

### Gestion des conteneurs

```bash
# Démarrer
docker-compose up -d

# Arrêter
docker-compose down

# Redémarrer
docker-compose restart

# Redémarrer un service
docker-compose restart backend

# Voir les processus
docker-compose ps

# Supprimer et recréer
docker-compose up -d --force-recreate
```

### Gestion des images

```bash
# Lister les images
docker images

# Supprimer une image
docker rmi whatsapp-backend:latest

# Nettoyer les images inutilisées
docker image prune -a

# Build sans cache
docker-compose build --no-cache
```

### Gestion des volumes

```bash
# Lister les volumes
docker volume ls

# Inspecter un volume
docker volume inspect whatsapp-clone_backend-uploads

# Supprimer les volumes inutilisés
docker volume prune
```

### Exécuter des commandes

```bash
# Shell interactif
docker-compose exec backend sh
docker-compose exec frontend sh

# Commande unique
docker-compose exec backend npm test
docker-compose exec frontend npm run lint
```

## Troubleshooting

### Le backend ne démarre pas

**Vérifier les logs :**
```bash
docker-compose logs backend
```

**Problèmes courants :**
- `MONGODB_URI` invalide → Vérifier la connexion MongoDB
- `JWT_SECRET` manquant → Ajouter dans .env
- Port 5000 utilisé → Changer le port ou tuer le processus

### Le frontend affiche une page blanche

**Vérifier les logs :**
```bash
docker-compose logs frontend
```

**Problèmes courants :**
- Variables Vite non définies → Vérifier VITE_API_URL
- Erreur de build → Rebuild sans cache
- Problème de proxy Nginx → Vérifier nginx.conf

### Problèmes de connexion WebSocket

**Tester la connexion :**
```bash
curl -I http://localhost:80/socket.io/
```

**Solutions :**
- Vérifier CORS_ORIGIN dans .env
- Vérifier la config Nginx (upgrade headers)
- Redémarrer les conteneurs

### Erreur "Port already in use"

**Trouver le processus :**
```bash
# Linux/Mac
lsof -i :5000
lsof -i :80

# Windows
netstat -ano | findstr :5000
```

**Solutions :**
- Changer le port dans docker-compose.yml
- Tuer le processus utilisant le port
- Utiliser un autre port dans .env

### Base de données inaccessible

**Tester la connexion :**
```bash
mongosh "$MONGODB_URI"
```

**Solutions :**
- Vérifier l'IP whitelist (MongoDB Atlas)
- Vérifier les credentials
- Vérifier le réseau Docker

### Images trop volumineuses

**Vérifier la taille :**
```bash
docker images | grep whatsapp
```

**Optimiser :**
- Utiliser multi-stage builds (déjà fait)
- Nettoyer les caches npm
- Supprimer les dépendances dev

### Mémoire insuffisante

**Augmenter les limites :**

Ajouter dans docker-compose.yml :
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
```

## Mise à jour

### Mettre à jour l'application

```bash
# Pull les changements
git pull origin main

# Rebuild et redéployer
./scripts/deploy.sh production
```

### Mettre à jour Docker

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Optimisations de production

### 1. Utiliser des secrets Docker

```bash
echo "my-jwt-secret" | docker secret create jwt_secret -
```

### 2. Configurer le restart policy

```yaml
services:
  backend:
    restart: always
```

### 3. Limiter les ressources

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 4. Activer le logging

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Checklist de déploiement

### Avant le déploiement

- [ ] Tests passent
- [ ] Lint passe
- [ ] Build réussit
- [ ] .env configuré
- [ ] MongoDB accessible
- [ ] Backup récent

### Pendant le déploiement

- [ ] docker-compose build réussit
- [ ] Conteneurs démarrent
- [ ] Health checks OK
- [ ] Logs sans erreurs

### Après le déploiement

- [ ] Application accessible
- [ ] API répond
- [ ] WebSocket fonctionne
- [ ] Uploads fonctionnent
- [ ] Monitoring actif

## Support

- **Documentation** : README.md
- **Issues** : GitHub Issues
- **Logs** : docker-compose logs
- **Health** : /health endpoints

## Ressources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Nginx Docker](https://hub.docker.com/_/nginx)
- [Node Docker](https://hub.docker.com/_/node)
