# Déploiement de l'application WhatsApp monolithique

Ce document décrit les étapes pour déployer l'application WhatsApp monolithique à l'aide de Docker.

## Prérequis

- Avoir Docker installé sur votre machine.
- Avoir accès au dépôt contenant le code source de l'application.

## Étapes de déploiement

1. **Cloner le dépôt**

   Si ce n'est pas déjà fait, clonez le dépôt contenant le code source de l'application :

   ```bash
   git clone <URL_DU_DEPOT>
   cd <NOM_DU_REPERTOIRE>
   ```

2. **Construire l'image Docker**

   À la racine du projet, exécutez la commande suivante pour construire l'image Docker :

   ```bash
   docker build -t whatsapp-monolith .
   ```

   Cette commande crée une image Docker nommée `whatsapp-monolith` en utilisant le `Dockerfile` présent à la racine du projet.

3. **Lancer le conteneur Docker**

   Une fois l'image construite, vous pouvez lancer un conteneur basé sur cette image. Exécutez la commande suivante :

   ```bash
   docker run -d --name whatsapp-monolith-run --env-file backend/.env -p 5000:5000 whatsapp-monolith
   ```

   Cette commande démarre un conteneur en arrière-plan (`-d`) nommé `whatsapp-monolith-run`, en utilisant le fichier d'environnement `backend/.env` et en mappant le port 5000 du conteneur sur le port 5000 de l'hôte.

   > **Remarque :** Si le port 5000 est déjà utilisé sur votre machine, vous pouvez mapper le conteneur sur un port hôte différent (par exemple, 5001) en modifiant la commande comme suit :
   >
   > ```bash
   > docker run -d --name whatsapp-monolith-run --env-file backend/.env -p 5001:5000 whatsapp-monolith
   > ```

4. **Vérifier le bon fonctionnement du conteneur**

   Pour vérifier que le conteneur fonctionne correctement, vous pouvez consulter ses logs :

   ```bash
   docker logs --tail 200 whatsapp-monolith-run
   ```

   Vous pouvez également tester l'endpoint de santé exposé par le conteneur à l'aide de la commande `curl` :

   ```bash
   curl -i http://localhost:5000/health   # si mappé sur 5000
   curl -i http://localhost:5001/health   # si mappé sur 5001
   ```

5. **Arrêter et supprimer le conteneur**

   Si vous souhaitez arrêter et supprimer le conteneur, exécutez les commandes suivantes :

   ```bash
   docker stop whatsapp-monolith-run
   docker rm whatsapp-monolith-run
   ```

---

Fichiers ajoutés & test local

J'ai ajouté au dépôt :
- `Dockerfile` (à la racine) — Dockerfile monolithe qui build le frontend puis prépare le backend pour exécution.
- Ajouté le snippet pour servir les fichiers statiques dans `backend/server.js` (sert `backend/public` si présent).

Test local réalisé
- Build : `docker build -t whatsapp-monolith .` — BUILD : SUCCESS (image `whatsapp-monolith` créée).
- Tentative de run : j'ai tenté de démarrer le conteneur avec `-p 5000:5000`, mais le port `5000` sur l'hôte était déjà occupé ; le conteneur peut être démarré sur un port hôte alternatif (ex : 5001).

Commandes utiles pour lancer localement

- Lancer le conteneur (en mappant conteneur:5000 → hôte:5000) :
```bash
# Si port 5000 libre
docker run -d --name whatsapp-monolith-run --env-file backend/.env -p 5000:5000 whatsapp-monolith
```

- Si le port 5000 est déjà utilisé sur votre machine, mappez le container sur un port hôte différent (ex: 5001) :
```bash
docker run -d --name whatsapp-monolith-run --env-file backend/.env -p 5001:5000 whatsapp-monolith
```

- Vérifier les logs du conteneur :
```bash
docker logs --tail 200 whatsapp-monolith-run
```

- Tester l'endpoint health exposé par le conteneur :
```bash
curl -i http://localhost:5000/health   # si mappé sur 5000
curl -i http://localhost:5001/health   # si mappé sur 5001
```

Arrêter / supprimer le conteneur :
```bash
docker stop whatsapp-monolith-run && docker rm whatsapp-monolith-run
```

Si vous voulez que je force l'arrêt du processus local qui écoute sur le port 5000 (j'ai détecté un processus `ControlCe` écoutant sur 5000 sur votre machine) je peux vous indiquer la commande exacte à exécuter (`kill <PID>`) ou le faire si vous me donnez le feu vert pour tuer ce processus.

---

Sécurité des secrets et préparation Render

- J'ai remplacé les valeurs sensibles dans `backend/.env` par des placeholders et ajouté `backend/.env.example`.
- Assurez-vous de remplir vos vraies valeurs de secrets uniquement dans Render (Dashboard → votre service → Environment) : utilisez `RENDER_SECRETS.md` comme référence.

Fichier `render.yaml` (optionnel)

J'ai ajouté un exemple `render.yaml` qui décrit un seul service Docker (monolithe). Vous pouvez l'utiliser pour déployer via render's Git-based infra (render.yaml). Exemple contenu :

```yaml
services:
  - type: web
    name: whatsapp-monolith
    env: docker
    branch: main
    dockerfilePath: Dockerfile
    plan: starter
    envVars:
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: NODE_ENV
        value: production
```

- `sync: false` signifie que vous définirez ces variables via le dashboard (non publié dans le repo). Remplissez-les via l'UI Render.

---

Fin des modifications.
