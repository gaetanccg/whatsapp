# Variables à configurer dans Render (Secrets)

Pour déployer sur Render en utilisant le Dockerfile monolithe, configurez les variables d'environnement suivantes dans le panneau `Environment` du service Render (Dashboard → votre service → Environment → Add Environment Variable):

Variables essentielles (backend)
- MONGODB_URI : Chaîne de connexion MongoDB (ex: mongodb+srv://user:pass@cluster.mongodb.net/whatsapp?retryWrites=true&w=majority)
- JWT_SECRET : Secret JWT (ex: ec0663d0ca97d383f0354ce29a492d81)
- NODE_ENV : production
- FRONTEND_URL : (optionnel) URL publique du frontend (ex: https://app.votredomaine.com)
- SENTRY_DSN : (optionnel) dsn Sentry

Variables frontend (build-time)
- VITE_API_URL : (optionnel si le front est servi par le backend) ex: /api
- VITE_SOCKET_URL : (optionnel si le front est servi par le backend) ex: /socket.io

Astuce :
- Ne commitez jamais vos secrets dans le repo. Utilisez `backend/.env.example` comme référence et remplissez `backend/.env` localement (ajouté au `.gitignore`).
- Sur Render, vous pouvez définir des variables via le Dashboard (recommandé). Pour IaC, utilisez `render.yaml` et les secrets dans le UI.

